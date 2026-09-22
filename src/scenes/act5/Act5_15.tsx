/**
 * Act 5.15 — THROUGH THE MOUNTAINS (1:30.5 – 1:32, 1.5s)
 *
 * The connective beat between the wave and the city: one shot of him crossing
 * the range, and nothing else.
 *
 * Without it the film cuts from a farmyard at dawn straight to a street canyon
 * at night, and the distance between those two places — which is the whole
 * point of what he just did — is a cut. A second and a half of one small
 * figure walking away, under four hundred metres of ridge, in the middle of a
 * day that has neither end of the journey in it, is what makes the street
 * scene land as somewhere he had to GET to.
 *
 * ── Where this happens ───────────────────────────────────────────────
 * The pass, which is a real place in this film: Act B's four ridge bands at
 * z = 220 / 430 / 660 / 900, the same hills the flight punches through at
 * 0:07 and comes back over at 0:42. He is walking the corridor between them,
 * away from the lens and toward the city — literally the direction Act 1
 * travels, at ground level and at 1.4 m/s instead of at altitude.
 *
 * `ValleyStill at={filmTime(58)}` is the act's own broad daylight — and the
 * `filmTime` is not decoration. `at` is handed to `setFlightOffset`, which is
 * documented in FILM seconds, and `worldTime()` then runs it through
 * `storyTime()`. Since the journey home was sped up ~3×, everything past 0:37.5
 * gains 21.5 seconds on the way through: the `at={58}` this shot was written
 * with was arriving at STORY 79.5, which is between "the sun is off the valley"
 * and "full night". The whole pass was rendering as dusk while this comment
 * claimed daylight. `filmTime(58)` = 36.9 is the film second whose story second
 * is 58, and it will stay so if the warp is ever retuned.
 *
 * `house={false}` because the farmhouse is nine hundred units behind the camera
 * and would only be a lit box at the bottom of frame in a shot that is about
 * being a long way from it, and `people={false}` because Act B's own pair are
 * on the road at that hour.
 *
 * ── The read ─────────────────────────────────────────────────────────
 * He has to be SMALL and he has to be MOVING, and at a second and a half those
 * two fight: at this distance his gait is nearly sub-pixel. So the motion the
 * eye actually gets is the camera's — a slow creep forward and up, with him
 * held near the same place in frame. The parallax between the ridge bands is
 * what says "travelling"; he only has to say "someone".
 *
 * Small, though, is a floor and not a target. He used to read as a speck — not
 * because he was small, but because he was BURIED: the framing was always
 * giving him about a fifth of frame height and the floor was eating four
 * fifths of it (see the ground note below). Standing him on the real ground
 * changed nothing about the lens and gave the shot its subject back. A fifth
 * of frame height, WHOLE, is the size at which a person crossing a mountain
 * still looks like a person.
 *
 * He is also the only self-lit thing in the frame — the sun is behind him, in
 * the gap, so the ridges he is walking into are flat green shapes and he is
 * the one object with light of its own. That is the same sentence 5.2 says
 * four seconds later with seventy strangers instead of four mountains.
 */

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import * as THREE from 'three'

import { createScene } from '../createScene'
import { getAnimTime } from '../../hooks/useAnimTime'
import { GoldFigure } from '../characters/goldFigure'
import { ValleyStill } from '../actB/still'
import { VALLEY_Y, filmTime } from '../actB/flight'
import { BUNDLE_CLOTH } from './shared'

/** World scale: Act B's adult is 20× the figure rig's, as everywhere else. */
const WS = 20

/**
 * ── He stands on VALLEY_Y, and getting that wrong is what buried him ──
 *
 * This shot originally computed its own floor from Act B's `Ground` — the
 * plane at y = -18 whose vertices ride `sin(x·0.0031 + 1.1)·7 + sin(z·0.0026)·6
 * - 6`, about -16 on this lane — on the reasoning that VALLEY_Y is the valley
 * floor a mountain range away. It is not. `Valley`'s ground is a flat plane at
 * VALLEY_Y = 12 that covers this whole corridor, and it is ON TOP of `Ground`.
 * A 36-unit-tall figure standing at -16 has 28 units of him under the floor:
 * exactly the head-and-shoulders-above-a-ridge that the shot was reading as.
 *
 * Do not derive a height here. Raycast: straight down from y = 900 over the
 * x ∈ [-160, 90], z ∈ [-250, 500] block, every hit is VALLEY_Y, so the
 * corridor is flat and the whole lane is standable.
 */

