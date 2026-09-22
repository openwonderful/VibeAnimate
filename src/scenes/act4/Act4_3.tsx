/**
 * Act 4.3 — PERSIMMON LIFT (~1:16, "Before")
 *
 * The caregiver lifts the toddler up under the tree and the child's fingers
 * close on a persimmon.
 *
 * ── Where this happens ───────────────────────────────────────────────
 * In Act B's valley, under Act B's tree — not in a set built for this beat.
 * The previous version had its own yard: a stone wall, a persimmon made of a
 * cylinder and three spheres, a horizon of cones and a sky painted on a plane.
 * It was fine in isolation and obviously a different film the moment it played
 * next to Act B. Now the ground, the ridge, the fog, the sun and the tree are
 * literally the same objects Act B flies through, mounted still at golden hour
 * (`ValleyStill at={65}` — Act 3.1's light, low sun sitting in the pass).
 *
 * Everything here is therefore in WORLD units, where an adult is 20 units to
 * the shoulder and the tree is 120 tall. That is why every number in this file
 * is two orders of magnitude larger than it used to be.
 *
 * The tree is cropped deliberately. You see the trunk, the root flare and one
 * fruited limb coming in over their heads, and the crown is out of frame — a
 * tree you can see all of is a shrub, and this one has to feel worth reaching
 * for.
 *
 * The camera sits down-valley looking back toward the pass, so the low sun is
 * behind the tree and the two of them are rim-lit. It also puts the road, and
 * Act B's own two figures walking up it, safely behind the lens.
 *
 * Pairs with 4.7, which is the same tree, the same camera and the same light,
 * with the reach inverted.
 */

import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import * as THREE from 'three'

import { createScene } from '../createScene'
import { getAnimTime } from '../../hooks/useAnimTime'
import { GoldFigure, v, type Proportions } from '../characters/goldFigure'
import { PARENT_HAT } from '../actB/valley'
import { smooth, clamp01 } from '../sets/hanok'
import { ValleyStill } from '../actB/still'
import { Tree } from '../actB/tree'
import {
  LIFT_CAMERA, TREE_ANCHOR, GOLDEN_HOUR, PAIR_POS, LowBranch, TreeGrass,
} from './valleyTree'
import { CARE_GOLD_43 } from '../act5/shared'

/**
 * A child being carried: knees drawn up and forward, shins folded back under,
 * both arms straight overhead.
 *
 * The old version held the toddler at full arm's extension above the
 * caregiver's head with the legs hanging straight down — an overhead press,
 * not a lift. It read as cold, it put the child's whole body a metre clear of
 * anyone, and the two figures shared no contact at all. Here the child's hips
 * ride at the caregiver's shoulder line and the tucked legs bracket their
 * head, so the two of them are one shape: the thing a lift actually looks
 * like, and close enough that the reach above is theirs together.
 *
 * Authored with the hips at the origin — the caller places the group at the
 * hold point, rather than this trying to know how tall the caregiver is.
 */
/** Last-built local hand point, so the fruit can be placed exactly on it
 *  instead of by eye. Written every frame, read by the probe below. */
const CHILD_HAND = { x: 0, y: 0, z: 0 }

function heldSkeleton({ P }: { P: Proportions }) {
  const R = P.R
  const legLen = P.HIP_Y - P.FOOT_Y
  const armLen = (P.SHOULDER_Y - P.HIP_Y) * 1.06
  const torso = P.SHOULDER_Y - P.HIP_Y
  const neck = P.HEAD_Y - P.SHOULDER_Y

  const hip = v(0, 0, 0)
  // Upright and stretched — a child reaching is longer than a child standing.
  const shoulder = v(0, torso * 1.02, 0.015 * torso)
  const head = v(0, shoulder.y + neck * 0.94, shoulder.z + neck * 0.10)

  const spine = [
    hip,
    v(0, torso * 0.35, torso * 0.012),
    v(0, torso * 0.70, torso * 0.02),
    shoulder,
  ]

  /**
   * Hanging down and a little apart, knees soft.
   *
   * This is the number the whole beat turned on. The original held the child
   * so high that their feet were clear above the caregiver's head and the two
   * bodies never met — an overhead press with a prop. Dropping the child to
   * the shoulder line instead put their torso directly behind the caregiver's
   * head, which is anatomically what a shoulder-ride looks like and, in
   * silhouette, in one gold tone, at one second, is an unreadable blob.
   *
   * So: held clear above the head, but only just, with the legs long enough to
   * come all the way down to the shoulders they are being lifted from. The
   * child is fully legible against the sky and the two of them are still
   * plainly touching.
   */
  const leg = (s: number) => {
    const knee = v(
      hip.x + s * legLen * 0.24,
      hip.y - legLen * 0.50,
      hip.z + legLen * 0.12,
    )
    const foot = v(
      knee.x + s * legLen * 0.10,
      knee.y - legLen * 0.46,
      knee.z - legLen * 0.06,
    )
    return [hip, hip.clone().lerp(knee, 0.5), knee, knee.clone().lerp(foot, 0.5), foot]
  }

  /** Both arms straight up. The reach is the whole point of the beat. */
  const arm = (s: number) => {
    const elbow = v(
      shoulder.x + s * armLen * 0.28,
      shoulder.y + armLen * 0.46,
      shoulder.z + armLen * 0.06,
    )
    const hand = v(
      elbow.x + s * armLen * 0.10,
      elbow.y + armLen * 0.54,
      elbow.z + armLen * 0.12,
    )
    if (s > 0) { CHILD_HAND.x = hand.x; CHILD_HAND.y = hand.y; CHILD_HAND.z = hand.z }
    return [shoulder, shoulder.clone().lerp(elbow, 0.5), elbow, elbow.clone().lerp(hand, 0.5), hand]
  }

  return {
    curves: [
      { points: spine, radius: R, segments: 14 },
      { points: arm(-1), radius: R * 0.88, segments: 14 },
      { points: arm(+1), radius: R * 0.88, segments: 14 },
      { points: leg(-1), radius: R, segments: 14 },
      { points: leg(+1), radius: R, segments: 14 },
    ],
    spheres: [{ center: head, radius: P.RH }],
  }
}

