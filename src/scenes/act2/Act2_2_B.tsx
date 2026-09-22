/**
 * Act 2.2 — "Seven (Arirang Cosmos)" — the shared 3D stage world.
 *
 * One scene, three camera states. `cameraMode` selects which view:
 *   - 'stage'   (default): camera parked close to the stage, as in ?act=2.2
 *   - 'stadium': camera parked far back + high up, as seen from the audience
 *   - 'flyover': camera tweens stadium → stage over `flyoverDuration` seconds,
 *                used by Act2Zoom (the 2.1→2.2 transition)
 *   - 'flyout' : the same tween reversed (stage → stadium), used by Act2_3
 *                (the 2.2 → mountains reverse)
 *
 * `showMembers` toggles the 7 GoldFigures + spotlights (Act 2.1 passes false;
 * the figures belong to the on-stage reveal, not the pre-reveal establishing
 * view). `startOffset` offsets the figure-reveal clock so the transition can
 * hold members invisible until the flyover lands.
 *
 * The Arirang backdrop is a 2D SVG sibling of the Canvas; CameraController
 * scales it each frame in proportion to camera distance so the backdrop
 * grows/recedes as the camera approaches, giving a cheap but convincing
 * perspective read without moving the SVG into 3D.
 */

import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { getAnimTime } from '../../hooks/useAnimTime'
import { BEAT_INTERVAL } from '../../utils/beatMap'
import { seededRandom } from '../../utils/svgHelpers'
import { SceneCanvas } from '../SceneCanvas'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import * as THREE from 'three'

import ArirangSymbolAnimated from '../arirang/ArirangSymbolAnimated'

export type Act2CameraMode = 'stage' | 'stadium' | 'flyover' | 'flyout'
import {
  CONCERT_CYAN,
  CONCERT_PURPLE,
  CONCERT_MAGENTA,
  CONCERT_WHITE,
  CONCERT_FLOOR,
} from '../../theme/colors'

/* ─── Member data ──────────────────────────────────────────────── */

export interface MemberDef {
  x: number
  z: number
  scale: number
  name: string
  color: string
  /** Entrance-order index used to compute reveal time at render:
   *  revealDelay = revealPreroll + staggerIndex * revealStagger */
  staggerIndex: number
}

// Default reveal timing — standalone Act 2.2 opens on an empty stage, then
// members enter one-by-one over ~4.5s (Jin first at t=1.0s, Jungkook last
// finishing ~t=4.55s). Act2Zoom overrides these to align the entrance with
// the end of its stadium→stage flyover.
const REVEAL_DURATION = 0.85
const DEFAULT_REVEAL_PRE_ROLL = 1.0
const DEFAULT_REVEAL_STAGGER = 0.45
const MORPH_START = 0.30      // fraction of reveal when pose morph begins

/** Where standalone 2.2 sits in the song (master timeline `from`) — local
 *  time + this offset drives the beat grid so dance moves land on beats.
 *  The FullVideo timeline passes it explicitly via props. */
const DEFAULT_SONG_OFFSET = 26

// After the last member lands: pause, then crossfade everyone from their
// individual groove into the unison routine.
const UNISON_LEAD = 1.0
const UNISON_BLEND = 1.5

// After a member finishes their entrance, ramp the groove amplitude in from
// 0 over this many seconds. The entrance morph ends exactly on the landed
// pose; the groove otherwise starts at a nonzero beat phase and would pop the
// pose in a single frame. Ramping from 0 (both sides have ~0 velocity at the
// join) keeps the landing smooth.
const SETTLE_RAMP = 0.7

// BTS signature bias colors (BT21 / ARMY bomb / "I purple you" associations).
// staggerIndex = entrance order (Jin → Suga → J-Hope → RM → Jimin → V → Jungkook),
// applied to `revealStagger` at render time.
export const MEMBERS: MemberDef[] = [
  { x: 0,    z: 1.0,  scale: 0.95, name: 'Jungkook', color: '#FFD24A', staggerIndex: 6 }, // last
  { x: -1.9, z: 0.6,  scale: 0.88, name: 'RM',       color: '#5B7BFF', staggerIndex: 3 }, // 4th
  { x: 1.9,  z: 0.6,  scale: 0.88, name: 'V',        color: '#B876FF', staggerIndex: 5 }, // 6th
  { x: -3.6, z: 0.2,  scale: 0.8,  name: 'J-Hope',   color: '#FF6B4D', staggerIndex: 2 }, // 3rd
  { x: 3.6,  z: 0.2,  scale: 0.8,  name: 'Jimin',    color: '#FFE066', staggerIndex: 4 }, // 5th
  { x: -5.1, z: -0.1, scale: 0.72, name: 'Jin',      color: '#FFA3C9', staggerIndex: 0 }, // 1st (eldest)
  { x: 5.1,  z: -0.1, scale: 0.72, name: 'Suga',     color: '#6FEDC4', staggerIndex: 1 }, // 2nd
]

