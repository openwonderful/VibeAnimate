/**
 * Act 6-B — "The Empty Road" (close doorway shot)
 *
 * Camera close to the open doorway of a Korean farmhouse, looking IN.
 * Parent silhouette at table, one bowl, warm amber light.
 * Beyond the door in background: empty road, dark countryside, lonely fireflies.
 * Door FRAME = composition — warm world inside, cold empty world outside.
 */
import { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Sparkles } from '@react-three/drei'
import { EffectComposer, Bloom, DepthOfField, Vignette } from '@react-three/postprocessing'
import type { Mesh, PointLight, Group } from 'three'
import * as THREE from 'three'
import { DebugCamera } from '../DebugCamera'

// ─── Colors ──────────────────────────────────────────────────────────
const AMBER_GLOW   = '#F5C36C'
const AMBER_WARM   = '#E8A832'
const AMBER_DEEP   = '#D4871A'
const WALL_WARM    = '#4A3D2E'
const FLOOR_WOOD   = '#4A3820'
const FLOOR_DARK   = '#2A1E12'
const ROOF_DARK    = '#1A1410'
const PARENT_COLOR = '#C4913A'
const BOWL_COLOR   = '#8B6B4A'
const TABLE_COLOR  = '#5C3D1E'
const ROAD_DIM     = '#1A1610'
const DOORFRAME_WOOD = '#3A2A18'
const DUSK_BLUE    = '#030810'

// ─── Flickering warm light inside the room ───────────────────────────
function InteriorLight() {
  const mainRef = useRef<PointLight>(null)
  const secondRef = useRef<PointLight>(null)

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    // Candle-like flicker — irregular, warm
    const flicker = Math.sin(t * 3.1) * 0.4
      + Math.sin(t * 7.3) * 0.2
      + Math.sin(t * 13.7) * 0.1
      + Math.sin(t * 1.1) * 0.15
    if (mainRef.current) {
      mainRef.current.intensity = 8.0 + flicker
    }
    if (secondRef.current) {
      secondRef.current.intensity = 4.0 + flicker * 0.3
    }
  })

  return (
    <>
      {/* Main overhead warm light (oil lamp / candle on ceiling beam) */}
      <pointLight
        ref={mainRef}
        position={[0, 2.2, 3.5]}
        color={AMBER_WARM}
        intensity={8.0}
        distance={15}
        decay={1.5}
      />
      {/* Secondary fill from the side — softer */}
      <pointLight
        ref={secondRef}
        position={[-1.2, 1.5, 4.0]}
        color={AMBER_GLOW}
        intensity={4.0}
        distance={10}
        decay={1.5}
      />
      {/* Faint warm bounce from floor */}
      <pointLight
        position={[0, 0.3, 3.5]}
        color={AMBER_DEEP}
        intensity={2.0}
        distance={8}
        decay={1.5}
      />
      {/* Fill light near doorway — so interior is visible from outside */}
      <pointLight
        position={[0, 1.8, 1.5]}
        color={AMBER_GLOW}
        intensity={3.0}
        distance={8}
        decay={1.5}
      />
      {/* Warm wash on back wall */}
      <pointLight
        position={[0, 1.8, 5.5]}
        color={AMBER_WARM}
        intensity={4.0}
        distance={6}
        decay={1.3}
      />
      {/* Low warm light near back wall corners */}
      <pointLight
        position={[-1.5, 0.5, 5.5]}
        color={AMBER_DEEP}
        intensity={1.5}
        distance={4}
        decay={1.5}
      />
      <pointLight
        position={[1.5, 0.5, 5.5]}
        color={AMBER_DEEP}
        intensity={1.5}
        distance={4}
        decay={1.5}
      />
    </>
  )
}

