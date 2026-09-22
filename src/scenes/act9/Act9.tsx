/**
 * Act 9 — "The Finale" — THE FULL ASCENT
 *
 * The hundreds of stick figures from Act 8 are RISING from the countryside
 * into the night sky. They become dots of light, lifting like fireflies from
 * a field at dawn. As they rise, they organize into CONSTELLATION patterns —
 * the Big Dipper, Cassiopeia. The people become the ancient star field.
 *
 * Below: the countryside (paddies, road, farmhouse) grows small.
 * On the road, one golden dot remains.
 * In the doorway, one warm dot (the parent).
 * Everyone else is becoming stars.
 *
 * The sky looks like Act 1 — same stars, same moon — except now every star
 * is a person.
 */

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Line, Stars } from '@react-three/drei'
import { EffectComposer, Bloom, DepthOfField, Vignette } from '@react-three/postprocessing'
import * as THREE from 'three'
import { useCameraHandoff } from '../DebugCamera'
import { SceneCanvas } from '../SceneCanvas'

// ────────────────────────────────────────────────────────────────────
// Palette
// ────────────────────────────────────────────────────────────────────
const DEEP_SKY = '#0A1628'
const GOLD = '#D4A843'
const GOLD_BRIGHT = '#F5D878'
const WARM_AMBER = '#E8A030'
const PARENT_WARM = '#F5C36C'
const STAR_WARM = '#E8C472'
const STAR_PURPLE = '#B8A0D8'
const STAR_BLUE = '#A0C8E8'
const CONSTELLATION_LINE = '#5A6888'
const GROUND_DARK = '#0C0E08'
const PADDY_DARK = '#0A1210'
const PADDY_WATER = '#0E1828'
const ROAD_DARK = '#2A1E14'
const HOUSE_WALL = '#3A2E20'
const HOUSE_GLOW = '#F5C36C'
const MOUNTAIN_FAR = '#0E1220'
const MOUNTAIN_MID = '#121828'
const MOON_COLOR = '#E8E0D0'
const TRAIL_WARM = '#D4A84340'

// ────────────────────────────────────────────────────────────────────
// Seeded random — deterministic positions
// ────────────────────────────────────────────────────────────────────
function seededRandom(seed: number) {
  let s = seed
  return () => {
    s = (s * 16807 + 0) % 2147483647
    return (s - 1) / 2147483646
  }
}

// ────────────────────────────────────────────────────────────────────
// Big Dipper constellation — 7 stars (real astronomical proportions)
// Positioned in the upper sky
// ────────────────────────────────────────────────────────────────────
const BIG_DIPPER: [number, number, number][] = [
  // Bowl
  [-3.0, 18.0, -12],  // Dubhe (α)
  [-1.5, 18.8, -11],  // Merak (β)
  [-1.0, 17.0, -13],  // Phecda (γ)
  [-2.8, 16.5, -14],  // Megrez (δ)
  // Handle
  [-4.2, 16.0, -12],  // Alioth (ε)
  [-5.8, 15.2, -11],  // Mizar (ζ)
  [-7.2, 15.8, -10],  // Alkaid (η)
]

const BIG_DIPPER_LINES: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 0], // Bowl
  [3, 4], [4, 5], [5, 6],          // Handle
]

// ────────────────────────────────────────────────────────────────────
// Cassiopeia — 5 stars in the W shape
// ────────────────────────────────────────────────────────────────────
const CASSIOPEIA: [number, number, number][] = [
  [6.0, 22.0, -14],  // Schedar
  [7.5, 24.0, -13],  // Caph
  [8.5, 22.5, -15],  // Tsih
  [10.0, 24.5, -14], // Ruchbah
  [11.0, 22.8, -13], // Segin
]

const CASSIOPEIA_LINES: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4],
]

// ────────────────────────────────────────────────────────────────────
// Rising soul particles — the hundreds ascending from earth to sky
// Using InstancedMesh for performance
// ────────────────────────────────────────────────────────────────────
const RISING_COUNT = 320

interface RisingDot {
  startX: number
  startZ: number
  targetX: number
  targetY: number
  targetZ: number
  phase: number        // 0-1: delay before rising
  speed: number        // rise speed multiplier
  warmth: number       // 0 = warm gold, 1 = cool purple-blue
  size: number
  wobbleFreq: number
  wobbleAmp: number
  trailIntensity: number
}