/* ─── Pose data (from SVG version) ─────────────────────────────── */

interface Pose {
  leftArm: string
  rightArm: string
  leftLeg: string
  rightLeg: string
  headOffsetX?: number
}

// Neutral entry pose — figure stands relaxed with arms hanging by the sides,
// feet in a small stance. Each member lerps from this into their final POSE
// during the reveal, giving them a little "step into place" movement.
const ENTRY_POSE: Pose = {
  leftArm:  'M 0,-35 C -3,-20 -5,-6 -7,8',
  rightArm: 'M 0,-35 C 3,-20 5,-6 7,8',
  leftLeg:  'M 0,8 C -3,22 -5,40 -6,55',
  rightLeg: 'M 0,8 C 3,22 5,40 6,55',
}

const POSES: Pose[] = [
  {
    leftArm:  'M 0,-35 C -10,-42 -22,-52 -34,-62',
    rightArm: 'M 0,-35 C 10,-42 22,-52 34,-62',
    leftLeg:  'M 0,8 C -8,22 -16,40 -20,55',
    rightLeg: 'M 0,8 C 8,22 16,40 20,55',
  },
  {
    leftArm:  'M 0,-35 C -10,-28 -16,-18 -18,-6',
    rightArm: 'M 0,-35 C 10,-48 16,-58 14,-68',
    leftLeg:  'M 0,8 C -3,22 -6,40 -8,55',
    rightLeg: 'M 0,8 C 8,22 14,38 18,55',
  },
  {
    leftArm:  'M 0,-35 C -8,-38 -10,-42 -6,-46',
    rightArm: 'M 0,-35 C 14,-30 28,-22 36,-12',
    leftLeg:  'M 0,8 C -10,20 -18,38 -22,55',
    rightLeg: 'M 0,8 C 3,22 5,40 6,55',
  },
  {
    leftArm:  'M 0,-35 C -12,-34 -24,-33 -36,-32',
    rightArm: 'M 0,-35 C 12,-34 24,-33 36,-32',
    leftLeg:  'M 0,8 C -10,22 -18,40 -22,55',
    rightLeg: 'M 0,8 C 10,22 18,40 22,55',
  },
  {
    leftArm:  'M 0,-35 C -6,-30 -4,-26 4,-28',
    rightArm: 'M 0,-35 C 10,-46 16,-56 14,-66',
    leftLeg:  'M 0,8 C -6,22 -12,40 -14,55',
    rightLeg: 'M 0,8 C 10,18 14,28 12,42',
  },
  {
    leftArm:  'M 0,-35 C -12,-28 -18,-16 -16,-4',
    rightArm: 'M 0,-35 C 12,-48 20,-58 26,-66',
    leftLeg:  'M 0,8 C -12,20 -20,38 -26,55',
    rightLeg: 'M 0,8 C 6,22 10,40 12,55',
    headOffsetX: 2,
  },
  {
    leftArm:  'M 0,-35 C -12,-30 -20,-22 -24,-10',
    rightArm: 'M 0,-35 C 16,-32 30,-26 38,-18',
    leftLeg:  'M 0,8 C -4,22 -8,40 -10,55',
    rightLeg: 'M 0,8 C 12,18 20,34 26,50',
  },
]

