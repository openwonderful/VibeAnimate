/**
 * Act 8 — "Arirang" — The Tattoo Frame
 *
 * Option A: GROUND LEVEL, THROUGH THE CROWD
 *
 * Night. The camera sits at ground level among hundreds of warm-toned
 * stick-figure silhouettes filling rice paddies, a dirt road, and hillsides.
 * They sway together to the Arirang folk song. Close figures are large
 * and slightly soft; distant ones are tiny warm dots. A small farmhouse
 * glows at center with its door open. Mountains silhouette against the
 * moonlit sky. Fireflies drift among the crowd. This is the image
 * people will remember forever.
 */

import { useRef, useMemo, useCallback } from 'react'
import { useFrame } from '@react-three/fiber'
import { EffectComposer, Bloom, DepthOfField, Vignette } from '@react-three/postprocessing'
import * as THREE from 'three'
import { useCameraHandoff } from '../DebugCamera'
import { SceneCanvas } from '../SceneCanvas'

// ── Seeded random (deterministic layouts) ────────────────────────
function seededRandom(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 16807 + 0) % 2147483647
    return (s - 1) / 2147483646
  }
}

// ── Color palette ────────────────────────────────────────────────
const GOLD_BRIGHT = '#E8C472'
const GOLD_PRIMARY = '#D4A843'
const GOLD_AMBER = '#C4913A'
const GOLD_DEEP = '#8B6914'
const NIGHT_SKY = '#040810'
const PADDY_DARK = '#0C1208'
const ROAD_DARK = '#1A1510'
const HOUSE_WALL = '#2A2018'
const HOUSE_GLOW = '#F5C36C'
const MOON_COLOR = '#E8DCC8'
const FIREFLY_GREEN = '#C8E880'
const GOLD_WARM = '#DAB050'
const WARM_FIGURE_COLORS = [GOLD_BRIGHT, GOLD_PRIMARY, GOLD_AMBER, GOLD_WARM, GOLD_DEEP, GOLD_PRIMARY, GOLD_AMBER]

// ── Figure type archetypes ──────────────────────────────────────
type FigureArchetype =
  | 'tall'
  | 'short'
  | 'hunched'
  | 'child'
  | 'carrying'
  | 'wide'
  | 'thin'

interface CrowdFigure {
  x: number
  y: number
  z: number
  scale: number
  color: string
  archetype: FigureArchetype
  swayOffset: number
  swaySpeed: number
  swayAmount: number
}

// ── Generate crowd placement ─────────────────────────────────────
function generateCrowd(count: number, seed: number): CrowdFigure[] {
  const rand = seededRandom(seed)
  const figures: CrowdFigure[] = []
  const archetypes: FigureArchetype[] = [
    'tall', 'tall', 'short', 'short', 'hunched',
    'child', 'carrying', 'wide', 'thin', 'tall',
    'short', 'hunched', 'thin', 'carrying', 'tall',
  ]

  for (let i = 0; i < count; i++) {
    // Distribute across a wide landscape
    // z: from close (z=0) to far (z=-55), with most in the mid-range
    const zRaw = rand()
    // Distribution: camera at z=4, figures from z=-3 to z=-56
    // Push close figures slightly further to not block view
    const z = -(3 + zRaw * 53) // z from -3 to -56
    const xSpread = 3 + Math.abs(z) * 0.6 // wider spread at distance
    let x = (rand() - 0.5) * xSpread * 2
    // Keep a corridor clear toward the house (center path)
    // Wider corridor for figures closer to house, narrower near camera
    const corridorDist = Math.abs(z)
    const corridorWidth = corridorDist < 15 ? 1.5 : corridorDist < 25 ? 2.0 : 2.5
    if (Math.abs(x) < corridorWidth && z < -5 && z > -32) {
      x = x > 0 ? x + corridorWidth + 0.5 : x - corridorWidth - 0.5
    }

    // Ground height varies: slight undulation for rice paddies
    const groundY = Math.sin(x * 0.3) * 0.08 + Math.sin(z * 0.15) * 0.12
    // Hillside figures are higher
    const hillFactor = Math.max(0, (Math.abs(x) - 8) * 0.15)

    const archetype = archetypes[Math.floor(rand() * archetypes.length)]
    const baseScale = archetype === 'child' ? 0.3 + rand() * 0.15
      : archetype === 'hunched' ? 0.55 + rand() * 0.15
      : archetype === 'short' ? 0.5 + rand() * 0.15
      : archetype === 'carrying' ? 0.7 + rand() * 0.15
      : archetype === 'wide' ? 0.6 + rand() * 0.1
      : archetype === 'thin' ? 0.65 + rand() * 0.15
      : 0.6 + rand() * 0.2 // tall

    figures.push({
      x,
      y: groundY + hillFactor,
      z,
      scale: baseScale,
      color: WARM_FIGURE_COLORS[Math.floor(rand() * WARM_FIGURE_COLORS.length)],
      archetype,
      swayOffset: rand() * Math.PI * 2,
      swaySpeed: 0.4 + rand() * 0.3, // slow, communal sway
      swayAmount: 0.03 + rand() * 0.04,
    })
  }

  return figures
}

