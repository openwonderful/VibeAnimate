import { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { GoldFigure } from '../characters/goldFigure'
import { EffectComposer, Bloom, DepthOfField, Vignette } from '@react-three/postprocessing'
import * as THREE from 'three'
import type { PointLight as PointLightType, Group } from 'three'
import { DebugCamera } from '../DebugCamera'

/**
 * Act 5-B — "Leaving" — THE THRESHOLD
 *
 * Camera at the doorway of a Korean farmhouse. The doorframe SPLITS
 * the composition in half: LEFT side is the warm amber interior
 * (parent reaching out, table with bowl, oil lamp). RIGHT side is
 * the cold blue-grey exterior (golden figure walking away on the
 * road, bare trees, grey paddies). A literal threshold between
 * warm home and cold world.
 */

// ── Palette ─────────────────────────────────────────────────────
const FOG_COLOR = '#0F1828'
const GROUND_COLD = '#1A2030'
const GROUND_WARM = '#3A2E1C'
const ROAD_COLOR = '#3E3228'
const PADDY_COLOR = '#142820'
const PADDY_WATER = '#0E1828'
const GOLD = '#D4A843'
const GOLD_DIM = '#8B6914'
const AMBER_PARENT = '#C4913A'
const HOUSE_GLOW = '#F5C36C'
const HOUSE_GLOW_WARM = '#E8A030'
const LAMP_FLAME = '#FFCC55'
const WALL_INSIDE = '#D4BFA0'
const WOOD_DARK = '#3A2A1A'
const WOOD_MED = '#5C4430'
const ROOF_COLOR = '#2C2420'
const STONE_FOUNDATION = '#5A5A52'
const FLOOR_WOOD = '#8A6E50'
const HANJI_WARM = '#FFF0D0'
const COLD_BLUE = '#2A3858'

// ── Stick Figure ────────────────────────────────────────────────

// Bodies are rendered by <GoldFigure>; the bag stays as a separate mesh.
function ShoulderBag() {
  return (
    <group position={[0.22, 1.30, -0.10]}>
      <mesh position={[-0.05, 0.08, 0.05]} rotation={[0, 0, -0.3]}>
        <cylinderGeometry args={[0.01, 0.01, 0.5, 6]} />
        <meshStandardMaterial color={GOLD_DIM} emissive={GOLD_DIM} emissiveIntensity={0.3} />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.1, 8, 8]} />
        <meshStandardMaterial color="#7C5E43" emissive="#5C4433" emissiveIntensity={0.2} roughness={0.9} />
      </mesh>
    </group>
  )
}

// ── Doorframe ───────────────────────────────────────────────────

function Doorframe() {
  const woodMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: WOOD_DARK,
        emissive: '#1A1008',
        emissiveIntensity: 0.3,
        roughness: 0.9,
      }),
    [],
  )

  return (
    <group position={[0, 0, 0]}>
      {/* Left door post */}
      <mesh position={[-0.65, 1.0, 0]} material={woodMat}>
        <boxGeometry args={[0.12, 2.0, 0.14]} />
      </mesh>
      {/* Right door post */}
      <mesh position={[0.65, 1.0, 0]} material={woodMat}>
        <boxGeometry args={[0.12, 2.0, 0.14]} />
      </mesh>
      {/* Lintel (top beam) */}
      <mesh position={[0, 2.05, 0]} material={woodMat}>
        <boxGeometry args={[1.42, 0.14, 0.16]} />
      </mesh>
      {/* Threshold step at bottom */}
      <mesh position={[0, -0.02, 0]}>
        <boxGeometry args={[1.42, 0.08, 0.22]} />
        <meshStandardMaterial color={STONE_FOUNDATION} emissive="#2A2A22" emissiveIntensity={0.2} roughness={0.95} />
      </mesh>
      {/* Inner lip detail — left */}
      <mesh position={[-0.58, 1.0, 0.04]} material={woodMat}>
        <boxGeometry args={[0.02, 2.0, 0.05]} />
      </mesh>
      {/* Inner lip detail — right */}
      <mesh position={[0.58, 1.0, 0.04]} material={woodMat}>
        <boxGeometry args={[0.02, 2.0, 0.05]} />
      </mesh>
    </group>
  )
}

