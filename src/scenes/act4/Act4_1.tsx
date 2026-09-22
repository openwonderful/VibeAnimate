/**
 * Act 4.1 — INDUSTRIALIZATION TIMELAPSE (1:14 – 1:16.8)
 *
 * The establishing statement of Act 4: decades pass, and the world remakes
 * itself around a house that refuses to change. We hold on the hanok from Act
 * 3 — same ridge behind it, same paddies, same dirt road — and then the
 * century arrives: power lines, a smokestack, the neighbour's roof replaced by
 * concrete, a city climbing up behind the mountains until it crests the peaks,
 * the paddies drying and retreating, the road paving itself, headlights
 * running on it. The one thing that never changes shape is the home. Only its
 * windows go cold.
 *
 * ── PACING ───────────────────────────────────────────────────────────
 * This beat used to be crushed into 0.84s and it read as a strobe: two full
 * day/night flips, three seasons on the persimmon tree, and eleven separate
 * transformations all ramping across the same 0.4–0.8 window. Nothing was
 * legible; it was a flicker where an establishing shot should be.
 *
 * Two changes fix it. First, the beat now gets 2.8s in the master timeline
 * instead of 0.8 (funded by one second each from 6.1 and 6.3 — see
 * timeline.ts). Second, and more importantly, it does *fewer things, in
 * order*: ONE sunrise-to-sunrise, ONE season, and a staged schedule where each
 * change owns its own moment instead of piling on top of the others. A
 * timelapse reads as time passing only if you can see each thing change.
 *
 * The 18-second draft this grew out of is kept as 4.1-B in Legacy. Its pacing
 * was the readable one — which is what this rebuild is borrowing back — but
 * its ridges were laid flat on the ground plane by a stray rotation, so the
 * mountains never appeared at all, and its city was too short to crest them.
 */

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import * as THREE from 'three'

import { createScene } from '../createScene'
import { getAnimTime } from '../../hooks/useAnimTime'
import { rand } from '../sets/hanok'
import { generateBuildingRow, type BuildingData } from '../zoom/CityBuildings3D'
import {
  createFarMountainShape,
  createMidMountainShape,
  createBaekduMountainShapes,
} from '../act1/mountainShapes'

// ─────────────────────────────────────────────────────────────────────
// Timeline
// ─────────────────────────────────────────────────────────────────────
// The arc completes at LAPSE_END and settles by SETTLE_END, which is a little
// short of the 2.8s the timeline gives it — so the cut into 4.2 lands on a
// held, settled frame rather than mid-transition.
const HOLD_END = 0.60     // a real beat on the Act 3 tableau before anything moves
const LAPSE_END = 4.90    // industrialization finishes
const SETTLE_END = 5.40   // settles into the cold pre-dawn Act 4 lives in

// ONE sunrise-to-sunrise. Two flips over this window read as a strobe rather
// than as days going by, and the point is not "many days" — it is "an era".
const DAY_NIGHT_CYCLES = 1

// ─────────────────────────────────────────────────────────────────────
// The change schedule.
//
// Everything used to ramp inside lapse 0.4–0.8, so eleven transformations
// happened at once and none of them registered. Here each one owns a slot,
// roughly in the order these things actually arrived in a Korean village:
// electricity, then industry, then concrete, then the city, then the loss of
// the fields, then the road, then the cars, then the light inside the house.
// ─────────────────────────────────────────────────────────────────────
const AT = {
  poles: 0.04, polesRamp: 0.14,
  stack: 0.18, stackRamp: 0.18,
  concrete: 0.32, concreteRamp: 0.18,
  cityA: 0.42, cityB: 0.54, cityC: 0.64, cityRamp: 0.20,
  paddyGo: 0.50, paddyGoRamp: 0.26,
  paddyDry: 0.60, paddyDryRamp: 0.18,
  pave: 0.70, paveRamp: 0.16,
  cars: 0.80, carsRamp: 0.14,
  antenna: 0.50, antennaRamp: 0.12,
  dish: 0.74, dishRamp: 0.12,
  ac: 0.80, acRamp: 0.12,
  cold: 0.80, coldRamp: 0.18,
} as const

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

