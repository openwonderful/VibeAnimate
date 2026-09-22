import { useRef, useMemo } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Stars } from '@react-three/drei'
import { EffectComposer, Bloom, DepthOfField, Vignette } from '@react-three/postprocessing'
import * as THREE from 'three'
import { DebugCamera, useCameraHandoff } from '../DebugCamera'
import { GoldFigure } from '../characters/goldFigure'

/**
 * Act 7-B — "Somebody Like You" — FROM THE DOORWAY
 *
 * Camera placed inside the house doorway, looking OUT down the road.
 * Seven warm figures approach like lanterns in the dark — people on the
 * road for the first time in years. The door frame edges are visible.
 * Interior warm light (#F5C36C) spills forward onto the road. The golden
 * figure (#D4A843) is among them, brighter than the rest.
 *
 * This is the parent's perspective. HOPE — the road has people again.
 *
 * Spatial layout (z-axis):
 *   camera at z=-1.5 → door frame at z=0 → road/figures at z=5..25+
 */

// ── Colors ───────────────────────────────────────────────────────
const NIGHT_SKY       = '#050A14'
const DUSK_HORIZON    = '#121E35'
const DUSK_BAND       = '#1E1438'
const ROAD_BROWN      = '#3E2C1E'
const ROAD_EDGE       = '#2A1E14'
const PADDY_DARK      = '#0C1A15'
const PADDY_WATER     = '#0A1520'
const STICK_GOLD      = '#D4A843'
const STICK_AMBER     = '#C4913A'
const STICK_WARM      = '#B88030'
const STICK_DIM       = '#8B6914'
const DOOR_LIGHT      = '#F5C36C'
const DOOR_FRAME_COL  = '#3D2E1E'
const FIREFLY_WARM    = '#D4C85C'

// ── Seeded random ────────────────────────────────────────────────
function seededRandom(seed: number) {
  let s = seed
  return () => {
    s = (s * 16807 + 0) % 2147483647
    return (s - 1) / 2147483646
  }
}

// ── Walking Stick Figure ─────────────────────────────────────────
// Bodies are rendered with <GoldFigure> (self-lit via MeshBasicMaterial),
// so limbs read as continuous lantern-glow forms. Golden walker gets
// additional glow halos and a point light.
interface WalkerProps {
  position: [number, number, number]
  color: string
  emissiveIntensity: number
  scale?: number
  walkPhase?: number
  isGolden?: boolean
}

function Walker({
  position,
  color,
  emissiveIntensity,
  scale = 1,
  walkPhase = 0,
  isGolden = false,
}: WalkerProps) {
  const groupRef = useRef<THREE.Group>(null)

  const mat = useMemo(() => new THREE.MeshBasicMaterial({
    color,
    toneMapped: false,
  }), [color])

  const glowMat = useMemo(() => isGolden ? new THREE.MeshBasicMaterial({
    color: STICK_GOLD,
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: false,
  }) : null, [isGolden])

  const outerGlowMat = useMemo(() => isGolden ? new THREE.MeshBasicMaterial({
    color: '#E8C060',
    transparent: true,
    opacity: 0.07,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: false,
  }) : null, [isGolden])

  useFrame(({ clock }) => {
    if (!groupRef.current) return
    const t = clock.getElapsedTime() * 1.4 + walkPhase
    groupRef.current.position.y = position[1] + Math.abs(Math.sin(t)) * 0.02
  })

  // Phase offset: GoldFigure uses [0, 1] range; walkPhase here is in radians,
  // so normalize. Used to desync each walker's stride.
  const phaseOffset = ((walkPhase / (2 * Math.PI)) % 1 + 1) % 1

  return (
    <group ref={groupRef} position={position} scale={scale}>
      <GoldFigure
        pose="walking"
        animate
        inPlace
        material={mat}
        phaseOffset={phaseOffset}
      />

      {isGolden && glowMat && (
        <mesh position={[0, 1.2, 0]} material={glowMat}>
          <sphereGeometry args={[0.5, 14, 10]} />
        </mesh>
      )}
      {isGolden && outerGlowMat && (
        <mesh position={[0, 1.2, 0]} material={outerGlowMat}>
          <sphereGeometry args={[1.0, 14, 10]} />
        </mesh>
      )}

      <pointLight
        position={[0, 1.25, 0]}
        color={isGolden ? STICK_GOLD : STICK_AMBER}
        intensity={isGolden ? 6 : 2 * emissiveIntensity}
        distance={isGolden ? 12 : 6}
        decay={1.5}
      />

      {!isGolden && (
        <mesh position={[0, 1.2, 0]}>
          <sphereGeometry args={[0.25, 8, 6]} />
          <meshBasicMaterial color={color} transparent opacity={0.07} depthWrite={false} toneMapped={false} />
        </mesh>
      )}
    </group>
  )
}

