/**
 * Act 6.9 — GRAY MONTAGE (8.0s, SILENCE)
 *
 * He never moves from frame center. The world swaps around him three times:
 *
 *   1. t 0–2.7   THE MEMBERS — the other six, in colour, mid-celebration
 *                (dance-in-place, one mid-jump), confetti drifting, a
 *                dressing-room mirror-bulb strip. The world went on.
 *   2. t 2.7–5.3 THE CROWD — an award-show corridor, grey pegs streaming
 *                past in both directions, camera flashes popping. They flow
 *                AROUND his stillness.
 *   3. t 5.3–8.0 THE BED — the room empties to near-black and a bed
 *                assembles behind his standing body: mattress rising flush
 *                behind him, pillow behind the head, a blanket sliding up
 *                to the collarbone, one cold window-light slab. Read: we
 *                are looking DOWN at him lying awake.
 *
 * His droop deepens k 0.6 → 0.95 across the whole scene (custom skeleton —
 * the head comes DOWN, Act4_10's childHeadLocal recipe; headForwardTilt is
 * not a droop). His only self-motion: at the very end the head tilts back
 * to face "up" — toward us.
 *
 * Vignettes are groups whose materials' opacity/emissive ramp — nothing
 * unmounts mid-scene (WebGL context stability); off-vignettes get
 * `visible=false` only once fully faded. One slow camera push the whole 8s
 * (6.1's grammar), fov 44 → 40. Everything a pure function of getAnimTime().
 */

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import * as THREE from 'three'
import type { Group } from 'three'

import { createScene } from '../createScene'
import { getAnimTime } from '../../hooks/useAnimTime'
import { useCameraHandoff } from '../DebugCamera'
import { publishSceneLookAt } from '../cameraHandoff'
import {
  GoldFigure, v, buildPose,
  type Proportions, type PoseGeometry,
} from '../characters/goldFigure'
import { CrowdPeg, PEG_PER_GOLD, type Archetype } from '../characters/CrowdPeg'
import { buildCloud, makeGlowMaterial, updateGlow } from '../actB/points'
import { GlowPoints } from '../actB/GlowPoints'
import { seededRandom } from '../../utils/svgHelpers'
import {
  HERO_GRAY, HERO_GRAY_EMISSIVE, GRIEF_DARK,
  clamp01, smooth, ramp,
} from './shared'

const DUR = 8.0

/* ── The three envelopes. Crossfades, never cuts: each vignette's whole
 *    material set rides its envelope, and the overlaps are the transitions.
 *    Each one must read in its first half-second — the ramps are steep and
 *    the imagery is staged to be legible at 30% opacity. ── */
const env1 = (t: number) => 1 - ramp(t, 2.3, 2.95)
const env2 = (t: number) => ramp(t, 2.55, 3.15) * (1 - ramp(t, 5.0, 5.6))
const env3 = (t: number) => ramp(t, 5.05, 5.7)

/* ═══ THE HERO — gray, center, drooping ═══════════════════════════════ */

/** Droop depth: continues 6.8's 60% and deepens to 95% by the bed. */
const droopK = (t: number) => 0.6 + 0.35 * ramp(t, 0.3, 5.9)
/** The one gesture he makes: the head tilts back to face "up" — us. */
const faceUp = (t: number) => ramp(t, 6.95, 7.85)

/**
 * Standing droop, per the Act4_10 recipe: hips give slightly, shoulders
 * roll forward, and the head comes DOWN the neck (y collapses toward the
 * shoulders) rather than sliding forward on it. At the end the head blends
 * to an up-facing pose — chin lifted, crown back — while the folded
 * shoulders stay folded: a man lying awake, staring at the ceiling.
 */
