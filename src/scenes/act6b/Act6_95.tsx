/**
 * Act 6.95 — "THE TROPHY" (5.5s, silence → the song returns on the cut).
 *
 * The Act-1 stadium — the real Bowl, the real Stage, the real 아리랑 wall —
 * with the colour drained out of it. Forty-six thousand souls in gray are
 * cheering, silently, continuously, and he stands centre stage in a
 * followspot with the trophy held at his chest and his head down. This is
 * the real October 2016 moment: the first music-show win, weeks after his
 * grandmother died. "Grandma, I love you. I'm sorry. I wish I said it
 * sooner" — said into the broadcast camera, which is our lens.
 *
 * t 0–3.2   hold. The crowd jumps without a sound; beams sweep slow.
 * t 3.2–4.2 the head comes UP; the spine straightens; the first thaw.
 * t 4.2–4.6 the left hand lowers the trophy to his side; the right rises.
 * t 4.6–5.5 THE WAVE into the lens (waveHand — the arc's one gesture).
 *           The stadium lights start to die under him: at 5.5 the song
 *           returns on the wave and 7.4 carries the gesture into the dark.
 *
 * The gray is authored where it can be (crowd clouds, hero, confetti) and
 * graded where it can't: a HueSaturation at −0.85 after the Bloom drains the
 * red wall and the purple beams to ash without touching what is already
 * gray. Exposure parity holds — the frame is as BRIGHT as Act 1's bowl;
 * only the colour is gone.
 *
 * Time: the imported Stage/wall read worldTime(); the flight offset is
 * pinned so they idle in a pre-beat window (slow sweeps, no 120 BPM pulse —
 * the song is not playing). Everything the scene owns reads getAnimTime().
 */
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { EffectComposer, Bloom, Vignette, HueSaturation } from '@react-three/postprocessing'
import * as THREE from 'three'
import { createScene } from '../createScene'
import { useCameraHandoff } from '../DebugCamera'
import { publishSceneLookAt } from '../cameraHandoff'
import { getAnimTime } from '../../hooks/useAnimTime'
import {
  GoldFigure, ADULT, buildSolvedArmPoints, v,
  type PoseGeometry, type Proportions,
} from '../characters/goldFigure'
import { Bowl, Stage, Facade, seatSample, makeCrowdMaterial } from '../actB/stadium'
import { buildCloud, updateGlow, type PointCloud } from '../actB/points'
import { GlowPoints } from '../actB/GlowPoints'
import { STADIUM_Z, STAGE_Z, BOWL_RX, BOWL_RZ } from '../actB/flight'
import { setFlightOffset } from '../actB/time'
import {
  SOUL_GRAYS, SOUL_BOMB_GRAY, HERO_GRAY, HERO_GRAY_EMISSIVE, HERO_THAW,
  waveHand, ramp, clamp01,
} from './shared'

const DUR = 5.5

/**
 * Where the imported stadium's own clock sits. worldTime() = anim + this,
 * i.e. 6 → 11.5 across the scene: after the wall's machinery is turning but
 * before ANY beat function wakes (beatPulse from = 12.65 at the earliest).
 * The place idles — sweeps and orbits, no pulse — which is what a stadium
 * does when the song is not playing.
 */
const FLIGHT_OFF = 6

/* ── The beats ─────────────────────────────────────────────────────── */
const T_LIFT0 = 3.2    // head starts coming up
const T_LIFT1 = 4.2    // spine straight
const T_HAND0 = 4.2    // trophy to the side / right arm rising
const T_HAND1 = 4.75   // both hands arrived
const T_DIM0 = 4.9     // the lights start to die
const T_DIM1 = 5.5

/* ── Him ───────────────────────────────────────────────────────────── */
/** Centre of the thrust — forward of the deck, the wall 120 units behind. */
const HERO_POS: [number, number, number] = [0, 14, STAGE_Z - 74]
const HERO_SCALE = 17
const RX = BOWL_RX
const RZ = BOWL_RZ