// ── Door Frame ───────────────────────────────────────────────────
// Positioned at z=0. Camera behind at z=-1.5. The frame is a thick
// rectangle with a rectangular opening in the middle. Interior walls
// extend behind (negative z) from the frame.
function DoorFrame() {
  const frameMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: DOOR_FRAME_COL,
    emissive: DOOR_LIGHT,
    emissiveIntensity: 0.2,
    roughness: 0.85,
  }), [])

  const innerWallMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#5A4030',
    emissive: DOOR_LIGHT,
    emissiveIntensity: 0.18,
    roughness: 0.8,
  }), [])

  const fd = 0.6      // frame depth (z)
  const fw = 0.4      // frame member width — thick rustic frame
  const doorW = 3.0    // slightly narrower for more frame presence
  const doorH = 3.0    // shorter so lintel is visible
  const cy = 1.35      // slightly lower to show lintel

  return (
    <group position={[0, cy, 0.1]}>
      {/* Left jamb */}
      <mesh position={[-doorW / 2 - fw / 2, 0, 0]} material={frameMat}>
        <boxGeometry args={[fw, doorH + fw, fd]} />
      </mesh>
      {/* Right jamb */}
      <mesh position={[doorW / 2 + fw / 2, 0, 0]} material={frameMat}>
        <boxGeometry args={[fw, doorH + fw, fd]} />
      </mesh>
      {/* Lintel */}
      <mesh position={[0, doorH / 2 + fw / 2, 0]} material={frameMat}>
        <boxGeometry args={[doorW + fw * 2 + 0.1, fw + 0.08, fd]} />
      </mesh>
      {/* Threshold — slightly thicker for visibility */}
      <mesh position={[0, -doorH / 2 - 0.05, 0]} material={frameMat}>
        <boxGeometry args={[doorW + fw * 2 + 0.1, 0.2, fd]} />
      </mesh>

      {/* Bright inner edges of the frame — catch the interior light */}
      <mesh position={[-doorW / 2 + 0.015, 0, -fd / 2 + 0.05]}>
        <boxGeometry args={[0.035, doorH, fd * 0.6]} />
        <meshBasicMaterial color={DOOR_LIGHT} toneMapped={false} />
      </mesh>
      <mesh position={[doorW / 2 - 0.015, 0, -fd / 2 + 0.05]}>
        <boxGeometry args={[0.035, doorH, fd * 0.6]} />
        <meshBasicMaterial color={DOOR_LIGHT} toneMapped={false} />
      </mesh>
      <mesh position={[0, doorH / 2 - 0.01, -fd / 2 + 0.05]}>
        <boxGeometry args={[doorW, 0.035, fd * 0.6]} />
        <meshBasicMaterial color={DOOR_LIGHT} toneMapped={false} />
      </mesh>
      <mesh position={[0, -doorH / 2 + 0.03, -fd / 2 + 0.05]}>
        <boxGeometry args={[doorW, 0.035, fd * 0.6]} />
        <meshBasicMaterial color="#C4943A" toneMapped={false} />
      </mesh>

      {/* Interior walls — extend BEHIND the camera (negative Z from frame) */}
      {/* Left wall */}
      <mesh position={[-doorW / 2 - fw - 2.0, 0, -2.5]} material={innerWallMat}>
        <boxGeometry args={[4, doorH + 2, 0.12]} />
      </mesh>
      {/* Right wall */}
      <mesh position={[doorW / 2 + fw + 2.0, 0, -2.5]} material={innerWallMat}>
        <boxGeometry args={[4, doorH + 2, 0.12]} />
      </mesh>
      {/* Ceiling */}
      <mesh position={[0, doorH / 2 + fw + 1.0, -2.5]}>
        <boxGeometry args={[12, 2, 0.12]} />
        <meshStandardMaterial color="#1E1610" emissive={DOOR_LIGHT} emissiveIntensity={0.04} roughness={0.9} />
      </mesh>
      {/* Floor inside */}
      <mesh position={[0, -doorH / 2 - 0.1, -1.5]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[12, 4]} />
        <meshStandardMaterial color="#4A3420" emissive={DOOR_LIGHT} emissiveIntensity={0.08} roughness={0.9} />
      </mesh>
    </group>
  )
}

