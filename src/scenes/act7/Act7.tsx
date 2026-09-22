import { useRef, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Stars } from '@react-three/drei'
import { EffectComposer, Bloom, DepthOfField, Vignette } from '@react-three/postprocessing'
import * as THREE from 'three'
import { useCameraHandoff } from '../DebugCamera'
import { SceneCanvas } from '../SceneCanvas'
import { GoldGlowFigure } from '../characters/GoldGlowFigure'
import { GoldFigure } from '../characters/goldFigure'

/**
 * Act 7 — "Somebody Like You" — ROAD PERSPECTIVE
 *
 * Dusk deepening to night. Camera behind seven figures walking
 * down a dirt road through rice paddies toward a small warm house.
 * One golden figure (#D4A843) brighter than the rest. The parent
 * stands tiny in the doorway, backlit. Fireflies returning to the
 * paddies. Long shadows. The road that was empty is now alive.
 *
 * Contrast with Act 6's emptiness is stark: the road has people again.
 */

// ── Colors ───────────────────────────────────────────────────────
const NIGHT_SKY       = '#0A1628'
const DUSK_HORIZON    = '#1A2040'
const DUSK_GLOW       = '#2E1A3A'
const ROAD_BROWN      = '#3E2C1E'
const ROAD_EDGE       = '#2A1E14'
const PADDY_DARK      = '#0C1A15'
const PADDY_WATER     = '#0A1520'
const STICK_GOLD      = '#D4A843'
const STICK_AMBER     = '#C4913A'
const HANOK_GLOW      = '#F5C36C'
const HANOK_ROOF      = '#2C2420'
const HANOK_WALL      = '#E8D5B5'
const FIREFLY_WARM    = '#D4C85C'
const SHADOW_COLOR    = '#080E10'
const PERSIMMON       = '#E87830'

// ── Seeded random for deterministic layouts ──────────────────────
function seededRandom(seed: number) {
  let s = seed
  return () => {
    s = (s * 16807 + 0) % 2147483647
    return (s - 1) / 2147483646
  }
}

// ── Walking Stick Figure ─────────────────────────────────────────
// Uses the shared GoldGlowFigure (CharStickGold5G aesthetic) so Act 7's
// crowd matches the parent+child from Act 3 and the Act 4 timelapse.
interface WalkerProps {
  position: [number, number, number]
  glow?: number          // base emissive intensity (0.4 dim → 1.6 bright)
  scale?: number
  phaseOffset?: number   // 0..1, desyncs walk cycle
  isGolden?: boolean
}

function Walker({
  position,
  glow = 0.9,
  scale = 1,
  phaseOffset = 0,
  isGolden = false,
}: WalkerProps) {
  const haloMat = useMemo(() => isGolden ? new THREE.MeshBasicMaterial({
    color: STICK_GOLD,
    toneMapped: false,
    transparent: true,
    opacity: 0.14,
    depthWrite: false,
    side: THREE.DoubleSide,
  }) : null, [isGolden])

  return (
    <group position={position} scale={scale}>
      {/* Facing away from camera — toward the house (negative Z) */}
      <group rotation={[0, Math.PI, 0]}>
        <GoldGlowFigure
          inPlace
          glow={glow}
          phaseOffset={phaseOffset}
          castShadow
        />
        {isGolden && haloMat && (
          <mesh position={[0, 1.1, 0]} material={haloMat}>
            <sphereGeometry args={[0.7, 16, 10]} />
          </mesh>
        )}
      </group>
    </group>
  )
}