const FIELD_GREEN = new THREE.Color('#2A3228')
const FIELD_SPENT = new THREE.Color('#25262A')

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
/** Ease a value on at a lapse threshold: 0 before `at`, 1 by `at + ramp`. */
function rampAt(lapse: number, at: number, ramp = 0.08) {
  return smoothstep(at, at + ramp, lapse)
}

// ─────────────────────────────────────────────────────────────────────
// Single shared timeline state, recomputed per frame
// ─────────────────────────────────────────────────────────────────────
interface Timeline {
  t: number
  lapse: number      // 0..1 over the lapse window
  settle: number     // 0..1 over the settle window
  dayness: number    // 0=full night, 1=full day
  sunsetness: number // peaks when the sun is near the horizon
  phase: number      // sky angle; 0=east horizon, π/2=zenith, π=west horizon
}
// Start a quarter-turn before sunrise, so the hold sits in the blue hour with
// the sun still below the horizon — the same time of day Act 3.2 ended in.
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
    dayness = clamp01((Math.sin(phase) + 1) / 2)
  } else {
    phase = PHASE_START + DAY_NIGHT_CYCLES * Math.PI * 2
    const endDayness = clamp01((Math.sin(phase) + 1) / 2)
    dayness = lerp(endDayness, 0.12, settle)
  }
  const sunHeight = Math.sin(phase)
  const sunUp = sunHeight >= -0.15
  const sunsetness = sunUp ? Math.max(0, 1 - Math.abs(sunHeight) * 3) : 0
  return { t, lapse, settle, dayness, sunsetness, phase }
}

// Shared sky-arc geometry for the celestial body + directional key light
const SKY_RADIUS = 10
const SKY_CENTER_Y = 1