// ── Interior (left side — warm) ─────────────────────────────────

function Interior() {
  const lampRef = useRef<PointLightType>(null)

  useFrame(({ clock }) => {
    if (lampRef.current) {
      const t = clock.getElapsedTime()
      lampRef.current.intensity =
        5.0 + Math.sin(t * 1.8) * 0.6 + Math.sin(t * 4.1) * 0.3 + Math.sin(t * 7.3) * 0.15
    }
  })

  return (
    <group position={[-1.2, 0, 0.0]}>
      {/* Interior back wall — warmly lit */}
      <mesh position={[0, 1.0, 1.5]}>
        <boxGeometry args={[2.6, 2.2, 0.08]} />
        <meshStandardMaterial
          color={WALL_INSIDE}
          emissive="#6B5530"
          emissiveIntensity={0.2}
          roughness={0.85}
        />
      </mesh>

      {/* Left side wall — extends from back wall to front wall */}
      <mesh position={[-1.3, 1.0, 0.7]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[1.6, 2.2, 0.08]} />
        <meshStandardMaterial
          color={WALL_INSIDE}
          emissive="#5A4528"
          emissiveIntensity={0.15}
          roughness={0.85}
        />
      </mesh>

      {/* Wooden floor — warm ondol floor */}
      <mesh position={[0, 0.01, 0.7]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.6, 1.6]} />
        <meshStandardMaterial
          color={FLOOR_WOOD}
          emissive="#4A3520"
          emissiveIntensity={0.2}
          roughness={0.8}
        />
      </mesh>

      {/* Ceiling */}
      <mesh position={[0, 2.08, 0.7]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.6, 1.6]} />
        <meshStandardMaterial color={WOOD_MED} emissive="#2A1A0C" emissiveIntensity={0.15} roughness={0.9} />
      </mesh>

      {/* Low table (soban) — visible to the left of the door */}
      <group position={[-0.3, 0.0, 0.6]}>
        <mesh position={[0, 0.28, 0]}>
          <boxGeometry args={[0.5, 0.03, 0.35]} />
          <meshStandardMaterial color={WOOD_MED} emissive="#3A2818" emissiveIntensity={0.2} roughness={0.8} />
        </mesh>
        {[
          [-0.2, 0.14, -0.14],
          [0.2, 0.14, -0.14],
          [-0.2, 0.14, 0.14],
          [0.2, 0.14, 0.14],
        ].map((pos, i) => (
          <mesh key={i} position={pos as [number, number, number]}>
            <cylinderGeometry args={[0.015, 0.02, 0.26, 6]} />
            <meshStandardMaterial color={WOOD_DARK} emissive="#1A0E06" emissiveIntensity={0.15} roughness={0.9} />
          </mesh>
        ))}

        {/* Rice bowl on table */}
        <group position={[0, 0.32, 0]}>
          <mesh>
            <cylinderGeometry args={[0.06, 0.04, 0.05, 12]} />
            <meshStandardMaterial color="#E8E0D0" emissive="#8A7A60" emissiveIntensity={0.15} roughness={0.6} />
          </mesh>
          <mesh position={[0, 0.02, 0]}>
            <sphereGeometry args={[0.05, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color="#F5F0E8" emissive="#A09080" emissiveIntensity={0.1} roughness={0.9} />
          </mesh>
        </group>

        {/* Chopsticks beside bowl */}
        <group position={[0.12, 0.31, 0.02]}>
          <mesh rotation={[0, 0, 0.05]} position={[0, 0, -0.015]}>
            <cylinderGeometry args={[0.004, 0.003, 0.2, 4]} />
            <meshStandardMaterial color={WOOD_DARK} emissive="#1A0E06" emissiveIntensity={0.2} />
          </mesh>
          <mesh rotation={[0, 0, -0.03]} position={[0, 0, 0.015]}>
            <cylinderGeometry args={[0.004, 0.003, 0.2, 4]} />
            <meshStandardMaterial color={WOOD_DARK} emissive="#1A0E06" emissiveIntensity={0.2} />
          </mesh>
        </group>
      </group>

      {/* Oil lamp — on floor near table */}
      <group position={[0.3, 0.0, 0.7]}>
        <mesh position={[0, 0.04, 0]}>
          <cylinderGeometry args={[0.06, 0.07, 0.04, 12]} />
          <meshStandardMaterial color="#8B7355" emissive="#5A4A30" emissiveIntensity={0.3} metalness={0.3} roughness={0.7} />
        </mesh>
        <mesh position={[0, 0.08, 0]}>
          <cylinderGeometry args={[0.04, 0.05, 0.04, 10]} />
          <meshStandardMaterial color="#6B5335" emissive="#4A3A22" emissiveIntensity={0.2} roughness={0.8} />
        </mesh>
        <mesh position={[0, 0.12, 0]}>
          <cylinderGeometry args={[0.005, 0.005, 0.04, 6]} />
          <meshStandardMaterial color="#3A3020" />
        </mesh>
        {/* Flame — bright emissive */}
        <mesh position={[0, 0.16, 0]}>
          <sphereGeometry args={[0.025, 8, 8]} />
          <meshBasicMaterial color={LAMP_FLAME} toneMapped={false} />
        </mesh>
        {/* Flame outer glow */}
        <mesh position={[0, 0.16, 0]}>
          <sphereGeometry args={[0.06, 8, 8]} />
          <meshBasicMaterial
            color={HOUSE_GLOW_WARM}
            transparent
            opacity={0.2}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
        {/* Larger glow halo */}
        <mesh position={[0, 0.16, 0]}>
          <sphereGeometry args={[0.15, 8, 8]} />
          <meshBasicMaterial
            color={HOUSE_GLOW}
            transparent
            opacity={0.06}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
        {/* Lamp light source */}
        <pointLight
          ref={lampRef}
          position={[0, 0.25, 0]}
          color={HOUSE_GLOW_WARM}
          intensity={5.0}
          distance={5}
          decay={2}
        />
      </group>

      {/* Hanji sliding door panel — on the left wall */}
      <mesh position={[-1.2, 1.0, 0.6]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[0.6, 1.6, 0.03]} />
        <meshStandardMaterial
          color={HANJI_WARM}
          emissive={HOUSE_GLOW}
          emissiveIntensity={0.3}
          transparent
          opacity={0.85}
          roughness={0.95}
        />
      </mesh>

      {/* Wooden beam across ceiling */}
      <mesh position={[0, 2.0, 0.7]}>
        <boxGeometry args={[3.0, 0.06, 0.08]} />
        <meshStandardMaterial color={WOOD_DARK} emissive="#1A0E06" emissiveIntensity={0.15} roughness={0.9} />
      </mesh>

      {/* Warm light fill for interior */}
      <pointLight
        position={[0, 1.5, 0.6]}
        color={HOUSE_GLOW}
        intensity={5.0}
        distance={6}
        decay={2}
      />

      {/* Additional warm fill from below (ondol floor heating glow) */}
      <pointLight
        position={[0, 0.1, 0.6]}
        color="#E89040"
        intensity={2.5}
        distance={4}
        decay={2}
      />
    </group>
  )
}

