/**
 * Act 7.4 — "The Walk Home" (film 147.3 → 153.8, 6.5s).
 *
 * 6.85 has just swept its camera around him as the stadium turned into this
 * valley: its last frame is this scene's first — the lens settled behind his
 * shoulder, him STANDING on the road past the last stalls with his arm still
 * up, waving at the lit hanok far ahead, and on its porch — visible, small,
 * alive — the grandmother rocking in the chair. She rises at the sight of
 * the wave (t≈0.55), ambles across the yard to the road edge, and settles
 * into exactly the figure who waits through 8.55's opening while he drops
 * the wave and sets off. The chair keeps rocking a few beats behind her.
 *
 * The last frame IS 8.55's first frame: he lands on GOLDEN_POS, she stands as
 * the real `<ParentFigure>` (swapped in at T_SWAP), every walker is on its
 * `generateWorld()` mark, and the camera evaluates to OPEN_CAM — all enforced
 * in journey74.ts by construction rather than by eye.
 *
 * The world stack (ValleyStill + Towers + Village + market + crowd + the
 * grandmother) is exported as `WalkWorld74` and runs on journey74's t74()
 * clock, because 6.85 mounts the SAME world for its final two seconds with
 * the clock shifted −20.5 — the seam is one world evaluated at one time from
 * two files. The hero and the camera stay here: 6.85 has its own continuous
 * hero, and its camera lands on KEYS_74[0] by construction.
 */
import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import * as THREE from 'three'
import { getAnimTime } from '../../hooks/useAnimTime'
import { createScene } from '../createScene'
import { SceneCanvas } from '../SceneCanvas'
import { FOG_COLOR, GOLD_BRIGHT, NIGHT_BG, PARENT_WARM } from '../act8_55/constants'
import { SkyDome } from '../act8_55/SkyDome'
import { archetypeHeight, archetypeWidth, generateWorld, type World } from '../act8_55/world'
import { Village, toWorld, ORIGIN_X, ORIGIN_Z, S, GroundShadow, groundY } from '../act8_55/locale'
import { Fireflies as SharedFireflies } from '../act8_55/Crowd'
import { NightMarket } from '../act8_55/NightMarket'
import { ParentFigure } from '../act8_55/ParentFigure'
import { heroSkeleton } from '../act8_55/hero'
import { ValleyStill } from '../actB/still'
import { Towers, CityLights } from '../actB/city'
import { beatPulse, HOUSE_X, HOUSE_Z, VALLEY_Y } from '../actB/flight'
import { setPorchClock } from '../actB/porch'
import { PARENT_HAT } from '../actB/valley'
import { HERO_GRAY, HERO_THAW, waveHand } from '../act6b/shared'
import {
  ADULT, buildPose, buildSolvedArmPoints, GoldFigure, v,
  type Curve, type PoseGeometry, type Proportions,
} from '../characters/goldFigure'
import { useCameraHandoff } from '../DebugCamera'
import { publishSceneLookAt } from '../cameraHandoff'
import { sampleCam, smooth01 } from './journey'
import {
  clearing74, DOOR_POS, driftK74, DUR, exposureAt, gmaMotion, gmaPhase, gmaPos,
  gmaScale, gmaYaw, heroMotion, heroPhase, heroSettle, heroX, heroZ, KEYS_74,
  litDrain, PORCH_CLOCK_SHIFT, PORCH_POS, porchGate, rise01, roadGate, rockAngle,
  setJourney74Shift, T_OFF_74, T_SWAP, t74, thaw, waveUp, worldAt,
} from './journey74'

/* ══ Small helpers ══════════════════════════════════════════════════ */

/** Point-wise blend of two same-shaped poses (both are buildPose-shaped:
 *  5 curves × 5 points + 1 head sphere). Radii/segments come from `b`. */
