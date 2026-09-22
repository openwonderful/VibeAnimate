/**
 * Act 6.5 — "SMALL STAGE" (2.9s, film 116.55 → 119.45)
 *
 * The first gig — and the first time all SEVEN are on a stage. A basement
 * club: a 0.4 m riser, one pink LED strip along its lip, brick-dark walls,
 * the six members performing in their stadium colours behind and beside
 * him, and — for the first time in the film — a crowd that is FACING THEM.
 * Two dozen backs-to-us heads bobbing on the record's beat, where 6.3's
 * pavement never even turned around. At frame right, a camera on a tripod
 * with a red tally: somebody is broadcasting this. At t≈1.5 he turns from
 * the mic to that camera and waves — the gesture he learned so his
 * grandmother could tell which one he is — timed so the wave is fully up
 * on "Somebody like you, ayy" (film 119.03 = local 2.48). Because our lens
 * sits just above the prop camera's axis, the wave lands straight down our
 * throat. 6.6 opens on the other end of that signal.
 *
 * Metres, GoldFigure at scale 1, same family as 6.1–6.3.
 */
import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import * as THREE from 'three'
import type { Group } from 'three'
import { createScene } from '../createScene'
import { useCameraHandoff } from '../DebugCamera'
import { publishSceneLookAt } from '../cameraHandoff'
import { GoldFigure } from '../characters/goldFigure'
import { CrowdPeg, PEG_PER_GOLD, type Archetype } from '../characters/CrowdPeg'
import { getAnimTime } from '../../hooks/useAnimTime'
import { seededRandom } from '../../utils/svgHelpers'
import GradientEnvironment from '../effects/GradientEnvironment'
import { clamp01, smooth, ramp, waveHand } from './shared'
import {
  MicStand, BroadcastCamera, makeBeamMaterial, makeBeamGeometry, venueBeatPulse, venueBeatJump,
} from './venue'

/** Scene length — manifest/timeline slot. Every arc is authored against it. */
const DUR = 2.9
/** Film second this slot starts (song is 1:1 with film — everywhere now, not
 *  just here: the film plays the untouched recording end to end) — the beat
 *  clock runs on song time so the LED strip and the heads hit the record.
 *  Changing this RE-DERIVES every beat phase, it does not just shift them,
 *  which is exactly why it has to move when the slot does. It was 116.9
 *  until 6.2's tail lost 0.35s to the un-splice and pulled this slot, 6.3,
 *  6.6 and 6.7 all 0.35s earlier. 0.35 is 70% of a beat at 120 BPM: leave
 *  this at 116.9 and the strip, the crowd and the six all still render
 *  perfectly and stop being on the record. */
const FILM_FROM = 116.55

/* ── layout ─────────────────────────────────────────────────────────
 * Riser at the origin, hero on it facing +z; the room (and us) out along
 * +z. The tripod camera stands in the crowd at frame right, and OUR lens
 * hangs just above the line it aims down, so "at the camera" ≡ "at us".
 */
const RISER_TOP = 0.4
const HERO_POS: [number, number, number] = [0, RISER_TOP, -0.2]
const HERO_HEAD_Y = RISER_TOP + 1.78
/** The diegetic camera — in the near foreground, directly under our lens:
 *  we are looking over the broadcast camera's shoulder, so "at the camera"
 *  and "at us" are literally the same axis. Its legs fall below frame. */
const PROP_CAM: [number, number, number] = [1.90, 0, 3.30]
/** Where our lens lives — behind and a shade above the prop camera's axis. */
const CAM_A: [number, number, number] = [1.90, 1.86, 4.55]
const CAM_B: [number, number, number] = [1.72, 1.83, 4.18]
const LOOK_AT: [number, number, number] = [0.30, 1.70, -0.2]
/** Where he turns to at 1.5 — between the prop lens and ours (they are ~7°
 *  apart from his spot, so one yaw serves both). */
const WAVE_YAW = 0.45