// ── Long shadow cast behind a figure ─────────────────────────────
function FigureShadow({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  // Shadow stretches away from the house (positive Z = toward camera)
  const shadowLen = 1.8 * scale
  return (
    <mesh
      position={[position[0], 0.005, position[2] + shadowLen / 2 + 0.3]}
      rotation={[-Math.PI / 2, 0, 0]}
    >
      <planeGeometry args={[0.15 * scale, shadowLen]} />
      <meshStandardMaterial
        color={SHADOW_COLOR}
        transparent
        opacity={0.35}
        depthWrite={false}
      />
    </mesh>
  )
}

// ── The farmhouse at the end of the road ─────────────────────────
function Farmhouse() {
  const glowRef = useRef<THREE.PointLight>(null)

  useFrame(({ clock }) => {
    if (!glowRef.current) return
    const t = clock.getElapsedTime()
    // Gentle hearth flicker
    glowRef.current.intensity = 3.5 + Math.sin(t * 3.7) * 0.3 + Math.sin(t * 7.1) * 0.15
  })

  return (
    <group position={[0, 0, -28]}>
      {/* House body */}
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[1.6, 1.0, 1.2]} />
        <meshStandardMaterial color={HANOK_WALL} emissive={HANOK_GLOW} emissiveIntensity={0.15} roughness={0.85} />
      </mesh>

      {/* Roof — dark traditional */}
      <mesh position={[0, 1.15, 0]} rotation={[0, 0, 0]}>
        <boxGeometry args={[2.0, 0.25, 1.6]} />
        <meshStandardMaterial color={HANOK_ROOF} roughness={0.9} />
      </mesh>
      {/* Roof eaves — slight overhang */}
      <mesh position={[0, 1.05, 0]}>
        <boxGeometry args={[2.2, 0.08, 1.8]} />
        <meshStandardMaterial color={HANOK_ROOF} roughness={0.9} />
      </mesh>

      {/* Doorway opening — bright warm rectangle */}
      <mesh position={[0, 0.4, 0.61]}>
        <planeGeometry args={[0.5, 0.7]} />
        <meshStandardMaterial
          color={HANOK_GLOW}
          emissive={HANOK_GLOW}
          emissiveIntensity={2.0}
          toneMapped={false}
        />
      </mesh>

      {/* Door frame */}
      {[[-0.28, 0.4, 0.62], [0.28, 0.4, 0.62]].map((pos, i) => (
        <mesh key={`dframe-${i}`} position={pos as [number, number, number]}>
          <boxGeometry args={[0.06, 0.75, 0.04]} />
          <meshStandardMaterial color={HANOK_ROOF} roughness={0.9} />
        </mesh>
      ))}
      {/* Door lintel */}
      <mesh position={[0, 0.78, 0.62]}>
        <boxGeometry args={[0.62, 0.06, 0.04]} />
        <meshStandardMaterial color={HANOK_ROOF} roughness={0.9} />
      </mesh>

      {/* Parent silhouette in doorway — tiny, backlit */}
      <ParentInDoorway />

      {/* House warm light spilling out */}
      <pointLight
        ref={glowRef}
        position={[0, 0.6, 1.2]}
        color={HANOK_GLOW}
        intensity={3.5}
        distance={12}
        decay={2}
      />

      {/* Secondary inner glow */}
      <pointLight
        position={[0, 0.5, -0.2]}
        color="#E8B84D"
        intensity={1.5}
        distance={4}
        decay={2}
      />

      {/* Persimmon tree beside the house */}
      <PersimmonTree position={[1.8, 0, -0.3]} />

      {/* Stone wall segments */}
      <mesh position={[-1.5, 0.2, 0.5]}>
        <boxGeometry args={[1.2, 0.4, 0.3]} />
        <meshStandardMaterial color="#4A4A4A" roughness={0.95} />
      </mesh>
      <mesh position={[1.5, 0.15, 0.8]}>
        <boxGeometry args={[0.8, 0.3, 0.25]} />
        <meshStandardMaterial color="#555555" roughness={0.95} />
      </mesh>
    </group>
  )
}

// ── Parent tiny silhouette in doorway ────────────────────────────
const PARENT_DOORWAY_MAT = new THREE.MeshStandardMaterial({
  color: '#1A1008',
  emissive: STICK_AMBER,
  emissiveIntensity: 0.1,
  roughness: 0.8,
})

function ParentInDoorway() {
  // Far-away doorway figure — dim silhouette. Gold5 body is ~1.9 tall;
  // shrink ~0.22 for the miniature scale used here.
  return (
    <group position={[0, 0, 0.63]} scale={0.22}>
      <GoldFigure pose="standing" material={PARENT_DOORWAY_MAT} />
    </group>
  )
}

