/**
 * Act 6.8 — "THE LAST CALL" (8.0s, film 130.45–138.45, in the SILENCE)
 *
 * The same device as 6.4, deliberately — same phone, same raise, same
 * split-screen — and everything in the panel is wrong. A hospital room in
 * grays: the bed, the doctor with the phone, the satgat on the chair — off
 * its wearer for the first time in the film. Nobody in the panel moves more
 * than a bowed head. The stillness is the horror.
 *
 * t 0–0.75  he is mid-stride down a backstage corridor; the phone buzzes
 *           twice in his hand and he walks down to a stop.
 * t 0.55–1.25 the raise (6.4's gesture, quoted exactly).
 * t 1.2–2.0 the panel slides in — gray.
 * t 2.0–4.5 the call. The doctor's head bows two degrees. The bed does not.
 * t 4.5–6.5 HIS GRAY TURN: #FFB938 → #9A9AA4, emissive 1.0 → 0.12 under
 *           gutterSag — the 5.1 caregiver's dimming grammar run on HIM, this
 *           once. His head drops 60% of the full droop.
 * t 6.5–7.4 the panel slides back out. She leaves the frame.
 * t 7.4–8.0 he stands alone, gray, in the corridor. Hold.
 */
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import * as THREE from 'three'
import { createScene } from '../createScene'
import { useCameraHandoff } from '../DebugCamera'
import { publishSceneLookAt } from '../cameraHandoff'
import { getAnimTime } from '../../hooks/useAnimTime'
import {
  GoldFigure, ADULT, v, footState, buildLegPoints, buildArmPoints, buildSolvedArmPoints, buildHat,
  type Curve, type Sphere, type Proportions,
} from '../characters/goldFigure'
import { PARENT_HAT } from '../actB/valley'
import { LyingFigure } from '../sets/hanok'
import GradientEnvironment from '../effects/GradientEnvironment'
import { SplitPanel } from './SplitCall'
import { ramp, smooth, clamp01, gutterSag, HERO_GRAY, HERO_GRAY_EMISSIVE, GRIEF_DARK, GRIEF_MID, GRIEF_BODY, GRIEF_LIGHT } from './shared'
import { Phone, phoneRaise, PanelBackstop, type V3 } from './call'

const DUR = 8.0

/* ── beats ────────────────────────────────────────────────────────── */
const BUZZ: [number, number][] = [[0.22, 0.34], [0.48, 0.6]]
const STOP0 = 0.4
const STOP1 = 0.85
const RAISE0 = 0.6
const RAISE1 = 1.25
const PANEL_IN: [number, number] = [1.2, 2.0]
const BOW0 = 2.2   // the doctor's head
const BOW1 = 3.2
const GRAY0 = 4.5  // his turn
const GRAY1 = 6.5
const PANEL_OUT: [number, number] = [6.5, 7.4]
/** Head drops 60% of the full Act4_10 droop. */
const DROOP_MAX = 0.6

/* ── him: walk-in, stop, raise, droop — one skeleton owns all of it ── */
const STOP_POS: V3 = [-0.97, 0, -1.55]
/**
 * He comes DOWN the corridor at a diagonal, not straight at the lens — a
 * head-on stride reads as bobbing in place. This is his facing after the
 * stop too: quartered toward where the panel will be.
 */
const WALK_ROT = 0.62
const WALK_DIR = [Math.sin(WALK_ROT), Math.cos(WALK_ROT)] as const
/** Metres covered before the stop. */
const WALK_DIST = 1.15
const PHASE0 = 0.32

/** Eased distance into the stop — feet plant because phase derives from it. */
function walkDist(t: number) {
  const u = clamp01(t / STOP1)
  return WALK_DIST * (1 - (1 - u) * (1 - u))
}
const walkAmp = (t: number) => 1 - ramp(t, STOP0, STOP1)
const droopK = (t: number) => DROOP_MAX * ramp(t, GRAY0, GRAY1)

