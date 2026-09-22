/**
 * Act 3.2 — "The Road Home" (TWILIGHT / BLUE HOUR — CHILD ON SHOULDERS)
 *
 * Just after sunset. Deep blue sky with first stars appearing. A glowing
 * parent walks down the dirt road toward a small Korean farmhouse with the
 * child riding on their shoulders. The house has warm amber light glowing
 * from inside — the contrast between cold blue exterior and warm golden
 * interior is the focal point. Moon rising. Fireflies visible. Rice
 * paddies reflecting the blue sky and warm house light. Mountains on the
 * horizon. Intimate, quiet, magical — the beat just before arriving home.
 */

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import SeededSparkles from '../effects/SeededSparkles'
import GradientEnvironment from '../effects/GradientEnvironment'
import { EffectComposer, Bloom, DepthOfField, Vignette } from '@react-three/postprocessing'
import * as THREE from 'three'
import { createScene } from '../createScene'
import { useCameraHandoff } from '../DebugCamera'
import { GoldGlowFigure } from '../characters/GoldGlowFigure'
import {
  createFarMountainShape,
  createMidMountainShape,
  createBaekduMountainShapes,
} from '../act1/mountainShapes'

// ────────────────────────────────────────────────────────────────────
// Color palette — cold blue exterior, warm golden interior
// ────────────────────────────────────────────────────────────────────
import { Hanok } from './hanok'

const DIRT_ROAD = '#5A6575'
const PADDY_BERM = '#3A4A38'
const MOUNTAIN_FAR = '#1E2845'
const MOUNTAIN_MID = '#283858'
const GROUND_COLOR = '#2A3828'
const SKY_DEEP = '#0A1028'
const MOON_COLOR = '#E8E4D8'

// ────────────────────────────────────────────────────────────────────
// Shoulder-carry pair: glowing parent (arms raised) + child (seated on
// shoulders). Both figures walk in place inside a shared group that
// translates down the road toward the house.
// ────────────────────────────────────────────────────────────────────
function ShoulderCarryPair() {
  const groupRef = useRef<THREE.Group>(null)

  useFrame(({ clock }) => {
    if (!groupRef.current) return
    const SPEED = 1.0     // slow, unhurried approach
    const LOOP = 8.0
    const START_Z = -1.0  // start further from camera so house reads in frame
    const t = clock.getElapsedTime()
    groupRef.current.position.z = START_Z - ((t * SPEED) % LOOP)
    groupRef.current.rotation.z = Math.sin(t * 1.0) * 0.012
  })

  // Child's butt rests on the adult's SHOULDERS (not their head). The adult's
  // head sits between the child's legs, hidden behind the child's torso from
  // the rear camera view. So child hip y = adult shoulder y:
  //   adult shoulder world y = 2.2 * 1.47 ≈ 3.234
  //   child group y = 3.234 − 1.5 * 0.58 ≈ 2.364
  const CHILD_Y = 2.2 * 1.47 - 1.5 * 0.58
  // Nudge child slightly toward camera so their torso occludes the parent's
  // head from behind (walking group faces −z; camera sits at +z).
  const CHILD_Z_FORWARD = 0.18

  return (
    <group ref={groupRef} position={[-0.4, 0, -1.0]}>
      {/* Parent — hands down at mid-torso clasping the child's dangling ankles.
          Head tilted forward so the sphere doesn't clip through the child's
          seated torso (child is nudged toward +z for camera occlusion). */}
      <group position={[0, 0, 0]} rotation={[0, Math.PI, 0]} scale={2.2}>
        <GoldGlowFigure
          castShadow
          inPlace
          glow={1.1}
          leftHandAt={[-0.23, 1.16, 0.07]}
          rightHandAt={[+0.23, 1.16, 0.07]}
          headForwardTilt={0.10}
        />
      </group>
      {/* Child — seated, butt on the parent's shoulders */}
      <group position={[0, CHILD_Y, CHILD_Z_FORWARD]} rotation={[0, Math.PI, 0]} scale={1.5}>
        <GoldGlowFigure
          kind="child"
          pose="seated"
          castShadow
          inPlace
          glow={1.5}
          phaseOffset={0.2}
        />
      </group>
    </group>
  )
}