/** How far the head has come down. Deep — the lens is front-on, and a bowed
 *  head only reads from the front if it visibly sinks into the chest. Held,
 *  then released over the lift — THE beat of the scene. */
function droopK(t: number): number {
  return 0.92 * (1 - ramp(t, T_LIFT0, T_LIFT1))
}

/** Chin past neutral once the spine is straight — he faces the lens. */
function chinUp(t: number): number {
  return ramp(t, T_LIFT1 + 0.15, T_DIM1 - 0.4)
}

/**
 * Both hand targets + the trophy anchor, one pure function so the skeleton
 * and the trophy prop can never disagree about where the cup is.
 */
function handState(t: number) {
  const k = droopK(t)
  const torso = ADULT.SHOULDER_Y - ADULT.HIP_Y
  const hipY = ADULT.HIP_Y - 0.14 * k
  const shoulderY = hipY + torso * (1 - 0.08 * k)
  const shoulderZ = 0.20 * k

  // The grip: chest height, hunched over it while the head is down — the
  // bowed head hangs directly above the cup.
  const gy = shoulderY - 0.20
  const gz = 0.20 + 0.09 * k
  const gripL: [number, number, number] = [-0.115, gy, gz]
  const gripR: [number, number, number] = [+0.115, gy, gz]

  const blend = ramp(t, T_HAND0, T_HAND1)

  // Left: lowers the cup to his side and keeps holding it.
  const sideL: [number, number, number] = [-0.135, 0.91, 0.03]
  const left: [number, number, number] = [
    gripL[0] + (sideL[0] - gripL[0]) * blend,
    gripL[1] + (sideL[1] - gripL[1]) * blend,
    gripL[2] + (sideL[2] - gripL[2]) * blend,
  ]

  // Right: rises into THE WAVE. waveHand owns the raise and the shake; the
  // blend carries the hand from the grip onto that path, with an outward
  // bulge mid-transfer so the arm swings AWAY from the body as it rises
  // (a straight lerp drags the forearm through the torso).
  const up = ramp(t, T_HAND0 + 0.1, T_HAND1 + 0.15)
  const wave = waveHand(t, up, { freq: 6.5, amp: 0.10 })
  const arc = Math.sin(Math.PI * blend)
  const right: [number, number, number] = [
    gripR[0] + (wave[0] - gripR[0]) * blend + 0.17 * arc,
    gripR[1] + (wave[1] - gripR[1]) * blend + 0.04 * arc,
    gripR[2] + (wave[2] - gripR[2]) * blend + 0.03 * arc,
  ]

  // Trophy: centred between the hands at the chest; then it rides the left
  // hand down, tipping a few degrees as one handle takes the weight.
  const heldAt: [number, number, number] = [0, gy - 0.165, gz]           // both hands
  const carried: [number, number, number] = [left[0] + 0.035, left[1] - 0.175, left[2] + 0.01]
  const trophy: [number, number, number] = [
    heldAt[0] + (carried[0] - heldAt[0]) * blend,
    heldAt[1] + (carried[1] - heldAt[1]) * blend,
    heldAt[2] + (carried[2] - heldAt[2]) * blend,
  ]
  const trophyTilt = blend * 0.16

  return { k, hipY, shoulderY, shoulderZ, left, right, trophy, trophyTilt, blend }
}

/**
 * The whole figure, per frame. Standing legs with a slight knee-forward
 * counterweight while drooped, the Act-4 bowed spine released by the lift,
 * both arms two-bone-solved onto the shared hand targets.
 */
