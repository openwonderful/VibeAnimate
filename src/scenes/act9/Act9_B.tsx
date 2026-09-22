/**
 * Act 9-B — "The Finale" — MAXIMUM ALTITUDE / FINAL FRAME
 *
 * Camera high looking slightly down. Top half: sky DENSE with constellations
 * of warm gold (#D4A843) and purple (#9B7ECF) dots connected by faint lines.
 * Big Dipper prominent. Bottom half: countryside far below — dark paddy grid,
 * road, farmhouse with warm glow. Paddy water REFLECTS the constellation sky
 * creating vertical symmetry. Two lonely dots: golden on road, amber in doorway.
 *
 * Every star is a person. The last image.
 */

import { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Line } from '@react-three/drei'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import * as THREE from 'three'
import { DebugCamera, useCameraHandoff } from '../DebugCamera'

// ────────────────────────────────────────────────────────────────────
// Palette
// ────────────────────────────────────────────────────────────────────
const GOLD = '#D4A843'
const GOLD_BRIGHT = '#F5D878'
const WARM_AMBER = '#E8A030'
const PARENT_WARM = '#F5C36C'
const STAR_GOLD = '#D4A843'
const STAR_PURPLE = '#9B7ECF'
const STAR_WARM = '#E8C472'
const CONSTELLATION_LINE_COLOR = '#5A6888'
const GROUND_DARK = '#060C18'
const HOUSE_WALL = '#2A2018'
const HOUSE_GLOW = '#F5C36C'

// ────────────────────────────────────────────────────────────────────
// Seeded random
// ────────────────────────────────────────────────────────────────────
function seededRandom(seed: number) {
  let s = seed
  return () => {
    s = (s * 16807 + 0) % 2147483647
    return (s - 1) / 2147483646
  }
}

// ────────────────────────────────────────────────────────────────────
// Constellation data — positioned in a broad sky dome
// Camera at y=30, z=0 looking down at y=0, z=0
// Stars spread across the upper hemisphere above the camera's horizon
// ────────────────────────────────────────────────────────────────────
const BIG_DIPPER: [number, number, number][] = [
  [-8, 38, -18],    // Dubhe (α) — brightest
  [-4, 40, -16],    // Merak (β)
  [-3, 35, -20],    // Phecda (γ)
  [-7, 33, -22],    // Megrez (δ)
  [-11, 31, -19],   // Alioth (ε)
  [-15, 29, -16],   // Mizar (ζ)
  [-18, 31, -13],   // Alkaid (η)
]
const BIG_DIPPER_LINES: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 0], [3, 4], [4, 5], [5, 6],
]

const CASSIOPEIA: [number, number, number][] = [
  [18, 42, -20],
  [22, 46, -17],
  [24, 42, -22],
  [28, 46, -20],
  [31, 42, -17],
]
const CASSIOPEIA_LINES: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4],
]

const ORION: [number, number, number][] = [
  [5, 30, -25],   // Betelgeuse
  [11, 30, -23],  // Bellatrix
  [7, 26, -24],   // Belt 1
  [8, 26, -24],   // Belt 2
  [9, 26, -24],   // Belt 3
  [5.5, 22, -25], // Saiph
  [10.5, 22, -23], // Rigel
]
const ORION_LINES: [number, number][] = [
  [0, 2], [1, 4], [2, 3], [3, 4], [2, 5], [4, 6],
]

const LYRA: [number, number, number][] = [
  [-25, 45, -14],  // Vega
  [-22, 40, -18],
  [-26, 38, -16],
  [-25, 36, -19],
  [-22, 37, -17],
]
const LYRA_LINES: [number, number][] = [
  [0, 1], [0, 2], [1, 3], [2, 4], [3, 4],
]

const CORONA: [number, number, number][] = [
  [30, 28, -22],
  [33, 32, -20],
  [35, 30, -22],
  [35, 26, -24],
  [33, 24, -22],
  [31, 25, -22],
]
const CORONA_LINES: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0],
]

// Cygnus cross shape
const CYGNUS: [number, number, number][] = [
  [-32, 36, -8],   // Deneb (top)
  [-30, 32, -12],
  [-28, 28, -15],  // center (Sadr)
  [-26, 24, -18],  // Albireo (bottom)
  [-33, 29, -16],  // left wing
  [-24, 27, -12],  // right wing
]
const CYGNUS_LINES: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [4, 2], [2, 5],
]