// ────────────────────────────────────────────────────────────────────
// Moon with glow — rising over the mountains
// ────────────────────────────────────────────────────────────────────
function Moon({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Moon core */}
      <mesh>
        <sphereGeometry args={[1.2, 32, 32]} />
        <meshBasicMaterial color={MOON_COLOR} toneMapped={false} />
      </mesh>
      {/* Inner glow */}
      <mesh>
        <sphereGeometry args={[1.8, 32, 32]} />
        <meshBasicMaterial color="#C8D0E8" transparent opacity={0.2} />
      </mesh>
      {/* Outer glow */}
      <mesh>
        <sphereGeometry args={[3.0, 32, 32]} />
        <meshBasicMaterial color="#8090B0" transparent opacity={0.1} />
      </mesh>
      {/* Wide haze */}
      <mesh>
        <sphereGeometry args={[5.0, 32, 32]} />
        <meshBasicMaterial color="#6070A0" transparent opacity={0.05} />
      </mesh>
      {/* Moonlight — strong */}
      <pointLight color="#B0C0E0" intensity={14} distance={80} decay={1.2} />
    </group>
  )
}

// ────────────────────────────────────────────────────────────────────
// Mountain range silhouettes — Scene 1 ridges (same set used by Act 4-B)
// Far range + Baekdu + mid range, stacked with z-depth so the fog catches
// them. Mountain colors kept dark/cool for the twilight palette.
// ────────────────────────────────────────────────────────────────────
function Mountains() {
  const farShape = useMemo(() => createFarMountainShape(90, 9), [])
  const midShape = useMemo(() => createMidMountainShape(78, 5.5), [])
  const baekdu = useMemo(() => createBaekduMountainShapes(82, 9.5), [])

  return (
    <group>
      {/* Far range — furthest, deepest blue */}
      <mesh position={[0, 0, -48]}>
        <shapeGeometry args={[farShape]} />
        <meshStandardMaterial color={MOUNTAIN_FAR} side={THREE.DoubleSide} roughness={0.95} />
      </mesh>
      {/* Baekdu silhouette — middle depth */}
      <mesh position={[0, 0, -42]}>
        <shapeGeometry args={[baekdu.silhouette]} />
        <meshStandardMaterial color="#1E2E28" side={THREE.DoubleSide} roughness={0.95} />
      </mesh>
      {/* Mid range — closest ridge */}
      <mesh position={[0, 0, -35]}>
        <shapeGeometry args={[midShape]} />
        <meshStandardMaterial color={MOUNTAIN_MID} side={THREE.DoubleSide} roughness={0.95} />
      </mesh>
    </group>
  )
}