// ── Persimmon tree ───────────────────────────────────────────────
function PersimmonTree({ position }: { position: [number, number, number] }) {
  const rng = seededRandom(42)
  const fruits = useMemo(() => {
    const arr: [number, number, number][] = []
    for (let i = 0; i < 8; i++) {
      arr.push([
        (rng() - 0.5) * 0.8,
        1.2 + rng() * 0.6,
        (rng() - 0.5) * 0.6,
      ])
    }
    return arr
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <group position={position}>
      {/* Trunk */}
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.06, 0.08, 1.0, 6]} />
        <meshStandardMaterial color="#3E2C1E" roughness={0.9} />
      </mesh>
      {/* Canopy */}
      <mesh position={[0, 1.3, 0]}>
        <sphereGeometry args={[0.6, 8, 6]} />
        <meshStandardMaterial color="#1A2F20" roughness={0.9} />
      </mesh>
      {/* Persimmon fruits — warm orange glow */}
      {fruits.map((pos, i) => (
        <mesh key={i} position={pos}>
          <sphereGeometry args={[0.04, 6, 5]} />
          <meshStandardMaterial
            color={PERSIMMON}
            emissive={PERSIMMON}
            emissiveIntensity={0.5}
            roughness={0.6}
          />
        </mesh>
      ))}
    </group>
  )
}

// ── Dirt road — perspective plane narrowing toward house ──────────
function Road() {
  // Custom shape: wide near camera, narrow at house
  const shape = useMemo(() => {
    const geo = new THREE.BufferGeometry()

    // Road stretches from z=5 (near camera) to z=-30 (at house)
    const segments = 20
    const positions: number[] = []
    const uvs: number[] = []
    const indices: number[] = []

    for (let i = 0; i <= segments; i++) {
      const t = i / segments
      const z = 5 - t * 35  // z from 5 to -30
      // Road width narrows with perspective
      const width = THREE.MathUtils.lerp(3.0, 0.6, t * t)
      positions.push(-width / 2, 0.001, z)
      positions.push(width / 2, 0.001, z)
      uvs.push(0, t)
      uvs.push(1, t)
    }

    for (let i = 0; i < segments; i++) {
      const a = i * 2
      const b = i * 2 + 1
      const c = (i + 1) * 2
      const d = (i + 1) * 2 + 1
      indices.push(a, c, b)
      indices.push(b, c, d)
    }

    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
    geo.setIndex(indices)
    geo.computeVertexNormals()
    return geo
  }, [])

  return (
    <group>
      {/* Main road surface */}
      <mesh geometry={shape}>
        <meshStandardMaterial color={ROAD_BROWN} roughness={0.92} />
      </mesh>
      {/* Road edges — slightly darker */}
      <mesh geometry={shape} position={[0, -0.001, 0]} scale={[1.15, 1, 1]}>
        <meshStandardMaterial color={ROAD_EDGE} roughness={0.95} />
      </mesh>
    </group>
  )
}

// ── Rice paddies — dark reflective planes on either side ─────────
function RicePaddies() {
  const waterMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: PADDY_WATER,
    roughness: 0.15,
    metalness: 0.3,
    envMapIntensity: 0.4,
  }), [])

  const riceMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: PADDY_DARK,
    roughness: 0.8,
  }), [])

  return (
    <group>
      {/* Left paddy — water surface */}
      <mesh position={[-6, -0.02, -12]} rotation={[-Math.PI / 2, 0, 0]} material={waterMat}>
        <planeGeometry args={[10, 40]} />
      </mesh>
      {/* Right paddy — water surface */}
      <mesh position={[6, -0.02, -12]} rotation={[-Math.PI / 2, 0, 0]} material={waterMat}>
        <planeGeometry args={[10, 40]} />
      </mesh>

      {/* Rice stalks — rows of thin cylinders */}
      <RiceStalks side="left" />
      <RiceStalks side="right" />

      {/* Paddy borders / berms */}
      <mesh position={[-1.8, 0.06, -10]} rotation={[-Math.PI / 2, 0, 0]} material={riceMat}>
        <planeGeometry args={[0.3, 35]} />
      </mesh>
      <mesh position={[1.8, 0.06, -10]} rotation={[-Math.PI / 2, 0, 0]} material={riceMat}>
        <planeGeometry args={[0.3, 35]} />
      </mesh>
    </group>
  )
}