// ─── Door frame — the compositional element ──────────────────────────
function DoorFrame() {
  const FRAME_DEPTH = 0.4
  const DOOR_W = 2.4
  const DOOR_H = 3.0
  const POST_W = 0.35
  const LINTEL_H = 0.35

  return (
    <group position={[0, 0, 0]}>
      {/* Left door post */}
      <mesh position={[-(DOOR_W / 2 + POST_W / 2), DOOR_H / 2, 0]}>
        <boxGeometry args={[POST_W, DOOR_H, FRAME_DEPTH]} />
        <meshStandardMaterial color={DOORFRAME_WOOD} roughness={0.9} />
      </mesh>
      {/* Right door post */}
      <mesh position={[(DOOR_W / 2 + POST_W / 2), DOOR_H / 2, 0]}>
        <boxGeometry args={[POST_W, DOOR_H, FRAME_DEPTH]} />
        <meshStandardMaterial color={DOORFRAME_WOOD} roughness={0.9} />
      </mesh>
      {/* Top lintel */}
      <mesh position={[0, DOOR_H + LINTEL_H / 2, 0]}>
        <boxGeometry args={[DOOR_W + POST_W * 2, LINTEL_H, FRAME_DEPTH]} />
        <meshStandardMaterial color={DOORFRAME_WOOD} roughness={0.9} />
      </mesh>
      {/* Threshold / bottom sill */}
      <mesh position={[0, -0.06, 0]}>
        <boxGeometry args={[DOOR_W + POST_W * 2, 0.12, FRAME_DEPTH + 0.1]} />
        <meshStandardMaterial color="#1E1610" roughness={0.95} />
      </mesh>

      {/* Outer wall — left of door (blocks view outside the door) */}
      <mesh position={[-(DOOR_W / 2 + POST_W + 3), DOOR_H / 2 + 0.4, 0]}>
        <boxGeometry args={[6, DOOR_H + 3, FRAME_DEPTH + 0.3]} />
        <meshStandardMaterial color="#0A0806" roughness={0.95} />
      </mesh>
      {/* Outer wall — right of door */}
      <mesh position={[(DOOR_W / 2 + POST_W + 3), DOOR_H / 2 + 0.4, 0]}>
        <boxGeometry args={[6, DOOR_H + 3, FRAME_DEPTH + 0.3]} />
        <meshStandardMaterial color="#0A0806" roughness={0.95} />
      </mesh>
      {/* Wall above door */}
      <mesh position={[0, DOOR_H + LINTEL_H + 1.5, 0]}>
        <boxGeometry args={[16, 3.0, FRAME_DEPTH + 0.3]} />
        <meshStandardMaterial color="#0A0806" roughness={0.95} />
      </mesh>
      {/* Wall below threshold — ground level */}
      <mesh position={[0, -0.4, 0]}>
        <boxGeometry args={[16, 0.6, FRAME_DEPTH + 0.3]} />
        <meshStandardMaterial color="#0A0806" roughness={0.95} />
      </mesh>

      {/* Inner edges of door posts — catch warm light from inside */}
      {[-1, 1].map((side) => (
        <mesh key={`inner-${side}`} position={[side * (DOOR_W / 2), DOOR_H / 2, 0.18]}>
          <boxGeometry args={[0.04, DOOR_H, 0.01]} />
          <meshStandardMaterial
            color="#6A5030"
            emissive="#3A2510"
            emissiveIntensity={0.4}
            roughness={0.85}
          />
        </mesh>
      ))}
      {/* Lintel inner edge — warm light from below */}
      <mesh position={[0, DOOR_H, 0.18]}>
        <boxGeometry args={[DOOR_W, 0.04, 0.01]} />
        <meshStandardMaterial
          color="#5A4028"
          emissive="#2A1508"
          emissiveIntensity={0.3}
          roughness={0.85}
        />
      </mesh>
    </group>
  )
}