// ────────────────────────────────────────────────────────────────────
// Rice paddies — reflective water that mirrors both blue sky and
// warm house light
// ────────────────────────────────────────────────────────────────────
function RicePaddy({
  position,
  width,
  depth,
}: {
  position: [number, number, number]
  width: number
  depth: number
}) {
  return (
    <group position={position}>
      {/* Paddy berm / edge. Kept clear of the water plane by centimetres —
          at 1cm the two surfaces z-fight and the fields strobe (see 3.1). */}
      <mesh position={[0, 0.015, 0]} receiveShadow>
        <boxGeometry args={[width, 0.03, depth]} />
        <meshStandardMaterial color={PADDY_BERM} roughness={0.9} />
      </mesh>
      {/* Water surface — reflective for twilight mirror effect */}
      {/* Reverted to a plain reflective surface. The stylized banded shader
          that 3.1 uses is a better fit for the dusk fields, but at night the
          thing that makes this shot is the moon laid out across the water,
          and a mirror gives that far more directly than painted bands do.
          Sits at y=0.09 with the berm top at 0.03 — see the z-fighting note
          in 3.1, these were 1cm apart and the fields strobed. */}
      <mesh position={[0, 0.09, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[width - 0.2, depth - 0.2]} />
        <meshStandardMaterial
          color="#4A5C7E"
          roughness={0.24}
          metalness={0.95}
          transparent
          opacity={0.9}
          envMapIntensity={2.4}
        />
      </mesh>
      {/* Rice stalks. Gauged so each one is several pixels across from the
          camera — at the old 5 mm radius they were sub-pixel and flickered
          on and off frame to frame. */}
      {Array.from({ length: 24 }, (_, i) => {
        const x = ((i % 6) - 2.5) * (width / 7)
        const z = (Math.floor(i / 6) - 1.5) * (depth / 4)
        const h = 0.24 + (i % 5) * 0.04
        return (
          <mesh
            key={i}
            position={[x, h / 2 + 0.09, z]}
            rotation={[0, i * 1.3, (i % 3 - 1) * 0.1]}
          >
            <cylinderGeometry args={[0.02, 0.026, h, 4]} />
            <meshStandardMaterial color="#3A5A2A" roughness={0.9} />
          </mesh>
        )
      })}
    </group>
  )
}

// ────────────────────────────────────────────────────────────────────
// Ground mist — low banks of vapour sitting on the paddies, drifting
// slowly across the road. Additive planes rather than volumetrics: at this
// camera height a handful of soft horizontal sheets reads as river fog and
// costs nothing.
// ────────────────────────────────────────────────────────────────────
/** Soft-edged blob, so a mist plane fades out instead of ending on a line. */
function makeMistTexture(): THREE.Texture {
  const size = 256
  const c = document.createElement('canvas')
  c.width = size
  c.height = size
  const ctx = c.getContext('2d')!
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  g.addColorStop(0, 'rgba(255,255,255,0.85)')
  g.addColorStop(0.45, 'rgba(255,255,255,0.45)')
  g.addColorStop(0.75, 'rgba(255,255,255,0.12)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  const tex = new THREE.CanvasTexture(c)
  tex.needsUpdate = true
  return tex
}

function GroundMist() {
  const mistTex = useMemo(makeMistTexture, [])
  const bands = useMemo(
    () => [
      { z: -4, y: 0.30, w: 26, d: 9, o: 0.16, speed: 0.035, phase: 0.0 },
      { z: -10, y: 0.52, w: 30, d: 11, o: 0.20, speed: 0.028, phase: 1.7 },
      { z: -17, y: 0.78, w: 34, d: 13, o: 0.22, speed: 0.021, phase: 3.1 },
      { z: -25, y: 1.05, w: 40, d: 15, o: 0.18, speed: 0.016, phase: 4.6 },
    ],
    [],
  )
  const refs = useRef<(THREE.Mesh | null)[]>([])

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    bands.forEach((b, i) => {
      const m = refs.current[i]
      if (!m) return
      m.position.x = Math.sin(t * b.speed + b.phase) * 2.4
      m.position.y = b.y + Math.sin(t * b.speed * 1.7 + b.phase) * 0.05
    })
  })

  return (
    <group>
      {bands.map((b, i) => (
        <mesh
          key={i}
          ref={(el) => { refs.current[i] = el }}
          position={[0, b.y, b.z]}
          rotation={[-Math.PI / 2.05, 0, 0]}
        >
          <planeGeometry args={[b.w, b.d]} />
          <meshBasicMaterial
            map={mistTex}
            color="#9FB6D8"
            transparent
            opacity={b.o}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  )
}

// ────────────────────────────────────────────────────────────────────
// Dirt road
// ────────────────────────────────────────────────────────────────────
function DirtRoad() {
  return (
    <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[2.0, 40]} />
      <meshStandardMaterial color={DIRT_ROAD} roughness={0.95} />
    </mesh>
  )
}

// ────────────────────────────────────────────────────────────────────
// Ground plane
// ────────────────────────────────────────────────────────────────────
function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
      <planeGeometry args={[100, 100]} />
      <meshStandardMaterial color={GROUND_COLOR} roughness={1.0} />
    </mesh>
  )
}