export function lerpPose(a: PoseGeometry, b: PoseGeometry, k: number): PoseGeometry {
  const curves: Curve[] = b.curves.map((cb, i) => {
    const ca = a.curves[i]
    return {
      points: cb.points.map((p, j) => ca.points[j].clone().lerp(p, k)),
      radius: cb.radius,
      segments: cb.segments,
    }
  })
  return {
    curves,
    spheres: b.spheres.map((sb, i) => {
      const sa = a.spheres[i]
      return {
        center: sa.center.clone().lerp(sb.center, k),
        radius: sa.radius + (sb.radius - sa.radius) * k,
      }
    }),
  }
}

/* ══ The hero: grey walking in, gold by the door ═══════════════════ */

/**
 * His start state continues 6.85's end: HERO_GRAY already warmed a fifth
 * toward the thaw — then darkened, because the market's lanterns and the door
 * light do real work here that the grief scenes' darkness never did, and at
 * face value the gray rendered as white. He must read GRAY against a golden
 * crowd: a notch lighter than crowd grey, never silver.
 *
 * Exported (with the emissive pair) because 6.85's continuous hero has to
 * ARRIVE at exactly this material state on its last frame.
 */
export const START_COL = new THREE.Color(HERO_GRAY).lerp(new THREE.Color(HERO_THAW), 0.2)
  .multiplyScalar(0.66)
const THAW_COL = new THREE.Color(HERO_THAW).multiplyScalar(0.82)
const GOLD_BODY = new THREE.Color('#C79A5E')     // 8.55's hero body, to the value
export const EM_GREY = new THREE.Color(HERO_GRAY)
const EM_GOLD = new THREE.Color(GOLD_BRIGHT)
/** The full material state 6.85 must hand over at the seam. */
export const HERO74_START = {
  color: START_COL,
  emissive: EM_GREY,
  emissiveIntensity: 0.07,
  roughness: 0.55,
} as const

/**
 * The hero's whole body at journey74 time `t` — 8.55's walking skeleton with
 * the WAVE overlaid on the left arm while `waveUp` holds it.
 *
 * Exported because it is the SEAM POSE: 6.85's continuous hero point-blends
 * onto `hero74Pose(t − HANDOFF)` through its world-turn, and this scene's
 * `Hero74` renders `hero74Pose(t74())` — at the cut both sides evaluate this
 * function at the same argument (0), so the frame is shared by construction,
 * wave phase included (waveHand's oscillator runs on the same t74 clock on
 * both sides).
 *
 * The wave target/params are 6.85's exactly (mirror, freq 6.5, amp 0.10);
 * the solved arm is rooted on the walking pose's own shoulder point so the
 * release hands back a matched joint, not a popped one.
 */
export function hero74Pose(t: number) {
  const nat = heroSkeleton(heroMotion(t), heroPhase(t))
  const up = waveUp(t)
  if (up > 0.001) {
    const wv = waveHand(t, up, { mirror: true, freq: 6.5, amp: 0.10 })
    const root = nat.curves[1].points[0]
    const solved = buildSolvedArmPoints(-0.02, root.y, v(wv[0], wv[1], wv[2]), ADULT, root.z)
    nat.curves[1] = {
      ...nat.curves[1],
      points: nat.curves[1].points.map((p, i) => p.clone().lerp(solved[i], up)),
    }
  }
  return nat
}

