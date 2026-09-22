/**
 * Act 4.7 — PERSIMMON HAND-DOWN (~1:21, the "After" of 4.3)
 *
 * Same yard, same tree, same camera. The child is grown and reaches the high
 * branch on their own; the caregiver is shorter now, and reaches *up* to
 * receive what is handed down.
 *
 * The stone wall behind carries eight hash marks instead of two, the top one
 * well above the caregiver's head. That wall is the only thing in the shot
 * that says how many years passed, and it says it without a caption.
 *
 * ── What the beat actually is ────────────────────────────────────────
 * A persimmon that is ON THE TREE from the first frame, an arm that goes up
 * and takes it, and two hands waiting to be given it. The version this
 * replaces had the fruit spring into existence at the moment of the pick
 * (`visible = pluck > 0.5`), which reads as a prop being spawned rather than
 * a thing being picked — and it started with the hand already at the branch,
 * so there was no reach in the shot at all, only a lowering.
 *
 * Both hand targets are ONE POINT IN THE YARD expressed in each figure's own
 * frame (`toLocal` below). They used to be two hand-typed triples that had
 * drifted apart: the child was handing down to a point 0.26 above and 0.35
 * in front of where the caregiver's hands were, and reaching 125% of an arm
 * length to get there. Nothing met anything.
 *
 * TIMING: 1.7s — up and closed on the fruit by 0.76, down and delivered by
 * 1.36, the caregiver's hands closed by 1.50, held from there.
 */

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import * as THREE from 'three'

import { createScene } from '../createScene'
import { getAnimTime } from '../../hooks/useAnimTime'
import { GoldFigure } from '../characters/goldFigure'
import { PARENT_HAT } from '../actB/valley'
import { smooth, clamp01, ramp, mix3, type V3 } from '../sets/hanok'
import { PersimmonTree, StoneWall, YardGround, TREE_POS, CAMERA } from './yard'
import { CARE_GOLD_47 } from '../act5/shared'

const CHILD_X = 0.46
const CHILD_Z = -0.80
const CHILD_YAW = -0.62
const CARE_X = -0.34
const CARE_Z = -0.60
const CARE_YAW = 0.55
const CARE_SCALE = 0.86

/** A point in the yard, in a figure's own units — the inverse of the
 *  `position` / `rotation-y` / `scale` its group is mounted with. */
function toLocal(p: V3, at: [number, number, number], yaw: number, scale: number): V3 {
  const dx = p[0] - at[0]
  const dz = p[2] - at[2]
  const c = Math.cos(yaw)
  const s = Math.sin(yaw)
  return [(dx * c - dz * s) / scale, (p[1] - at[1]) / scale, (dx * s + dz * c) / scale]
}

const CHILD_AT: [number, number, number] = [CHILD_X, 0, CHILD_Z]
const CARE_AT: [number, number, number] = [CARE_X, 0, CARE_Z]

/**
 * The fruit, hanging where it has hung all season.
 *
 * Inside the canopy the tree already draws (0.71 out from the trunk, 1.88
 * up, well within the band `PersimmonTree` scatters its own sixteen through)
 * so it reads as one of them rather than as a prop parked in mid-air — and
 * BEHIND the hand from this camera, which is the shape of the note: the hand
 * comes up in front of it and closes.
 *
 * How high it hangs is set by the arm, not by the tree. This rig's arm is
 * 0.55 against a 1.89 body, so the highest a standing figure can put a hand
 * is about 2.02 — a hand's width over its own head. Any fruit above that and
 * the elbow locks straight for the whole reach, which is the shape the note
 * about the arm is complaining about. This one sits where the hand arrives
 * at 94% of full extension: over the head, still bent.
 */
const FRUIT_TREE: V3 = [0.6135, 1.88, -0.5675]
/** Where a picked persimmon sits relative to the hand holding it. */
const IN_HAND: V3 = [0.010, -0.052, 0.030]
/**
 * Where the two of them meet. Halfway between their shoulders and a little
 * above the caregiver's, so the older one is reaching UP to receive — which
 * is the whole inversion this beat exists to state.
 */
const MEET: V3 = [0.075, 1.33, -0.691]

const add = (a: V3, b: V3, k = 1): V3 => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k]

/** The fruit is drawn inside his group, so everything about it is his units. */
const FRUIT_LOCAL = toLocal(FRUIT_TREE, CHILD_AT, CHILD_YAW, 1)
/** Where his hand has to be for the fruit to end up in it. */
const BRANCH = add(FRUIT_LOCAL, IN_HAND, -1)
const HANDOFF = toLocal(MEET, CHILD_AT, CHILD_YAW, 1)
/** …and where the fruit sits once it is hers, still in his frame. */
const HANDOFF_FRUIT = add(HANDOFF, IN_HAND)
const CARE_TAKE = toLocal(MEET, CARE_AT, CARE_YAW, CARE_SCALE)
/** The hand he starts with: hanging at his side, where `standing` puts it. */
const REST: V3 = [0.105, 0.92, 0.03]

/* Beats, in seconds of local time. */
const REACH_T = 0.62    // hand arrives at the fruit
const GRASP_0 = 0.56    // fingers closing
const GRASP_1 = 0.78    // the fruit is his
const DOWN_0 = 0.82
const DOWN_1 = 1.36     // it arrives in the waiting hands
const GIVEN_0 = 1.38    // the caregiver has it; his hand can go
const GIVEN_1 = 1.56