// Triangulum — small triangle high up
const TRIANGULUM: [number, number, number][] = [
  [0, 50, -20],
  [4, 46, -23],
  [-3, 46, -21],
]
const TRIANGULUM_LINES: [number, number][] = [
  [0, 1], [1, 2], [2, 0],
]

// ────────────────────────────────────────────────────────────────────
// Dense star field — 800 person-stars
// ────────────────────────────────────────────────────────────────────
const SKY_STAR_COUNT = 800

interface SkyStar {
  x: number; y: number; z: number
  size: number; warmth: number
  pulseSpeed: number; pulsePhase: number
}

function generateSkyStars(): SkyStar[] {
  const rng = seededRandom(8842)
  const stars: SkyStar[] = []
  for (let i = 0; i < SKY_STAR_COUNT; i++) {
    // Hemisphere distribution — even coverage across the visible sky
    const theta = rng() * Math.PI * 2
    // Use sqrt for uniform area distribution on hemisphere
    const cosElev = Math.sqrt(rng()) // 0..1, more uniform
    const sinElev = Math.sqrt(1 - cosElev * cosElev)
    const dist = 35 + rng() * 55
    stars.push({
      x: sinElev * Math.cos(theta) * dist,
      y: cosElev * dist + 13, // above the camera
      z: sinElev * Math.sin(theta) * dist * 0.5 - 15,
      size: 0.05 + rng() * 0.18,
      warmth: rng(),
      pulseSpeed: 0.2 + rng() * 1.2,
      pulsePhase: rng() * Math.PI * 2,
    })
  }
  return stars
}

// ────────────────────────────────────────────────────────────────────
// Small constellation fragments
// ────────────────────────────────────────────────────────────────────
interface Fragment {
  stars: [number, number, number][]
  lines: [number, number][]
}

function generateFragments(): Fragment[] {
  const rng = seededRandom(7733)
  const frags: Fragment[] = []
  for (let g = 0; g < 25; g++) {
    const theta = rng() * Math.PI * 2
    const cosElev = Math.sqrt(rng())
    const sinElev = Math.sqrt(1 - cosElev * cosElev)
    const dist = 30 + rng() * 45
    const cx = sinElev * Math.cos(theta) * dist
    const cy = cosElev * dist + 13
    const cz = sinElev * Math.sin(theta) * dist * 0.4 - 12
    const count = 3 + Math.floor(rng() * 3)
    const stars: [number, number, number][] = []
    const lines: [number, number][] = []
    for (let s = 0; s < count; s++) {
      stars.push([
        cx + (rng() - 0.5) * 4,
        cy + (rng() - 0.5) * 3,
        cz + (rng() - 0.5) * 3,
      ])
      if (s > 0) lines.push([Math.floor(rng() * s), s])
    }
    frags.push({ stars, lines })
  }
  return frags
}

// ────────────────────────────────────────────────────────────────────
// Instanced star field
// ────────────────────────────────────────────────────────────────────
function SkyStarField() {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const stars = useMemo(generateSkyStars, [])
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const colorArray = useMemo(() => {
    const arr = new Float32Array(SKY_STAR_COUNT * 3)
    const gold = new THREE.Color(STAR_GOLD)
    const purple = new THREE.Color(STAR_PURPLE)
    const tmp = new THREE.Color()
    for (let i = 0; i < SKY_STAR_COUNT; i++) {
      tmp.copy(gold).lerp(purple, stars[i].warmth)
      arr[i * 3] = tmp.r
      arr[i * 3 + 1] = tmp.g
      arr[i * 3 + 2] = tmp.b
    }
    return arr
  }, [stars])

  useFrame(({ clock }) => {
    if (!meshRef.current) return
    const t = clock.getElapsedTime()
    for (let i = 0; i < SKY_STAR_COUNT; i++) {
      const s = stars[i]
      const pulse = Math.sin(t * s.pulseSpeed + s.pulsePhase) * 0.25 + 0.9
      dummy.position.set(s.x, s.y, s.z)
      dummy.scale.setScalar(s.size * pulse)
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(i, dummy.matrix)
    }
    meshRef.current.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, SKY_STAR_COUNT]}>
      <sphereGeometry args={[1, 8, 8]} />
      <meshBasicMaterial vertexColors transparent opacity={1} toneMapped={false} />
      <instancedBufferAttribute attach="geometry-attributes-color" args={[colorArray, 3]} />
    </instancedMesh>
  )
}