function heroSkeleton({ P }: { P: Proportions; t: number; phase: number }): PoseGeometry {
  const t = getAnimTime()
  const { k, hipY, shoulderY, shoulderZ, left, right } = handState(t)
  const chin = chinUp(t)

  // Breathing on the chest only — the head and hands hold still.
  const breathe = Math.sin(t * 2.4) * 0.005

  const torso = shoulderY - hipY
  const legLen = P.HIP_Y - P.FOOT_Y
  const neck = P.HEAD_Y - P.SHOULDER_Y

  const hip = v(0, hipY, -0.05 * k)
  const shoulder = v(0, shoulderY + breathe, shoulderZ + breathe * 0.4)

  const head = v(
    0,
    shoulder.y + neck * (1 - 0.55 * k) + 0.012 * chin,
    shoulder.z + 0.10 * k + 0.03 - 0.025 * chin,
  )

  const spine = [
    hip,
    v(0, hip.y + torso * 0.33, hip.z + (shoulder.z - hip.z) * 0.22),
    v(0, hip.y + torso * 0.66, hip.z + (shoulder.z - hip.z) * 0.62),
    shoulder,
    // Neck — halfway to the head, so the sphere stays attached when upright.
    v(0, shoulder.y + (head.y - shoulder.y) * 0.5, shoulder.z + (head.z - shoulder.z) * 0.5),
  ]

  const leg = (s: number) => {
    const knee = v(s * 0.055, hipY - legLen * 0.46, hip.z + 0.07 * k + 0.01)
    const foot = v(s * 0.045, P.FOOT_Y, 0.01)
    return [hip, hip.clone().lerp(knee, 0.5), knee, knee.clone().lerp(foot, 0.5), foot]
  }

  return {
    curves: [
      { points: spine, radius: P.R, segments: 16 },
      { points: buildSolvedArmPoints(-0.02, shoulder.y, v(...left), P, shoulder.z), radius: P.R, segments: 14 },
      { points: buildSolvedArmPoints(+0.02, shoulder.y, v(...right), P, shoulder.z), radius: P.R, segments: 14 },
      { points: leg(-1), radius: P.R, segments: 16 },
      { points: leg(+1), radius: P.R, segments: 16 },
    ],
    spheres: [{ center: head, radius: P.RH }],
  }
}

/* ── The trophy ────────────────────────────────────────────────────── */
function Trophy({ material }: { material: THREE.Material }) {
  const ref = useRef<THREE.Group>(null)
  useFrame(() => {
    const t = getAnimTime()
    const { trophy, trophyTilt } = handState(t)
    if (ref.current) {
      ref.current.position.set(trophy[0], trophy[1], trophy[2])
      ref.current.rotation.z = trophyTilt
    }
  })
  return (
    <group ref={ref}>
      {/* plinth */}
      <mesh material={material} position={[0, 0.0175, 0]}>
        <boxGeometry args={[0.11, 0.035, 0.11]} />
      </mesh>
      {/* stem */}
      <mesh material={material} position={[0, 0.062, 0]}>
        <cylinderGeometry args={[0.016, 0.024, 0.055, 12]} />
      </mesh>
      {/* cup */}
      <mesh material={material} position={[0, 0.163, 0]}>
        <cylinderGeometry args={[0.085, 0.046, 0.15, 20]} />
      </mesh>
      {/* handles — rings standing in the XY plane, one each side */}
      {[-1, 1].map(s => (
        <mesh key={s} material={material} position={[s * 0.102, 0.175, 0]}>
          <torusGeometry args={[0.047, 0.011, 8, 20]} />
        </mesh>
      ))}
    </group>
  )
}

/* ── Him, gray, and the first thaw ─────────────────────────────────── */
const GRAY_C = new THREE.Color(HERO_GRAY)
const THAW_C = new THREE.Color(HERO_THAW)

