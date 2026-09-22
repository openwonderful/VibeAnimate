/**
 * Act 5.4 — THE EMPTY TABLE (~1:43 – 1:51)
 *
 * The same room as Act 3.3. The same soban, the same lantern, the same jars on
 * the same shelf. One person at it now, eating slowly, and the place where the
 * child knelt is laid but unused.
 *
 * This is why the hanok set is shared: the beat only works if the audience
 * recognises the room *exactly* — not a room like it. Everything geometric
 * here is imported from the same module 3.3 uses, and the only authored
 * differences are that one seat is empty, the light is colder, and the
 * caregiver's gold has faded to the dimmest it gets in the whole arc.
 *
 * (The scene this replaced rendered as an almost entirely black frame.)
 */

import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import * as THREE from 'three'

import { createScene } from '../createScene'
import GradientEnvironment from '../effects/GradientEnvironment'
import SeededSparkles from '../effects/SeededSparkles'
import {
  HanokShell, HanokDressing, HanokLighting, Steam, Diner,
  Soban, Bowl, Utensils,
  NIGHT, SOUP_GREEN, CLAY_DARK, ROOM_BACK, TABLE_TOP, ramp,
} from '../sets/hanok'
import { CARE_GOLD_55 } from './shared'
import { PARENT_HAT } from '../actB/valley'

/**
 * The caregiver sits on the LEFT and the child's place, still laid, is on the
 * RIGHT — the mirror of 5.3, where he is in the right third with the empty
 * half of the counter to his left. Both scenes used to put their one person
 * just left of centre, and cut together that reads as one body in one room
 * rather than as two people at opposite ends of the same absence.
 *
 * The left seat is also the seat the caregiver had in 3.3, so this pairing
 * costs nothing there any more: both rhymes point the same way now.
 */
const CARE_X = -0.50
const EMPTY_X = +0.46
const SEAT_Z = -0.74

function EmptyTable() {
  return (
    <group>
      <Soban />
      {/* Their place — one bowl of rice, one of soup, and nothing else. */}
      <Bowl position={[-0.29, TABLE_TOP + 0.028, -0.31]} />
      <Bowl
        position={[-0.46, TABLE_TOP + 0.024, -0.23]} r={0.062} h={0.048}
        fill={SOUP_GREEN} glow={0.08} clay={CLAY_DARK}
      />
      <Utensils position={[-0.36, TABLE_TOP, -0.10]} />

      {/* The child's place, still laid. The bowl is clean and empty — the
          detail that says this is a habit, not an accident. */}
      <Bowl
        position={[0.25, TABLE_TOP + 0.026, -0.31]} r={0.066} h={0.05}
        fill="#6A5B44" glow={0.0} clay={CLAY_DARK}
      />
      <Utensils position={[0.32, TABLE_TOP, -0.10]} flip />
    </group>
  )
}

function SceneBody() {
  return (
    <>
      <color attach="background" args={[NIGHT]} />
      {/* Lamplight bouncing off paper screens and old wood — the room has
          no daylight at all, so this is the only fill it gets. */}
      <GradientEnvironment
        zenith="#16100C" horizon="#3A2A1C" ground="#120C08" intensity={0.9}
      />
      <fog attach="fog" args={['#120A06', 4.2, 10.5]} />

      {/* Colder and dimmer than 3.3: the lamp is turned low and the moon does
          more of the work. Same fixtures, less warmth in them. */}
      <HanokLighting warm={0.5} moon={1.25} ambient={0.11} ambientColor="#3E3020" />
      <HanokShell />
      <HanokDressing />

      <EmptyTable />
      {/* Steam from one bowl only. In 3.3 three things on this table steamed. */}
      <Steam
        position={[-0.29, TABLE_TOP + 0.09, -0.31]}
        count={30} spread={0.05} rise={0.42} size={3.0} opacity={0.13} seed={11}
      />

      {/* The caregiver, in their seat from 3.3, at the faintest gold in the
          arc. They look toward the open panel around 4s and then go back to
          the bowl — the scene's only event. */}
      <Diner
        hat={PARENT_HAT}
        kind="adult"
        x={CARE_X}
        z={SEAT_Z}
        facing={0.16}
        hipY={0.18}
        legs="cross"
        cycle={6.4}
        cycleOffset={0.10}
        // Back on the −x seat (3.3's), where the un-mirrored +x arm is the
        // one nearer the middle of the table.
        bowl={[0.13, 0.35, 0.36]}
        mouth={[0.05, 0.87, 0.22]}
        restHand={[-0.10, 0.33, 0.30]}
        glow={0.55}
        color={CARE_GOLD_55}
        emissive={CARE_GOLD_55}
        // Turns toward the place that is set and empty, holds, turns back.
        leanTo={t => ramp(t, 2.2, 3.4) * 0.9}
      />

      {/* The child's empty seat gets nothing — no figure, no glow. */}
      <group position={[EMPTY_X, 0, SEAT_Z]} />

      <SeededSparkles
        seed={71} count={90} scale={[3.0, 1.6, 1.8]} size={1.1} speed={0.12}
        color="#E8C48A" opacity={0.4} position={[0, 1.0, -0.45]}
      />
      <SeededSparkles
        seed={73} count={26} scale={[1.1, 1.0, 0.6]} size={2.2} speed={0.28}
        color="#CFE07A" opacity={0.6} position={[0.72, 0.7, ROOM_BACK - 0.5]}
      />
    </>
  )
}

export default createScene({
  background: NIGHT,
  three: {
    camera: { position: [0.14, 0.90, 2.46], fov: 42, near: 0.05, far: 40 },
    gl: {
      antialias: true,
      toneMapping: THREE.ACESFilmicToneMapping,
      toneMappingExposure: 1.0,
    },
    shadows: true,
    onCreated: ({ camera }) => camera.lookAt(0.08, 0.60, -0.36),
    debugTarget: [0.08, 0.55, -0.1],
  },
  // The same slow push as 3.3, compressed into the five seconds this beat
  // keeps after Act 6 takes the tail of its window.
  cameraMoves: [{
    a: { pos: [0.14, 0.90, 2.46], target: [0.08, 0.60, -0.36], fov: 42 },
    b: { pos: [0.09, 0.86, 2.18], target: [0.06, 0.57, -0.38], fov: 41.5 },
    t0: 0,
    t1: 5,
    ease: 'inout',
  }],
}, function Act5_4() {
  return (
    <>
      <SceneBody />
      <EffectComposer>
        <Bloom intensity={0.55} luminanceThreshold={0.64} luminanceSmoothing={0.4} mipmapBlur />
        <Vignette eskil={false} offset={0.2} darkness={0.74} />
      </EffectComposer>
    </>
  )
})
