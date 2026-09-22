/**
 * CharStickGold4 — Proportions modeled on Yeats "Second Coming" reference.
 *
 * Measured from reference image (% of total figure height):
 *   Head:   ~19%   → RH = 0.16  (diameter 0.32, large round head)
 *   Torso:  ~32%   (shoulder → hip)
 *   Legs:   ~43%   (hip → feet)
 *   Limb radius: ~4.2%  → R = 0.065 (≈1.9× the thin-stick R = 0.035)
 *   Stance width: hips ±0.18 (wide planted feet, splayed outward)
 *   Arms:   hang down at sides with slight elbow curve, hands at low-hip level
 *
 * Pose: standing, weight evenly distributed, arms relaxed — not mid-stride.
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

function useSmoothBody(
  curves: { points: THREE.Vector3[]; radius: number; segments?: number }[],
  spheres: { center: THREE.Vector3; radius: number }[] = [],
) {
  return useMemo(() => {
    const geos: THREE.BufferGeometry[] = []
    const RADIAL = 16
    for (const { points, radius, segments = 20 } of curves) {
      const curve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.5)
      geos.push(new THREE.TubeGeometry(curve, segments, radius, RADIAL, false))
      for (const pt of [points[0], points[points.length - 1]]) {
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
  }, [])
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

function GoldParticles() {
  const pointsRef = useRef<Points>(null)
  const COUNT = 35
  const { positions, speeds, phases } = useMemo(() => {
    const pos = new Float32Array(COUNT * 3)
    const spd = new Float32Array(COUNT)
    const ph = new Float32Array(COUNT)
    for (let i = 0; i < COUNT; i++) {
      const angle = Math.random() * Math.PI * 2
      const r = 0.4 + Math.random() * 1.1
      pos[i * 3] = Math.cos(angle) * r
      pos[i * 3 + 1] = Math.random() * 2.0
      pos[i * 3 + 2] = Math.sin(angle) * r
      spd[i] = 0.15 + Math.random() * 0.25
      ph[i] = Math.random() * Math.PI * 2
    }
    return { positions: pos, speeds: spd, phases: ph }
  }, [])
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(positions.slice(), 3))
    return g
  }, [positions])
  const mat = useMemo(() => new THREE.PointsMaterial({
    color: GOLD_BRIGHT, size: 0.018, transparent: true, opacity: 0.7,
    blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
  }), [])
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
  const R = 0.050   // slimmer limbs (~3.0% of total height)
  const RH = 0.16   // large head (~19% of total height) — matches Yeats reference

  // Anatomy (y positions, feet at 0.06, head center at 1.73, total ≈ 1.83):
  //   feet   y = 0.06       (planted, splayed ±0.18)
  //   hips   y = 0.93       (legs ≈ 0.87)
  //   shldr  y = 1.47       (torso ≈ 0.54)
  //   neck   y = 1.57
  //   head   y = 1.73       (radius 0.16, top at 1.89)
  const bodyGeo = useSmoothBody([
    // Spine: hips → torso → shoulders → neck → into head
    {
      points: [
        new THREE.Vector3(0, 0.93, 0),
        new THREE.Vector3(0, 1.09, 0.01),
        new THREE.Vector3(0, 1.29, 0.02),
        new THREE.Vector3(0, 1.47, 0.01),
        new THREE.Vector3(0, 1.57, 0.01),
      ],
      radius: R,
      segments: 24,
    },
    // Left arm: starts BURIED inside the spine (x=-0.02 is inside R=0.05 cylinder)
    // so the tube emerges naturally through the spine surface — no exposed end-cap seam.
    {
      points: [
        new THREE.Vector3(-0.02, 1.47, 0.01),
        new THREE.Vector3(-0.08, 1.43, 0.02),
        new THREE.Vector3(-0.13, 1.32, 0.03),
        new THREE.Vector3(-0.16, 1.14, 0.02),
        new THREE.Vector3(-0.11, 0.98, 0.01),
      ],
      radius: R,
      segments: 20,
    },
    // Right arm: mirror — also buried inside spine
    {
      points: [
        new THREE.Vector3(0.02, 1.47, 0.01),
        new THREE.Vector3(0.08, 1.43, 0.02),
        new THREE.Vector3(0.13, 1.32, 0.03),
        new THREE.Vector3(0.16, 1.14, 0.02),
        new THREE.Vector3(0.11, 0.98, 0.01),
      ],
      radius: R,
      segments: 20,
    },
    // Left leg: angles outward into wide planted stance, slight knee bend
    {
      points: [
        new THREE.Vector3(0, 0.93, 0),
        new THREE.Vector3(-0.07, 0.67, 0.02),
        new THREE.Vector3(-0.13, 0.37, 0.03),
        new THREE.Vector3(-0.18, 0.06, 0.04),
      ],
      radius: R,
      segments: 18,
    },
    // Right leg: mirror
    {
      points: [
        new THREE.Vector3(0, 0.93, 0),
        new THREE.Vector3(0.07, 0.67, 0.02),
        new THREE.Vector3(0.13, 0.37, 0.03),
        new THREE.Vector3(0.18, 0.06, 0.04),
      ],
      radius: R,
      segments: 18,
    },
  ], [
    { center: new THREE.Vector3(0, 1.73, 0.01), radius: RH },
  ])

  const mat = useMemo(() => new THREE.MeshStandardMaterial({
    color: GOLD, emissive: GOLD, emissiveIntensity: 0.35,
    roughness: 0.5, metalness: 0.15,
  }), [])

  useFrame(({ clock }) => {
    if (!groupRef.current) return
    const t = clock.getElapsedTime()
    groupRef.current.position.y = Math.sin(t * 0.8) * 0.008
    groupRef.current.rotation.z = Math.sin(t * 0.5) * 0.012
    groupRef.current.rotation.y = Math.sin(t * 0.35) * 0.04
  })

  return (
    <group ref={groupRef}>
      <mesh geometry={bodyGeo} material={mat} />
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
  useEffect(() => { camera.lookAt(0, 0.97, 0) }, [camera])
  return null
}

export default function CharStickGold4() {
  return (
    <div style={{ width: '100%', height: '100%', background: BG }}>
      <Canvas
        style={{ width: '100%', height: '100%' }}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.1, preserveDrawingBuffer: true }}
        camera={{ position: [0, 0.97, 2.4], fov: 45, near: 0.1, far: 100 }}
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
