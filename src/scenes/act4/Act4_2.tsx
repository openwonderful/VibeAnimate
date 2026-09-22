/**
 * Act 4.2 — FIRST STEPS (~1:15, the irreducible start)
 *
 * The toddler wobbles the last few steps across the boards and tumbles into
 * the caregiver's open arms.
 *
 * TIMING: this beat holds the screen for exactly one second (timeline.ts gives
 * 4.1–4.10 a second each). The scene it replaced was authored as a six-second
 * loop, so the master video only ever showed its first 15% — a toddler
 * standing still on the far side of the room while the caregiver waited for
 * someone who never arrived. Every gesture here completes inside 1.0s, with
 * the payoff pose landing around 0.6s so it survives the cut on both sides.
 *
 * Same house as Act 3.3 — the shared hanok set — so the audience recognises
 * the room instantly and the second is spent on the people, not the place.
 */

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import * as THREE from 'three'

import { createScene } from '../createScene'
import { getAnimTime } from '../../hooks/useAnimTime'
import { GoldFigure, CHILD, buildPose, type Proportions } from '../characters/goldFigure'
import { PARENT_HAT } from '../actB/valley'
import {
  HanokShell, HanokDressing, HanokLighting, SeatedFigure,
  NIGHT, clamp01, ramp, type V3,
} from '../sets/hanok'
import { CARE_GOLD_ACT3 } from '../act5/shared'

/**
 * The whole beat, in seconds of local time.
 *
 * These were 0.58 / 0.86 — authored when the slot was one second — and then
 * 1.20 / 1.55 for a two-second one. The old numbers had him arrive at 29% of
 * the shot and then hold a tumbled pose for the remaining 1.4s, which is most
 * of what "the steps don't fit the motion" was: he crossed the room at a run
 * and then the film waited.
 *
 * So they are SCALED TO THE SLOT, every time the slot moves, and the slot is
 * 2.7s now (Act 3's tree and meal trims had to land somewhere with no lyric
 * pin on it — see timeline.ts). ×1.35 on both keeps the shape the last two
 * versions were tuned for: he walks for most of it, lands at 0.6 of the shot,
 * and there is half a second of held frame on the end for the cut to sit in.
 *
 * The walk itself does not care what these are. `CYCLES` is derived from the
 * DISTANCE, and the body position and the leg phase are both driven off the
 * same `u = t / ARRIVE`, so a longer ARRIVE is a slower toddler and never a
 * skating one — which is the whole reason that fix was done this way.
 */
const ARRIVE = 1.62   // toddler reaches the caregiver's hands
const SETTLE = 2.09   // tumble completed, held from here

const CARE_X = -0.78
const START_X = 0.98
// The toddler stops a clear step short of the caregiver: they fall *into* the
// waiting hands, and the two bodies stay separate shapes.
//
// This number and TUMBLE below are one measurement, not two guesses. The
// toddler pitches about their own feet, so the crown swings
// 1.30 * sin(TUMBLE) * 0.68 = 0.30 further along the walk than the feet ever
// get; at the old -0.30 with a 0.46 tumble that put the head at x = -0.75,
// which is the caregiver's SPINE at -0.78. The toddler was not falling into
// the arms, they were falling through the ribcage.
const END_X = 0.0
/** Pitch of the tumble, radians. See END_X. */
const TUMBLE = 0.34
const SEAT_Z = -0.30

// ── The caregiver: kneeling, arms open, motionless until contact ─────
function Caregiver() {
  const hands = (t: number) => {
    // Arms are held wide and low the whole time, then fold in as the toddler
    // lands. The close is small — a catch, not a hug.
    const close = ramp(t, ARRIVE, SETTLE)
    const spread = 0.19 - close * 0.04
    const reach = 0.60 - close * 0.10
    return {
      left: [-spread, 0.49 + close * 0.03, reach] as V3,
      right: [+spread, 0.49 + close * 0.03, reach] as V3,
      // Barely any. `headTilt` pushes the head sphere forward off the top of
      // the spine, and the spine already leans; at 0.04 the head sat a full
      // radius proud of the neck and read as stuck on the front of it. A
      // couple of hundredths on the catch is a nod, which is all it wants.
      headTilt: -0.005 + close * 0.02,
    }
  }
  return (
    <SeatedFigure
      hat={PARENT_HAT}
      kind="adult"
      position={[CARE_X, 0, SEAT_Z]}
      facing={Math.PI / 2}
      hipY={0.30}
      legs="kneel"
      lean={0.13}
      color={CARE_GOLD_ACT3}
      emissive={CARE_GOLD_ACT3}
      glow={1.05}
      hands={hands}
    />
  )
}

