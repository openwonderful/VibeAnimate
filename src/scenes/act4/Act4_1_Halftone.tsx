/**
 * Act 4.1-Halftone — "Industrialization Timelapse, Comic Halftone"
 *
 * Same 4.1 scene, post-processed with three-stdlib's HalftoneShader (an
 * RGB halftone / newsprint dot pattern) for a comic-book / Lichtenstein
 * look. Shape, radius, and per-channel rotation are all tweakable on the
 * pass — no custom GLSL written here.
 */

import { useRef, useMemo, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Stars } from '@react-three/drei'
import * as THREE from 'three'
import {
  EffectComposer as StdlibEffectComposer,
  RenderPass,
  ShaderPass,
  HalftoneShader,
} from 'three-stdlib'
import { DebugCamera } from '../DebugCamera'
import { generateBuildingRow, type BuildingData } from '../zoom/CityBuildings3D'
import {
  createFarMountainShape,
  createMidMountainShape,
  createBaekduMountainShapes,
} from '../act1/mountainShapes'

// ─────────────────────────────────────────────────────────────────────
// Timeline
// ─────────────────────────────────────────────────────────────────────
const HOLD_END = 2.0      // hold the established tableau
const LAPSE_END = 16.0    // industrialization finishes
const SETTLE_END = 18.0   // lapse settles into Act 4 opening state
const DAY_NIGHT_CYCLES = 4 // how many full day/night flips across the lapse

// ─────────────────────────────────────────────────────────────────────
// Palette
// ─────────────────────────────────────────────────────────────────────
const SKY_NIGHT_TOP = new THREE.Color('#02040E')
const SKY_NIGHT_HORIZON = new THREE.Color('#12183A')
const SKY_DAY_TOP = new THREE.Color('#4A8CE8')
const SKY_DAY_HORIZON = new THREE.Color('#BDE0FF')
const SKY_SUNSET_TOP = new THREE.Color('#8A3A60')
const SKY_SUNSET_HORIZON = new THREE.Color('#FF8A30')
const SKY_DAWN = new THREE.Color('#0F1A30')

const AMBIENT_NIGHT = new THREE.Color('#3050A0')
const AMBIENT_DAY = new THREE.Color('#FFE8C0')

const MOON_COLOR = new THREE.Color('#A8ACB4')
const SUN_COLOR = new THREE.Color('#FFB040')

const WARM_AMBER = new THREE.Color('#FFBA42')
const COLD_LED = new THREE.Color('#C8E0FF')

const HOUSE_WALL = '#4A5A70'
const HOUSE_ROOF = '#2A3848'

const DIRT_ROAD = new THREE.Color('#6A5B40')
const ASPHALT = new THREE.Color('#161820')

const PADDY_BERM = '#3A4A38'
const PADDY_WATER = new THREE.Color('#2A3A5A')

const MOUNTAIN_FAR = '#1E2845'
const CITY_DARK_A = '#1a1a30'
const CITY_DARK_B = '#171730'
const CITY_DARK_C = '#121228'

// ─────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────
function clamp01(x: number) {
  return x < 0 ? 0 : x > 1 ? 1 : x
}
function smoothstep(a: number, b: number, t: number) {
  const x = clamp01((t - a) / (b - a))
  return x * x * (3 - 2 * x)
}
function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

// Ease a value "on" at a given lapse threshold with a soft ramp.
// Returns 0 before `at`, ramps to 1 over `ramp` units.
function rampAt(lapse: number, at: number, ramp = 0.08) {
  return smoothstep(at, at + ramp, lapse)
}

// ─────────────────────────────────────────────────────────────────────
// Single shared timeline state, refreshed each frame
// ─────────────────────────────────────────────────────────────────────
interface Timeline {
  t: number
  lapse: number   // 0..1 over the lapse window
  settle: number  // 0..1 over the settle window
  dayness: number // 0..1, 0=full night, 1=full day
  sunsetness: number // 0..1, peaks when sun is near the horizon
  phase: number   // continuous sky angle; 0=east horizon, π/2=zenith, π=west horizon, 3π/2=nadir
}
// Start one quarter-turn before sunrise so the hold sits in night with the body below the horizon
const PHASE_START = -Math.PI / 2
function computeTimeline(t: number): Timeline {
  const lapse = smoothstep(HOLD_END, LAPSE_END, t)
  const settle = smoothstep(LAPSE_END, SETTLE_END, t)
  let dayness: number
  let phase: number
  if (t < HOLD_END) {
    phase = PHASE_START
    dayness = 0.08 // twilight hold
  } else if (t < LAPSE_END) {
    const lapseT = t - HOLD_END
    phase = PHASE_START + (lapseT / (LAPSE_END - HOLD_END)) * DAY_NIGHT_CYCLES * Math.PI * 2
    // Continuous rotation: sin(phase) gives height of body; map to dayness
    dayness = clamp01((Math.sin(phase) + 1) / 2)
  } else {
    phase = PHASE_START + DAY_NIGHT_CYCLES * Math.PI * 2
    const endDayness = clamp01((Math.sin(phase) + 1) / 2)
    dayness = lerp(endDayness, 0.12, settle)
  }
  // Sunset/dawn peaks when the sun is near the horizon (sin(phase) ≈ 0) and sun is the dominant body
  const sunHeight = Math.sin(phase)
  const sunUp = sunHeight >= -0.15
  const sunsetness = sunUp ? Math.max(0, 1 - Math.abs(sunHeight) * 3) : 0
  return { t, lapse, settle, dayness, sunsetness, phase }
}