// ── Interior Light Spill ─────────────────────────────────────────
function InteriorLightSpill() {
  const lightRef = useRef<THREE.SpotLight>(null)
  const targetRef = useRef<THREE.Object3D>(null)

  useFrame(({ clock }) => {
    if (!lightRef.current) return
    const t = clock.getElapsedTime()
    lightRef.current.intensity = 14 + Math.sin(t * 3.7) * 1.2 + Math.sin(t * 7.1) * 0.5
    if (targetRef.current) lightRef.current.target = targetRef.current
  })

  return (
    <>
      <object3D ref={targetRef} position={[0, 0, 18]} />

      {/* Main forward spotlight from behind camera through doorway */}
      <spotLight
        ref={lightRef}
        position={[0, 2.2, -1.0]}
        color={DOOR_LIGHT}
        intensity={14}
        distance={35}
        angle={0.75}
        penumbra={0.6}
        decay={1.5}
      />

      {/* Interior warm fill */}
      <pointLight position={[0, 2.5, -3]} color={DOOR_LIGHT} intensity={5} distance={10} decay={1.5} />
      <pointLight position={[0, 1.5, -1.0]} color="#E8B84D" intensity={4} distance={6} decay={1.5} />

      {/* Visible light cone on road */}
      <LightConeOnRoad />
    </>
  )
}

// ── Visible light cone on the road ───────────────────────────────
function LightConeOnRoad() {
  const matRef = useRef<THREE.MeshBasicMaterial>(null)

  useFrame(({ clock }) => {
    if (!matRef.current) return
    matRef.current.opacity = 0.12 + Math.sin(clock.getElapsedTime() * 2.3) * 0.02
  })

  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    // Fan from doorstep out onto road
    const verts = new Float32Array([
      -0.8, 0.02, 1.0,    // near door left
       0.8, 0.02, 1.0,    // near door right
      -5.0, 0.01, 18,     // far left
       5.0, 0.01, 18,     // far right
    ])
    g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3))
    g.setAttribute('uv', new THREE.Float32BufferAttribute([0,0, 1,0, 0,1, 1,1], 2))
    g.setIndex(new THREE.BufferAttribute(new Uint16Array([0,2,1, 1,2,3]), 1))
    g.computeVertexNormals()
    return g
  }, [])

  return (
    <mesh geometry={geo}>
      <meshBasicMaterial
        ref={matRef}
        color={DOOR_LIGHT}
        transparent
        opacity={0.12}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </mesh>
  )
}