// ── Instanced crowd (the hundreds of warm dots/silhouettes) ──────
function SwayingCrowd({ figures }: { figures: CrowdFigure[] }) {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const dummy = useMemo(() => new THREE.Object3D(), [])

  // Per-instance colors — dim distant figures for depth
  const colors = useMemo(() => {
    const arr = new Float32Array(figures.length * 3)
    const c = new THREE.Color()
    for (let i = 0; i < figures.length; i++) {
      c.set(figures[i].color)
      // Depth-based dimming: closer = brighter, far = dimmer
      const dist = Math.abs(figures[i].z)
      const brightness = dist < 10 ? 1.0 : dist < 25 ? 0.85 : dist < 40 ? 0.65 : 0.45
      arr[i * 3] = c.r * brightness
      arr[i * 3 + 1] = c.g * brightness
      arr[i * 3 + 2] = c.b * brightness
    }
    return arr
  }, [figures])

  // Shape geometry heights per archetype (for the capsule)
  const getHeight = useCallback((a: FigureArchetype) => {
    switch (a) {
      case 'child': return 0.25
      case 'hunched': return 0.35
      case 'short': return 0.38
      case 'wide': return 0.4
      case 'thin': return 0.5
      case 'carrying': return 0.6
      case 'tall': default: return 0.55
    }
  }, [])

  const getWidth = useCallback((a: FigureArchetype) => {
    switch (a) {
      case 'child': return 0.12
      case 'thin': return 0.1
      case 'wide': return 0.18
      case 'carrying': return 0.16
      default: return 0.14
    }
  }, [])

  useFrame(({ clock }) => {
    if (!meshRef.current) return
    const t = clock.getElapsedTime()

    for (let i = 0; i < figures.length; i++) {
      const f = figures[i]
      const sway = Math.sin(t * f.swaySpeed + f.swayOffset) * f.swayAmount
      const h = getHeight(f.archetype)

      const bodyH = h * f.scale * 3 // human-sized ~0.8-1.5 units tall
      dummy.position.set(
        f.x + sway,
        f.y + bodyH * 0.5,
        f.z,
      )
      // Slight tilt with sway for organic feel
      dummy.rotation.set(0, 0, sway * 1.5)
      dummy.scale.set(
        getWidth(f.archetype) * f.scale * 3,
        bodyH,
        getWidth(f.archetype) * f.scale * 3,
      )
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(i, dummy.matrix)
    }
    meshRef.current.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, figures.length]}
      frustumCulled={false}
    >
      <capsuleGeometry args={[0.5, 1, 4, 8]} />
      <meshStandardMaterial
        vertexColors
        roughness={0.5}
        metalness={0.0}
        emissiveIntensity={1.2}
        emissive="#D4A843"
        toneMapped={false}
      />
      <instancedBufferAttribute
        attach="geometry-attributes-color"
        args={[colors, 3]}
      />
    </instancedMesh>
  )
}