function generateRisingDots(): RisingDot[] {
  const rng = seededRandom(8888)
  const dots: RisingDot[] = []

  for (let i = 0; i < RISING_COUNT; i++) {
    // Start on the ground — spread across the paddy field
    const startX = (rng() - 0.5) * 28
    const startZ = (rng() - 0.5) * 20 - 5

    // Target: scattered across the high sky dome
    const angle = rng() * Math.PI * 2
    const height = 12 + rng() * 18
    const spread = 4 + rng() * 14
    const targetX = Math.cos(angle) * spread
    const targetZ = -8 + Math.sin(angle) * spread * 0.6
    const targetY = height

    dots.push({
      startX,
      startZ,
      targetX,
      targetY,
      targetZ,
      phase: rng() * 0.7,          // stagger start
      speed: 0.3 + rng() * 0.5,
      warmth: rng(),
      size: 0.04 + rng() * 0.08,
      wobbleFreq: 1 + rng() * 3,
      wobbleAmp: 0.1 + rng() * 0.3,
      trailIntensity: 0.3 + rng() * 0.7,
    })
  }
  return dots
}

function RisingDots() {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const dots = useMemo(generateRisingDots, [])
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const colorArray = useMemo(() => new Float32Array(RISING_COUNT * 3), [])

  // Pre-compute colors
  useMemo(() => {
    const goldCol = new THREE.Color(STAR_WARM)
    const purpleCol = new THREE.Color(STAR_PURPLE)
    const blueCol = new THREE.Color(STAR_BLUE)
    const temp = new THREE.Color()

    for (let i = 0; i < RISING_COUNT; i++) {
      const d = dots[i]
      if (d.warmth < 0.5) {
        temp.copy(goldCol).lerp(purpleCol, d.warmth * 2)
      } else {
        temp.copy(purpleCol).lerp(blueCol, (d.warmth - 0.5) * 2)
      }
      colorArray[i * 3] = temp.r
      colorArray[i * 3 + 1] = temp.g
      colorArray[i * 3 + 2] = temp.b
    }
  }, [dots, colorArray])

  useFrame(({ clock }) => {
    if (!meshRef.current) return
    const t = clock.getElapsedTime()
    // Global progress cycles very slowly — scene is a living moment
    const globalT = (t * 0.04) % 1

    for (let i = 0; i < RISING_COUNT; i++) {
      const d = dots[i]
      // Each dot has its own timeline offset
      const localT = Math.max(0, (globalT * 2.5 + (1 - d.phase)) % 1)

      // Eased progress (slow start, slow end)
      const eased = localT < 0.5
        ? 2 * localT * localT
        : 1 - Math.pow(-2 * localT + 2, 2) / 2

      // Interpolate from ground to sky target
      const x = THREE.MathUtils.lerp(d.startX, d.targetX, eased) +
        Math.sin(t * d.wobbleFreq + i) * d.wobbleAmp * (1 - eased * 0.5)
      const y = THREE.MathUtils.lerp(0.05, d.targetY, eased)
      const z = THREE.MathUtils.lerp(d.startZ, d.targetZ, eased) +
        Math.cos(t * d.wobbleFreq * 0.7 + i * 1.3) * d.wobbleAmp * 0.5

      // Scale: small on ground, grow as they rise, then stabilize
      const risePulse = Math.sin(eased * Math.PI) * 0.5 + 0.5
      const scale = d.size * (0.6 + risePulse * 1.2 + eased * 0.4)

      dummy.position.set(x, y, z)
      dummy.scale.setScalar(scale)
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(i, dummy.matrix)
    }
    meshRef.current.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, RISING_COUNT]}>
      <sphereGeometry args={[1, 8, 8]} />
      <meshStandardMaterial
        color="#000000"
        emissive={STAR_WARM}
        emissiveIntensity={2}
        transparent
        opacity={0.9}
        toneMapped={false}
        roughness={0.5}
      />
      <instancedBufferAttribute
        attach="geometry-attributes-color"
        args={[colorArray, 3]}
      />
    </instancedMesh>
  )
}