/**
 * The beats: turn, then the wave rises to be fully up at 2.43 — just as
 * "Somebody like you, ayy" lands at local 2.48 — and holds to the cut.
 *
 * These are the only two numbers in the file measured off the SONG rather
 * than off the clip, so they are the only two that move when the slot does.
 * They were 1.5 / 1.68 against a 116.9 start; the un-splice pulled this slot
 * to 116.55, so both take +0.35 and the gesture stays welded to the syllable
 * it was cut for: turn completes at local 2.23 = song 118.78, wave fully up
 * at local 2.43 = song 118.98, vocal at 119.03. Identical song seconds to
 * the frame, which is the whole point of paying the 0.35 here rather than
 * letting the wave drift 70% of a beat early.
 *
 * What it costs: the hold after the wave goes 0.82s → 0.47s, because the
 * clip's out-point came back with it. That is the honest price of a 2.9s
 * slot that moved earlier under a pinned gesture, and the alternative —
 * an early wave — is worse.
 */
const T_TURN = 1.85
const T_WAVE = 2.03

const LED_PINK = '#FF5A7A'
const HERO_GOLD = '#FFB938'

/* ── him ────────────────────────────────────────────────────────────*/
function Hero() {
  const groupRef = useRef<Group>(null)
  const material = useMemo(() => new THREE.MeshStandardMaterial({
    color: HERO_GOLD, emissive: HERO_GOLD, emissiveIntensity: 1.0,
    roughness: 0.35, toneMapped: false,
  }), [])
  const micHand = useRef<[number, number, number]>([0.06, 1.52, 0.26])
  const waveArm = useRef<[number, number, number]>([-0.3, 0.98, 0.08])

  useFrame(() => {
    const t = getAnimTime()
    // Singing: full-voice glow with the 6.2 tremor grammar (the voice, not a
    // dimmer), swelling ~12% once the wave is up — he is greeting her.
    const tremor = Math.sin(t * 7.3) * 0.05 + Math.sin(t * 11.9) * 0.03
    const wave = ramp(t, T_WAVE, T_WAVE + 0.4)
    material.emissiveIntensity = (1.0 + tremor * 0.6) * (1 + wave * 0.12)

    const turn = smooth(clamp01((t - T_TURN) / 0.38))
    if (groupRef.current) {
      groupRef.current.rotation.y = turn * WAVE_YAW
      // A half-step toward the lens as he turns — it clears him from behind
      // the mic stand in the broadcast framing, and it reads as him coming
      // to the camera rather than just noticing it.
      groupRef.current.position.x = HERO_POS[0] + turn * 0.30
      groupRef.current.position.z = HERO_POS[2] + turn * 0.10
      // Performance sway, settling as he turns — the wave is a held beat.
      groupRef.current.position.y = HERO_POS[1] + Math.sin(t * 1.6) * 0.012 * (1 - turn * 0.7)
    }
    // Mic hand: held at the capsule while he sings, easing down toward his
    // side through the turn (the stand stays where it is; he leaves it).
    const mx = 0.06 + (0.14 - 0.06) * turn
    const my = 1.52 + (0.95 - 1.52) * turn
    const mz = 0.26 + (0.05 - 0.26) * turn
    micHand.current = [mx, my, mz]
    // The wave — THE wave, left hand, straight into the lens. Lifted a
    // shade past the stock height so the hand clears his head from the
    // broadcast camera's low-ish axis.
    const up = ramp(t, T_WAVE, T_WAVE + 0.42)
    const w = waveHand(t, up, { mirror: true })
    waveArm.current = [w[0], w[1] + up * 0.10, w[2]]
  })

  return (
    <group ref={groupRef} position={HERO_POS}>
      <GoldFigure
        pose="standing"
        animate
        solvedArms
        castShadow
        material={material}
        rightHandAt={micHand}
        leftHandAt={waveArm}
        headForwardTilt={0.02}
      />
    </group>
  )
}

