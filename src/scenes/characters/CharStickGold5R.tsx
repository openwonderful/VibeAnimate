/**
 * CharStickGold5R — Rigged limb-rotation walk cycle.
 *
 * Torso (spine + head) is one static merged mesh. Each leg is split into
 * thigh + calf with a knee joint (parented group). Each arm is one segment
 * pivoting at the shoulder. All rotations are computed parametrically per
 * frame to drive a walk cycle synchronized with forward locomotion.
 *
 * Joint pivots are buried inside the spine cylinder (x=±0.02, inside R=0.05
 * surface) so the limb's own first sphere cap stays hidden inside the torso.
 *
 * Walk: 1.0s cycle, ~2 steps/sec. Body translates +z and loops.
 */

import { useRef, useMemo, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import * as THREE from 'three'
import type { Group, Points } from 'three'
import { DebugCamera } from '../DebugCamera'

const GOLD = '#D4A843'
const GOLD_BRIGHT = '#F0D060'
const GOLD_DIM = '#8B6914'
const BG = '#080E1C'

const R = 0.050
const RH = 0.16

const CYCLE = 1.0
const STRIDE = 0.18
const FOOT_LIFT = 0.12
const HIP_Y = 0.93
const SHOULDER_Y = 1.47
const HEAD_Y = 1.73
const FOOT_Y = 0.06
const WALK_SPEED = (4 * STRIDE) / CYCLE
const LOOP_DIST = 3.0
const LOOP_START_Z = -1.5

type Curve = { points: THREE.Vector3[]; radius: number; segments?: number }
type Sphere = { center: THREE.Vector3; radius: number }

function buildBody(curves: Curve[], spheres: Sphere[]): THREE.BufferGeometry {
  const geos: THREE.BufferGeometry[] = []
  const RADIAL = 16
  for (const { points, radius, segments = 18 } of curves) {
    const curve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.5)
    geos.push(new THREE.TubeGeometry(curve, segments, radius, RADIAL, false))
    for (const pt of [points[0], points[points.length - 1]]) {
      const s = new THREE.SphereGeometry(radius, 20, 20)
      s.translate(pt.x, pt.y, pt.z)
      geos.push(s)
    }
  }
  for (const { center, radius } of spheres) {
    const s = new THREE.SphereGeometry(radius, 32, 32)
    s.translate(center.x, center.y, center.z)
    geos.push(s)
  }
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
  for (const g of geos) g.dispose()
  const m = new THREE.BufferGeometry()
  m.setAttribute('position', new THREE.BufferAttribute(p, 3))
  m.setAttribute('normal', new THREE.BufferAttribute(n, 3))
  m.setIndex(new THREE.BufferAttribute(ix, 1))
  m.computeVertexNormals()
  return m
}

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z)

// Joint pivots (world-space, before any group translation/rotation)
const SHOULDER_L: [number, number, number] = [-0.02, SHOULDER_Y, 0.01]
const SHOULDER_R: [number, number, number] = [0.02, SHOULDER_Y, 0.01]
const HIP_L: [number, number, number] = [-0.02, HIP_Y, 0]
const HIP_R: [number, number, number] = [0.02, HIP_Y, 0]

// Leg geometry: thigh (hip → knee), calf (knee → foot), in respective local spaces.
// Lengths chosen so foot rests at world y ≈ 0.07, just above ground.
const THIGH_PTS_L = [v(0, 0, 0), v(-0.04, -0.18, 0.02), v(-0.07, -0.46, 0.05)]
const KNEE_REL_L: [number, number, number] = [-0.07, -0.46, 0.05]
const CALF_PTS_L = [v(0, 0, 0), v(-0.04, -0.20, -0.03), v(-0.07, -0.41, -0.05)]

const THIGH_PTS_R = THIGH_PTS_L.map(p => v(-p.x, p.y, p.z))
const KNEE_REL_R: [number, number, number] = [-KNEE_REL_L[0], KNEE_REL_L[1], KNEE_REL_L[2]]
const CALF_PTS_R = CALF_PTS_L.map(p => v(-p.x, p.y, p.z))