// ────────────────────────────────────────────────────────────────────
// Rising trails — vertical wisps of warm light connecting ground to sky
// ────────────────────────────────────────────────────────────────────
const TRAIL_COUNT = 80

function RisingTrails() {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const dummy = useMemo(() => new THREE.Object3D(), [])

  const trails = useMemo(() => {
    const rng = seededRandom(7777)
    return Array.from({ length: TRAIL_COUNT }, () => ({
      x: (rng() - 0.5) * 24,
      z: (rng() - 0.5) * 16 - 4,
      height: 4 + rng() * 12,
      baseY: 0.5 + rng() * 2,
      phase: rng() * Math.PI * 2,
      speed: 0.2 + rng() * 0.4,
      width: 0.01 + rng() * 0.015,
    }))
  }, [])

  useFrame(({ clock }) => {
    if (!meshRef.current) return
    const t = clock.getElapsedTime()

    for (let i = 0; i < TRAIL_COUNT; i++) {
      const tr = trails[i]
      const pulse = Math.sin(t * tr.speed + tr.phase) * 0.5 + 0.5
      const h = tr.height * (0.4 + pulse * 0.6)

      dummy.position.set(
        tr.x + Math.sin(t * 0.3 + tr.phase) * 0.2,
        tr.baseY + h * 0.5,
        tr.z,
      )
      dummy.scale.set(tr.width, h, tr.width)
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(i, dummy.matrix)
    }
    meshRef.current.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, TRAIL_COUNT]}>
      <cylinderGeometry args={[1, 1, 1, 4]} />
      <meshStandardMaterial
        color="#000000"
        emissive={TRAIL_WARM}
        emissiveIntensity={1.5}
        transparent
        opacity={0.06}
        depthWrite={false}
        toneMapped={false}
        roughness={0.8}
      />
    </instancedMesh>
  )
}

// ────────────────────────────────────────────────────────────────────
// Constellation stars — the prominent named stars at their targets
// These glow brighter and pulse gently
// ────────────────────────────────────────────────────────────────────
function ConstellationStar({
  position,
  color = STAR_WARM,
  size = 0.12,
  pulseSpeed = 1,
}: {
  position: [number, number, number]
  color?: string
  size?: number
  pulseSpeed?: number
}) {
  const meshRef = useRef<THREE.Mesh>(null)
  const glowRef = useRef<THREE.Mesh>(null)

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    const pulse = Math.sin(t * pulseSpeed) * 0.15 + 1
    if (meshRef.current) meshRef.current.scale.setScalar(pulse)
    if (glowRef.current) glowRef.current.scale.setScalar(pulse * 1.8)
  })

  return (
    <group position={position}>
      {/* Core */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[size, 12, 12]} />
        <meshStandardMaterial
          color="#000000"
          emissive={color}
          emissiveIntensity={2.5}
          toneMapped={false}
          roughness={0.4}
        />
      </mesh>
      {/* Glow halo */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[size * 2, 12, 12]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.15}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      {/* Point light — very faint, only the brightest stars */}
      {size > 0.1 && (
        <pointLight
          color={color}
          intensity={0.8}
          distance={4}
          decay={2}
        />
      )}
    </group>
  )
}

// ────────────────────────────────────────────────────────────────────
// Constellation lines — faint connections between stars
// ────────────────────────────────────────────────────────────────────
function ConstellationLines({
  stars,
  lines,
  opacity = 0.25,
}: {
  stars: [number, number, number][]
  lines: [number, number][]
  opacity?: number
}) {
  const lineOpacity = useRef(0)
  const groupRef = useRef<THREE.Group>(null)

  useFrame(({ clock }) => {
    // Fade in slowly
    const t = clock.getElapsedTime()
    lineOpacity.current = Math.min(opacity, t * 0.015)
    if (groupRef.current) {
      groupRef.current.children.forEach(child => {
        const mat = (child as THREE.Line).material as THREE.Material
        if (mat && 'opacity' in mat) {
          ;(mat as THREE.MeshBasicMaterial).opacity = lineOpacity.current
        }
      })
    }
  })

  return (
    <group ref={groupRef}>
      {lines.map(([a, b], i) => (
        <Line
          key={i}
          points={[stars[a], stars[b]]}
          color={CONSTELLATION_LINE}
          lineWidth={1.2}
          transparent
          opacity={opacity}
        />
      ))}
    </group>
  )
}