function Hero74() {
  const group = useRef<THREE.Group>(null)
  const body = useRef<THREE.Group>(null)

  const bodyMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: START_COL.clone(), emissive: EM_GREY.clone(), emissiveIntensity: 0.07,
    roughness: 0.55, toneMapped: false,
  }), [])

  /** The shared pose on the t74() clock — the wave rides the first quarter
   *  and releases into the natural stride (see hero74Pose). */
  const skeleton = useMemo(() => () => hero74Pose(t74()), [])

  useFrame(() => {
    const t = getAnimTime()
    const motion = heroMotion(t)
    const settle = heroSettle(t)

    if (group.current) {
      group.current.position.set(heroX(t), 0, heroZ(t))
      group.current.rotation.y = Math.PI // faces down the road (−z)
    }
    if (body.current) {
      body.current.rotation.x = 0.055 * motion - 0.09 * settle
    }

    // The thaw: grey through HERO_THAW to 8.55's exact unlit hero, done by t≈4.7.
    const w = thaw(t)
    if (w < 0.5) bodyMat.color.copy(START_COL).lerp(THAW_COL, w * 2)
    else bodyMat.color.copy(THAW_COL).lerp(GOLD_BODY, w * 2 - 1)
    bodyMat.emissive.copy(EM_GREY).lerp(EM_GOLD, w)
    bodyMat.emissiveIntensity = 0.07 * (1 - w)
    bodyMat.roughness = 0.55 + (0.4 - 0.55) * w
  })

  return (
    <group ref={group}>
      <GroundShadow />
      <group ref={body}>
        <GoldFigure skeleton={skeleton} material={bodyMat} inPlace />
      </group>
    </group>
  )
}

/* ══ The grandmother ════════════════════════════════════════════════ */

/** ParentFigure's gait numbers, copied to the value. */
const GMA_PROPS = { ...ADULT, STRIDE: 0.34, FOOT_LIFT: 0.13 }

/**
 * The porch sitter, re-authored — porchSkeleton's numbers exactly (hips at
 * seat height 0.56, back on the rake, shins to the deck, hands on the
 * armrests, the 0.010 breath) but in buildPose's curve order so the rise can
 * blend it point-for-point into the standing/walking pose.
 */
function gmaSeatedPose(P: Proportions, t: number): PoseGeometry {
  const hipY = 0.52 + 0.04
  const shY = hipY + 0.52
  const breath = 0.010 * Math.sin(t * 0.9)

  const spine = [
    v(0, hipY, 0.02),
    v(0, hipY + 0.16, -0.01),
    v(0, hipY + 0.32, -0.045),
    v(0, hipY + 0.45, -0.075),
    v(0, shY + 0.06 + breath, -0.095),
  ]
  const leg = (side: 1 | -1): THREE.Vector3[] => {
    const hip = v(side * 0.02, hipY, 0)
    const knee = v(side * 0.15, 0.54, 0.40)
    const ankle = v(side * 0.17, 0.08, 0.47)
    return [hip, hip.clone().lerp(knee, 0.5), knee, knee.clone().lerp(ankle, 0.5), ankle]
  }
  const arm = (side: 1 | -1): THREE.Vector3[] =>
    buildSolvedArmPoints(side * 0.02, shY + breath, v(side * 0.27, 0.76, 0.18), P, -0.09)

  return {
    curves: [
      { points: spine, radius: P.R, segments: 16 },
      { points: arm(-1), radius: P.R, segments: 14 },
      { points: arm(1), radius: P.R, segments: 14 },
      { points: leg(-1), radius: P.R, segments: 16 },
      { points: leg(1), radius: P.R, segments: 16 },
    ],
    spheres: [{ center: v(0, shY + 0.27 + breath, -0.03), radius: P.RH }],
  }
}

/**
 * One figure for the whole beat — seated and rocking with the chair, rising,
 * crossing the yard, settling — then the REAL `<ParentFigure tOff={…}>`
 * takes over at T_SWAP, at a frame where the two agree: standing at
 * PARENT_MEET_POS, dark, facing up the road, weight-shift in phase (this
 * figure runs ParentFigure's own idle formula on 8.55's clock).
 *
 * She does not glow. Nothing in this valley glows before the touch — she is
 * lit by the house lamp she has been sitting under, and by nothing else.
 *
 * Runs on t74(), so 6.85's ending shows her seated and rocking (t74 < 0
 * never reaches T_RISE), continuous into this scene's own opening.
 */