// ── Shoes by the Door ───────────────────────────────────────────

function Shoes() {
  const shoeMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#5A4838', emissive: '#2A1E10', emissiveIntensity: 0.2, roughness: 0.9 }),
    [],
  )
  return (
    <group position={[0.15, 0.0, 0.05]}>
      {/* Parent's shoes — present */}
      <group position={[0.35, 0.015, 0.05]}>
        <mesh position={[-0.05, 0, 0]} rotation={[0, -0.1, 0]} material={shoeMat}>
          <boxGeometry args={[0.06, 0.03, 0.14]} />
        </mesh>
        <mesh position={[0.05, 0, 0]} rotation={[0, 0.15, 0]} material={shoeMat}>
          <boxGeometry args={[0.06, 0.03, 0.14]} />
        </mesh>
      </group>
      {/* Empty spot — scuff mark where shoes were */}
      <mesh position={[-0.25, 0.005, 0.05]} rotation={[-Math.PI / 2, 0, 0.2]}>
        <planeGeometry args={[0.14, 0.07]} />
        <meshStandardMaterial
          color="#4A4040"
          emissive="#2A2020"
          emissiveIntensity={0.15}
          transparent
          opacity={0.4}
          depthWrite={false}
        />
      </mesh>
    </group>
  )
}

