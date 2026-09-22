/**
 * CharStickGold5K — Per-frame geometry rebuild with procedural walk pose.
 *
 * Each frame computes a procedural walking pose (foot stance/swing, knee
 * bend, body bob, arm swing) and rebuilds the merged tube geometry.
 * Preserves the seamless single-blob look at the cost of CPU per frame.
 *
 * Locomotion: figure translates forward in z. Foot positions in body space
 * are calculated such that the planted foot stays at fixed world z during
 * stance — feet don't slip on the ground.
 *
 * Cycle: 1.0s per full cycle (~2 steps/sec brisk walk). Loops world z.
 */

import { useRef, useMemo, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import * as THREE from 'three'
import type { Group, Mesh, Points } from 'three'
import { DebugCamera } from '../DebugCamera'

const GOLD = '#D4A843'
const GOLD_BRIGHT = '#F0D060'
const GOLD_DIM = '#8B6914'
const BG = '#080E1C'

const R = 0.050
const RH = 0.16

// Walk parameters
const CYCLE = 1.0                         // sec per full cycle (2 steps)
const STRIDE = 0.18                       // half-stride: foot z swings ±STRIDE in body space
const FOOT_LIFT = 0.12                    // peak foot height during swing
const HIP_Y = 0.93
const SHOULDER_Y = 1.47
const HEAD_Y = 1.73
const FOOT_Y = 0.06
const WALK_SPEED = (4 * STRIDE) / CYCLE   // body z velocity needed for planted feet
const LOOP_DIST = 3.0                     // teleport-back distance
const LOOP_START_Z = -1.5                 // z position at start of each loop

type Curve = { points: THREE.Vector3[]; radius: number; segments?: number }
type Sphere = { center: THREE.Vector3; radius: number }

function buildBody(curves: Curve[], spheres: Sphere[]): THREE.BufferGeometry {
  const geos: THREE.BufferGeometry[] = []
  const RADIAL = 12
  for (const { points, radius, segments = 14 } of curves) {
    const curve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.5)
    geos.push(new THREE.TubeGeometry(curve, segments, radius, RADIAL, false))
    for (const pt of [points[0], points[points.length - 1]]) {
      const s = new THREE.SphereGeometry(radius, 16, 16)
      s.translate(pt.x, pt.y, pt.z)
      geos.push(s)
    }
  }
  for (const { center, radius } of spheres) {
    const s = new THREE.SphereGeometry(radius, 24, 24)
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

// Per-foot state for a given phase (one full cycle = phase 0 → 1).
// phase 0 = heel strike (foot lands forward), 0.5 = toe-off (foot at back, lift),
// 0.5–1 = swing (foot lifted, returning forward), 1 = next heel strike.
function footState(p: number) {
  if (p < 0.5) {
    // Stance: foot planted, in body coords moves from +STRIDE → -STRIDE
    const t = p / 0.5
    return { y: FOOT_Y, z: STRIDE * (1 - 2 * t), bend: 0.05 + 0.10 * Math.sin(t * Math.PI) }
  }
  // Swing: foot lifted, sweeps from -STRIDE → +STRIDE
  const t = (p - 0.5) / 0.5
  return {
    y: FOOT_Y + FOOT_LIFT * Math.sin(t * Math.PI),
    z: STRIDE * (2 * t - 1),
    bend: 0.7 * Math.sin(t * Math.PI),
  }
}

// Knee position: midpoint of hip-foot, biased forward (+z) and up (+y) by bend factor.
function buildLegPoints(hipX: number, foot: { y: number; z: number; bend: number }, hipY: number) {
  const hip = v(hipX, hipY, 0)
  const ankle = v(hipX * 4, foot.y, foot.z)   // foot splayed outward (~4× hip x)
  const mid = hip.clone().lerp(ankle, 0.5)
  mid.z += 0.18 * foot.bend                   // knee comes forward
  mid.y += 0.04 * foot.bend                   // knee lifts slightly
  return [
    hip,
    hip.clone().lerp(mid, 0.5),
    mid,
    mid.clone().lerp(ankle, 0.5),
    ankle,
  ]
}

function buildArmPoints(shX: number, swingZ: number, shY: number) {
  // shX is buried inside spine. swingZ ∈ [-1, 1] from leg phase.
  const sh = v(shX, shY, 0.01)
  const outX = shX > 0 ? 0.10 : -0.10
  const elbow = v(outX, shY - 0.27, swingZ * 0.08)
  const hand = v(outX * 0.85, shY - 0.55, swingZ * 0.22)
  return [
    sh,
    sh.clone().lerp(elbow, 0.4),
    elbow,
    elbow.clone().lerp(hand, 0.5),
    hand,
  ]
}

function buildSpinePoints(hipY: number) {
  return [
    v(0, hipY, 0),
    v(0, hipY + 0.16, 0.02),
    v(0, hipY + 0.36, 0.03),
    v(0, hipY + 0.54, 0.02),
    v(0, hipY + 0.64, 0.02),
  ]
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
  const meshRef = useRef<Mesh>(null)
  const geoRef = useRef<THREE.BufferGeometry | null>(null)

  const mat = useMemo(() => new THREE.MeshStandardMaterial({
    color: GOLD, emissive: GOLD, emissiveIntensity: 0.35,
    roughness: 0.5, metalness: 0.15,
  }), [])

  useEffect(() => () => { geoRef.current?.dispose() }, [])

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    const phase = (t / CYCLE) % 1

    // Body bob: lowest at heel-strikes (phase 0, 0.5), highest at passing (0.25, 0.75)
    const bobY = -Math.cos(phase * 4 * Math.PI) * 0.020
    const hipY = HIP_Y + bobY
    const shY = SHOULDER_Y + bobY
    const headY = HEAD_Y + bobY

    const rFoot = footState(phase)
    const lFoot = footState((phase + 0.5) % 1)

    // Arms swing opposite to same-side legs.
    // Right leg z direction (+1 = forward) → right arm swing (-1 = back).
    const rArmSwing = -rFoot.z / STRIDE
    const lArmSwing = -lFoot.z / STRIDE

    const newGeo = buildBody([
      { points: buildSpinePoints(hipY), radius: R, segments: 16 },
      { points: buildArmPoints(-0.02, lArmSwing, shY), radius: R, segments: 14 },
      { points: buildArmPoints(+0.02, rArmSwing, shY), radius: R, segments: 14 },
      { points: buildLegPoints(-0.02, lFoot, hipY), radius: R, segments: 16 },
      { points: buildLegPoints(+0.02, rFoot, hipY), radius: R, segments: 16 },
    ], [
      { center: v(0, headY, 0.03), radius: RH },
    ])

    geoRef.current?.dispose()
    geoRef.current = newGeo
    if (meshRef.current) meshRef.current.geometry = newGeo

    // Forward locomotion: body walks +z (away from camera). Loops back when reaching far point.
    if (groupRef.current) {
      const dist = (t * WALK_SPEED) % LOOP_DIST
      groupRef.current.position.z = LOOP_START_Z + dist
      // Slight body sway (counter-rotation) for life
      groupRef.current.rotation.y = Math.sin(phase * 2 * Math.PI) * 0.04
    }
  })

  return (
    <group ref={groupRef}>
      <mesh ref={meshRef} material={mat} />
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

export default function CharStickGold5K() {
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