// ── Heads for close figures (adds human readability) ─────────────
function CrowdHeads({ figures }: { figures: CrowdFigure[] }) {
  // Only render heads for figures close enough to see detail (z > -15)
  const closeFigures = useMemo(
    () => figures.filter(f => f.z > -20 && f.z < 5),
    [figures],
  )

  const meshRef = useRef<THREE.InstancedMesh>(null)
  const dummy = useMemo(() => new THREE.Object3D(), [])

  const colors = useMemo(() => {
    const arr = new Float32Array(closeFigures.length * 3)
    const c = new THREE.Color()
    for (let i = 0; i < closeFigures.length; i++) {
      c.set(closeFigures[i].color)
      const dist = Math.abs(closeFigures[i].z)
      const brightness = dist < 10 ? 1.0 : 0.8
      arr[i * 3] = c.r * brightness
      arr[i * 3 + 1] = c.g * brightness
      arr[i * 3 + 2] = c.b * brightness
    }
    return arr
  }, [closeFigures])

  const getHeight = useCallback((a: FigureArchetype) => {
    switch (a) {
      case 'child': return 0.25
      case 'hunched': return 0.35
      case 'short': return 0.38
      case 'wide': return 0.4
      case 'thin': return 0.5
      case 'carrying': return 0.6
      case 'tall': default: return 0.55
    }
  }, [])

  useFrame(({ clock }) => {
    if (!meshRef.current) return
    const t = clock.getElapsedTime()

    for (let i = 0; i < closeFigures.length; i++) {
      const f = closeFigures[i]
      const sway = Math.sin(t * f.swaySpeed + f.swayOffset) * f.swayAmount
      const h = getHeight(f.archetype)
      const bodyH = h * f.scale * 3
      // Head sits just above the body top: position.y + bodyH*1.5 (capsule top)
      const headY = f.y + bodyH * 1.55

      dummy.position.set(f.x + sway, headY, f.z)
      dummy.rotation.set(0, 0, sway * 0.8)
      const headSize = f.archetype === 'child' ? f.scale * 0.15 : f.scale * 0.12
      dummy.scale.set(headSize, headSize, headSize)
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(i, dummy.matrix)
    }
    meshRef.current.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, closeFigures.length]}
      frustumCulled={false}
    >
      <sphereGeometry args={[1, 8, 6]} />
      <meshStandardMaterial
        vertexColors
        roughness={0.5}
        emissive="#D4A843"
        emissiveIntensity={1.2}
        toneMapped={false}
      />
      <instancedBufferAttribute
        attach="geometry-attributes-color"
        args={[colors, 3]}
      />
    </instancedMesh>
  )
}

// ── Warm glow halos around each figure ──────────────────────────
function FigureGlows({ figures }: { figures: CrowdFigure[] }) {
  const ref = useRef<THREE.Points>(null)

  const { positions, glowColors, sizes } = useMemo(() => {
    const positions = new Float32Array(figures.length * 3)
    const glowColors = new Float32Array(figures.length * 3)
    const sizes = new Float32Array(figures.length)
    const c = new THREE.Color()

    for (let i = 0; i < figures.length; i++) {
      const f = figures[i]
      positions[i * 3] = f.x
      positions[i * 3 + 1] = f.y + f.scale * 0.8
      positions[i * 3 + 2] = f.z

      c.set(f.color)
      glowColors[i * 3] = c.r
      glowColors[i * 3 + 1] = c.g
      glowColors[i * 3 + 2] = c.b

      // Closer = bigger glow, far = tiny but still visible
      const dist = Math.abs(f.z)
      sizes[i] = dist < 5 ? 1.5 : dist < 15 ? 1.0 : dist < 30 ? 0.6 : 0.35
    }
    return { positions, glowColors, sizes }
  }, [figures])

  useFrame(({ clock }) => {
    if (!ref.current) return
    const pos = ref.current.geometry.attributes.position as THREE.BufferAttribute
    const arr = pos.array as Float32Array
    const t = clock.getElapsedTime()

    for (let i = 0; i < figures.length; i++) {
      const f = figures[i]
      const sway = Math.sin(t * f.swaySpeed + f.swayOffset) * f.swayAmount
      arr[i * 3] = f.x + sway
      arr[i * 3 + 1] = f.y + f.scale * 0.8
    }
    pos.needsUpdate = true
  })

  return (
    <points ref={ref} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
        <bufferAttribute
          attach="attributes-color"
          args={[glowColors, 3]}
        />
        <bufferAttribute
          attach="attributes-size"
          args={[sizes, 1]}
        />
      </bufferGeometry>
      <pointsMaterial
        vertexColors
        size={0.8}
        transparent
        opacity={0.4}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        sizeAttenuation
      />
    </points>
  )
}