// ── Parent Figure (inside, reaching toward door) ────────────────

const PARENT_MAT = new THREE.MeshStandardMaterial({
  color: AMBER_PARENT, emissive: AMBER_PARENT, emissiveIntensity: 0.08, roughness: 0.7,
})

function ParentFigure() {
  const groupRef = useRef<Group>(null)

  useFrame(({ clock }) => {
    if (groupRef.current) {
      const t = clock.getElapsedTime()
      groupRef.current.position.y = Math.sin(t * 0.7) * 0.003
      groupRef.current.rotation.z = Math.sin(t * 0.5) * 0.005
    }
  })

  return (
    <group ref={groupRef}>
      <group position={[-0.55, 0.02, 0.2]} rotation={[0, -0.15, 0]} scale={0.6}>
        <GoldFigure
          pose="standing"
          material={PARENT_MAT}
          headForwardTilt={-0.08}
          rightHandAt={[0.28, 1.22, 0.35]}
          leftHandAt={[-0.15, 0.92, 0.05]}
        />
      </group>
    </group>
  )
}

// ── Golden Figure Walking Away (outside) ────────────────────────

const GOLDEN_MAT = new THREE.MeshStandardMaterial({
  color: GOLD, emissive: GOLD, emissiveIntensity: 0.35, roughness: 0.7,
})

function GoldenFigure() {
  const groupRef = useRef<Group>(null)

  useFrame(({ clock }) => {
    if (groupRef.current) {
      const t = clock.getElapsedTime()
      groupRef.current.position.y = Math.sin(t * 2.0) * 0.006
      groupRef.current.rotation.z = Math.sin(t * 2.0) * 0.008
    }
  })

  return (
    <group ref={groupRef}>
      <group position={[0.4, 0.0, -3.5]} rotation={[0, Math.PI * 0.95, 0]} scale={0.5}>
        <GoldFigure pose="walking" animate inPlace material={GOLDEN_MAT} headForwardTilt={0.04} />
        <ShoulderBag />
      </group>
      {/* Faint golden aura around figure */}
      <mesh position={[0.4, 0.5, -3.5]}>
        <sphereGeometry args={[0.4, 12, 12]} />
        <meshBasicMaterial color={GOLD} transparent opacity={0.04} depthWrite={false} />
      </mesh>
    </group>
  )
}

// ── Bare Trees (exterior, cold side) ────────────────────────────

