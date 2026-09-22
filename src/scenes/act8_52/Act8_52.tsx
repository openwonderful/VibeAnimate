/**
 * Act 8.51 — "Arirang Ascension II: Ignition" (2:22 – 3:10, one 48s shot)
 *
 * v2 of Act 8.5. Three changes:
 *   1. THE IGNITION — opens on a dark field: only the golden figure glows,
 *      singing before the house. The light spreads outward through the crowd
 *      figure by figure until everyone burns the same shared gold.
 *   2. The opening frame holds just the singer + house; the crowd is
 *      revealed as it catches light around them.
 *   3. The camera never stops — keyframes ride a time-aware Catmull-Rom
 *      spline, so the whole scene is one continuous glide.
 *
 * Everything else (jump, spiral ascent, Korean constellations) is 8.5.
 * Local t=0 ↔ song 2:22 (timeline slot from=142). Deterministic under ?t=.
 */
import { useMemo } from 'react'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import * as THREE from 'three'
import { SceneCanvas } from '../SceneCanvas'
import { FOG_COLOR, NIGHT_BG } from './constants'
import { generateWorld } from './world'
import { CameraRig } from './CameraRig'
import { Terrain } from './Terrain'
import { SkyDome } from './SkyDome'
import { CrowdSouls } from './Crowd'
import { Constellations } from './Constellations'

function SceneContent() {
  const world = useMemo(() => generateWorld(), [])

  return (
    <>
      <color attach="background" args={[NIGHT_BG]} />
      <fog attach="fog" args={[FOG_COLOR, 26, 115]} />
      <CameraRig />
      <SkyDome />
      <Terrain parcels={world.parcels} />
      <CrowdSouls world={world} />
      <Constellations world={world} />
    </>
  )
}

export default function Act8_52() {
  return (
    <div style={{ width: '100vw', height: '100vh', background: NIGHT_BG, overflow: 'hidden' }}>
      <SceneCanvas
        style={{ width: '100%', height: '100%' }}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.25,
          preserveDrawingBuffer: true,
        }}
        camera={{ position: [5.4, 1.15, -13.0], fov: 42, near: 0.1, far: 420 }}
        debugTarget={[0, 1, -24]}
      >
        <SceneContent />
        <EffectComposer>
          <Bloom intensity={1.0} luminanceThreshold={0.2} luminanceSmoothing={0.85} mipmapBlur />
          <Vignette eskil={false} offset={0.18} darkness={0.48} />
        </EffectComposer>
      </SceneCanvas>
    </div>
  )
}
