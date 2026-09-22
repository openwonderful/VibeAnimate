/**
 * Act 8-B — "Arirang" — AERIAL / BIRD'S-EYE VIEW
 *
 * Looking STRAIGHT DOWN from above. Rice paddies form a dark geometric grid.
 * Hundreds of warm dots fill the paddies — each one a person. A dirt road
 * cuts through the center. A small farmhouse glows at the heart of it all.
 * From above, the pattern of scattered warm light across a dark geometric
 * grid resembles bioluminescence, or stars reflected on dark water.
 * Yayoi Kusama meets Korean countryside.
 */

import { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { EffectComposer, Bloom, DepthOfField, Vignette } from '@react-three/postprocessing'
import * as THREE from 'three'
import { DebugCamera, useCameraHandoff } from '../DebugCamera'

// ── Seeded random ───────────────────────────────────────────────
function seededRandom(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 16807 + 0) % 2147483647
    return (s - 1) / 2147483646
  }
}

// ── Palette ─────────────────────────────────────────────────────
const WARM_DOTS_PALETTE = ['#E8C472', '#D4A843', '#C4913A', '#B8882E', '#8B6914']
const PADDY_DARK = '#030602'
const PADDY_ALT = '#050803'
const DIKE_COLOR = '#080C05'
const ROAD_BROWN = '#161008'
const BG_COLOR = '#020302'

// Grid
const PADDY_W = 7
const PADDY_H = 5
const DIKE_W = 0.35
const COLS = 12
const ROWS = 12
const ROAD_W = 1.8

// ── Warm dot data ───────────────────────────────────────────────
interface WarmDot {
  x: number
  z: number
  color: string
  baseIntensity: number
  pulseSpeed: number
  pulseOffset: number
  size: number
}

function generateDots(count: number, seed: number): WarmDot[] {
  const rand = seededRandom(seed)
  const dots: WarmDot[] = []

  // Cluster centers — organic groupings like people gathering
  const clusters: { cx: number; cz: number; radius: number }[] = []
  // Spread clusters evenly across both halves
  for (let i = 0; i < 16; i++) {
    clusters.push({
      cx: (rand() - 0.5) * 70,
      cz: (rand() - 0.5) * 50,
      radius: 2 + rand() * 6,
    })
  }
  // Add some clusters specifically in quadrants that might be sparse
  const quadrants = [[-1, -1], [-1, 1], [1, -1], [1, 1]]
  for (const [qx, qz] of quadrants) {
    for (let j = 0; j < 3; j++) {
      clusters.push({
        cx: qx * (5 + rand() * 28),
        cz: qz * (3 + rand() * 20),
        radius: 2 + rand() * 5,
      })
    }
  }

  for (let i = 0; i < count; i++) {
    let x: number, z: number

    if (rand() < 0.5) {
      const cluster = clusters[Math.floor(rand() * clusters.length)]
      const angle = rand() * Math.PI * 2
      const dist = rand() * cluster.radius
      x = cluster.cx + Math.cos(angle) * dist
      z = cluster.cz + Math.sin(angle) * dist
    } else {
      x = (rand() - 0.5) * 74
      z = (rand() - 0.5) * 52
    }

    // Avoid road
    if (Math.abs(x) < ROAD_W / 2 + 0.4) {
      x += x >= 0 ? ROAD_W / 2 + 0.6 : -(ROAD_W / 2 + 0.6)
    }
    // Avoid house
    if (Math.abs(x) < 3 && Math.abs(z) < 2.5) {
      x += x >= 0 ? 3.5 : -3.5
    }

    // Clamp to grid area
    x = Math.max(-38, Math.min(38, x))
    z = Math.max(-28, Math.min(28, z))

    dots.push({
      x,
      z,
      color: WARM_DOTS_PALETTE[Math.floor(rand() * WARM_DOTS_PALETTE.length)],
      baseIntensity: 0.5 + rand() * 0.5,
      pulseSpeed: 0.12 + rand() * 0.4,
      pulseOffset: rand() * Math.PI * 2,
      size: 0.15 + rand() * 0.22,
    })
  }

  return dots
}

// ── Paddy Grid ──────────────────────────────────────────────────
function PaddyGrid() {
  return (
    <group>
      {/* Base ground — very subtle dike color */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.2, 0]}>
        <planeGeometry args={[130, 100]} />
        <meshStandardMaterial color={DIKE_COLOR} roughness={0.9} metalness={0.0} side={THREE.DoubleSide} />
      </mesh>

      {/* Paddy cells — dark insets forming the grid pattern */}
      {Array.from({ length: COLS }, (_, c) =>
        Array.from({ length: ROWS }, (_, r) => {
          const cx = (c - COLS / 2 + 0.5) * (PADDY_W + DIKE_W)
          const cz = (r - ROWS / 2 + 0.5) * (PADDY_H + DIKE_W)
          if (Math.abs(cx) < ROAD_W + 0.5) return null
          const shade = ((c + r) % 3 === 0) ? PADDY_ALT : PADDY_DARK
          return (
            <mesh
              key={`p${c}-${r}`}
              rotation={[-Math.PI / 2, 0, 0]}
              position={[cx, -0.1, cz]}
            >
              <planeGeometry args={[PADDY_W, PADDY_H]} />
              <meshStandardMaterial color={shade} roughness={0.85} metalness={0.05} side={THREE.DoubleSide} />
            </mesh>
          )
        })
      )}
    </group>
  )
}