// ── Road ─────────────────────────────────────────────────────────
function Road() {
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    const segs = 24
    const pos: number[] = []
    const uvs: number[] = []
    const idx: number[] = []

    for (let i = 0; i <= segs; i++) {
      const t = i / segs
      const z = t * 55
      const w = THREE.MathUtils.lerp(1.2, 12, t * t)
      pos.push(-w / 2, 0.001, z, w / 2, 0.001, z)
      uvs.push(0, t, 1, t)
    }
    for (let i = 0; i < segs; i++) {
      const a = i * 2, b = a + 1, c = a + 2, d = a + 3
      idx.push(a,c,b, b,c,d)
    }

    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
    g.setIndex(idx)
    g.computeVertexNormals()
    return g
  }, [])

  return (
    <group>
      <mesh geometry={geo}>
        <meshStandardMaterial color={ROAD_BROWN} emissive={ROAD_BROWN} emissiveIntensity={0.06} roughness={0.92} />
      </mesh>
      <mesh geometry={geo} position={[0, -0.003, 0]} scale={[1.12, 1, 1]}>
        <meshStandardMaterial color={ROAD_EDGE} roughness={0.95} />
      </mesh>
    </group>
  )
}

// ── Rice paddies ─────────────────────────────────────────────────
function RicePaddies() {
  const waterMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: PADDY_WATER, emissive: '#061018', emissiveIntensity: 0.2, roughness: 0.15, metalness: 0.3,
  }), [])

  return (
    <group>
      <mesh position={[-9, -0.02, 22]} rotation={[-Math.PI / 2, 0, 0]} material={waterMat}>
        <planeGeometry args={[14, 55]} />
      </mesh>
      <mesh position={[9, -0.02, 22]} rotation={[-Math.PI / 2, 0, 0]} material={waterMat}>
        <planeGeometry args={[14, 55]} />
      </mesh>
      <mesh position={[-2.8, 0.04, 22]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.3, 55]} />
        <meshStandardMaterial color={PADDY_DARK} roughness={0.9} />
      </mesh>
      <mesh position={[2.8, 0.04, 22]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.3, 55]} />
        <meshStandardMaterial color={PADDY_DARK} roughness={0.9} />
      </mesh>
      <RiceStalks side="left" />
      <RiceStalks side="right" />
    </group>
  )
}

function RiceStalks({ side }: { side: 'left' | 'right' }) {
  const rng = seededRandom(side === 'left' ? 150 : 250)
  const xSign = side === 'left' ? -1 : 1

  const stalks = useMemo(() => {
    const arr: { pos: [number, number, number]; height: number; sway: number }[] = []
    for (let row = 0; row < 14; row++) {
      for (let col = 0; col < 5; col++) {
        arr.push({
          pos: [xSign * (3.5 + col * 1.3 + (rng() - 0.5) * 0.4), 0.15, 4 + row * 3 + (rng() - 0.5)],
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
      const s = stalks[i]; if (!s) return
      child.rotation.x = Math.sin(t * 0.8 + s.sway) * 0.06
      child.rotation.z = Math.cos(t * 0.6 + s.sway) * 0.04
    })
  })

  return (
    <group ref={groupRef}>
      {stalks.map((s, i) => (
        <mesh key={i} position={s.pos}>
          <cylinderGeometry args={[0.008, 0.01, s.height, 4]} />
          <meshStandardMaterial color="#2A4A2A" emissive="#1A2A1A" emissiveIntensity={0.1} roughness={0.9} />
        </mesh>
      ))}
    </group>
  )
}

// ── Fireflies ────────────────────────────────────────────────────
function Fireflies({ count = 100 }: { count?: number }) {
  const ref = useRef<THREE.Points>(null)
  const { basePositions, phases, speeds } = useMemo(() => {
    const rng = seededRandom(777)
    const bp = new Float32Array(count * 3), ph = new Float32Array(count), sp = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      const side = rng() > 0.5 ? 1 : -1
      bp[i*3] = side * (1.5 + rng() * 9)
      bp[i*3+1] = 0.2 + rng() * 2.5
      bp[i*3+2] = 3 + rng() * 42
      ph[i] = rng() * Math.PI * 2
      sp[i] = 0.4 + rng() * 1.2
    }
    return { basePositions: bp, phases: ph, speeds: sp }
  }, [count])

  const positions = useMemo(() => new Float32Array(basePositions), [basePositions])

  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = clock.getElapsedTime()
    const pos = ref.current.geometry.attributes.position as THREE.BufferAttribute
    const arr = pos.array as Float32Array
    for (let i = 0; i < count; i++) {
      arr[i*3] = basePositions[i*3] + Math.sin(t * speeds[i] * 0.3 + phases[i]) * 0.3
      arr[i*3+1] = basePositions[i*3+1] + Math.sin(t * speeds[i] + phases[i]) * 0.15
      arr[i*3+2] = basePositions[i*3+2] + Math.cos(t * speeds[i] * 0.4 + phases[i] * 1.3) * 0.2
    }
    pos.needsUpdate = true
    ;(ref.current.material as THREE.PointsMaterial).size = 0.15 + Math.sin(t * 2) * 0.03
  })

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color={FIREFLY_WARM} size={0.15} transparent opacity={0.85} depthWrite={false} blending={THREE.AdditiveBlending} sizeAttenuation />
    </points>
  )
}