function droopSkeleton({ P, t }: { P: Proportions; t: number }): PoseGeometry {
  const k = droopK(t)
  const up = faceUp(t)
  const torso = P.SHOULDER_Y - P.HIP_Y
  const neck = P.HEAD_Y - P.SHOULDER_Y

  // Chest-only breathing (house rule: receivers hold still and breathe;
  // grief receives). The head is deliberately not on it.
  const breathe = Math.sin(t * 2.2) * 0.005

  const hipY = P.HIP_Y - 0.05 * k
  const hipZ = -0.02 * k
  const shoulderY = hipY + torso * (1 - 0.06 * k)
  const shoulderZ = 0.13 * k

  // Head — drooped (down the neck, nudged forward) vs face-up (full neck
  // height, crown rolled back past the shoulders).
  const down = { y: shoulderY + neck * (1 - 0.42 * k), z: shoulderZ + 0.1 * k + 0.03 }
  const upAt = { y: shoulderY + neck * 0.98, z: shoulderZ - 0.13 }
  const head = v(0, down.y + (upAt.y - down.y) * up, down.z + (upAt.z - down.z) * up)

  const shoulder = v(0, shoulderY + breathe, shoulderZ + breathe * 0.4)
  // A neck nub toward wherever the head currently is, so the tilt-back
  // reads as a neck bending and not a sphere teleporting.
  const neckTip = shoulder.clone().lerp(head, 0.5)

  const spine = [
    v(0, hipY, hipZ),
    v(0, hipY + torso * 0.33, hipZ + (shoulderZ - hipZ) * 0.25),
    v(0, hipY + torso * 0.7, hipZ + (shoulderZ - hipZ) * 0.68),
    shoulder,
    neckTip,
  ]

  const arm = (s: number) => {
    const sh = v(s * 0.02, shoulderY + breathe * 0.6, shoulderZ)
    const elbow = v(s * 0.11, shoulderY - P.ARM * 0.5, shoulderZ * 0.35)
    const hand = v(s * 0.1, shoulderY - P.ARM, -0.01)
    return [sh, sh.clone().lerp(elbow, 0.4), elbow, elbow.clone().lerp(hand, 0.5), hand]
  }
  const leg = (s: number) => {
    const hip = v(s * 0.02, hipY, hipZ)
    const ankle = v(s * 0.035, P.FOOT_Y, 0)
    return [hip, hip.clone().lerp(ankle, 0.33), hip.clone().lerp(ankle, 0.5),
      hip.clone().lerp(ankle, 0.67), ankle]
  }

  return {
    curves: [
      { points: spine, radius: P.R, segments: 16 },
      { points: arm(-1), radius: P.R, segments: 14 },
      { points: arm(+1), radius: P.R, segments: 14 },
      { points: leg(-1), radius: P.R, segments: 16 },
      { points: leg(+1), radius: P.R, segments: 16 },
    ],
    spheres: [{ center: head, radius: P.RH }],
  }
}