// ────────────────────────────────────────────────────────────────────
// Big Dipper constellation group
// ────────────────────────────────────────────────────────────────────
function BigDipper() {
  const rng = useMemo(() => seededRandom(4242), [])
  return (
    <group>
      {BIG_DIPPER.map((pos, i) => (
        <ConstellationStar
          key={i}
          position={pos}
          color={i === 0 ? GOLD_BRIGHT : STAR_WARM}
          size={i === 0 ? 0.15 : 0.1 + rng() * 0.04}
          pulseSpeed={0.5 + rng() * 0.5}
        />
      ))}
      <ConstellationLines stars={BIG_DIPPER} lines={BIG_DIPPER_LINES} opacity={0.22} />
    </group>
  )
}

// ────────────────────────────────────────────────────────────────────
// Cassiopeia constellation group
// ────────────────────────────────────────────────────────────────────
function CassiopeiaConstellation() {
  const rng = useMemo(() => seededRandom(5353), [])
  return (
    <group>
      {CASSIOPEIA.map((pos, i) => (
        <ConstellationStar
          key={i}
          position={pos}
          color={i === 2 ? STAR_BLUE : STAR_PURPLE}
          size={0.08 + rng() * 0.04}
          pulseSpeed={0.6 + rng() * 0.6}
        />
      ))}
      <ConstellationLines stars={CASSIOPEIA} lines={CASSIOPEIA_LINES} opacity={0.18} />
    </group>
  )
}

// ────────────────────────────────────────────────────────────────────
// Scattered constellation fragments — smaller groups of 3-4 stars
// that feel like newly-forming patterns
// ────────────────────────────────────────────────────────────────────
function ScatteredConstellations() {
  const fragments = useMemo(() => {
    const rng = seededRandom(9191)
    const groups: { stars: [number, number, number][]; lines: [number, number][] }[] = []

    for (let g = 0; g < 8; g++) {
      const cx = (rng() - 0.5) * 20
      const cy = 14 + rng() * 14
      const cz = -10 - rng() * 8
      const count = 3 + Math.floor(rng() * 2)
      const stars: [number, number, number][] = []
      const lines: [number, number][] = []

      for (let s = 0; s < count; s++) {
        stars.push([
          cx + (rng() - 0.5) * 3,
          cy + (rng() - 0.5) * 2,
          cz + (rng() - 0.5) * 2,
        ])
        if (s > 0) lines.push([s - 1, s])
      }
      groups.push({ stars, lines })
    }
    return groups
  }, [])

  return (
    <group>
      {fragments.map((frag, i) => (
        <group key={i}>
          {frag.stars.map((pos, j) => (
            <ConstellationStar
              key={j}
              position={pos}
              color={j % 2 === 0 ? STAR_WARM : STAR_PURPLE}
              size={0.05 + (j % 3) * 0.02}
              pulseSpeed={0.8 + (i * 0.2)}
            />
          ))}
          <ConstellationLines stars={frag.stars} lines={frag.lines} opacity={0.12} />
        </group>
      ))}
    </group>
  )
}

// ────────────────────────────────────────────────────────────────────
// Moon — the same moon from Act 1, high in the sky
// ────────────────────────────────────────────────────────────────────
function Moon() {
  return (
    <group position={[8, 26, -20]}>
      {/* Moon disc */}
      <mesh>
        <sphereGeometry args={[1.0, 32, 32]} />
        <meshStandardMaterial
          color="#000000"
          emissive={MOON_COLOR}
          emissiveIntensity={2}
          toneMapped={false}
          roughness={0.3}
        />
      </mesh>
      {/* Lunar glow — inner */}
      <mesh>
        <sphereGeometry args={[1.5, 32, 32]} />
        <meshBasicMaterial
          color={MOON_COLOR}
          transparent
          opacity={0.08}
          depthWrite={false}
        />
      </mesh>
      {/* Lunar glow — outer haze */}
      <mesh>
        <sphereGeometry args={[3.0, 32, 32]} />
        <meshBasicMaterial
          color="#C8D0E0"
          transparent
          opacity={0.03}
          depthWrite={false}
        />
      </mesh>
      <pointLight color={MOON_COLOR} intensity={2} distance={40} decay={1.5} />
    </group>
  )
}