/* ── the other six ──────────────────────────────────────────────────
 * The band, on the riser with him — Act6_3's stadium palette (that const
 * is file-local there), same people, same hues. Mid-performance: the walk
 * cycle in place as stage movement, plus a bob on the record's beat, each
 * a hair desynced. They keep performing through his turn — the wave is HIS
 * beat; they are the reason a camera is here at all.
 */
const MEMBERS = [
  // Positions picked against the lens ray: from CAM_A the hero's "shadow"
  // band runs x ≈ −0.5…+0.3 across the riser's depth — nobody stands in it,
  // and the left three sit at three distinct bearings so none eclipses
  // another (first pass had RM reading as a blue outline ON the hero).
  { name: 'Jin', color: '#FFA3C9', x: -1.80, z: -0.60, phase: 0.11, lag: 0.05 },
  { name: 'J-Hope', color: '#FF6B4D', x: -1.05, z: -1.15, phase: 0.63, lag: 0.00 },
  { name: 'RM', color: '#5B7BFF', x: -0.95, z: -0.30, phase: 0.37, lag: 0.09 },
  { name: 'V', color: '#B876FF', x: 0.75, z: -1.20, phase: 0.81, lag: 0.12 },
  { name: 'Jimin', color: '#7BE838', x: 1.30, z: -0.68, phase: 0.24, lag: 0.03 },
  { name: 'Suga', color: '#6FEDC4', x: 1.68, z: -1.28, phase: 0.52, lag: 0.07 },
] as const

/** Bright enough that the colours read in a pink-lit basement, tone-mapped
 *  so the hero's unmapped gold still owns the frame. */
const MEMBER_GLOW = 0.55

function Member({ color, x, z, phase, lag }: (typeof MEMBERS)[number]) {
  const ref = useRef<Group>(null)
  const material = useMemo(() => new THREE.MeshStandardMaterial({
    color, emissive: color, emissiveIntensity: MEMBER_GLOW, roughness: 0.55,
  }), [color])
  useFrame(() => {
    const t = getAnimTime()
    const jump = venueBeatJump(t + FILM_FROM - lag)
    if (ref.current) {
      ref.current.position.y = RISER_TOP + jump * 0.05
      ref.current.rotation.z = Math.sin(t * 1.8 + phase * 6.3) * 0.03
    }
  })
  return (
    <group ref={ref} position={[x, RISER_TOP, z]}
      // Angled a few degrees toward the room's centre, the way a line works
      // a small stage.
      rotation={[0, -x * 0.10, 0]}>
      <GoldFigure pose="walking" inPlace animate phaseOffset={phase}
        castShadow material={material} />
    </group>
  )
}

function Band() {
  return <group>{MEMBERS.map((m) => <Member key={m.name} {...m} />)}</group>
}

/* ── the room ───────────────────────────────────────────────────────*/
const BRICK = '#221813'
const BRICK_DARK = '#180F0C'
const MORTAR = '#120B09'