// Unison routine — one pose HIT per beat (0.5s at 120 BPM), 8 poses = 4s
// loop. Authored in the same SVG limb space as POSES. `lean` tilts the whole
// body (radians around the feet) for hits that throw weight sideways.
// Big alternating silhouettes: V-up → sky-point R → clap-high → sky-point L
// → wings T → punch R → low wide V → punch L.
type UnisonPose = Pose & { lean?: number }
const UNISON: UnisonPose[] = [
  { // V-up
    leftArm:  'M 0,-35 C -10,-48 -18,-60 -22,-72',
    rightArm: 'M 0,-35 C 10,-48 18,-60 22,-72',
    leftLeg:  'M 0,8 C -8,22 -14,40 -16,55',
    rightLeg: 'M 0,8 C 8,22 14,40 16,55',
  },
  { // sky-point right, weight right
    leftArm:  'M 0,-35 C -10,-26 -14,-14 -12,-4',
    rightArm: 'M 0,-35 C 12,-46 20,-58 24,-70',
    leftLeg:  'M 0,8 C -4,22 -6,40 -8,55',
    rightLeg: 'M 0,8 C 10,20 18,36 24,52',
    lean: -0.07,
  },
  { // clap high — hands nearly meet overhead
    leftArm:  'M 0,-35 C -8,-48 -10,-62 -5,-74',
    rightArm: 'M 0,-35 C 8,-48 10,-62 5,-74',
    leftLeg:  'M 0,8 C -6,22 -10,40 -12,55',
    rightLeg: 'M 0,8 C 6,22 10,40 12,55',
  },
  { // sky-point left, weight left
    leftArm:  'M 0,-35 C -12,-46 -20,-58 -24,-70',
    rightArm: 'M 0,-35 C 10,-26 14,-14 12,-4',
    leftLeg:  'M 0,8 C -10,20 -18,36 -24,52',
    rightLeg: 'M 0,8 C 4,22 6,40 8,55',
    lean: 0.07,
  },
  { // wings T
    leftArm:  'M 0,-35 C -14,-37 -26,-37 -38,-36',
    rightArm: 'M 0,-35 C 14,-37 26,-37 38,-36',
    leftLeg:  'M 0,8 C -12,22 -20,40 -24,55',
    rightLeg: 'M 0,8 C 12,22 20,40 24,55',
  },
  { // punch right — right arm straight out, left on hip
    leftArm:  'M 0,-35 C -10,-26 -12,-16 -8,-10',
    rightArm: 'M 0,-35 C 14,-36 26,-36 38,-35',
    leftLeg:  'M 0,8 C -4,22 -6,40 -8,55',
    rightLeg: 'M 0,8 C 12,20 20,36 26,52',
    lean: -0.06,
  },
  { // low wide V — arms swept down-out, stance wide (crouch beat)
    leftArm:  'M 0,-35 C -12,-24 -20,-10 -26,2',
    rightArm: 'M 0,-35 C 12,-24 20,-10 26,2',
    leftLeg:  'M 0,8 C -14,20 -22,38 -26,54',
    rightLeg: 'M 0,8 C 14,20 22,38 26,54',
  },
  { // punch left — mirror
    leftArm:  'M 0,-35 C -14,-36 -26,-36 -38,-35',
    rightArm: 'M 0,-35 C 10,-26 12,-16 8,-10',
    leftLeg:  'M 0,8 C -12,20 -20,36 -26,52',
    rightLeg: 'M 0,8 C 4,22 6,40 8,55',
    lean: 0.06,
  },
]

/* ─── Member figure (Stick Gold 5 proportions, per-member color) ── */

const TUBE_R = 0.050     // Stick5 slim limb
const HEAD_R = 0.16      // Stick5 big head (~19% of height)
const HIP_Y = 0.93
const SHOULDER_Y = 1.47
const HEAD_Y = 1.73
const ARM_LEN = 0.56     // shoulder→hand
const LEG_LEN = 0.88     // hip→foot

// Rec. 709 luminance of a hex color — darker colors need higher emissive
// intensity to reach the same bloom brightness as lighter ones.
function hexLuminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

// Target perceived glow (luminance × emissiveIntensity). Tuned so blue/purple
// bloom roughly as brightly as yellow/gold.
const TARGET_GLOW = 1.1

// Stick5's leaning spine (from CharStickGold5.tsx)
const SPINE_POINTS: THREE.Vector3[] = [
  new THREE.Vector3(0, 0.93, 0),
  new THREE.Vector3(0, 1.09, 0.02),
  new THREE.Vector3(0, 1.29, 0.03),
  new THREE.Vector3(0, 1.47, 0.02),
  new THREE.Vector3(0, 1.57, 0.02),
]

// Extract 4 cubic bezier control points from an SVG path, with y negated
// so SVG-up → 3D-up.
function svgPathPoints(d: string): THREE.Vector3[] {
  const n = d.match(/-?\d+\.?\d*/g)!.map(Number)
  return [
    new THREE.Vector3(n[0], -n[1], 0),
    new THREE.Vector3(n[2], -n[3], 0),
    new THREE.Vector3(n[4], -n[5], 0),
    new THREE.Vector3(n[6], -n[7], 0),
  ]
}

// Remap an SVG-space limb curve into Stick5 skeleton space:
// anchor the start at `attach`, scale so the total start→end distance equals
// `length`, and preserve relative shape (mid controls scale uniformly).
function remapLimb(
  pts: THREE.Vector3[],
  attach: THREE.Vector3,
  length: number,
): THREE.Vector3[] {
  const start = pts[0]
  const rel = pts.map(p => p.clone().sub(start))
  const endLen = rel[rel.length - 1].length() || 1
  const scale = length / endLen
  return rel.map(r => attach.clone().add(r.multiplyScalar(scale)))
}