function Hero() {
  const mat = useMemo(() => new THREE.MeshStandardMaterial({
    color: HERO_GRAY, emissive: HERO_GRAY,
    emissiveIntensity: HERO_GRAY_EMISSIVE, roughness: 0.5, toneMapped: false,
  }), [])
  return (
    <group>
      <GoldFigure skeleton={droopSkeleton} material={mat} />
      {/* Contact shadow — no shadow-casting lights in this scene. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.011, 0]}>
        <circleGeometry args={[0.34, 24]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.35} depthWrite={false} />
      </mesh>
    </group>
  )
}

/* ═══ VIGNETTE 1 — THE MEMBERS (t 0–2.7) ══════════════════════════════ */

/** Act6_3's MEMBER_COLORS (that const is file-local there), minus the
 *  lead's gold — the gold one is the gray one now. Same people, same hues:
 *  changing them quietly makes them a different band. */
const DANCERS = [
  { name: 'Jin', color: '#FFA3C9', x: -2.25, z: -0.75, dRot: 0.35, phase: 0.11 },
  { name: 'RM', color: '#5B7BFF', x: -1.0, z: -1.55, dRot: -0.2, phase: 0.37 },
  { name: 'V', color: '#B876FF', x: 1.05, z: -1.5, dRot: 0.25, phase: 0.81 },
  { name: 'Jimin', color: '#7BE838', x: 1.72, z: 0.62, dRot: -0.3, phase: 0.24 },
  { name: 'Suga', color: '#6FEDC4', x: 2.62, z: -0.55, dRot: 0.4, phase: 0.52 },
] as const
/** J-Hope gets the mid-jump — of course he does. */
const JUMPER = { color: '#FF6B4D', x: -1.5, z: 0.35, rot: 0.2 }

const GLOW_CELEBRATION = 0.5

/** Frozen-ish jump: preset standing body, arms thrown up in a V (solved),
 *  legs swapped for a tuck — knees up and forward, heels trailing. */
function jumpSkeleton({ P, t }: { P: Proportions; t: number }): PoseGeometry {
  const g = buildPose('standing', {
    P, phase: 0,
    leftHandAt: [-0.36 + Math.sin(t * 1.7) * 0.03, 2.0, 0.02],
    rightHandAt: [0.4 + Math.sin(t * 1.4 + 1.2) * 0.03, 2.12, 0.06],
    solvedArms: true,
  })
  const leg = (s: number) => {
    const hip = v(s * 0.02, P.HIP_Y, 0)
    const knee = v(s * 0.1, P.HIP_Y - 0.16, 0.27)
    const foot = v(s * 0.08, P.HIP_Y - 0.5, -0.06)
    return [hip, hip.clone().lerp(knee, 0.5), knee, knee.clone().lerp(foot, 0.5), foot]
  }
  g.curves[3] = { points: leg(-1), radius: P.R, segments: 16 }
  g.curves[4] = { points: leg(+1), radius: P.R, segments: 16 }
  return g
}

const CONFETTI_COLORS = [
  '#FFA3C9', '#FF6B4D', '#5B7BFF', '#B876FF', '#7BE838', '#6FEDC4', '#FFD24A', '#F5E6C0',
]

function MembersVignette() {
  const root = useRef<Group>(null)
  const jumperRef = useRef<Group>(null)
  const confettiRef = useRef<Group>(null)
  const lightRef = useRef<THREE.PointLight>(null)

  const mats = useMemo(() => {
    const make = (c: string) => new THREE.MeshStandardMaterial({
      color: c, emissive: c, emissiveIntensity: GLOW_CELEBRATION,
      roughness: 0.55, transparent: true,
    })
    return {
      dancers: DANCERS.map((d) => make(d.color)),
      jumper: make(JUMPER.color),
      panel: new THREE.MeshStandardMaterial({
        color: '#0D0E14', emissive: '#161B28', emissiveIntensity: 0.3,
        roughness: 0.35, metalness: 0.15, transparent: true,
      }),
      disc: new THREE.MeshBasicMaterial({
        color: '#000000', transparent: true, opacity: 0.3, depthWrite: false,
      }),
    }
  }, [])

  const confetti = useMemo(
    () => buildCloud(460, 6901, CONFETTI_COLORS, (r) => [
      (r() - 0.5) * 6.2, 0.5 + r() * 3.1, -2.4 + r() * 3.6,
      0.03 + r() * 0.032, 0.6 + r() * 0.4,
    ]),
    [],
  )
  const confettiMat = useMemo(
    () => makeGlowMaterial({ twinkle: 0.4, falloff: 3.2, maxPixels: 34 }), [])

  /** Mirror-bulb strip: a row over the mirror plus a short column at each
   *  end — the dressing-room in eleven watts. Placed by index, not rand. */
  const bulbs = useMemo(
    () => buildCloud(26, 11, ['#FFE3B8', '#FFD9A4'], (_r, i) => {
      if (i < 16) return [-2.63 + i * (5.26 / 15), 2.46, -3.02, 0.075, 1.0]
      const j = i - 16
      const side = j < 5 ? -1 : 1
      return [side * 2.63, 0.85 + (j % 5) * 0.38, -3.02, 0.075, 1.0]
    }),
    [],
  )
  const bulbMat = useMemo(
    () => makeGlowMaterial({ twinkle: 0.06, falloff: 2.6, maxPixels: 30 }), [])

  useFrame((state) => {
    const t = getAnimTime()
    const e = env1(t)
    if (root.current) root.current.visible = e > 0.004
    if (!root.current?.visible) return

    for (const m of mats.dancers) { m.opacity = e; m.emissiveIntensity = GLOW_CELEBRATION * e }
    mats.jumper.opacity = e
    mats.jumper.emissiveIntensity = GLOW_CELEBRATION * e
    mats.panel.opacity = 0.95 * e
    mats.panel.emissiveIntensity = 0.3 * e
    mats.disc.opacity = 0.3 * e

    confettiMat.uniforms.uGlobal.value = e
    bulbMat.uniforms.uGlobal.value = e
    updateGlow(confettiMat, state.camera, state.size.height, t)
    updateGlow(bulbMat, state.camera, state.size.height, t)
    if (lightRef.current) lightRef.current.intensity = 4.2 * e

    // Confetti drifts down and sways; no wrap needed inside 3 seconds.
    if (confettiRef.current) {
      confettiRef.current.position.set(Math.sin(t * 0.5) * 0.08, -0.2 * t, 0)
    }
    // The jump, suspended: a slow dreamlike bob rather than a real arc.
    if (jumperRef.current) {
      jumperRef.current.position.y = 0.42 + Math.sin(t * 1.15 + 0.7) * 0.06
      jumperRef.current.rotation.z = Math.sin(t * 0.9) * 0.03
    }
  })

  return (
    <group ref={root}>
      {DANCERS.map((d, i) => {
        // Facing inward at the gray one, give or take a dance.
        const rot = Math.atan2(-d.x, -d.z) + d.dRot
        return (
          <group key={d.name} position={[d.x, 0, d.z]} rotation={[0, rot, 0]}>
            <GoldFigure pose="walking" inPlace animate phaseOffset={d.phase} material={mats.dancers[i]} />
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]}>
              <circleGeometry args={[0.3, 20]} />
              <primitive object={mats.disc} attach="material" />
            </mesh>
          </group>
        )
      })}

      <group position={[JUMPER.x, 0, JUMPER.z]} rotation={[0, JUMPER.rot, 0]}>
        <group ref={jumperRef}>
          <GoldFigure skeleton={jumpSkeleton} material={mats.jumper} />
        </group>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]}>
          <circleGeometry args={[0.26, 20]} />
          <primitive object={mats.disc} attach="material" />
        </mesh>
      </group>

      {/* Dressing-room hint: a dark mirror slab framed in bulbs. */}
      <mesh position={[0, 1.6, -3.12]}>
        <boxGeometry args={[5.6, 2.2, 0.06]} />
        <primitive object={mats.panel} attach="material" />
      </mesh>
      <GlowPoints cloud={bulbs} material={bulbMat} frustumCulled={false} />

      <group ref={confettiRef}>
        <GlowPoints cloud={confetti} material={confettiMat} frustumCulled={false} />
      </group>

      <pointLight ref={lightRef} position={[0, 2.7, 1.3]} color="#FFD9A8" intensity={3.2} distance={9} />
    </group>
  )
}