// ── Fireflies ────────────────────────────────────────────────────
function Fireflies({ count = 120 }: { count?: number }) {
  const ref = useRef<THREE.Points>(null)

  const { positions, velocities, phases } = useMemo(() => {
    const rand = seededRandom(7777)
    const positions = new Float32Array(count * 3)
    const velocities = new Float32Array(count * 3)
    const phases = new Float32Array(count)

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (rand() - 0.5) * 40
      positions[i * 3 + 1] = 0.3 + rand() * 3.5
      positions[i * 3 + 2] = -rand() * 60
      velocities[i * 3] = (rand() - 0.5) * 0.008
      velocities[i * 3 + 1] = (rand() - 0.5) * 0.004
      velocities[i * 3 + 2] = (rand() - 0.5) * 0.005
      phases[i] = rand() * Math.PI * 2
    }
    return { positions, velocities, phases }
  }, [count])

  useFrame(({ clock }) => {
    if (!ref.current) return
    const pos = ref.current.geometry.attributes.position as THREE.BufferAttribute
    const arr = pos.array as Float32Array
    const t = clock.getElapsedTime()

    for (let i = 0; i < count; i++) {
      arr[i * 3] += velocities[i * 3] + Math.sin(t * 0.5 + phases[i]) * 0.003
      arr[i * 3 + 1] += velocities[i * 3 + 1] + Math.cos(t * 0.3 + phases[i]) * 0.002
      arr[i * 3 + 2] += velocities[i * 3 + 2]

      // Keep them in bounds
      if (arr[i * 3 + 1] < 0.2) arr[i * 3 + 1] = 0.2
      if (arr[i * 3 + 1] > 5) arr[i * 3 + 1] = 5
    }
    pos.needsUpdate = true

    // Pulsing opacity
    const mat = ref.current.material as THREE.PointsMaterial
    mat.opacity = 0.3 + Math.sin(t * 0.8) * 0.15
  })

  return (
    <points ref={ref} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        color={FIREFLY_GREEN}
        size={0.25}
        transparent
        opacity={0.6}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        sizeAttenuation
      />
    </points>
  )
}

// ── Warm firefly-like sparkles mixed in with figures ─────────────
function WarmSparkles({ count = 80 }: { count?: number }) {
  const ref = useRef<THREE.Points>(null)

  const positions = useMemo(() => {
    const rand = seededRandom(3456)
    const arr = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (rand() - 0.5) * 30
      arr[i * 3 + 1] = 0.5 + rand() * 4
      arr[i * 3 + 2] = -rand() * 50
    }
    return arr
  }, [count])

  useFrame(({ clock }) => {
    if (!ref.current) return
    const mat = ref.current.material as THREE.PointsMaterial
    mat.opacity = 0.2 + Math.sin(clock.getElapsedTime() * 1.2 + 1.5) * 0.1
  })

  return (
    <points ref={ref} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        color={GOLD_PRIMARY}
        size={0.15}
        transparent
        opacity={0.4}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        sizeAttenuation
      />
    </points>
  )
}