function Grandma74({ tOff }: { tOff: number }) {
  const group = useRef<THREE.Group>(null)
  const body = useRef<THREE.Group>(null)
  const parentWrap = useRef<THREE.Group>(null)

  // ParentFigure's material, to the value (dark until a touch that happens in
  // the next act).
  const mat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#7C5C38', emissive: PARENT_WARM, emissiveIntensity: 0, roughness: 0.72,
  }), [])

  const skeleton = useMemo(() => () => {
    const t = t74()
    const m = gmaMotion(t)
    const stand = buildPose('walking', {
      P: {
        ...GMA_PROPS,
        STRIDE: Math.max(0.02, GMA_PROPS.STRIDE * m),
        FOOT_LIFT: GMA_PROPS.FOOT_LIFT * m,
      },
      phase: m > 0.02 ? gmaPhase(t) : 0,
      headForwardTilt: 0.03,
    })
    const r = rise01(t)
    if (r >= 1) return stand
    return lerpPose(gmaSeatedPose(ADULT, t), stand, r)
  }, [])

  useFrame(() => {
    const t = t74()
    const swapped = t >= T_SWAP
    if (group.current) group.current.visible = !swapped
    if (parentWrap.current) parentWrap.current.visible = swapped
    if (swapped) return

    const m = gmaMotion(t)
    const r = rise01(t)
    const [gx, gz] = gmaPos(t)

    if (group.current) {
      group.current.position.set(gx, 0, gz)
      group.current.rotation.y = gmaYaw(t)
      // ParentFigure's exact idle weight-shift, on 8.55's clock, so the swap
      // frame agrees to the bit.
      group.current.rotation.z = Math.sin((t - DUR) * 0.31) * 0.016 * (1 - m)
      group.current.scale.setScalar(gmaScale(t))
    }
    if (body.current) {
      // Rocking with the chair while seated (same curve the porch runs),
      // a forward lean over the feet through the rise, and the walk lean.
      body.current.rotation.x =
        rockAngle(t) * (1 - r) + Math.sin(r * Math.PI) * 0.26 + 0.05 * m
    }
  })

  return (
    <>
      <group ref={group}>
        <GroundShadow r={0.46} />
        <group ref={body}>
          <GoldFigure skeleton={skeleton} material={mat} inPlace hat={PARENT_HAT} />
        </group>
      </group>
      <group ref={parentWrap} visible={false}>
        <ParentFigure tOff={tOff} />
      </group>
    </>
  )
}

/* ══ The crowd — Walkers, retimed for one 6.5s scene ════════════════ */

const LIT_MARKET = 0.15
const LIT_HANDOFF = 0.025
const CLEAR_R = 1.7
const CLEAR_R_PORCH = 1.15
const CLEAR_R_ROAD = 0.9

function litAt(t: number, vary: number): number {
  return LIT_HANDOFF + (LIT_MARKET * vary - LIT_HANDOFF) * litDrain(t)
}

