/**
 * Act 4.2r — FIRST STEPS, REVERSED (~1:12, between the first measure and the
 * sickbed)
 *
 * The same room, the same camera, the same kneeling caregiver — and the child
 * walks OUT.
 *
 * 4.2 was the only beat in Act 4 with no mirror: every other pair in the act
 * has a before and an after (the persimmon goes up and comes down, the
 * sickbed changes sides, the carry inverts), and the toddler falling into
 * open arms just stood there as "the irreducible start". This is its after.
 * He walked into their arms at one; a few years later he walks past them and
 * keeps going.
 *
 * It is also Act 5's wave, years early — the same event at a distance the
 * child can still come back from. Nothing about it is sad yet, which is why
 * it plays before the sickbed rather than after the pat.
 *
 * ── What makes it read as the mirror ─────────────────────────────────
 * Everything is lifted from Act4_2.tsx and left alone: the camera pose, the
 * lighting, the caregiver's seat, the set. Only three things differ, and each
 * one is the inverse of the thing it replaces:
 *
 *   4.2                              4.2r
 *   walks in, x 0.98 → 0.00          walks out, x 0.05 → 1.22
 *   arms up for balance              arms down, swinging — he can walk now
 *   the caregiver's arms open        the caregiver's hands stay in their lap
 *
 * That last one is the beat. 4.2's open arms are what this scene refuses:
 * the caregiver starts a lift toward him and does not finish it, because
 * there is nothing to catch. Per the act's staging rule, the one being left
 * holds still and breathes — the motion belongs to the person leaving.
 *
 * TIMING: 1.7s in the cut. He clears the caregiver by 0.9s and is at the edge
 * of frame by 1.5s, so the beat survives being trimmed on either side.
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
  NIGHT, clamp01, smooth, ramp, type V3,
} from '../sets/hanok'
import { CARE_GOLD_ACT3 } from '../act5/shared'

/** He draws level with the caregiver — the last moment they could reach him. */
const PASS = 0.62

// Act4_2's seat, unchanged — this is the same person in the same spot.
const CARE_X = -0.78
const SEAT_Z = -0.30

// 4.2's walk run backwards. He starts where the toddler finished, inside the
// caregiver's reach, and ends past where the toddler began.
const START_X = 0.05
// Past the right edge, not up against it. At 1.22 he was still whole in the
// last frame of the beat, which reads as a scene that stopped rather than a
// person who left.
const END_X = 1.52

/**
 * A few years on. 4.2's toddler is at 0.68; this is 0.84 — tall enough that
 * the change is legible against the same doorframe and the same seated adult,
 * short enough that he is nowhere near the near-grown figure of 4.6.
 */
const CHILD_S = 0.84

/**
 * His rig, and the one number that makes the walk true.
 *
 * `footState` swings the planted foot from +STRIDE to -STRIDE during its half
 * of the cycle, so the floor only stays still under it if the body covers
 * 4*STRIDE per cycle. 4.2's toddler was skating because the cadence ran on
 * the clock and the body ran on an ease; this scene inherited the same rig
 * and the same failure, just less visibly — CHILD's own tempo would have him
 * take three cycles while he crosses five cycles' worth of floor.
 *
 * 0.145 rather than CHILD's 0.12 because he is a walker now: two years on
 * from 4.2 and half a metre of it is in the step. It also puts the cadence at
 * a shade over half a second a cycle, which is a child walking, not a child
 * hurrying.
 */
const WALKER: Proportions = { ...CHILD, STRIDE: 0.145 }
/** Ground covered by one full cycle, in rig units. */
const PER_CYCLE = 4 * WALKER.STRIDE
/** Where in the cycle he is when he takes the first step. */
const PHASE0 = 0.35

// ── The caregiver: a lift that does not finish ───────────────────────
function Caregiver() {
  const hands = (t: number) => {
    // Up a little as he draws level, and then stopped — not lowered, stopped.
    // A hand that comes down again has decided something; a hand that just
    // stays up has not.
    const lift = ramp(t, PASS - 0.24, PASS + 0.16)
    // Breath, and only breath. The whole scene is his motion.
    const breath = Math.sin(t * 1.9) * 0.006
    // From the lap to roughly HALF of 4.2's open-arm pose (which is y 0.49,
    // z 0.60). Half is the whole point and it has to be legible as half: at a
    // tenth of the reach the hands just sat there and the beat did not exist.
    return {
      left: [-0.14 - lift * 0.03, 0.34 + lift * 0.13 + breath, 0.22 + lift * 0.24] as V3,
      right: [+0.14 + lift * 0.03, 0.34 + lift * 0.13 + breath, 0.22 + lift * 0.24] as V3,
      // The head follows him out of frame — the one thing that does.
      headTilt: -0.005 + smooth(clamp01((t - PASS + 0.3) / 0.9)) * 0.05,
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

// ── The child: walking out, steady, not looking back ─────────────────
function Child() {
  const posRef = useRef<THREE.Group>(null)
  const yawRef = useRef<THREE.Group>(null)
  const phase = useRef(PHASE0)

  // The legs run off the ground he has covered, not off the clock. `P` is
  // ignored — GoldFigure hands over CHILD's own proportions and this is a
  // child with a longer step.
  const skeleton = useMemo(
    () => () => buildPose('walking', { P: WALKER, phase: phase.current }),
    [],
  )

  useFrame(() => {
    const t = getAnimTime()
    // The inverse of the toddler's lurch: this walk does not wobble and does
    // not ease out. It starts unhurried and is still going at the same speed
    // when the cut comes, which is the whole point of it.
    const walk = smooth(clamp01(t / 0.42)) * 0.42 + clamp01((t - 0.42) / 1.5) * 0.58
    const dist = walk * (END_X - START_X)
    phase.current = PHASE0 + dist / (CHILD_S * PER_CYCLE)

    if (posRef.current) {
      posRef.current.position.x = START_X + dist
      // A trace of sway, an order of magnitude under 4.2's — he is steady on
      // his feet now. That IS the growth the scene is reporting. On the step
      // rather than on the clock, like everything else about this walk.
      posRef.current.rotation.z = Math.sin(phase.current * 2 * Math.PI) * 0.012
    }
    // The yaw the built-in walking pose applies, which a custom skeleton
    // does not get.
    if (yawRef.current) {
      yawRef.current.rotation.y = Math.PI / 2
        + Math.sin(phase.current * 2 * Math.PI) * 0.04
    }
  })

  return (
    <group ref={posRef} position={[START_X, 0, SEAT_Z]}>
      {/* +PI/2 where 4.2 uses -PI/2: same rig, walking the other way. */}
      <group ref={yawRef} rotation={[0, Math.PI / 2, 0]} scale={CHILD_S}>
        <GoldFigure
          kind="child"
          skeleton={skeleton}
          material="goldAmber"
          glow={1.55}
          castShadow
        />
      </group>
    </group>
  )
}

function SceneBody() {
  return (
    <>
      <color attach="background" args={[NIGHT]} />
      <fog attach="fog" args={['#160C06', 4.5, 11]} />

      {/* Identical to 4.2. The room is the control in this experiment — if it
          changed, the audience would read the difference as the room and not
          as the child. */}
      <HanokLighting warm={0.85} moon={0} ambient={0.30} ambientColor="#6A4A28" />
      <HanokShell />
      <HanokDressing threshold={false} />

      <Caregiver />
      <Child />
    </>
  )
}

export default createScene({
  background: NIGHT,
  three: {
    // 4.2's camera, to the digit.
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
}, function Act4_2r() {
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
