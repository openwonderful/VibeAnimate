import { useRef, useMemo, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import * as THREE from 'three'
import { DebugCamera } from '../DebugCamera'
import {
  ADULT,
  CHILD,
  buildBody,
  buildSeatedSpinePoints,
  buildPinnedArmPoints,
  v,
  type Proportions,
} from '../characters/goldFigure'

/**
 * Act 3.3 — "The Table" — Option B: OVERHEAD / BIRD'S-EYE
 *
 * Camera looks straight DOWN at the low table from above. The table is
 * a warm rectangle. Stick-figure silhouettes sit around it, visible as
 * dark shapes against the warm-lit floor. Bowls arranged on the table.
 * The open doorway is visible as a dark rectangle leading to the
 * blue-black outside. Geometric, graphic — like a stage set from above.
 */

// ── Colors ───────────────────────────────────────────────────────
const HANOK_GLOW = '#F5C36C'
const HANOK_WALL = '#E8D5B5'
const HANOK_ROOF = '#2C2420'
const STICK_GOLD = '#D4A843'
const STICK_AMBER = '#C4913A'
const STICK_BROWN = '#8B6914'
const TABLE_WOOD = '#3E2315'
const FLOOR_WARM = '#6B4A35'
const NIGHT_BLUE = '#060D1A'
const BOWL_CLAY = '#7A5C3E'
const TATAMI = '#8B7355'

// ── Overhead Steam Particles ─────────────────────────────────────
// From above, steam looks like softly drifting bright dots near bowls
function SteamFromAbove({ count = 40 }: { count?: number }) {
  const ref = useRef<THREE.Points>(null)

  const { positions, driftX, driftZ, life } = useMemo(() => {
    const positions = new Float32Array(count * 3)
    const driftX = new Float32Array(count)
    const driftZ = new Float32Array(count)
    const life = new Float32Array(count)

    for (let i = 0; i < count; i++) {
      // Spawn near bowl positions on table
      const bowlIdx = Math.floor(Math.random() * 5)
      const bowlPositions: [number, number][] = [
        [-0.3, -0.1], [0.0, -0.15], [0.3, -0.1], [-0.15, 0.12], [0.2, 0.15],
      ]
      const [bx, bz] = bowlPositions[bowlIdx]
      positions[i * 3] = bx + (Math.random() - 0.5) * 0.08
      positions[i * 3 + 1] = 0.2 + Math.random() * 0.8
      positions[i * 3 + 2] = bz + (Math.random() - 0.5) * 0.08
      driftX[i] = (Math.random() - 0.5) * 0.002
      driftZ[i] = (Math.random() - 0.5) * 0.002
      life[i] = Math.random()
    }
    return { positions, driftX, driftZ, life }
  }, [count])

  useFrame(() => {
    if (!ref.current) return
    const pos = ref.current.geometry.attributes.position as THREE.BufferAttribute
    const arr = pos.array as Float32Array

    for (let i = 0; i < count; i++) {
      arr[i * 3] += driftX[i]
      arr[i * 3 + 1] += 0.004
      arr[i * 3 + 2] += driftZ[i]
      life[i] -= 0.00075

      if (arr[i * 3 + 1] > 5.5 || life[i] <= 0) {
        const bowlIdx = Math.floor(Math.random() * 5)
        const bowlPositions: [number, number][] = [
          [-0.3, -0.1], [0.0, -0.15], [0.3, -0.1], [-0.15, 0.12], [0.2, 0.15],
        ]
        const [bx, bz] = bowlPositions[bowlIdx]
        arr[i * 3] = bx + (Math.random() - 0.5) * 0.08
        arr[i * 3 + 1] = 0.2
        arr[i * 3 + 2] = bz + (Math.random() - 0.5) * 0.08
        life[i] = 0.6 + Math.random() * 0.4
      }
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
        color="#FFEABB"
        size={0.03}
        transparent
        opacity={0.4}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}

// ── Stick Figure (overhead view) ─────────────────────────────────
// Overhead cam sees the seated GoldFigure from above: head is a circle,
// legs and arms radiate forward onto the floor — a natural "seated at
// table" silhouette without needing an overhead-specific rig.
const OVERHEAD_MAT_CACHE = new Map<string, THREE.MeshStandardMaterial>()
function overheadMat(color: string): THREE.MeshStandardMaterial {
  let mat = OVERHEAD_MAT_CACHE.get(color)
  if (!mat) {
    mat = new THREE.MeshStandardMaterial({
      color, emissive: color, emissiveIntensity: 0.25, roughness: 0.8,
    })
    OVERHEAD_MAT_CACHE.set(color, mat)
  }
  return mat
}

// Criss-cross (lotus-style) seated body: pelvis just above the floor,
// thighs out and down to knees, shins folded back so feet rest near center.
// Built ONCE per figure — talking motion is applied via group transform,
// not by rebuilding geometry every frame (avoids GPU buffer churn).
function buildCrissCrossGeometry(P: Proportions, baseLean: number): THREE.BufferGeometry {
  const thigh = (P.HIP_Y - P.FOOT_Y) * 0.5
  const hipY = P.FOOT_Y + P.R * 3
  const drop = P.HIP_Y - hipY
  const shY = P.SHOULDER_Y - drop
  const headY = P.HEAD_Y - drop

  const spine = buildSeatedSpinePoints(hipY, P, baseLean)

  const kneeX = thigh * 0.93
  const kneeY = hipY - thigh * 0.10
  const kneeZ = thigh * 0.15
  const ankleX = 0.05
  const ankleY = P.FOOT_Y + P.R * 0.5
  const hipHW = 0.04

  const leftHip = v(-hipHW, hipY, 0)
  const leftKnee = v(-kneeX, kneeY, kneeZ)
  const leftAnkle = v(+ankleX, ankleY, thigh * 0.40)
  const leftLeg = [
    leftHip,
    leftHip.clone().lerp(leftKnee, 0.5),
    leftKnee,
    leftKnee.clone().lerp(leftAnkle, 0.5),
    leftAnkle,
  ]

  const rightHip = v(+hipHW, hipY, 0)
  const rightKnee = v(+kneeX, kneeY, kneeZ)
  const rightAnkle = v(-ankleX, ankleY, thigh * 0.58)
  const rightLeg = [
    rightHip,
    rightHip.clone().lerp(rightKnee, 0.5),
    rightKnee,
    rightKnee.clone().lerp(rightAnkle, 0.5),
    rightAnkle,
  ]

  const lapY = hipY + 0.04
  const lapZ = 0.16
  const leftArm = buildPinnedArmPoints(-0.02, shY, v(-0.10, lapY, lapZ))
  const rightArm = buildPinnedArmPoints(+0.02, shY, v(+0.10, lapY, lapZ))

  const headZ = 0.03 + baseLean * 0.8

  return buildBody(
    [
      { points: spine, radius: P.R, segments: 16 },
      { points: leftArm, radius: P.R, segments: 14 },
      { points: rightArm, radius: P.R, segments: 14 },
      { points: leftLeg, radius: P.R, segments: 16 },
      { points: rightLeg, radius: P.R, segments: 16 },
    ],
    [{ center: v(0, headY, headZ), radius: P.RH }],
  )
}

interface OverheadFigureProps {
  position: [number, number, number]
  color: string
  rotation?: number
  isChild?: boolean
  seed?: number
}

function OverheadFigure({
  position,
  color,
  rotation = 0,
  isChild = false,
  seed = 0,
}: OverheadFigureProps) {
  // Same dimensions as the rest of the seated stick figures (matches Act3_3).
  const figScale = 0.22
  const P = isChild ? CHILD : ADULT

  // Geometry built once; cheap to swap when seed/kind change.
  const geometry = useMemo(() => buildCrissCrossGeometry(P, 0.10), [P])
  useEffect(() => () => geometry.dispose(), [geometry])

  // Talking idle: subtle whole-body rock + sway via group transforms.
  const swayRef = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    const g = swayRef.current
    if (!g) return
    const t = clock.getElapsedTime()
    g.rotation.x = Math.sin(t * 1.3 + seed * 2.1) * 0.04
    g.rotation.y = Math.sin(t * 0.85 + seed * 1.3) * 0.025
    g.rotation.z = Math.sin(t * 1.9 + seed * 4.7) * 0.015
  })

  return (
    <group position={position} rotation={[0, rotation, 0]} scale={figScale}>
      <group ref={swayRef}>
        <mesh geometry={geometry} material={overheadMat(color)} />
      </group>
    </group>
  )
}

// ── Bowl (from above: circle with warm center) ───────────────────
function BowlTop({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Bowl rim */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.04, 0.055, 16]} />
        <meshStandardMaterial color={BOWL_CLAY} roughness={0.7} side={THREE.DoubleSide} />
      </mesh>
      {/* Contents — warm glow */}
      <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.04, 16]} />
        <meshStandardMaterial
          color="#E8D5A8"
          emissive={HANOK_GLOW}
          emissiveIntensity={0.3}
          roughness={0.5}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  )
}