// ── Road ────────────────────────────────────────────────────────
function Road() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.08, 0]}>
      <planeGeometry args={[ROAD_W, 80]} />
      <meshStandardMaterial color={ROAD_BROWN} roughness={0.95} metalness={0.0} side={THREE.DoubleSide} />
    </mesh>
  )
}

// ── Farmhouse ───────────────────────────────────────────────────
function Farmhouse() {
  const innerRef = useRef<THREE.Mesh>(null)
  const outerRef = useRef<THREE.Mesh>(null)

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    if (innerRef.current) {
      (innerRef.current.material as THREE.MeshBasicMaterial).opacity =
        0.4 + Math.sin(t * 0.7) * 0.08
    }
    if (outerRef.current) {
      (outerRef.current.material as THREE.MeshBasicMaterial).opacity =
        0.08 + Math.sin(t * 0.5 + 1) * 0.02
    }
  })

  return (
    <group position={[0, 0, 0]}>
      {/* Very large soft outer glow — warm pool of light */}
      <mesh ref={outerRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.04, 0]}>
        <circleGeometry args={[10, 32]} />
        <meshBasicMaterial
          color="#8B6914"
          transparent
          opacity={0.08}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      {/* Medium glow ring */}
      <mesh ref={innerRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <circleGeometry args={[5, 24]} />
        <meshBasicMaterial
          color="#C4913A"
          transparent
          opacity={0.4}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      {/* Inner bright glow */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
        <circleGeometry args={[2.5, 16]} />
        <meshBasicMaterial
          color="#D4A843"
          transparent
          opacity={0.6}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      {/* House body */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <planeGeometry args={[2.6, 1.6]} />
        <meshStandardMaterial color="#3A2A10" roughness={0.8} metalness={0.0} side={THREE.DoubleSide} />
      </mesh>

      {/* Bright core — the warmth of home */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <planeGeometry args={[1.2, 0.7]} />
        <meshBasicMaterial
          color="#F5D888"
          transparent
          opacity={0.95}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  )
}

// ── Instanced warm dots (the people) — spheres ──────────────────
function WarmDotInstances({ dots }: { dots: WarmDot[] }) {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const colorsRef = useRef<Float32Array | null>(null)

  const baseColors = useMemo(() => {
    const arr = new Float32Array(dots.length * 3)
    const c = new THREE.Color()
    for (let i = 0; i < dots.length; i++) {
      c.set(dots[i].color)
      arr[i * 3] = c.r
      arr[i * 3 + 1] = c.g
      arr[i * 3 + 2] = c.b
    }
    return arr
  }, [dots])

  useMemo(() => {
    if (!meshRef.current) return
    const dummy = new THREE.Object3D()
    const color = new THREE.Color()

    for (let i = 0; i < dots.length; i++) {
      const d = dots[i]
      dummy.position.set(d.x, 0.25, d.z)
      dummy.scale.setScalar(d.size)
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(i, dummy.matrix)
      color.set(d.color)
      meshRef.current.setColorAt(i, color)
    }
    meshRef.current.instanceMatrix.needsUpdate = true
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true
  }, [dots])

  useFrame(({ clock }) => {
    if (!meshRef.current) return
    const t = clock.getElapsedTime()
    const dummy = new THREE.Object3D()
    const color = new THREE.Color()

    if (!colorsRef.current) {
      colorsRef.current = new Float32Array(baseColors)
      meshRef.current.instanceColor = new THREE.InstancedBufferAttribute(
        colorsRef.current, 3
      )
    }

    for (let i = 0; i < dots.length; i++) {
      const d = dots[i]
      const pulse = d.baseIntensity *
        (0.45 + 0.55 * Math.sin(t * d.pulseSpeed + d.pulseOffset))
      const scaledSize = d.size * (0.6 + 0.6 * pulse)

      dummy.position.set(d.x, 0.25, d.z)
      dummy.scale.setScalar(scaledSize)
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(i, dummy.matrix)

      const brightness = pulse * 1.5
      color.setRGB(
        baseColors[i * 3] * brightness,
        baseColors[i * 3 + 1] * brightness,
        baseColors[i * 3 + 2] * brightness,
      )
      colorsRef.current[i * 3] = color.r
      colorsRef.current[i * 3 + 1] = color.g
      colorsRef.current[i * 3 + 2] = color.b
    }

    meshRef.current.instanceMatrix.needsUpdate = true
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true
  })

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, dots.length]}
      frustumCulled={false}
    >
      <sphereGeometry args={[1, 8, 6]} />
      <meshBasicMaterial color="#ffffff" toneMapped={false} />
    </instancedMesh>
  )
}