function BareTree({
  position,
  scale = 1,
  seed = 0,
}: {
  position: [number, number, number]
  scale?: number
  seed?: number
}) {
  const branches = useMemo(() => {
    const b: {
      pos: [number, number, number]
      rot: [number, number, number]
      len: number
      thick: number
    }[] = []
    const s = seed * 137.5
    const rng = (i: number) => Math.sin(s + i * 73.13) * 0.5 + 0.5
    b.push({ pos: [0, 1.2, 0], rot: [0, rng(0) * 1, -0.3 - rng(1) * 0.3], len: 0.7 + rng(2) * 0.3, thick: 0.035 })
    b.push({ pos: [0, 1.3, 0], rot: [rng(3) * 0.4, 0.5, 0.2 + rng(4) * 0.2], len: 0.6 + rng(5) * 0.2, thick: 0.03 })
    b.push({ pos: [0, 1.0, 0], rot: [0.3, 0, -0.5 - rng(6) * 0.2], len: 0.5 + rng(7) * 0.2, thick: 0.025 })
    b.push({ pos: [-0.25, 1.6, 0], rot: [0, 0, -0.6], len: 0.35, thick: 0.018 })
    b.push({ pos: [0.2, 1.65, 0.1], rot: [0.2, 0, 0.5], len: 0.3, thick: 0.015 })
    b.push({ pos: [-0.1, 1.45, -0.1], rot: [-0.2, 0, -0.4], len: 0.4, thick: 0.02 })
    b.push({ pos: [0.15, 1.55, 0], rot: [0.3, 0.3, 0.35], len: 0.25, thick: 0.012 })
    return b
  }, [seed])

  const barkMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#2E2218', emissive: '#12100A', emissiveIntensity: 0.3, roughness: 0.95 }),
    [],
  )

  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.45, 0]} material={barkMat}>
        <cylinderGeometry args={[0.05, 0.08, 0.9, 7]} />
      </mesh>
      <mesh position={[0, 1.0, 0]} material={barkMat}>
        <cylinderGeometry args={[0.035, 0.05, 0.4, 7]} />
      </mesh>
      {branches.map((br, i) => (
        <group key={i} position={br.pos} rotation={br.rot}>
          <mesh position={[0, br.len / 2, 0]} material={barkMat}>
            <cylinderGeometry args={[br.thick * 0.5, br.thick, br.len, 5]} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

// ── Rice Paddies (exterior) ─────────────────────────────────────

function RicePaddies() {
  const paddies = useMemo(
    () => [
      { pos: [3, 0.01, -5] as [number, number, number], size: [3, 2.5] },
      { pos: [5, 0.01, -3] as [number, number, number], size: [2.5, 2] },
      { pos: [4, 0.01, -8] as [number, number, number], size: [4, 3] },
      { pos: [1.5, 0.01, -7] as [number, number, number], size: [2, 2.5] },
      { pos: [6, 0.01, -6] as [number, number, number], size: [3, 2] },
      { pos: [2, 0.01, -11] as [number, number, number], size: [5, 3] },
      { pos: [-1, 0.01, -10] as [number, number, number], size: [3, 3] },
      { pos: [5, 0.01, -12] as [number, number, number], size: [4, 2.5] },
    ],
    [],
  )

  return (
    <group>
      {paddies.map((paddy, i) => (
        <group key={i} position={paddy.pos}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[paddy.size[0], paddy.size[1]]} />
            <meshStandardMaterial color={PADDY_COLOR} emissive="#081410" emissiveIntensity={0.2} roughness={0.9} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
            <planeGeometry args={[paddy.size[0] - 0.2, paddy.size[1] - 0.2]} />
            <meshStandardMaterial
              color={PADDY_WATER}
              emissive="#060E18"
              emissiveIntensity={0.15}
              roughness={0.3}
              metalness={0.2}
              transparent
              opacity={0.5}
            />
          </mesh>
        </group>
      ))}
    </group>
  )
}

// ── Dirt Road (receding from door) ──────────────────────────────

function DirtRoad() {
  return (
    <group>
      {/* Main road surface — starts at doorstep, leads into distance */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0.5, 0.015, -6]}>
        <planeGeometry args={[1.5, 20]} />
        <meshStandardMaterial color={ROAD_COLOR} emissive="#1A1410" emissiveIntensity={0.2} roughness={0.95} />
      </mesh>
      {/* Road left edge */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-0.3, 0.01, -6]}>
        <planeGeometry args={[0.4, 20]} />
        <meshStandardMaterial color="#261E16" emissive="#0E0C08" emissiveIntensity={0.15} roughness={0.95} />
      </mesh>
      {/* Road right edge */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[1.3, 0.01, -6]}>
        <planeGeometry args={[0.4, 20]} />
        <meshStandardMaterial color="#261E16" emissive="#0E0C08" emissiveIntensity={0.15} roughness={0.95} />
      </mesh>
    </group>
  )
}