// ────────────────────────────────────────────────────────────────────
// Named constellation star
// ────────────────────────────────────────────────────────────────────
function CStar({
  position, color = STAR_GOLD, size = 0.18, pulseSpeed = 0.8,
}: {
  position: [number, number, number]; color?: string;
  size?: number; pulseSpeed?: number
}) {
  const mRef = useRef<THREE.Mesh>(null)
  const gRef = useRef<THREE.Mesh>(null)
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    const p = Math.sin(t * pulseSpeed) * 0.12 + 1
    if (mRef.current) mRef.current.scale.setScalar(p)
    if (gRef.current) gRef.current.scale.setScalar(p)
  })
  return (
    <group position={position}>
      {/* Bright core */}
      <mesh ref={mRef}>
        <sphereGeometry args={[size * 0.6, 10, 10]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      {/* Soft halo */}
      <mesh ref={gRef}>
        <sphereGeometry args={[size * 1.8, 10, 10]} />
        <meshBasicMaterial color={color} transparent opacity={0.18} depthWrite={false} toneMapped={false} />
      </mesh>
      {size > 0.2 && <pointLight color={color} intensity={0.5} distance={10} decay={2} />}
    </group>
  )
}

// ────────────────────────────────────────────────────────────────────
// Constellation lines
// ────────────────────────────────────────────────────────────────────
function CLines({
  stars, lines, opacity = 0.25, color = CONSTELLATION_LINE_COLOR,
}: {
  stars: [number, number, number][]; lines: [number, number][]
  opacity?: number; color?: string
}) {
  return (
    <group>
      {lines.map(([a, b], i) => (
        <Line key={i} points={[stars[a], stars[b]]} color={color} lineWidth={2.5} transparent opacity={opacity} toneMapped={false} />
      ))}
    </group>
  )
}

// ────────────────────────────────────────────────────────────────────
// Constellation groups
// ────────────────────────────────────────────────────────────────────
function Constellations() {
  const rng1 = useMemo(() => seededRandom(4242), [])
  const rng2 = useMemo(() => seededRandom(5353), [])
  const rng3 = useMemo(() => seededRandom(6161), [])
  const rng4 = useMemo(() => seededRandom(7171), [])
  const rng5 = useMemo(() => seededRandom(8181), [])
  const rng6 = useMemo(() => seededRandom(9191), [])
  const fragments = useMemo(generateFragments, [])

  return (
    <group>
      {/* Big Dipper — largest and brightest */}
      {BIG_DIPPER.map((pos, i) => (
        <CStar key={`bd-${i}`} position={pos} color={i === 0 ? GOLD_BRIGHT : STAR_GOLD}
          size={i === 0 ? 0.5 : 0.35 + rng1() * 0.08} pulseSpeed={0.3 + rng1() * 0.4} />
      ))}
      <CLines stars={BIG_DIPPER} lines={BIG_DIPPER_LINES} opacity={0.55} color="#8A9AC8" />

      {/* Cassiopeia */}
      {CASSIOPEIA.map((pos, i) => (
        <CStar key={`ca-${i}`} position={pos} color={i % 2 === 0 ? STAR_PURPLE : STAR_GOLD}
          size={0.25 + rng2() * 0.08} pulseSpeed={0.4 + rng2() * 0.5} />
      ))}
      <CLines stars={CASSIOPEIA} lines={CASSIOPEIA_LINES} opacity={0.4} />

      {/* Orion */}
      {ORION.map((pos, i) => (
        <CStar key={`or-${i}`} position={pos}
          color={i === 0 ? WARM_AMBER : i === 6 ? '#A8C8F0' : STAR_GOLD}
          size={i <= 1 || i >= 5 ? 0.28 : 0.2 + rng3() * 0.06} pulseSpeed={0.4 + rng3() * 0.5} />
      ))}
      <CLines stars={ORION} lines={ORION_LINES} opacity={0.35} />

      {/* Lyra — Vega is bright */}
      {LYRA.map((pos, i) => (
        <CStar key={`ly-${i}`} position={pos} color={i === 0 ? '#E8E0D0' : STAR_PURPLE}
          size={i === 0 ? 0.32 : 0.18 + rng4() * 0.06} pulseSpeed={0.5 + rng4() * 0.4} />
      ))}
      <CLines stars={LYRA} lines={LYRA_LINES} opacity={0.3} />

      {/* Corona Borealis */}
      {CORONA.map((pos, i) => (
        <CStar key={`co-${i}`} position={pos} color={i % 2 === 0 ? STAR_WARM : STAR_PURPLE}
          size={0.18 + rng5() * 0.06} pulseSpeed={0.4 + rng5() * 0.5} />
      ))}
      <CLines stars={CORONA} lines={CORONA_LINES} opacity={0.3} />

      {/* Cygnus */}
      {CYGNUS.map((pos, i) => (
        <CStar key={`cy-${i}`} position={pos} color={i === 0 ? '#E0D8C0' : STAR_GOLD}
          size={i === 0 ? 0.28 : 0.18 + rng6() * 0.06} pulseSpeed={0.4 + rng6() * 0.5} />
      ))}
      <CLines stars={CYGNUS} lines={CYGNUS_LINES} opacity={0.3} />

      {/* Triangulum — high up */}
      {TRIANGULUM.map((pos, i) => (
        <CStar key={`tr-${i}`} position={pos} color={i === 0 ? STAR_GOLD : STAR_PURPLE}
          size={0.2} pulseSpeed={0.5} />
      ))}
      <CLines stars={TRIANGULUM} lines={TRIANGULUM_LINES} opacity={0.25} />

      {/* Scattered fragments */}
      {fragments.map((frag, i) => (
        <group key={`fr-${i}`}>
          {frag.stars.map((pos, j) => (
            <CStar key={j} position={pos}
              color={j % 3 === 0 ? STAR_PURPLE : j % 3 === 1 ? STAR_GOLD : STAR_WARM}
              size={0.06 + (j % 3) * 0.03} pulseSpeed={0.4 + i * 0.1} />
          ))}
          <CLines stars={frag.stars} lines={frag.lines} opacity={0.12} />
        </group>
      ))}
    </group>
  )
}