// ── Rice stalk rows ──────────────────────────────────────────────
function RiceStalks({ side }: { side: 'left' | 'right' }) {
  const rng = seededRandom(side === 'left' ? 100 : 200)
  const xSign = side === 'left' ? -1 : 1

  const stalks = useMemo(() => {
    const arr: { pos: [number, number, number]; height: number; sway: number }[] = []
    for (let row = 0; row < 12; row++) {
      for (let col = 0; col < 6; col++) {
        const x = xSign * (2.5 + col * 1.2 + (rng() - 0.5) * 0.4)
        const z = -2 + row * -2.5 + (rng() - 0.5) * 0.8
        arr.push({
          pos: [x, 0.15, z],
          height: 0.25 + rng() * 0.15,
          sway: rng() * Math.PI * 2,
        })
      }
    }
    return arr
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [side])

  const groupRef = useRef<THREE.Group>(null)

  useFrame(({ clock }) => {
    if (!groupRef.current) return
    const t = clock.getElapsedTime()
    groupRef.current.children.forEach((child, i) => {
      const stalk = stalks[i]
      if (!stalk) return
      // Wind sway
      child.rotation.x = Math.sin(t * 0.8 + stalk.sway) * 0.06
      child.rotation.z = Math.cos(t * 0.6 + stalk.sway) * 0.04
    })
  })

  return (
    <group ref={groupRef}>
      {stalks.map((s, i) => (
        <mesh key={i} position={s.pos}>
          <cylinderGeometry args={[0.008, 0.01, s.height, 4]} />
          <meshStandardMaterial color="#2A4A2A" roughness={0.9} />
        </mesh>
      ))}
    </group>
  )
}

// ── Fireflies ────────────────────────────────────────────────────
function Fireflies({ count = 120 }: { count?: number }) {
  const ref = useRef<THREE.Points>(null)

  const { basePositions, phases, speeds } = useMemo(() => {
    const rng = seededRandom(777)
    const basePositions = new Float32Array(count * 3)
    const phases = new Float32Array(count)
    const speeds = new Float32Array(count)

    for (let i = 0; i < count; i++) {
      // Cluster near paddies and road edges
      const side = rng() > 0.5 ? 1 : -1
      basePositions[i * 3] = side * (1.5 + rng() * 7)
      basePositions[i * 3 + 1] = 0.15 + rng() * 1.5
      basePositions[i * 3 + 2] = 4 - rng() * 32

      phases[i] = rng() * Math.PI * 2
      speeds[i] = 0.5 + rng() * 1.5
    }
    return { basePositions, phases, speeds }
  }, [count])

  const positions = useMemo(() => new Float32Array(basePositions), [basePositions])

  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = clock.getElapsedTime()
    const pos = ref.current.geometry.attributes.position as THREE.BufferAttribute
    const arr = pos.array as Float32Array

    for (let i = 0; i < count; i++) {
      const phase = phases[i]
      const speed = speeds[i]
      // Gentle drift with pulsing vertical bob
      arr[i * 3] = basePositions[i * 3] + Math.sin(t * speed * 0.3 + phase) * 0.3
      arr[i * 3 + 1] = basePositions[i * 3 + 1] + Math.sin(t * speed + phase) * 0.15
      arr[i * 3 + 2] = basePositions[i * 3 + 2] + Math.cos(t * speed * 0.4 + phase * 1.3) * 0.2
    }
    pos.needsUpdate = true

    // Pulse the overall size/opacity
    const mat = ref.current.material as THREE.PointsMaterial
    mat.size = 0.08 + Math.sin(t * 2) * 0.015
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
        color={FIREFLY_WARM}
        size={0.08}
        transparent
        opacity={0.7}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        sizeAttenuation
      />
    </points>
  )
}