/* ═══ VIGNETTE 2 — THE CROWD (t 2.7–5.3) ══════════════════════════════ */

/** 6.3's lane system, faster and drained: direction is per-lane (opposing
 *  streams in adjacent lanes, none within one), even phase spacing per
 *  lane so nobody walks through anybody in a three-second window. */
const LANES = [
  { z: -1.85, dir: +1, n: 9 },
  { z: -1.15, dir: -1, n: 8 },
  { z: 1.0, dir: -1, n: 5 },
  { z: 1.7, dir: +1, n: 4 },
] as const
const TRAVEL = 12
const CORRIDOR_TYPES: Archetype[] = ['tall', 'tall', 'short', 'thin', 'wide', 'hunched', 'tall', 'short']

type CorridorWalker = {
  laneZ: number
  speed: number
  phase0: number
  scale: number
  archetype: Archetype
  dark: boolean
}

function PegStream({ w, matLight, matDark }: {
  w: CorridorWalker
  matLight: THREE.Material
  matDark: THREE.Material
}) {
  const groupRef = useRef<Group>(null)
  const pegRef = useRef<Group>(null)
  useFrame(() => {
    const t = getAnimTime()
    const raw = (t * Math.abs(w.speed) + w.phase0) % TRAVEL
    const x = w.speed > 0 ? raw - TRAVEL / 2 : TRAVEL / 2 - raw
    const stride = t * Math.abs(w.speed) * 3.4 + w.phase0 * 5.1
    if (groupRef.current) {
      groupRef.current.position.set(x, Math.abs(Math.sin(stride)) * 0.035 * w.scale, w.laneZ)
      groupRef.current.rotation.y = w.speed > 0 ? Math.PI / 2 : -Math.PI / 2
    }
    if (pegRef.current) pegRef.current.rotation.z = Math.sin(stride) * 0.045
  })
  return (
    <group ref={groupRef}>
      <group ref={pegRef}>
        <CrowdPeg archetype={w.archetype} scale={w.scale * PEG_PER_GOLD}
          material={w.dark ? matDark : matLight} />
      </group>
    </group>
  )
}