// ────────────────────────────────────────────────────────────────────
// Persimmon tree — silhouette in twilight
// ────────────────────────────────────────────────────────────────────
function PersimmonTree({ position }: { position: [number, number, number] }) {
  const fruits = useMemo(() => {
    const result: [number, number, number][] = []
    for (let i = 0; i < 10; i++) {
      const angle = (i / 10) * Math.PI * 2 + i * 0.3
      const r = 0.4 + (i % 3) * 0.25
      const y = 2.8 + Math.sin(i * 1.7) * 0.4
      result.push([Math.cos(angle) * r, y, Math.sin(angle) * r])
    }
    return result
  }, [])

  return (
    <group position={position}>
      {/* Trunk */}
      <mesh position={[0, 1.0, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.12, 2.0, 8]} />
        <meshStandardMaterial color="#2A2420" roughness={0.9} />
      </mesh>
      {/* Branches */}
      <mesh position={[-0.3, 2.2, 0]} rotation={[0, 0, -0.5]} castShadow>
        <cylinderGeometry args={[0.03, 0.05, 1.0, 6]} />
        <meshStandardMaterial color="#2A2420" roughness={0.9} />
      </mesh>
      <mesh position={[0.3, 2.3, 0.1]} rotation={[0, 0, 0.4]} castShadow>
        <cylinderGeometry args={[0.03, 0.05, 0.9, 6]} />
        <meshStandardMaterial color="#2A2420" roughness={0.9} />
      </mesh>
      {/* Canopy — dark silhouette */}
      <mesh position={[0, 2.8, 0]} castShadow>
        <sphereGeometry args={[0.9, 16, 12]} />
        <meshStandardMaterial
          color="#1A2A12"
          roughness={0.9}
          transparent
          opacity={0.9}
        />
      </mesh>
      {/* Persimmon fruits */}
      {fruits.map((pos, i) => (
        <mesh key={i} position={pos} castShadow>
          <sphereGeometry args={[0.06, 8, 8]} />
          <meshStandardMaterial
            color="#8A3018"
            emissive="#4A1808"
            emissiveIntensity={0.4}
          />
        </mesh>
      ))}
    </group>
  )
}

// ────────────────────────────────────────────────────────────────────
// Fireflies — warm yellow-green sparkles hovering in the twilight
// ────────────────────────────────────────────────────────────────────
function Fireflies() {
  return (
    <>
      {/* Fireflies around the road and paddies */}
      <SeededSparkles
        seed={41}
        count={40}
        scale={[16, 3, 18]}
        size={5}
        speed={0.3}
        color="#CCDD44"
        opacity={0.8}
        position={[0, 1.0, -5]}
      />
      {/* Fireflies near the house — warmer */}
      <SeededSparkles
        seed={42}
        count={20}
        scale={[6, 2, 6]}
        size={4}
        speed={0.25}
        color="#FFD844"
        opacity={0.7}
        position={[0, 1.2, -12]}
      />
      {/* Low fireflies over the paddies */}
      <SeededSparkles
        seed={43}
        count={25}
        scale={[12, 1.5, 10]}
        size={3.5}
        speed={0.2}
        color="#BBCC33"
        opacity={0.6}
        position={[0, 0.5, 0]}
      />
    </>
  )
}