// ── A second firefly layer — closer, larger, warmer ──────────────
function CloseFireflies({ count = 30 }: { count?: number }) {
  const ref = useRef<THREE.Points>(null)

  const { basePositions, phases } = useMemo(() => {
    const rng = seededRandom(999)
    const basePositions = new Float32Array(count * 3)
    const phases = new Float32Array(count)

    for (let i = 0; i < count; i++) {
      // Near the road, closer to camera
      const side = rng() > 0.5 ? 1 : -1
      basePositions[i * 3] = side * (0.5 + rng() * 2.0)
      basePositions[i * 3 + 1] = 0.3 + rng() * 1.0
      basePositions[i * 3 + 2] = 2 - rng() * 8
      phases[i] = rng() * Math.PI * 2
    }
    return { basePositions, phases }
  }, [count])

  const positions = useMemo(() => new Float32Array(basePositions), [basePositions])

  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = clock.getElapsedTime()
    const pos = ref.current.geometry.attributes.position as THREE.BufferAttribute
    const arr = pos.array as Float32Array

    for (let i = 0; i < count; i++) {
      const p = phases[i]
      arr[i * 3] = basePositions[i * 3] + Math.sin(t * 0.7 + p) * 0.15
      arr[i * 3 + 1] = basePositions[i * 3 + 1] + Math.sin(t * 1.2 + p) * 0.2
      arr[i * 3 + 2] = basePositions[i * 3 + 2] + Math.cos(t * 0.5 + p) * 0.1
    }
    pos.needsUpdate = true
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
        color={HANOK_GLOW}
        size={0.14}
        transparent
        opacity={0.55}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        sizeAttenuation
      />
    </points>
  )
}

// ── Ground plane ─────────────────────────────────────────────────
function Ground() {
  return (
    <mesh position={[0, -0.01, -10]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[50, 60]} />
      <meshStandardMaterial color="#0A0E08" roughness={0.95} />
    </mesh>
  )
}

// ── Dusk sky gradient — hemisphere behind the house ──────────────
function DuskSky() {
  // Gradient backdrop using a large plane behind the house
  return (
    <group position={[0, 8, -45]}>
      {/* Deep sky */}
      <mesh>
        <planeGeometry args={[80, 30]} />
        <meshBasicMaterial color={NIGHT_SKY} />
      </mesh>
      {/* Horizon glow — warm dusk band */}
      <mesh position={[0, -10, 0.1]}>
        <planeGeometry args={[80, 8]} />
        <meshBasicMaterial color={DUSK_HORIZON} />
      </mesh>
      {/* Warm strip right at horizon */}
      <mesh position={[0, -13, 0.2]}>
        <planeGeometry args={[80, 3]} />
        <meshBasicMaterial color={DUSK_GLOW} />
      </mesh>
    </group>
  )
}

// ── Light spill on road from the house ───────────────────────────
function HouseGlowOnRoad() {
  // Cone of warm light on the road surface, stretching toward the figures
  return (
    <mesh position={[0, 0.01, -20]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[2.5, 14]} />
      <meshStandardMaterial
        color={HANOK_GLOW}
        emissive={HANOK_GLOW}
        emissiveIntensity={0.3}
        transparent
        opacity={0.08}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  )
}

// ── Distant mountains on the horizon ─────────────────────────────
function DistantMountains() {
  const peaks = useMemo(() => {
    const rng = seededRandom(555)
    const arr: { x: number; height: number; width: number }[] = []
    for (let i = 0; i < 8; i++) {
      arr.push({
        x: -20 + i * 5.5 + (rng() - 0.5) * 2,
        height: 2 + rng() * 3,
        width: 4 + rng() * 3,
      })
    }
    return arr
  }, [])

  return (
    <group position={[0, 0, -40]}>
      {peaks.map((p, i) => (
        <mesh key={i} position={[p.x, p.height / 2 - 0.5, 0]}>
          <coneGeometry args={[p.width / 2, p.height, 4]} />
          <meshStandardMaterial
            color="#0D1520"
            roughness={1}
          />
        </mesh>
      ))}
    </group>
  )
}

// ── Camera gentle sway ──────────────────────────────────────────
function CameraAnimation() {
  const { camera } = useThree()
  const time = useRef(0)
  const yieldCamera = useCameraHandoff()

  useFrame(({ clock }) => {
    if (yieldCamera()) return
    time.current = clock.getElapsedTime()
    camera.position.x = Math.sin(time.current * 0.1) * 0.08
    camera.position.y = 1.6 + Math.sin(time.current * 0.15) * 0.03
  })

  return null
}