function Hero() {
  const group = useRef<THREE.Group>(null)
  const mat = useMemo(() => new THREE.MeshStandardMaterial({
    color: HERO_GRAY, emissive: HERO_GRAY,
    emissiveIntensity: HERO_GRAY_EMISSIVE, roughness: 0.35, toneMapped: false,
  }), [])
  const trophyMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#B8BDC6', emissive: '#B8BDC6', emissiveIntensity: 0.3,
    roughness: 0.3, metalness: 0.75, toneMapped: false,
  }), [])

  useFrame(() => {
    const t = getAnimTime()
    // As the head rises the gray warms toward #B8A98E — ash catching a
    // little light, nowhere near gold yet.
    const thaw = ramp(t, T_LIFT0 + 0.1, T_LIFT1 + 0.4)
    mat.color.copy(GRAY_C).lerp(THAW_C, thaw * 0.85)
    mat.emissive.copy(mat.color)
    mat.emissiveIntensity =
      (HERO_GRAY_EMISSIVE + thaw * 0.10) * (1 + 0.06 * Math.sin(t * 2.4))
    // He receives the award angled AWAY, three-quarter, head down — a bow
    // only reads off-axis. As the head comes up he TURNS to find the
    // broadcast camera: the real gesture. He learned to find the camera
    // so she could tell which one was him.
    if (group.current) {
      group.current.rotation.y = Math.PI + 0.5 * (1 - ramp(t, T_LIFT0 + 0.2, T_LIFT1 + 0.1))
    }
  })

  return (
    <group ref={group} position={HERO_POS} rotation={[0, Math.PI + 0.5, 0]} scale={HERO_SCALE}>
      <GoldFigure skeleton={heroSkeleton} material={mat} />
      <Trophy material={trophyMat} />
    </group>
  )
}

/* ── The crowd of gray souls ───────────────────────────────────────── */
/**
 * Act 1's three clouds — same seat sampling, same rejection rules, same
 * person-shaped sprite — re-seeded and re-coloured in soul gray. They ARE
 * cheering: the jump envelope is a continuous raised cosine at the beat's
 * own half-second period (so 7.4's returning song lands in step), at ~70%
 * of Act 1's amplitude, with no light pulse at all. Silent cheering.
 */
function jumpEnv(t: number): number {
  const arc = 0.5 - 0.5 * Math.cos((2 * Math.PI * t) / 0.5)
  const breathe = 0.86 + 0.14 * Math.sin(t * 0.53 + 1.2)
  const surge = 1 + 0.22 * ramp(t, T_LIFT0 + 0.2, T_LIFT1 + 0.3)
  return arc * Math.min(1, t / 1.2) * breathe * surge
}

/** Master fade for everything the scene owns — the lights starting to die. */
function dimRamp(t: number): number {
  return ramp(t, T_DIM0, T_DIM1)
}

function GraySouls() {
  const tierMat = useMemo(() => makeCrowdMaterial(), [])
  const floorMat = useMemo(() => makeCrowdMaterial(), [])

  const tiers = useMemo<PointCloud>(() => buildCloud(
    30000, 8821, SOUL_GRAYS,
    rand => {
      const [x, y, z] = seatSample(rand)
      if (z > RZ * 1.2 && Math.abs(x) < RX * 1.15) return null
      const bright = rand() < 0.16
      return [
        x + (rand() - 0.5) * 4, y, z + (rand() - 0.5) * 4,
        bright ? 5.4 + rand() * 2.4 : 6.4 + rand() * 3.0,
        bright ? 0.72 + rand() * 0.24 : 0.42 + rand() * 0.4,
      ]
    },
  ), [])

  /** The dead ARMY-bomb layer: gray-violet, held above head height, dimmer. */
  const bombs = useMemo<PointCloud>(() => buildCloud(
    5200, 8822, [SOUL_BOMB_GRAY, '#7A7390'],
    rand => {
      const [x, y, z] = seatSample(rand)
      if (z > RZ * 1.2 && Math.abs(x) < RX * 1.15) return null
      return [x, y + 5.5 + rand() * 3, z, 3.2 + rand() * 2.0, 0.34 + rand() * 0.28]
    },
  ), [])

  const floor = useMemo<PointCloud>(() => buildCloud(
    12000, 8823, SOUL_GRAYS,
    rand => {
      const a = rand() * Math.PI * 2
      const r = Math.sqrt(rand())
      const x = Math.cos(a) * r * RX * 0.96
      const z = Math.sin(a) * r * RZ * 0.96
      if (z > RZ * 0.30 && Math.abs(x) < RX * 0.80) return null
      if (Math.abs(x) < 26 && z > -RZ * 0.55) return null
      return [x, 4.5, z, 6.2 + rand() * 3.0, 0.4 + rand() * 0.42]
    },
  ), [])

  useFrame(({ camera, size, gl }) => {
    const t = getAnimTime()
    const px = size.height * gl.getPixelRatio()
    const env = jumpEnv(t)
    const global = 1 - 0.75 * dimRamp(t)
    for (const m of [tierMat, floorMat]) {
      updateGlow(m, camera, px, t)
      m.uniforms.uPulse.value = 0
      m.uniforms.uJumpEnv.value = env
      m.uniforms.uGlobal.value = global
    }
    // ~70% of Act 1's amplitudes.
    floorMat.uniforms.uJump.value = 4.6
    tierMat.uniforms.uJump.value = 2.6
  })

  return (
    <group position={[0, 0, STADIUM_Z]}>
      <GlowPoints cloud={tiers} material={tierMat} />
      <GlowPoints cloud={bombs} material={tierMat} />
      <GlowPoints cloud={floor} material={floorMat} />
    </group>
  )
}