function Walkers74({ world }: { world: World }) {
  const { figures } = world
  const N = figures.length
  const bodies = useRef<THREE.InstancedMesh>(null)
  const heads = useRef<THREE.InstancedMesh>(null)
  const dummy = useMemo(() => new THREE.Object3D(), [])

  const { palette, bodyColors, drift } = useMemo(() => {
    const palette = new Float32Array(N * 3)
    const bodyColors = new Float32Array(N * 3)
    const drift = new Float32Array(N * 8)
    const c = new THREE.Color()
    for (let i = 0; i < N; i++) {
      const f = figures[i]
      c.set(f.color)
      const depth = Math.abs(f.z)
      const dim = depth < 12 ? 1.0 : depth < 26 ? 0.85 : 0.7
      palette[i * 3] = c.r * dim
      palette[i * 3 + 1] = c.g * dim
      palette[i * 3 + 2] = c.b * dim

      const d = i * 8
      drift[d] = 0.21 + ((i * 13) % 17) / 17 * 0.17
      drift[d + 1] = 0.17 + ((i * 29) % 19) / 19 * 0.16
      drift[d + 2] = 0.55 + ((i * 41) % 23) / 23 * 0.5
      drift[d + 3] = 0.13 + ((i * 7) % 11) / 11 * 0.12
      drift[d + 4] = 0.5 + ((i * 53) % 29) / 29 * 0.8
      drift[d + 5] = 0.45 + ((i * 37) % 31) / 31 * 0.7
      drift[d + 6] = f.swayOffset
      drift[d + 7] = 0.6 + ((i * 61) % 37) / 37 * 0.85
    }
    return { palette, bodyColors, drift }
  }, [figures, N])

  useFrame(({ camera }) => {
    const bs = bodies.current
    const hs = heads.current
    if (!bs || !hs) return
    const t = t74()
    const hx = heroX(t)
    const hz = heroZ(t)
    const dk = driftK74(t)
    const t8 = t - DUR

    // Camera in VILLAGE units (it lives out in Act B's world space).
    const camX = (ORIGIN_X - camera.position.x) / S
    const camZ = (ORIGIN_Z - camera.position.z) / S

    // THE LENS BUBBLE — only while 6.85's closing arc is sweeping through
    // the crowd bank (t74 well below 0). The corridor gates clear the
    // camera→hero sightline but skip figures at proj < 0.04, i.e. standing
    // ON the lens — and the leftward arc passes within a body's width of
    // the bank, which put one giant capsule across the whole frame. Faded
    // out 0.15s before the seam so the handoff frame is untouched.
    const bubble = 1 - smooth01((t + 0.5) / 0.35)

    // Corridor 1: the camera → hero sightline.
    const lineX = hx - camX
    const lineZ = hz - camZ
    const lineLen2 = Math.max(1e-4, lineX * lineX + lineZ * lineZ)
    const clearing = clearing74(t)

    // Corridor 2: camera → the porch, open only around the chair beat.
    const pg = porchGate(t)
    const line2X = PORCH_POS[0] - camX
    const line2Z = PORCH_POS[1] - camZ
    const line2Len2 = Math.max(1e-4, line2X * line2X + line2Z * line2Z)

    // Corridor 3: camera → the lit door, the length of the road.
    const rg = roadGate(t)
    const line3X = DOOR_POS[0] - camX
    const line3Z = DOOR_POS[1] - camZ
    const line3Len2 = Math.max(1e-4, line3X * line3X + line3Z * line3Z)

    const bodyColAttr = bs.geometry.getAttribute('color') as THREE.BufferAttribute
    const headColAttr = hs.geometry.getAttribute('color') as THREE.BufferAttribute
    const cols = bodyColAttr.array as Float32Array

    for (let i = 0; i < N; i++) {
      const f = figures[i]
      const d = i * 8
      const ph = drift[d + 6]

      // The quiet pocket (the stall-free last stretch, z < −8) stays quiet:
      // full-radius wander let figures whose marks flank the road drift ONTO
      // it, and a stranger standing mid-road between him and the door was the
      // largest thing in the frame for three seconds. They still breathe.
      const pocket = f.z < -8.5 ? 0.3 : 1
      const x = f.x + Math.sin(t * drift[d] + ph) * drift[d + 4] * dk * pocket
      const z = f.z + Math.sin(t * drift[d + 1] + ph * 1.7 + 1.1) * drift[d + 5] * dk * pocket
      const float = Math.sin(t * drift[d + 2] + ph * 2.3) * 0.075 * dk
      const yaw = Math.sin(t * drift[d + 3] + ph * 0.7) * 0.55 * dk

      let vis = 1

      if (bubble > 0) {
        const dCam = Math.hypot(x - camX, z - camZ)
        if (dCam < 1.35) vis *= 1 - bubble * (1 - smooth01(dCam / 1.35))
      }

      if (clearing > 0) {
        const px = x - camX
        const pz = z - camZ
        const proj = (px * lineX + pz * lineZ) / lineLen2
        if (proj > 0.04 && proj < 0.98) {
          const perp = Math.hypot(px - lineX * proj, pz - lineZ * proj)
          if (perp < CLEAR_R) vis *= 1 - clearing * (1 - smooth01(perp / CLEAR_R))
        }
      }
      if (pg > 0) {
        const px = x - camX
        const pz = z - camZ
        const proj = (px * line2X + pz * line2Z) / line2Len2
        if (proj > 0.04 && proj < 0.96) {
          const perp = Math.hypot(px - line2X * proj, pz - line2Z * proj)
          if (perp < CLEAR_R_PORCH) vis *= 1 - pg * (1 - smooth01(perp / CLEAR_R_PORCH))
        }
      }
      if (rg > 0) {
        const px = x - camX
        const pz = z - camZ
        const proj = (px * line3X + pz * line3Z) / line3Len2
        if (proj > 0.04 && proj < 0.97) {
          const perp = Math.hypot(px - line3X * proj, pz - line3Z * proj)
          if (perp < CLEAR_R_ROAD) vis *= 1 - rg * (1 - smooth01(perp / CLEAR_R_ROAD))
        }
      }

      const bodyH = archetypeHeight(f.archetype) * f.scale * 3
      const bodyW = archetypeWidth(f.archetype) * f.scale * 3
      const gy = groundY(x, z)

      // 8.55's idle sway at its t=0 amplitude, term for term (see Walkers.tsx).
      const sway = Math.sin(t8 * f.swaySpeed * 0.9 + ph) * f.swayAmount * 0.35 * 0.15

      if (vis > 0.001) {
        dummy.position.set(x + sway, gy + float + bodyH * 0.5 * vis, z)
        dummy.rotation.set(0, yaw, sway * 1.5, 'YXZ')
        dummy.scale.set(bodyW * vis, bodyH * vis, bodyW * vis)
      } else {
        dummy.position.set(x, -10, z)
        dummy.rotation.set(0, 0, 0, 'YXZ')
        dummy.scale.setScalar(0.0001)
      }
      dummy.updateMatrix()
      bs.setMatrixAt(i, dummy.matrix)

      const headR = 0.13 * f.scale * (f.archetype === 'child' ? 1.15 : 1)
      if (vis > 0.001) {
        dummy.position.set(
          x + sway * 1.15,
          gy + float + (bodyH * 1.5 + headR * 0.9) * vis,
          z,
        )
        dummy.rotation.set(0, yaw, sway * 0.8, 'YXZ')
        dummy.scale.setScalar(headR * vis)
      } else {
        dummy.position.set(x, -10, z)
        dummy.scale.setScalar(0.0001)
      }
      dummy.updateMatrix()
      hs.setMatrixAt(i, dummy.matrix)

      const lit = litAt(t, drift[d + 7])
      cols[i * 3] = palette[i * 3] * lit
      cols[i * 3 + 1] = palette[i * 3 + 1] * lit
      cols[i * 3 + 2] = palette[i * 3 + 2] * lit
    }

    bs.instanceMatrix.needsUpdate = true
    hs.instanceMatrix.needsUpdate = true
    bodyColAttr.needsUpdate = true
    headColAttr.needsUpdate = true
  })

  return (
    <>
      <instancedMesh ref={bodies} args={[undefined, undefined, N]} frustumCulled={false}>
        <capsuleGeometry args={[0.5, 1, 4, 8]} />
        <meshBasicMaterial vertexColors toneMapped={false} />
        <instancedBufferAttribute attach="geometry-attributes-color" args={[bodyColors, 3]} />
      </instancedMesh>
      <instancedMesh ref={heads} args={[undefined, undefined, N]} frustumCulled={false}>
        <sphereGeometry args={[1, 8, 6]} />
        <meshBasicMaterial vertexColors toneMapped={false} />
        <instancedBufferAttribute attach="geometry-attributes-color" args={[bodyColors, 3]} />
      </instancedMesh>
    </>
  )
}

