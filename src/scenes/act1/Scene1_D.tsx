/**
 * Scene 1.1-D — Exact 1.2 zoom, but with a real 3D starfield.
 *
 * Identical camera flight and layout to Scene 1.2 (DepthComposition), with
 * two narrow tweaks:
 *   1. The 2D SVG StarField DOM layer is omitted — we'd rather see real
 *      3D stars we can fly past than a flat image.
 *   2. A 3D starfield is injected into the Canvas, fog-exempt, distributed
 *      along the full camera path so stars sweep past the camera.
 *   3. Fog is tuned denser (closer near-plane) so the city silhouette
 *      doesn't leak through the stars during the opening seconds —
 *      justifying why we can't see the city behind the stars yet.
 *
 * Everything else (easeCamera, DOM parallax depths, Scene 2 reveal,
 * CityBuildings3D, StadiumFrame3D, audio timeline) is reused unchanged.
 *
 * Accessed via ?act=1.1-D
 */

import { useMemo } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

import { useAudioTimeline } from '../../hooks/useAudioTimeline'
import AudioControls from '../zoom/AudioControls'
import { DebugCamera } from '../DebugCamera'
import { AnimTimeContext } from '../../hooks/useAnimTime'
import {
  DepthCameraContext,
  DomDepthLayer,
  type DepthCameraState,
} from '../zoom/DepthCamera'
import DepthCameraSync from '../zoom/DepthCameraSync'
import CityBuildings3D from '../zoom/CityBuildings3D'
import StadiumFrame3D from '../zoom/StadiumFrame3D'
import { easeCamera, MAX_CAMERA_Z } from '../zoom/DepthScene'
import Scene2 from '../act2/Scene2'

// Scene 1 layers — StarField deliberately omitted (replaced by 3D Stars3D below)
import MoonOrb from './components/MoonOrb'
import CloudLayer from './components/CloudLayer'
import MountainLayer from './components/MountainLayer'
import CraneLayer from './components/CraneLayer'
import BlossomLayer from './components/BlossomLayer'
import WaveLayer from './components/WaveLayer'
import SkyLayer from './components/SkyLayer'
import IrworobongdoScreen from './components/IrworobongdoScreen'
import Ribbons from './components/Ribbons'
import LatticePattern from './components/LatticePattern'
import TitleTreatment from './components/TitleTreatment'
import HangeulAccents from './components/HangeulAccents'
import MinhwaBorder from './components/MinhwaBorder'

import { seededRandom } from '../../utils/svgHelpers'

/* ─── Star shell z range — a thin layer between backmost hill and city ── */
// Backmost DOM hill layer (IrworobongdoScreen) is at depth 5.0; buildings
// begin at 3D z=7. Keep the shell strictly inside that narrow gap.
const STAR_Z_NEAR = 5.5
const STAR_Z_FAR = 6.5
const STAR_CLEAR_Z = 7.2    // fog fully off just past the shell — do not haze the city

/* ─── Star sprite helpers ───────────────────────────────────────── */
function makeStarSprite(coreRadius: number, halo1: number, halo2: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 64; canvas.height = 64
  const ctx = canvas.getContext('2d')!
  const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
  grad.addColorStop(0, 'rgba(255,255,255,1)')
  grad.addColorStop(coreRadius, 'rgba(255,255,255,1)')
  grad.addColorStop(Math.min(1, coreRadius + 0.08), `rgba(255,255,255,${halo1})`)
  grad.addColorStop(0.7, `rgba(255,255,255,${halo2})`)
  grad.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, 64, 64)
  const tex = new THREE.CanvasTexture(canvas)
  tex.needsUpdate = true
  return tex
}