/**
 * Where he is on the corridor, at t = 0. Between the first two ridge bands.
 * (The earlier note here warned that the first band's fill-hills make the
 * z = -258…+898 stretch unstandable — they do not, on this lane; the same
 * raycast that found the floor found nothing above it.)
 */
const WALK_X = -60
const WALK_Z0 = 150
/** Act B's own gait, in world units per second — the pace Act 3's pair walk. */
const WALK_RATE = 26

/**
 * The bundle he left home with in 5.1, and 5.1's own two numbers for it: the
 * hand is PINNED to it (`leftHandAt`) rather than left to the walk cycle, or
 * the arm swings out of a box that stays put and the box reads as a crate
 * dropped on the trail beside him.
 */
const BUNDLE_HAND: [number, number, number] = [-0.28, 0.86, 0.05]
const BUNDLE_AT: [number, number, number] = [-0.32, 0.66, 0.05]

/**
 * Him. Walking away up the pass, bundle still in the left hand from 5.1.
 *
 * `inPlace` plus an explicit group translation rather than the rig's own
 * z-loop: the loop is authored in figure units over a 3-unit stride and would
 * put him back where he started twice a second at this scale.
 */
function Traveller() {
  const ref = useRef<THREE.Group>(null)

  useFrame(() => {
    const t = getAnimTime()
    const z = WALK_Z0 + t * WALK_RATE
    if (ref.current) ref.current.position.set(WALK_X, VALLEY_Y, z)
  })

  return (
    <group ref={ref} position={[WALK_X, VALLEY_Y, WALK_Z0]}>
      {/* Facing +z, away from the lens and toward the city. */}
      <group scale={WS}>
        <GoldFigure
          pose="walking" animate inPlace material="goldAmber" glow={2.4}
          leftHandAt={BUNDLE_HAND}
        />
        <mesh position={BUNDLE_AT}>
          <boxGeometry args={[0.24, 0.28, 0.20]} />
          <meshStandardMaterial color={BUNDLE_CLOTH} roughness={0.95} />
        </mesh>
      </group>
    </group>
  )
}

/**
 * ── Nothing is placed on this ground ──────────────────────────────────
 *
 * The shot carries itself on what is genuinely there: two ridge shoulders, the
 * gap between them with the low sun sitting in it, drifting blossom, and one
 * warm figure. The creep gets its parallax from the bands themselves — a
 * hundred units of dolly against a near band four hundred out is a quarter of
 * its depth.
 *
 * The vignette used to run at 0.95 to grade off an empty lower third. With the
 * daylight back that third is lit ground rather than murk, and 0.95 was taking
 * the ridges down with it; 0.62 is enough to hold the corners.
 */

/** Act B's story second 58: the low sun still in the pass, the range green. */
const DAYLIGHT = 58

const CAM_A: [number, number, number] = [-40, 38, -300]
const CAM_TGT_A: [number, number, number] = [-52, 84, 480]

export default createScene({
  background: '#1A2238',
  three: {
    camera: {
      position: CAM_A,
      fov: 24,
      // The range is 900 units deep and the sky dome is kilometres out.
      near: 1,
      far: 24000,
    },
    gl: {
      antialias: true,
      toneMapping: THREE.ACESFilmicToneMapping,
      toneMappingExposure: 1.0,
    },
    onCreated: ({ camera }) => camera.lookAt(...CAM_TGT_A),
    debugTarget: CAM_TGT_A,
  },
  // The creep. Small, and forward — the near crag sweeps, the bands behind it
  // barely move, and that difference is the only thing carrying the shot.
  cameraMoves: [{
    a: { pos: CAM_A, target: CAM_TGT_A, fov: 24 },
    b: { pos: [-14, 44, -212], target: [-56, 82, 480], fov: 24.6 },
    t0: 0,
    t1: 1.6,
    ease: 'inout',
  }],
}, function Act5_15() {
  return (
    <>
      <ValleyStill at={filmTime(DAYLIGHT)} night={false} house={false} people={false} />
      <Traveller />

      <EffectComposer>
        <Bloom intensity={0.42} luminanceThreshold={0.82} luminanceSmoothing={0.3} mipmapBlur />
        <Vignette eskil={false} offset={0.16} darkness={0.62} />
      </EffectComposer>
    </>
  )
})