/** The bowed head — Act4_10's childHeadLocal recipe with k = the droop. */
function headLocal(t: number, P: Proportions) {
  const k = droopK(t)
  const torso = P.SHOULDER_Y - P.HIP_Y
  const neck = P.HEAD_Y - P.SHOULDER_Y
  const hipY = P.HIP_Y - 0.18 * k
  const shoulderY = hipY + torso * (1 - 0.08 * k)
  const shoulderZ = 0.12 * k
  return {
    hipY, shoulderY, shoulderZ,
    y: shoulderY + neck * (1 - 0.4 * k),
    z: shoulderZ + 0.06 * k + 0.03,
  }
}

/** Single source of truth for the phone hand: skeleton and prop both read it,
 *  and the ear target rides the drooping head down. */
function heroHand(t: number, P: Proportions): V3 {
  const up = ramp(t, RAISE0, RAISE1)
  const h = headLocal(t, P)
  return phoneRaise(up, [0.19, h.y - 0.05, h.z + 0.07])
}

function heroSkeleton({ P, t }: { P: Proportions; t: number; phase: number }): { curves: Curve[]; spheres: Sphere[] } {
  const w = walkAmp(t)
  const phase = PHASE0 + walkDist(t) / (4 * P.STRIDE)
  const k = droopK(t)
  const breathe = Math.sin(t * 2.2) * 0.005 * (1 - k)
  const bob = -Math.cos(phase * 4 * Math.PI) * 0.02 * w

  const h = headLocal(t, P)
  const hipY = h.hipY + bob
  const shoulder = v(0, h.shoulderY + bob + breathe, h.shoulderZ + breathe * 0.4)

  const spine = [
    v(0, hipY, -0.05 * k),
    v(0, hipY + (shoulder.y - hipY) * 0.33, -0.05 * k + (shoulder.z + 0.05 * k) * 0.22),
    v(0, hipY + (shoulder.y - hipY) * 0.66, -0.05 * k + (shoulder.z + 0.05 * k) * 0.62),
    shoulder,
  ]

  // Legs: the walk cycle, blended into a slightly staggered standing stance.
  const stance = (side: 1 | -1) => (side > 0 ? -0.035 : 0.055)
  const leg = (side: 1 | -1, p: number): THREE.Vector3[] => {
    const f = footState(p, P)
    const fBlend = {
      y: P.FOOT_Y + (f.y - P.FOOT_Y) * w,
      z: f.z * w + stance(side) * (1 - w),
      bend: f.bend * w + 0.06 * (1 - w),
    }
    return buildLegPoints(side * 0.03, fBlend, hipY)
  }

  // Right arm: swings with the walk until the raise begins, then the solved
  // phone arm. Left arm: swing dying to rest at the side.
  const raise = ramp(t, RAISE0, RAISE1)
  const fR = footState(phase + 0.5, P)
  const fL = footState(phase, P)
  const armL = buildArmPoints(-0.02, (-fR.z / P.STRIDE) * w * 0.9, shoulder.y, P)
  const hand = heroHand(t, P)
  const armR = raise <= 0.001
    ? buildArmPoints(0.02, (-fL.z / P.STRIDE) * w * 0.9, shoulder.y, P)
    : buildSolvedArmPoints(0.02, shoulder.y, v(hand[0], hand[1], hand[2]), P, shoulder.z)

  return {
    curves: [
      { points: spine, radius: P.R, segments: 16 },
      { points: armL, radius: P.R, segments: 14 },
      { points: armR, radius: P.R, segments: 14 },
      { points: leg(-1, phase), radius: P.R, segments: 16 },
      { points: leg(1, phase + 0.5), radius: P.R, segments: 16 },
    ],
    spheres: [{ center: v(0, h.y + bob + breathe, h.z), radius: P.RH }],
  }
}

const GOLD = new THREE.Color('#FFB938')
const GRAY = new THREE.Color(HERO_GRAY)
const TMP = new THREE.Color()

function buzzLevel(t: number) {
  for (const [a, b] of BUZZ) if (t >= a && t <= b) return 2.8
  return 0
}