/* ══ Camera ═════════════════════════════════════════════════════════ */

function CameraRig74() {
  const yieldCamera = useCameraHandoff()
  const tgt = useRef(new THREE.Vector3())

  useFrame(({ camera }) => {
    if (yieldCamera()) return
    const t = getAnimTime()
    const { d, t: lk, fov } = sampleCam(KEYS_74, t)
    const hx = heroX(t)
    const hz = heroZ(t)

    // Hand-held breath, dying over the last stretch so the final frame sits
    // exactly on 8.55's opening key. 6.85's closing arc runs this same
    // formula (at t74 < 0), so the breath phase is continuous across the cut.
    const bk = 1 - smooth01((t - (DUR - 1.5)) / 1.4)
    const bx = Math.sin(t * 0.29) * 0.05 * bk
    const by = Math.sin(t * 0.41 + 1.2) * 0.04 * bk

    const p = toWorld(hx + d[0] + bx, d[1] + by, hz + d[2])
    const q = toWorld(hx + lk[0], lk[1], hz + lk[2])
    camera.position.set(p[0], p[1], p[2])
    tgt.current.set(q[0], q[1], q[2])
    camera.lookAt(tgt.current)
    // The look-at sits well down the road — village units × S, so 150–250 world
    // units out — and lookAt keeps only the direction. Hand over the pivot too,
    // or the debug camera orbits a point just off its own nose.
    publishSceneLookAt(tgt.current.x, tgt.current.y, tgt.current.z)

    const cam = camera as THREE.PerspectiveCamera
    if (cam.isPerspectiveCamera && Math.abs(cam.fov - fov) > 1e-4) {
      cam.fov = fov
      cam.updateProjectionMatrix()
    }
  })

  return null
}