// ────────────────────────────────────────────────────────────────────
// Ground — simplified countryside viewed from above
// Dark plane with faint detail: paddies, road, farmhouse
// ────────────────────────────────────────────────────────────────────
function Countryside() {
  return (
    <group position={[0, -0.5, 0]}>
      {/* Main ground plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial color={GROUND_DARK} roughness={1} />
      </mesh>

      {/* Rice paddies — dark rectangles with faint reflective water */}
      {[
        [-5, 0.01, -4, 6, 8],
        [5, 0.01, -4, 6, 8],
        [-3.5, 0.01, 5, 4, 5],
        [3.5, 0.01, 5, 4, 5],
        [-7, 0.01, 2, 4, 6],
        [7, 0.01, 2, 4, 6],
      ].map(([x, y, z, w, d], i) => (
        <group key={i} position={[x, y, z]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[w, d]} />
            <meshStandardMaterial
              color={PADDY_DARK}
              roughness={0.9}
            />
          </mesh>
          {/* Water shimmer */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
            <planeGeometry args={[w - 0.3, d - 0.3]} />
            <meshStandardMaterial
              color={PADDY_WATER}
              roughness={0.05}
              metalness={0.8}
              transparent
              opacity={0.4}
              envMapIntensity={1.5}
            />
          </mesh>
        </group>
      ))}

      {/* Dirt road — running through the center */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <planeGeometry args={[1.5, 30]} />
        <meshStandardMaterial color={ROAD_DARK} roughness={0.95} />
      </mesh>

      {/* Farmhouse — tiny warm rectangle with glowing door */}
      <Farmhouse position={[0, 0, -10]} />

      {/* Mountain silhouettes on far horizon */}
      <DistantMountains />
    </group>
  )
}

// ────────────────────────────────────────────────────────────────────
// Farmhouse — tiny at this distance, but with unmistakable warm glow
// ────────────────────────────────────────────────────────────────────
function Farmhouse({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Structure — dark silhouette */}
      <mesh position={[0, 0.4, 0]}>
        <boxGeometry args={[1.8, 0.8, 1.2]} />
        <meshStandardMaterial color={HOUSE_WALL} roughness={0.9} />
      </mesh>
      {/* Roof */}
      <mesh position={[0, 0.9, 0]}>
        <boxGeometry args={[2.2, 0.12, 1.6]} />
        <meshStandardMaterial color="#1A1410" roughness={0.8} />
      </mesh>
      {/* Warm door light — the emotional anchor */}
      <mesh position={[0, 0.35, 0.61]}>
        <boxGeometry args={[0.4, 0.55, 0.02]} />
        <meshStandardMaterial
          color="#000000"
          emissive={HOUSE_GLOW}
          emissiveIntensity={3}
          toneMapped={false}
          roughness={0.5}
        />
      </mesh>
      {/* Light spill from door */}
      <pointLight
        color={HOUSE_GLOW}
        intensity={3}
        distance={5}
        decay={2}
        position={[0, 0.3, 1.0]}
      />
      {/* Soft glow on ground in front of house */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 1.5]}>
        <circleGeometry args={[1.5, 16]} />
        <meshStandardMaterial
          color={HOUSE_GLOW}
          transparent
          opacity={0.06}
          depthWrite={false}
          roughness={1}
        />
      </mesh>
      {/* Parent dot in the doorway */}
      <ParentDot position={[0, 0.5, 0.7]} />
    </group>
  )
}

// ────────────────────────────────────────────────────────────────────
// Parent dot — one warm point in the doorway, watching everyone ascend
// ────────────────────────────────────────────────────────────────────
function ParentDot({ position }: { position: [number, number, number] }) {
  const meshRef = useRef<THREE.Mesh>(null)
  const glowRef = useRef<THREE.Mesh>(null)

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    // Very gentle breathing pulse
    const pulse = Math.sin(t * 0.8) * 0.06 + 1
    if (meshRef.current) meshRef.current.scale.setScalar(pulse)
    if (glowRef.current) {
      glowRef.current.scale.setScalar(pulse * 2.5)
      const mat = glowRef.current.material as THREE.MeshBasicMaterial
      mat.opacity = 0.15 + Math.sin(t * 0.5) * 0.05
    }
  })

  return (
    <group position={position}>
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.06, 10, 10]} />
        <meshBasicMaterial color={PARENT_WARM} toneMapped={false} />
      </mesh>
      <mesh ref={glowRef}>
        <sphereGeometry args={[0.12, 10, 10]} />
        <meshBasicMaterial
          color={PARENT_WARM}
          transparent
          opacity={0.15}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  )
}