function Hero() {
  const groupRef = useRef<THREE.Group>(null)
  const lightRef = useRef<THREE.PointLight>(null)
  const mat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#FFB938', emissive: '#FFB938',
    emissiveIntensity: 1.0, roughness: 0.35, toneMapped: false,
  }), [])

  useFrame(() => {
    const t = getAnimTime()
    // Placement: the walk-in along the diagonal, then planted.
    if (groupRef.current) {
      const back = WALK_DIST - walkDist(t)
      groupRef.current.position.set(
        STOP_POS[0] - WALK_DIR[0] * back, 0, STOP_POS[2] - WALK_DIR[1] * back,
      )
      // The walking yaw a custom skeleton loses, dying with the stop.
      const phase = PHASE0 + walkDist(t) / (4 * 0.18)
      groupRef.current.rotation.y = WALK_ROT + Math.sin(phase * 2 * Math.PI) * 0.04 * walkAmp(t)
    }
    // THE GRAY TURN — colour and emissive lerp under the 5.1 gutterSag.
    const u = ramp(t, GRAY0, GRAY1)
    TMP.copy(GOLD).lerp(GRAY, u)
    mat.color.copy(TMP)
    mat.emissive.copy(TMP)
    const glow = THREE.MathUtils.lerp(1.0, HERO_GRAY_EMISSIVE, u) * gutterSag(t, u)
    mat.emissiveIntensity = glow
    if (lightRef.current) lightRef.current.intensity = 3.2 * glow
  })

  return (
    <group ref={groupRef} position={STOP_POS} rotation={[0, WALK_ROT, 0]}>
      <GoldFigure skeleton={heroSkeleton} material={mat} />
      <Phone hand={(t: number) => heroHand(t, ADULT)} screen={buzzLevel} />
      <pointLight ref={lightRef} position={[0, 1.35, 0.3]} color="#FFC24E" intensity={3.2} distance={5} decay={2} />
    </group>
  )
}

/* ── the corridor (6.1's fluoro grammar, backstage-dressed) ───────── */

function Fluorescents() {
  return (
    <group>
      {[-1, -5.5, -10, -14.5].map((z, i) => (
        <group key={i} position={[0, 2.92, z]}>
          <mesh>
            <boxGeometry args={[2.2, 0.06, 0.24]} />
            <meshStandardMaterial color="#F0F4FF" emissive="#EAF0FF" emissiveIntensity={2.4} toneMapped={false} />
          </mesh>
          <mesh position={[0, 0.07, 0]}>
            <boxGeometry args={[2.4, 0.08, 0.34]} />
            <meshStandardMaterial color="#31363F" roughness={0.6} metalness={0.4} />
          </mesh>
          <pointLight position={[0, -0.3, 0]} color="#DCE6FF" intensity={8} distance={8} decay={1.6} />
        </group>
      ))}
    </group>
  )
}

/** A flight case: black box, bright aluminium edge trim. */
function RoadCase({ position, size, rotY = 0 }: { position: V3; size: V3; rotY?: number }) {
  const [w, h, d] = size
  return (
    <group position={[position[0], h / 2 + 0.06, position[2]]} rotation={[0, rotY, 0]}>
      <mesh castShadow>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial color="#15171D" roughness={0.6} metalness={0.2} />
      </mesh>
      {/* Vertical edge extrusions */}
      {([[-w / 2, -d / 2], [w / 2, -d / 2], [-w / 2, d / 2], [w / 2, d / 2]] as const).map(([x, z], i) => (
        <mesh key={i} position={[x, 0, z]}>
          <boxGeometry args={[0.035, h + 0.02, 0.035]} />
          <meshStandardMaterial color="#4A515E" roughness={0.35} metalness={0.75} />
        </mesh>
      ))}
      {/* Lid seam */}
      <mesh position={[0, h * 0.18, 0]}>
        <boxGeometry args={[w + 0.015, 0.03, d + 0.015]} />
        <meshStandardMaterial color="#3A404C" roughness={0.4} metalness={0.6} />
      </mesh>
      {/* Casters */}
      {([[-w / 2 + 0.09, -d / 2 + 0.09], [w / 2 - 0.09, -d / 2 + 0.09], [-w / 2 + 0.09, d / 2 - 0.09], [w / 2 - 0.09, d / 2 - 0.09]] as const).map(([x, z], i) => (
        <mesh key={i} position={[x, -h / 2 - 0.03, z]}>
          <cylinderGeometry args={[0.035, 0.035, 0.05, 10]} />
          <meshStandardMaterial color="#0C0E12" roughness={0.5} />
        </mesh>
      ))}
    </group>
  )
}

