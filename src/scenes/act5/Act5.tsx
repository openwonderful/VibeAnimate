import { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Stars } from '@react-three/drei'
import { EffectComposer, Bloom, DepthOfField, Vignette } from '@react-three/postprocessing'
import * as THREE from 'three'
import type { PointLight as PointLightType, Group } from 'three'
import { DebugCamera } from '../DebugCamera'
import { GoldFigure } from '../characters/goldFigure'

/**
 * Act 5 — "Leaving" — Option A: FROM BEHIND THE FIGURE
 *
 * Camera behind/above the golden figure looking down the dirt road
 * toward the grey-blue horizon. The figure is silhouetted against
 * pre-dawn emptiness. The farmhouse behind us casts a faint warm
 * glow on the figure's back. Fog blankets the rice paddies.
 * A bare persimmon tree. No fireflies. Heavy departure.
 */

// ── Palette ─────────────────────────────────────────────────────
const SKY_TOP = '#060D1A'
const FOG_COLOR = '#0C1420'
const GROUND_COLOR = '#1A1612'
const ROAD_COLOR = '#3A2E24'
const PADDY_COLOR = '#0E1A16'
const PADDY_WATER = '#0A1520'
const GOLD = '#D4A843'
const GOLD_DIM = '#8B6914'
const AMBER_PARENT = '#C4913A'
const HOUSE_GLOW = '#F5C36C'
const HOUSE_GLOW_WARM = '#E8A030'
const WALL_COLOR = '#E8D5B5'
const ROOF_COLOR = '#2C2420'
const STONE_WALL = '#4A4A42'
const CLOTH_BUNDLE = '#C4913A'

// ── Stick figure accessories ────────────────────────────────────
// Figures themselves are rendered via <GoldFigure>; these wrap the
// bag/bundle props that sit alongside the body.

function ShoulderBag() {
  return (
    <group position={[0.22, 1.30, -0.10]}>
      <mesh position={[-0.05, 0.08, 0.05]} rotation={[0, 0, -0.3]}>
        <cylinderGeometry args={[0.01, 0.01, 0.5, 6]} />
        <meshStandardMaterial color={GOLD_DIM} />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.1, 8, 8]} />
        <meshStandardMaterial color="#5C4433" roughness={0.9} />
      </mesh>
    </group>
  )
}

function HeldBundle() {
  return (
    <group position={[0.25, 1.2, 0.2]}>
      <mesh>
        <boxGeometry args={[0.15, 0.1, 0.12]} />
        <meshStandardMaterial color={CLOTH_BUNDLE} roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.06, 0]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshStandardMaterial color="#9B7B3A" roughness={0.9} />
      </mesh>
    </group>
  )
}

// ── Bare Persimmon Tree ─────────────────────────────────────────