/* ── Gray confetti, falling slow ───────────────────────────────────── */
function makeConfettiMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uScale: { value: 700 },
      uGlobal: { value: 1 },
      uMaxPx: { value: 34 },
    },
    vertexShader: /* glsl */ `
      attribute float aSize;
      attribute vec3 aColor;
      attribute float aAlpha;
      attribute float aPhase;
      uniform float uTime;
      uniform float uScale;
      uniform float uMaxPx;
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        float span = 175.0;
        float speed = 9.0 + fract(aPhase * 7.31) * 7.0;
        float fall = mod(position.y + uTime * speed, span);
        vec3 p = vec3(position.x, 190.0 - fall, position.z);
        p.x += sin(uTime * (0.4 + fract(aPhase * 3.7) * 0.6) + aPhase * 41.0) * 7.0;
        p.z += cos(uTime * (0.3 + fract(aPhase * 2.9) * 0.5) + aPhase * 27.0) * 5.0;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vColor = aColor;
        // Flutter: a fleck catches the light, turns edge-on, catches again.
        vAlpha = aAlpha * (0.42 + 0.58 * abs(sin(uTime * (2.2 + fract(aPhase * 5.3) * 2.6) + aPhase * 61.0)));
        gl_PointSize = clamp(aSize * uScale / max(1.0, -mv.z), 0.0, uMaxPx);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec3 vColor;
      varying float vAlpha;
      uniform float uGlobal;
      void main() {
        vec2 uv = gl_PointCoord - 0.5;
        float d = length(uv) * 2.0;
        float a = pow(max(0.0, 1.0 - d), 2.2) * vAlpha * uGlobal;
        if (a < 0.004) discard;
        gl_FragColor = vec4(vColor * a, a);
      }
    `,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: THREE.AdditiveBlending,
  })
}

function GrayConfetti() {
  const mat = useMemo(() => makeConfettiMaterial(), [])
  const cloud = useMemo<PointCloud>(() => buildCloud(
    650, 8824, ['#C9CED8', '#AAB0BA', '#8E939E', '#B8BDC6'],
    rand => [
      (rand() - 0.5) * 300,
      rand() * 175,               // scroll offset — the shader owns the fall
      -40 + rand() * 210,
      1.5 + rand() * 1.3,
      0.35 + rand() * 0.3,
    ],
  ), [])

  useFrame(({ camera, size, gl }) => {
    const t = getAnimTime()
    updateGlow(mat, camera, size.height * gl.getPixelRatio(), t)
    mat.uniforms.uGlobal.value = 1 - 0.75 * dimRamp(t)
  })

  return (
    <group position={[0, 0, STADIUM_Z]}>
      <GlowPoints cloud={cloud} material={mat} frustumCulled={false} />
    </group>
  )
}

/* ── The followspot ────────────────────────────────────────────────── */
/** Along-and-rim faded cone — lit air, not a party hat (Act B's recipe). */
function makeShaftMaterial(color: string, strength: number): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uAmount: { value: strength },
    },
    vertexShader: /* glsl */ `
      varying float vY;
      varying vec3 vView;
      varying vec3 vNrm;
      void main() {
        vY = uv.y;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vView = normalize(-mv.xyz);
        vNrm = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      varying float vY;
      varying vec3 vView;
      varying vec3 vNrm;
      uniform vec3 uColor;
      uniform float uAmount;
      void main() {
        float along = pow(max(0.0, vY), 2.0);
        float rim = 1.0 - abs(dot(normalize(vNrm), normalize(vView)));
        float a = along * (0.34 + 0.66 * pow(max(0.0, rim), 1.6)) * uAmount;
        gl_FragColor = vec4(uColor * a, a);
      }
    `,
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending, fog: false,
  })
}