function Corridor() {
  return (
    <group>
      {/* Floor, walls, ceiling */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[26, 50]} />
        <meshStandardMaterial color="#23262E" roughness={0.5} metalness={0.06} />
      </mesh>
      <mesh position={[-1.9, 1.9, -8]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[40, 4.4]} />
        <meshStandardMaterial color="#1E222B" roughness={0.92} />
      </mesh>
      <mesh position={[2.2, 1.9, -8]} rotation={[0, -Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[40, 4.4]} />
        <meshStandardMaterial color="#191D25" roughness={0.94} />
      </mesh>
      <mesh position={[0.3, 1.9, -15.5]}>
        <planeGeometry args={[11, 4.4]} />
        <meshStandardMaterial color="#171B23" roughness={0.94} />
      </mesh>
      <mesh position={[0.15, 3.0, -8]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[26, 40]} />
        <meshStandardMaterial color="#171B22" roughness={0.96} />
      </mesh>

      <Fluorescents />

      {/* Backstage dressing — sparse. */}
      <RoadCase position={[-1.42, 0, -3.9]} size={[0.72, 1.3, 1.0]} rotY={0.06} />
      <RoadCase position={[-1.3, 0, -6.7]} size={[0.95, 0.68, 0.8]} rotY={-0.05} />
      <RoadCase position={[1.66, 0, -3.4]} size={[0.65, 1.0, 0.9]} rotY={0.03} />
      <RoadCase position={[1.75, 0, -8.8]} size={[0.6, 1.45, 0.9]} rotY={-0.02} />
      {/* Cable runs along the left wall base */}
      {[0.03, 0.075, 0.055].map((y, i) => (
        <mesh key={i} position={[-1.82 + i * 0.05, y, -6]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.021, 0.021, 17, 8]} />
          <meshStandardMaterial color="#0C0E12" roughness={0.6} />
        </mesh>
      ))}
      {/* A taped cable ramp crossing the floor behind him */}
      <mesh position={[0, 0.028, -4.6]}>
        <boxGeometry args={[4.6, 0.055, 0.34]} />
        <meshStandardMaterial color="#2C3038" roughness={0.7} />
      </mesh>
    </group>
  )
}

/* ── the hospital room, inside the panel ──────────────────────────── */
const BED_Z = -1.0
const MATTRESS_TOP = 0.6
const PILLOW_X = -0.78

/** The satgat on the bedside chair — off its wearer for the first time.
 *  sickbed.tsx's HatOnFloor grammar, drained to gray-gold. */
function HatOnChair() {
  const build = useMemo(() => buildHat(PARENT_HAT, 0.16), [])
  const shellMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#8C8168', emissive: '#57503C', emissiveIntensity: 0.16, roughness: 0.85,
    side: THREE.DoubleSide,
  }), [])
  const trimMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#A29677', emissive: '#6E6650', emissiveIntensity: 0.3, roughness: 0.7,
  }), [])
  return (
    <group position={[0, 0.02, 0]} rotation={[0, 0.6, 0]}>
      <mesh geometry={build.shell} material={shellMat} />
      <mesh geometry={build.trim} material={trimMat} />
    </group>
  )
}

function BedsideChair() {
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#3A3F4A', roughness: 0.7 }), [])
  return (
    <group position={[0.98, 0, -0.45]} rotation={[0, -0.5, 0]}>
      <mesh material={mat} position={[0, 0.44, 0]}>
        <boxGeometry args={[0.42, 0.035, 0.4]} />
      </mesh>
      {([[-0.18, -0.17], [0.18, -0.17], [-0.18, 0.17], [0.18, 0.17]] as const).map(([x, z], i) => (
        <mesh key={i} material={mat} position={[x, 0.22, z]}>
          <cylinderGeometry args={[0.016, 0.016, 0.44, 8]} />
        </mesh>
      ))}
      <mesh material={mat} position={[0, 0.72, -0.185]} rotation={[-0.08, 0, 0]}>
        <boxGeometry args={[0.42, 0.5, 0.03]} />
      </mesh>
      <group position={[0, 0.458, 0.02]}>
        <HatOnChair />
      </group>
    </group>
  )
}

