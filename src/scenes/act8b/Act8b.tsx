/**
 * Act 8b — "등불놀이 / The Lantern Release" (2:22 – 3:10, one 48s shot)
 *
 * A variant of 8.55, same world and same first frame — so 7.2 hands off to
 * either one without a change. What differs is what happens at the drop.
 *
 * In 8.55 the crowd dissolves: every soul lifts out of its body, spirals up,
 * and locks into a Korean constellation, and the valley ends up empty under a
 * finished sky. It is a beautiful ending about people who are gone.
 *
 * This is the same gesture with the opposite grammar. Everyone in the valley
 * has been holding a paper sky lantern since the first frame — unlit, a pale
 * shape in the dark — and the ring that leaves the two hands on the road
 * lights them rather than summoning them. Then they let go, and the same sky
 * assembles overhead: same targets, same spiral, same arrival times, the same
 * 은하수 and the same Bukduchilseong locking on the same beats, because a
 * lantern flies on its figure's own `riseStart`/`riseDur`/`target` — the
 * ascent data 8.55 already assigns.
 *
 * What differs is underneath. Nobody leaves. At 0:48 the ground is still full
 * of people, heads back, dimmer than they were because the thing that was
 * lighting them is forty metres up.
 *
 * Local t=0 ↔ song 2:22 (timeline slot from=142). Deterministic under ?t=.
 *
 * ── Where it happens ─────────────────────────────────────────────────
 * Act B's valley, like 8.55 and like Act 7 — same ground, same house, same road,
 * same range, same night. `ValleyStill` mounts it and everything this act draws
 * goes in through `<Village>`; see `act8_55/locale` for the coordinate change and
 * `act8_55/CameraRig` for the one thing the move forced, which is that the shot
 * looks down the valley now instead of up it. Its own `Terrain` and `SkyDome` are
 * gone: they were a lookalike for a valley that exists.
 */
import { useMemo } from 'react'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import * as THREE from 'three'
import { SceneCanvas } from '../SceneCanvas'
import { NIGHT_BG, OPEN_CAM } from '../act8_55/constants'
import { generateWorld } from '../act8_55/world'
import { Village, toWorld } from '../act8_55/locale'
import { NightMarket } from '../act8_55/NightMarket'
import { ParentFigure } from '../act8_55/ParentFigure'
import { Fireflies, GoldenFigure } from '../act8_55/Crowd'
import { FarCrowd } from '../act8_55/FarCrowd'
import { Constellations } from '../act8_55/Constellations'
import { ValleyStill } from '../actB/still'
import { LanternCrowd } from './LanternCrowd'
import { CameraRig8b } from './CameraRig8b'

/** Act B's own night — see `Act8_55` for why 70, and why it barely moves. */
const NIGHT = 70
const worldClock = (t: number) => NIGHT + t * 0.1

function SceneContent() {
  const world = useMemo(() => generateWorld(), [])

  return (
    <>
      <CameraRig8b />
      <ValleyStill at={NIGHT} atFn={worldClock} people={false} />

      <Village>
        <NightMarket stalls={world.stalls} />
        <LanternCrowd world={world} />
        <FarCrowd />
        {/* The same sky 8.55 builds, on the same clock — the star halos and the
            constellation lines key off `riseStart + riseDur`, which is now also
            when a lantern arrives. */}
        <Constellations world={world} />
        <Fireflies />
        {/* The two people drawn as people, and the light they are lit by.
            `ParentFigure` used to arrive with 8.55's `Terrain`; Act B owns the
            house now, so it has to be mounted here or the person he came home
            to is missing from the frame. */}
        <GoldenFigure />
        <ParentFigure />
      </Village>
    </>
  )
}

export default function Act8b() {
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
        // Act B's planes: the valley is kilometres deep and 420 clips the range.
        camera={{ position: toWorld(...OPEN_CAM.pos), fov: OPEN_CAM.fov, near: 1, far: 24000 }}
        onCreated={({ camera }) => camera.lookAt(...toWorld(...OPEN_CAM.tgt))}
        debugTarget={toWorld(0, 1, -16)}
      >
        <SceneContent />
        <EffectComposer>
          <Bloom intensity={0.92} luminanceThreshold={0.24} luminanceSmoothing={0.85} mipmapBlur />
          <Vignette eskil={false} offset={0.18} darkness={0.48} />
        </EffectComposer>
      </SceneCanvas>
    </div>
  )
}
