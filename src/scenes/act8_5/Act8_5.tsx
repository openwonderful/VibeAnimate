/**
 * Act 8.5 — "Arirang Ascension" (2:22 – 3:10, one continuous 48s shot)
 *
 * A field of hundreds gathers in rural Korea to sing Arirang around one warm
 * farmhouse. The camera walks among them, then leaves the ground during
 * "나를 버리고 가시는 님은" and looks straight down on the paddy filigree of
 * people. On the beat drop the whole field jumps once — and begins to rise,
 * souls spiraling upward like embers, while the camera swings around the
 * river of light and finally lands on the road beside the golden figure,
 * looking straight up: the people have become the Korean sky —
 * 북두칠성, 삼태성, 카시오페이아, 남두육성, 직녀와 견우, 그리고 은하수.
 *
 * Local t=0 ↔ song 2:22 (timeline slot from=142). Deterministic under ?t=,
 * the scrubber, and Remotion (all animation reads the shared anim clock).
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

export default function Act8_5() {
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
        camera={{ position: [-3.6, 2.05, 6.4], fov: 55, near: 0.1, far: 420 }}
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