/**
 * The caregiver, braced under the weight: feet planted apart, knees soft,
 * chest open, both arms straight up, chin lifted to watch the child.
 *
 * `pose="standing"` cannot do this. Its legs come down together and its arms
 * hang, so with the hands driven overhead by IK the whole figure rendered as a
 * single gold column with a head on it — no stance, no separation between the
 * limbs, nothing that reads as effort. Lifting a child off the ground is a
 * whole-body action and the body has to show it.
 *
 * `hold` is the hand height in figure units, passed per frame.
 */
function liftingSkeleton(hold: number, holdX: number) {
  return ({ P }: { P: Proportions }) => {
    const R = P.R
    const legLen = P.HIP_Y - P.FOOT_Y
    const armLen = (P.SHOULDER_Y - P.HIP_Y) * 1.34
    const torso = P.SHOULDER_Y - P.HIP_Y
    const neck = P.HEAD_Y - P.SHOULDER_Y

    const hip = v(0, P.HIP_Y * 0.96, 0)
    // Leaning back a few degrees against the load, which is also what opens a
    // gap between the torso and the arms.
    const shoulder = v(0, hip.y + torso * 0.98, -torso * 0.13)
    const head = v(0, shoulder.y + neck * 0.92, shoulder.z - neck * 0.30)

    const spine = [
      hip,
      v(0, hip.y + torso * 0.34, -torso * 0.03),
      v(0, hip.y + torso * 0.68, -torso * 0.08),
      shoulder,
    ]

    /** Planted wide, knee pushed out and forward. */
    const leg = (s: number) => {
      const knee = v(
        s * legLen * 0.20,
        hip.y - legLen * 0.48,
        legLen * 0.10,
      )
      const foot = v(
        s * legLen * 0.28,
        P.FOOT_Y,
        -legLen * 0.04,
      )
      return [hip, hip.clone().lerp(knee, 0.5), knee, knee.clone().lerp(foot, 0.5), foot]
    }

    /**
     * Up and forward to hold the child's shins against the chest — which is
     * where the hands of anyone carrying a kid on their shoulders actually
     * are. Reaching overhead instead would hide the child behind two arms.
     */
    const arm = (s: number) => {
      const hand = v(holdX + s * 0.17, hold, 0.14)
      const elbow = v(
        holdX * 0.55 + s * (armLen * 0.34),
        shoulder.y + (hand.y - shoulder.y) * 0.40,
        shoulder.z + armLen * 0.10,
      )
      return [shoulder, shoulder.clone().lerp(elbow, 0.5), elbow, elbow.clone().lerp(hand, 0.5), hand]
    }

    return {
      curves: [
        { points: spine, radius: R, segments: 14 },
        { points: arm(-1), radius: R * 0.9, segments: 14 },
        { points: arm(+1), radius: R * 0.9, segments: 14 },
        { points: leg(-1), radius: R, segments: 14 },
        { points: leg(+1), radius: R, segments: 14 },
      ],
      spheres: [{ center: head, radius: P.RH }],
    }
  }
}

/**
 * How far to the caregiver's side the child is held.
 *
 * Directly overhead is where a lift naturally goes and it is the one place it
 * cannot be: from the front the child sits exactly on the caregiver's head, in
 * the same gold, and the pair renders as one tapering spike. Held out to the
 * side, the child is silhouetted against open sky with clear air between the
 * two heads — and it is what anyone lifting a toddler toward something
 * actually does, because you have to be able to see them.
 */