// ─── Interior room (warm rectangle seen through door) ────────────────
function InteriorRoom() {
  const ROOM_W = 5.0
  const ROOM_H = 3.6
  const ROOM_D = 6.0

  return (
    <group position={[0, 0, 0.2]}>
      {/* Floor — warm wood */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, ROOM_D / 2]}>
        <planeGeometry args={[ROOM_W, ROOM_D]} />
        <meshStandardMaterial
          color={FLOOR_WOOD}
          emissive="#1A0E04"
          emissiveIntensity={0.2}
          roughness={0.85}
        />
      </mesh>
      {/* Floor detail — darker planks */}
      {Array.from({ length: 8 }, (_, i) => (
        <mesh
          key={`plank-${i}`}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[-ROOM_W / 2 + 0.3 + i * 0.62, 0.005, ROOM_D / 2]}
        >
          <planeGeometry args={[0.02, ROOM_D]} />
          <meshStandardMaterial color={FLOOR_DARK} roughness={1} transparent opacity={0.4} />
        </mesh>
      ))}

      {/* Back wall — warm interior */}
      <mesh position={[0, ROOM_H / 2, ROOM_D]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[ROOM_W, ROOM_H]} />
        <meshStandardMaterial
          color="#5A4430"
          emissive="#2A1508"
          emissiveIntensity={0.35}
          roughness={0.85}
        />
      </mesh>

      {/* Left wall */}
      <mesh position={[-ROOM_W / 2, ROOM_H / 2, ROOM_D / 2]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[ROOM_D, ROOM_H]} />
        <meshStandardMaterial
          color={WALL_WARM}
          emissive="#1A0E06"
          emissiveIntensity={0.15}
          roughness={0.85}
        />
      </mesh>

      {/* Right wall */}
      <mesh position={[ROOM_W / 2, ROOM_H / 2, ROOM_D / 2]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[ROOM_D, ROOM_H]} />
        <meshStandardMaterial
          color={WALL_WARM}
          emissive="#1A0E06"
          emissiveIntensity={0.15}
          roughness={0.85}
        />
      </mesh>

      {/* Ceiling — low beam and dark wood */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, ROOM_H, ROOM_D / 2]}>
        <planeGeometry args={[ROOM_W, ROOM_D]} />
        <meshStandardMaterial
          color="#2A1E14"
          emissive="#0E0804"
          emissiveIntensity={0.15}
          roughness={0.9}
        />
      </mesh>
      {/* Ceiling beams */}
      {[-1.2, 0, 1.2].map((x, i) => (
        <mesh key={`beam-${i}`} position={[x, ROOM_H - 0.08, ROOM_D / 2]}>
          <boxGeometry args={[0.18, 0.18, ROOM_D]} />
          <meshStandardMaterial color="#2A1E10" roughness={0.95} />
        </mesh>
      ))}

      {/* Hanji (paper) window on back wall — faint cool moonlight glow */}
      <mesh position={[1.5, 2.2, ROOM_D - 0.01]}>
        <planeGeometry args={[0.9, 0.7]} />
        <meshStandardMaterial
          color="#2A3860"
          emissive="#2A3860"
          emissiveIntensity={0.6}
          transparent
          opacity={0.7}
        />
      </mesh>
      {/* Window lattice (simple cross) */}
      <mesh position={[1.5, 2.2, ROOM_D - 0.005]}>
        <boxGeometry args={[0.9, 0.04, 0.01]} />
        <meshStandardMaterial color={DOORFRAME_WOOD} roughness={0.9} />
      </mesh>
      <mesh position={[1.5, 2.2, ROOM_D - 0.005]}>
        <boxGeometry args={[0.04, 0.7, 0.01]} />
        <meshStandardMaterial color={DOORFRAME_WOOD} roughness={0.9} />
      </mesh>

      {/* Hanging oil lamp (simple form) */}
      <OilLamp position={[0, 2.6, 3.5]} />

      {/* Warm light pool on floor below the lamp */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 3.5]}>
        <circleGeometry args={[1.5, 16]} />
        <meshStandardMaterial
          color={AMBER_GLOW}
          emissive={AMBER_GLOW}
          emissiveIntensity={0.15}
          transparent
          opacity={0.12}
        />
      </mesh>

      {/* Ondol floor cushion (sitting mat) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 3.8]}>
        <planeGeometry args={[0.8, 0.8]} />
        <meshStandardMaterial color="#4A3020" roughness={0.9} />
      </mesh>

      {/* Shadow / darker zone near doorway */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.008, 0.5]}>
        <planeGeometry args={[ROOM_W, 1.0]} />
        <meshStandardMaterial
          color="#0A0806"
          transparent
          opacity={0.3}
        />
      </mesh>
    </group>
  )
}

// ─── Simple oil lamp hanging from ceiling ────────────────────────────
function OilLamp({ position }: { position: [number, number, number] }) {
  const glowRef = useRef<Mesh>(null)

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    if (glowRef.current) {
      const s = 1 + Math.sin(t * 4.2) * 0.06 + Math.sin(t * 9.1) * 0.03
      glowRef.current.scale.set(s, s, s)
    }
  })

  return (
    <group position={position}>
      {/* Chain / cord */}
      <mesh position={[0, 0.4, 0]}>
        <cylinderGeometry args={[0.005, 0.005, 0.8, 4]} />
        <meshStandardMaterial color="#2A1E10" roughness={1} />
      </mesh>
      {/* Lamp body */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.08, 0.06, 0.1, 8]} />
        <meshStandardMaterial color="#6A4A2A" roughness={0.7} metalness={0.2} />
      </mesh>
      {/* Flame glow */}
      <mesh ref={glowRef} position={[0, 0.12, 0]}>
        <sphereGeometry args={[0.06, 6, 4]} />
        <meshStandardMaterial
          color={AMBER_GLOW}
          emissive={AMBER_GLOW}
          emissiveIntensity={5.0}
          toneMapped={false}
        />
      </mesh>
      {/* Larger soft glow halo */}
      <mesh position={[0, 0.12, 0]}>
        <sphereGeometry args={[0.15, 8, 6]} />
        <meshStandardMaterial
          color={AMBER_GLOW}
          emissive={AMBER_WARM}
          emissiveIntensity={1.5}
          transparent
          opacity={0.25}
          toneMapped={false}
        />
      </mesh>
    </group>
  )
}