// ────────────────────────────────────────────────────────────────────
// Countryside — dark paddy grid, road, farmhouse
// ────────────────────────────────────────────────────────────────────
function Countryside() {
  const paddies = useMemo(() => {
    const rng = seededRandom(1234)
    const cells: { x: number; z: number; w: number; d: number }[] = []
    for (let gx = -5; gx <= 5; gx++) {
      for (let gz = -5; gz <= 5; gz++) {
        if (Math.abs(gx) === 0 && gz > -3) continue
        cells.push({
          x: gx * 5 + (rng() - 0.5) * 1,
          z: gz * 5 + (rng() - 0.5) * 1,
          w: 3.5 + rng() * 1.5,
          d: 3.5 + rng() * 1.5,
        })
      }
    }
    return cells
  }, [])

  return (
    <group>
      {/* Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}>
        <planeGeometry args={[120, 120]} />
        <meshStandardMaterial color={GROUND_DARK} roughness={0.95} />
      </mesh>

      {/* Paddy dikes first (darker borders) */}
      {paddies.map((p, i) => (
        <mesh key={`dk-${i}`} position={[p.x, 0.015, p.z]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[p.w + 0.4, p.d + 0.4]} />
          <meshStandardMaterial color="#0C1208" roughness={0.95} />
        </mesh>
      ))}

      {/* Paddy water — slightly reflective surfaces */}
      {paddies.map((p, i) => (
        <mesh key={`pd-${i}`} position={[p.x, 0.025, p.z]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[p.w, p.d]} />
          <meshStandardMaterial
            color="#0E1830" roughness={0.1} metalness={0.9}
            transparent opacity={0.7} envMapIntensity={2}
          />
        </mesh>
      ))}

      {/* Road — slightly lighter to be distinguishable */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
        <planeGeometry args={[2, 50]} />
        <meshStandardMaterial color="#1E1810" roughness={0.9} metalness={0.05} />
      </mesh>

      <Farmhouse position={[4, 0, 3]} />
    </group>
  )
}

// ────────────────────────────────────────────────────────────────────
// Farmhouse
// ────────────────────────────────────────────────────────────────────
function Farmhouse({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.3, 0]}>
        <boxGeometry args={[2.2, 0.6, 1.6]} />
        <meshStandardMaterial color={HOUSE_WALL} roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.65, 0]}>
        <boxGeometry args={[2.8, 0.1, 2.0]} />
        <meshStandardMaterial color="#100C08" roughness={0.8} />
      </mesh>
      {/* Door — bright warm glow */}
      <mesh position={[0, 0.25, 0.81]}>
        <boxGeometry args={[0.5, 0.5, 0.02]} />
        <meshBasicMaterial color={HOUSE_GLOW} toneMapped={false} />
      </mesh>
      {/* Window */}
      <mesh position={[0.8, 0.35, 0.81]}>
        <boxGeometry args={[0.35, 0.3, 0.02]} />
        <meshBasicMaterial color={HOUSE_GLOW} transparent opacity={0.6} toneMapped={false} />
      </mesh>
      <pointLight color={HOUSE_GLOW} intensity={10} distance={10} decay={2} position={[0, 0.4, 1.5]} />
      {/* Ground glow spill */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 2.5]}>
        <circleGeometry args={[3.5, 16]} />
        <meshBasicMaterial color={HOUSE_GLOW} transparent opacity={0.06} depthWrite={false} toneMapped={false} />
      </mesh>
      <ParentDot position={[0, 0.35, 0.9]} />
    </group>
  )
}