function CorridorVignette() {
  const root = useRef<Group>(null)
  const lightRef = useRef<THREE.PointLight>(null)

  const mats = useMemo(() => ({
    light: new THREE.MeshStandardMaterial({
      color: '#787B84', emissive: '#787B84', emissiveIntensity: 0.09,
      roughness: 0.9, transparent: true,
    }),
    dark: new THREE.MeshStandardMaterial({
      color: '#4C4E56', emissive: '#4C4E56', emissiveIntensity: 0.06,
      roughness: 0.9, transparent: true,
    }),
    carpet: new THREE.MeshStandardMaterial({
      color: '#33323C', roughness: 0.95, transparent: true,
    }),
    pressWall: new THREE.MeshStandardMaterial({
      color: '#181A22', emissive: '#1C2230', emissiveIntensity: 0.2,
      roughness: 1, transparent: true,
    }),
  }), [])

  const walkers = useMemo(() => {
    const rng = seededRandom(4172)
    const out: CorridorWalker[] = []
    for (const lane of LANES) {
      for (let k = 0; k < lane.n; k++) {
        out.push({
          laneZ: lane.z + (rng() - 0.5) * 0.24,
          speed: lane.dir * (1.9 + rng() * 1.5),
          phase0: (k / lane.n) * TRAVEL + (rng() - 0.5) * 0.9,
          // Smaller than him — anonymous, and they must not swallow him.
          scale: 0.64 + rng() * 0.18,
          archetype: CORRIDOR_TYPES[Math.floor(rng() * CORRIDOR_TYPES.length)],
          dark: rng() > 0.45,
        })
      }
    }
    return out
  }, [])

  /** Camera flashes: a sparse hard-twinkle cloud along the back wall and
   *  both wings. uTwinkle 0.97 makes each point spend most of its cycle
   *  dark and pop hot for a few frames — a press line, not fairy lights. */
  const flashes = useMemo(
    () => buildCloud(140, 5303, ['#FFFFFF', '#EAF1FF', '#DCE8FF', '#FFF6E8'], (r) => {
      if (r() < 0.6) {
        return [(r() - 0.5) * 8, 1.0 + r() * 1.2, -2.35 - r() * 0.5, 0.12 + r() * 0.13, 1.5]
      }
      const side = r() > 0.5 ? 1 : -1
      return [side * (2.6 + r() * 2.0), 1.0 + r() * 1.1, -1.6 + r() * 3.0, 0.12 + r() * 0.13, 1.5]
    }),
    [],
  )
  const flashMat = useMemo(
    () => makeGlowMaterial({ twinkle: 0.97, falloff: 2.2, maxPixels: 130 }), [])

  useFrame((state) => {
    const t = getAnimTime()
    const e = env2(t)
    if (root.current) root.current.visible = e > 0.004
    if (!root.current?.visible) return
    mats.light.opacity = e
    mats.dark.opacity = e
    mats.light.emissiveIntensity = 0.09 * e
    mats.dark.emissiveIntensity = 0.06 * e
    mats.carpet.opacity = 0.9 * e
    mats.pressWall.opacity = 0.95 * e
    mats.pressWall.emissiveIntensity = 0.2 * e
    flashMat.uniforms.uGlobal.value = e
    updateGlow(flashMat, state.camera, state.size.height, t)
    if (lightRef.current) lightRef.current.intensity = 5.2 * e
  })

  return (
    <group ref={root}>
      {walkers.map((w, i) => (
        <PegStream key={i} w={w} matLight={mats.light} matDark={mats.dark} />
      ))}
      {/* The red carpet, drained to gray — a corridor with him stuck in it. */}
      <mesh position={[0, 0.012, 0.35]}>
        <boxGeometry args={[15, 0.02, 2.7]} />
        <primitive object={mats.carpet} attach="material" />
      </mesh>
      {/* Press wall behind the far lane, so the flashes pop against a
          surface instead of floating in space. */}
      <mesh position={[0, 1.7, -3.0]}>
        <planeGeometry args={[13, 3.6]} />
        <primitive object={mats.pressWall} attach="material" />
      </mesh>
      <GlowPoints cloud={flashes} material={flashMat} frustumCulled={false} />
      <pointLight ref={lightRef} position={[0, 3.2, 1.4]} color="#C9D6EE" intensity={5.2} distance={12} />
    </group>
  )
}