// ── The toddler: a few wobbling steps, then the tumble ───────────────

const TODDLER_S = 0.68
/**
 * His own rig.
 *
 * CHILD's half-stride of 0.12 is a walking child's, and on a body this size
 * it means a step of 0.24 rig units — about 15 cm at this scale. Crossing the
 * room takes fourteen of those, and fourteen steps in a second and a bit is
 * a scuttle. 0.16 is the step a toddler lurching across a floor actually
 * takes; it costs 5% of stretch in the leg tube at full extension, against
 * a cadence that is nearly half as fast again.
 */
const TODDLER: Proportions = { ...CHILD, STRIDE: 0.16 }
/**
 * Ground covered by one full walk cycle, in rig units.
 *
 * This is the number the whole fix turns on. `footState` swings the planted
 * foot from +STRIDE to -STRIDE during its half of the cycle, so the floor
 * only stays still under that foot if the body has moved forward by exactly
 * 2*STRIDE in the same time — 4*STRIDE for the pair of them. Anything else
 * and the feet skate, which is what they were doing: the walk ran on the
 * clock (`t / P.CYCLE`) and the body ran on an ease, and the two never had
 * any reason to agree.
 */
const PER_CYCLE = 4 * TODDLER.STRIDE
/** How many walk cycles the run-in is worth. Not a choice — a measurement. */
const CYCLES = (START_X - END_X) / (TODDLER_S * PER_CYCLE)
/**
 * The pose he arrives in: 0.5 is both feet down, one forward one back, at the
 * end of a step.
 *
 * It has to be chosen rather than left where it falls, because the phase now
 * STOPS when the walking stops — the legs hold whatever they were doing for
 * the half-second the shot runs on after the catch. A passing pose (0.25)
 * puts both feet at the same point along the walk, which from this camera —
 * side on, looking down the line he is walking — draws them on top of each
 * other and leaves him with one leg. On the plant they read as two, and a
 * toddler goes over forward from a wide foot anyway.
 */
const PHASE_ARRIVE = 0.5
/** Which means he cuts in HERE, wherever that turns out to be. */
const PHASE0 = ((PHASE_ARRIVE - CYCLES) % 1 + 1) % 1