// L1 / L2 lengths for IK
const L1 = Math.hypot(KNEE_REL_L[0], KNEE_REL_L[1], KNEE_REL_L[2])
const L2 = Math.hypot(CALF_PTS_L[CALF_PTS_L.length - 1].x, CALF_PTS_L[CALF_PTS_L.length - 1].y, CALF_PTS_L[CALF_PTS_L.length - 1].z)

// Arms (single-segment) in shoulder-local space
const ARM_PTS_L = [
  v(0, 0, 0),
  v(-0.06, -0.05, 0.02),
  v(-0.10, -0.20, 0.03),
  v(-0.13, -0.42, 0.02),
  v(-0.10, -0.58, 0.00),
]
const ARM_PTS_R = ARM_PTS_L.map(p => v(-p.x, p.y, p.z))

// Per-foot world target for given walk phase, in body coords.
function footTarget(p: number) {
  if (p < 0.5) {
    const t = p / 0.5
    return { y: FOOT_Y, z: STRIDE * (1 - 2 * t) }
  }
  const t = (p - 0.5) / 0.5
  return { y: FOOT_Y + FOOT_LIFT * Math.sin(t * Math.PI), z: STRIDE * (2 * t - 1) }
}

// 2-bone IK in YZ plane. Solves thigh and knee rotations so foot reaches target.
// foot is in hip-local space (subtract hip Y from world target Y).
// Returns rotations to apply on thigh group (.rotation.x) and knee group (.rotation.x).
function solveLegIK(footRelHipY: number, footRelHipZ: number) {
  const dy = footRelHipY        // negative (foot below hip)
  const dz = footRelHipZ
  let D = Math.hypot(dy, dz)
  const maxReach = L1 + L2 - 0.005
  if (D > maxReach) D = maxReach
  // Knee interior angle (between thigh and calf, measured at knee)
  const cosKnee = (L1 * L1 + L2 * L2 - D * D) / (2 * L1 * L2)
  const kneeInterior = Math.acos(Math.max(-1, Math.min(1, cosKnee)))
  const kneeBend = Math.PI - kneeInterior     // 0 when straight, larger when bent
  // Angle from -Y axis (default thigh down direction) to (hip → foot) in YZ plane:
  const targetAngle = Math.atan2(dz, -dy)     // 0 = straight down, +π/2 = +z forward
  // Offset to put knee in front of the hip→foot line (so knee bends forward, naturally)
  const cosThigh = (L1 * L1 + D * D - L2 * L2) / (2 * L1 * D)
  const thighOffset = Math.acos(Math.max(-1, Math.min(1, cosThigh)))
  const thighFromDown = targetAngle + thighOffset
  // three.js rotation.x: positive rotation moves -Y toward -Z (foot back).
  // So forward-pointing thigh requires NEGATIVE rotation.x.
  return { thighRotX: -thighFromDown, kneeRotX: kneeBend }
}

