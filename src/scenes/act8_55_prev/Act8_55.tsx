/**
 * Act 8.55 — "Arirang Ascension: Ocean of People" (2:22 – 3:10, one 48s shot)
 *
 * The ignition, the Arirang, the jump, and the ascent into Korean
 * constellations. Local t=0 ↔ song 2:22 (timeline slot from=142).
 *
 *   1. THE IGNITION — opens on a dark valley: only the golden figure glows,
 *      singing in front of the house with the person who came out to meet him.
 *      The light spreads outward from their two hands, figure by figure, drum hit
 *      by drum hit, until the whole valley burns the same shared gold.
 *   2. The camera never stops — keyframes ride a time-aware Catmull-Rom spline,
 *      so the whole scene is one continuous glide.
 *   3. The jump on the drop, then every soul leaves the ground and the sky
 *      becomes Bukduchilseong and the 은하수.
 *
 * ── Where it happens ─────────────────────────────────────────────────
 * Act B's valley, at Act B's house, on Act B's road — the ground the child walks
 * out of in 5.1 and the road Act 7 walks back up. `ValleyStill` mounts the real
 * thing (its floor, its paddies, its farmsteads, its power line, its roadside
 * shrines, its range, its sky, its fog, its key light) at world time 70, which is
 * Act B's own night: the moon cold and weak, the paddies black, and the lamp in
 * that house the brightest thing left in the valley. That last part is the whole
 * opening frame.
 *
 * What this act still owns is everything the valley does not have: the two of
 * them, four thousand strangers, the market they came for, and the sky they turn
 * into. All of it stays authored in village units and goes in through
 * `<Village>` — see `locale.tsx` for why that is a coordinate change rather than
 * a rewrite, and `CameraRig` for the one thing the move genuinely forced (the
 * shot now looks down the valley instead of up it, because the ground behind that
 * house is a mountain).
 *
 * Act 8.55's own `Terrain` and `SkyDome` are no longer mounted. They were a
 * careful lookalike for this valley, built before it existed.
 */
import { useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import * as THREE from 'three'
import { SceneCanvas } from '../SceneCanvas'
import { ValleyStill } from '../actB/still'
import { FOG_COLOR, NIGHT_BG } from './constants'
import { generateWorld } from './world'
import { Village, toWorld } from './locale'
import { CameraRig, OPEN_FOV, OPEN_POS, OPEN_TGT } from './CameraRig'
import { SkyDome } from './SkyDome'
import { CrowdSouls } from './Crowd'
import { NightMarket } from './NightMarket'
import { ParentFigure } from './ParentFigure'
import { Constellations } from './Constellations'
import { FarCrowd } from './FarCrowd'

/**
 * Act B's clock, held at its own night.
 *
 * 70 sits inside the window 64 ≤ t < 76, which is both the full cold night
 * (`nightFall` steps at 64) and the stretch where Act B's own walking pair are
 * off the road — they are under the tree between its two cuts. `people={false}`
 * says so anyway; this is belt and braces, and it keeps the scene clear of
 * `indoors()` at 82, which would switch the valley's lights and fog off under it.
 *
 * World time keeps running from here at 1:1, so across 48 seconds it reaches
 * 118 — well past `indoors()`. Hence the explicit `atFn`: it holds the valley
 * inside its night window and creeps forward just enough that nothing is frozen.
 */
const NIGHT = 70
const worldClock = (t: number) => NIGHT + t * 0.1

/**
 * This act's own fog, and it exists because Act B's ate the crowd.
 *
 * Act B runs one `FogExp2` for a valley that is kilometres deep and is mostly
 * looked at from the air; 8.55 stands on the floor of it and looks across a
 * field of four and a half thousand people 1,600 units deep. Under Act B's
 * curve every body past about four hundred units went to fog colour — which is
 * almost black — while their halos, which are `fog: false` points, did not. The
 * result is the thing that made this act read as bokeh instead of as a crowd:
 * pull back and a black fog closes over everyone, leaving only the lights.
 * 8.55-old never did that; it ran a LINEAR fog whose near plane was past the
 * whole field.
 *
 * So: linear, starting 2,000 units out — past the last figure — and reaching
 * full only at the far end of the valley, where it still does the job of
 * putting the range and the risen city at a distance.
 *
 * It is applied from a `useFrame` rather than declared as `<fog attach>`,
 * because `Atmosphere` (inside `ValleyStill`) assigns `scene.fog` every frame
 * and would win. This component is mounted after it, so it subscribes after it,
 * so it runs after it.
 */
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
      {/* `farmland="none"`: after Act 4.5's industrialisation there is no more
          farmland, so the valley he comes home to is worked-over dirt. It is
          also what clears the frame — the flooded paddies and their specular
          mirror were the largest object in most of this shot, and the ocean of
          people is supposed to be. */}
      <ValleyStill
        at={NIGHT}
        atFn={worldClock}
        people={false}
        farmland="none"
        // Act B's stars, moon and cloud bank stay off: this act mounts its own
        // sky below, and two moons in one frame is one moon too many.
        night={false}
      />

      <ActFog />

      <Village>
        {/* 8.55's own sky, back. It is the act's darkest surface (NIGHT_TOP is
            #01030A) and it carries the ancient background stars, the moon and
            the nebula bed the river of souls settles into — none of which Act
            B's sky has, and all of which the finale was missing.

            It also fixes a measured problem. Act B's dome carries a purple
            light-pollution term for the city behind the range, and at world 70
            its arena component still evaluates to 0.38 — which is why the sky
            in this act measured (30,27,39) against 8.55-old's (6,6,13), five
            times brighter and the wrong hue, with every star and every soul
            competing against it. This dome has `renderOrder={-10}` against Act
            B's `-100`, so it paints over it; both write no depth, so the range
            and the risen city still draw on top of both. */}
        <SkyDome />
        <NightMarket stalls={world.stalls} />
        {/* Mounted here rather than by `Terrain`, which used to own it along
            with the house it stands outside. Act B's valley owns that house
            now, and dropping `Terrain` silently took the one person the whole
            scene is about out of the frame with it. */}
        <ParentFigure />
        <CrowdSouls world={world} />
        <FarCrowd />
        <Constellations world={world} />
      </Village>
    </>
  )
}

export default function Act8_55() {
  return (
    <div style={{ width: '100%', height: '100%', background: NIGHT_BG, overflow: 'hidden' }}>
      <SceneCanvas
        style={{ width: '100%', height: '100%' }}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.25,
          preserveDrawingBuffer: true,
        }}
        // Act B's planes, not this act's: the valley is kilometres deep and the
        // old far plane of 420 would have clipped the range away entirely.
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