// ── Inner glow halos — warm haze around each person ─────────────
function DotGlows({ dots }: { dots: WarmDot[] }) {
  const meshRef = useRef<THREE.InstancedMesh>(null)

  useMemo(() => {
    if (!meshRef.current) return
    const dummy = new THREE.Object3D()
    const color = new THREE.Color()

    for (let i = 0; i < dots.length; i++) {
      const d = dots[i]
      dummy.position.set(d.x, 0.06, d.z)
      dummy.rotation.set(-Math.PI / 2, 0, 0)
      dummy.scale.setScalar(d.size * 7)
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(i, dummy.matrix)
      color.set(d.color)
      meshRef.current.setColorAt(i, color)
    }
    meshRef.current.instanceMatrix.needsUpdate = true
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true
  }, [dots])

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, dots.length]}
      frustumCulled={false}
    >
      <circleGeometry args={[1, 12]} />
      <meshBasicMaterial
        color="#D4A843"
        transparent
        opacity={0.35}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        side={THREE.DoubleSide}
        toneMapped={false}
      />
    </instancedMesh>
  )
}

// ── Outer bloom glow — bioluminescence bloom ────────────────────
function DotOuterGlow({ dots }: { dots: WarmDot[] }) {
  const meshRef = useRef<THREE.InstancedMesh>(null)

  useMemo(() => {
    if (!meshRef.current) return
    const dummy = new THREE.Object3D()
    const color = new THREE.Color()

    for (let i = 0; i < dots.length; i++) {
      const d = dots[i]
      dummy.position.set(d.x, 0.03, d.z)
      dummy.rotation.set(-Math.PI / 2, 0, 0)
      dummy.scale.setScalar(d.size * 18)
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(i, dummy.matrix)
      color.set(d.color)
      meshRef.current.setColorAt(i, color)
    }
    meshRef.current.instanceMatrix.needsUpdate = true
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true
  }, [dots])

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, dots.length]}
      frustumCulled={false}
    >
      <circleGeometry args={[1, 8]} />
      <meshBasicMaterial
        color="#C4913A"
        transparent
        opacity={0.08}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        side={THREE.DoubleSide}
        toneMapped={false}
      />
    </instancedMesh>
  )
}

// ── Gentle camera breathing ─────────────────────────────────────
function CameraBreathing() {
  const yieldCamera = useCameraHandoff()
  useFrame(({ camera, clock }) => {
    if (yieldCamera()) return
    const t = clock.getElapsedTime()
    camera.position.x = Math.sin(t * 0.04) * 0.4
    camera.position.z = Math.cos(t * 0.06) * 0.3
    camera.position.y = 42 + Math.sin(t * 0.08) * 0.15
    camera.lookAt(0, 0, 0)
  })
  return null
}

// ── Scene composition ───────────────────────────────────────────
function ArirangAerialScene() {
  const dots = useMemo(() => generateDots(350, 42), [])

  return (
    <>
      <CameraBreathing />

      {/* Lighting */}
      <ambientLight intensity={0.15} color="#3A4A6A" />
      <directionalLight
        position={[10, 40, -8]}
        intensity={0.3}
        color="#8899BB"
        castShadow={false}
      />

      <PaddyGrid />
      <Road />
      <Farmhouse />

      <DotOuterGlow dots={dots} />
      <DotGlows dots={dots} />
      <WarmDotInstances dots={dots} />
    </>
  )
}

// ── Exported Component ──────────────────────────────────────────
export default function Act8_B() {
  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        background: BG_COLOR,
        overflow: 'hidden',
      }}
    >
      <Canvas
        style={{ width: '100%', height: '100%' }}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.0,
        }}
        camera={{
          position: [0, 42, 0.01],
          fov: 55,
          near: 0.1,
          far: 150,
        }}
        onCreated={({ camera }) => {
          camera.lookAt(0, 0, 0)
        }}
      >
        <DebugCamera />
        <fog attach="fog" args={[BG_COLOR, 28, 70]} />
        <ArirangAerialScene />
        <EffectComposer>
          <Bloom intensity={0.8} luminanceThreshold={0.3} luminanceSmoothing={0.9} mipmapBlur />
          <DepthOfField focusDistance={0.04} focalLength={0.06} bokehScale={2} />
          <Vignette eskil={false} offset={0.15} darkness={0.6} />
        </EffectComposer>
      </Canvas>
    </div>
  )
}