// ────────────────────────────────────────────────────────────────────
// Golden figure — the viewer/fan, alone on the road, looking up
// The brightest single dot on the ground
// ────────────────────────────────────────────────────────────────────
function GoldenFigure() {
  const meshRef = useRef<THREE.Mesh>(null)
  const haloRef = useRef<THREE.Mesh>(null)
  const outerRef = useRef<THREE.Mesh>(null)

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    // Warm, steady pulse — alive, present, anchored
    const pulse = Math.sin(t * 0.6) * 0.08 + 1
    if (meshRef.current) meshRef.current.scale.setScalar(pulse)
    if (haloRef.current) haloRef.current.scale.setScalar(pulse * 1.5)
    if (outerRef.current) {
      outerRef.current.scale.setScalar(pulse * 3)
      const mat = outerRef.current.material as THREE.MeshBasicMaterial
      mat.opacity = 0.08 + Math.sin(t * 0.4) * 0.03
    }
  })

  return (
    <group position={[0, -0.35, -3]}>
      {/* Core — bright gold */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.1, 12, 12]} />
        <meshBasicMaterial color={GOLD_BRIGHT} toneMapped={false} />
      </mesh>
      {/* Inner halo */}
      <mesh ref={haloRef}>
        <sphereGeometry args={[0.18, 12, 12]} />
        <meshBasicMaterial
          color={GOLD}
          transparent
          opacity={0.25}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      {/* Outer warm glow */}
      <mesh ref={outerRef}>
        <sphereGeometry args={[0.35, 12, 12]} />
        <meshBasicMaterial
          color={WARM_AMBER}
          transparent
          opacity={0.08}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      {/* Point light — this dot is a beacon */}
      <pointLight color={GOLD} intensity={2} distance={4} decay={2} />
    </group>
  )
}

// ────────────────────────────────────────────────────────────────────
// Distant mountains — same silhouette as Act 1 on the far horizon
// ────────────────────────────────────────────────────────────────────
function DistantMountains() {
  const farShape = useMemo(() => {
    const shape = new THREE.Shape()
    shape.moveTo(-30, 0)
    shape.lineTo(-25, 1.8)
    shape.quadraticCurveTo(-22, 3.5, -18, 2.5)
    shape.quadraticCurveTo(-14, 1.6, -10, 3.8)
    shape.quadraticCurveTo(-6, 5.5, -2, 2.8)
    shape.quadraticCurveTo(2, 1.0, 5, 4.2)
    shape.quadraticCurveTo(8, 6.2, 12, 4.0)
    shape.quadraticCurveTo(16, 2.2, 20, 3.2)
    shape.quadraticCurveTo(24, 4.4, 28, 2.0)
    shape.lineTo(30, 0)
    shape.closePath()
    return shape
  }, [])

  const midShape = useMemo(() => {
    const shape = new THREE.Shape()
    shape.moveTo(-30, 0)
    shape.lineTo(-24, 1.2)
    shape.quadraticCurveTo(-20, 2.5, -15, 1.8)
    shape.quadraticCurveTo(-10, 1.0, -6, 2.8)
    shape.quadraticCurveTo(-2, 4.0, 3, 2.0)
    shape.quadraticCurveTo(7, 0.7, 12, 2.5)
    shape.quadraticCurveTo(17, 3.6, 22, 2.2)
    shape.quadraticCurveTo(26, 1.0, 30, 1.5)
    shape.lineTo(30, 0)
    shape.closePath()
    return shape
  }, [])

  return (
    <group>
      <mesh position={[0, 0, -28]} rotation={[-Math.PI / 2, 0, 0]}>
        <shapeGeometry args={[farShape]} />
        <meshStandardMaterial color={MOUNTAIN_FAR} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0, -22]} rotation={[-Math.PI / 2, 0, 0]}>
        <shapeGeometry args={[midShape]} />
        <meshStandardMaterial color={MOUNTAIN_MID} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