function mergeGeos(geos: THREE.BufferGeometry[]): THREE.BufferGeometry {
  let tv = 0, ti = 0
  for (const g of geos) { tv += g.attributes.position.count; ti += g.index ? g.index.count : 0 }
  const p = new Float32Array(tv * 3), n = new Float32Array(tv * 3), ix = new Uint32Array(ti)
  let vo = 0, io = 0
  for (const g of geos) {
    const gp = g.attributes.position, gn = g.attributes.normal
    for (let i = 0; i < gp.count * 3; i++) { p[vo * 3 + i] = (gp.array as Float32Array)[i]; if (gn) n[vo * 3 + i] = (gn.array as Float32Array)[i] }
    if (g.index) { for (let i = 0; i < g.index.count; i++) ix[io + i] = g.index.array[i] + vo; io += g.index.count }
    vo += gp.count
  }
  const m = new THREE.BufferGeometry()
  m.setAttribute('position', new THREE.BufferAttribute(p, 3))
  m.setAttribute('normal', new THREE.BufferAttribute(n, 3))
  m.setIndex(new THREE.BufferAttribute(ix, 1))
  m.computeVertexNormals()
  return m
}

type Tube = { curve: THREE.Curve<THREE.Vector3>; radius: number; segments?: number }

function buildBody(
  tubes: Tube[],
  spheres: { center: THREE.Vector3; radius: number }[] = [],
): THREE.BufferGeometry {
  const geos: THREE.BufferGeometry[] = []
  const RADIAL = 16
  for (const { curve, radius, segments = 20 } of tubes) {
    geos.push(new THREE.TubeGeometry(curve, segments, radius, RADIAL, false))
    for (const t of [0, 1]) {
      const pt = curve.getPoint(t)
      const s = new THREE.SphereGeometry(radius, 24, 24)
      s.translate(pt.x, pt.y, pt.z)
      geos.push(s)
    }
  }
  for (const { center, radius } of spheres) {
    const s = new THREE.SphereGeometry(radius, 32, 32)
    s.translate(center.x, center.y, center.z)
    geos.push(s)
  }
  const merged = mergeGeos(geos)
  for (const g of geos) g.dispose()
  return merged
}

function bezier(pts: THREE.Vector3[]): THREE.CubicBezierCurve3 {
  return new THREE.CubicBezierCurve3(pts[0], pts[1], pts[2], pts[3])
}

/* Pose math in SKELETON space: each authored pose is remapped (attach +
   length-normalize) once, then blends operate on the remapped points. Never
   blend in raw SVG space and remap after — the normalizer divides by the
   shoulder→hand distance, and a blend can sweep the hand right through the
   shoulder (≈0 distance → the limb explodes into a spike; seen on Jimin's
   folded arm during the groove→unison crossfade). Blends of well-formed
   skeleton-space limbs are always well-formed. */

type LimbKey = 'leftArm' | 'rightArm' | 'leftLeg' | 'rightLeg'
const LIMBS: LimbKey[] = ['leftArm', 'rightArm', 'leftLeg', 'rightLeg']
type PosePts = Record<LimbKey, THREE.Vector3[]>

const LIMB_ATTACH: Record<LimbKey, { at: THREE.Vector3; len: number }> = {
  leftArm:  { at: new THREE.Vector3(-0.02, SHOULDER_Y, 0.01), len: ARM_LEN },
  rightArm: { at: new THREE.Vector3(+0.02, SHOULDER_Y, 0.01), len: ARM_LEN },
  leftLeg:  { at: new THREE.Vector3(-0.02, HIP_Y, 0), len: LEG_LEN },
  rightLeg: { at: new THREE.Vector3(+0.02, HIP_Y, 0), len: LEG_LEN },
}

const posePtsCache = new WeakMap<Pose, PosePts>()
function posePts(p: Pose): PosePts {
  let pts = posePtsCache.get(p)
  if (!pts) {
    pts = Object.fromEntries(LIMBS.map(l => {
      const { at, len } = LIMB_ATTACH[l]
      return [l, remapLimb(svgPathPoints(p[l]), at, len)]
    })) as PosePts
    posePtsCache.set(p, pts)
  }
  return pts
}

function lerpPts(a: PosePts, b: PosePts, t: number): PosePts {
  if (t <= 0) return a
  if (t >= 1) return b
  return Object.fromEntries(LIMBS.map(l =>
    [l, a[l].map((p, i) => p.clone().lerp(b[l][i], t))])) as PosePts
}

function buildGeoFromPts(pts: PosePts, headX: number): THREE.BufferGeometry {
  const spineCurve = new THREE.CatmullRomCurve3(SPINE_POINTS, false, 'catmullrom', 0.5)

  return buildBody([
    { curve: spineCurve, radius: TUBE_R, segments: 24 },
    { curve: bezier(pts.leftArm),  radius: TUBE_R, segments: 22 },
    { curve: bezier(pts.rightArm), radius: TUBE_R, segments: 22 },
    { curve: bezier(pts.leftLeg),  radius: TUBE_R, segments: 20 },
    { curve: bezier(pts.rightLeg), radius: TUBE_R, segments: 20 },
  ], [
    { center: new THREE.Vector3(headX, HEAD_Y, 0.03), radius: HEAD_R },
  ])
}