// ── Mountains (layered silhouettes on horizon) ───────────────────
function Mountains() {
  // Generate mountain ridge shapes using vertices
  const createMountainShape = useCallback(
    (
      peaks: Array<{ x: number; h: number; w: number }>,
      baseY: number,
      segments: number,
    ) => {
      const points: THREE.Vector2[] = []
      const width = 120
      points.push(new THREE.Vector2(-width / 2, baseY))

      for (let i = 0; i <= segments; i++) {
        const t = i / segments
        const x = -width / 2 + t * width
        let h = baseY
        for (const peak of peaks) {
          const dist = (x - peak.x) / peak.w
          h += peak.h * Math.exp(-dist * dist * 2)
        }
        // Add fractal noise
        h += Math.sin(x * 0.5) * 0.3 + Math.sin(x * 1.3) * 0.15
        points.push(new THREE.Vector2(x, h))
      }

      points.push(new THREE.Vector2(width / 2, baseY))
      return new THREE.ShapeGeometry(new THREE.Shape(points))
    },
    [],
  )

  // Far mountains — tall, dark
  const farGeo = useMemo(
    () =>
      createMountainShape(
        [
          { x: -30, h: 12, w: 18 },
          { x: -10, h: 16, w: 14 },
          { x: 8, h: 18, w: 16 },
          { x: 25, h: 14, w: 12 },
          { x: 40, h: 10, w: 15 },
        ],
        0,
        200,
      ),
    [createMountainShape],
  )

  // Mid mountains — closer, slightly lighter
  const midGeo = useMemo(
    () =>
      createMountainShape(
        [
          { x: -25, h: 8, w: 12 },
          { x: -8, h: 11, w: 10 },
          { x: 12, h: 9, w: 14 },
          { x: 30, h: 7, w: 10 },
        ],
        0,
        200,
      ),
    [createMountainShape],
  )

  // Near hills — low, very close
  const nearGeo = useMemo(
    () =>
      createMountainShape(
        [
          { x: -20, h: 4, w: 15 },
          { x: -5, h: 3, w: 10 },
          { x: 15, h: 5, w: 18 },
          { x: 35, h: 3, w: 12 },
        ],
        0,
        200,
      ),
    [createMountainShape],
  )

  return (
    <group position={[0, -1, -70]}>
      {/* Far range — lightest, visible against sky */}
      <mesh geometry={farGeo} position={[0, 0, -10]}>
        <meshStandardMaterial color="#1A2538" emissive="#0E1828" emissiveIntensity={0.5} side={THREE.DoubleSide} roughness={0.95} metalness={0} />
      </mesh>
      {/* Mid range */}
      <mesh geometry={midGeo} position={[0, 0, -5]}>
        <meshStandardMaterial color="#1E2838" emissive="#101C28" emissiveIntensity={0.4} side={THREE.DoubleSide} roughness={0.9} metalness={0} />
      </mesh>
      {/* Near hills — darkest */}
      <mesh geometry={nearGeo} position={[0, 0, 0]}>
        <meshStandardMaterial color="#1A2230" emissive="#0C1620" emissiveIntensity={0.3} side={THREE.DoubleSide} roughness={0.85} metalness={0} />
      </mesh>
    </group>
  )
}

// ── Moon ─────────────────────────────────────────────────────────
function Moon() {
  const glowRef = useRef<THREE.Mesh>(null)

  useFrame(({ clock }) => {
    if (!glowRef.current) return
    const t = clock.getElapsedTime()
    const mat = glowRef.current.material as THREE.MeshBasicMaterial
    mat.opacity = 0.2 + Math.sin(t * 0.3) * 0.05
  })

  return (
    <group position={[8, 18, -80]}>
      {/* Moon disc */}
      <mesh>
        <sphereGeometry args={[3.5, 32, 32]} />
        <meshStandardMaterial
          color={MOON_COLOR}
          emissive="#F0E8D8"
          emissiveIntensity={4.0}
          roughness={0.8}
          metalness={0}
          toneMapped={false}
        />
      </mesh>
      {/* Inner glow */}
      <mesh>
        <sphereGeometry args={[5, 32, 32]} />
        <meshBasicMaterial
          color="#E8D8B0"
          transparent
          opacity={0.35}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      {/* Outer atmospheric glow */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[9, 32, 32]} />
        <meshBasicMaterial
          color="#D4C8A0"
          transparent
          opacity={0.2}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      {/* Very wide haze ring */}
      <mesh>
        <sphereGeometry args={[15, 32, 32]} />
        <meshBasicMaterial
          color="#C4B890"
          transparent
          opacity={0.08}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  )
}