function ParentDot({ position }: { position: [number, number, number] }) {
  const mRef = useRef<THREE.Mesh>(null)
  const gRef = useRef<THREE.Mesh>(null)
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    const p = Math.sin(t * 0.7) * 0.08 + 1
    if (mRef.current) mRef.current.scale.setScalar(p)
    if (gRef.current) {
      gRef.current.scale.setScalar(p);
      (gRef.current.material as THREE.MeshBasicMaterial).opacity = 0.3 + Math.sin(t * 0.5) * 0.05
    }
  })
  return (
    <group position={position}>
      <mesh ref={mRef}>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshBasicMaterial color={PARENT_WARM} toneMapped={false} />
      </mesh>
      <mesh ref={gRef}>
        <sphereGeometry args={[0.15, 8, 8]} />
        <meshBasicMaterial color={PARENT_WARM} transparent opacity={0.35} depthWrite={false} toneMapped={false} />
      </mesh>
      {/* Cross sparkle */}
      <mesh>
        <planeGeometry args={[0.8, 0.02]} />
        <meshBasicMaterial color={PARENT_WARM} transparent opacity={0.3} depthWrite={false} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <planeGeometry args={[0.5, 0.02]} />
        <meshBasicMaterial color={PARENT_WARM} transparent opacity={0.2} depthWrite={false} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

// ────────────────────────────────────────────────────────────────────
// Golden figure on the road
// ────────────────────────────────────────────────────────────────────
function GoldenFigure() {
  const mRef = useRef<THREE.Mesh>(null)
  const hRef = useRef<THREE.Mesh>(null)
  const oRef = useRef<THREE.Mesh>(null)
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    const p = Math.sin(t * 0.5) * 0.08 + 1
    if (mRef.current) mRef.current.scale.setScalar(p)
    if (hRef.current) hRef.current.scale.setScalar(p)
    if (oRef.current) {
      oRef.current.scale.setScalar(p);
      (oRef.current.material as THREE.MeshBasicMaterial).opacity = 0.15 + Math.sin(t * 0.35) * 0.04
    }
  })
  return (
    <group position={[0, 0.1, 2]}>
      {/* Core dot — small but intense */}
      <mesh ref={mRef}>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshBasicMaterial color={GOLD_BRIGHT} toneMapped={false} />
      </mesh>
      {/* Warm halo */}
      <mesh ref={hRef}>
        <sphereGeometry args={[0.12, 8, 8]} />
        <meshBasicMaterial color={GOLD} transparent opacity={0.4} depthWrite={false} toneMapped={false} />
      </mesh>
      {/* Outer glow */}
      <mesh ref={oRef}>
        <sphereGeometry args={[0.22, 8, 8]} />
        <meshBasicMaterial color={WARM_AMBER} transparent opacity={0.1} depthWrite={false} toneMapped={false} />
      </mesh>
      {/* Cross sparkle — horizontal */}
      <mesh>
        <planeGeometry args={[0.8, 0.012]} />
        <meshBasicMaterial color={GOLD_BRIGHT} transparent opacity={0.35} depthWrite={false} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
      {/* Cross sparkle — vertical */}
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <planeGeometry args={[0.5, 0.012]} />
        <meshBasicMaterial color={GOLD_BRIGHT} transparent opacity={0.25} depthWrite={false} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
      <pointLight color={GOLD} intensity={4} distance={5} decay={2} />
    </group>
  )
}