/* ─── 3D Starfield — two-layer (field + highlights) ─────────────── */
function Stars3D() {
  const data = useMemo(() => {
    const rand = seededRandom(9911)
    const TOTAL = 900
    const BRIGHT_RATIO = 0.08
    const brightCount = Math.floor(TOTAL * BRIGHT_RATIO)
    const fieldCount = TOTAL - brightCount

    const makeGeom = (count: number) => {
      const positions = new Float32Array(count * 3)
      const colors = new Float32Array(count * 3)
      for (let i = 0; i < count; i++) {
        const radial = Math.pow(rand(), 0.55) * 12
        const theta = rand() * Math.PI * 2
        positions[i * 3 + 0] = Math.cos(theta) * radial
        positions[i * 3 + 1] = Math.sin(theta) * radial * 0.68
        positions[i * 3 + 2] = STAR_Z_NEAR + rand() * (STAR_Z_FAR - STAR_Z_NEAR)

        const tint = rand()
        if (tint < 0.75) {
          colors[i * 3 + 0] = 1;     colors[i * 3 + 1] = 1;     colors[i * 3 + 2] = 1
        } else if (tint < 0.90) {
          colors[i * 3 + 0] = 1;     colors[i * 3 + 1] = 0.92;  colors[i * 3 + 2] = 0.68
        } else {
          colors[i * 3 + 0] = 0.76;  colors[i * 3 + 1] = 0.86;  colors[i * 3 + 2] = 1
        }
      }
      const g = new THREE.BufferGeometry()
      g.setAttribute('position', new THREE.BufferAttribute(positions, 3))
      g.setAttribute('color', new THREE.BufferAttribute(colors, 3))
      return g
    }

    return {
      fieldGeom: makeGeom(fieldCount),
      brightGeom: makeGeom(brightCount),
      fieldSprite: makeStarSprite(0.04, 0.25, 0.05),
      brightSprite: makeStarSprite(0.14, 0.5, 0.12),
    }
  }, [])

  return (
    <>
      {/* Field stars — small, soft, normal blending */}
      <points geometry={data.fieldGeom}>
        <pointsMaterial
          size={0.07}
          sizeAttenuation
          vertexColors
          map={data.fieldSprite}
          transparent
          depthWrite={false}
          opacity={0.85}
          fog={false}
        />
      </points>
      {/* Highlight stars — rarer, brighter, additive */}
      <points geometry={data.brightGeom}>
        <pointsMaterial
          size={0.18}
          sizeAttenuation
          vertexColors
          map={data.brightSprite}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          opacity={1}
          fog={false}
        />
      </points>
    </>
  )
}

/* ─── Dynamic fog — active only inside the star shell ─────────────── */
function DynamicFog() {
  const { scene } = useThree()
  const fogRef = useMemo(() => {
    const fog = new THREE.FogExp2('#050A14', 0)
    scene.fog = fog
    return fog
  }, [scene])

  useFrame((state) => {
    const z = state.camera.position.z
    // Zero fog once the camera has cleared the star shell. Before that,
    // density ramps up into the shell to hide the city behind the stars.
    if (z >= STAR_CLEAR_Z) {
      fogRef.density = 0
      return
    }
    // Ramp in as we approach the shell's far edge, so city visibility
    // drops smoothly right before the shell rather than fogging the
    // whole early scene.
    const ramp = THREE.MathUtils.smoothstep(z, STAR_Z_NEAR - 1.5, STAR_Z_FAR)
    fogRef.density = 0.22 * ramp
  })

  return null
}