function GoldParticles() {
  const pointsRef = useRef<Points>(null)
  const COUNT = 35
  const { positions, speeds, phases } = useMemo(() => {
    const pos = new Float32Array(COUNT * 3); const spd = new Float32Array(COUNT); const ph = new Float32Array(COUNT)
    for (let i = 0; i < COUNT; i++) {
      const a = Math.random() * Math.PI * 2; const r = 0.4 + Math.random() * 1.1
      pos[i * 3] = Math.cos(a) * r; pos[i * 3 + 1] = Math.random() * 2.0; pos[i * 3 + 2] = Math.sin(a) * r
      spd[i] = 0.15 + Math.random() * 0.25; ph[i] = Math.random() * Math.PI * 2
    }
    return { positions: pos, speeds: spd, phases: ph }
  }, [])
  const geo = useMemo(() => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(positions.slice(), 3)); return g }, [positions])
  const mat = useMemo(() => new THREE.PointsMaterial({ color: GOLD_BRIGHT, size: 0.018, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true }), [])
  useFrame(({ clock }) => {
    if (!pointsRef.current) return
    const t = clock.getElapsedTime()
    const arr = (pointsRef.current.geometry.attributes.position as THREE.BufferAttribute).array as Float32Array
    for (let i = 0; i < COUNT; i++) {
      arr[i * 3 + 1] = positions[i * 3 + 1] + Math.sin(t * speeds[i] + phases[i]) * 0.15
      arr[i * 3] = positions[i * 3] + Math.sin(t * 0.3 + phases[i]) * 0.06
      arr[i * 3 + 2] = positions[i * 3 + 2] + Math.cos(t * 0.25 + phases[i]) * 0.06
    }
    ;(pointsRef.current.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true
  })
  return <points ref={pointsRef} geometry={geo} material={mat} />
}

function SmoothFigure() {
  const groupRef = useRef<Group>(null)
  const leftHipRef = useRef<Group>(null)
  const rightHipRef = useRef<Group>(null)
  const leftKneeRef = useRef<Group>(null)
  const rightKneeRef = useRef<Group>(null)
  const leftArmRef = useRef<Group>(null)
  const rightArmRef = useRef<Group>(null)

  const mat = useMemo(() => new THREE.MeshStandardMaterial({
    color: GOLD, emissive: GOLD, emissiveIntensity: 0.35,
    roughness: 0.5, metalness: 0.15,
  }), [])

  // Static torso: spine + head only.
  const torsoGeo = useMemo(() => buildBody([
    {
      points: [v(0, HIP_Y, 0), v(0, HIP_Y + 0.16, 0.02), v(0, HIP_Y + 0.36, 0.03), v(0, SHOULDER_Y, 0.02), v(0, SHOULDER_Y + 0.10, 0.02)],
      radius: R,
      segments: 24,
    },
  ], [
    { center: v(0, HEAD_Y, 0.03), radius: RH },
  ]), [])

  const thighL = useMemo(() => buildBody([{ points: THIGH_PTS_L, radius: R, segments: 16 }], []), [])
  const thighR = useMemo(() => buildBody([{ points: THIGH_PTS_R, radius: R, segments: 16 }], []), [])
  const calfL = useMemo(() => buildBody([{ points: CALF_PTS_L, radius: R, segments: 16 }], []), [])
  const calfR = useMemo(() => buildBody([{ points: CALF_PTS_R, radius: R, segments: 16 }], []), [])
  const armL = useMemo(() => buildBody([{ points: ARM_PTS_L, radius: R, segments: 18 }], []), [])
  const armR = useMemo(() => buildBody([{ points: ARM_PTS_R, radius: R, segments: 18 }], []), [])

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    const phase = (t / CYCLE) % 1

    // Leg IK: solve for each leg from its target foot position
    const rTarget = footTarget(phase)
    const lTarget = footTarget((phase + 0.5) % 1)
    // Foot world Y minus hip world Y → foot rel hip
    const r = solveLegIK(rTarget.y - HIP_Y, rTarget.z)
    const l = solveLegIK(lTarget.y - HIP_Y, lTarget.z)

    if (rightHipRef.current) rightHipRef.current.rotation.x = r.thighRotX
    if (rightKneeRef.current) rightKneeRef.current.rotation.x = r.kneeRotX
    if (leftHipRef.current) leftHipRef.current.rotation.x = l.thighRotX
    if (leftKneeRef.current) leftKneeRef.current.rotation.x = l.kneeRotX

    // Arms swing opposite to same-side legs.
    // Right thigh rotated -X (forward) → right arm rotated +X (back).
    // Use 0.6× thigh swing magnitude so arms don't over-swing.
    if (rightArmRef.current) rightArmRef.current.rotation.x = -r.thighRotX * 0.6
    if (leftArmRef.current) leftArmRef.current.rotation.x = -l.thighRotX * 0.6

    if (groupRef.current) {
      // Body bob synchronized with steps (lowest at heel-strike phase 0/0.5)
      const bobY = -Math.cos(phase * 4 * Math.PI) * 0.020
      groupRef.current.position.y = bobY
      // Slight body rotation (counter to hip yaw — torso twists)
      groupRef.current.rotation.y = Math.sin(phase * 2 * Math.PI) * 0.04
      // Forward locomotion
      const dist = (t * WALK_SPEED) % LOOP_DIST
      groupRef.current.position.z = LOOP_START_Z + dist
    }
  })

  return (
    <group ref={groupRef}>
      <mesh geometry={torsoGeo} material={mat} />

      <group ref={leftHipRef} position={HIP_L}>
        <mesh geometry={thighL} material={mat} />
        <group ref={leftKneeRef} position={KNEE_REL_L}>
          <mesh geometry={calfL} material={mat} />
        </group>
      </group>

      <group ref={rightHipRef} position={HIP_R}>
        <mesh geometry={thighR} material={mat} />
        <group ref={rightKneeRef} position={KNEE_REL_R}>
          <mesh geometry={calfR} material={mat} />
        </group>
      </group>

      <group ref={leftArmRef} position={SHOULDER_L}>
        <mesh geometry={armL} material={mat} />
      </group>
      <group ref={rightArmRef} position={SHOULDER_R}>
        <mesh geometry={armR} material={mat} />
      </group>

      <pointLight position={[0, 0.2, 0.5]} color={GOLD} intensity={1.2} distance={3} decay={2} />
    </group>
  )
}