// ─── Parent figure — hunched, eating alone ───────────────────────────
function ParentFigure() {
  const groupRef = useRef<Group>(null)
  const armRef = useRef<Mesh>(null)

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    // Very subtle breathing / rocking motion
    if (groupRef.current) {
      groupRef.current.rotation.x = 0.08 + Math.sin(t * 0.8) * 0.015
    }
    // Arm slowly moving (eating)
    if (armRef.current) {
      armRef.current.rotation.x = 0.5 + Math.sin(t * 1.2) * 0.08
      armRef.current.position.y = 0.42 + Math.sin(t * 1.2) * 0.03
    }
  })

  return (
    <group position={[0, 0, 3.6]} scale={[1.6, 1.6, 1.6]}>
      <group ref={groupRef}>
        {/* Legs (seated, folded under — Korean floor sitting) */}
        <mesh position={[-0.12, 0.08, 0.05]}>
          <boxGeometry args={[0.14, 0.12, 0.28]} />
          <meshStandardMaterial color={PARENT_COLOR} roughness={0.9} />
        </mesh>
        <mesh position={[0.12, 0.08, 0.05]}>
          <boxGeometry args={[0.14, 0.12, 0.28]} />
          <meshStandardMaterial color={PARENT_COLOR} roughness={0.9} />
        </mesh>

        {/* Torso — hunched forward */}
        <mesh position={[0, 0.38, 0.03]} rotation={[0.12, 0, 0]}>
          <boxGeometry args={[0.32, 0.38, 0.2]} />
          <meshStandardMaterial color={PARENT_COLOR} roughness={0.9} />
        </mesh>

        {/* Shoulders / upper back curve */}
        <mesh position={[0, 0.56, 0.06]} rotation={[0.2, 0, 0]}>
          <boxGeometry args={[0.36, 0.12, 0.18]} />
          <meshStandardMaterial color={PARENT_COLOR} roughness={0.9} />
        </mesh>

        {/* Head — tilted down toward bowl */}
        <mesh position={[0, 0.68, 0.1]} rotation={[0.35, 0, 0]}>
          <sphereGeometry args={[0.1, 8, 6]} />
          <meshStandardMaterial color={PARENT_COLOR} roughness={0.9} />
        </mesh>

        {/* Left arm — resting on table edge */}
        <mesh position={[-0.2, 0.35, 0.15]} rotation={[0.6, 0, -0.15]}>
          <boxGeometry args={[0.08, 0.26, 0.08]} />
          <meshStandardMaterial color={PARENT_COLOR} roughness={0.9} />
        </mesh>

        {/* Right arm — holding chopsticks, animated */}
        <mesh ref={armRef} position={[0.18, 0.42, 0.15]} rotation={[0.5, 0, 0.15]}>
          <boxGeometry args={[0.08, 0.26, 0.08]} />
          <meshStandardMaterial color={PARENT_COLOR} roughness={0.9} />
        </mesh>

        {/* Chopstick (simple thin cylinder) */}
        <mesh position={[0.22, 0.3, 0.28]} rotation={[0.8, 0, 0.1]}>
          <cylinderGeometry args={[0.008, 0.006, 0.3, 4]} />
          <meshStandardMaterial color="#5A4020" roughness={0.8} />
        </mesh>
      </group>
    </group>
  )
}

