/**
 * Scene 1.1-C — Unified Mountains → Stars → Fog → City flythrough
 *
 * One continuous journey on a single master clock. Coordinates a 2D Korean
 * landscape recession (Scene 1 layers wrapped in DomDepthLayer) with a 3D
 * Three.js flight that carries the camera through a starfield, into a
 * cloud bank, and out into the city used by 1.2 (CityBuildings3D).
 *
 * The final frame of this scene matches the final frame of 1.2 — the
 * unified flight literally ends where 1.2 ends (camera z = 69.9 in
 * CityBuildings3D's native coordinates).
 *
 * Architecture:
 *   - Master `progress` state (0 → 1) driven by requestAnimationFrame at
 *     the root component. Same value feeds the DOM-parallax recession and
 *     the 3D camera.
 *   - DomDepthLayer + DepthCameraContext from the existing 1.2 infrastructure
 *     handle the Scene 1 recession — reusing the exact depth values tuned
 *     in DepthScene.tsx, and the same per-layer components, unmodified.
 *   - A mutable ref (`progressRef`) mirrors the state value so Three.js
 *     useFrame handlers can read per-frame progress without re-rendering.
 *
 * URL params:
 *   ?t=N     — freeze at time N seconds
 *   ?loop=0  — disable looping (camera rests at the end)
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import * as THREE from 'three'
import { seededRandom } from '../../utils/svgHelpers'
import { DebugCamera } from '../DebugCamera'
import { DepthCameraContext, DomDepthLayer } from '../zoom/DepthCamera'
import CityBuildings3D from '../zoom/CityBuildings3D'

// Scene 1 layer components — mounted unchanged, wrapped in DomDepthLayer
import StarField from './components/StarField'
import MoonOrb from './components/MoonOrb'
import CloudLayer from './components/CloudLayer'
import MountainLayer from './components/MountainLayer'
import CraneLayer from './components/CraneLayer'
import BlossomLayer from './components/BlossomLayer'
import WaveLayer from './components/WaveLayer'
import SkyLayer from './components/SkyLayer'
import IrworobongdoScreen from './components/IrworobongdoScreen'

/* ─── Flight timing ─────────────────────────────────────────────── */
const DURATION = 28         // seconds for a full pass

// Three.js camera z end point = 69.9 (matches DepthScene's MAX_CAMERA_Z)
const THREE_Z_START = -80
const THREE_Z_END = 69.9

// Mountain recession ends at progress 0.30
const MOUNTAIN_RECEDE_END = 0.30
// Max dom cameraZ — once past the deepest DOM layer (5.0) all are gone
const DOM_MAX_Z = 6

// Fog zone along the 3D camera path (world z)
const FOG_RAMP_IN_START = -40
const FOG_PEAK_START = -15
const FOG_PEAK_END = 5
const FOG_RAMP_OUT_END = 15

/* ─── Query param overrides ─────────────────────────────────────── */
const urlParams = new URLSearchParams(window.location.search)
const FORCED_T = urlParams.get('t') !== null ? parseFloat(urlParams.get('t')!) : null
const LOOP = urlParams.get('loop') !== '0'

function computeProgress(elapsed: number): number {
  if (FORCED_T !== null) {
    return Math.max(0, Math.min(1, FORCED_T / DURATION))
  }
  if (!LOOP) {
    return Math.min(1, elapsed / DURATION)
  }
  return (elapsed % DURATION) / DURATION
}

/* ─── Progress curves ───────────────────────────────────────────── */
function domCameraZFromProgress(p: number): number {
  if (p >= MOUNTAIN_RECEDE_END) return DOM_MAX_Z
  const q = p / MOUNTAIN_RECEDE_END   // 0..1
  // Ease-in: slow at rest, accelerates as the camera lifts off
  return DOM_MAX_Z * q * q
}

function threeCameraZFromProgress(p: number): number {
  if (p <= MOUNTAIN_RECEDE_END) return THREE_Z_START
  const q = (p - MOUNTAIN_RECEDE_END) / (1 - MOUNTAIN_RECEDE_END)   // 0..1
  // Smooth ease-in-out through the 3D flight
  const eased = q < 0.5 ? 2 * q * q : 1 - Math.pow(-2 * q + 2, 2) / 2
  return THREE_Z_START + (THREE_Z_END - THREE_Z_START) * eased
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}

/* ─── Shared progress ref (read by useFrame without re-render) ──── */
const progressRef = { current: 0 }