// ────────────────────────────────────────────────────────────────────
// Twilight sky gradient — visible backdrop behind the mountains
// ────────────────────────────────────────────────────────────────────
function TwilightSky() {
  return (
    <group position={[0, 0, -55]}>
      {/* Deep blue-purple upper sky */}
      <mesh position={[0, 20, 0]}>
        <planeGeometry args={[160, 30]} />
        <meshBasicMaterial
          color="#0A1030"
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      {/* Blue-indigo middle band */}
      <mesh position={[0, 8, 0]}>
        <planeGeometry args={[160, 12]} />
        <meshBasicMaterial
          color="#121838"
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      {/* Horizon band — slightly lighter blue with faint purple */}
      <mesh position={[0, 2, 0.1]}>
        <planeGeometry args={[160, 6]} />
        <meshBasicMaterial
          color="#1A2248"
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      {/* Warm remnant sunset glow at the very bottom of horizon */}
      <mesh position={[-5, -0.5, 0.2]}>
        <planeGeometry args={[80, 2.5]} />
        <meshBasicMaterial
          color="#2A1838"
          transparent
          opacity={0.5}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  )
}

// ────────────────────────────────────────────────────────────────────
// Animated camera — subtle drift for cinematic feel
// ────────────────────────────────────────────────────────────────────
function CameraDrift() {
  const yieldCamera = useCameraHandoff()
  useFrame(({ camera, clock }) => {
    if (yieldCamera()) return
    const t = clock.getElapsedTime()
    camera.position.x = 0.3 + Math.sin(t * 0.15) * 0.08
    camera.position.y = 1.8 + Math.sin(t * 0.1) * 0.03
    camera.lookAt(0, 0.9, -7)
  })
  return null
}