// ── Stars ─────────────────────────────────────────────────────────
function Stars({ count = 300 }: { count?: number }) {
  const ref = useRef<THREE.Points>(null)

  const { positions } = useMemo(() => {
    const rand = seededRandom(9999)
    const positions = new Float32Array(count * 3)
    const sizes = new Float32Array(count)

    for (let i = 0; i < count; i++) {
      // Hemisphere of stars
      const theta = rand() * Math.PI * 2
      const phi = rand() * Math.PI * 0.45 // upper hemisphere only
      const r = 80 + rand() * 20
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = r * Math.cos(phi) + 5
      positions[i * 3 + 2] = -r * Math.sin(phi) * Math.sin(theta)
      sizes[i] = 0.1 + rand() * 0.2
    }
    return { positions, sizes }
  }, [count])

  useFrame(({ clock }) => {
    if (!ref.current) return
    const mat = ref.current.material as THREE.PointsMaterial
    mat.opacity = 0.5 + Math.sin(clock.getElapsedTime() * 0.4) * 0.1
  })

  return (
    <points ref={ref} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        color="#F8F0E0"
        size={0.25}
        transparent
        opacity={0.8}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  )
}

// ── Farmhouse (small, warm, door open) ──────────────────────────
function Farmhouse() {
  const doorLightRef = useRef<THREE.PointLight>(null)

  useFrame(({ clock }) => {
    if (!doorLightRef.current) return
    const t = clock.getElapsedTime()
    // Warm flickering hearth
    doorLightRef.current.intensity =
      8.0 + Math.sin(t * 3.7) * 0.8 + Math.sin(t * 7.1) * 0.4
  })

  const wallH = 1.6
  const wallW = 2.8
  const wallD = 2.2
  const roofOverhang = 0.5

  return (
    <group position={[0, 0, -28]}>
      {/* Walls */}
      <mesh position={[0, wallH / 2, 0]}>
        <boxGeometry args={[wallW, wallH, wallD]} />
        <meshStandardMaterial
          color={HOUSE_WALL}
          emissive={HOUSE_GLOW}
          emissiveIntensity={0.5}
          roughness={0.9}
          toneMapped={false}
        />
      </mesh>

      {/* Roof — traditional Korean style */}
      <mesh position={[0, wallH + 0.3, 0]} rotation={[0, 0, 0]}>
        <boxGeometry args={[wallW + roofOverhang * 2, 0.15, wallD + roofOverhang * 2]} />
        <meshStandardMaterial color="#1A1410" roughness={1} />
      </mesh>
      {/* Roof ridge */}
      <mesh position={[0, wallH + 0.6, 0]} rotation={[0, 0, Math.PI / 4]}>
        <boxGeometry args={[1.2, 0.12, wallD + roofOverhang]} />
        <meshStandardMaterial color="#1A1410" roughness={1} />
      </mesh>

      {/* Door opening — warm rectangle of light */}
      <mesh position={[0, 0.55, wallD / 2 + 0.01]}>
        <planeGeometry args={[0.8, 1.1]} />
        <meshStandardMaterial
          color={HOUSE_GLOW}
          emissive={HOUSE_GLOW}
          emissiveIntensity={5.0}
          roughness={1}
          toneMapped={false}
        />
      </mesh>

      {/* Warm light spilling out from door */}
      <pointLight
        ref={doorLightRef}
        position={[0, 0.8, wallD / 2 + 0.5]}
        color={HOUSE_GLOW}
        intensity={8}
        distance={25}
        decay={1.5}
      />

      {/* Secondary interior glow visible through door */}
      <pointLight
        position={[0, 0.8, 0]}
        color="#E8A830"
        intensity={4}
        distance={10}
        decay={1.5}
      />

      {/* Light cone on ground in front of house */}
      <mesh position={[0, 0.02, wallD / 2 + 4]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[6, 10]} />
        <meshBasicMaterial
          color={HOUSE_GLOW}
          transparent
          opacity={0.12}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Window glows on the sides */}
      <mesh position={[-0.8, 0.9, wallD / 2 + 0.01]}>
        <planeGeometry args={[0.5, 0.4]} />
        <meshStandardMaterial
          color={HOUSE_GLOW}
          emissive={HOUSE_GLOW}
          emissiveIntensity={4.0}
          transparent
          opacity={0.8}
          roughness={1}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[0.8, 0.9, wallD / 2 + 0.01]}>
        <planeGeometry args={[0.5, 0.4]} />
        <meshStandardMaterial
          color={HOUSE_GLOW}
          emissive={HOUSE_GLOW}
          emissiveIntensity={4.0}
          transparent
          opacity={0.8}
          roughness={1}
          toneMapped={false}
        />
      </mesh>

      {/* Large warm atmospheric glow around the house — visible from far */}
      <mesh position={[0, 1.5, 0]}>
        <sphereGeometry args={[5, 16, 16]} />
        <meshBasicMaterial
          color="#F5C36C"
          transparent
          opacity={0.06}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      {/* Even larger faint haze */}
      <mesh position={[0, 2, 1]}>
        <sphereGeometry args={[10, 16, 16]} />
        <meshBasicMaterial
          color="#C48830"
          transparent
          opacity={0.025}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  )
}