// ── Distant Mountains ───────────────────────────────────────────

function Mountains() {
  const mountains = useMemo(
    () => [
      { pos: [2, 0.5, -22] as [number, number, number], scale: [10, 2.8, 4] as [number, number, number], color: '#141E2E' },
      { pos: [-4, 0.3, -20] as [number, number, number], scale: [7, 2.0, 3] as [number, number, number], color: '#182238' },
      { pos: [8, 0.4, -21] as [number, number, number], scale: [8, 2.3, 3.5] as [number, number, number], color: '#162030' },
      { pos: [0, 0.2, -18] as [number, number, number], scale: [5, 1.5, 3] as [number, number, number], color: '#1A2640' },
    ],
    [],
  )

  return (
    <group>
      {mountains.map((mt, i) => (
        <mesh key={i} position={mt.pos} scale={mt.scale}>
          <coneGeometry args={[1, 1, 6]} />
          <meshStandardMaterial color={mt.color} emissive={mt.color} emissiveIntensity={0.4} roughness={0.95} />
        </mesh>
      ))}
    </group>
  )
}

// ── Ground Mist (exterior only) ─────────────────────────────────

function GroundMist() {
  const groupRef = useRef<Group>(null)
  const clouds = useMemo(() => {
    const c: { pos: [number, number, number]; scale: number; opacity: number }[] = []
    for (let i = 0; i < 25; i++) {
      c.push({
        pos: [
          1 + Math.sin(i * 2.3) * 6,
          0.08 + Math.random() * 0.25,
          -2 - Math.random() * 12,
        ],
        scale: 1.2 + Math.random() * 2.5,
        opacity: 0.06 + Math.random() * 0.08,
      })
    }
    return c
  }, [])

  useFrame(({ clock }) => {
    if (groupRef.current) {
      groupRef.current.position.x = Math.sin(clock.getElapsedTime() * 0.02) * 0.15
    }
  })

  return (
    <group ref={groupRef}>
      {clouds.map((cloud, i) => (
        <mesh key={i} position={cloud.pos} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[cloud.scale, cloud.scale * 0.5]} />
          <meshBasicMaterial
            color="#4A5878"
            transparent
            opacity={cloud.opacity}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  )
}

// ── Exterior Wall / House Exterior ──────────────────────────────

function HouseExterior() {
  // The front wall of the house, with the doorway opening in the center.
  // The wall is split into left and right segments flanking the door.
  // Door opening is ~1.3 units wide centered at x=0.
  return (
    <group position={[0, 0, 0]}>
      {/* Right wall segment — extends from right doorpost outward */}
      <mesh position={[1.8, 1.0, 0]}>
        <boxGeometry args={[1.2, 2.1, 0.12]} />
        <meshStandardMaterial color="#B8A080" emissive="#4A3A20" emissiveIntensity={0.12} roughness={0.9} />
      </mesh>
      {/* Left wall segment — extends from left doorpost into interior */}
      <mesh position={[-1.8, 1.0, 0]}>
        <boxGeometry args={[1.2, 2.1, 0.12]} />
        <meshStandardMaterial color="#C0A888" emissive="#5A4A28" emissiveIntensity={0.18} roughness={0.9} />
      </mesh>

      {/* Roof overhang — visible above doorframe */}
      <mesh position={[0, 2.18, -0.3]} rotation={[0.12, 0, 0]}>
        <boxGeometry args={[5.5, 0.08, 0.8]} />
        <meshStandardMaterial color={ROOF_COLOR} emissive="#141010" emissiveIntensity={0.2} roughness={0.9} />
      </mesh>
      <mesh position={[0, 2.25, 0.1]}>
        <boxGeometry args={[5.5, 0.1, 0.4]} />
        <meshStandardMaterial color={ROOF_COLOR} emissive="#141010" emissiveIntensity={0.2} roughness={0.9} />
      </mesh>

      {/* Foundation stones below */}
      <mesh position={[0, -0.05, 0.0]}>
        <boxGeometry args={[5.5, 0.12, 0.3]} />
        <meshStandardMaterial color={STONE_FOUNDATION} emissive="#2A2A24" emissiveIntensity={0.15} roughness={0.95} />
      </mesh>

      {/* Stepping stone outside door */}
      <mesh position={[0.3, 0.02, -0.5]}>
        <boxGeometry args={[0.5, 0.06, 0.35]} />
        <meshStandardMaterial color="#6A6A62" emissive="#2A2A24" emissiveIntensity={0.15} roughness={0.95} />
      </mesh>

      {/* Courtyard ground just outside */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, -1.0]}>
        <planeGeometry args={[6, 1.5]} />
        <meshStandardMaterial color="#3A3028" emissive="#1A1410" emissiveIntensity={0.15} roughness={0.95} />
      </mesh>
    </group>
  )
}

// ── Warm Light Spill ────────────────────────────────────────────

function WarmLightSpill() {
  return (
    <group>
      {/* Light pool on threshold — trapezoid of warm light spilling out */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.008, -0.3]}>
        <planeGeometry args={[1.3, 0.8]} />
        <meshBasicMaterial
          color={HOUSE_GLOW_WARM}
          transparent
          opacity={0.18}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      {/* Extended warm glow outside door — fading */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.006, -1.0]}>
        <planeGeometry args={[2.0, 1.2]} />
        <meshBasicMaterial
          color={HOUSE_GLOW}
          transparent
          opacity={0.08}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  )
}