/* ══ The shared world (also 6.85's countryside) ═════════════════════ */

/** Fireflies at full strength for the whole shot, exactly as Scene7 runs them. */
const ALWAYS = () => 1

/** Drives PorchRocker (inside ValleyHouse) on t74(): the chair rocks under
 *  our own seated grandmother, empties at T_RISE, and decays. */
const PORCH_OVERRIDE = {
  time: () => t74() + PORCH_CLOCK_SHIFT,
  sitter: false,
}

function PorchDriver() {
  setPorchClock(PORCH_OVERRIDE)
  useEffect(() => {
    setPorchClock(PORCH_OVERRIDE)
    return () => setPorchClock(null)
  }, [])
  return null
}

/** Exposure: flat at the shared 1.25 — 6.85 ramps up TO this value during the
 *  world-turn, so there is nothing left to fade here. */
function Exposure() {
  useFrame(({ gl }) => {
    gl.toneMappingExposure = exposureAt(getAnimTime())
  })
  return null
}

/**
 * 8.55's fog, not Act B's — copied to the value from Act8_55's ActFog. Act B
 * runs a FogExp2 tuned for a valley looked at from the air; standing on the
 * road it closes over the house at four hundred units and the "lit hanok far
 * ahead" reads as a black cutout (measured: the whole reason 8.55 replaced
 * it). Linear, starting past the whole field — and since this scene's last
 * frame is 8.55's first, sharing its fog makes the cut invisible in the
 * atmosphere too, not just in the geometry. Applied from useFrame because
 * `Atmosphere` (inside ValleyStill, mounted above) assigns scene.fog every
 * frame and would win; mounted after it, this runs after it.
 */
function ActFog74() {
  const { scene } = useThree()
  const fog = useMemo(() => new THREE.Fog(FOG_COLOR, 2000, 26000), [])
  useFrame(() => { scene.fog = fog })
  return null
}