function IVPole() {
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#585E6A', roughness: 0.4, metalness: 0.6 }), [])
  return (
    <group position={[-1.12, 0, -1.35]}>
      <mesh material={mat} position={[0, 0.02, 0]}>
        <cylinderGeometry args={[0.16, 0.18, 0.035, 12]} />
      </mesh>
      <mesh material={mat} position={[0, 0.9, 0]}>
        <cylinderGeometry args={[0.013, 0.013, 1.78, 8]} />
      </mesh>
      <mesh material={mat} position={[0, 1.76, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.01, 0.01, 0.42, 8]} />
      </mesh>
      {/* The bag */}
      <mesh position={[0.17, 1.6, 0]}>
        <boxGeometry args={[0.09, 0.16, 0.04]} />
        <meshStandardMaterial color="#9BA0AC" emissive="#9BA0AC" emissiveIntensity={0.08} roughness={0.4} />
      </mesh>
    </group>
  )
}

function HospitalRoom() {
  const doctorBow = useRef<THREE.Group>(null)

  useFrame(() => {
    const t = getAnimTime()
    // The doctor's head bows two degrees across the call. That is all.
    if (doctorBow.current) doctorBow.current.rotation.x = ramp(t, BOW0, BOW1) * 0.035
  })

  const doctorMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: GRIEF_LIGHT, emissive: GRIEF_LIGHT, emissiveIntensity: 0.06, roughness: 0.6,
  }), [])

  // All content at local x ≥ −1.4: the divider plane sits at ≈−1.33 and
  // anything past it juts into the corridor's half of frame.
  return (
    <group>
      <PanelBackstop />
      {/* Walls and floor — gray on gray. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0.8, 0.002, -1]}>
        <planeGeometry args={[4.4, 3.4]} />
        <meshStandardMaterial color="#26262C" roughness={0.85} />
      </mesh>
      <mesh position={[0.8, 1.6, -2.1]}>
        <planeGeometry args={[4.4, 3.4]} />
        <meshStandardMaterial color={GRIEF_MID} roughness={0.92} />
      </mesh>
      {/* Wainscot band */}
      <mesh position={[0.8, 0.5, -2.09]}>
        <planeGeometry args={[4.4, 1.0]} />
        <meshStandardMaterial color={GRIEF_DARK} roughness={0.92} />
      </mesh>
      {/* A dark door on the back wall, right — depth, not story. */}
      <mesh position={[1.45, 1.05, -2.08]}>
        <planeGeometry args={[0.8, 2.1]} />
        <meshStandardMaterial color="#31313A" roughness={0.9} />
      </mesh>

      {/* The bed, head end at frame left. */}
      <group position={[0, 0, BED_Z]}>
        <mesh position={[-0.05, 0.38, 0]}>
          <boxGeometry args={[1.9, 0.22, 0.85]} />
          <meshStandardMaterial color="#3E3E46" roughness={0.7} />
        </mesh>
        <mesh position={[-0.05, 0.545, 0]}>
          <boxGeometry args={[1.94, 0.11, 0.88]} />
          <meshStandardMaterial color="#8A8E98" emissive="#8A8E98" emissiveIntensity={0.03} roughness={0.8} />
        </mesh>
        {/* Headboard */}
        <mesh position={[-1.03, 0.62, 0]}>
          <boxGeometry args={[0.05, 0.75, 0.88]} />
          <meshStandardMaterial color="#43434C" roughness={0.7} />
        </mesh>
        {/* Legs */}
        {([[-0.95, -0.36], [0.85, -0.36], [-0.95, 0.36], [0.85, 0.36]] as const).map(([x, z], i) => (
          <mesh key={i} position={[x, 0.14, z]}>
            <boxGeometry args={[0.05, 0.28, 0.05]} />
            <meshStandardMaterial color="#2E2E36" roughness={0.6} />
          </mesh>
        ))}
        {/* Pillow */}
        <mesh position={[-0.76, 0.63, 0]} rotation={[0, 0, 0.02]}>
          <boxGeometry args={[0.36, 0.055, 0.42]} />
          <meshStandardMaterial color="#A2A6B0" emissive="#A2A6B0" emissiveIntensity={0.03} roughness={0.85} />
        </mesh>
      </group>
      {/* Her. She does not move. */}
      <LyingFigure
        position={[PILLOW_X, MATTRESS_TOP, BED_Z]}
        facing={-Math.PI / 2}
        kind="adult"
        color={GRIEF_BODY} emissive={GRIEF_BODY} glow={0.04}
        pillowY={0.06} headTurn={0.3}
      />

      {/* The doctor — flat gray, phone to ear, still. */}
      <group position={[0.72, 0, -1.74]} rotation={[0, -0.55, 0]}>
        <group ref={doctorBow}>
          <GoldFigure
            pose="standing"
            material={doctorMat}
            rightHandAt={[0.19, 1.68, 0.1]}
            solvedArms
            animate={false}
          />
          <Phone hand={[0.19, 1.68, 0.1]} />
        </group>
      </group>

      <BedsideChair />
      <IVPole />

      {/* One cold overhead light. NO warm light anywhere in this panel. */}
      <group position={[-0.1, 2.58, -1.15]}>
        <mesh>
          <boxGeometry args={[1.1, 0.04, 0.2]} />
          <meshStandardMaterial color="#D6DEEE" emissive="#DCE6FF" emissiveIntensity={1.5} toneMapped={false} />
        </mesh>
        <pointLight position={[0, -0.25, 0]} color="#DCE6FF" intensity={5} distance={3.6} decay={1.8} />
      </group>
      <ambientLight intensity={0.14} color="#8A94A8" />
    </group>
  )
}