function smooth01(t: number): number {
  const c = Math.max(0, Math.min(1, t))
  return c * c * (3 - 2 * c)
}

/**
 * One member. Exported because Act B's stadium needs the SAME seven figures
 * this stage has — same skeleton, same poses, same entrance — rather than a
 * lookalike built from capsules. Drop it in a scaled group and give it a
 * `startOffset` in the host scene's local seconds.
 */
export function GoldFigure({
  member,
  poseIndex,
  startOffset = 0,
  revealPreroll = DEFAULT_REVEAL_PRE_ROLL,
  revealStagger = DEFAULT_REVEAL_STAGGER,
  lastStaggerIndex = 6,
  songOffset = DEFAULT_SONG_OFFSET,
}: {
  member: MemberDef
  poseIndex: number
  startOffset?: number
  revealPreroll?: number
  revealStagger?: number
  /** Highest `staggerIndex` in the line-up — i.e. how many entrance beats
   *  there are, minus one. Only the unison crossfade needs it: it waits for
   *  the LAST arrival, and a host that pairs members up (Act B's stadium
   *  lands them two at a time) has four beats where this stage has seven.
   *  Defaults to 2.2's own seven-abreast order. */
  lastStaggerIndex?: number
  songOffset?: number
}) {
  const pose = POSES[poseIndex]
  // Subtle head x-offset from pose data (SVG units → Stick5 units)
  const headX = (pose.headOffsetX ?? 0) * 0.02
  const groupRef = useRef<THREE.Group>(null)
  const meshRef = useRef<THREE.Mesh>(null)
  const geoRef = useRef<THREE.BufferGeometry | null>(null)
  const targetIntensity = TARGET_GLOW / hexLuminance(member.color)
  const revealDelay = revealPreroll + member.staggerIndex * revealStagger

  const material = useMemo(() => new THREE.MeshStandardMaterial({
    color: member.color,
    emissive: member.color,
    emissiveIntensity: 0,  // starts dark; ramps up at reveal
    roughness: 0.55,
    metalness: 0.0,
  }), [member.color])

  useEffect(() => () => {
    material.dispose()
    geoRef.current?.dispose()
  }, [material])

  useFrame(() => {
    if (!groupRef.current || !meshRef.current) return
    const now = getAnimTime()
    const local = (now - startOffset - revealDelay) / REVEAL_DURATION
    const reveal = Math.max(0, Math.min(1, local))

    // Ease-out cubic with a soft scale overshoot during the middle of the fade
    const ease = 1 - Math.pow(1 - reveal, 3)
    const overshoot = reveal > 0 && reveal < 1 ? Math.sin(reveal * Math.PI) * 0.12 : 0
    groupRef.current.visible = reveal > 0
    groupRef.current.scale.setScalar(member.scale * (ease + overshoot))
    material.emissiveIntensity = targetIntensity * ease
    if (reveal <= 0) return

    // Beat grid: local time + songOffset = position in the song (120 BPM).
    const beats = (now + songOffset) / BEAT_INTERVAL

    let pts: PosePts
    let headOff = headX
    let bounce = 0
    let lean = 0

    if (reveal < 1) {
      // Entrance: fade in at the entry pose, morph into the landed pose.
      const morphRaw = (reveal - MORPH_START) / (1 - MORPH_START)
      const morphEase = 1 - Math.pow(1 - Math.max(0, Math.min(1, morphRaw)), 3)
      pts = lerpPts(posePts(ENTRY_POSE), posePts(pose), morphEase)
    } else {
      // Individual groove: pump between the landed pose and the relaxed
      // entry pose — one cycle per beat, per-member phase, so each member
      // grooves on their own while others are still landing. Amplitude ramps
      // in from 0 over SETTLE_RAMP so the hand-off from the entrance morph
      // (which ends exactly on `pose`) doesn't pop.
      const phase = member.staggerIndex * 1.1
      const sinceLand = now - (startOffset + revealDelay + REVEAL_DURATION)
      const settle = smooth01(sinceLand / SETTLE_RAMP)
      const groove = (0.22 + 0.18 * Math.sin(beats * Math.PI * 2 + phase)) * settle
      pts = lerpPts(posePts(pose), posePts(ENTRY_POSE), groove)

      // Once the last member has landed (+ a breath), everyone crossfades
      // into the unison routine: one UNISON pose hit per beat, moving for
      // the first 60% of the interval and holding the hit for the rest.
      const allRevealed =
        startOffset + revealPreroll + lastStaggerIndex * revealStagger + REVEAL_DURATION
      const blend = smooth01((now - (allRevealed + UNISON_LEAD)) / UNISON_BLEND)
      if (blend > 0) {
        const i0 = ((Math.floor(beats) % UNISON.length) + UNISON.length) % UNISON.length
        const a = UNISON[i0], b = UNISON[(i0 + 1) % UNISON.length]
        const moveT = smooth01((beats - Math.floor(beats)) / 0.6)
        pts = lerpPts(pts, lerpPts(posePts(a), posePts(b), moveT), blend)
        headOff = headX * (1 - blend)
        lean = ((a.lean ?? 0) + ((b.lean ?? 0) - (a.lean ?? 0)) * moveT) * blend
      }

      // Beat bounce — unison only (amplitude rides the blend): jumping while
      // members are still appearing reads as noise, so entrances just groove.
      bounce = Math.abs(Math.sin(beats * Math.PI + phase * (1 - blend))) * 0.08 * blend
    }

    groupRef.current.position.y = bounce
    groupRef.current.rotation.z = lean

    const newGeo = buildGeoFromPts(pts, headOff)
    geoRef.current?.dispose()
    geoRef.current = newGeo
    meshRef.current.geometry = newGeo
  })

  return (
    <group ref={groupRef} position={[member.x, 0, member.z]} visible={false}>
      <mesh ref={meshRef} material={material} />
    </group>
  )
}