function Followspot() {
  const shaftMat = useMemo(() => makeShaftMaterial('#C8CEDC', 0.4), [])
  const shaftGeo = useMemo(() => {
    const g = new THREE.ConeGeometry(26, 190, 20, 1, true)
    g.translate(0, -95, 0)   // apex at the lamp
    return g
  }, [])
  const poolMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: '#3A404E', transparent: true, opacity: 0.3, toneMapped: false,
    blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
  }), [])

  useFrame(() => {
    const t = getAnimTime()
    const dim = dimRamp(t)
    // The spot answers the head-lift — the world leaning toward him — and
    // then dies LAST and least, so he stays readable into the cut.
    const lift = 1 + 0.18 * ramp(t, T_LIFT0, T_LIFT1 + 0.1)
    shaftMat.uniforms.uAmount.value = 0.4 * lift * (1 - 0.5 * dim)
    poolMat.opacity = 0.3 * lift * (1 - 0.5 * dim)
  })

  return (
    <group position={[HERO_POS[0], 0, HERO_POS[2]]}>
      <mesh geometry={shaftGeo} material={shaftMat} position={[0, 204, 0]} />
      {/* light pool on the thrust */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, HERO_POS[1] + 0.3, 0]} material={poolMat}>
        <circleGeometry args={[24, 48]} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, HERO_POS[1] + 0.4, 0]} material={poolMat}>
        <circleGeometry args={[13, 40]} />
      </mesh>
    </group>
  )
}

/* ── House lights, and the wall scrim that lets the LED die ────────── */
function HallLights() {
  const arena = useRef<THREE.PointLight>(null)
  const key = useRef<THREE.PointLight>(null)
  const rim = useRef<THREE.PointLight>(null)
  const scrim = useRef<THREE.MeshBasicMaterial>(null)

  useFrame(() => {
    const t = getAnimTime()
    const dim = dimRamp(t)
    const f = 1 - 0.7 * dim
    if (arena.current) arena.current.intensity = 60 * f
    if (key.current) key.current.intensity = 950 * f
    if (rim.current) rim.current.intensity = 420 * f
    // The LED wall powering down = a black scrim breathing up over it.
    if (scrim.current) scrim.current.opacity = 0.3 + 0.55 * dim
  })

  return (
    <>
      <ambientLight intensity={0.32} color="#8C93A8" />
      <pointLight ref={arena} position={[0, 165, STADIUM_Z]} color="#8E96B4"
        intensity={60} distance={2600} decay={1.4} />
      {/* Broadcast key — from the lens side, so his front face is lit. */}
      <pointLight ref={key} position={[0, 58, STAGE_Z - 145]} color="#C7CEDF"
        intensity={950} distance={420} decay={1.6} />
      {/* Cool rim from behind the stage, so he separates from the wall. */}
      <pointLight ref={rim} position={[0, 80, STAGE_Z + 30]} color="#9FA8C2"
        intensity={420} distance={320} decay={1.6} />
      {/* Scrim just in front of the LED wall (wall face is at STAGE_Z+46).
          Held at a low base all scene — the wall is ON, but it is ash — and
          breathed up over the dim so the LED visibly dies behind him. */}
      <mesh position={[0, 74, STAGE_Z + 44.5]}>
        <planeGeometry args={[392, 128]} />
        <meshBasicMaterial ref={scrim} color="#000000" transparent opacity={0.3}
          side={THREE.DoubleSide} depthWrite={false} toneMapped={false} fog={false} />
      </mesh>
      {/* The deck lip strip stays warm-lit in Act 1; tonight it is off. A
          matching dark housing sits just in front of it (strip: y 17,
          z STAGE_Z−48) — without this it is a hard white bar across frame. */}
      <mesh position={[0, 17, STAGE_Z - 49.6]}>
        <boxGeometry args={[334, 3.4, 0.7]} />
        <meshStandardMaterial color="#15121F" roughness={0.9} />
      </mesh>
    </>
  )
}