function Club() {
  const strips = useMemo(() => {
    // Brick coursing: thin mortar lines across the back wall. The cheapest
    // thing that says basement rather than void.
    const rows: number[] = []
    for (let y = 0.22; y < 2.9; y += 0.24) rows.push(y)
    return rows
  }, [])
  return (
    <group>
      {/* Floor — pegs need an opaque plane to cut against. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[26, 22]} />
        <meshStandardMaterial color="#141210" roughness={0.85} metalness={0.1} />
      </mesh>
      {/* Back wall (behind the riser) */}
      <mesh position={[0, 1.5, -2.3]} receiveShadow>
        <planeGeometry args={[14, 3.2]} />
        <meshStandardMaterial color={BRICK} roughness={0.95} />
      </mesh>
      {strips.map((y, i) => (
        <mesh key={i} position={[0, y, -2.29]}>
          <planeGeometry args={[14, 0.014]} />
          <meshBasicMaterial color={MORTAR} />
        </mesh>
      ))}
      {/* Pilasters framing the stage */}
      {[-2.6, 2.6].map((x) => (
        <mesh key={x} position={[x, 1.5, -2.22]}>
          <boxGeometry args={[0.42, 3.2, 0.2]} />
          <meshStandardMaterial color={BRICK_DARK} roughness={0.95} />
        </mesh>
      ))}
      {/* Bare-bulb sconces on the pilasters — warm anchor points either side
          of the stage. Emissive only (no pointLight cost); Bloom halos them. */}
      {[-2.6, 2.6].map((x) => (
        <group key={x} position={[x, 2.35, -2.09]}>
          <mesh position={[0, -0.09, -0.01]}>
            <boxGeometry args={[0.06, 0.14, 0.05]} />
            <meshStandardMaterial color="#26201A" roughness={0.8} />
          </mesh>
          <mesh>
            <sphereGeometry args={[0.035, 10, 10]} />
            <meshBasicMaterial color="#FFC98A" toneMapped={false} />
          </mesh>
        </group>
      ))}
      {/* Side walls, mostly out of frame but they close the room */}
      <mesh position={[-5.2, 1.5, 2]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[10, 3.2]} />
        <meshStandardMaterial color={BRICK_DARK} roughness={0.95} />
      </mesh>
      <mesh position={[5.2, 1.5, 2]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[10, 3.2]} />
        <meshStandardMaterial color={BRICK_DARK} roughness={0.95} />
      </mesh>
      {/* Low ceiling — it is a basement. */}
      <mesh position={[0, 3.06, 1]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[26, 14]} />
        <meshStandardMaterial color="#0E0C0A" roughness={0.95} />
      </mesh>
      {/* The riser */}
      <mesh position={[0, RISER_TOP / 2, -0.35]} castShadow receiveShadow>
        <boxGeometry args={[3.8, RISER_TOP, 2.3]} />
        <meshStandardMaterial color="#191614" roughness={0.8} />
      </mesh>
    </group>
  )
}

/** The LED strip along the riser lip — the club's one piece of production
 *  value, breathing on the record's beat. */
function LedStrip() {
  const mat = useMemo(() => new THREE.MeshBasicMaterial({
    color: LED_PINK, toneMapped: false, transparent: true, opacity: 0.9,
  }), [])
  const lightRef = useRef<THREE.PointLight>(null)
  useFrame(() => {
    const t = getAnimTime()
    const pulse = venueBeatPulse(t + FILM_FROM)
    mat.opacity = 0.62 + pulse * 0.38
    if (lightRef.current) lightRef.current.intensity = 2.6 + pulse * 2.2
  })
  return (
    <group>
      <mesh position={[0, RISER_TOP - 0.06, 0.81]}>
        <boxGeometry args={[3.76, 0.045, 0.02]} />
        <primitive object={mat} attach="material" />
      </mesh>
      {/* Short returns down the riser's visible corner */}
      <mesh position={[1.89, RISER_TOP - 0.06, 0.24]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[1.16, 0.045, 0.02]} />
        <primitive object={mat} attach="material" />
      </mesh>
      {/* Its glow on the floor and on him */}
      <pointLight ref={lightRef} position={[0, 0.55, 1.15]} color={LED_PINK}
        intensity={3.4} distance={4.2} decay={2} />
    </group>
  )
}

/** Two cheap club PARs raking the stage from the ceiling bar — the venue
 *  beam material at low strength, so the air over the riser is faintly lit. */