/* ─── Stage floor ─────────────────────────────────────────────── */

function StageFloor() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[26, 18]} />
        <meshStandardMaterial
          color={CONCERT_FLOOR}
          roughness={0.15}
          metalness={0.9}
        />
      </mesh>

      {/* Front LED strip */}
      <mesh position={[0, 0.01, 5]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[20, 0.05]} />
        <meshStandardMaterial
          color="#000000"
          emissive={CONCERT_CYAN}
          emissiveIntensity={2}
          toneMapped={false}
        />
      </mesh>

      {/* Arirang wash — warm magenta pool upstage (where the cosmic backdrop sits) */}
      <mesh position={[0, 0.005, -2.5]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[18, 10]} />
        <meshStandardMaterial
          color="#000000"
          emissive={CONCERT_MAGENTA}
          emissiveIntensity={0.55}
          toneMapped={false}
          transparent
          opacity={0.7}
        />
      </mesh>

      {/* ARMY purple downstage wash */}
      <mesh position={[0, 0.003, 1.5]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[24, 13]} />
        <meshStandardMaterial
          color="#000000"
          emissive={CONCERT_PURPLE}
          emissiveIntensity={0.45}
          toneMapped={false}
          transparent
          opacity={0.7}
        />
      </mesh>

      {MEMBERS.map((m, i) => (
        <group key={`tape-${i}`} position={[m.x, 0.005, m.z]} rotation={[-Math.PI / 2, 0, 0]}>
          <mesh rotation={[0, 0, Math.PI / 4]}>
            <planeGeometry args={[0.2, 0.015]} />
            <meshStandardMaterial
              color="#000000"
              emissive={CONCERT_CYAN}
              emissiveIntensity={0.5}
              toneMapped={false}
              transparent
              opacity={0.4}
            />
          </mesh>
          <mesh rotation={[0, 0, -Math.PI / 4]}>
            <planeGeometry args={[0.2, 0.015]} />
            <meshStandardMaterial
              color="#000000"
              emissive={CONCERT_CYAN}
              emissiveIntensity={0.5}
              toneMapped={false}
              transparent
              opacity={0.4}
            />
          </mesh>
        </group>
      ))}
    </group>
  )
}

/* ─── Spotlight cones ─────────────────────────────────────────── */

function SpotlightCone({
  position,
  targetX,
  color = CONCERT_WHITE,
}: {
  position: [number, number, number]
  targetX: number
  color?: string
}) {
  return (
    <group>
      {/* Light source dot at ceiling */}
      <mesh position={[position[0], position[1], position[2]]}>
        <sphereGeometry args={[0.03, 8, 8]} />
        <meshStandardMaterial
          color="#000000"
          emissive={color}
          emissiveIntensity={1}
          toneMapped={false}
        />
      </mesh>

      {/* Downward-facing light on each figure */}
      <pointLight
        position={[targetX, 3, position[2]]}
        color={color}
        intensity={2}
        distance={6}
        decay={2}
      />
    </group>
  )
}

/* ─── Ambient particles ───────────────────────────────────────── */

function StageHaze({ songOffset = 0 }: { songOffset?: number }) {
  const ref = useRef<THREE.Points>(null)

  const positions = useMemo(() => {
    const count = 200
    const pos = new Float32Array(count * 3)
    // Seeded, not Math.random: a Remotion render splits the frame range
    // across several browser tabs, and a per-mount random layout gives each
    // tab a different haze. Consecutive frames of the finished video then
    // come from different tabs and the motes strobe.
    const rand = seededRandom(2201)
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (rand() - 0.5) * 18
      pos[i * 3 + 1] = rand() * 8
      pos[i * 3 + 2] = (rand() - 0.5) * 10
    }
    return pos
  }, [])

  useFrame(() => {
    if (!ref.current) return
    // Song-time-based so the rotation is continuous across the master
    // video's 2.1-zoom → 2.2 cut (both scenes restart local time at 0).
    ref.current.rotation.y = (getAnimTime() + songOffset) * 0.005
  })

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        color={CONCERT_PURPLE}
        size={0.05}
        transparent
        opacity={0.15}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}