// ── Tatami/Ondol Floor Panels ────────────────────────────────────
function FloorPanels() {
  const panels: { pos: [number, number, number]; size: [number, number] }[] = [
    { pos: [-0.9, -0.01, -0.5], size: [0.85, 0.9] },
    { pos: [0.0, -0.01, -0.5], size: [0.85, 0.9] },
    { pos: [0.9, -0.01, -0.5], size: [0.85, 0.9] },
    { pos: [-0.9, -0.01, 0.5], size: [0.85, 0.9] },
    { pos: [0.0, -0.01, 0.5], size: [0.85, 0.9] },
    { pos: [0.9, -0.01, 0.5], size: [0.85, 0.9] },
    { pos: [-0.9, -0.01, 1.4], size: [0.85, 0.9] },
    { pos: [0.0, -0.01, 1.4], size: [0.85, 0.9] },
    { pos: [0.9, -0.01, 1.4], size: [0.85, 0.9] },
  ]

  return (
    <group>
      {panels.map((p, i) => (
        <mesh key={i} position={p.pos} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={p.size} />
          <meshStandardMaterial
            color={i % 2 === 0 ? FLOOR_WARM : TATAMI}
            roughness={0.9}
          />
        </mesh>
      ))}
      {/* Panel gap lines */}
      {[-0.45, 0.45, -1.35, 1.35].map((x, i) => (
        <mesh key={`vg-${i}`} position={[x, 0.001, 0.5]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.01, 4]} />
          <meshStandardMaterial color="#3A2A1E" roughness={1} side={THREE.DoubleSide} />
        </mesh>
      ))}
      {[0.0, 0.95, -0.95].map((z, i) => (
        <mesh key={`hg-${i}`} position={[0, 0.001, z]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[3, 0.01]} />
          <meshStandardMaterial color="#3A2A1E" roughness={1} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  )
}

// ── Room Walls (seen from above as thick border) ─────────────────
function WallsFromAbove() {
  const wallMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: HANOK_WALL,
    emissive: HANOK_GLOW,
    emissiveIntensity: 0.15,
    roughness: 0.9,
  }), [])

  const roomW = 3.0
  const roomD = 3.4
  const wallH = 0.4 // visible wall height from above
  const wallThick = 0.12

  return (
    <group position={[0, wallH / 2, 0.2]}>
      {/* Back wall */}
      <mesh position={[0, 0, -roomD / 2]} material={wallMat}>
        <boxGeometry args={[roomW, wallH, wallThick]} />
      </mesh>

      {/* Left wall */}
      <mesh position={[-roomW / 2, 0, 0]} material={wallMat}>
        <boxGeometry args={[wallThick, wallH, roomD]} />
      </mesh>

      {/* Right wall */}
      <mesh position={[roomW / 2, 0, 0]} material={wallMat}>
        <boxGeometry args={[wallThick, wallH, roomD]} />
      </mesh>

      {/* Front wall — split with doorway gap */}
      {/* Left section */}
      <mesh position={[-roomW / 2 + 0.45, 0, roomD / 2]} material={wallMat}>
        <boxGeometry args={[0.9, wallH, wallThick]} />
      </mesh>
      {/* Right section */}
      <mesh position={[roomW / 2 - 0.45, 0, roomD / 2]} material={wallMat}>
        <boxGeometry args={[0.9, wallH, wallThick]} />
      </mesh>

      {/* Wall lattice pattern on back wall — decorative lines */}
      {[-0.6, 0, 0.6].map((x, i) => (
        <mesh key={`wl-${i}`} position={[x, 0, -roomD / 2 + wallThick / 2 + 0.005]}>
          <boxGeometry args={[0.015, wallH * 0.8, 0.005]} />
          <meshStandardMaterial color={HANOK_ROOF} roughness={1} />
        </mesh>
      ))}
    </group>
  )
}