const HOLD_X = -0.46

/** Adult and child, in world units, under the tree. */
function Lift() {
  const childRef = useRef<THREE.Group>(null)
  const holdRef = useRef(1.43)
  // Read at call time, so the arms follow the lift without the skeleton
  // being rebuilt as a new function identity every frame — the way 8.55
  // drives its hero's reach.
  const carrier = useMemo(
    () => (args: { P: Proportions }) => liftingSkeleton(holdRef.current, HOLD_X)(args),
    [],
  )
  const careMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: CARE_GOLD_43, emissive: CARE_GOLD_43,
    emissiveIntensity: 1.0, roughness: 0.6,
  }), [])
  useEffect(() => () => careMat.dispose(), [careMat])

  useFrame(() => {
    const t = getAnimTime()
    // Already half-raised at t=0: a lift begun from the ground would still be
    // at waist height when a one-second beat ran out. The last of the rise
    // lands the fingers on the fruit at ~0.81s, which is the frame this
    // scene exists for — scaled with the slot (1.7s → 2.5s) so the reach
    // still lands a third of the way in and the hold after it is the beat,
    // rather than the rise staying quick and the hold absorbing everything.
    const lift = 0.42 + smooth(clamp01(t / 0.81)) * 0.58

    // Two heights, in ADULT-local units: where the child's seat is, and where
    // the caregiver's hands are holding their shins. Both derive from `lift`,
    // so the pair can never drift apart mid-move.
    // The child's hips ride just clear of the caregiver's crown; the hands
    // grip their thighs a little below that.
    const seat = 1.80 + lift * 0.20
    holdRef.current = seat - 0.16

    if (childRef.current) {
      childRef.current.position.y = seat
      childRef.current.updateWorldMatrix(true, false)
      const w = new THREE.Vector3(CHILD_HAND.x, CHILD_HAND.y, CHILD_HAND.z)
        .applyMatrix4(childRef.current.matrixWorld)
      ;(window as unknown as { __hand: number[] }).__hand =
        [+w.x.toFixed(1), +w.y.toFixed(1), +w.z.toFixed(1)]
      // A kick of delight once they are up there.
      childRef.current.rotation.z = Math.sin(t * 9) * 0.04 * lift
    }
  })

  return (
    // Turned three-quarters to the lens. Square-on, the braced stance is two
    // legs behind each other and the arms are hidden by the torso; from here
    // every limb has its own silhouette.
    <group position={PAIR_POS} rotation={[0, 0.26, 0]} scale={20}>
      {/* Level. Tipped back at -0.5 the brim came round INTO the lens and
          swallowed the head whole — the parent read as a lampshade on legs.
          This figure is three-quartered away, so level is what shows the
          head under it. */}
      <GoldFigure material={careMat} skeleton={carrier} castShadow
        hat={PARENT_HAT} />
      {/* The toddler, riding the caregiver's shoulder line, reaching up. */}
      <group ref={childRef} position={[HOLD_X, 1.52, 0.06]} scale={0.72}>
        <GoldFigure
          kind="child"
          material="goldAmber"
          glow={1.6}
          castShadow
          skeleton={heldSkeleton}
        />
      </group>
    </group>
  )
}

export default createScene({
  background: '#0B1020',
  three: {
    camera: {
      position: LIFT_CAMERA.position,
      fov: LIFT_CAMERA.fov,
      // Act B's world is kilometres deep; the ridge behind the valley is the
      // only thing that says which valley this is, so the far plane has to
      // clear all of it.
      near: 1,
      far: 24000,
    },
    gl: {
      antialias: true,
      toneMapping: THREE.ACESFilmicToneMapping,
      toneMappingExposure: 1.06,
    },
    shadows: true,
    onCreated: ({ camera }) => camera.lookAt(...LIFT_CAMERA.target),
    debugTarget: LIFT_CAMERA.target,
  },
}, function Act4_3() {
  return (
    <>
      <ValleyStill at={GOLDEN_HOUR} night={false} />

      {/* Act B's tree, cropped. Its own group in World.tsx also carries the
          two of them sitting under it at night; this is the tree alone. */}
      <group position={TREE_ANCHOR} rotation={[0, 1.9, 0]}>
        <Tree />
      </group>
      <TreeGrass />
      <LowBranch />

      <Lift />

      <EffectComposer>
        <Bloom intensity={0.6} luminanceThreshold={0.6} luminanceSmoothing={0.5} mipmapBlur />
        <Vignette eskil={false} offset={0.24} darkness={0.6} />
      </EffectComposer>
    </>
  )
})