function ClubBeams() {
  const pinkMat = useMemo(() => makeBeamMaterial(LED_PINK, 0.20), [])
  const violetMat = useMemo(() => makeBeamMaterial('#B08CFF', 0.17), [])
  const geo = useMemo(() => makeBeamGeometry(0.55, 3.4), [])
  const g1 = useRef<THREE.Mesh>(null)
  const g2 = useRef<THREE.Mesh>(null)
  useFrame(() => {
    const t = getAnimTime()
    const pulse = venueBeatPulse(t + FILM_FROM)
    pinkMat.uniforms.uAmount.value = 0.16 + pulse * 0.10
    violetMat.uniforms.uAmount.value = 0.13 + pulse * 0.08
    // The slowest of sweeps — house rig on an idle chase.
    if (g1.current) g1.current.rotation.z = 0.34 + Math.sin(t * 0.7) * 0.06
    if (g2.current) g2.current.rotation.z = -0.30 + Math.sin(t * 0.7 + 2) * 0.06
  })
  return (
    <group>
      {/* The bar they hang from */}
      <mesh position={[0, 2.96, 0.6]}>
        <boxGeometry args={[4.6, 0.07, 0.07]} />
        <meshStandardMaterial color="#1A1D24" roughness={0.5} metalness={0.8} />
      </mesh>
      <mesh ref={g1} geometry={geo} material={pinkMat} position={[-1.7, 2.94, 0.6]} rotation={[0.12, 0, 0.34]} />
      <mesh ref={g2} geometry={geo} material={violetMat} position={[1.7, 2.94, 0.6]} rotation={[0.12, 0, -0.30]} />
      {/* Lamp heads */}
      {[-1.7, 1.7].map((x) => (
        <mesh key={x} position={[x, 2.93, 0.6]}>
          <cylinderGeometry args={[0.07, 0.09, 0.16, 10]} />
          <meshStandardMaterial color="#111318" roughness={0.6} metalness={0.6} />
        </mesh>
      ))}
    </group>
  )
}

/* ── his first crowd ────────────────────────────────────────────────
 * ~24 pegs, backs to us, faces to him — and moving WITH the song. Two
 * shared warm-grey materials: this room is warmer than 6.3's street.
 */
const CROWD_WARM = new THREE.MeshStandardMaterial({
  color: '#5A5048', emissive: '#5A5048', emissiveIntensity: 0.05, roughness: 0.9,
})
const CROWD_WARM_DARK = new THREE.MeshStandardMaterial({
  color: '#3B342E', emissive: '#3B342E', emissiveIntensity: 0.05, roughness: 0.9,
})
const CLUB_TYPES: Archetype[] = ['tall', 'tall', 'short', 'thin', 'wide', 'hunched', 'tall', 'short']

type Fan = {
  pos: [number, number, number]
  scale: number
  archetype: Archetype
  dark: boolean
  /** Beat desync + personal energy. */
  lag: number
  amp: number
  swayPhase: number
}

function ClubCrowd() {
  const fans = useMemo(() => {
    const rng = seededRandom(6501)
    const out: Fan[] = []
    let guard = 0
    while (out.length < 24 && guard++ < 400) {
      const z = 1.35 + rng() * 3.0
      // Fill the room but keep the corridor our lens looks down: nothing
      // inside 0.55 of the sight line (CAM → hero) at its own depth, and
      // nothing crowding the tripod.
      const u = (CAM_A[2] - z) / (CAM_A[2] - HERO_POS[2])
      const sightX = CAM_A[0] + (LOOK_AT[0] - CAM_A[0]) * u
      const x = -3.1 + rng() * 5.6
      // Keep the whole corridor our lens looks down clear — of him, AND of
      // the LED strip on the riser lip.
      if (Math.abs(x - sightX) < 0.5) continue
      if (Math.hypot(x - PROP_CAM[0], z - PROP_CAM[2]) < 0.6) continue
      out.push({
        pos: [x, 0, z],
        scale: 0.82 + rng() * 0.2,
        archetype: CLUB_TYPES[Math.floor(rng() * CLUB_TYPES.length)],
        dark: rng() > 0.45,
        lag: rng() * 0.14,
        amp: 0.5 + rng() * 0.5,
        swayPhase: rng() * Math.PI * 2,
      })
    }
    return out
  }, [])
  return <group>{fans.map((f, i) => <FanPeg key={i} {...f} />)}</group>
}

function FanPeg({ pos, scale, archetype, dark, lag, amp, swayPhase }: Fan) {
  const ref = useRef<Group>(null)
  useFrame(() => {
    const t = getAnimTime()
    // The room bobs on the record — desynced per head, the way a real room
    // is never quite together.
    const jump = venueBeatJump(t + FILM_FROM - lag)
    if (ref.current) {
      ref.current.position.set(pos[0], jump * 0.045 * amp, pos[2])
      ref.current.rotation.z = Math.sin(t * 1.9 + swayPhase) * 0.035 * amp
    }
  })
  return (
    <group ref={ref} position={pos}>
      <CrowdPeg archetype={archetype} scale={scale * PEG_PER_GOLD}
        material={dark ? CROWD_WARM_DARK : CROWD_WARM} />
    </group>
  )
}