// ─── Low table with single bowl ──────────────────────────────────────
function TableWithBowl() {
  const steamRef = useRef<Group>(null)

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    if (steamRef.current) {
      steamRef.current.position.y = 0.62 + Math.sin(t * 0.6) * 0.02
      steamRef.current.rotation.y = t * 0.3
    }
  })

  return (
    <group position={[0, 0, 3.0]} scale={[1.3, 1.3, 1.3]}>
      {/* Table top */}
      <mesh position={[0, 0.22, 0]}>
        <boxGeometry args={[0.7, 0.04, 0.45]} />
        <meshStandardMaterial color={TABLE_COLOR} roughness={0.8} />
      </mesh>
      {/* Table legs */}
      {[[-0.28, -0.18], [0.28, -0.18], [-0.28, 0.18], [0.28, 0.18]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.1, z]}>
          <boxGeometry args={[0.04, 0.2, 0.04]} />
          <meshStandardMaterial color={TABLE_COLOR} roughness={0.85} />
        </mesh>
      ))}

      {/* THE bowl — one single bowl, the emotional center */}
      <mesh position={[0, 0.28, 0]}>
        <cylinderGeometry args={[0.1, 0.07, 0.08, 12]} />
        <meshStandardMaterial
          color={BOWL_COLOR}
          emissive="#4A3520"
          emissiveIntensity={0.3}
          roughness={0.5}
          metalness={0.1}
          toneMapped={false}
        />
      </mesh>
      {/* Rice / food inside bowl */}
      <mesh position={[0, 0.33, 0]}>
        <cylinderGeometry args={[0.085, 0.085, 0.02, 12]} />
        <meshStandardMaterial
          color="#E8E0D0"
          emissive="#8A7A60"
          emissiveIntensity={0.2}
          roughness={0.9}
        />
      </mesh>

      {/* Very faint steam wisps */}
      <group ref={steamRef}>
        {[0, 0.8, 1.6, 2.4].map((offset, i) => (
          <mesh key={i} position={[Math.sin(offset) * 0.03, 0.65 + i * 0.08, Math.cos(offset) * 0.03]}>
            <sphereGeometry args={[0.015 + i * 0.005, 4, 3]} />
            <meshStandardMaterial
              color="#F5C36C"
              transparent
              opacity={0.08 - i * 0.015}
            />
          </mesh>
        ))}
      </group>

      {/* Chopstick rest */}
      <mesh position={[0.2, 0.245, 0.05]} rotation={[0, 0.3, 0]}>
        <boxGeometry args={[0.06, 0.015, 0.025]} />
        <meshStandardMaterial color="#6A5030" roughness={0.8} />
      </mesh>
    </group>
  )
}

// ─── Outside world (seen behind camera through door) ─────────────────
// This creates the cold, empty world visible BEHIND the viewer's shoulder
// through the doorway — the road stretching into dark blue emptiness
function OutsideWorld() {
  const roadShape = useMemo(() => {
    const shape = new THREE.Shape()
    // Road perspective — wide at door, narrowing to nothing
    shape.moveTo(-3.0, 0)
    shape.lineTo(3.0, 0)
    shape.lineTo(0.15, -40)
    shape.lineTo(-0.15, -40)
    shape.closePath()
    return shape
  }, [])

  return (
    <group position={[0, 0, -0.3]}>
      {/* Ground plane outside */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, -15]}>
        <planeGeometry args={[60, 40]} />
        <meshStandardMaterial color="#080C06" roughness={1} />
      </mesh>

      {/* Empty road — disappearing into the dark */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <shapeGeometry args={[roadShape]} />
        <meshStandardMaterial color={ROAD_DIM} roughness={0.95} />
      </mesh>

      {/* Road ruts */}
      {[-1, 1].map((side) => {
        const rutShape = new THREE.Shape()
        rutShape.moveTo(side * 1.8, 0)
        rutShape.lineTo(side * 2.2, 0)
        rutShape.lineTo(side * 0.18, -40)
        rutShape.lineTo(side * 0.15, -40)
        rutShape.closePath()
        return (
          <mesh key={side} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
            <shapeGeometry args={[rutShape]} />
            <meshStandardMaterial color="#12100A" roughness={1} />
          </mesh>
        )
      })}

      {/* Distant dark hills — silhouettes */}
      {[
        { pos: [-10, 1.5, -35] as const, scale: [12, 3, 3] as const },
        { pos: [8, 2, -38] as const, scale: [15, 4, 4] as const },
        { pos: [-2, 2.5, -42] as const, scale: [18, 5, 5] as const },
        { pos: [15, 1.2, -30] as const, scale: [10, 2.5, 3] as const },
      ].map((m, i) => (
        <mesh key={i} position={[m.pos[0], m.pos[1], m.pos[2]]} scale={[m.scale[0], m.scale[1], m.scale[2]]}>
          <sphereGeometry args={[1, 6, 4, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color="#060A14" roughness={1} />
        </mesh>
      ))}

      {/* Faint starlight — just a few visible through the door */}
      <Sparkles
        count={15}
        scale={[8, 5, 3]}
        position={[0, 4, -20]}
        size={1.5}
        speed={0.05}
        opacity={0.3}
        color="#8090C0"
        noise={0.5}
      />
    </group>
  )
}

// ─── Lonely fireflies outside ────────────────────────────────────────
function OutsideFireflies() {
  return (
    <group position={[0, 0, -1]}>
      {/* A few fireflies drifting in the dark outside */}
      <Sparkles
        count={5}
        scale={[6, 3, 8]}
        position={[0, 1.5, -6]}
        size={3}
        speed={0.15}
        opacity={0.5}
        color="#D0B860"
        noise={2}
      />
      {/* One or two close to the doorway — almost inside */}
      <Sparkles
        count={2}
        scale={[2, 1.5, 2]}
        position={[0.8, 1.8, -1]}
        size={2.5}
        speed={0.1}
        opacity={0.4}
        color="#E8C050"
        noise={1.5}
      />
    </group>
  )
}

// ─── Warm light spill from doorway onto outside ground ───────────────
function DoorLightSpill() {
  const spillShape = useMemo(() => {
    const shape = new THREE.Shape()
    // Trapezoid of warm light spilling out
    shape.moveTo(-1.3, 0)
    shape.lineTo(1.3, 0)
    shape.lineTo(2.5, -5)
    shape.lineTo(-2.5, -5)
    shape.closePath()
    return shape
  }, [])

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, -0.3]}>
      <shapeGeometry args={[spillShape]} />
      <meshStandardMaterial
        color={AMBER_GLOW}
        emissive={AMBER_GLOW}
        emissiveIntensity={0.4}
        transparent
        opacity={0.12}
        side={THREE.DoubleSide}
        toneMapped={false}
      />
    </mesh>
  )
}

