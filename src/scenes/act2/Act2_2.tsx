/**
 * Act 2.2 — "Seven (Stage)" — Three.js version
 *
 * Glowing member stick figures (Stick Gold 5 proportions, per-member BTS bias
 * colors) in unique singing/performing poses on a concert stage, revealed in
 * age order with a per-member entry-pose morph. LED wall backdrop, reflective
 * floor, spotlights. Post-processing bloom makes the figures and LED panels glow.
 *
 * Previously Act2_2_B / routed as 2.2-B; the prior SVG 2.2 (Scene3.tsx) is
 * archived under the '2.2-old' route.
 */

import { useRef, useMemo, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import * as THREE from 'three'

import { DebugCamera } from '../DebugCamera'
import {
  CONCERT_CYAN,
  CONCERT_PURPLE,
  CONCERT_MAGENTA,
  CONCERT_WHITE,
  CONCERT_FLOOR,
  LED_CRIMSON,
  LED_CRIMSON_BRIGHT,
  LED_CRIMSON_DARK,
  LED_PANEL_FRAME,
  ARIRANG_RED,
} from '../../theme/colors'

/* ─── Member data ──────────────────────────────────────────────── */

interface MemberDef {
  x: number
  z: number
  scale: number
  name: string
  color: string
  revealDelay: number  // seconds after scene mount until this member appears
}

// Staged entrance in age order (hyung to maknae), Jungkook last as the
// Golden Maknae centerpiece. 0.4s stagger between members + 0.4s pre-roll
// so the stage reads empty for a beat before the first reveal.
const REVEAL_PRE_ROLL = 0.4
const REVEAL_STAGGER = 0.45
const REVEAL_DURATION = 0.85  // fade-in + pose morph window per member
const MORPH_START = 0.30      // fraction of reveal when pose morph begins

// BTS signature bias colors (BT21 / ARMY bomb / "I purple you" associations).
const MEMBERS: MemberDef[] = [
  { x: 0,    z: 1.0,  scale: 0.95, name: 'Jungkook', color: '#FFD24A', revealDelay: REVEAL_PRE_ROLL + 6 * REVEAL_STAGGER }, // last
  { x: -1.9, z: 0.6,  scale: 0.88, name: 'RM',       color: '#5B7BFF', revealDelay: REVEAL_PRE_ROLL + 3 * REVEAL_STAGGER }, // 4th
  { x: 1.9,  z: 0.6,  scale: 0.88, name: 'V',        color: '#B876FF', revealDelay: REVEAL_PRE_ROLL + 5 * REVEAL_STAGGER }, // 6th
  { x: -3.6, z: 0.2,  scale: 0.8,  name: 'J-Hope',   color: '#FF6B4D', revealDelay: REVEAL_PRE_ROLL + 2 * REVEAL_STAGGER }, // 3rd
  { x: 3.6,  z: 0.2,  scale: 0.8,  name: 'Jimin',    color: '#FFE066', revealDelay: REVEAL_PRE_ROLL + 4 * REVEAL_STAGGER }, // 5th
  { x: -5.1, z: -0.1, scale: 0.72, name: 'Jin',      color: '#FFA3C9', revealDelay: REVEAL_PRE_ROLL + 0 * REVEAL_STAGGER }, // 1st (eldest)
  { x: 5.1,  z: -0.1, scale: 0.72, name: 'Suga',     color: '#6FEDC4', revealDelay: REVEAL_PRE_ROLL + 1 * REVEAL_STAGGER }, // 2nd
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

// Lerp every control point between two SVG bezier paths. morphT=0 → entry,
// morphT=1 → final pose.
function lerpPathPoints(fromD: string, toD: string, morphT: number): THREE.Vector3[] {
  const from = svgPathPoints(fromD)
  const to = svgPathPoints(toD)
  return from.map((p, i) => p.clone().lerp(to[i], morphT))
}

function buildFigureGeo(pose: Pose, headX: number, morphT: number): THREE.BufferGeometry {
  const shL = new THREE.Vector3(-0.02, SHOULDER_Y, 0.01)
  const shR = new THREE.Vector3(+0.02, SHOULDER_Y, 0.01)
  const hipL = new THREE.Vector3(-0.02, HIP_Y, 0)
  const hipR = new THREE.Vector3(+0.02, HIP_Y, 0)
  const spineCurve = new THREE.CatmullRomCurve3(SPINE_POINTS, false, 'catmullrom', 0.5)

  return buildBody([
    { curve: spineCurve, radius: TUBE_R, segments: 24 },
    { curve: bezier(remapLimb(lerpPathPoints(ENTRY_POSE.leftArm,  pose.leftArm,  morphT), shL,  ARM_LEN)), radius: TUBE_R, segments: 22 },
    { curve: bezier(remapLimb(lerpPathPoints(ENTRY_POSE.rightArm, pose.rightArm, morphT), shR,  ARM_LEN)), radius: TUBE_R, segments: 22 },
    { curve: bezier(remapLimb(lerpPathPoints(ENTRY_POSE.leftLeg,  pose.leftLeg,  morphT), hipL, LEG_LEN)), radius: TUBE_R, segments: 20 },
    { curve: bezier(remapLimb(lerpPathPoints(ENTRY_POSE.rightLeg, pose.rightLeg, morphT), hipR, LEG_LEN)), radius: TUBE_R, segments: 20 },
  ], [
    { center: new THREE.Vector3(headX, HEAD_Y, 0.03), radius: HEAD_R },
  ])
}

function GoldFigure({
  member,
  poseIndex,
}: {
  member: MemberDef
  poseIndex: number
}) {
  const pose = POSES[poseIndex]
  // Subtle head x-offset from pose data (SVG units → Stick5 units)
  const headX = (pose.headOffsetX ?? 0) * 0.02
  const groupRef = useRef<THREE.Group>(null)
  const meshRef = useRef<THREE.Mesh>(null)
  const geoRef = useRef<THREE.BufferGeometry | null>(null)
  const settledRef = useRef(false)
  const targetIntensity = TARGET_GLOW / hexLuminance(member.color)

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

  useFrame(({ clock }) => {
    if (!groupRef.current || !meshRef.current) return
    const local = (clock.getElapsedTime() - member.revealDelay) / REVEAL_DURATION
    const reveal = Math.max(0, Math.min(1, local))

    // Ease-out cubic with a soft scale overshoot during the middle of the fade
    const ease = 1 - Math.pow(1 - reveal, 3)
    const overshoot = reveal > 0 && reveal < 1 ? Math.sin(reveal * Math.PI) * 0.12 : 0
    groupRef.current.visible = reveal > 0
    groupRef.current.scale.setScalar(member.scale * (ease + overshoot))
    material.emissiveIntensity = targetIntensity * ease

    if (settledRef.current) return

    // Pose morph begins partway through the reveal so the figure fades in at
    // its entry pose, then animates into the final singing pose.
    const morphRaw = (reveal - MORPH_START) / (1 - MORPH_START)
    const morphT = Math.max(0, Math.min(1, morphRaw))
    const morphEase = 1 - Math.pow(1 - morphT, 3)

    const newGeo = buildFigureGeo(pose, headX, morphEase)
    geoRef.current?.dispose()
    geoRef.current = newGeo
    meshRef.current.geometry = newGeo

    if (reveal >= 1) settledRef.current = true
  })

  return (
    <group ref={groupRef} position={[member.x, 0, member.z]} visible={false}>
      <mesh ref={meshRef} material={material} />
    </group>
  )
}

/* ─── LED Panel — a single glowing rectangle ──────────────────── */

function LEDPanel({
  position,
  size,
  color,
  emissiveIntensity = 1.5,
  pulseDuration = 4,
  pulseDelay = 0,
}: {
  position: [number, number, number]
  size: [number, number]
  color: string
  emissiveIntensity?: number
  pulseDuration?: number
  pulseDelay?: number
}) {
  const matRef = useRef<THREE.MeshStandardMaterial>(null)

  useFrame(({ clock }) => {
    if (!matRef.current) return
    const t = clock.getElapsedTime()
    const pulse = 0.8 + Math.sin((t + pulseDelay) * (Math.PI * 2 / pulseDuration)) * 0.2
    matRef.current.emissiveIntensity = emissiveIntensity * pulse
  })

  return (
    <mesh position={position}>
      <planeGeometry args={size} />
      <meshStandardMaterial
        ref={matRef}
        color="#000000"
        emissive={color}
        emissiveIntensity={emissiveIntensity}
        toneMapped={false}
      />
    </mesh>
  )
}

/* ─── LED Wall — concert backdrop ─────────────────────────────── */

const WALL_X_SCALE = 16 / 1600  // SVG range 160..1760 → 3D range -8..8
const WALL_Y_SCALE = 6 / 594    // SVG range 0..594 → 3D range 0.3..6.3
const WALL_Z = -6

function mapPanel(sx: number, sy: number, sw: number, sh: number): {
  pos: [number, number, number]
  size: [number, number]
} {
  return {
    pos: [
      (sx + sw / 2 - 960) * WALL_X_SCALE,
      (594 - sy - sh / 2) * WALL_Y_SCALE + 0.3,
      WALL_Z,
    ],
    size: [sw * WALL_X_SCALE, sh * WALL_Y_SCALE],
  }
}

function LEDWall() {
  const panels = useMemo(() => {
    const defs: { sx: number; sy: number; sw: number; sh: number; color: string; intensity: number; pulse: number; delay: number }[] = [
      { sx: 260, sy: 10, sw: 280, sh: 86, color: LED_CRIMSON_BRIGHT, intensity: 1.2, pulse: 5, delay: 0 },
      { sx: 544, sy: 10, sw: 310, sh: 86, color: LED_CRIMSON_DARK, intensity: 0.8, pulse: 4.5, delay: 0.6 },
      { sx: 1066, sy: 10, sw: 310, sh: 86, color: LED_CRIMSON_DARK, intensity: 0.8, pulse: 4.5, delay: 1.2 },
      { sx: 1380, sy: 10, sw: 280, sh: 86, color: LED_CRIMSON_BRIGHT, intensity: 1.2, pulse: 5, delay: 1.8 },
      { sx: 200, sy: 100, sw: 500, sh: 165, color: LED_CRIMSON_BRIGHT, intensity: 2.0, pulse: 4, delay: 0.3 },
      { sx: 706, sy: 100, sw: 508, sh: 165, color: LED_CRIMSON_BRIGHT, intensity: 2.2, pulse: 3.5, delay: 0 },
      { sx: 1220, sy: 100, sw: 500, sh: 165, color: LED_CRIMSON_BRIGHT, intensity: 2.0, pulse: 4, delay: 0.6 },
      { sx: 200, sy: 268, sw: 370, sh: 168, color: LED_CRIMSON, intensity: 1.5, pulse: 5, delay: 1.0 },
      { sx: 574, sy: 268, sw: 384, sh: 168, color: LED_CRIMSON, intensity: 1.5, pulse: 4, delay: 0.4 },
      { sx: 962, sy: 268, sw: 384, sh: 168, color: LED_CRIMSON, intensity: 1.5, pulse: 4.5, delay: 0.8 },
      { sx: 1350, sy: 268, sw: 370, sh: 168, color: LED_CRIMSON, intensity: 1.5, pulse: 5, delay: 1.4 },
      { sx: 200, sy: 440, sw: 260, sh: 60, color: LED_CRIMSON, intensity: 1.2, pulse: 6, delay: 0.2 },
      { sx: 464, sy: 440, sw: 310, sh: 60, color: LED_CRIMSON, intensity: 1.2, pulse: 5, delay: 0.8 },
      { sx: 778, sy: 440, sw: 364, sh: 60, color: LED_CRIMSON_BRIGHT, intensity: 1.5, pulse: 4.5, delay: 0.5 },
      { sx: 1146, sy: 440, sw: 310, sh: 60, color: LED_CRIMSON, intensity: 1.2, pulse: 5, delay: 1.1 },
      { sx: 1460, sy: 440, sw: 260, sh: 60, color: LED_CRIMSON, intensity: 1.2, pulse: 6, delay: 1.6 },
      // Row 4
      { sx: 200, sy: 504, sw: 540, sh: 66, color: LED_CRIMSON, intensity: 1.0, pulse: 5.5, delay: 0.3 },
      { sx: 744, sy: 504, sw: 432, sh: 66, color: LED_CRIMSON, intensity: 1.0, pulse: 4.5, delay: 0.9 },
      { sx: 1180, sy: 504, sw: 540, sh: 66, color: LED_CRIMSON, intensity: 1.0, pulse: 5.5, delay: 1.5 },
      // Bottom strip
      { sx: 200, sy: 574, sw: 1520, sh: 16, color: LED_CRIMSON_BRIGHT, intensity: 1.5, pulse: 3, delay: 0 },
      { sx: 164, sy: 10, sw: 30, sh: 190, color: LED_CRIMSON_BRIGHT, intensity: 1.0, pulse: 5, delay: 0.2 },
      { sx: 164, sy: 204, sw: 30, sh: 190, color: LED_CRIMSON, intensity: 0.8, pulse: 4.5, delay: 0.8 },
      { sx: 164, sy: 398, sw: 30, sh: 190, color: LED_CRIMSON_DARK, intensity: 0.6, pulse: 5.5, delay: 1.4 },
      { sx: 1726, sy: 10, sw: 30, sh: 190, color: LED_CRIMSON_BRIGHT, intensity: 1.0, pulse: 5, delay: 0.4 },
      { sx: 1726, sy: 204, sw: 30, sh: 190, color: LED_CRIMSON, intensity: 0.8, pulse: 4.5, delay: 1.0 },
      { sx: 1726, sy: 398, sw: 30, sh: 190, color: LED_CRIMSON_DARK, intensity: 0.6, pulse: 5.5, delay: 1.6 },
    ]
    return defs.map(d => ({ ...mapPanel(d.sx, d.sy, d.sw, d.sh), ...d }))
  }, [])

  return (
    <group>
      {/* Dark structural backing — full width */}
      <mesh position={[0, 3.3, WALL_Z - 0.1]}>
        <planeGeometry args={[18, 7]} />
        <meshStandardMaterial color={LED_PANEL_FRAME} roughness={0.95} />
      </mesh>
      {/* Side walls extending beyond LED area */}
      <mesh position={[-9.5, 3.3, WALL_Z - 0.05]}>
        <planeGeometry args={[2, 7]} />
        <meshStandardMaterial color="#080810" roughness={0.95} />
      </mesh>
      <mesh position={[9.5, 3.3, WALL_Z - 0.05]}>
        <planeGeometry args={[2, 7]} />
        <meshStandardMaterial color="#080810" roughness={0.95} />
      </mesh>

      {panels.map((p, i) => (
        <LEDPanel
          key={i}
          position={p.pos}
          size={p.size}
          color={p.color}
          emissiveIntensity={p.intensity}
          pulseDuration={p.pulse}
          pulseDelay={p.delay}
        />
      ))}

      {[[-0.55, 5.8], [0, 5.8], [0.55, 5.8]].map(([x, y], i) => (
        <mesh key={`arirang-${i}`} position={[x, y, WALL_Z + 0.05]}>
          <torusGeometry args={[0.18, 0.04, 8, 24]} />
          <meshStandardMaterial
            color="#000000"
            emissive={ARIRANG_RED}
            emissiveIntensity={2.5}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  )
}

/* ─── Stage floor ─────────────────────────────────────────────── */

function StageFloor() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[20, 14]} />
        <meshStandardMaterial
          color={CONCERT_FLOOR}
          roughness={0.15}
          metalness={0.9}
        />
      </mesh>

      {/* Front LED strip */}
      <mesh position={[0, 0.01, 4]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[16, 0.04]} />
        <meshStandardMaterial
          color="#000000"
          emissive={CONCERT_CYAN}
          emissiveIntensity={2}
          toneMapped={false}
        />
      </mesh>

      {/* LED wall reflection on floor — warm crimson wash */}
      <mesh position={[0, 0.005, -2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[14, 8]} />
        <meshStandardMaterial
          color="#000000"
          emissive={LED_CRIMSON}
          emissiveIntensity={0.15}
          toneMapped={false}
          transparent
          opacity={0.4}
        />
      </mesh>

      {/* Purple ambient floor wash */}
      <mesh position={[0, 0.003, 1]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[18, 10]} />
        <meshStandardMaterial
          color="#000000"
          emissive={CONCERT_PURPLE}
          emissiveIntensity={0.08}
          toneMapped={false}
          transparent
          opacity={0.3}
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

function StageHaze() {
  const ref = useRef<THREE.Points>(null)

  const positions = useMemo(() => {
    const count = 200
    const pos = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 18
      pos[i * 3 + 1] = Math.random() * 8
      pos[i * 3 + 2] = (Math.random() - 0.5) * 10
    }
    return pos
  }, [])

  useFrame(({ clock }) => {
    if (!ref.current) return
    ref.current.rotation.y = clock.getElapsedTime() * 0.005
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

/* ─── Scanline effect on LED wall ─────────────────────────────── */

function LEDScanline() {
  const ref = useRef<THREE.Mesh>(null)

  useFrame(({ clock }) => {
    if (!ref.current) return
    const cycle = (clock.getElapsedTime() % 4) / 4
    ref.current.position.y = 0.3 + cycle * 6
  })

  return (
    <mesh ref={ref} position={[0, 3, WALL_Z + 0.08]}>
      <planeGeometry args={[16, 0.03]} />
      <meshBasicMaterial
        color={LED_CRIMSON_BRIGHT}
        transparent
        opacity={0.15}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  )
}

/* ─── Scene content ────────────────────────────────────────────── */

function SceneContent() {
  return (
    <>
      <ambientLight intensity={0.02} color="#1A1030" />
      <pointLight position={[-8, 6, 2]} intensity={2} color={CONCERT_PURPLE} decay={2} />
      <pointLight position={[8, 6, 2]} intensity={2} color={CONCERT_MAGENTA} decay={2} />
      <pointLight position={[0, 4, -3]} intensity={3} color={LED_CRIMSON} decay={2} />

      <fog attach="fog" args={['#050510', 8, 25]} />

      <StageFloor />
      <LEDWall />
      <LEDScanline />
      <StageHaze />

      {MEMBERS.map((m, i) => (
        <GoldFigure key={i} member={m} poseIndex={i} />
      ))}

      {MEMBERS.map((m, i) => (
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

export default function Act2_2() {
  useEffect(() => {
    const prev = document.body.style.background
    document.body.style.background = '#050510'
    return () => { document.body.style.background = prev }
  }, [])

  return (
    <div style={{
      width: '100%',
      height: '100%',
      minHeight: '100vh',
      background: '#050510',
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      overflow: 'hidden',
      zIndex: 9999,
    }}>
      <Canvas
        shadows
        camera={{
          position: [0, 3.5, 10],
          fov: 50,
          near: 0.1,
          far: 50,
        }}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.2,
        }}
        onCreated={({ camera }) => {
          camera.lookAt(0, 2.0, -2)
        }}
      >
        <DebugCamera />
        <SceneContent />
        <EffectComposer>
          <Bloom
            intensity={1.6}
            luminanceThreshold={0.15}
            luminanceSmoothing={0.85}
            mipmapBlur
          />
          <Vignette eskil={false} offset={0.1} darkness={0.65} />
        </EffectComposer>
      </Canvas>
    </div>
  )
}