/* ─── Camera controller ────────────────────────────────────────── */

// Camera waypoints. Stage POV matches the pre-refactor default framing; stadium
// POV sits the camera far back + high up so the stage + Arirang read as "in
// the distance" from the audience.
const STAGE_POS = new THREE.Vector3(0, 3.5, 10)
const STAGE_LOOK = new THREE.Vector3(0, 2.0, -2)
// Stadium POV: same height/angle as stage POV but pulled back ~2.5x so the
// stage + Arirang read as "the stage visible at the end of the arena."
const STADIUM_POS = new THREE.Vector3(0, 4, 24)
const STADIUM_LOOK = new THREE.Vector3(0, 2, -3)

// Arirang scale at the start of a flyover — shrinks the 2D SVG backdrop so
// it reads as "in the distance" before the camera closes. The 3D stage
// geometry handles its own perspective naturally; this is a cheap pseudo-3D
// hook for the SVG layer.
const ARIRANG_FAR_SCALE = 0.45

// Vertical offset applied to the Arirang backdrop so it sits higher in frame
// (the stage floor occupies the bottom half, the logo reads as "in the sky").
const ARIRANG_Y_OFFSET = '-10%'

function easeInOutCubic(t: number): number {
  return t < 0.5
    ? 4 * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 2
}

function CameraController({
  mode,
  flyoverStart,
  flyoverDuration,
  arirangRef,
}: {
  mode: Act2CameraMode
  flyoverStart: number
  flyoverDuration: number
  arirangRef: React.RefObject<HTMLDivElement | null>
}) {
  const lookTarget = useRef(new THREE.Vector3())

  useFrame(({ camera }) => {
    const now = getAnimTime()
    let t: number
    if (mode === 'stage') t = 1
    else if (mode === 'stadium') t = 0
    else {
      const raw = Math.max(0, Math.min(1,
        (now - flyoverStart) / Math.max(0.001, flyoverDuration)
      ))
      // 'flyout' is the same dolly run backwards (stage → stadium), used by
      // the 2.3 reverse transition.
      t = easeInOutCubic(mode === 'flyout' ? 1 - raw : raw)
    }
    camera.position.lerpVectors(STADIUM_POS, STAGE_POS, t)
    lookTarget.current.lerpVectors(STADIUM_LOOK, STAGE_LOOK, t)
    camera.lookAt(lookTarget.current)

    // Arirang 2D backdrop: near (1) at the stage, far (0.45) from the
    // stadium, lerped during a flyover. 'stadium' uses the same far scale as
    // a flyover's first frame so a 2.1 → 2.1-zoom cut is seamless.
    if (arirangRef.current) {
      const scale = ARIRANG_FAR_SCALE + (1 - ARIRANG_FAR_SCALE) * t
      arirangRef.current.style.transform = `translateY(${ARIRANG_Y_OFFSET}) scale(${scale.toFixed(3)})`
    }
  })

  return null
}

/* ─── Scene content ────────────────────────────────────────────── */

function SceneContent({
  showMembers,
  startOffset,
  revealPreroll,
  revealStagger,
  songOffset,
}: {
  showMembers: boolean
  startOffset: number
  revealPreroll: number
  revealStagger: number
  songOffset: number
}) {
  return (
    <>
      <ambientLight intensity={0.08} color="#2A1840" />
      <pointLight position={[-8, 6, 2]} intensity={2} color={CONCERT_PURPLE} decay={2} />
      <pointLight position={[8, 6, 2]} intensity={2} color={CONCERT_MAGENTA} decay={2} />
      <pointLight position={[0, 4, -3]} intensity={2.4} color={CONCERT_MAGENTA} decay={2} />

      <fog attach="fog" args={['#0A0520', 10, 28]} />

      <StageFloor />
      <StageHaze songOffset={songOffset} />

      {showMembers && MEMBERS.map((m, i) => (
        <GoldFigure
          key={i}
          member={m}
          poseIndex={i}
          startOffset={startOffset}
          revealPreroll={revealPreroll}
          revealStagger={revealStagger}
          songOffset={songOffset}
        />
      ))}


      {showMembers && MEMBERS.map((m, i) => (
        <SpotlightCone
          key={`spot-${i}`}
          position={[m.x, 5, m.z]}
          targetX={m.x}
          color={CONCERT_WHITE}
        />
      ))}
    </>
  )
}