// ────────────────────────────────────────────────────────────────────
// Scene content — everything inside the Canvas
// ────────────────────────────────────────────────────────────────────
function SceneContent() {
  return (
    <>
      {/* Camera animation */}
      <CameraDrift />

      {/* A moonlit sky for the water to mirror and for every standard
          material to pick up bounce from. The moon disc sits where the Moon
          mesh does — up and to the right — so the paddies catch it. */}
      <GradientEnvironment
        zenith="#0A1230"
        horizon="#22355E"
        ground="#0C1424"
        sun={{ color: '#C9D6F2', azimuthDeg: 16, elevationDeg: 13, sizeDeg: 3, glowDeg: 34 }}
        intensity={1.1}
      />

      {/* Lighting — moonlit ambience with blue tone */}
      <ambientLight intensity={0.17} color="#4060A0" />

      {/* Moon directional — cool blue-white, strong */}
      <directionalLight
        position={[8, 12, -20]}
        intensity={1.8}
        color="#8898C0"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={60}
        shadow-camera-left={-15}
        shadow-camera-right={15}
        shadow-camera-top={10}
        shadow-camera-bottom={-2}
      />
      {/* Fill from the left — blue */}
      <pointLight position={[-8, 3, 5]} intensity={2.2} color="#3050A0" decay={1.5} />
      {/* Overhead fill so ground is visible */}
      <directionalLight position={[0, 10, 0]} intensity={0.55} color="#6080C0" />

      {/* Seeded, not drei's <Stars>: that builds its 3000 positions from
          Math.random() at mount, so every parallel render tab got a
          different sky and the starfield strobed — same defect as
          <Sparkles> and <Float>. */}
      <SeededSparkles seed={51} count={900} scale={[420, 200, 420]} size={1.5}
        speed={0.05} color="#DCE6FF" opacity={0.85} position={[0, 60, -80]} />
      <SeededSparkles seed={52} count={400} scale={[380, 150, 380]} size={2.3}
        speed={0.08} color="#FFF2D8" opacity={0.6} position={[0, 70, -60]} />

      {/* Atmospheric fog — blue-grey, pushed back */}
      <fog attach="fog" args={['#101828', 20, 55]} />
      <color attach="background" args={[SKY_DEEP]} />

      {/* Twilight sky backdrop */}
      <TwilightSky />

      {/* Moon — rising above the mountains */}
      <Moon position={[10, 8, -38]} />

      {/* Ground */}
      <Ground />
      <DirtRoad />

      {/* Rice paddies — left and right of the road */}
      <RicePaddy position={[-4.0, 0, -6]} width={5.5} depth={14} />
      <RicePaddy position={[4.0, 0, -6]} width={5.5} depth={14} />
      <RicePaddy position={[-3.5, 0, 5]} width={4.5} depth={6} />
      <RicePaddy position={[3.5, 0, 5]} width={4.5} depth={6} />

      {/* Mist sits above the water and below the treetops, so it goes in
          after the paddies and before the house. */}
      <GroundMist />

      {/* Hanok farmhouse at the end of the road — warm beacon */}
      <Hanok position={[0, 0, -14]} />

      {/* Persimmon tree beside the house — right */}
      <PersimmonTree position={[2.8, 0, -13]} />

      {/* Bare winter tree on the left — compositional balance */}
      <group position={[-3.2, 0, -10]}>
        <mesh position={[0, 1.2, 0]} castShadow>
          <cylinderGeometry args={[0.06, 0.1, 2.4, 8]} />
          <meshStandardMaterial color="#1A1818" roughness={0.9} />
        </mesh>
        <mesh position={[-0.4, 2.4, 0]} rotation={[0, 0, -0.6]} castShadow>
          <cylinderGeometry args={[0.02, 0.04, 1.2, 6]} />
          <meshStandardMaterial color="#1A1818" roughness={0.9} />
        </mesh>
        <mesh position={[0.3, 2.6, 0.1]} rotation={[0, 0, 0.5]} castShadow>
          <cylinderGeometry args={[0.02, 0.04, 1.0, 6]} />
          <meshStandardMaterial color="#1A1818" roughness={0.9} />
        </mesh>
        <mesh position={[0.1, 2.9, -0.1]} rotation={[0.2, 0, 0.3]} castShadow>
          <cylinderGeometry args={[0.015, 0.03, 0.8, 6]} />
          <meshStandardMaterial color="#1A1818" roughness={0.9} />
        </mesh>
      </group>

      {/* Glowing parent walking toward the house with child on their shoulders */}
      <ShoulderCarryPair />

      {/* Fireflies */}
      <Fireflies />

      {/* Mountains in the far background */}
      <Mountains />
    </>
  )
}

// ────────────────────────────────────────────────────────────────────
// Main export — SceneShell owns the container/Canvas/DebugCamera, so this
// scene renders identically in the live viewer and in a Remotion render.
// ────────────────────────────────────────────────────────────────────
export default createScene({
  background: '#000',
  three: {
    camera: {
      position: [0.3, 2.2, 8.5],
      fov: 45,
      near: 0.3,
      far: 180,
    },
    gl: {
      antialias: true,
      toneMapping: THREE.ACESFilmicToneMapping,
      toneMappingExposure: 1.4,
    },
    onCreated: ({ camera }) => camera.lookAt(0, 2.4, -10),
    // Orbit pivot on the walking pair so rotation frames the shoulder-carry.
    debugTarget: [-0.4, 2.6, -1],
  },
}, function Act3_2() {
  return (
    <>
      <SceneContent />
      <EffectComposer>
        <Bloom
          intensity={0.7}
          luminanceThreshold={0.3}
          luminanceSmoothing={0.9}
          mipmapBlur
        />
        {/* Shallow enough to keep a sense of depth, wide enough that the
            house, the pair and the near road are all readable. At 0.05/0.08
            the in-focus band was so narrow that almost the whole frame sat
            outside it and the shot just read as soft. */}
        <DepthOfField
          focusDistance={0.11}
          focalLength={0.34}
          bokehScale={0.7}
        />
        <Vignette eskil={false} offset={0.15} darkness={0.6} />
      </EffectComposer>
    </>
  )
})