// ────────────────────────────────────────────────────────────────────
// Sky glow — subtle gradient light from below the horizon and above
// ────────────────────────────────────────────────────────────────────
function SkyGlow() {
  return (
    <group>
      {/* Horizon glow — faint warm band where earth meets sky */}
      <mesh position={[0, 2, -25]}>
        <planeGeometry args={[60, 6]} />
        <meshStandardMaterial
          color="#1A2040"
          transparent
          opacity={0.15}
          depthWrite={false}
          side={THREE.DoubleSide}
          roughness={1}
        />
      </mesh>
      {/* Upper sky — deep indigo shimmer */}
      <mesh position={[0, 22, -18]}>
        <planeGeometry args={[50, 20]} />
        <meshStandardMaterial
          color="#0E1430"
          transparent
          opacity={0.06}
          depthWrite={false}
          side={THREE.DoubleSide}
          roughness={1}
        />
      </mesh>
    </group>
  )
}

// ────────────────────────────────────────────────────────────────────
// Firefly remnants — a few last fireflies near the ground, not rising
// They stay behind with the golden figure
// ────────────────────────────────────────────────────────────────────
function LingeringFireflies() {
  const count = 12
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const dummy = useMemo(() => new THREE.Object3D(), [])

  const fireflies = useMemo(() => {
    const rng = seededRandom(3636)
    return Array.from({ length: count }, () => ({
      x: (rng() - 0.5) * 8,
      y: 0.2 + rng() * 1.5,
      z: (rng() - 0.5) * 8 - 2,
      freq: 0.5 + rng() * 1.5,
      amp: 0.05 + rng() * 0.15,
      phase: rng() * Math.PI * 2,
      size: 0.02 + rng() * 0.02,
    }))
  }, [])

  useFrame(({ clock }) => {
    if (!meshRef.current) return
    const t = clock.getElapsedTime()

    for (let i = 0; i < count; i++) {
      const f = fireflies[i]
      // Gentle wandering paths
      const x = f.x + Math.sin(t * f.freq + f.phase) * f.amp
      const y = f.y + Math.sin(t * f.freq * 0.7 + f.phase + 1) * f.amp * 0.5
      const z = f.z + Math.cos(t * f.freq * 0.5 + f.phase) * f.amp

      // Flickering brightness
      const flicker = Math.sin(t * 4 + i * 2.3) * 0.3 + 0.7
      const s = f.size * flicker

      dummy.position.set(x, y - 0.5, z)
      dummy.scale.setScalar(s)
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(i, dummy.matrix)
    }
    meshRef.current.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 6, 6]} />
      <meshStandardMaterial
        color="#000000"
        emissive="#D4C85C"
        emissiveIntensity={2}
        transparent
        opacity={0.7}
        toneMapped={false}
        roughness={0.5}
      />
    </instancedMesh>
  )
}

// ────────────────────────────────────────────────────────────────────
// Gentle camera drift — slow upward rotation to emphasize the sky
// ────────────────────────────────────────────────────────────────────
function CameraDrift() {
  const yieldCamera = useCameraHandoff()
  useFrame(({ camera, clock }) => {
    if (yieldCamera()) return
    const t = clock.getElapsedTime()
    camera.position.x = Math.sin(t * 0.05) * 0.3
    camera.position.y = 6 + Math.sin(t * 0.03) * 0.2
    camera.rotation.x = -0.15 + Math.sin(t * 0.04) * 0.02
  })
  return null
}

// ────────────────────────────────────────────────────────────────────
// Paddy water reflections — faint dots mirrored below ground
// Reflecting the rising souls in the water surface
// ────────────────────────────────────────────────────────────────────
const REFLECTION_COUNT = 60