/* ── Camera: one push, out of the bowl and into his eyeline ────────── */
const CAM_A = { pos: new THREE.Vector3(-34, 78, 4950), tgt: new THREE.Vector3(0, 30, 5310), fov: 44 }
const CAM_B = { pos: new THREE.Vector3(0, 44.5, 5221), tgt: new THREE.Vector3(0, 41.5, 5296), fov: 40.5 }
/** The push arrives BEFORE the head-lift, so the beat plays in a readable
 *  medium shot; a slow broadcast creep carries the last 1.5s. */
const T_ARRIVE = 4.0

function CameraRig() {
  const yieldCamera = useCameraHandoff()
  const pos = useRef(new THREE.Vector3())
  const tgt = useRef(new THREE.Vector3())
  useFrame(({ camera }) => {
    // Keep the imported stadium's clock pinned even if another scene was
    // mounted (film mode) and moved the module-level offset.
    setFlightOffset(FLIGHT_OFF)
    if (yieldCamera()) return
    const t = getAnimTime()
    const p = clamp01(t / T_ARRIVE)
    const u = p * p * (3 - 2 * p)
    pos.current.lerpVectors(CAM_A.pos, CAM_B.pos, u)
    tgt.current.lerpVectors(CAM_A.tgt, CAM_B.tgt, u)
    // …then keep creeping toward him through the wave.
    const creep = ramp(t, T_ARRIVE - 0.4, DUR)
    pos.current.z += creep * 7
    pos.current.y -= creep * 0.6
    // A breath of drift while wide; the jib steadies as it arrives.
    const loose = 1 - u * 0.9
    pos.current.x += Math.sin(t * 0.83 + 1.7) * 1.1 * loose
    pos.current.y += Math.sin(t * 0.61) * 0.7 * loose
    camera.position.copy(pos.current)
    camera.lookAt(tgt.current)
    // Hand the debug camera his eyeline: he stands 75–360 units downrange
    // across the push, and a lookAt quaternion carries no distance at all.
    publishSceneLookAt(tgt.current.x, tgt.current.y, tgt.current.z)
    const cam = camera as THREE.PerspectiveCamera
    cam.fov = CAM_A.fov + (CAM_B.fov - CAM_A.fov) * u
    cam.updateProjectionMatrix()
  })
  return null
}

/* ── Assembly ──────────────────────────────────────────────────────── */
function SceneBody() {
  setFlightOffset(FLIGHT_OFF)
  return (
    <>
      <CameraRig />
      <fog attach="fog" args={['#0E0F16', 900, 2400]} />
      <HallLights />
      <Bowl />
      <Facade />
      <Stage />
      <GraySouls />
      <GrayConfetti />
      <Followspot />
      <Hero />
      <EffectComposer>
        <Bloom intensity={0.72} luminanceThreshold={0.48} luminanceSmoothing={0.65} mipmapBlur />
        {/* The grief grade: everything the Act-1 stadium still is — the red
            wall, the violet beams — drained to ash. What is authored gray
            passes through untouched. */}
        <HueSaturation saturation={-0.92} />
        <Vignette eskil={false} offset={0.22} darkness={0.62} />
      </EffectComposer>
    </>
  )
}

export default createScene({
  background: '#06070B',
  three: {
    camera: { position: [-34, 78, 4950], fov: 44, near: 1, far: 4000 },
    gl: {
      antialias: true,
      toneMapping: THREE.ACESFilmicToneMapping,
      toneMappingExposure: 1.05,
    },
    onCreated: ({ camera }) => camera.lookAt(0, 30, 5310),
    debugTarget: [0, 40, 5296],
  },
}, function Act6_95() {
  return <SceneBody />
})