/** The camera operator — a peg standing behind the tripod, still (working). */
function Operator() {
  return (
    <group position={[2.26, 0, 3.58]}>
      <CrowdPeg archetype="thin" scale={0.94 * PEG_PER_GOLD} material={CROWD_WARM_DARK} />
    </group>
  )
}

/* ── camera ─────────────────────────────────────────────────────────*/
function CameraRig() {
  const yieldCamera = useCameraHandoff()
  const target = useRef(new THREE.Vector3())
  useFrame(({ camera }) => {
    if (yieldCamera()) return
    const t = getAnimTime()
    const u = smooth(clamp01(t / DUR))
    camera.position.set(
      CAM_A[0] + (CAM_B[0] - CAM_A[0]) * u,
      CAM_A[1] + (CAM_B[1] - CAM_A[1]) * u,
      CAM_A[2] + (CAM_B[2] - CAM_A[2]) * u,
    )
    target.current.set(LOOK_AT[0], LOOK_AT[1], LOOK_AT[2])
    camera.lookAt(target.current)
    // He is ~4.7 m down the corridor and the lookAt quaternion has thrown that
    // distance away — hand the debug camera his chest to orbit, not our nose.
    publishSceneLookAt(target.current.x, target.current.y, target.current.z)
  })
  return null
}

function SceneContent() {
  const heroLightRef = useRef<THREE.PointLight>(null)
  useFrame(() => {
    const t = getAnimTime()
    const wave = ramp(t, T_WAVE, T_WAVE + 0.4)
    if (heroLightRef.current) heroLightRef.current.intensity = 4.2 + wave * 1.2
  })
  return (
    <>
      <CameraRig />
      <GradientEnvironment zenith="#1A1410" horizon="#241A14" ground="#0C0908" intensity={0.56} />
      <ambientLight color="#4A4038" intensity={0.3} />
      <fog attach="fog" args={['#120D0B', 7, 20]} />

      <Club />
      <LedStrip />
      <ClubBeams />

      {/* His own light, and one warm practical over the stage. */}
      <pointLight ref={heroLightRef} position={[0.3, 2.4, 0.7]} color={HERO_GOLD}
        intensity={4.2} distance={5.5} decay={1.9} />
      <pointLight position={[0, 2.7, 2.8]} color="#6A5E52" intensity={4.5}
        distance={8} decay={1.8} />

      <Hero />
      <Band />
      {/* Planted on the riser, NOT in the hero's group — he steps away from
          it when he turns to the camera; the stand stays where stands stay. */}
      <MicStand position={[0, RISER_TOP, HERO_POS[2] + 0.44]} />
      <ClubCrowd />
      <Operator />
      <BroadcastCamera position={PROP_CAM} aimAt={[0, HERO_HEAD_Y - 0.15, HERO_POS[2]]} />
    </>
  )
}

export default createScene({
  background: '#0D0A09',
  three: {
    camera: { position: CAM_A, fov: 44, near: 0.1, far: 60 },
    gl: {
      antialias: true,
      toneMapping: THREE.ACESFilmicToneMapping,
      toneMappingExposure: 1.05,
    },
    onCreated: ({ camera }) => camera.lookAt(...LOOK_AT),
    debugTarget: [0, 1.6, -0.2],
  },
}, function Act6_5() {
  return (
    <>
      <SceneContent />
      <EffectComposer>
        <Bloom intensity={0.6} luminanceThreshold={0.62} luminanceSmoothing={0.4} radius={0.5} mipmapBlur />
        <Vignette eskil={false} offset={0.22} darkness={0.68} />
      </EffectComposer>
    </>
  )
})