// ─── Eave / roof overhang above door (outside) ──────────────────────
function RoofOverhang() {
  return (
    <group position={[0, 3.5, -0.6]}>
      {/* Main eave */}
      <mesh rotation={[0.15, 0, 0]}>
        <boxGeometry args={[5, 0.12, 1.2]} />
        <meshStandardMaterial color={ROOF_DARK} roughness={0.85} />
      </mesh>
      {/* Eave underside shadow plane */}
      <mesh position={[0, -0.08, 0.3]} rotation={[0.15, 0, 0]}>
        <boxGeometry args={[4.8, 0.04, 1.0]} />
        <meshStandardMaterial color="#0E0A06" roughness={1} />
      </mesh>
    </group>
  )
}

// ─── Shoes at the doorstep ──────────────────────────────────────────
function DoorstepShoes() {
  return (
    <group position={[0.5, 0.02, -0.3]}>
      {/* A pair of worn shoes — one slightly askew */}
      <mesh position={[0, 0, 0]} rotation={[0, -0.15, 0]}>
        <boxGeometry args={[0.1, 0.05, 0.25]} />
        <meshStandardMaterial color="#2A2018" roughness={0.9} />
      </mesh>
      <mesh position={[0.16, 0, 0.04]} rotation={[0, 0.25, 0]}>
        <boxGeometry args={[0.1, 0.05, 0.25]} />
        <meshStandardMaterial color="#2A2018" roughness={0.9} />
      </mesh>
    </group>
  )
}