function CloseFireflies({ count = 25 }: { count?: number }) {
  const ref = useRef<THREE.Points>(null)
  const { basePositions, phases } = useMemo(() => {
    const rng = seededRandom(888)
    const bp = new Float32Array(count * 3), ph = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      const side = rng() > 0.5 ? 1 : -1
      bp[i*3] = side * (0.3 + rng() * 2.5)
      bp[i*3+1] = 0.3 + rng() * 2.0
      bp[i*3+2] = 2 + rng() * 10
      ph[i] = rng() * Math.PI * 2
    }
    return { basePositions: bp, phases: ph }
  }, [count])

  const positions = useMemo(() => new Float32Array(basePositions), [basePositions])

  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = clock.getElapsedTime()
    const pos = ref.current.geometry.attributes.position as THREE.BufferAttribute
    const arr = pos.array as Float32Array
    for (let i = 0; i < count; i++) {
      arr[i*3] = basePositions[i*3] + Math.sin(t * 0.7 + phases[i]) * 0.15
      arr[i*3+1] = basePositions[i*3+1] + Math.sin(t * 1.2 + phases[i]) * 0.2
      arr[i*3+2] = basePositions[i*3+2] + Math.cos(t * 0.5 + phases[i]) * 0.1
    }
    pos.needsUpdate = true
  })

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color={DOOR_LIGHT} size={0.22} transparent opacity={0.6} depthWrite={false} blending={THREE.AdditiveBlending} sizeAttenuation />
    </points>
  )
}

// ── Ground ───────────────────────────────────────────────────────
function Ground() {
  return (
    <mesh position={[0, -0.02, 22]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[70, 70]} />
      <meshStandardMaterial color="#0C1008" emissive="#06080A" emissiveIntensity={0.15} roughness={0.95} />
    </mesh>
  )
}

// ── Distant mountains ────────────────────────────────────────────
function DistantMountains() {
  const peaks = useMemo(() => {
    const rng = seededRandom(321)
    return Array.from({ length: 10 }, () => ({
      x: -25 + rng() * 50,
      height: 2 + rng() * 4,
      width: 4 + rng() * 4,
    }))
  }, [])

  return (
    <group position={[0, 0, 55]}>
      {peaks.map((p, i) => (
        <mesh key={i} position={[p.x, p.height / 2 - 1, 0]}>
          <coneGeometry args={[p.width / 2, p.height, 4]} />
          <meshStandardMaterial color="#101A28" emissive="#0A1018" emissiveIntensity={0.15} roughness={1} />
        </mesh>
      ))}
    </group>
  )
}