// ────────────────────────────────────────────────────────────────────
// Reflection layer — dots mirrored in paddy water (the symmetry)
// These are emissive dots ON the ground surface, not physical reflections
// ────────────────────────────────────────────────────────────────────
const REFLECT_COUNT = 800

function ReflectionDots() {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const dummy = useMemo(() => new THREE.Object3D(), [])

  const dots = useMemo(() => {
    const rng = seededRandom(9955)
    return Array.from({ length: REFLECT_COUNT }, () => {
      const angle = rng() * Math.PI * 2
      const r = 1 + rng() * 35
      return {
        x: Math.cos(angle) * r,
        z: Math.sin(angle) * r * 0.6 - 5,
        size: 0.05 + rng() * 0.15,
        warmth: rng(),
        flickerSpeed: 0.5 + rng() * 1.8,
        flickerPhase: rng() * Math.PI * 2,
      }
    })
  }, [])

  const colorArray = useMemo(() => {
    const arr = new Float32Array(REFLECT_COUNT * 3)
    const gold = new THREE.Color(STAR_GOLD)
    const purple = new THREE.Color(STAR_PURPLE)
    const tmp = new THREE.Color()
    for (let i = 0; i < REFLECT_COUNT; i++) {
      tmp.copy(gold).lerp(purple, dots[i].warmth).multiplyScalar(1.2)
      arr[i * 3] = tmp.r
      arr[i * 3 + 1] = tmp.g
      arr[i * 3 + 2] = tmp.b
    }
    return arr
  }, [dots])

  useFrame(({ clock }) => {
    if (!meshRef.current) return
    const t = clock.getElapsedTime()
    for (let i = 0; i < REFLECT_COUNT; i++) {
      const d = dots[i]
      const flicker = Math.sin(t * d.flickerSpeed + d.flickerPhase)
      const sz = flicker > -0.3 ? d.size * (flicker * 0.25 + 0.8) : 0
      const rx = Math.sin(t * 0.3 + d.x * 0.2) * 0.03
      const rz = Math.cos(t * 0.25 + d.z * 0.2) * 0.03
      dummy.position.set(d.x + rx, 0.04, d.z + rz)
      dummy.scale.setScalar(Math.max(0, sz))
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(i, dummy.matrix)
    }
    meshRef.current.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, REFLECT_COUNT]}>
      <sphereGeometry args={[1, 6, 6]} />
      <meshBasicMaterial vertexColors transparent opacity={0.6} depthWrite={false} toneMapped={false} />
      <instancedBufferAttribute attach="geometry-attributes-color" args={[colorArray, 3]} />
    </instancedMesh>
  )
}

// ────────────────────────────────────────────────────────────────────
// Reflected constellation lines on the ground
// ────────────────────────────────────────────────────────────────────
function ReflectedCLines({
  stars, lines, opacity = 0.08, scale = 0.5,
}: {
  stars: [number, number, number][]; lines: [number, number][]
  opacity?: number; scale?: number
}) {
  const mirrored = useMemo(() =>
    stars.map(([x, , z]): [number, number, number] => [x * scale, 0.055, z * scale])
  , [stars, scale])
  return (
    <group>
      {lines.map(([a, b], i) => (
        <Line key={i} points={[mirrored[a], mirrored[b]]} color="#5A6A98" lineWidth={1.5} transparent opacity={opacity} toneMapped={false} />
      ))}
    </group>
  )
}