/* ─── Starfield ─────────────────────────────────────────────────── */
function Starfield() {
  const geometry = useMemo(() => {
    const rand = seededRandom(7771)
    const COUNT = 2600
    const positions = new Float32Array(COUNT * 3)
    const colors = new Float32Array(COUNT * 3)
    const sizes = new Float32Array(COUNT)

    for (let i = 0; i < COUNT; i++) {
      const radial = Math.pow(rand(), 0.65) * 70
      const theta = rand() * Math.PI * 2
      positions[i * 3 + 0] = Math.cos(theta) * radial
      positions[i * 3 + 1] = Math.sin(theta) * radial * 0.55
      // Stars span from just behind camera start to well into the fog zone.
      // Flight starts at z=-80; stars at z ∈ [-120, -20] are swept past during
      // the starfield phase.
      positions[i * 3 + 2] = -120 + rand() * 100

      const tint = rand()
      if (tint < 0.72) {
        colors[i * 3 + 0] = 1; colors[i * 3 + 1] = 1; colors[i * 3 + 2] = 1
      } else if (tint < 0.88) {
        colors[i * 3 + 0] = 1; colors[i * 3 + 1] = 0.9; colors[i * 3 + 2] = 0.6
      } else {
        colors[i * 3 + 0] = 0.72; colors[i * 3 + 1] = 0.82; colors[i * 3 + 2] = 1
      }

      sizes[i] = 0.12 + rand() * 0.28
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    g.setAttribute('size', new THREE.BufferAttribute(sizes, 1))
    return g
  }, [])

  const sprite = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 64; canvas.height = 64
    const ctx = canvas.getContext('2d')!
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
    g.addColorStop(0, 'rgba(255,255,255,1)')
    g.addColorStop(0.25, 'rgba(255,255,255,0.8)')
    g.addColorStop(0.6, 'rgba(255,255,255,0.15)')
    g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 64, 64)
    const tex = new THREE.CanvasTexture(canvas)
    tex.needsUpdate = true
    return tex
  }, [])

  return (
    <points geometry={geometry}>
      <pointsMaterial
        size={0.35}
        sizeAttenuation
        vertexColors
        map={sprite}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        fog={false}
      />
    </points>
  )
}

/* ─── Cloud bank ────────────────────────────────────────────────── */
interface CloudDatum {
  x: number; y: number; z: number
  r: number
  color: string
  opacity: number
}