/* ═══ VIGNETTE 3 — THE BED (t 5.3–8.0) ════════════════════════════════ */

/** Bed pieces slide up from below the (opaque) floor — the room assembles
 *  itself around a man who never moved. Mattress flush behind his back,
 *  pillow behind the head, blanket rising over legs and chest to the
 *  collarbone: with the camera's slight down-angle the standing figure
 *  reads as lying awake, seen from above. */
function BedVignette() {
  const root = useRef<Group>(null)
  const mattressRef = useRef<Group>(null)
  const pillowRef = useRef<Group>(null)
  const blanketRef = useRef<THREE.Mesh>(null)
  const ridgeL = useRef<THREE.Mesh>(null)
  const ridgeR = useRef<THREE.Mesh>(null)
  const foldRef = useRef<THREE.Mesh>(null)
  const lightRef = useRef<THREE.PointLight>(null)

  const mats = useMemo(() => ({
    wall: new THREE.MeshStandardMaterial({
      color: '#0A0B10', roughness: 1, transparent: true, opacity: 0,
    }),
    mattress: new THREE.MeshStandardMaterial({
      color: '#B4BAC8', emissive: '#9AA2B4', emissiveIntensity: 0.1,
      roughness: 0.92, transparent: true, opacity: 0,
    }),
    pillow: new THREE.MeshStandardMaterial({
      color: '#DCE0E8', emissive: '#C2CBDC', emissiveIntensity: 0.12,
      roughness: 0.95, transparent: true, opacity: 0,
    }),
    blanket: new THREE.MeshStandardMaterial({
      color: '#5E6678', emissive: '#454D5E', emissiveIntensity: 0.06,
      roughness: 1, transparent: true, opacity: 0,
    }),
    ridge: new THREE.MeshStandardMaterial({
      color: '#6A7284', emissive: '#525A6C', emissiveIntensity: 0.08,
      roughness: 1, transparent: true, opacity: 0,
    }),
    fold: new THREE.MeshStandardMaterial({
      color: '#CDD3DE', emissive: '#AEB8CC', emissiveIntensity: 0.08,
      roughness: 0.95, transparent: true, opacity: 0,
    }),
    slab: new THREE.MeshBasicMaterial({
      color: '#B9C8E8', transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }),
  }), [])

  const BLANKET_BOTTOM = -0.28
  const BLANKET_TOP = 1.3 // just under the collarbone of the drooped figure

  useFrame(() => {
    const t = getAnimTime()
    const e = env3(t)
    if (root.current) root.current.visible = e > 0.004
    if (!root.current?.visible) return

    const mUp = ramp(t, 5.15, 6.15) // mattress rises
    const pUp = ramp(t, 5.7, 6.4)   // pillow follows
    const bUp = ramp(t, 6.15, 7.2)  // blanket slides up the body
    const wOn = ramp(t, 6.3, 7.15)  // the window light finds the bed

    mats.wall.opacity = 0.96 * e
    if (mattressRef.current) mattressRef.current.position.y = -2.6 * (1 - mUp)
    mats.mattress.opacity = Math.min(1, mUp * 3)
    if (pillowRef.current) pillowRef.current.position.y = -2.6 * (1 - pUp)
    mats.pillow.opacity = Math.min(1, pUp * 3)

    const h = 0.03 + (BLANKET_TOP - BLANKET_BOTTOM - 0.03) * bUp
    if (blanketRef.current) {
      blanketRef.current.scale.y = h
      blanketRef.current.position.y = BLANKET_BOTTOM + h / 2
    }
    // The leg ridges rise with the blanket but stop at the hips — the cue
    // that a body is UNDER this surface, which is the entire trick.
    const rh = Math.min(h, 1.02)
    for (const [i, ridge] of [ridgeL, ridgeR].entries()) {
      if (ridge.current) {
        ridge.current.scale.y = rh
        ridge.current.position.y = BLANKET_BOTTOM + rh / 2
        ridge.current.position.x = i === 0 ? -0.12 : 0.12
      }
    }
    if (foldRef.current) foldRef.current.position.y = BLANKET_BOTTOM + h - 0.03
    mats.blanket.opacity = Math.min(1, bUp * 4)
    mats.ridge.opacity = Math.min(1, bUp * 4)
    mats.fold.opacity = Math.min(1, bUp * 4)

    // Additive reads ~4x hotter than its linear value once the output
    // transform is applied — keep it low and let the dark wall do the work.
    mats.slab.opacity = 0.17 * wOn
    if (lightRef.current) lightRef.current.intensity = 4.2 * wOn
  })

  return (
    <group ref={root}>
      {/* The bedroom wall — full-bleed, near-black; the panes carry the light. */}
      <mesh position={[0, 1.5, -0.42]}>
        <planeGeometry args={[6.4, 3.8]} />
        <primitive object={mats.wall} attach="material" />
      </mesh>
      {/* Mattress — a vertical plane flush behind his back. Wider than the
          blanket so its pale margins show on both sides: a made bed. */}
      <group ref={mattressRef}>
        <mesh position={[0, 0.93, -0.27]}>
          <boxGeometry args={[1.34, 2.55, 0.16]} />
          <primitive object={mats.mattress} attach="material" />
        </mesh>
      </group>
      {/* Pillow, behind where the head will settle when it tilts back. */}
      <group ref={pillowRef}>
        <mesh position={[0, 1.6, -0.175]} rotation={[0.08, 0, 0]}>
          <boxGeometry args={[0.66, 0.42, 0.13]} />
          <primitive object={mats.pillow} attach="material" />
        </mesh>
      </group>
      {/* Blanket — rises in front of him; the fold strip rides its edge;
          two soft ridges where his legs push it up. */}
      <mesh ref={blanketRef} position={[0, BLANKET_BOTTOM, 0.21]}>
        <boxGeometry args={[1.04, 1, 0.05]} />
        <primitive object={mats.blanket} attach="material" />
      </mesh>
      <mesh ref={ridgeL} position={[-0.12, BLANKET_BOTTOM, 0.238]}>
        <boxGeometry args={[0.14, 1, 0.024]} />
        <primitive object={mats.ridge} attach="material" />
      </mesh>
      <mesh ref={ridgeR} position={[0.12, BLANKET_BOTTOM, 0.238]}>
        <boxGeometry args={[0.14, 1, 0.024]} />
        <primitive object={mats.ridge} attach="material" />
      </mesh>
      <mesh ref={foldRef} position={[0, BLANKET_BOTTOM, 0.245]}>
        <boxGeometry args={[1.04, 0.075, 0.055]} />
        <primitive object={mats.fold} attach="material" />
      </mesh>
      {/* The cold window-light slab, thrown on the wall beside the bed —
          four panes of moonlight, nothing warm in any of them. */}
      <group position={[1.45, 1.72, -0.41]} rotation={[0, 0, -0.14]}>
        {([[-0.26, 0.55], [0.26, 0.55], [-0.26, -0.55], [0.26, -0.55]] as const).map(([px, py], i) => (
          <mesh key={i} position={[px, py, 0]}>
            <planeGeometry args={[0.42, 1.0]} />
            <primitive object={mats.slab} attach="material" />
          </mesh>
        ))}
      </group>
      {/* Frontal-right, away from the wall — models him and the blanket
          without flattening the room. */}
      <pointLight ref={lightRef} position={[0.9, 2.0, 2.8]} color="#DCE6FF" intensity={0} distance={8} />
    </group>
  )
}