function PaddyReflections() {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const dummy = useMemo(() => new THREE.Object3D(), [])

  const reflections = useMemo(() => {
    const rng = seededRandom(2525)
    return Array.from({ length: REFLECTION_COUNT }, () => ({
      x: (rng() - 0.5) * 18,
      z: (rng() - 0.5) * 14 - 3,
      flickerSpeed: 2 + rng() * 4,
      flickerPhase: rng() * Math.PI * 2,
      size: 0.015 + rng() * 0.025,
    }))
  }, [])

  useFrame(({ clock }) => {
    if (!meshRef.current) return
    const t = clock.getElapsedTime()

    for (let i = 0; i < REFLECTION_COUNT; i++) {
      const r = reflections[i]
      const flicker = Math.sin(t * r.flickerSpeed + r.flickerPhase)
      const visible = flicker > 0 ? r.size * flicker : 0

      dummy.position.set(
        r.x + Math.sin(t * 0.8 + r.flickerPhase) * 0.05,
        -0.52,
        r.z,
      )
      dummy.scale.setScalar(visible)
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(i, dummy.matrix)
    }
    meshRef.current.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, REFLECTION_COUNT]}>
      <sphereGeometry args={[1, 6, 6]} />
      <meshStandardMaterial
        color="#000000"
        emissive={STAR_WARM}
        emissiveIntensity={1.5}
        transparent
        opacity={0.2}
        depthWrite={false}
        toneMapped={false}
        roughness={0.6}
      />
    </instancedMesh>
  )
}

// ────────────────────────────────────────────────────────────────────
// Scene content — everything inside the Canvas
// ────────────────────────────────────────────────────────────────────
function SceneContent() {
  return (
    <>
      {/* Lighting — minimal: moonlight + ambient deep blue */}
      <ambientLight intensity={0.08} color="#8090B0" />
      <directionalLight
        position={[5, 20, -10]}
        intensity={0.15}
        color={MOON_COLOR}
      />

      {/* Fog — subtle, grounds the scene */}
      <fog attach="fog" args={[DEEP_SKY, 25, 60]} />
      <color attach="background" args={[DEEP_SKY]} />

      {/* Background stars — the ancient sky, dim behind the constellation-people */}
      <Stars
        radius={80}
        depth={60}
        count={2000}
        factor={2.5}
        saturation={0.15}
        fade
        speed={0.3}
      />

      {/* Camera drift */}
      <CameraDrift />

      {/* Sky glow effects */}
      <SkyGlow />

      {/* Moon — high, same as Act 1 */}
      <Moon />

      {/* ── THE ASCENT ── */}

      {/* Hundreds of warm dots rising from ground to sky */}
      <RisingDots />

      {/* Vertical light trails connecting earth to heaven */}
      <RisingTrails />

      {/* ── CONSTELLATIONS ── */}

      {/* Big Dipper — 7 prominent stars with connecting lines */}
      <BigDipper />

      {/* Cassiopeia — W shape in the upper sky */}
      <CassiopeiaConstellation />

      {/* Scattered smaller constellation fragments */}
      <ScatteredConstellations />

      {/* ── THE GROUND ── */}

      {/* Simplified countryside far below */}
      <Countryside />

      {/* Reflections of rising souls in paddy water */}
      <PaddyReflections />

      {/* A few fireflies that stayed behind */}
      <LingeringFireflies />

      {/* ── THE TWO WHO REMAIN ── */}

      {/* Golden figure — alone on the road, looking up */}
      <GoldenFigure />
    </>
  )
}

// ────────────────────────────────────────────────────────────────────
// Main export
// ────────────────────────────────────────────────────────────────────
export default function Act9() {
  return (
    <div style={{ width: '100vw', height: '100vh', background: '#000' }}>
      <SceneCanvas
        camera={{
          position: [0, 6, 12],
          fov: 65,
          near: 0.1,
          far: 200,
          rotation: [-0.15, 0, 0],
        }}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.0,
        }}
        dpr={[1, 2]}
      >
        <SceneContent />
        <EffectComposer>
          <Bloom
            intensity={0.9}
            luminanceThreshold={0.25}
            luminanceSmoothing={0.9}
            mipmapBlur
          />
          <DepthOfField
            focusDistance={0.04}
            focalLength={0.06}
            bokehScale={2}
          />
          <Vignette
            eskil={false}
            offset={0.15}
            darkness={0.5}
          />
        </EffectComposer>
      </SceneCanvas>
    </div>
  )
}