// ────────────────────────────────────────────────────────────────────
// Reflected constellation stars — large dots on ground mirroring named stars
// ────────────────────────────────────────────────────────────────────
function ReflectedCStars({
  stars, color = STAR_GOLD, baseSize = 0.06, scale = 0.5,
}: {
  stars: [number, number, number][]; color?: string;
  baseSize?: number; scale?: number
}) {
  const gRef = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (!gRef.current) return
    const t = clock.getElapsedTime()
    gRef.current.children.forEach((child, i) => {
      const pulse = Math.sin(t * 0.6 + i * 1.1) * 0.15 + 1
      child.scale.setScalar(pulse)
    })
  })
  return (
    <group ref={gRef}>
      {stars.map(([x, , z], i) => (
        <group key={i} position={[x * scale, 0.06, z * scale]}>
          <mesh>
            <sphereGeometry args={[baseSize, 8, 8]} />
            <meshBasicMaterial color={color} toneMapped={false} />
          </mesh>
          <mesh>
            <sphereGeometry args={[baseSize * 2.5, 8, 8]} />
            <meshBasicMaterial color={color} transparent opacity={0.2} toneMapped={false} depthWrite={false} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

// ────────────────────────────────────────────────────────────────────
// Camera — high altitude, gentle drift
// ────────────────────────────────────────────────────────────────────
function CameraRig() {
  const yieldCamera = useCameraHandoff()
  useFrame(({ camera, clock }) => {
    if (yieldCamera()) return
    const t = clock.getElapsedTime()
    camera.position.set(
      Math.sin(t * 0.02) * 0.5,
      12 + Math.sin(t * 0.015) * 0.3,
      30 + Math.cos(t * 0.018) * 0.3,
    )
    camera.lookAt(
      Math.sin(t * 0.012) * 0.3,
      16,
      -15 + Math.cos(t * 0.01) * 0.5,
    )
  })
  return null
}

// ────────────────────────────────────────────────────────────────────
// Scene
// ────────────────────────────────────────────────────────────────────
function SceneContent() {
  return (
    <>
      <ambientLight intensity={0.08} color="#6070B0" />

      <fog attach="fog" args={['#060E22', 100, 250]} />
      <color attach="background" args={['#060E22']} />

      <CameraRig />

      {/* Sky dome — slightly lighter than pure black */}
      <mesh>
        <sphereGeometry args={[150, 32, 32]} />
        <meshBasicMaterial color="#0A1230" side={THREE.BackSide} />
      </mesh>

      {/* Milky way band — subtle brightening across the sky */}
      <mesh position={[0, 50, -20]} rotation={[0.3, 0.2, 0.15]}>
        <planeGeometry args={[60, 15]} />
        <meshBasicMaterial color="#1A1840" transparent opacity={0.06} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>

      {/* Horizon glow — warm atmospheric band */}
      <mesh position={[0, 4, -25]}>
        <planeGeometry args={[140, 8]} />
        <meshBasicMaterial color="#1A1430" transparent opacity={0.1} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>

      {/* SKY: constellation field */}
      <SkyStarField />
      <Constellations />

      {/* GROUND: countryside + reflections */}
      <Countryside />
      <ReflectionDots />
      <ReflectedCLines stars={BIG_DIPPER} lines={BIG_DIPPER_LINES} opacity={0.35} scale={0.5} />
      <ReflectedCLines stars={CASSIOPEIA} lines={CASSIOPEIA_LINES} opacity={0.25} scale={0.5} />
      <ReflectedCLines stars={ORION} lines={ORION_LINES} opacity={0.25} scale={0.5} />
      <ReflectedCLines stars={LYRA} lines={LYRA_LINES} opacity={0.2} scale={0.5} />
      <ReflectedCLines stars={CYGNUS} lines={CYGNUS_LINES} opacity={0.2} scale={0.5} />
      <ReflectedCStars stars={BIG_DIPPER} color={STAR_GOLD} baseSize={0.2} scale={0.5} />
      <ReflectedCStars stars={CASSIOPEIA} color={STAR_PURPLE} baseSize={0.14} scale={0.5} />
      <ReflectedCStars stars={ORION} color={STAR_GOLD} baseSize={0.14} scale={0.5} />
      <ReflectedCStars stars={LYRA} color={STAR_PURPLE} baseSize={0.12} scale={0.5} />
      <ReflectedCStars stars={CYGNUS} color={STAR_GOLD} baseSize={0.12} scale={0.5} />
      <ReflectedCStars stars={CORONA} color={STAR_WARM} baseSize={0.1} scale={0.5} />

      {/* THE TWO */}
      <GoldenFigure />
    </>
  )
}

// ────────────────────────────────────────────────────────────────────
export default function Act9_B() {
  return (
    <div style={{ width: '100vw', height: '100vh', background: '#060E22' }}>
      <Canvas
        camera={{ position: [0, 12, 30], fov: 75, near: 0.1, far: 300 }}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 2.0,
        }}
        dpr={[1, 2]}
      >
        <DebugCamera />
        <SceneContent />
        <EffectComposer>
          <Bloom intensity={1.2} luminanceThreshold={0.15} luminanceSmoothing={0.8} mipmapBlur />
          <Vignette eskil={false} offset={0.2} darkness={0.4} />
        </EffectComposer>
      </Canvas>
    </div>
  )
}