/* ═══ ATMOSPHERE + CAMERA ═════════════════════════════════════════════ */

function Atmosphere() {
  const amb = useRef<THREE.AmbientLight>(null)
  const fill = useRef<THREE.PointLight>(null)
  useFrame(() => {
    const t = getAnimTime()
    // The room empties to near-black for the bed — but only once the bed's
    // own cold light is on its way; the subject stays lit throughout
    // (exposure parity — grief reads through palette, not underexposure).
    const down = ramp(t, 5.6, 6.6)
    if (amb.current) amb.current.intensity = 0.3 * (1 - down * 0.75)
    if (fill.current) fill.current.intensity = 1.5 - down * 0.3
  })
  return (
    <>
      <ambientLight ref={amb} color="#8E96A8" intensity={0.3} />
      {/* Constant cool fill so he stays modelled through every crossfade. */}
      <pointLight ref={fill} position={[1.3, 2.5, 2.7]} color="#9AA6BE" intensity={1.5} distance={9} />
    </>
  )
}

/** One slow push the whole 8s (6.1's grammar), fov 44 → 40. No cuts. */
function CameraRig() {
  const yieldCamera = useCameraHandoff()
  const target = useRef(new THREE.Vector3(0, 1.28, 0))
  useFrame(({ camera }) => {
    if (yieldCamera()) return
    const t = getAnimTime()
    const u = smooth(clamp01(t / DUR))
    const cam = camera as THREE.PerspectiveCamera
    cam.position.set(0, 1.95 - u * 0.17, 4.75 - u * 1.2)
    cam.fov = 44 - 4 * u
    cam.updateProjectionMatrix()
    cam.lookAt(target.current)
    // lookAt keeps the direction and throws the distance away; hand the debug
    // camera his chest so it orbits HIM and not a point off the lens.
    publishSceneLookAt(target.current.x, target.current.y, target.current.z)
  })
  return null
}