/* ─── Main export ──────────────────────────────────────────────── */

export interface Act2_2_BProps {
  cameraMode?: Act2CameraMode
  flyoverStart?: number
  flyoverDuration?: number
  showMembers?: boolean
  startOffset?: number
  /** When true, render relative to the parent container instead of taking
   *  over the full viewport. Used by StadiumStage to embed the 3D set inside
   *  Scene 2's miniature-stage rect. */
  embedded?: boolean
  /** Forces a specific device-pixel-ratio on the underlying Canvas. Used by
   *  Act2Zoom to render at a buffer size large enough that CSS-scaling the
   *  mini-stage rect up to fill the viewport stays crisp. */
  dpr?: number | [number, number]
  /** Override default member reveal pre-roll. Default is -REVEAL_DURATION so
   *  members appear fully formed at clock=0 in standalone usage. Act2Zoom
   *  passes a positive value to delay reveal until the flyover lands. */
  revealPreroll?: number
  /** Override default member reveal stagger (seconds between successive
   *  members entering). Default 0 so all members are present from frame 1
   *  in standalone usage. */
  revealStagger?: number
  /** Where this scene sits in the song — local time + offset drives the
   *  beat grid for the groove/unison choreography. Default 26 (2.2's master
   *  timeline position); Act2Zoom passes its own. */
  songOffset?: number
}

export default function Act2_2_B({
  cameraMode = 'stage',
  flyoverStart = 0,
  flyoverDuration = 3,
  showMembers = true,
  startOffset = 0,
  embedded = false,
  dpr,
  revealPreroll = DEFAULT_REVEAL_PRE_ROLL,
  revealStagger = DEFAULT_REVEAL_STAGGER,
  songOffset = DEFAULT_SONG_OFFSET,
}: Act2_2_BProps = {}) {
  const arirangRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (embedded) return
    const prev = document.body.style.background
    document.body.style.background = '#050210'
    return () => { document.body.style.background = prev }
  }, [embedded])

  const outerStyle: React.CSSProperties = embedded
    ? {
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        background: '#050210',
      }
    : {
        width: '100%',
        height: '100%',
        minHeight: '100vh',
        background: '#050210',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        overflow: 'hidden',
        zIndex: 9999,
      }

  const initialPos: [number, number, number] =
    cameraMode === 'stage' ? [STAGE_POS.x, STAGE_POS.y, STAGE_POS.z]
                           : [STADIUM_POS.x, STADIUM_POS.y, STADIUM_POS.z]
  const initialLook: [number, number, number] =
    cameraMode === 'stage' ? [STAGE_LOOK.x, STAGE_LOOK.y, STAGE_LOOK.z]
                           : [STADIUM_LOOK.x, STADIUM_LOOK.y, STADIUM_LOOK.z]

  return (
    <div style={outerStyle}>
      {/* Cosmic Arirang backdrop — 2D SVG composition behind the 3D stage.
          `immediate` skips the 2.5s emerge fade. CameraController scales this
          container each frame so it grows/recedes with the camera. */}
      <div
        ref={arirangRef}
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 0,
          transformOrigin: 'center center',
          willChange: 'transform',
        }}
      >
        <ArirangSymbolAnimated immediate cycleOffset={songOffset} />
      </div>

      {/* 3D stage — transparent Canvas so the Arirang shows through */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
        <SceneCanvas
          dpr={dpr}
          // Measure layout size (offsetWidth), not the transformed bounding
          // rect: Act2Zoom mounts this inside a wrapper CSS-scaled to ~0.2,
          // and rect-based measuring would size the GL buffer to the shrunken
          // rect and never grow it back (transforms don't fire ResizeObserver).
          resize={{ offsetSize: true, scroll: false, debounce: 0 }}
          camera={{
            position: initialPos,
            fov: 50,
            near: 0.1,
            far: 60,
          }}
          gl={{
            antialias: true,
            alpha: true,
            powerPreference: 'high-performance',
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.2,
          }}
          onCreated={({ camera, gl }) => {
            camera.lookAt(initialLook[0], initialLook[1], initialLook[2])
            gl.setClearColor(0x000000, 0)
          }}
        >
          <CameraController
            mode={cameraMode}
            flyoverStart={flyoverStart}
            flyoverDuration={flyoverDuration}
            arirangRef={arirangRef}
          />
          <SceneContent
            showMembers={showMembers}
            startOffset={startOffset}
            revealPreroll={revealPreroll}
            revealStagger={revealStagger}
            songOffset={songOffset}
          />
          <EffectComposer>
            <Bloom
              intensity={1.4}
              luminanceThreshold={0.18}
              luminanceSmoothing={0.85}
            />
          </EffectComposer>
        </SceneCanvas>
      </div>
    </div>
  )
}