// ── Doorway opening (dark outside) ───────────────────────────────
function DoorwayOutside() {
  return (
    <group position={[0, -0.02, 1.95]}>
      {/* Dark ground outside */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0.8]}>
        <planeGeometry args={[1.2, 2.0]} />
        <meshStandardMaterial color={NIGHT_BLUE} roughness={1} />
      </mesh>
      {/* Faint path/road outside */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 1.2]}>
        <planeGeometry args={[0.4, 1.5]} />
        <meshStandardMaterial color="#0E1928" roughness={1} />
      </mesh>
      {/* Threshold step */}
      <mesh position={[0, 0.02, 0]}>
        <boxGeometry args={[1.2, 0.04, 0.08]} />
        <meshStandardMaterial color={HANOK_ROOF} roughness={0.9} />
      </mesh>
    </group>
  )
}

// ── Flickering light ─────────────────────────────────────────────
function HearthLightOverhead() {
  const lightRef = useRef<THREE.PointLight>(null)
  const lightRef2 = useRef<THREE.PointLight>(null)

  useFrame(() => {
    if (!lightRef.current || !lightRef2.current) return
    const t = Date.now() * 0.001
    const flicker = 1.0
      + Math.sin(t * 3.3) * 0.07
      + Math.sin(t * 6.7) * 0.035
      + Math.sin(t * 13.1) * 0.015

    lightRef.current.intensity = 3.0 * flicker
    lightRef2.current.intensity = 1.5 * flicker
  })

  return (
    <>
      {/* Main warm light from table center (hearth) */}
      <pointLight
        ref={lightRef}
        position={[0, 0.6, 0.1]}
        color={HANOK_GLOW}
        intensity={3.0}
        distance={5}
        decay={2}
      />
      {/* Fill light, slightly off-center */}
      <pointLight
        ref={lightRef2}
        position={[0.3, 0.4, -0.2]}
        color="#E8B84D"
        intensity={1.5}
        distance={4}
        decay={2}
      />
      {/* Warm ambient */}
      <ambientLight color={HANOK_GLOW} intensity={0.06} />
    </>
  )
}