function Toddler() {
  const posRef = useRef<THREE.Group>(null)
  const yawRef = useRef<THREE.Group>(null)
  const tumbleRef = useRef<THREE.Group>(null)
  const phase = useRef(PHASE0)

  // The pose is built from the phase the FLOOR says he is at, not from the
  // clock. `P` is ignored: GoldFigure hands over CHILD's proportions and this
  // figure is a toddler.
  const skeleton = useMemo(() => () => {
    const p = phase.current
    // Arms up for balance — the toddler signature. They were pinned at
    // y = 1.16, x = ±0.22, which is INSIDE a head that runs from 1.015 to
    // 1.385: both hands were buried in the skull and the arms read as two
    // stubs coming out of his ear. Out, up and FORWARD now — forward because
    // the camera is side-on to the walk, and a hand held straight out to the
    // side on this rig points at the lens and foreshortens to nothing. Never
    // the same on both sides: the whole point of a toddler's arms is that
    // they are not a pose.
    const s = Math.sin(p * 2 * Math.PI)
    return buildPose('walking', {
      P: TODDLER,
      phase: p,
      leftHandAt: [-0.21, 1.10 + s * 0.05, 0.19 - s * 0.04],
      rightHandAt: [+0.23, 1.05 - s * 0.05, 0.24 + s * 0.04],
    })
  }, [])

  useFrame(() => {
    const t = getAnimTime()
    // He is already walking when the shot starts and decelerates into the
    // arms; the tumble takes over from there. `smooth` used to ease him out
    // of a standstill at both ends, which on a two-second slot meant the
    // first frames were a held pose.
    const u = clamp01(t / ARRIVE)
    const walk = 1 - Math.pow(1 - u, 1.35)
    const tumble = ramp(t, ARRIVE - 0.06, SETTLE)

    // Toddlers do not walk at a constant speed — they lurch, once per step,
    // falling onto each foot and catching themselves. Derived from the
    // smooth phase and then folded back into the distance, so the cadence
    // sees the lurch too.
    const base = walk * (START_X - END_X)
    const lurch = Math.sin((base / (TODDLER_S * PER_CYCLE)) * 4 * Math.PI)
      * 0.028 * (1 - walk)
    // Nothing is added to the distance once the walking stops: the feet are
    // planted from here and the fall is a rotation about them, so any creep
    // would be a skate with nothing left to hide it.
    const dist = base + lurch

    phase.current = PHASE0 + dist / (TODDLER_S * PER_CYCLE)

    if (posRef.current) {
      posRef.current.position.x = START_X - dist
      // Side-to-side sway — one roll per cycle, because that is what it is:
      // his weight going over onto one foot and then the other.
      posRef.current.rotation.z =
        Math.sin(phase.current * 2 * Math.PI) * 0.09 * (1 - tumble)
      posRef.current.position.y = -tumble * 0.05
    }
    // The yaw the built-in walking pose would have applied, which a custom
    // skeleton does not get.
    if (yawRef.current) {
      yawRef.current.rotation.y = -Math.PI / 2
        + Math.sin(phase.current * 2 * Math.PI) * 0.04 * (1 - tumble)
    }
    if (tumbleRef.current) {
      // Pitch about the figure's own +x, which tips it along local +z — the
      // direction it is walking — so the fall goes into the waiting arms.
      // Then a small damped rock, so the half-second the shot holds after the
      // catch is a body being steadied rather than a frozen frame.
      const after = Math.max(0, t - SETTLE)
      tumbleRef.current.rotation.x = tumble * TUMBLE
        + Math.exp(-5 * after) * Math.sin(after * 13) * 0.045
    }
  })

  return (
    <group ref={posRef} position={[START_X, 0, SEAT_Z]}>
      <group ref={yawRef} rotation={[0, -Math.PI / 2, 0]} scale={TODDLER_S}>
        <group ref={tumbleRef}>
          <GoldFigure
            kind="child"
            skeleton={skeleton}
            material="goldAmber"
            glow={1.55}
            castShadow
          />
        </group>
      </group>
    </group>
  )
}

function SceneBody() {
  return (
    <>
      <color attach="background" args={[NIGHT]} />
      <fog attach="fog" args={['#160C06', 4.5, 11]} />

      {/* Daytime-ish inside: lamp low, moonlight off, ambient lifted so the
          room reads as afternoon rather than the evening of 3.3. */}
      <HanokLighting warm={0.85} moon={0} ambient={0.30} ambientColor="#6A4A28" />
      <HanokShell />
      <HanokDressing threshold={false} />

      <Caregiver />
      <Toddler />
    </>
  )
}

export default createScene({
  background: NIGHT,
  three: {
    camera: { position: [0.10, 0.80, 2.34], fov: 44, near: 0.05, far: 40 },
    gl: {
      antialias: true,
      toneMapping: THREE.ACESFilmicToneMapping,
      toneMappingExposure: 1.08,
    },
    shadows: true,
    onCreated: ({ camera }) => camera.lookAt(-0.16, 0.48, -0.30),
    debugTarget: [-0.12, 0.46, -0.3],
  },
}, function Act4_2() {
  return (
    <>
      <SceneBody />
      <EffectComposer>
        <Bloom intensity={0.6} luminanceThreshold={0.62} luminanceSmoothing={0.4} mipmapBlur />
        <Vignette eskil={false} offset={0.22} darkness={0.66} />
      </EffectComposer>
    </>
  )
})