// ─── Exterior step / ground just outside the door ───────────────────
function ExteriorStep() {
  return (
    <group>
      {/* Stone step outside the door — catches spill light */}
      <mesh position={[0, -0.1, -0.5]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[3.0, 1.2]} />
        <meshStandardMaterial
          color="#2A2218"
          emissive="#1A1008"
          emissiveIntensity={0.15}
          roughness={0.95}
        />
      </mesh>
      {/* Ground continuing below camera */}
      <mesh position={[0, -0.2, -2.0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[5, 3]} />
        <meshStandardMaterial color="#0E0C08" roughness={0.95} />
      </mesh>
    </group>
  )
}

// ─── Dust motes in the warm light ────────────────────────────────────
function DustMotes() {
  return (
    <Sparkles
      count={20}
      scale={[2, 2.5, 4]}
      position={[0, 1.8, 2.5]}
      size={1.0}
      speed={0.08}
      opacity={0.15}
      color={AMBER_GLOW}
      noise={1}
    />
  )
}

// ─── Wall details — hanging items, shelf ─────────────────────────────
function WallDetails() {
  return (
    <group position={[0, 0, 0.2]}>
      {/* Small shelf on left wall with a few items */}
      <mesh position={[-2.45, 1.8, 4.5]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[0.6, 0.04, 0.2]} />
        <meshStandardMaterial color={TABLE_COLOR} roughness={0.85} />
      </mesh>
      {/* A jar on the shelf */}
      <mesh position={[-2.4, 1.9, 4.4]}>
        <cylinderGeometry args={[0.06, 0.05, 0.12, 8]} />
        <meshStandardMaterial color="#6A5A3A" roughness={0.6} />
      </mesh>
      {/* Another small container */}
      <mesh position={[-2.4, 1.88, 4.65]}>
        <cylinderGeometry args={[0.04, 0.04, 0.08, 6]} />
        <meshStandardMaterial color="#5A4A2A" roughness={0.7} />
      </mesh>

      {/* Back wall — faded calendar or photo (just a small rectangle) */}
      <mesh position={[-0.6, 2.0, 6.18]}>
        <planeGeometry args={[0.3, 0.4]} />
        <meshStandardMaterial color="#4A4038" roughness={0.9} />
      </mesh>
    </group>
  )
}

// ─── The empty place — where someone used to sit ────────────────────
function EmptyPlace() {
  return (
    <group position={[0, 0, 3.0]} scale={[1.3, 1.3, 1.3]}>
      {/* Worn circle where a bowl used to sit on the table */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-0.3, 0.245, 0]}>
        <ringGeometry args={[0.05, 0.075, 16]} />
        <meshStandardMaterial
          color="#6A4A28"
          emissive="#2A1A08"
          emissiveIntensity={0.2}
          transparent
          opacity={0.4}
          roughness={0.9}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Empty cushion spot — slightly different floor shade */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-0.3, 0.031, 0.5]}>
        <planeGeometry args={[0.6, 0.6]} />
        <meshStandardMaterial
          color="#3A2818"
          transparent
          opacity={0.3}
          roughness={0.95}
        />
      </mesh>
    </group>
  )
}

// ─── Scene composition ───────────────────────────────────────────────
function Scene() {
  return (
    <>
      {/* Ambient — warm-tinted so interior surfaces are visible */}
      <ambientLight color="#3A2818" intensity={0.8} />

      {/* Moonlight from outside-above */}
      <directionalLight
        position={[2, 8, -10]}
        color="#4060A0"
        intensity={0.3}
      />

      {/* Fog — warm brown near, fading to dark at distance */}
      <fog attach="fog" args={['#1A1208', 12, 50]} />

      {/* === OUTSIDE (behind camera, through door) === */}
      <OutsideWorld />
      <OutsideFireflies />
      <DoorLightSpill />

      {/* === THE DOOR FRAME === */}
      <DoorFrame />
      <RoofOverhang />
      <ExteriorStep />
      <DoorstepShoes />

      {/* === INSIDE (warm world) === */}
      <InteriorRoom />
      <InteriorLight />
      <WallDetails />
      <DustMotes />

      {/* === THE PARENT — small, alone === */}
      <ParentFigure />
      <TableWithBowl />
      <EmptyPlace />
    </>
  )
}

// ─── Exported component ──────────────────────────────────────────────
export default function Act6_B() {
  return (
    <div style={{ width: '100vw', height: '100vh', background: DUSK_BLUE }}>
      <Canvas
        camera={{
          position: [0, 1.4, -2.8],
          fov: 52,
          near: 0.1,
          far: 200,
        }}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.0,
        }}
        shadows={false}
        dpr={[1, 2]}
        onCreated={({ camera }) => {
          // Look through the doorway at the parent inside
          camera.lookAt(0, 1.0, 3.5)
        }}
      >
        <DebugCamera />
        <Scene />
        <EffectComposer>
          <Bloom intensity={0.8} luminanceThreshold={0.3} luminanceSmoothing={0.9} mipmapBlur />
          <DepthOfField focusDistance={0.03} focalLength={0.06} bokehScale={2.5} />
          <Vignette eskil={false} offset={0.15} darkness={0.6} />
        </EffectComposer>
      </Canvas>
    </div>
  )
}