// ── Oil lamp glow marker (from above: bright dot on table) ───────
function LampGlow() {
  return (
    <group position={[0.3, 0.14, -0.1]}>
      {/* Bright core */}
      <mesh>
        <sphereGeometry args={[0.02, 8, 6]} />
        <meshStandardMaterial
          color="#FFD080"
          emissive="#FFA500"
          emissiveIntensity={3}
          toneMapped={false}
        />
      </mesh>
      {/* Soft halo */}
      <mesh>
        <sphereGeometry args={[0.06, 8, 6]} />
        <meshStandardMaterial
          color={HANOK_GLOW}
          emissive={HANOK_GLOW}
          emissiveIntensity={1.5}
          transparent
          opacity={0.15}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  )
}

// ── Main Scene ───────────────────────────────────────────────────
function OverheadScene() {
  return (
    <>
      <HearthLightOverhead />
      <FloorPanels />
      <WallsFromAbove />
      <DoorwayOutside />

      {/* Low table */}
      <mesh position={[0, 0.06, 0.1]}>
        <boxGeometry args={[1.2, 0.08, 0.7]} />
        <meshStandardMaterial color={TABLE_WOOD} roughness={0.7} />
      </mesh>

      {/* Bowls on table */}
      <BowlTop position={[-0.3, 0.11, 0.0]} />
      <BowlTop position={[0.0, 0.11, -0.05]} />
      <BowlTop position={[0.3, 0.11, 0.0]} />
      <BowlTop position={[-0.15, 0.11, 0.22]} />
      <BowlTop position={[0.2, 0.11, 0.25]} />

      <LampGlow />

      {/* Family figures arranged around the table — all cross-legged on the floor */}
      {/* Grandparent — far side left, facing table */}
      <OverheadFigure
        position={[-0.35, 0, -0.55]}
        color={STICK_BROWN}
        rotation={0}
        seed={0.4}
      />

      {/* Other elder — far side right */}
      <OverheadFigure
        position={[0.35, 0, -0.55]}
        color={STICK_BROWN}
        rotation={0}
        seed={1.9}
      />

      {/* Parent — right side of table */}
      <OverheadFigure
        position={[0.8, 0, 0.1]}
        color={STICK_AMBER}
        rotation={-Math.PI / 2}
        seed={3.2}
      />

      {/* Child (golden figure) — near side, facing table */}
      <OverheadFigure
        position={[-0.1, 0, 0.65]}
        color={STICK_GOLD}
        isChild
        rotation={Math.PI}
        seed={5.7}
      />

      {/* Steam rising from bowls */}
      <SteamFromAbove count={40} />

      {/* Warm glow circle on floor beneath table (light pool) */}
      <mesh position={[0, 0.002, 0.1]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.2, 32]} />
        <meshStandardMaterial
          color={HANOK_GLOW}
          emissive={HANOK_GLOW}
          emissiveIntensity={0.08}
          transparent
          opacity={0.15}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
    </>
  )
}

// ── Exported Component ───────────────────────────────────────────
export default function Act3_3_B() {
  return (
    <div style={{ width: '100vw', height: '100vh', background: NIGHT_BLUE }}>
      <Canvas
        style={{ width: '100%', height: '100%' }}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.2,
          powerPreference: 'high-performance',
        }}
        camera={{
          // Overhead: looking straight down at the table.
          position: [0, 4.5, 0.6],
          fov: 38,
          near: 0.1,
          far: 20,
        }}
        onCreated={({ camera }) => {
          camera.lookAt(0, 0, 0.2)
        }}
      >
        <DebugCamera />
        <fog attach="fog" args={[NIGHT_BLUE, 5, 12]} />
        <OverheadScene />
        <EffectComposer>
          <Bloom intensity={0.7} luminanceThreshold={0.3} luminanceSmoothing={0.9} />
          <Vignette eskil={false} offset={0.15} darkness={0.6} />
        </EffectComposer>
      </Canvas>
    </div>
  )
}