function GroundGlow() {
  const meshRef = useRef<THREE.Mesh>(null)
  useFrame(({ clock }) => {
    if (!meshRef.current) return
    const s = 1.0 + Math.sin(clock.getElapsedTime() * 0.6) * 0.04
    meshRef.current.scale.set(s, s, 1)
  })
  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0.03]}>
      <circleGeometry args={[0.6, 48]} />
      <meshStandardMaterial color="#2A1A08" emissive="#D4A843" emissiveIntensity={0.35}
        transparent opacity={0.6} roughness={1} side={THREE.DoubleSide} />
    </mesh>
  )
}

function SceneSetup() {
  const { camera } = useThree()
  useEffect(() => { camera.lookAt(0, 1.0, 0) }, [camera])
  return null
}

export default function CharStickGold5R() {
  return (
    <div style={{ width: '100%', height: '100%', background: BG }}>
      <Canvas
        style={{ width: '100%', height: '100%' }}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.1, preserveDrawingBuffer: true }}
        camera={{ position: [1.8, 1.2, 2.5], fov: 45, near: 0.1, far: 100 }}
      >
        <SceneSetup />
        <DebugCamera />
        <color attach="background" args={[BG]} />
        <fog attach="fog" args={[BG, 4, 15]} />
        <ambientLight color="#1E2030" intensity={0.35} />
        <directionalLight position={[-2, 3, 3]} color="#FDE8C8" intensity={1.0} castShadow />
        <pointLight position={[1.5, 2.5, 2]} color={GOLD_DIM} intensity={1.0} distance={8} decay={2} />
        <pointLight position={[-1, 0.5, 2]} color="#F5C060" intensity={0.4} distance={5} decay={2} />
        <pointLight position={[0, 1.5, -2]} color="#D4A843" intensity={0.5} distance={6} decay={2} />
        <SmoothFigure />
        <GroundGlow />
        <GoldParticles />
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <planeGeometry args={[20, 20]} />
          <meshStandardMaterial color="#12100D" roughness={0.95} />
        </mesh>
        <EffectComposer>
          <Bloom intensity={0.9} luminanceThreshold={0.25} luminanceSmoothing={0.85} mipmapBlur />
          <Vignette eskil={false} offset={0.15} darkness={0.55} />
        </EffectComposer>
      </Canvas>
    </div>
  )
}