/* ═══ SCENE ═══════════════════════════════════════════════════════════ */

function SceneBody() {
  return (
    <>
      <Atmosphere />
      {/* Opaque floor: pegs cut against it, and the bed rises through it. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[40, 24]} />
        <meshStandardMaterial color="#0D0E13" roughness={0.95} />
      </mesh>
      {/* Far backstop so the corridor never opens onto raw background. */}
      <mesh position={[0, 2.2, -3.6]}>
        <planeGeometry args={[26, 7]} />
        <meshStandardMaterial color={GRIEF_DARK} roughness={1} />
      </mesh>

      <Hero />
      <MembersVignette />
      <CorridorVignette />
      <BedVignette />
      <CameraRig />
    </>
  )
}

export default createScene({
  background: '#08080D',
  three: {
    camera: { position: [0, 1.95, 4.75], fov: 44, near: 0.05, far: 60 },
    gl: {
      antialias: true,
      toneMapping: THREE.ACESFilmicToneMapping,
      toneMappingExposure: 1.06,
    },
    onCreated: ({ camera }) => camera.lookAt(0, 1.28, 0),
    debugTarget: [0, 1.28, 0],
  },
}, function Act6_9() {
  return (
    <>
      <SceneBody />
      <EffectComposer>
        <Bloom intensity={0.6} luminanceThreshold={0.6} luminanceSmoothing={0.4} mipmapBlur />
        <Vignette eskil={false} offset={0.22} darkness={0.66} />
      </EffectComposer>
    </>
  )
})