// ── Ground plane (rice paddies, road, earth) ─────────────────────
function Ground() {
  return (
    <group>
      {/* Main ground */}
      <mesh position={[0, -0.05, -20]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[120, 100]} />
        <meshStandardMaterial color="#0E1210" emissive="#060A08" emissiveIntensity={0.15} roughness={1} />
      </mesh>

      {/* Rice paddy water reflections — faint mirror patches */}
      {[
        { x: -6, z: -12, w: 8, d: 5 },
        { x: 5, z: -18, w: 6, d: 4 },
        { x: -3, z: -35, w: 10, d: 6 },
        { x: 8, z: -40, w: 7, d: 5 },
        { x: -10, z: -25, w: 5, d: 4 },
        { x: 12, z: -30, w: 6, d: 5 },
      ].map((p, i) => (
        <mesh
          key={`paddy-${i}`}
          position={[p.x, 0.01, p.z]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[p.w, p.d]} />
          <meshStandardMaterial
            color={PADDY_DARK}
            roughness={0.3}
            metalness={0.4}
            emissive="#1A2A18"
            emissiveIntensity={0.15}
          />
        </mesh>
      ))}

      {/* Dirt road — leads toward the house */}
      <mesh position={[0, 0.02, -14]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[3, 40]} />
        <meshStandardMaterial color={ROAD_DARK} emissive="#0A0804" emissiveIntensity={0.2} roughness={0.9} />
      </mesh>
    </group>
  )
}

// ── Ambient moonlight and atmosphere ─────────────────────────────
function Lighting() {
  return (
    <>
      {/* Moonlight — cool blue from above-right */}
      <directionalLight
        position={[10, 30, -50]}
        color="#8090C0"
        intensity={0.3}
      />
      {/* Faint warm ambient from all the figure-light */}
      <ambientLight color="#201810" intensity={0.4} />
      {/* Very subtle ground bounce */}
      <hemisphereLight
        color="#182030"
        groundColor="#0A0804"
        intensity={0.25}
      />
    </>
  )
}

// ── Sky gradient (night with faint horizon glow) ─────────────────
function NightSky() {
  return (
    <>
      {/* Sky dome — very dark, extends well beyond viewport */}
      <mesh position={[0, 20, -90]}>
        <planeGeometry args={[300, 200]} />
        <meshBasicMaterial color="#060C18" />
      </mesh>
      {/* Horizon glow — visible warm-blue band */}
      <mesh position={[0, 3, -89]}>
        <planeGeometry args={[250, 18]} />
        <meshBasicMaterial
          color="#0E1A30"
          transparent
          opacity={0.8}
        />
      </mesh>
      {/* Warm glow where the house light meets the sky */}
      <mesh position={[0, 5, -80]}>
        <planeGeometry args={[20, 10]} />
        <meshBasicMaterial
          color="#1A1508"
          transparent
          opacity={0.3}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </>
  )
}

