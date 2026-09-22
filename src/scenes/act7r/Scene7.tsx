/**
 * Act 7 — "The Road Back". Shared body for both halves of the walk.
 *
 * The two scenes differ only in which camera keys they run and where they sit on
 * the act clock; everything else — the valley, the road, the house, the range,
 * the sky, the grade — is one continuous state driven by ACT time. That is what
 * makes 7.1 and 7.2 read as one journey cut in the middle rather than two scenes
 * about the same thing.
 *
 * ── Where it happens ─────────────────────────────────────────────────
 * Act B's valley. Not a scene that resembles it — `ValleyStill` mounts the
 * actual thing: Act B's ground, its 62-wide road, its paddies, its farmsteads
 * and power line, its roadside shrines, its range, its sky, its fog and its key
 * light, on Act B's own clock (see `worldAt` in journey.ts). The house he is
 * walking to is the hanok he walked out of in 5.1, at Act B's `HOUSE_Z`, with
 * the door 5.1 left open.
 *
 * This act used to be built on its own ground — `Ground7`, `City`, 8.55's
 * `Terrain` and `SkyDome`, a hand-placed sun — a careful lookalike for a valley
 * that did not exist yet when it was written. All of that is gone. What is left
 * of Act 7 is the four things that are actually ITS: the walk, the camera, the
 * crowd in the market, and the man.
 *
 * Everything Act 7 draws is authored in village units (an adult is 1.9 tall) and
 * goes in through `<Village>`, the one transform that puts 8.55's authoring space
 * inside Act B's valley — so no pose, gait or key had to be re-signed. The
 * camera is the exception: a camera inside a scaled group would have its near
 * plane and fov scaled with it, so `CameraRig7` maps its village-space poses out
 * through `toWorld` instead.
 *
 * ── The skyline ──────────────────────────────────────────────────────
 * Act B's own city — the towers and their window lights, 3,000 units past the
 * range — is mounted here rather than left to `ValleyStill`, which does not
 * carry it. It is the one thing in the frame that is not the valley he grew up
 * in: a skyline standing behind the pass that was not there when he left, and
 * the place he is walking home from.
 */
import { useMemo } from 'react'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import * as THREE from 'three'
import { SceneCanvas } from '../SceneCanvas'
import { NIGHT_BG } from '../act8_55/constants'
import { generateWorld } from '../act8_55/world'
import { Village, toWorld } from '../act8_55/locale'
import { Fireflies as SharedFireflies } from '../act8_55/Crowd'
import { NightMarket } from '../act8_55/NightMarket'
import { ParentFigure } from '../act8_55/ParentFigure'
import { ValleyStill } from '../actB/still'
import { Towers, CityLights } from '../actB/city'
import { heroX, heroZ, worldAt, type CamKey } from './journey'
import { CameraRig7 } from './CameraRig7'
import { Walkers } from './Walkers'
import { Hero } from './Hero'

/**
 * 'road' is 7.1: seven kilometres out, on the exact ground Act B stages the 3.1
 * beat on — the same valley, the same road, the range a line on the horizon —
 * but no house in reach, no market and nobody else on it. The destination is not
 * in the frame yet, which is the entire point of that scene. 'village' is 7.2,
 * which has all of it.
 */
export type Variant = 'road' | 'village'

/** 8.55's fireflies over the market, at full strength for the whole shot. */
const ALWAYS = () => 1

function SceneContent({ keys, actOffset, timeOffset, variant }: {
  keys: CamKey[]
  actOffset: number
  timeOffset: number
  variant: Variant
}) {
  // The same seed 8.55 uses — these are literally its people, and its market.
  const world = useMemo(() => generateWorld(), [])
  const village = variant === 'village'

  return (
    <>
      <CameraRig7 keys={keys} actOffset={actOffset} />

      {/* Act B's valley, on Act B's clock, with Act B's own pair kept off the
          road: 7.1 is staged on the very stretch they are walking at that hour
          and they would be in the shot. */}
      <ValleyStill
        at={worldAt(actOffset)}
        atFn={t => worldAt(t + actOffset)}
        people={false}
        night={village}
        // The valley he is walking back into is the one Act 4.5 industrialised:
        // no fields, no water, no rice. Barren worked-over dirt, which is also
        // 4.5c's ground and 8.55's.
        farmland="none"
      />

      {/* The city he is coming back from, behind the pass. */}
      <Towers />
      <CityLights />

      <Village>
        {village && <NightMarket stalls={world.stalls} timeOffset={timeOffset} />}
        {village && <SharedFireflies tOff={timeOffset} fade={ALWAYS} />}
        {village && <Walkers world={world} actOffset={actOffset} />}
        {/* The person waiting at the door. Their walk down off the yard starts
            at act 25.5 — inside THIS scene — and finishes just inside 8.55, so
            it has to be mounted on both sides of the cut or they teleport onto
            the road. `homecoming.ts` is defined for negative t for exactly this
            reason; it used to come in with 8.55's `Terrain`, which this act no
            longer mounts. */}
        {village && <ParentFigure tOff={timeOffset} />}
        <Hero actOffset={actOffset} />
      </Village>
    </>
  )
}

/**
 * Both halves mount the same canvas as 8.55 — same gl flags, same exposure,
 * same post chain — so nothing about the image format changes at the cut. The
 * planes are Act B's, not 8.55's: this valley is kilometres deep and a far plane
 * of 420 would clip the range away entirely.
 */
export function Scene7({ keys, actOffset, timeOffset, camera, variant }: {
  keys: CamKey[]
  actOffset: number
  timeOffset: number
  camera: { position: [number, number, number]; fov: number }
  variant: Variant
}) {
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
        camera={{ ...camera, near: 1, far: 24000 }}
        // He is six kilometres from the house for the whole of 7.1, so the debug
        // camera has to orbit HIM rather than a fixed point in the valley.
        debugTarget={toWorld(heroX(actOffset), 1, heroZ(actOffset))}
      >
        <SceneContent keys={keys} actOffset={actOffset} timeOffset={timeOffset} variant={variant} />
        <EffectComposer>
          <Bloom intensity={1.0} luminanceThreshold={0.2} luminanceSmoothing={0.85} mipmapBlur />
          <Vignette eskil={false} offset={0.18} darkness={0.48} />
        </EffectComposer>
      </SceneCanvas>
    </div>
  )
}