/* ── camera: 6.1's slow push, held through the turn ───────────────── */
function CameraRig() {
  const yieldCamera = useCameraHandoff()
  const target = useRef(new THREE.Vector3())
  useFrame(({ camera }) => {
    if (yieldCamera()) return
    const u = smooth(clamp01(getAnimTime() / DUR))
    camera.position.set(1.55 - u * 0.3, 1.52 - u * 0.06, 1.6 - u * 0.5)
    target.current.set(-0.72, 1.26, -1.9)
    camera.lookAt(target.current)
    // lookAt keeps the direction and loses the distance; publish the point so
    // the debug camera orbits what the shot is framed on, not thin air.
    publishSceneLookAt(target.current.x, target.current.y, target.current.z)
  })
  return null
}

function SceneContent() {
  return (
    <>
      <CameraRig />
      <GradientEnvironment zenith="#2A3040" horizon="#333A48" ground="#1A1E26" intensity={0.8} />
      <ambientLight intensity={0.32} color="#9FB0D0" />
      {/* Far-started: the panel sits 2.6 from the lens. */}
      <fog attach="fog" args={['#141821', 9, 26]} />

      <Corridor />
      <Hero />

      <SplitPanel enter={PANEL_IN} exit={PANEL_OUT} backdrop="#232329" divider="#0B0B10">
        <HospitalRoom />
      </SplitPanel>
    </>
  )
}

export default createScene({
  background: '#0B0E14',
  three: {
    camera: { position: [1.55, 1.52, 1.6], fov: 44, near: 0.1, far: 90 },
    gl: {
      antialias: true,
      toneMapping: THREE.ACESFilmicToneMapping,
      toneMappingExposure: 1.05,
    },
    onCreated: ({ camera }) => camera.lookAt(-0.72, 1.26, -1.9),
    debugTarget: [-0.72, 1.26, -1.9],
  },
}, function Act6_8() {
  return (
    <>
      <SceneContent />
      <EffectComposer>
        <Bloom intensity={0.6} luminanceThreshold={0.62} luminanceSmoothing={0.85} mipmapBlur radius={0.5} />
        <Vignette eskil={false} offset={0.22} darkness={0.62} />
      </EffectComposer>
    </>
  )
})
