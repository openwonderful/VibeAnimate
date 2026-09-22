/**
 * Act 8.56 — "Arirang Ascension VII: Ignition Return" (2:22 – 3:10, 48s)
 *
 * 8.51's CAMERA over 8.55's WORLD — the variant that exists because the
 * shipping finale's pan up into the sky misses the beat and 8.51's does not.
 *
 * Everything in frame is the current world, imported from act8_55 unchanged:
 * Act B's valley (`ValleyStill` at its own night), the night market, the
 * parent at the door, the four-and-a-half-thousand-soul crowd, the far
 * crowd, this act's own sky dome and the Korean constellations. The ONLY
 * local thing is `CameraRig` — 8.51's flight, verbatim (see that file for
 * why its ending lands where 8.55's smears).
 *
 * This is the base to edit from: retiming or reshaping the finale's camera
 * happens HERE, in this directory's KEYS, without touching 8.51 (legacy,
 * frozen) or 8.55 (the shipping cut, until this replaces it).
 */
import { useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import * as THREE from 'three'
import { SceneCanvas } from '../SceneCanvas'
import { ValleyStill } from '../actB/still'
import { FOG_COLOR, NIGHT_BG } from '../act8_55/constants'
import { generateWorld } from '../act8_55/world'
import { Village, toWorld } from '../act8_55/locale'
import { SkyDome } from '../act8_55/SkyDome'
import { CrowdSouls } from '../act8_55/Crowd'
import { NightMarket } from '../act8_55/NightMarket'
import { ParentFigure } from '../act8_55/ParentFigure'
import { Constellations } from '../act8_55/Constellations'
import { FarCrowd } from '../act8_55/FarCrowd'
import { CameraRig, OPEN_FOV, OPEN_POS, OPEN_TGT } from './CameraRig'

/** Act B's clock, held at its own night — see Act8_55 for the reasoning. */
const NIGHT = 70
const worldClock = (t: number) => NIGHT + t * 0.1

/** This act's own linear fog, applied after ValleyStill's Atmosphere so it
 *  wins — Act B's FogExp2 eats the crowd (see Act8_55's note). */
function ActFog() {
  const { scene } = useThree()
  const fog = useMemo(() => new THREE.Fog(FOG_COLOR, 2000, 26000), [])
  useFrame(() => { scene.fog = fog })
  return null
}

function SceneContent() {
  const world = useMemo(() => generateWorld(), [])

  return (
    <>
      <CameraRig />
      <ValleyStill
        at={NIGHT}
        atFn={worldClock}
        people={false}
        farmland="none"
        night={false}
      />

      <ActFog />

      <Village>
        <SkyDome />
        <NightMarket stalls={world.stalls} />
        <ParentFigure />
        <CrowdSouls world={world} />
        <FarCrowd />
        <Constellations world={world} />
      </Village>
    </>
  )
}

export default function Act8_56() {
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
        // Act B's planes: the valley is kilometres deep.
        camera={{ position: OPEN_POS, fov: OPEN_FOV, near: 1, far: 24000 }}
        onCreated={({ camera }) => camera.lookAt(...OPEN_TGT)}
        debugTarget={toWorld(0, 1, -16)}
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