// ─────────────────────────────────────────────────────────────────────
// Animated sky
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

  useFrame(() => {
    const { dayness, sunsetness, settle } = computeTimeline(getAnimTime())
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
// Stars — seeded, so every Remotion tab renders the same sky.
//
// drei's <Stars> seeds itself from Math.random at mount. Remotion renders a
// segment across several browser tabs, each of which mounts the scene fresh,
// so the constellation changed from frame to frame — a shimmer across the top
// of the frame that looked like encoder noise.
// ─────────────────────────────────────────────────────────────────────
function SeededStars({ count = 900 }: { count?: number }) {
  const matRef = useRef<THREE.PointsMaterial>(null)

  const positions = useMemo(() => {
    const r = rand(4127)
    const out = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      // Dome over the far half of the world, above the ridge line.
      const a = r() * Math.PI * 2
      const y = 0.12 + r() * 0.88
      const radius = 92
      const ring = Math.sqrt(1 - y * y)
      out[i * 3] = Math.cos(a) * ring * radius
      out[i * 3 + 1] = y * radius * 0.55 + 3
      out[i * 3 + 2] = -Math.abs(Math.sin(a)) * ring * radius - 12
    }
    return out
  }, [count])

  useFrame(() => {
    const { dayness } = computeTimeline(getAnimTime())
    if (matRef.current) matRef.current.opacity = (1 - dayness) * 0.9
  })

  return (
    <points frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        ref={matRef}
        size={0.34} sizeAttenuation color="#DCE4FF"
        transparent opacity={0.9} depthWrite={false} fog={false} toneMapped={false}
      />
    </points>
  )
}

// ─────────────────────────────────────────────────────────────────────
// Sun and moon, 180° apart on one shared arc
// ─────────────────────────────────────────────────────────────────────
function SkyBodies() {
  const sunRef = useRef<THREE.Group>(null)
  const moonRef = useRef<THREE.Group>(null)

  useFrame(() => {
    const { phase } = computeTimeline(getAnimTime())
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
// Lighting
// ─────────────────────────────────────────────────────────────────────
function AnimatedLighting() {
  const ambRef = useRef<THREE.AmbientLight>(null)
  const dirRef = useRef<THREE.DirectionalLight>(null)
  const tmp = useMemo(() => new THREE.Color(), [])
  useFrame(() => {
    const { dayness, phase } = computeTimeline(getAnimTime())
    if (ambRef.current) {
      tmp.copy(AMBIENT_NIGHT).lerp(AMBIENT_DAY, dayness)
      ambRef.current.color.copy(tmp)
      ambRef.current.intensity = lerp(0.45, 0.85, dayness)
    }
    if (dirRef.current) {
      // Key light follows whichever body is above the horizon.
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
// The home.
//
// Note what does NOT happen here: the walls, the roof and the footprint never
// move. The house accretes an antenna, a dish and an air conditioner, and its
// windows go from oil-lamp amber to LED white — and that is the whole point of
// the shot. Everything else in the frame is replaced; the home is only ever
// added to, and the only thing it loses is the colour of its light.
// ─────────────────────────────────────────────────────────────────────
function AnimatedHanok({ position }: { position: [number, number, number] }) {
  const windowMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: WARM_AMBER.clone(), transparent: true, opacity: 0.95, toneMapped: false,
  }), [])
  const spillMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: '#F5A030', transparent: true, opacity: 0.10, depthWrite: false, side: THREE.DoubleSide,
  }), [])
  const chimneySmokeMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: '#AAB4C4', transparent: true, opacity: 0.4, depthWrite: false,
  }), [])
  const chimneyRef = useRef<THREE.Mesh>(null)
  const antennaRef = useRef<THREE.Group>(null)
  const dishRef = useRef<THREE.Group>(null)
  const acRef = useRef<THREE.Group>(null)
  const interiorLightRef = useRef<THREE.PointLight>(null)
  const spillLightRef = useRef<THREE.PointLight>(null)
  const tmp = useMemo(() => new THREE.Color(), [])

  useFrame(() => {
    const { t, lapse } = computeTimeline(getAnimTime())

    // The thesis of the shot: the light inside the house goes cold.
    const coldness = rampAt(lapse, AT.cold, AT.coldRamp)
    tmp.copy(WARM_AMBER).lerp(COLD_LED, coldness)
    windowMat.color.copy(tmp)
    spillMat.color.copy(tmp)
    spillMat.opacity = lerp(0.10, 0.06, coldness)
    // Kept deliberately low. At the old levels (80 interior / 15 spill, under a
    // 0.35 bloom threshold) the house was a white blaze with a wedge of glare
    // thrown down the road — the one object in the frame that has to stay
    // legible for the whole shot was the one object you could not look at.
    if (interiorLightRef.current) {
      interiorLightRef.current.color.copy(tmp)
      interiorLightRef.current.intensity = lerp(26, 18, coldness)
    }
    if (spillLightRef.current) {
      spillLightRef.current.color.copy(tmp)
      spillLightRef.current.intensity = lerp(5, 3, coldness)
    }

    // The antenna arrives and then STAYS — the dish is bolted on beside it
    // rather than replacing it, which is both what actually happened on these
    // roofs and one fewer change to read in a shot this short.
    if (antennaRef.current) {
      const s = rampAt(lapse, AT.antenna, AT.antennaRamp)
      antennaRef.current.scale.setScalar(Math.max(0.001, s))
      antennaRef.current.visible = s > 0.01
    }
    if (dishRef.current) {
      const s = rampAt(lapse, AT.dish, AT.dishRamp)
      dishRef.current.scale.setScalar(Math.max(0.001, s))
      dishRef.current.visible = s > 0.01
    }
    if (acRef.current) {
      const s = rampAt(lapse, AT.ac, AT.acRamp)
      acRef.current.scale.setScalar(Math.max(0.001, s))
      acRef.current.visible = s > 0.01
    }

    // Wood smoke stops once the house is on gas and electricity.
    const smokeFade = 1 - rampAt(lapse, 0.66, 0.2)
    if (chimneyRef.current) {
      chimneyRef.current.position.y = 1.95 + (t * 0.5) % 1.0
      chimneySmokeMat.opacity = smokeFade * 0.45 * (1 - ((t * 0.5) % 1.0))
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

      {/* Door + windows — one shared animated material */}
      <mesh material={windowMat} position={[0, 0.5, 0.91]}>
        <boxGeometry args={[0.6, 0.8, 0.02]} />
      </mesh>
      <mesh material={windowMat} position={[-0.7, 0.7, 0.91]}>
        <boxGeometry args={[0.4, 0.4, 0.02]} />
      </mesh>
      <mesh material={windowMat} position={[0.7, 0.7, 0.91]}>
        <boxGeometry args={[0.4, 0.4, 0.02]} />
      </mesh>

      {/* Light spill on the ground in front of the door */}
      <mesh position={[0, 0.03, 2.5]} rotation={[-Math.PI / 2, 0, 0]} material={spillMat}>
        <planeGeometry args={[4, 5]} />
      </mesh>

      <pointLight ref={interiorLightRef} position={[0, 0.8, 2.0]} color={WARM_AMBER} intensity={80} distance={20} decay={1.5} castShadow />
      <pointLight ref={spillLightRef} position={[0, 0.15, 3.5]} color={WARM_AMBER} intensity={15} distance={10} decay={1.8} />

      {/* Chimney + a puff of wood smoke that stops partway through */}
      <mesh position={[0.9, 1.75, -0.3]} castShadow>
        <boxGeometry args={[0.14, 0.3, 0.14]} />
        <meshStandardMaterial color="#2A3038" roughness={0.85} />
      </mesh>
      <mesh ref={chimneyRef} position={[0.9, 1.95, -0.3]} material={chimneySmokeMat}>
        <sphereGeometry args={[0.12, 12, 10]} />
      </mesh>

      {/* TV antenna */}
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

      {/* Satellite dish, bolted on beside it a generation later */}
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

      {/* AC unit on the side wall */}
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
// Persimmon tree — ONE season, not three.
//
// Three fruit-on/fruit-off cycles inside this window was a flicker on a small
// object; one full turn from heavy fruit to bare branches is a year passing,
// and it is legible.
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

  useFrame(() => {
    const { lapse } = computeTimeline(getAnimTime())
    // Heavy with fruit at the start, bare by the end. The canopy thins with it
    // but never all the way — the tree survives, it just stops bearing.
    const bare = smoothstep(0.15, 0.72, lapse)
    fruitsMat.opacity = 1 - bare
    canopyMat.opacity = 0.9 - bare * 0.55
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
// Power lines — the first thing to arrive
// ─────────────────────────────────────────────────────────────────────
function PowerPole({
  position, height, threshold,
}: { position: [number, number, number]; height: number; threshold: number }) {
  const ref = useRef<THREE.Group>(null)
  useFrame(() => {
    if (!ref.current) return
    const { lapse } = computeTimeline(getAnimTime())
    const s = rampAt(lapse, threshold, AT.polesRamp)
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
  x, y, zFrom, zTo, threshold,
}: { x: number; y: number; zFrom: number; zTo: number; threshold: number }) {
  const ref = useRef<THREE.Group>(null)
  const length = Math.abs(zTo - zFrom)
  const midZ = (zFrom + zTo) / 2
  useFrame(() => {
    if (!ref.current) return
    const { lapse } = computeTimeline(getAnimTime())
    const s = rampAt(lapse, threshold, AT.polesRamp)
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

function PowerLine() {
  const x = -6
  const height = 4.8
  const crossY = height - 0.3
  // Poles march away from the camera, so the line reads as being *strung*
  // down the road rather than appearing all at once.
  const poles = [
    { z: -4, threshold: AT.poles },
    { z: -12, threshold: AT.poles + 0.05 },
    { z: -20, threshold: AT.poles + 0.10 },
    { z: -28, threshold: AT.poles + 0.15 },
  ]
  return (
    <>
      {poles.map((p, i) => (
        <PowerPole key={`pole-${i}`} position={[x, 0, p.z]} height={height} threshold={p.threshold} />
      ))}
      {poles.slice(0, -1).map((p, i) => (
        <PowerWires
          key={`wire-${i}`}
          x={x} y={crossY} zFrom={p.z} zTo={poles[i + 1].z}
          threshold={poles[i + 1].threshold}
        />
      ))}
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────
// Smokestack
// ─────────────────────────────────────────────────────────────────────
function Smokestack({ position }: { position: [number, number, number] }) {
  const ref = useRef<THREE.Group>(null)
  const puffRefs = useRef<(THREE.Mesh | null)[]>([])
  const smokeMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: '#4A5260', transparent: true, opacity: 0.5, depthWrite: false,
  }), [])
  useFrame(() => {
    const { t, lapse } = computeTimeline(getAnimTime())
    const s = rampAt(lapse, AT.stack, AT.stackRamp)
    if (ref.current) ref.current.position.y = lerp(-8, 0, s)
    smokeMat.opacity = s * 0.5
    // Named refs rather than indexing into children — the old version keyed
    // off child order, which silently breaks the moment a mesh is added.
    const wobble = Math.sin(t * 3.2) * 0.2
    puffRefs.current.forEach((m, i) => {
      if (m) m.position.y = 4.55 + i * 0.44 + wobble * 0.3
    })
  })
  return (
    <group position={position}>
      <group ref={ref}>
        <mesh position={[0, 2.2, 0]}>
          <cylinderGeometry args={[0.35, 0.45, 4.4, 12]} />
          <meshStandardMaterial color="#2A2E38" roughness={0.9} />
        </mesh>
        <mesh position={[0, 3.8, 0]}>
          <cylinderGeometry args={[0.36, 0.36, 0.3, 12]} />
          <meshStandardMaterial color="#5A1818" roughness={0.85} />
        </mesh>
        {([[0, 0.26], [0.26, 0.32], [-0.16, 0.4]] as const).map(([x, r], i) => (
          <mesh
            key={i}
            ref={m => { puffRefs.current[i] = m }}
            position={[x, 4.55 + i * 0.44, 0]}
            material={smokeMat}
          >
            <sphereGeometry args={[r, 12, 10]} />
          </mesh>
        ))}
      </group>
    </group>
  )
}

// ─────────────────────────────────────────────────────────────────────
// Neighbour hanok → concrete block
// ─────────────────────────────────────────────────────────────────────
function NeighborBuilding({ position }: { position: [number, number, number] }) {
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

  useFrame(() => {
    const { lapse } = computeTimeline(getAnimTime())
    const s = rampAt(lapse, AT.concrete, AT.concreteRamp)
    hanokMat.opacity = 1 - s
    hanokRoofMat.opacity = 1 - s
    concMat.opacity = s
    concWindowMat.opacity = s * 0.9
  })

  return (
    <group position={position}>
      <mesh position={[0, 0.4, 0]} material={hanokMat}>
        <boxGeometry args={[1.6, 0.8, 1.2]} />
      </mesh>
      <mesh position={[0, 0.95, 0]} material={hanokRoofMat}>
        <boxGeometry args={[2.0, 0.1, 1.6]} />
      </mesh>
      <mesh position={[0, 1.2, 0]} material={concMat}>
        <boxGeometry args={[1.7, 2.4, 1.4]} />
      </mesh>
      {Array.from({ length: 12 }, (_, i) => {
        const r = Math.floor(i / 3)
        const c = i % 3
        return (
          <mesh key={i} material={concWindowMat} position={[(c - 1) * 0.4, 0.3 + r * 0.55, 0.72]}>
            <planeGeometry args={[0.22, 0.3]} />
          </mesh>
        )
      })}
    </group>
  )
}

// ─────────────────────────────────────────────────────────────────────
// The city — rises BEHIND the mountains and outgrows them.
//
// This is 4.1's one good idea over the old draft, and the reason the camera
// climbs: the ridge never goes anywhere, the skyline simply gets taller than
// it. Modern Seoul from the valley floor.
// ─────────────────────────────────────────────────────────────────────
function CityBuildingHorizon() {
  const rowA = useMemo<BuildingData[]>(() => generateBuildingRow(5001, 20, 70, 8.0, 14.0).map(b => ({ ...b, baseY: 0 })), [])
  const rowB = useMemo<BuildingData[]>(() => generateBuildingRow(5002, 16, 64, 10.0, 18.0, true).map(b => ({ ...b, baseY: 0 })), [])
  const rowC = useMemo<BuildingData[]>(() => generateBuildingRow(5003, 12, 58, 12.0, 22.0, true).map(b => ({ ...b, baseY: 0 })), [])

  const aRef = useRef<THREE.Group>(null)
  const bRef = useRef<THREE.Group>(null)
  const cRef = useRef<THREE.Group>(null)

  useFrame(() => {
    const { lapse } = computeTimeline(getAnimTime())
    if (aRef.current) aRef.current.position.y = lerp(-22, 0, rampAt(lapse, AT.cityA, AT.cityRamp))
    if (bRef.current) bRef.current.position.y = lerp(-22, 0, rampAt(lapse, AT.cityB, AT.cityRamp))
    if (cRef.current) cRef.current.position.y = lerp(-22, 0, rampAt(lapse, AT.cityC, AT.cityRamp))
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
          <meshBasicMaterial color={w.color} toneMapped={false} side={THREE.DoubleSide} />
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
// Mountains — Act 1's real ridge silhouettes, at full opacity throughout.
// They are the continuity anchor: the same skyline the video opened on.
// ─────────────────────────────────────────────────────────────────────
function Mountains() {
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
      <mesh position={[0, 0, -48]} material={farMat}>
        <shapeGeometry args={[farShape]} />
      </mesh>
      <mesh position={[0, 0, -42]} material={baekduMat}>
        <shapeGeometry args={[baekdu.silhouette]} />
      </mesh>
      <mesh position={[0, 0, -35]} material={midMat}>
        <shapeGeometry args={[midShape]} />
      </mesh>
    </group>
  )
}

// ─────────────────────────────────────────────────────────────────────
// Rice paddies — retreat from the road, then dry out
// ─────────────────────────────────────────────────────────────────────
function ShrinkingPaddy({
  side, baseX, baseZ, width, depth, seed = 1,
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

  const plants = useMemo(() => {
    const result: { x: number; z: number; h: number; tilt: number }[] = []
    const spacingX = 0.28
    const spacingZ = 0.32
    const innerW = width - 0.4
    const innerD = depth - 0.4
    const cols = Math.floor(innerW / spacingX)
    const rows = Math.floor(innerD / spacingZ)
    const r = rand(seed * 97)
    for (let row = 0; row < rows; row++) {
      for (let c = 0; c < cols; c++) {
        if (r() < 0.15) continue // sparse gaps
        result.push({
          x: -innerW / 2 + c * spacingX + (r() - 0.5) * spacingX * 0.6,
          z: -innerD / 2 + row * spacingZ + (r() - 0.5) * spacingZ * 0.6,
          h: 0.22 + r() * 0.18,
          tilt: (r() - 0.5) * 0.4,
        })
      }
    }
    return result
  }, [width, depth, seed])

  useFrame(() => {
    if (!ref.current) return
    const { lapse } = computeTimeline(getAnimTime())
    // The crops go first, then the water, then the field itself pulls away —
    // that order matters, because a paddy that slides off screen while still
    // green reads as a camera error rather than as land being lost.
    const dry = rampAt(lapse, AT.paddyDry, AT.paddyDryRamp)
    const retreat = rampAt(lapse, AT.paddyGo, AT.paddyGoRamp)
    ref.current.position.x = baseX + side * retreat * 25
    ref.current.scale.x = 1 - retreat * 0.98
    waterMat.opacity = lerp(0.8, 0.0, dry)
    bermMat.opacity = 1 - dry
    cropMat.opacity = 1 - dry
    cropTipMat.opacity = 1 - dry
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
// The road: dirt → asphalt, then traffic on it
// ─────────────────────────────────────────────────────────────────────
function AnimatedRoad() {
  const mat = useMemo(() => new THREE.MeshStandardMaterial({
    color: DIRT_ROAD.clone(), roughness: 0.95,
  }), [])
  const laneMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: '#F0E060', transparent: true, opacity: 0, toneMapped: false,
  }), [])
  const tmp = useMemo(() => new THREE.Color(), [])

  useFrame(() => {
    const { lapse } = computeTimeline(getAnimTime())
    const pave = rampAt(lapse, AT.pave, AT.paveRamp)
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
      {Array.from({ length: 8 }, (_, i) => (
        <mesh key={i} position={[0, 0.015, -10 + i * 3]} rotation={[-Math.PI / 2, 0, 0]} material={laneMat}>
          <planeGeometry args={[0.1, 0.9]} />
        </mesh>
      ))}
    </group>
  )
}

/**
 * Headlights on the finished road.
 *
 * The single most legible "this is a different century" signal available, and
 * the shot did not have one: the old version paved the road and then left it
 * empty, which reads as an abandoned road rather than a busy one. Four cars on
 * a continuous loop, appearing only once there is asphalt to drive on.
 */
function Traffic() {
  const ref = useRef<THREE.Group>(null)
  const headMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: '#FFF4D0', toneMapped: false, transparent: true, opacity: 0,
  }), [])
  const tailMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: '#FF3020', toneMapped: false, transparent: true, opacity: 0,
  }), [])

  // Two lanes: near lane comes toward us (headlights), far lane goes away
  // (tail lights). Deterministic — position is a pure function of the clock.
  const cars = useMemo(() => ([
    { lane: -0.55, dir: 1, speed: 26, offset: 0.0, tail: false },
    { lane: -0.55, dir: 1, speed: 23, offset: 0.55, tail: false },
    { lane: 0.55, dir: -1, speed: 24, offset: 0.25, tail: true },
    { lane: 0.55, dir: -1, speed: 29, offset: 0.75, tail: true },
  ]), [])

  const carRefs = useRef<(THREE.Group | null)[]>([])

  useFrame(() => {
    const { t, lapse } = computeTimeline(getAnimTime())
    const on = rampAt(lapse, AT.cars, AT.carsRamp)
    headMat.opacity = on
    tailMat.opacity = on * 0.85
    if (ref.current) ref.current.visible = on > 0.01
    cars.forEach((c, i) => {
      const g = carRefs.current[i]
      if (!g) return
      // Loop down a 44-unit stretch, from z=-32 (at the ridge) to z=+12.
      const u = ((t * c.speed / 44) + c.offset) % 1
      g.position.z = c.dir > 0 ? -32 + u * 44 : 12 - u * 44
    })
  })

  return (
    <group ref={ref}>
      {cars.map((c, i) => (
        <group key={i} ref={g => { carRefs.current[i] = g }} position={[c.lane, 0.14, 0]}>
          {[-0.16, 0.16].map(x => (
            <mesh key={x} position={[x, 0, 0]} material={c.tail ? tailMat : headMat}>
              <sphereGeometry args={[0.042, 8, 6]} />
            </mesh>
          ))}
          {/* A soft pool of light on the asphalt underneath */}
          <mesh position={[0, -0.13, c.dir > 0 ? 0.9 : -0.9]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.7, 2.4]} />
            <meshBasicMaterial
              color={c.tail ? '#803018' : '#C8B078'}
              transparent opacity={0.10} depthWrite={false} toneMapped={false}
            />
          </mesh>
        </group>
      ))}
    </group>
  )
}

/**
 * Low-rise sprawl on the flanks — what replaces the paddies.
 *
 * Without this the shot ends on an enormous flat grey plane where the fields
 * used to be, which reads as a wasteland rather than as a valley that got
 * built on. Land does not go empty when farming stops; it gets covered in
 * sheds and two-storey concrete. The blocks rise just *after* their paddy
 * pulls away, so the eye reads it as replacement rather than as two unrelated
 * things happening in the same place.
 */
function Sprawl() {
  const blocks = useMemo(() => {
    const r = rand(8317)
    const out: {
      p: [number, number, number]
      s: [number, number, number]
      lit: boolean
      delay: number
    }[] = []
    for (let i = 0; i < 34; i++) {
      const side = r() < 0.5 ? -1 : 1
      // Off the road, out to the edge of frame, spread down the valley.
      const x = side * (3.4 + r() * 12)
      const z = 6 - r() * 34
      const h = 0.7 + r() * 1.9
      out.push({
        p: [x, 0, z],
        s: [1.1 + r() * 1.6, h, 1.0 + r() * 1.4],
        lit: r() < 0.55,
        // Nearer the road = built first.
        delay: (Math.abs(x) - 3.4) / 12 * 0.14 + r() * 0.06,
      })
    }
    return out
  }, [])

  const ref = useRef<THREE.Group>(null)
  const refs = useRef<(THREE.Group | null)[]>([])

  useFrame(() => {
    const { lapse } = computeTimeline(getAnimTime())
    let anyUp = false
    blocks.forEach((b, i) => {
      const g = refs.current[i]
      if (!g) return
      const s = rampAt(lapse, AT.paddyGo + 0.10 + b.delay, 0.16)
      // Pushed up from under the ground rather than scaled in Y — the same
      // trick the city rows use. Scaling made a half-grown block read as a
      // flat slab lying in the field instead of a building coming up.
      g.position.y = -(b.s[1] + 0.3) * (1 - s)
      g.visible = s > 0.01
      if (s > 0.01) anyUp = true
    })
    if (ref.current) ref.current.visible = anyUp
  })

  return (
    <group ref={ref}>
      {blocks.map((b, i) => (
        <group key={i} position={b.p} ref={g => { refs.current[i] = g }}>
          <mesh position={[0, b.s[1] / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={b.s} />
            <meshStandardMaterial color="#33363E" roughness={0.92} />
          </mesh>
          {/* Corrugated roof, catching what light there is */}
          <mesh position={[0, b.s[1] + 0.04, 0]}>
            <boxGeometry args={[b.s[0] * 1.12, 0.08, b.s[2] * 1.12]} />
            <meshStandardMaterial color="#454952" roughness={0.75} metalness={0.25} />
          </mesh>
          {b.lit && (
            <mesh position={[0, b.s[1] * 0.55, b.s[2] / 2 + 0.02]}>
              <planeGeometry args={[b.s[0] * 0.42, 0.22]} />
              <meshBasicMaterial color="#9FB4CC" toneMapped={false} />
            </mesh>
          )}
        </group>
      ))}
    </group>
  )
}

// ─────────────────────────────────────────────────────────────────────
// Ground — green valley floor that greys out as the fields are lost
// ─────────────────────────────────────────────────────────────────────
function Ground() {
  const mat = useMemo(() => new THREE.MeshStandardMaterial({
    color: FIELD_GREEN.clone(), roughness: 1.0,
  }), [])
  const tmp = useMemo(() => new THREE.Color(), [])
  useFrame(() => {
    const { lapse } = computeTimeline(getAnimTime())
    tmp.copy(FIELD_GREEN).lerp(FIELD_SPENT, rampAt(lapse, AT.paddyDry, 0.3))
    mat.color.copy(tmp)
  })
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow material={mat}>
      <planeGeometry args={[200, 200]} />
    </mesh>
  )
}

// ─────────────────────────────────────────────────────────────────────
function SceneContent() {
  return (
    <>
      <AnimatedLighting />
      <SeededStars />
      <AnimatedSky />
      <SkyBodies />

      <Mountains />
      <CityBuildingHorizon />
      <Smokestack position={[-7, 0, -30]} />

      <Ground />
      <AnimatedRoad />
      <Traffic />

      <ShrinkingPaddy side={-1} baseX={-4.0} baseZ={-6} width={5.5} depth={14} seed={1} />
      <ShrinkingPaddy side={1} baseX={4.0} baseZ={-6} width={5.5} depth={14} seed={2} />
      <ShrinkingPaddy side={-1} baseX={-3.5} baseZ={5} width={4.5} depth={6} seed={3} />
      <ShrinkingPaddy side={1} baseX={3.5} baseZ={5} width={4.5} depth={6} seed={4} />
      <Sprawl />

      <AnimatedHanok position={[0, 0, -14]} />
      <SeasonalPersimmonTree position={[2.8, 0, -13]} />
      <NeighborBuilding position={[-5.2, 0, -17]} />
      <PowerLine />
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────
export default createScene({
  background: '#02040E',
  three: {
    camera: { position: [0.3, 1.7, 8.6], fov: 45, near: 0.1, far: 200 },
    gl: {
      antialias: true,
      toneMapping: THREE.ACESFilmicToneMapping,
      toneMappingExposure: 1.3,
    },
    shadows: true,
    onCreated: ({ camera }) => camera.lookAt(0, 1.0, -8),
    debugTarget: [0, 1.0, -8],
  },
  // A slow climb, running the whole beat. It does real work rather than just
  // adding motion: rising and tilting up is what brings the growing skyline
  // above the ridgeline into frame, so the camera move and the story of the
  // shot are the same gesture. It also keeps the frame alive during the hold.
  cameraMoves: [{
    a: { pos: [0.3, 1.7, 8.6], target: [0, 1.0, -8], fov: 45 },
    b: { pos: [0.3, 3.0, 6.2], target: [0, 1.9, -13], fov: 46 },
    t0: 0,
    t1: SETTLE_END,
    ease: 'inout',
  }],
}, function Act4_1() {
  return (
    <>
      <SceneContent />
      <EffectComposer>
        {/* Threshold was 0.35, which is low enough that every lit surface in
            the frame bloomed — the house, the spill on the road and the
            headlights all fused into one white mass. At 0.58 only the genuine
            emitters bloom and the shot keeps its shapes. */}
        <Bloom intensity={0.55} luminanceThreshold={0.58} luminanceSmoothing={0.7} mipmapBlur />
        <Vignette eskil={false} offset={0.15} darkness={0.55} />
      </EffectComposer>
    </>
  )
})