// Shared sky-arc geometry for the celestial body + directional key light
const SKY_RADIUS = 10
const SKY_CENTER_Y = 1

// ─────────────────────────────────────────────────────────────────────
// Animated sky — two stacked planes, colors lerp per-frame
// ─────────────────────────────────────────────────────────────────────
function AnimatedSky() {
  const mat = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      topColor: { value: SKY_NIGHT_TOP.clone() },
      horizonColor: { value: SKY_NIGHT_HORIZON.clone() },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 horizonColor;
      varying vec2 vUv;
      void main() {
        float t = smoothstep(0.0, 0.75, vUv.y);
        gl_FragColor = vec4(mix(horizonColor, topColor, t), 1.0);
      }
    `,
    side: THREE.DoubleSide,
    depthWrite: false,
    fog: false,
  }), [])

  const tmpTop = useMemo(() => new THREE.Color(), [])
  const tmpHorizon = useMemo(() => new THREE.Color(), [])

  useFrame(({ clock }) => {
    const { dayness, sunsetness, settle } = computeTimeline(clock.getElapsedTime())
    tmpTop.copy(SKY_NIGHT_TOP).lerp(SKY_DAY_TOP, dayness)
    if (sunsetness > 0) tmpTop.lerp(SKY_SUNSET_TOP, sunsetness * 0.7)
    if (settle > 0) tmpTop.lerp(SKY_DAWN, settle * 0.9)
    mat.uniforms.topColor.value.copy(tmpTop)

    tmpHorizon.copy(SKY_NIGHT_HORIZON).lerp(SKY_DAY_HORIZON, dayness)
    if (sunsetness > 0) tmpHorizon.lerp(SKY_SUNSET_HORIZON, sunsetness)
    if (settle > 0) tmpHorizon.lerp(SKY_DAWN, settle * 0.7)
    mat.uniforms.horizonColor.value.copy(tmpHorizon)
  })

  return (
    <mesh position={[0, 16, -55]} material={mat}>
      <planeGeometry args={[180, 50]} />
    </mesh>
  )
}

// ─────────────────────────────────────────────────────────────────────
// Stars — fade out during day, fade in during night
// ─────────────────────────────────────────────────────────────────────
function AnimatedStars() {
  const ref = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (!ref.current) return
    const { dayness } = computeTimeline(clock.getElapsedTime())
    // Scale stars by inverse dayness; Stars component uses its own opacity
    // so we wrap in a group and toggle visibility via scale instead.
    const s = 1 - dayness
    ref.current.children.forEach((c) => {
      const m = (c as THREE.Points).material as THREE.PointsMaterial | undefined
      if (m) {
        m.transparent = true
        m.opacity = s
      }
    })
  })
  return (
    <group ref={ref}>
      <Stars radius={100} depth={50} count={2500} factor={3} saturation={0.1} fade speed={0.5} />
    </group>
  )
}

// ─────────────────────────────────────────────────────────────────────
// Sky bodies — sun and moon orbit 180° apart, each hides below horizon
// ─────────────────────────────────────────────────────────────────────
function SkyBodies() {
  const sunRef = useRef<THREE.Group>(null)
  const moonRef = useRef<THREE.Group>(null)

  useFrame(({ clock }) => {
    const { phase } = computeTimeline(clock.getElapsedTime())
    const sunX = SKY_RADIUS * Math.cos(phase)
    const sunY = SKY_CENTER_Y + SKY_RADIUS * Math.sin(phase)
    const moonX = SKY_RADIUS * Math.cos(phase + Math.PI)
    const moonY = SKY_CENTER_Y + SKY_RADIUS * Math.sin(phase + Math.PI)
    if (sunRef.current) {
      sunRef.current.position.set(sunX, sunY, -80)
      sunRef.current.visible = sunY > -1.5
    }
    if (moonRef.current) {
      moonRef.current.position.set(moonX, moonY, -80)
      moonRef.current.visible = moonY > -1.5
    }
  })

  return (
    <>
      <group ref={sunRef}>
        <mesh>
          <sphereGeometry args={[1.4, 24, 24]} />
          <meshBasicMaterial color={SUN_COLOR} toneMapped={false} />
        </mesh>
        <mesh>
          <sphereGeometry args={[2.4, 24, 24]} />
          <meshBasicMaterial color={SUN_COLOR} transparent opacity={0.35} depthWrite={false} />
        </mesh>
        <mesh>
          <sphereGeometry args={[4.6, 24, 24]} />
          <meshBasicMaterial color={SUN_COLOR} transparent opacity={0.15} depthWrite={false} />
        </mesh>
      </group>
      <group ref={moonRef}>
        <mesh>
          <sphereGeometry args={[1.1, 24, 24]} />
          <meshBasicMaterial color={MOON_COLOR} toneMapped={false} />
        </mesh>
        <mesh>
          <sphereGeometry args={[1.9, 24, 24]} />
          <meshBasicMaterial color={MOON_COLOR} transparent opacity={0.22} depthWrite={false} />
        </mesh>
      </group>
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────
// Lighting — ambient + directional lerp between day/night
// ─────────────────────────────────────────────────────────────────────
function AnimatedLighting() {
  const ambRef = useRef<THREE.AmbientLight>(null)
  const dirRef = useRef<THREE.DirectionalLight>(null)
  const tmp = useMemo(() => new THREE.Color(), [])
  useFrame(({ clock }) => {
    const { dayness, phase } = computeTimeline(clock.getElapsedTime())
    if (ambRef.current) {
      tmp.copy(AMBIENT_NIGHT).lerp(AMBIENT_DAY, dayness)
      ambRef.current.color.copy(tmp)
      ambRef.current.intensity = lerp(0.45, 0.85, dayness)
    }
    if (dirRef.current) {
      // Key light follows whichever body is above the horizon
      const sunUp = Math.sin(phase) >= 0
      const keyPhase = sunUp ? phase : phase + Math.PI
      dirRef.current.position.set(
        SKY_RADIUS * Math.cos(keyPhase),
        Math.max(SKY_CENTER_Y + SKY_RADIUS * Math.sin(keyPhase), 1.5),
        -20,
      )
      if (sunUp) {
        dirRef.current.color.copy(SUN_COLOR)
        dirRef.current.intensity = lerp(0.2, 2.2, dayness)
      } else {
        dirRef.current.color.copy(MOON_COLOR)
        dirRef.current.intensity = 0.45
      }
    }
  })
  return (
    <>
      <ambientLight ref={ambRef} intensity={0.5} color={AMBIENT_NIGHT} />
      <directionalLight
        ref={dirRef}
        position={[8, 10, -20]}
        intensity={0.8}
        color={MOON_COLOR}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={80}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={15}
        shadow-camera-bottom={-5}
      />
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────
// Hanok — the home. Windows shift warm→cold, antenna/dish/AC bolt on
// ─────────────────────────────────────────────────────────────────────
function AnimatedHanok({ position }: { position: [number, number, number] }) {
  const windowMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: WARM_AMBER.clone(), transparent: true, opacity: 0.95, toneMapped: false,
  }), [])
  const spillMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: '#F5A030', transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide,
  }), [])
  const chimneyRef = useRef<THREE.Mesh>(null)
  const chimneySmokeMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: '#AAB4C4', transparent: true, opacity: 0.4, depthWrite: false,
  }), [])
  const antennaRef = useRef<THREE.Group>(null)
  const dishRef = useRef<THREE.Group>(null)
  const acRef = useRef<THREE.Group>(null)
  const interiorLightRef = useRef<THREE.PointLight>(null)
  const spillLightRef = useRef<THREE.PointLight>(null)
  const tmp = useMemo(() => new THREE.Color(), [])

  useFrame(({ clock }) => {
    const { t, lapse } = computeTimeline(clock.getElapsedTime())

    // Window color: warm amber → cold LED white as industry advances (late ramp)
    const coldness = rampAt(lapse, 0.75, 0.2)
    tmp.copy(WARM_AMBER).lerp(COLD_LED, coldness)
    windowMat.color.copy(tmp)
    spillMat.color.copy(tmp)
    spillMat.opacity = lerp(0.18, 0.1, coldness)
    if (interiorLightRef.current) {
      interiorLightRef.current.color.copy(tmp)
      interiorLightRef.current.intensity = lerp(80, 55, coldness)
    }
    if (spillLightRef.current) {
      spillLightRef.current.color.copy(tmp)
      spillLightRef.current.intensity = lerp(15, 8, coldness)
    }

    // Antenna appears ~industry 0.25, stays until dish takes over ~0.55
    const antennaIn = rampAt(lapse, 0.25, 0.1)
    const antennaOut = rampAt(lapse, 0.55, 0.1)
    if (antennaRef.current) {
      const s = antennaIn * (1 - antennaOut)
      antennaRef.current.scale.setScalar(Math.max(0.001, s))
      antennaRef.current.visible = s > 0.01
    }
    // Dish sprouts at ~0.55
    if (dishRef.current) {
      const s = rampAt(lapse, 0.55, 0.15)
      dishRef.current.scale.setScalar(Math.max(0.001, s))
      dishRef.current.visible = s > 0.01
    }
    // AC unit bolts on at ~0.6
    if (acRef.current) {
      const s = rampAt(lapse, 0.6, 0.15)
      acRef.current.scale.setScalar(Math.max(0.001, s))
      acRef.current.visible = s > 0.01
    }

    // Chimney smoke: present until industry ~0.7
    const smokeFade = 1 - rampAt(lapse, 0.7, 0.2)
    chimneySmokeMat.opacity = smokeFade * 0.45
    if (chimneyRef.current) {
      chimneyRef.current.position.y = 1.95 + (t * 0.15) % 1.0
      const m = chimneyRef.current.material as THREE.MeshBasicMaterial
      m.opacity = smokeFade * 0.45
    }
  })

  return (
    <group position={position}>
      {/* Main body */}
      <mesh position={[0, 0.6, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.4, 1.2, 1.8]} />
        <meshStandardMaterial color={HOUSE_WALL} roughness={0.85} />
      </mesh>
      <mesh position={[0, -0.1, 0]} receiveShadow>
        <boxGeometry args={[2.6, 0.2, 2.0]} />
        <meshStandardMaterial color="#3A4050" roughness={0.9} />
      </mesh>
      {/* Roof */}
      <mesh position={[0, 1.45, 0]} castShadow>
        <boxGeometry args={[3.0, 0.15, 2.4]} />
        <meshStandardMaterial color={HOUSE_ROOF} roughness={0.7} />
      </mesh>
      <mesh position={[0, 1.58, 0]} castShadow>
        <boxGeometry args={[2.6, 0.12, 0.3]} />
        <meshStandardMaterial color={HOUSE_ROOF} roughness={0.7} />
      </mesh>
      <mesh position={[0, 1.3, 1.1]} castShadow>
        <boxGeometry args={[3.2, 0.06, 0.5]} />
        <meshStandardMaterial color={HOUSE_ROOF} roughness={0.7} />
      </mesh>
      <mesh position={[0, 1.3, -1.1]} castShadow>
        <boxGeometry args={[3.2, 0.06, 0.5]} />
        <meshStandardMaterial color={HOUSE_ROOF} roughness={0.7} />
      </mesh>

      {/* Door + windows — shared animated material */}
      <mesh material={windowMat} position={[0, 0.5, 0.91]}>
        <boxGeometry args={[0.6, 0.8, 0.02]} />
      </mesh>
      <mesh material={windowMat} position={[-0.7, 0.7, 0.91]}>
        <boxGeometry args={[0.4, 0.4, 0.02]} />
      </mesh>
      <mesh material={windowMat} position={[0.7, 0.7, 0.91]}>
        <boxGeometry args={[0.4, 0.4, 0.02]} />
      </mesh>

      {/* Light spill on ground */}
      <mesh position={[0, 0.03, 2.5]} rotation={[-Math.PI / 2, 0, 0]} material={spillMat}>
        <planeGeometry args={[4, 5]} />
      </mesh>

      {/* Interior + spill lights */}
      <pointLight ref={interiorLightRef} position={[0, 0.8, 2.0]} color={WARM_AMBER} intensity={80} distance={20} decay={1.5} castShadow />
      <pointLight ref={spillLightRef} position={[0, 0.15, 3.5]} color={WARM_AMBER} intensity={15} distance={10} decay={1.8} />

      {/* Chimney (stub on roof ridge) */}
      <mesh position={[0.9, 1.75, -0.3]} castShadow>
        <boxGeometry args={[0.14, 0.3, 0.14]} />
        <meshStandardMaterial color="#2A3038" roughness={0.85} />
      </mesh>
      {/* Rising chimney smoke (a small drifting puff) */}
      <mesh ref={chimneyRef} position={[0.9, 1.95, -0.3]} material={chimneySmokeMat}>
        <sphereGeometry args={[0.12, 12, 10]} />
      </mesh>

      {/* Antenna — thin metal rod with cross bar, sprouts then gets replaced */}
      <group ref={antennaRef} position={[0.3, 1.58, 0]}>
        <mesh>
          <cylinderGeometry args={[0.015, 0.02, 0.9, 6]} />
          <meshStandardMaterial color="#7A8090" metalness={0.6} roughness={0.4} />
        </mesh>
        <mesh position={[0, 0.35, 0]}>
          <boxGeometry args={[0.35, 0.012, 0.012]} />
          <meshStandardMaterial color="#7A8090" metalness={0.6} roughness={0.4} />
        </mesh>
        <mesh position={[0, 0.2, 0]}>
          <boxGeometry args={[0.24, 0.012, 0.012]} />
          <meshStandardMaterial color="#7A8090" metalness={0.6} roughness={0.4} />
        </mesh>
      </group>

      {/* Satellite dish — replaces the antenna */}
      <group ref={dishRef} position={[-0.6, 1.62, 0.1]} rotation={[-0.4, 0.3, 0]}>
        <mesh>
          <cylinderGeometry args={[0.014, 0.014, 0.4, 6]} />
          <meshStandardMaterial color="#C0C4C8" metalness={0.5} roughness={0.4} />
        </mesh>
        <mesh position={[0, 0.22, 0.0]} rotation={[Math.PI / 2, 0, 0]}>
          <sphereGeometry args={[0.22, 16, 12, 0, Math.PI * 2, 0, Math.PI / 3]} />
          <meshStandardMaterial color="#DCE0E4" metalness={0.3} roughness={0.5} side={THREE.DoubleSide} />
        </mesh>
      </group>

      {/* AC unit — bolted on the side wall */}
      <group ref={acRef} position={[-1.21, 0.55, 0.3]}>
        <mesh>
          <boxGeometry args={[0.12, 0.3, 0.4]} />
          <meshStandardMaterial color="#D4D8DC" roughness={0.55} metalness={0.3} />
        </mesh>
        <mesh position={[-0.068, 0, 0]}>
          <boxGeometry args={[0.01, 0.26, 0.36]} />
          <meshStandardMaterial color="#888C90" roughness={0.7} />
        </mesh>
      </group>
    </group>
  )
}

// ─────────────────────────────────────────────────────────────────────
// Persimmon tree — fruits cycle on/off with seasons
// ─────────────────────────────────────────────────────────────────────
function SeasonalPersimmonTree({ position }: { position: [number, number, number] }) {
  const fruitsMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#8A3018', emissive: '#4A1808', emissiveIntensity: 0.4,
    transparent: true, opacity: 1,
  }), [])
  const canopyMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#1A2A12', roughness: 0.9, transparent: true, opacity: 0.9,
  }), [])

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

  useFrame(({ clock }) => {
    const { t, lapse } = computeTimeline(clock.getElapsedTime())
    // Seasons cycle ~3 times during the lapse, fruit-present sinusoidally
    let seasonT = 0
    if (t < HOLD_END) {
      seasonT = 1 // hold: fruit present
    } else if (t < LAPSE_END) {
      const lapseT = (t - HOLD_END) / (LAPSE_END - HOLD_END)
      seasonT = (Math.cos(lapseT * Math.PI * 2 * 3) + 1) / 2 // 1..0..1..0..1..0
    } else {
      seasonT = 0 // settled: bare (end of cycle)
    }
    fruitsMat.opacity = seasonT
    // Canopy also thins with season but less dramatically
    canopyMat.opacity = 0.4 + seasonT * 0.5
    // Late industry: tree gradually darkens/dies
    const death = rampAt(lapse, 0.85, 0.15)
    canopyMat.opacity *= (1 - death)
    fruitsMat.opacity *= (1 - death)
  })

  return (
    <group position={position}>
      <mesh position={[0, 1.0, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.12, 2.0, 8]} />
        <meshStandardMaterial color="#2A2420" roughness={0.9} />
      </mesh>
      <mesh position={[-0.3, 2.2, 0]} rotation={[0, 0, -0.5]} castShadow>
        <cylinderGeometry args={[0.03, 0.05, 1.0, 6]} />
        <meshStandardMaterial color="#2A2420" roughness={0.9} />
      </mesh>
      <mesh position={[0.3, 2.3, 0.1]} rotation={[0, 0, 0.4]} castShadow>
        <cylinderGeometry args={[0.03, 0.05, 0.9, 6]} />
        <meshStandardMaterial color="#2A2420" roughness={0.9} />
      </mesh>
      <mesh position={[0, 2.8, 0]} castShadow material={canopyMat}>
        <sphereGeometry args={[0.9, 16, 12]} />
      </mesh>
      {fruits.map((pos, i) => (
        <mesh key={i} position={pos} castShadow material={fruitsMat}>
          <sphereGeometry args={[0.06, 8, 8]} />
        </mesh>
      ))}
    </group>
  )
}

// ─────────────────────────────────────────────────────────────────────
// Power line — poles + wires stitched pole-to-pole across the sky
// ─────────────────────────────────────────────────────────────────────
function PowerPole({
  position,
  height,
  threshold,
}: {
  position: [number, number, number]
  height: number
  threshold: number
}) {
  const ref = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (!ref.current) return
    const { lapse } = computeTimeline(clock.getElapsedTime())
    const s = rampAt(lapse, threshold, 0.08)
    ref.current.scale.y = Math.max(0.001, s)
    ref.current.visible = s > 0.01
  })
  return (
    <group position={position}>
      <group ref={ref}>
        <mesh position={[0, height / 2, 0]}>
          <cylinderGeometry args={[0.04, 0.06, height, 6]} />
          <meshStandardMaterial color="#3A3A40" roughness={0.85} />
        </mesh>
        <mesh position={[0, height - 0.3, 0]}>
          <boxGeometry args={[1.0, 0.06, 0.06]} />
          <meshStandardMaterial color="#2A2A30" roughness={0.85} />
        </mesh>
      </group>
    </group>
  )
}

function PowerWires({
  x,
  y,
  zFrom,
  zTo,
  threshold,
}: {
  x: number
  y: number
  zFrom: number
  zTo: number
  threshold: number
}) {
  const ref = useRef<THREE.Group>(null)
  const length = Math.abs(zTo - zFrom)
  const midZ = (zFrom + zTo) / 2
  useFrame(({ clock }) => {
    if (!ref.current) return
    const { lapse } = computeTimeline(clock.getElapsedTime())
    const s = rampAt(lapse, threshold, 0.08)
    ref.current.scale.y = Math.max(0.001, s)
    ref.current.visible = s > 0.01
  })
  return (
    <group ref={ref} position={[x, y, midZ]}>
      {[-0.4, 0, 0.4].map((xOff, i) => (
        <mesh key={i} position={[xOff, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.008, 0.008, length, 4]} />
          <meshStandardMaterial color="#1A1A20" roughness={0.9} />
        </mesh>
      ))}
    </group>
  )
}

// ─────────────────────────────────────────────────────────────────────
// Smokestack — rises from the horizon as industry advances
// ─────────────────────────────────────────────────────────────────────
function Smokestack({ position, threshold }: { position: [number, number, number]; threshold: number }) {
  const ref = useRef<THREE.Group>(null)
  const smokeMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: '#4A5260', transparent: true, opacity: 0.5, depthWrite: false,
  }), [])
  useFrame(({ clock }) => {
    if (!ref.current) return
    const { t, lapse } = computeTimeline(clock.getElapsedTime())
    const s = rampAt(lapse, threshold, 0.15)
    ref.current.position.y = lerp(-8, 0, s)
    // Smoke puffs wobble
    const wobble = Math.sin(t * 1.2) * 0.2
    smokeMat.opacity = s * 0.5
    ref.current.children.forEach((c, i) => {
      if (i >= 2) { // smoke puffs only
        c.position.y = 4.5 + (i - 2) * 0.6 + wobble * 0.3
      }
    })
  })
  return (
    <group position={position}>
      <group ref={ref}>
        {/* Stack body */}
        <mesh position={[0, 2.2, 0]}>
          <cylinderGeometry args={[0.35, 0.45, 4.4, 12]} />
          <meshStandardMaterial color="#2A2E38" roughness={0.9} />
        </mesh>
        {/* Red stripe near top */}
        <mesh position={[0, 3.8, 0]}>
          <cylinderGeometry args={[0.36, 0.36, 0.3, 12]} />
          <meshStandardMaterial color="#5A1818" roughness={0.85} />
        </mesh>
        {/* Smoke puffs */}
        <mesh position={[0, 4.5, 0]} material={smokeMat}>
          <sphereGeometry args={[0.5, 12, 10]} />
        </mesh>
        <mesh position={[0.2, 5.1, 0]} material={smokeMat}>
          <sphereGeometry args={[0.6, 12, 10]} />
        </mesh>
        <mesh position={[-0.1, 5.7, 0]} material={smokeMat}>
          <sphereGeometry args={[0.7, 12, 10]} />
        </mesh>
      </group>
    </group>
  )
}

// ─────────────────────────────────────────────────────────────────────
// Neighbor hanok → concrete block crossfade
// ─────────────────────────────────────────────────────────────────────
function NeighborBuilding({ position, threshold }: { position: [number, number, number]; threshold: number }) {
  const hanokMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: HOUSE_WALL, roughness: 0.85, transparent: true, opacity: 1,
  }), [])
  const hanokRoofMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: HOUSE_ROOF, roughness: 0.7, transparent: true, opacity: 1,
  }), [])
  const concMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#3A3D42', roughness: 0.9, transparent: true, opacity: 0,
  }), [])
  const concWindowMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: '#C8E0FF', toneMapped: false, transparent: true, opacity: 0,
  }), [])

  useFrame(({ clock }) => {
    const { lapse } = computeTimeline(clock.getElapsedTime())
    const s = rampAt(lapse, threshold, 0.2)
    hanokMat.opacity = 1 - s
    hanokRoofMat.opacity = 1 - s
    concMat.opacity = s
    concWindowMat.opacity = s * 0.9
  })

  return (
    <group position={position}>
      {/* Original hanok (smaller) */}
      <mesh position={[0, 0.4, 0]} material={hanokMat}>
        <boxGeometry args={[1.6, 0.8, 1.2]} />
      </mesh>
      <mesh position={[0, 0.95, 0]} material={hanokRoofMat}>
        <boxGeometry args={[2.0, 0.1, 1.6]} />
      </mesh>
      {/* Concrete box */}
      <mesh position={[0, 1.2, 0]} material={concMat}>
        <boxGeometry args={[1.7, 2.4, 1.4]} />
      </mesh>
      {/* Concrete building windows — grid of cold LED rectangles */}
      {Array.from({ length: 12 }, (_, i) => {
        const r = Math.floor(i / 3)
        const c = i % 3
        const x = (c - 1) * 0.4
        const y = 0.3 + r * 0.55
        return (
          <mesh key={i} material={concWindowMat} position={[x, y, 0.72]}>
            <planeGeometry args={[0.22, 0.3]} />
          </mesh>
        )
      })}
    </group>
  )
}

// ─────────────────────────────────────────────────────────────────────
// City building horizon — dark buildings with lit windows rise from below
// ─────────────────────────────────────────────────────────────────────
function CityBuildingHorizon() {
  // City pushed behind the mountains; buildings tall enough to crest over the ridge.
  // Mountain peaks reach ~7.5 — skyscrapers need to be well above that to read.
  const rowA = useMemo<BuildingData[]>(() => generateBuildingRow(5001, 20, 70, 8.0, 14.0).map(b => ({ ...b, baseY: 0 })), [])
  const rowB = useMemo<BuildingData[]>(() => generateBuildingRow(5002, 16, 64, 10.0, 18.0, true).map(b => ({ ...b, baseY: 0 })), [])
  const rowC = useMemo<BuildingData[]>(() => generateBuildingRow(5003, 12, 58, 12.0, 22.0, true).map(b => ({ ...b, baseY: 0 })), [])

  const aRef = useRef<THREE.Group>(null)
  const bRef = useRef<THREE.Group>(null)
  const cRef = useRef<THREE.Group>(null)

  useFrame(({ clock }) => {
    const { lapse } = computeTimeline(clock.getElapsedTime())
    const sA = rampAt(lapse, 0.45, 0.18)
    const sB = rampAt(lapse, 0.6, 0.18)
    const sC = rampAt(lapse, 0.72, 0.18)
    if (aRef.current) aRef.current.position.y = lerp(-22, 0, sA)
    if (bRef.current) bRef.current.position.y = lerp(-22, 0, sB)
    if (cRef.current) cRef.current.position.y = lerp(-22, 0, sC)
  })

  return (
    <group>
      <group ref={cRef} position={[0, -22, -72]}>
        {rowC.map((b, i) => <CityBuilding key={i} data={b} color={CITY_DARK_C} />)}
      </group>
      <group ref={bRef} position={[0, -22, -64]}>
        {rowB.map((b, i) => <CityBuilding key={i} data={b} color={CITY_DARK_B} />)}
      </group>
      <group ref={aRef} position={[0, -22, -56]}>
        {rowA.map((b, i) => <CityBuilding key={i} data={b} color={CITY_DARK_A} />)}
      </group>
    </group>
  )
}

function CityBuilding({ data, color }: { data: BuildingData; color: string }) {
  return (
    <group position={[data.x, data.baseY + data.height / 2, 0]}>
      <mesh>
        <boxGeometry args={[data.width, data.height, data.bDepth]} />
        <meshStandardMaterial color={color} roughness={0.85} />
      </mesh>
      {data.windows.map((w, i) => (
        <mesh key={i} position={[w.x, w.y, data.bDepth / 2 + 0.02]}>
          <planeGeometry args={[0.09, 0.14]} />
          <meshBasicMaterial color={w.color} toneMapped={false} side={2} />
        </mesh>
      ))}
      {data.rooftopLight && (
        <mesh position={[0, data.height / 2 + 0.05, 0]}>
          <sphereGeometry args={[0.035, 6, 6]} />
          <meshBasicMaterial color={data.rooftopColor} toneMapped={false} />
        </mesh>
      )}
    </group>
  )
}

// ─────────────────────────────────────────────────────────────────────
// Mountains — Scene 1 ridge silhouettes, flattened into the scene between
// the house and the rising city. They remain at full opacity.
// ─────────────────────────────────────────────────────────────────────
function FadingMountains() {
  const farMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: MOUNTAIN_FAR, side: THREE.DoubleSide, roughness: 0.95,
  }), [])
  const baekduMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#2A3E30', side: THREE.DoubleSide, roughness: 0.95,
  }), [])
  const midMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#283858', side: THREE.DoubleSide, roughness: 0.95,
  }), [])

  const farShape = useMemo(() => createFarMountainShape(90, 9), [])
  const midShape = useMemo(() => createMidMountainShape(78, 5.5), [])
  const baekdu = useMemo(() => createBaekduMountainShapes(82, 9.5), [])

  return (
    <group>
      {/* Far range (range1) — furthest back */}
      <mesh position={[0, 0, -48]} material={farMat}>
        <shapeGeometry args={[farShape]} />
      </mesh>
      {/* Baekdu Mountain (range2) — silhouette only, no lake */}
      <mesh position={[0, 0, -42]} material={baekduMat}>
        <shapeGeometry args={[baekdu.silhouette]} />
      </mesh>
      {/* Mid range (range3) — closest ridge */}
      <mesh position={[0, 0, -35]} material={midMat}>
        <shapeGeometry args={[midShape]} />
      </mesh>
    </group>
  )
}

// ─────────────────────────────────────────────────────────────────────
// Rice paddies — retreat from the road as industry advances
// ─────────────────────────────────────────────────────────────────────
function ShrinkingPaddy({
  side,
  baseX,
  baseZ,
  width,
  depth,
  seed = 1,
}: {
  side: -1 | 1
  baseX: number
  baseZ: number
  width: number
  depth: number
  seed?: number
}) {
  const ref = useRef<THREE.Group>(null)
  const waterMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: PADDY_WATER.clone(), roughness: 0.75, metalness: 0.0,
    transparent: true, opacity: 0.8, envMapIntensity: 0.3,
  }), [])
  const bermMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: PADDY_BERM, roughness: 0.95, transparent: true, opacity: 1,
  }), [])
  const cropMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#4A6A28', roughness: 0.9, transparent: true, opacity: 1,
  }), [])
  const cropTipMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#8AA048', roughness: 0.85, transparent: true, opacity: 1,
  }), [])

  // Scatter rice plants across the paddy in a rough grid with jitter
  const plants = useMemo(() => {
    const result: { x: number; z: number; h: number; tilt: number }[] = []
    const spacingX = 0.28
    const spacingZ = 0.32
    const innerW = width - 0.4
    const innerD = depth - 0.4
    const cols = Math.floor(innerW / spacingX)
    const rows = Math.floor(innerD / spacingZ)
    let i = seed * 97
    const rand = () => {
      i = (i * 9301 + 49297) % 233280
      return i / 233280
    }
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (rand() < 0.15) continue // sparse gaps
        const x = -innerW / 2 + c * spacingX + (rand() - 0.5) * spacingX * 0.6
        const z = -innerD / 2 + r * spacingZ + (rand() - 0.5) * spacingZ * 0.6
        result.push({
          x,
          z,
          h: 0.22 + rand() * 0.18,
          tilt: (rand() - 0.5) * 0.4,
        })
      }
    }
    return result
  }, [width, depth, seed])

  useFrame(({ clock }) => {
    if (!ref.current) return
    const { lapse } = computeTimeline(clock.getElapsedTime())
    // Retreat: push far off screen along x (away from road), shrink to nothing
    const retreat = rampAt(lapse, 0.4, 0.35)
    ref.current.position.x = baseX + side * retreat * 25
    ref.current.scale.x = 1 - retreat * 0.98
    // Water darkens toward dirt/grey as it dries out late
    const dry = rampAt(lapse, 0.75, 0.2)
    waterMat.opacity = lerp(0.8, 0.0, dry)
    bermMat.opacity = 1 - rampAt(lapse, 0.7, 0.15)
    // Crops wither as paddies dry out
    cropMat.opacity = 1 - dry
    cropTipMat.opacity = 1 - dry
    // Hide entirely once retreated to save work
    ref.current.visible = retreat < 0.98
  })

  return (
    <group ref={ref} position={[baseX, 0, baseZ]}>
      <mesh position={[0, 0.02, 0]} receiveShadow material={bermMat}>
        <boxGeometry args={[width, 0.04, depth]} />
      </mesh>
      <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow material={waterMat}>
        <planeGeometry args={[width - 0.2, depth - 0.2]} />
      </mesh>
      {plants.map((p, idx) => (
        <group key={idx} position={[p.x, 0.05, p.z]} rotation={[0, 0, p.tilt]}>
          <mesh material={cropMat} position={[0, p.h / 2, 0]}>
            <cylinderGeometry args={[0.012, 0.02, p.h, 4]} />
          </mesh>
          <mesh material={cropTipMat} position={[0, p.h + 0.04, 0]}>
            <coneGeometry args={[0.035, 0.1, 5]} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

// ─────────────────────────────────────────────────────────────────────
// Road — dirt → asphalt color shift late in the lapse
// ─────────────────────────────────────────────────────────────────────
function AnimatedRoad() {
  const mat = useMemo(() => new THREE.MeshStandardMaterial({
    color: DIRT_ROAD.clone(), roughness: 0.95,
  }), [])
  const laneMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: '#F0E060', transparent: true, opacity: 0, toneMapped: false,
  }), [])
  const tmp = useMemo(() => new THREE.Color(), [])

  useFrame(({ clock }) => {
    const { lapse } = computeTimeline(clock.getElapsedTime())
    const pave = rampAt(lapse, 0.8, 0.15)
    tmp.copy(DIRT_ROAD).lerp(ASPHALT, pave)
    mat.color.copy(tmp)
    mat.roughness = lerp(0.95, 0.55, pave)
    laneMat.opacity = pave * 0.9
  })

  return (
    <group>
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow material={mat}>
        <planeGeometry args={[2.2, 40]} />
      </mesh>
      {/* Dashed lane markers — appear once paved */}
      {Array.from({ length: 8 }, (_, i) => {
        const z = -10 + i * 3
        return (
          <mesh key={i} position={[0, 0.015, z]} rotation={[-Math.PI / 2, 0, 0]} material={laneMat}>
            <planeGeometry args={[0.1, 0.9]} />
          </mesh>
        )
      })}
    </group>
  )
}

// ─────────────────────────────────────────────────────────────────────
// Ground plane — color shift subtle
// ─────────────────────────────────────────────────────────────────────
function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
      <planeGeometry args={[200, 200]} />
      <meshStandardMaterial color="#2A3228" roughness={1.0} />
    </mesh>
  )
}

// ─────────────────────────────────────────────────────────────────────
// HalftoneRenderer — three-stdlib pipeline: RenderPass → HalftoneShader.
// Shape 1 = dot, 2 = ellipse, 3 = line, 4 = square. Tweak `radius` for
// coarser/finer dots.
// ─────────────────────────────────────────────────────────────────────
function HalftoneRenderer() {
  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)

  const composer = useMemo(() => {
    const c = new StdlibEffectComposer(gl)
    c.addPass(new RenderPass(scene, camera))
    const halftone = new ShaderPass(HalftoneShader)
    halftone.uniforms.shape.value = 1 // dot
    halftone.uniforms.radius.value = 4
    halftone.uniforms.scatter.value = 0
    halftone.uniforms.blending.value = 1
    halftone.uniforms.blendingMode.value = 1
    halftone.uniforms.greyscale.value = false
    c.addPass(halftone)
    return c
  }, [gl, scene, camera])

  useEffect(() => {
    composer.setSize(size.width, size.height)
    const halftone = composer.passes[1] as ShaderPass
    halftone.uniforms.width.value = size.width
    halftone.uniforms.height.value = size.height
  }, [size, composer])

  useFrame(() => composer.render(), 1)
  return null
}

// ─────────────────────────────────────────────────────────────────────
// Scene content
// ─────────────────────────────────────────────────────────────────────
function SceneContent() {
  return (
    <>
      <HalftoneRenderer />
      <AnimatedLighting />
      <AnimatedStars />

      <AnimatedSky />
      <SkyBodies />

      {/* Mountain backdrop — fades as city rises */}
      <FadingMountains />

      {/* City horizon buildings — rise from below */}
      <CityBuildingHorizon />

      {/* Smokestack rising in the distance */}
      <Smokestack position={[-7, 0, -30]} threshold={0.35} />

      {/* Ground + road */}
      <Ground />
      <AnimatedRoad />

      {/* Rice paddies that retreat */}
      <ShrinkingPaddy side={-1} baseX={-4.0} baseZ={-6} width={5.5} depth={14} />
      <ShrinkingPaddy side={1} baseX={4.0} baseZ={-6} width={5.5} depth={14} />
      <ShrinkingPaddy side={-1} baseX={-3.5} baseZ={5} width={4.5} depth={6} />
      <ShrinkingPaddy side={1} baseX={3.5} baseZ={5} width={4.5} depth={6} />

      {/* The home — warm pocket that modernizes */}
      <AnimatedHanok position={[0, 0, -14]} />

      {/* Persimmon tree beside the house */}
      <SeasonalPersimmonTree position={[2.8, 0, -13]} />

      {/* Neighbor hanok becomes concrete */}
      <NeighborBuilding position={[-5.2, 0, -17]} threshold={0.5} />

      {/* Power lines crossing the sky — poles at uniform height, wires stitch pole-to-pole */}
      {(() => {
        const x = -6
        const height = 4.8
        const crossY = height - 0.3
        const poles = [
          { z: -4, threshold: 0.12 },
          { z: -12, threshold: 0.16 },
          { z: -20, threshold: 0.22 },
          { z: -28, threshold: 0.28 },
        ]
        return (
          <>
            {poles.map((p, i) => (
              <PowerPole key={`pole-${i}`} position={[x, 0, p.z]} height={height} threshold={p.threshold} />
            ))}
            {poles.slice(0, -1).map((p, i) => (
              <PowerWires
                key={`wire-${i}`}
                x={x}
                y={crossY}
                zFrom={p.z}
                zTo={poles[i + 1].z}
                threshold={poles[i + 1].threshold}
              />
            ))}
          </>
        )
      })()}
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────────────────────────────
export default function Act4_1_Halftone() {
  return (
    <div style={{ width: '100vw', height: '100vh', background: '#000' }}>
      <Canvas
        shadows
        camera={{
          position: [0.3, 1.8, 8],
          fov: 45,
          near: 0.1,
          far: 200,
        }}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.3,
        }}
        onCreated={({ camera }) => {
          camera.lookAt(0, 0.9, -7)
        }}
      >
        <DebugCamera />
        <SceneContent />
      </Canvas>
    </div>
  )
}