// ── Depth-of-field foreground blur (close figures = soft silhouettes) ──
function ForegroundFigures() {
  // A few very close, large, blurred warm shapes to create depth
  const rand = useMemo(() => seededRandom(1234), [])

  const figures = useMemo(() => {
    const arr: Array<{ x: number; y: number; z: number; scale: number; color: string }> = []
    for (let i = 0; i < 8; i++) {
      // Push to the sides so they frame the view, not block it
      const side = rand() > 0.5 ? 1 : -1
      arr.push({
        x: side * (2.5 + rand() * 3),
        y: rand() * 0.8,
        z: 2 + rand() * 2,
        scale: 0.3 + rand() * 0.4,
        color: WARM_FIGURE_COLORS[Math.floor(rand() * WARM_FIGURE_COLORS.length)],
      })
    }
    return arr
  }, [rand])

  const meshRef = useRef<THREE.InstancedMesh>(null)
  const dummy = useMemo(() => new THREE.Object3D(), [])

  useFrame(({ clock }) => {
    if (!meshRef.current) return
    const t = clock.getElapsedTime()

    for (let i = 0; i < figures.length; i++) {
      const f = figures[i]
      const sway = Math.sin(t * 0.45 + i * 1.7) * 0.06
      dummy.position.set(f.x + sway, f.y + f.scale * 0.5, f.z)
      dummy.rotation.set(0, 0, sway * 1.2)
      dummy.scale.set(f.scale * 0.15, f.scale * 0.8, f.scale * 0.15)
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(i, dummy.matrix)
    }
    meshRef.current.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, figures.length]}
      frustumCulled={false}
    >
      <capsuleGeometry args={[0.5, 1, 4, 8]} />
      <meshBasicMaterial
        color={GOLD_DEEP}
        transparent
        opacity={0.08}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </instancedMesh>
  )
}

// ── Subtle rice paddy reflections (mirrored warm dots) ───────────
function PaddyReflections({ figures }: { figures: CrowdFigure[] }) {
  // Reflected dots — only for figures near paddy areas
  const reflected = useMemo(
    () => figures.filter(f => f.z < -8 && f.z > -45 && Math.abs(f.x) > 2),
    [figures],
  )

  const positions = useMemo(() => {
    const arr = new Float32Array(reflected.length * 3)
    for (let i = 0; i < reflected.length; i++) {
      arr[i * 3] = reflected[i].x
      arr[i * 3 + 1] = -reflected[i].y - 0.1 // reflected below ground
      arr[i * 3 + 2] = reflected[i].z
    }
    return arr
  }, [reflected])

  return (
    <points frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        color={GOLD_PRIMARY}
        size={0.3}
        transparent
        opacity={0.15}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        sizeAttenuation
      />
    </points>
  )
}

// ── Slow camera breathing ────────────────────────────────────────
function CameraBreathing() {
  const yieldCamera = useCameraHandoff()
  useFrame(({ camera, clock }) => {
    if (yieldCamera()) return
    const t = clock.getElapsedTime()
    camera.position.y = 1.6 + Math.sin(t * 0.25) * 0.08
    camera.position.x = Math.sin(t * 0.15) * 0.12
    camera.rotation.x = -0.03 + Math.sin(t * 0.1) * 0.015
  })

  return null
}

// ── Main scene composition ──────────────────────────────────────
function ArirangScene() {
  // Generate the massive crowd
  const crowd = useMemo(() => generateCrowd(500, 7070), [])

  return (
    <>
      <CameraBreathing />
      <Lighting />
      <NightSky />
      <Stars count={400} />
      <Moon />
      <Mountains />
      <Ground />
      <Farmhouse />

      {/* The crowd — the heart of the scene */}
      <SwayingCrowd figures={crowd} />
      <CrowdHeads figures={crowd} />
      <FigureGlows figures={crowd} />
      <PaddyReflections figures={crowd} />

      {/* Atmospheric particles */}
      <Fireflies count={150} />
      <WarmSparkles count={100} />

      {/* Close foreground silhouettes for depth */}
      <ForegroundFigures />
    </>
  )
}

// ── Exported Component ──────────────────────────────────────────
export default function Act8() {
  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        background: NIGHT_SKY,
        overflow: 'hidden',
      }}
    >
      <SceneCanvas
        style={{ width: '100%', height: '100%' }}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.3,
          preserveDrawingBuffer: true,
        }}
        camera={{
          position: [0, 1.6, 4],
          fov: 60,
          near: 0.1,
          far: 250,
        }}
      >
        <fog attach="fog" args={['#050A10', 20, 100]} />
        <ArirangScene />
        <EffectComposer>
          <Bloom
            intensity={0.9}
            luminanceThreshold={0.25}
            luminanceSmoothing={0.85}
            mipmapBlur
          />
          <DepthOfField
            focusDistance={0.04}
            focalLength={0.06}
            bokehScale={2}
          />
          <Vignette
            eskil={false}
            offset={0.2}
            darkness={0.5}
          />
        </EffectComposer>
      </SceneCanvas>
    </div>
  )
}