/**
 * The hooks ride under this scene, and the house hears them: a small extra
 * lamp at the door whose intensity rides the beat — the house lamp visibly
 * breathing, +8% on the pulse, without touching ValleyHouse.
 */
const LAMP_POS: [number, number, number] = [
  HOUSE_X, VALLEY_Y + 7 + 38 * 0.9, HOUSE_Z - 38 * 2.2,
]
function LampBreath() {
  const ref = useRef<THREE.PointLight>(null)
  useFrame(() => {
    if (ref.current) ref.current.intensity = 30000 * 0.08 * beatPulse(t74(), 0)
  })
  return (
    <pointLight ref={ref} position={LAMP_POS} color="#FFBA42"
      intensity={0} distance={520} decay={1.8} />
  )
}

/**
 * Everything in the frame except the hero and the camera, on the t74() clock.
 *
 * `shift`: t74() = anim time + shift. 7.4 passes 0; 6.85 passes −20.5 so its
 * last two seconds ARE this world approaching its own t=0.
 * `driveWorldClock`: ValleyStill's WorldClock owns `setFlightOffset` when
 * true; 6.85 passes false and arbitrates the flight clock itself (its gray
 * stadium reads the same module global).
 */
export function WalkWorld74({ shift = 0, driveWorldClock = true }: {
  shift?: number
  driveWorldClock?: boolean
}) {
  setJourney74Shift(shift)
  useEffect(() => {
    setJourney74Shift(shift)
    return () => setJourney74Shift(0)
  }, [shift])

  // The same seed 8.55 uses — these are literally its people and its market.
  const world = useMemo(() => generateWorld(), [])
  const tOff = T_OFF_74 + shift
  const atFn = useMemo(() => (t: number) => worldAt(t + shift), [shift])

  return (
    <>
      <PorchDriver />

      <ValleyStill
        at={worldAt(0)}
        atFn={driveWorldClock ? atFn : undefined}
        people={false}
        // Act B's stars, moon and cloud bank stay off: this scene shares
        // 8.55's sky (mounted below) so the cut into it changes nothing.
        night={false}
        farmland="none"
      />

      {/* The city he is walking home from, behind the pass. */}
      <Towers />
      <CityLights />
      <LampBreath />

      <Village>
        {/* 8.55's own sky — dome, stars, moon, nebula bed — on 8.55's clock. */}
        <SkyDome timeOffset={tOff} />
        <NightMarket stalls={world.stalls} timeOffset={tOff} />
        <SharedFireflies tOff={tOff} fade={ALWAYS} />
        <Walkers74 world={world} />
        <Grandma74 tOff={tOff} />
      </Village>
    </>
  )
}

/* ══ Scene wiring ═══════════════════════════════════════════════════ */

function SceneContent74() {
  return (
    <>
      <CameraRig74 />
      <Exposure />
      <WalkWorld74 shift={0} />
      <ActFog74 />
      <Village>
        <Hero74 />
      </Village>
    </>
  )
}

const k0 = sampleCam(KEYS_74, 0)
const START = toWorld(heroX(0) + k0.d[0], k0.d[1], heroZ(0) + k0.d[2])

export default createScene({ background: NIGHT_BG }, function Act7_4() {
  return (
    <div style={{ width: '100%', height: '100%', background: NIGHT_BG, overflow: 'hidden' }}>
      <SceneCanvas
        style={{ width: '100%', height: '100%' }}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.25,
          preserveDrawingBuffer: true,
        }}
        camera={{ position: START, fov: k0.fov, near: 1, far: 24000 }}
        debugTarget={toWorld(heroX(0), 1, heroZ(0))}
      >
        <SceneContent74 />
        <EffectComposer>
          <Bloom intensity={1.0} luminanceThreshold={0.2} luminanceSmoothing={0.85} mipmapBlur />
          <Vignette eskil={false} offset={0.18} darkness={0.48} />
        </EffectComposer>
      </SceneCanvas>
    </div>
  )
})