// ── Scene Contents ──────────────────────────────────────────────

function SceneContents() {
  return (
    <>
      {/* === LIGHTING === */}

      {/* Scene background — matches body background */}
      <color attach="background" args={['#0C1628']} />
      {/* Sky backdrop — visible above and through openings */}
      <mesh position={[0, 5, -20]}>
        <planeGeometry args={[60, 15]} />
        <meshStandardMaterial color="#0C1628" depthWrite={false} roughness={1} />
      </mesh>

      {/* Ambient — strong to reveal geometry in SwiftShader */}
      <ambientLight color="#4A5580" intensity={1.8} />

      {/* Cold fill from exterior sky — strong */}
      <directionalLight position={[4, 4, -8]} color="#7090D0" intensity={2.0} />

      {/* Pre-dawn from horizon */}
      <directionalLight position={[0, 1, -18]} color="#5070B0" intensity={1.0} />

      {/* Key light from above-front to show doorframe */}
      <directionalLight position={[0, 5, -1]} color="#A0B0D0" intensity={1.5} />

      {/* Warm backlight from interior toward camera */}
      <directionalLight position={[-1, 2, 3]} color={HOUSE_GLOW_WARM} intensity={1.2} />

      {/* Warm interior spill through doorway */}
      <pointLight
        position={[-0.3, 1.2, 0.3]}
        color={HOUSE_GLOW_WARM}
        intensity={4.5}
        distance={7}
        decay={2}
      />

      {/* Secondary warm bounce */}
      <pointLight
        position={[-0.8, 0.5, 0.8]}
        color={HOUSE_GLOW}
        intensity={3.0}
        distance={5}
        decay={2}
      />

      {/* Cold blue fill for exterior scene */}
      <pointLight
        position={[2, 2, -4]}
        color="#4060A0"
        intensity={4.0}
        distance={20}
        decay={2}
      />
      {/* Extra cold light to illuminate the road and figure */}
      <pointLight
        position={[0.8, 2, -3]}
        color="#5070B0"
        intensity={3.0}
        distance={12}
        decay={2}
      />

      {/* === FOG === */}
      <fog attach="fog" args={[FOG_COLOR, 10, 35]} />

      {/* === GROUND === */}

      {/* Exterior ground — cold */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -8]}>
        <planeGeometry args={[40, 40]} />
        <meshStandardMaterial color={GROUND_COLD} emissive="#0A1018" emissiveIntensity={0.2} roughness={0.95} />
      </mesh>

      {/* Interior ground — warm */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-1.2, 0.003, 1.0]}>
        <planeGeometry args={[4, 2]} />
        <meshStandardMaterial color={GROUND_WARM} emissive="#201810" emissiveIntensity={0.2} roughness={0.9} />
      </mesh>

      {/* === STRUCTURE === */}
      <HouseExterior />
      <Doorframe />

      {/* === INTERIOR (LEFT SIDE — WARM) === */}
      <Interior />
      <ParentFigure />
      <Shoes />
      <WarmLightSpill />

      {/* === EXTERIOR (RIGHT SIDE — COLD) === */}
      <DirtRoad />
      <RicePaddies />
      <Mountains />
      <BareTree position={[3.5, 0, -4]} scale={0.9} seed={1} />
      <BareTree position={[5.5, 0, -6]} scale={0.7} seed={2} />
      <BareTree position={[-0.5, 0, -6]} scale={0.6} seed={3} />
      <GoldenFigure />
      <GroundMist />

      {/* Horizon glow */}
      <mesh position={[2, 0.6, -24]}>
        <planeGeometry args={[40, 3.5]} />
        <meshBasicMaterial
          color={COLD_BLUE}
          transparent
          opacity={0.4}
          depthWrite={false}
        />
      </mesh>

      {/* Pre-dawn sky strip — faint lighter band */}
      <mesh position={[0, 1.5, -26]}>
        <planeGeometry args={[50, 4]} />
        <meshBasicMaterial
          color="#1A2845"
          transparent
          opacity={0.5}
          depthWrite={false}
        />
      </mesh>
    </>
  )
}

