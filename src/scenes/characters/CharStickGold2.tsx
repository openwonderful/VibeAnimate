/**
 * CharStickGold — Smooth single-body golden stick figure
 *
 * Thick overlapping TubeGeometry along CatmullRomCurve3 paths.
 * All tubes share one material so overlapping areas look seamless —
 * creating a single continuous blobby body like a thick brush-drawn figure.
 *
 * Dynamic mid-stride pose, warm ground glow, floating gold particles.
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

/**
 * Creates a single merged BufferGeometry from tube curves + explicit spheres.
 * ONE geometry = no seam artifacts with a single material.
 */
function useSmoothBody(
  curves: { points: THREE.Vector3[]; radius: number; segments?: number }[],
  spheres: { center: THREE.Vector3; radius: number }[] = [],
) {
  return useMemo(() => {
    const geos: THREE.BufferGeometry[] = []
    const RADIAL = 16

    for (const { points, radius, segments = 20 } of curves) {
      const curve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.5)
      const tube = new THREE.TubeGeometry(curve, segments, radius, RADIAL, false)
      geos.push(tube)

      // Sphere caps at endpoints
      const ends = [points[0], points[points.length - 1]]
      for (const pt of ends) {
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

    const merged = mergeGeometries(geos)
    for (const g of geos) g.dispose()
    return merged
  }, [])
}

function mergeGeometries(geos: THREE.BufferGeometry[]): THREE.BufferGeometry {
  let totalVerts = 0
  let totalIdx = 0
  for (const g of geos) {
    totalVerts += g.attributes.position.count
    totalIdx += g.index ? g.index.count : 0
  }
  const pos = new Float32Array(totalVerts * 3)
  const norm = new Float32Array(totalVerts * 3)
  const idx = new Uint32Array(totalIdx)
  let vOff = 0
  let iOff = 0
  for (const g of geos) {
    const p = g.attributes.position
    const n = g.attributes.normal
    for (let i = 0; i < p.count * 3; i++) {
      pos[vOff * 3 + i] = (p.array as Float32Array)[i]
      if (n) norm[vOff * 3 + i] = (n.array as Float32Array)[i]
    }
    if (g.index) {
      for (let i = 0; i < g.index.count; i++) {
        idx[iOff + i] = g.index.array[i] + vOff
      }
      iOff += g.index.count
    }
    vOff += p.count
  }
  const merged = new THREE.BufferGeometry()
  merged.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  merged.setAttribute('normal', new THREE.BufferAttribute(norm, 3))
  merged.setIndex(new THREE.BufferAttribute(idx, 1))
  merged.computeVertexNormals()
  return merged
}

/* ── Floating gold particles ─────────────────────────────────── */
function GoldParticles() {
  const pointsRef = useRef<Points>(null)
  const COUNT = 35

  const { positions, speeds, phases } = useMemo(() => {
    const pos = new Float32Array(COUNT * 3)
    const spd = new Float32Array(COUNT)
    const ph = new Float32Array(COUNT)
    for (let i = 0; i < COUNT; i++) {
      // scatter around the figure in a cylinder: radius ~0.6–1.5, height 0–2
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
    color: GOLD_BRIGHT,
    size: 0.018,
    transparent: true,
    opacity: 0.7,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true,
  }), [])

  useFrame(({ clock }) => {
    if (!pointsRef.current) return
    const t = clock.getElapsedTime()
    const posAttr = pointsRef.current.geometry.attributes.position as THREE.BufferAttribute
    const arr = posAttr.array as Float32Array
    for (let i = 0; i < COUNT; i++) {
      // gentle upward float + horizontal drift
      arr[i * 3 + 1] = positions[i * 3 + 1] + Math.sin(t * speeds[i] + phases[i]) * 0.15
      arr[i * 3] = positions[i * 3] + Math.sin(t * 0.3 + phases[i]) * 0.06
      arr[i * 3 + 2] = positions[i * 3 + 2] + Math.cos(t * 0.25 + phases[i]) * 0.06
    }
    posAttr.needsUpdate = true
  })

  return <points ref={pointsRef} geometry={geo} material={mat} />
}

/* ── The figure ──────────────────────────────────────────────── */
function SmoothFigure() {
  const groupRef = useRef<Group>(null)

  // Classic stick figure proportions: small round head, uniform thin limbs, long legs
  const R = 0.035   // uniform limb/torso radius
  const RH = 0.09   // head radius (small circle)

  // Mid-stride dance pose with classic stick figure proportions
  // Total height ~1.8: legs ~0.9, torso ~0.55, head on top
  const bodyGeo = useSmoothBody([
    // Spine: hips → shoulders → neck (connects into head)
    {
      points: [
        new THREE.Vector3(0, 0.90, 0),
        new THREE.Vector3(0.01, 1.05, 0.02),
        new THREE.Vector3(0.01, 1.20, 0.03),
        new THREE.Vector3(0, 1.40, 0.01),
        new THREE.Vector3(0, 1.54, 0.01),
      ],
      radius: R,
      segments: 24,
    },
    // Left arm: raised upward (expressive)
    {
      points: [
        new THREE.Vector3(0, 1.38, 0.01),
        new THREE.Vector3(-0.15, 1.40, 0.04),
        new THREE.Vector3(-0.30, 1.50, 0.06),
        new THREE.Vector3(-0.40, 1.65, 0.03),
      ],
      radius: R,
      segments: 16,
    },
    // Right arm: swept back and down
    {
      points: [
        new THREE.Vector3(0, 1.38, 0.01),
        new THREE.Vector3(0.15, 1.32, -0.03),
        new THREE.Vector3(0.28, 1.18, -0.06),
        new THREE.Vector3(0.35, 1.02, -0.08),
      ],
      radius: R,
      segments: 16,
    },
    // Left leg: stepping forward (long, knee bent)
    {
      points: [
        new THREE.Vector3(0, 0.92, 0),
        new THREE.Vector3(-0.08, 0.68, 0.12),
        new THREE.Vector3(-0.14, 0.40, 0.18),
        new THREE.Vector3(-0.16, 0.06, 0.12),
      ],
      radius: R,
      segments: 18,
    },
    // Right leg: planted behind (long, straight)
    {
      points: [
        new THREE.Vector3(0, 0.92, 0),
        new THREE.Vector3(0.06, 0.65, -0.08),
        new THREE.Vector3(0.10, 0.35, -0.10),
        new THREE.Vector3(0.12, 0.06, -0.06),
      ],
      radius: R,
      segments: 18,
    },
  ], [
    // Head — small circle, classic stick figure
    { center: new THREE.Vector3(0, 1.54, 0.01), radius: RH },
  ])

  const mat = useMemo(() => new THREE.MeshStandardMaterial({
    color: GOLD,
    emissive: GOLD,
    emissiveIntensity: 0.35,
    roughness: 0.5,
    metalness: 0.15,
  }), [])

  useFrame(({ clock }) => {
    if (!groupRef.current) return
    const t = clock.getElapsedTime()
    // Subtle breathing / sway
    groupRef.current.position.y = Math.sin(t * 0.8) * 0.008
    groupRef.current.rotation.z = Math.sin(t * 0.5) * 0.012
    groupRef.current.rotation.y = Math.sin(t * 0.35) * 0.04
  })

  return (
    <group ref={groupRef}>
      <mesh geometry={bodyGeo} material={mat} />
      {/* Close-in gold rim light from below-front */}
      <pointLight position={[0, 0.2, 0.5]} color={GOLD} intensity={1.2} distance={3} decay={2} />
    </group>
  )
}

/* ── Ground glow (warm emissive disc) ────────────────────────── */
function GroundGlow() {
  const meshRef = useRef<THREE.Mesh>(null)

  useFrame(({ clock }) => {
    if (!meshRef.current) return
    const t = clock.getElapsedTime()
    // Subtle pulse
    const s = 1.0 + Math.sin(t * 0.6) * 0.04
    meshRef.current.scale.set(s, s, 1)
  })

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0.03]}>
      <circleGeometry args={[0.6, 48]} />
      <meshStandardMaterial
        color="#2A1A08"
        emissive="#D4A843"
        emissiveIntensity={0.35}
        transparent
        opacity={0.6}
        roughness={1}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}