function Pair() {
  const childHand = useRef<V3>(REST)
  const fruitRef = useRef<THREE.Mesh>(null)
  const careL = useRef<V3>([0, 0, 0])
  const careR = useRef<V3>([0, 0, 0])
  const careMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: CARE_GOLD_47, emissive: CARE_GOLD_47,
    emissiveIntensity: 0.85, roughness: 0.6,
  }), [])

  useFrame(() => {
    const t = getAnimTime()

    // ── His arm ──────────────────────────────────────────────────────
    // Up to the fruit, leading with the hand: the rise carries an outward,
    // forward bulge through the middle of it, so the hand takes the long way
    // round and the elbow follows it up rather than the whole arm swinging
    // as one piece. (The elbow itself is solved — see `solvedArms`.)
    const up = smooth(clamp01(t / REACH_T))
    const arc = Math.sin(up * Math.PI)
    const rise = mix3(REST, BRANCH, up)
    const reached: V3 = [rise[0] + arc * 0.07, rise[1] - arc * 0.03, rise[2] + arc * 0.11]

    const down = ramp(t, DOWN_0, DOWN_1)
    const given = ramp(t, GIVEN_0, GIVEN_1)
    const h = mix3(reached, HANDOFF, down)
    // Once it is hers he takes his hand back — not all the way, just enough
    // that two hands are no longer holding one persimmon.
    childHand.current = mix3(h, [h[0] + 0.10, h[1] - 0.06, h[2] - 0.09], given)

    // ── The fruit ────────────────────────────────────────────────────
    // On the branch, then in his hand, then hers. It is never not somewhere.
    if (fruitRef.current) {
      const held = smooth(clamp01((t - GRASP_0) / (GRASP_1 - GRASP_0)))
      const inHand: V3 = [
        childHand.current[0] + IN_HAND[0],
        childHand.current[1] + IN_HAND[1],
        childHand.current[2] + IN_HAND[2],
      ]
      const p = mix3(mix3(FRUIT_LOCAL, inHand, held), HANDOFF_FRUIT, given)
      fruitRef.current.position.set(p[0], p[1], p[2])
    }

    // ── Her hands ────────────────────────────────────────────────────
    // Up and waiting from the first frame, and still: the one being given to
    // holds position and breathes. They close on receipt.
    const close = ramp(t, DOWN_1 - 0.10, DOWN_1 + 0.14)
    const breath = Math.sin(t * 1.7) * 0.006
    careR.current = [
      CARE_TAKE[0] - close * 0.03,
      CARE_TAKE[1] + close * 0.02 + breath,
      CARE_TAKE[2] + close * 0.03,
    ]
    careL.current = [
      CARE_TAKE[0] - 0.17 + close * 0.05,
      CARE_TAKE[1] - 0.09 + breath,
      CARE_TAKE[2] + 0.05 + close * 0.02,
    ]
  })

  return (
    <>
      {/* Grown child — full height, full brightness, does the reaching now. */}
      <group position={CHILD_AT} rotation={[0, CHILD_YAW, 0]}>
        <GoldFigure
          pose="standing"
          material="goldAmber"
          glow={1.5}
          castShadow
          solvedArms
          rightHandAt={childHand}
        />
        <mesh ref={fruitRef} castShadow position={FRUIT_LOCAL}>
          <sphereGeometry args={[0.062, 12, 10]} />
          <meshStandardMaterial
            color="#D2601C" emissive="#8A2E08" emissiveIntensity={0.7} roughness={0.7}
          />
        </mesh>
      </group>

      {/* Caregiver — shorter, dimmer, receiving, with both hands. */}
      <group position={CARE_AT} rotation={[0, CARE_YAW, 0]} scale={CARE_SCALE}>
        <GoldFigure
          pose="standing"
          material={careMat}
          solvedArms
          leftHandAt={careL}
          rightHandAt={careR}
          castShadow
          hat={PARENT_HAT}
          hatTilt={-0.4}
        />
      </group>
    </>
  )
}

export default createScene({
  background: '#1A1220',
  three: {
    camera: { position: CAMERA.position, fov: CAMERA.fov, near: 0.05, far: 120 },
    gl: {
      antialias: true,
      toneMapping: THREE.ACESFilmicToneMapping,
      toneMappingExposure: 1.06,
    },
    shadows: true,
    onCreated: ({ camera }) => camera.lookAt(...CAMERA.target),
    debugTarget: CAMERA.target,
  },
}, function Act4_7() {
  return (
    <>
      <color attach="background" args={['#1A1220']} />
      <fog attach="fog" args={['#332A30', 14, 40]} />

      {/* Later in the year and later in the day than 4.3 — the same key light,
          lower and cooler, so the yard reads as the same place, older. */}
      <ambientLight color="#5E4C3E" intensity={0.66} />
      <directionalLight
        position={[6, 2.6, -8]} color="#E09250" intensity={2.1}
        castShadow
        shadow-mapSize-width={1024} shadow-mapSize-height={1024}
        shadow-camera-left={-6} shadow-camera-right={6}
        shadow-camera-top={6} shadow-camera-bottom={-2}
        shadow-bias={-0.0008}
      />
      <directionalLight position={[-4, 5, 6]} color="#66739E" intensity={0.55} />

      <YardGround skyTop="#2E2440" skyLow="#9E5A3A" />
      <StoneWall marks={8} />
      <PersimmonTree position={TREE_POS} />
      <Pair />

      <EffectComposer>
        <Bloom intensity={0.55} luminanceThreshold={0.68} luminanceSmoothing={0.4} mipmapBlur />
        <Vignette eskil={false} offset={0.24} darkness={0.62} />
      </EffectComposer>
    </>
  )
})