function CloudBank() {
  const clouds = useMemo<CloudDatum[]>(() => {
    const rand = seededRandom(40404)
    const arr: CloudDatum[] = []
    const COUNT = 60
    for (let i = 0; i < COUNT; i++) {
      // Straddle the fog zone on the 3D camera path
      const z = -40 + rand() * 55   // z ∈ [-40, 15]
      arr.push({
        x: (rand() - 0.5) * 70,
        y: (rand() - 0.5) * 28 + (rand() - 0.5) * 4,
        z,
        r: 5 + rand() * 11,
        color: rand() < 0.55 ? '#0A0B22' : (rand() < 0.7 ? '#1A0E32' : '#241238'),
        opacity: 0.18 + rand() * 0.22,
      })
    }
    return arr
  }, [])

  return (
    <group>
      {clouds.map((c, i) => (
        <mesh key={i} position={[c.x, c.y, c.z]}>
          <sphereGeometry args={[c.r, 12, 10]} />
          <meshBasicMaterial
            color={c.color}
            transparent
            opacity={c.opacity}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  )
}

/* ─── Flight controller: camera + fog ───────────────────────────── */
function FlightController() {
  const { scene } = useThree()
  const fogRef = useRef<THREE.FogExp2 | null>(null)

  useEffect(() => {
    const fog = new THREE.FogExp2('#0B0620', 0)
    scene.fog = fog
    fogRef.current = fog
    return () => {
      if (scene.fog === fog) scene.fog = null
    }
  }, [scene])

  useFrame(({ camera }) => {
    const p = progressRef.current
    const z = threeCameraZFromProgress(p)

    // Subtle drone sway
    const tPhase = p * DURATION
    const swayX = Math.sin(tPhase * 0.35) * 0.25
    const swayY = Math.cos(tPhase * 0.28) * 0.18

    camera.position.set(swayX, 1.2 + swayY, z)
    camera.lookAt(swayX * 0.3, 1.2 + swayY * 0.3, z + 12)

    // Fog density: 0 outside fog zone, peaks across the cloud bank
    const fog = fogRef.current
    if (fog) {
      let density = 0
      if (z > FOG_RAMP_IN_START - 5 && z < FOG_RAMP_OUT_END + 5) {
        const rampIn = THREE.MathUtils.smoothstep(z, FOG_RAMP_IN_START, FOG_PEAK_START)
        const rampOut = 1 - THREE.MathUtils.smoothstep(z, FOG_PEAK_END, FOG_RAMP_OUT_END)
        density = 0.06 * rampIn * rampOut
      }
      fog.density = density

      // Fog tint: cool indigo (star side) → warm purple (city side)
      const warmth = THREE.MathUtils.smoothstep(z, FOG_PEAK_START, FOG_RAMP_OUT_END)
      const r = THREE.MathUtils.lerp(0x0B / 255, 0x24 / 255, warmth)
      const g = THREE.MathUtils.lerp(0x06 / 255, 0x10 / 255, warmth)
      const b = THREE.MathUtils.lerp(0x20 / 255, 0x36 / 255, warmth)
      fog.color.setRGB(r, g, b)
    }
  })

  return null
}

/* ─── Main export ───────────────────────────────────────────────── */
export default function Scene1_StarsToCity() {
  const [progress, setProgress] = useState(() => computeProgress(0))

  useEffect(() => {
    const prev = document.body.style.background
    document.body.style.background = '#050A14'
    return () => { document.body.style.background = prev }
  }, [])

  // rAF loop — drives both React re-renders (for DOM parallax) and the
  // mutable ref consumed by FlightController's useFrame.
  useEffect(() => {
    // If ?t= is set, lock progress and skip the loop entirely.
    if (FORCED_T !== null) {
      const p = computeProgress(0)
      progressRef.current = p
      setProgress(p)
      return
    }
    const start = performance.now()
    let raf = 0
    const tick = () => {
      const elapsed = (performance.now() - start) / 1000
      const p = computeProgress(elapsed)
      progressRef.current = p
      setProgress(p)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  const domCameraZ = domCameraZFromProgress(progress)
  const canvasOpacity = smoothstep(0.05, MOUNTAIN_RECEDE_END, progress)

  const depthState = useMemo(
    () => ({
      cameraZ: domCameraZ,
      fov: 62,
      vanishX: 50,
      vanishY: 24,
      maxCameraZ: DOM_MAX_Z,
    }),
    [domCameraZ],
  )

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      overflow: 'hidden',
      background: 'radial-gradient(ellipse at 72% 15%, #0F1F3E 0%, #080E1F 50%, #050A14 100%)',
    }}>
      {/* ═══ Scene 1 DOM parallax layers (recede as domCameraZ climbs) ═══ */}
      <DepthCameraContext.Provider value={depthState}>
        <DomDepthLayer depth={5.0}><StarField /></DomDepthLayer>
        <DomDepthLayer depth={5.0}><IrworobongdoScreen /></DomDepthLayer>
        <DomDepthLayer depth={4.5}><SkyLayer /></DomDepthLayer>
        <DomDepthLayer depth={4.0}><MoonOrb /></DomDepthLayer>
        <DomDepthLayer depth={3.5}><CloudLayer /></DomDepthLayer>
        <DomDepthLayer depth={2.5}><MountainLayer /></DomDepthLayer>
        <DomDepthLayer depth={2.5}><CraneLayer /></DomDepthLayer>
        <DomDepthLayer depth={1.5}><BlossomLayer /></DomDepthLayer>
        <DomDepthLayer depth={1.3}><WaveLayer /></DomDepthLayer>
      </DepthCameraContext.Provider>

      {/* ═══ 3D Canvas — fades in as DOM layers recede ═══ */}
      <div style={{
        position: 'absolute',
        inset: 0,
        zIndex: 15,
        pointerEvents: 'none',
        opacity: canvasOpacity,
      }}>
        <Canvas
          camera={{ fov: 62, near: 0.1, far: 500, position: [0, 1.2, THREE_Z_START] }}
          gl={{
            antialias: true,
            alpha: true,
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.1,
          }}
          onCreated={({ gl }) => { gl.setClearColor(0x000000, 0) }}
        >
          <FlightController />
          <DebugCamera />

          <ambientLight intensity={0.25} color="#2B3050" />
          <directionalLight position={[10, 20, -10]} intensity={0.15} color="#6878A8" />

          <Starfield />
          <CloudBank />
          <CityBuildings3D />

          <EffectComposer>
            <Bloom
              intensity={1.3}
              luminanceThreshold={0.35}
              luminanceSmoothing={0.85}
              radius={0.8}
              mipmapBlur
            />
            <Vignette eskil={false} offset={0.2} darkness={0.55} />
          </EffectComposer>
        </Canvas>
      </div>
    </div>
  )
}