function SceneSetup() {
  const { camera } = useThree()
  useEffect(() => { camera.lookAt(0, 0.9, 0) }, [camera])
  return null
}

export default function CharStickGold2() {
  return (
    <div style={{ width: '100%', height: '100%', background: BG }}>
      <Canvas
        style={{ width: '100%', height: '100%' }}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.1, preserveDrawingBuffer: true }}
        camera={{ position: [0, 0.9, 2.4], fov: 45, near: 0.1, far: 100 }}
      >
        <DebugCamera />
        <SceneSetup />
        <color attach="background" args={[BG]} />
        <fog attach="fog" args={[BG, 4, 15]} />

        {/* Warmer, more dramatic lighting */}
        <ambientLight color="#1E2030" intensity={0.35} />
        <directionalLight position={[-2, 3, 3]} color="#FDE8C8" intensity={1.0} castShadow />
        <pointLight position={[1.5, 2.5, 2]} color={GOLD_DIM} intensity={1.0} distance={8} decay={2} />
        <pointLight position={[-1, 0.5, 2]} color="#F5C060" intensity={0.4} distance={5} decay={2} />
        {/* Subtle warm backlight for rim effect */}
        <pointLight position={[0, 1.5, -2]} color="#D4A843" intensity={0.5} distance={6} decay={2} />

        <SmoothFigure />
        <GroundGlow />
        <GoldParticles />

        {/* Dark floor plane */}
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