function BareTree({ position }: { position: [number, number, number] }) {
  const branches = useMemo(() => {
    const b: { pos: [number, number, number]; rot: [number, number, number]; len: number; thick: number }[] = []
    // Main trunk splits
    b.push({ pos: [0, 1.2, 0], rot: [0, 0, -0.3], len: 0.8, thick: 0.04 })
    b.push({ pos: [0, 1.3, 0], rot: [0, 0.5, 0.25], len: 0.7, thick: 0.035 })
    b.push({ pos: [0, 1.0, 0], rot: [0.3, 0, -0.5], len: 0.6, thick: 0.03 })
    // Secondary twigs
    b.push({ pos: [-0.3, 1.7, 0], rot: [0, 0, -0.6], len: 0.4, thick: 0.02 })
    b.push({ pos: [0.25, 1.75, 0.1], rot: [0.2, 0, 0.5], len: 0.35, thick: 0.018 })
    b.push({ pos: [-0.15, 1.5, -0.1], rot: [-0.2, 0, -0.4], len: 0.45, thick: 0.022 })
    b.push({ pos: [0.1, 1.6, 0.15], rot: [0.4, 0.3, 0.3], len: 0.3, thick: 0.015 })
    b.push({ pos: [-0.4, 1.9, 0.05], rot: [0, 0, -0.8], len: 0.25, thick: 0.012 })
    return b
  }, [])

  const barkMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#2A1F18',
    roughness: 0.95,
  }), [])

  return (
    <group position={position}>
      {/* Trunk */}
      <mesh position={[0, 0.5, 0]} material={barkMat}>
        <cylinderGeometry args={[0.06, 0.1, 1.0, 8]} />
      </mesh>
      {/* Upper trunk */}
      <mesh position={[0, 1.1, 0]} material={barkMat}>
        <cylinderGeometry args={[0.04, 0.06, 0.5, 8]} />
      </mesh>
      {/* Branches — bare, skeletal */}
      {branches.map((br, i) => (
        <group key={i} position={br.pos} rotation={br.rot}>
          <mesh position={[0, br.len / 2, 0]} material={barkMat}>
            <cylinderGeometry args={[br.thick * 0.5, br.thick, br.len, 6]} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

// ── Korean Farmhouse (Hanok-style) ──────────────────────────────

function Farmhouse({ position }: { position: [number, number, number] }) {
  const glowRef = useRef<PointLightType>(null)

  useFrame(({ clock }) => {
    if (glowRef.current) {
      // Flickering warm interior light — like a dying oil lamp
      const t = clock.getElapsedTime()
      glowRef.current.intensity = 2.5 + Math.sin(t * 1.5) * 0.3 + Math.sin(t * 3.7) * 0.15
    }
  })

  return (
    <group position={position}>
      {/* Foundation / base platform */}
      <mesh position={[0, 0.05, 0]}>
        <boxGeometry args={[2.2, 0.1, 1.6]} />
        <meshStandardMaterial color={STONE_WALL} roughness={0.95} />
      </mesh>

      {/* Main walls */}
      <mesh position={[0, 0.55, 0]}>
        <boxGeometry args={[2.0, 0.9, 1.4]} />
        <meshStandardMaterial color={WALL_COLOR} roughness={0.85} />
      </mesh>

      {/* Roof — traditional curved Korean roof */}
      <mesh position={[0, 1.15, 0]} rotation={[0, 0, 0]}>
        <boxGeometry args={[2.4, 0.15, 1.8]} />
        <meshStandardMaterial color={ROOF_COLOR} roughness={0.9} />
      </mesh>
      {/* Roof ridge */}
      <mesh position={[0, 1.28, 0]}>
        <boxGeometry args={[2.0, 0.1, 0.3]} />
        <meshStandardMaterial color={ROOF_COLOR} roughness={0.9} />
      </mesh>
      {/* Eaves overhang front */}
      <mesh position={[0, 1.08, 0.85]} rotation={[0.2, 0, 0]}>
        <boxGeometry args={[2.5, 0.06, 0.4]} />
        <meshStandardMaterial color={ROOF_COLOR} roughness={0.9} />
      </mesh>
      {/* Eaves overhang back */}
      <mesh position={[0, 1.08, -0.85]} rotation={[-0.2, 0, 0]}>
        <boxGeometry args={[2.5, 0.06, 0.4]} />
        <meshStandardMaterial color={ROOF_COLOR} roughness={0.9} />
      </mesh>

      {/* Doorway — warm light spills out */}
      <mesh position={[0.3, 0.45, 0.71]}>
        <boxGeometry args={[0.5, 0.7, 0.02]} />
        <meshStandardMaterial
          color={HOUSE_GLOW}
          emissive={HOUSE_GLOW_WARM}
          emissiveIntensity={0.8}
          transparent
          opacity={0.9}
          toneMapped={false}
        />
      </mesh>

      {/* Window — faint glow */}
      <mesh position={[-0.5, 0.6, 0.71]}>
        <boxGeometry args={[0.35, 0.35, 0.02]} />
        <meshStandardMaterial
          color={HOUSE_GLOW}
          emissive={HOUSE_GLOW_WARM}
          emissiveIntensity={0.5}
          transparent
          opacity={0.7}
          toneMapped={false}
        />
      </mesh>

      {/* Interior warm light */}
      <pointLight
        ref={glowRef}
        position={[0.3, 0.6, 0.8]}
        color={HOUSE_GLOW_WARM}
        intensity={2.5}
        distance={8}
        decay={2}
      />

      {/* Courtyard stone wall segments */}
      <mesh position={[-1.3, 0.25, 0.3]}>
        <boxGeometry args={[0.15, 0.5, 1.2]} />
        <meshStandardMaterial color={STONE_WALL} roughness={0.95} />
      </mesh>
      <mesh position={[1.3, 0.25, 0.3]}>
        <boxGeometry args={[0.15, 0.5, 1.2]} />
        <meshStandardMaterial color={STONE_WALL} roughness={0.95} />
      </mesh>
    </group>
  )
}

// ── Rice Paddies ────────────────────────────────────────────────

function RicePaddies() {
  const paddies = useMemo(() => {
    const p: { pos: [number, number, number]; size: [number, number] }[] = []
    // Left side paddies
    p.push({ pos: [-5, 0.01, -3], size: [4, 3] })
    p.push({ pos: [-3, 0.01, -7], size: [5, 3.5] })
    p.push({ pos: [-8, 0.01, -5], size: [3.5, 4] })
    p.push({ pos: [-6, 0.01, -1], size: [3, 2.5] })
    // Right side paddies
    p.push({ pos: [4, 0.01, -4], size: [4.5, 3] })
    p.push({ pos: [7, 0.01, -2], size: [3, 3.5] })
    p.push({ pos: [5, 0.01, -8], size: [4, 3] })
    p.push({ pos: [3, 0.01, -11], size: [5, 4] })
    // Far paddies
    p.push({ pos: [-2, 0.01, -12], size: [6, 3] })
    p.push({ pos: [0, 0.01, -16], size: [8, 4] })
    return p
  }, [])

  return (
    <group>
      {paddies.map((paddy, i) => (
        <group key={i} position={paddy.pos}>
          {/* Paddy earth border */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
            <planeGeometry args={[paddy.size[0], paddy.size[1]]} />
            <meshStandardMaterial
              color={PADDY_COLOR}
              roughness={0.9}
            />
          </mesh>
          {/* Water surface — faint reflective */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
            <planeGeometry args={[paddy.size[0] - 0.3, paddy.size[1] - 0.3]} />
            <meshStandardMaterial
              color={PADDY_WATER}
              roughness={0.3}
              metalness={0.2}
              transparent
              opacity={0.6}
            />
          </mesh>
        </group>
      ))}
    </group>
  )
}

// ── Dirt Road ───────────────────────────────────────────────────

function DirtRoad() {
  return (
    <group>
      {/* Main road stretching into distance */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, -10]}>
        <planeGeometry args={[1.8, 30]} />
        <meshStandardMaterial
          color={ROAD_COLOR}
          roughness={0.95}
        />
      </mesh>
      {/* Road edges — slight earth banks */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-1.1, 0.015, -10]}>
        <planeGeometry args={[0.5, 30]} />
        <meshStandardMaterial color="#2A2018" roughness={0.95} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[1.1, 0.015, -10]}>
        <planeGeometry args={[0.5, 30]} />
        <meshStandardMaterial color="#2A2018" roughness={0.95} />
      </mesh>
    </group>
  )
}

// ── Distant Mountains ───────────────────────────────────────────

function Mountains() {
  const mountains = useMemo(() => [
    { pos: [0, 0.5, -25] as [number, number, number], scale: [12, 3, 4] as [number, number, number], color: '#0D1520' },
    { pos: [-8, 0.3, -22] as [number, number, number], scale: [8, 2.2, 3] as [number, number, number], color: '#0F1825' },
    { pos: [9, 0.4, -23] as [number, number, number], scale: [10, 2.5, 3.5] as [number, number, number], color: '#0E1622' },
    { pos: [-4, 0.2, -20] as [number, number, number], scale: [6, 1.8, 3] as [number, number, number], color: '#111C2A' },
    { pos: [5, 0.3, -21] as [number, number, number], scale: [7, 2.0, 3] as [number, number, number], color: '#101A28' },
  ], [])

  return (
    <group>
      {mountains.map((mt, i) => (
        <mesh key={i} position={mt.pos} scale={mt.scale}>
          <coneGeometry args={[1, 1, 6]} />
          <meshStandardMaterial color={mt.color} roughness={0.95} />
        </mesh>
      ))}
    </group>
  )
}

// ── Fog Particles (ground mist) ─────────────────────────────────

function GroundMist() {
  const groupRef = useRef<Group>(null)
  const clouds = useMemo(() => {
    const c: { pos: [number, number, number]; scale: number; opacity: number }[] = []
    for (let i = 0; i < 40; i++) {
      const angle = (i / 40) * Math.PI * 2
      const radius = 3 + Math.random() * 15
      c.push({
        pos: [
          Math.sin(angle) * radius,
          0.15 + Math.random() * 0.4,
          -Math.random() * 20 - 2,
        ],
        scale: 1.5 + Math.random() * 3,
        opacity: 0.06 + Math.random() * 0.08,
      })
    }
    return c
  }, [])

  useFrame(({ clock }) => {
    if (groupRef.current) {
      // Very slow drift
      groupRef.current.position.x = Math.sin(clock.getElapsedTime() * 0.03) * 0.2
    }
  })

  return (
    <group ref={groupRef}>
      {clouds.map((cloud, i) => (
        <mesh key={i} position={cloud.pos} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[cloud.scale, cloud.scale * 0.6]} />
          <meshStandardMaterial
            color="#8899AA"
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

// ── Gentle Breathing Animation for the Figure ───────────────────

const WALKING_FIGURE_MAT = new THREE.MeshStandardMaterial({
  color: GOLD, emissive: GOLD, emissiveIntensity: 0.3, roughness: 0.8,
})

function WalkingFigure() {
  const groupRef = useRef<Group>(null)

  useFrame(({ clock }) => {
    if (groupRef.current) {
      const t = clock.getElapsedTime()
      groupRef.current.position.y = Math.sin(t * 2) * 0.008
      groupRef.current.rotation.z = Math.sin(t * 2) * 0.01
    }
  })

  return (
    <group ref={groupRef}>
      <group position={[0, 0, -1.5]} rotation={[0, Math.PI, 0]} scale={0.65}>
        <GoldFigure
          pose="walking"
          animate
          inPlace
          material={WALKING_FIGURE_MAT}
          headForwardTilt={0.06}
        />
        <ShoulderBag />
      </group>
    </group>
  )
}

// ── Parent in Doorway ───────────────────────────────────────────

const PARENT_FIGURE_MAT = new THREE.MeshStandardMaterial({
  color: AMBER_PARENT, emissive: AMBER_PARENT, emissiveIntensity: 0.3, roughness: 0.8,
})

function ParentFigure() {
  const groupRef = useRef<Group>(null)

  useFrame(({ clock }) => {
    if (groupRef.current) {
      const t = clock.getElapsedTime()
      groupRef.current.position.y = Math.sin(t * 0.8) * 0.003
    }
  })

  return (
    <group ref={groupRef}>
      <group position={[0.3, 0, 3.5]} scale={0.6}>
        <GoldFigure
          pose="standing"
          material={PARENT_FIGURE_MAT}
          headForwardTilt={-0.1}
          rightHandAt={[0.22, 1.25, 0.20]}
        />
        <HeldBundle />
      </group>
    </group>
  )
}

// ── Scene Contents ──────────────────────────────────────────────

function SceneContents() {
  return (
    <>
      {/* Lighting — cold blue ambient, one warm backlight from house */}
      <ambientLight color="#1A2540" intensity={0.4} />
      <directionalLight
        position={[2, 4, 8]}
        color="#8090AA"
        intensity={0.15}
        castShadow={false}
      />
      {/* Faint pre-dawn glow from horizon */}
      <directionalLight
        position={[0, 0.5, -20]}
        color="#2A3550"
        intensity={0.1}
      />
      {/* House warm backlight hitting the figure's back */}
      <pointLight
        position={[0, 1.2, 4]}
        color={HOUSE_GLOW_WARM}
        intensity={1.5}
        distance={6}
        decay={2}
      />

      {/* Fog */}
      <fog attach="fog" args={[FOG_COLOR, 8, 40]} />

      {/* Stars — faint pre-dawn, fading */}
      <Stars
        radius={50}
        depth={40}
        count={800}
        factor={2}
        saturation={0}
        fade
        speed={0.3}
      />

      {/* Ground plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial color={GROUND_COLOR} roughness={0.95} />
      </mesh>

      {/* Dirt Road */}
      <DirtRoad />

      {/* Rice paddies */}
      <RicePaddies />

      {/* Mountains on horizon */}
      <Mountains />

      {/* Bare persimmon tree near the house */}
      <BareTree position={[-1.8, 0, 3]} />

      {/* Farmhouse — behind the camera but partially visible */}
      <Farmhouse position={[0, 0, 4.5]} />

      {/* Parent in doorway — behind us */}
      <ParentFigure />

      {/* Golden figure — walking away from us down the road */}
      <WalkingFigure />

      {/* Ground mist */}
      <GroundMist />

      {/* Horizon glow — faintest strip of grey-blue dawn */}
      <mesh position={[0, 0.8, -28]} rotation={[0, 0, 0]}>
        <planeGeometry args={[60, 3]} />
        <meshStandardMaterial
          color="#1A2540"
          emissive="#1A2540"
          emissiveIntensity={0.3}
          transparent
          opacity={0.5}
          depthWrite={false}
        />
      </mesh>
    </>
  )
}

// ── Main Component ──────────────────────────────────────────────

export default function Act5() {
  return (
    <div style={{ width: '100vw', height: '100vh', background: SKY_TOP }}>
      <Canvas
        style={{ width: '100%', height: '100%' }}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 0.95 }}
        camera={{
          position: [0, 2.0, 2.0],
          rotation: [-0.15, 0, 0],
          fov: 55,
          near: 0.1,
          far: 80,
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

      {/* Vignette overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background: `radial-gradient(ellipse 70% 60% at 50% 50%, transparent 30%, ${SKY_TOP} 100%)`,
        }}
      />

      {/* Top gradient — sky darkens upward */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '30%',
          pointerEvents: 'none',
          background: `linear-gradient(to bottom, ${SKY_TOP}, transparent)`,
          opacity: 0.6,
        }}
      />

      {/* Bottom gradient — ground merges to black */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '15%',
          pointerEvents: 'none',
          background: `linear-gradient(to top, ${SKY_TOP}, transparent)`,
        }}
      />
    </div>
  )
}