// ── Night sky ────────────────────────────────────────────────────
function NightSky() {
  return (
    <group position={[0, 10, 60]}>
      <mesh><planeGeometry args={[110, 40]} /><meshStandardMaterial color={NIGHT_SKY} roughness={1} /></mesh>
      <mesh position={[0, -14, 0.1]}><planeGeometry args={[110, 10]} /><meshStandardMaterial color={DUSK_HORIZON} roughness={1} /></mesh>
      <mesh position={[0, -18, 0.2]}><planeGeometry args={[110, 4]} /><meshStandardMaterial color={DUSK_BAND} roughness={1} /></mesh>
    </group>
  )
}

// ── Camera ───────────────────────────────────────────────────────
function CameraAnimation() {
  const { camera } = useThree()
  const yieldCamera = useCameraHandoff()

  useFrame(({ clock }) => {
    if (yieldCamera()) return
    const t = clock.getElapsedTime()
    camera.position.x = Math.sin(t * 0.08) * 0.04
    camera.position.y = 1.5 + Math.sin(t * 0.12) * 0.02
    camera.lookAt(0, 0.8, 15)
  })
  return null
}

// ── Seven approaching figures ────────────────────────────────────
const WALKERS: WalkerProps[] = [
  // Closest pair — nearly at doorstep, large and bright
  { position: [-0.6, 0, 3], color: STICK_AMBER, emissiveIntensity: 0.5, scale: 1.3, walkPhase: 0 },
  { position: [0.7, 0, 4.5], color: STICK_WARM, emissiveIntensity: 0.4, scale: 1.2, walkPhase: 1.5 },
  // Mid cluster — golden figure center and brightest
  { position: [0.0, 0, 7], color: STICK_GOLD, emissiveIntensity: 1.0, scale: 1.1, walkPhase: 0.8, isGolden: true },
  { position: [-0.8, 0, 8.5], color: STICK_AMBER, emissiveIntensity: 0.35, scale: 1.0, walkPhase: 2.4 },
  { position: [0.9, 0, 10], color: STICK_DIM, emissiveIntensity: 0.3, scale: 0.9, walkPhase: 3.2 },
  // Further
  { position: [-0.3, 0, 14], color: STICK_WARM, emissiveIntensity: 0.22, scale: 0.75, walkPhase: 4.5 },
  // Farthest
  { position: [0.4, 0, 20], color: STICK_DIM, emissiveIntensity: 0.15, scale: 0.6, walkPhase: 5.8 },
]

// ── Main Scene ───────────────────────────────────────────────────
function DoorwayScene() {
  return (
    <>
      <ambientLight color="#1A1828" intensity={0.8} />
      <directionalLight position={[8, 18, 20]} color="#7088B0" intensity={0.5} />
      <hemisphereLight color="#1E1E3A" groundColor="#141008" intensity={0.3} />

      <CameraAnimation />
      <NightSky />
      <DistantMountains />
      <Stars radius={60} depth={40} count={3000} factor={3} saturation={0.1} fade speed={0.3} />

      <Ground />
      <Road />
      <RicePaddies />
      <DoorFrame />
      <InteriorLightSpill />

      {WALKERS.map((w, i) => <Walker key={i} {...w} />)}

      <Fireflies count={100} />
      <CloseFireflies count={25} />

      <fog attach="fog" args={['#0A1220', 18, 55]} />
    </>
  )
}

// ── Exported Component ───────────────────────────────────────────
export default function Act7_B() {
  return (
    <div style={{ width: '100vw', height: '100vh', background: NIGHT_SKY }}>
      <Canvas
        style={{ width: '100%', height: '100%' }}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.5 }}
        camera={{ position: [0, 1.5, -1.2], fov: 62, near: 0.1, far: 80 }}
      >
        <DebugCamera />
        <DoorwayScene />
        <EffectComposer>
          <Bloom intensity={0.7} luminanceThreshold={0.35} luminanceSmoothing={0.9} mipmapBlur />
          <DepthOfField focusDistance={0.03} focalLength={0.06} bokehScale={2.5} />
          <Vignette eskil={false} offset={0.15} darkness={0.6} />
        </EffectComposer>
      </Canvas>
    </div>
  )
}