// ── Main Component ──────────────────────────────────────────────

export default function Act5_B() {
  return (
    <div style={{ width: '100vw', height: '100vh', background: '#080E1F', position: 'relative', overflow: 'hidden' }}>
      <Canvas
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 0.9,
        }}
        camera={{
          // In the house, at eye level, looking straight out through doorway
          position: [-0.1, 1.05, 1.0],
          fov: 66,
          near: 0.05,
          far: 60,
        }}
        // Look slightly downward toward the threshold/road
        onCreated={({ camera }) => {
          camera.lookAt(0.15, 0.8, -4)
        }}
        shadows={false}
      >
        <DebugCamera />
        <SceneContents />
        <EffectComposer>
          <Bloom intensity={0.7} luminanceThreshold={0.35} luminanceSmoothing={0.9} mipmapBlur />
          <DepthOfField focusDistance={0.03} focalLength={0.06} bokehScale={2.5} />
          <Vignette eskil={false} offset={0.15} darkness={0.6} />
        </EffectComposer>
      </Canvas>

      {/* Subtle vignette — very light */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background: `radial-gradient(ellipse 90% 85% at 50% 50%, transparent 55%, rgba(5, 10, 20, 0.6) 100%)`,
        }}
      />

      {/* Left warm tint — amber wash on interior side */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background: `linear-gradient(to right, rgba(232, 160, 48, 0.06) 0%, rgba(232, 160, 48, 0.02) 30%, transparent 45%)`,
        }}
      />

      {/* Right cold tint — blue wash on exterior side */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background: `linear-gradient(to left, rgba(30, 50, 80, 0.08) 0%, rgba(30, 50, 80, 0.03) 30%, transparent 45%)`,
        }}
      />
    </div>
  )
}