// ── The seven walkers configuration ─────────────────────────────
// Phase offsets are 0..1 (fractions of the GoldGlowFigure walk cycle) so
// gaits don't sync. Glow values differentiate the group: the golden figure
// burns brightest; near figures burn mid; distant silhouettes dim.
const WALKERS: WalkerProps[] = [
  // Closest figures (largest, flanking the road)
  { position: [-0.5, 0, 0.5],  glow: 1.0,  scale: 1.05, phaseOffset: 0.00 },
  { position: [0.6,  0, -0.2], glow: 0.85, scale: 0.95, phaseOffset: 0.19 },
  // Mid-distance cluster
  { position: [-0.3, 0, -3.0], glow: 0.9,  scale: 0.88, phaseOffset: 0.38 },
  // The GOLDEN FIGURE — center of the road, mid-distance
  { position: [0.15, 0, -2.0], glow: 1.6,  scale: 0.92, phaseOffset: 0.13, isGolden: true },
  { position: [0.7,  0, -4.5], glow: 0.75, scale: 0.78, phaseOffset: 0.57 },
  // Further out
  { position: [-0.4, 0, -7.0], glow: 0.65, scale: 0.65, phaseOffset: 0.76 },
  // Farthest — barely more than a silhouette
  { position: [0.2,  0, -10.0], glow: 0.55, scale: 0.52, phaseOffset: 0.88 },
]

// ── Main Scene ───────────────────────────────────────────────────
function RoadScene() {
  return (
    <>
      {/* Lighting */}
      <ambientLight color="#1A1830" intensity={0.3} />

      {/* Moonlight from upper right — cool fill */}
      <directionalLight
        position={[10, 15, -5]}
        color="#8090B0"
        intensity={0.4}
        castShadow={false}
      />

      {/* Warm dusk light from the horizon behind the house */}
      <pointLight
        position={[0, 2, -30]}
        color={HANOK_GLOW}
        intensity={5}
        distance={40}
        decay={2}
      />

      {/* Subtle rim light on figures from behind-camera */}
      <pointLight
        position={[0, 3, 8]}
        color="#3A2A50"
        intensity={1.5}
        distance={15}
        decay={2}
      />

      <CameraAnimation />
      <DuskSky />
      <DistantMountains />

      <Stars
        radius={50}
        depth={30}
        count={2000}
        factor={2.5}
        saturation={0.1}
        fade
        speed={0.3}
      />

      <Ground />
      <Road />
      <RicePaddies />
      <Farmhouse />
      <HouseGlowOnRoad />

      {/* The seven figures walking toward home */}
      {WALKERS.map((w, i) => (
        <Walker key={i} {...w} />
      ))}

      {/* Shadows stretching behind each figure */}
      {WALKERS.map((w, i) => (
        <FigureShadow key={`shadow-${i}`} position={w.position} scale={w.scale} />
      ))}

      {/* Fireflies returning to the paddies */}
      <Fireflies count={120} />
      <CloseFireflies count={30} />

      {/* Fog for depth and atmosphere */}
      <fog attach="fog" args={['#0A1220', 8, 42]} />
    </>
  )
}

// ── Exported Component ───────────────────────────────────────────
export default function Act7() {
  return (
    <div style={{ width: '100vw', height: '100vh', background: NIGHT_SKY }}>
      <SceneCanvas
        style={{ width: '100%', height: '100%' }}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.0,
        }}
        camera={{
          position: [0, 1.6, 4],
          fov: 52,
          near: 0.1,
          far: 80,
        }}
      >
        <RoadScene />
        <EffectComposer>
          <Bloom intensity={0.8} luminanceThreshold={0.3} luminanceSmoothing={0.9} mipmapBlur />
          <DepthOfField focusDistance={0.035} focalLength={0.08} bokehScale={3} />
          <Vignette eskil={false} offset={0.15} darkness={0.6} />
        </EffectComposer>
      </SceneCanvas>
    </div>
  )
}