/* ─── Main export — mirrors DepthComposition, with 3D stars injected ── */
export default function Scene1_D() {
  const audio = useAudioTimeline('/audio/body-to-body.mp3')

  const params = useMemo(() => new URLSearchParams(window.location.search), [])
  const debugTime = params.get('t')
  const debugFov = params.get('fov')

  const effectiveTime = debugTime !== null ? parseFloat(debugTime) : audio.currentTime
  const fov = debugFov !== null ? parseFloat(debugFov) : 75

  const cameraZ = easeCamera(effectiveTime)

  const cameraState: DepthCameraState = useMemo(
    () => ({
      cameraZ,
      fov,
      vanishX: 50,
      vanishY: 24,
      maxCameraZ: MAX_CAMERA_Z,
    }),
    [cameraZ, fov],
  )

  return (
    <AnimTimeContext.Provider value={effectiveTime}>
      <DepthCameraContext.Provider value={cameraState}>
        <div style={{
          position: 'relative',
          width: '100vw',
          height: '100vh',
          overflow: 'hidden',
          background: '#050A14',
        }}>
          {/* ═══ Scene 2 — tiny dot from t=18, zoom-out reveal 19.3→20.1 ═══ */}
          {(() => {
            const dotAppearTime = 18
            const clipStartTime = 19.3
            const clipEndTime = 20.2
            if (effectiveTime < dotAppearTime) return null

            const progress = effectiveTime < clipStartTime
              ? 0
              : Math.min(1, (effectiveTime - clipStartTime) / (clipEndTime - clipStartTime))

            const eased = progress * progress * progress
            const inset = 49 * (1 - eased)
            const borderRadius = Math.round(30 * (1 - eased))
            const scale = 1 + 1.5 * (1 - eased)
            const blurProgress = Math.min(1, progress / 0.5)
            const blur = 12 * (1 - blurProgress * blurProgress)
            const brightness = 1 + 0.3 * (1 - eased)

            const filterStr = blur > 0.1
              ? `blur(${blur}px) brightness(${brightness.toFixed(2)})`
              : brightness > 1.01
                ? `brightness(${brightness.toFixed(2)})`
                : undefined

            return (
              <div style={{
                position: 'absolute', inset: 0,
                zIndex: 20,
                overflow: 'hidden',
                clipPath: inset > 0.05
                  ? `inset(${inset}% round ${borderRadius}px)`
                  : undefined,
                filter: filterStr,
                willChange: 'clip-path, filter',
              }}>
                <div style={{
                  width: '100%', height: '100%',
                  transform: scale > 1.001 ? `scale(${scale.toFixed(3)})` : undefined,
                  transformOrigin: '50% 25%',
                  willChange: 'transform',
                }}>
                  <Scene2 />
                </div>
              </div>
            )
          })()}

          {/* ═══ 3D Canvas — VISIBLE FROM THE START (was gated by cameraZ>4.5 in 1.2) ═══ */}
          <div style={{
            position: 'absolute', inset: 0, zIndex: 15, pointerEvents: 'none',
          }}>
            <Canvas
              style={{ background: 'transparent' }}
              gl={{ alpha: true, antialias: true }}
              camera={{ fov, position: [0, 0, 0], near: 0.1, far: 100 }}
            >
              <DebugCamera />
              <DepthCameraSync />
              <DynamicFog />

              <ambientLight intensity={0.3} />

              <Stars3D />
              <CityBuildings3D />
              <StadiumFrame3D />
            </Canvas>
          </div>

          {/* ═══ Scene 1 DOM layers — StarField omitted, replaced by 3D stars ═══ */}
          {/* (DomDepthLayer depth=5.0 StarField removed — see Stars3D inside Canvas) */}
          <DomDepthLayer depth={5.0}><IrworobongdoScreen /></DomDepthLayer>
          <DomDepthLayer depth={4.5}><SkyLayer /></DomDepthLayer>
          <DomDepthLayer depth={4.0}><MoonOrb /></DomDepthLayer>
          <DomDepthLayer depth={3.5}><CloudLayer /></DomDepthLayer>
          <DomDepthLayer depth={2.5}><MountainLayer /></DomDepthLayer>
          <DomDepthLayer depth={2.5}><CraneLayer /></DomDepthLayer>
          <DomDepthLayer depth={1.5}><BlossomLayer /></DomDepthLayer>
          <DomDepthLayer depth={1.3}><WaveLayer /></DomDepthLayer>
          <DomDepthLayer depth={1.5}><Ribbons /></DomDepthLayer>
          <DomDepthLayer depth={1.0}><LatticePattern /></DomDepthLayer>
          <DomDepthLayer depth={1.0}><TitleTreatment /></DomDepthLayer>
          <DomDepthLayer depth={1.0}><HangeulAccents /></DomDepthLayer>
          <DomDepthLayer depth={1.0}><MinhwaBorder /></DomDepthLayer>

          <AudioControls audio={audio} />
        </div>
      </DepthCameraContext.Provider>
    </AnimTimeContext.Provider>
  )
}
