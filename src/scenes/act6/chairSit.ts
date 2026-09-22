/**
 * Sitting on an actual chair.
 *
 * GoldFigure's built-in `seated` pose keeps the hips at standing height
 * (HIP_Y = 0.93) and runs the shins down to the floor from there — that is a
 * bar stool, not the 0.465 m moulded seat in the waiting room. Dropping the
 * whole group by the difference isn't an option either: it puts the feet
 * through the floor.
 *
 * So this is a proper chair sit, authored against the seat height: hips just
 * above the seat pad, thighs forward and level, shins down to the vinyl,
 * hands resting on the knees. Fed to `<GoldFigure skeleton={...} />`, which
 * takes full ownership of the pose when supplied.
 */

import * as THREE from 'three'
import type { PoseGeometry, Proportions } from '../characters/goldFigure'
import { v, buildSeatedSpinePoints } from '../characters/goldFigure'

/** Top face of the chair seat pad in Act 6.1's set (metres). */
export const SEAT_TOP = 0.465

/** How far the hips ride above the seat — half the body tube, roughly. */
const HIP_LIFT = 0.10

/**
 * Half-width of the shoulder line. The trunk tube is R = 0.05, so this puts
 * the arm's outer surface about 0.165 off the spine: a shoulder, not a
 * bodybuilder. The figure is a stick everywhere else in the film and has to
 * stay one here.
 */
const SH_HALF = 0.115

/**
 * Where the leaning spine actually IS, in z, at shoulder height.
 *
 * `buildSeatedSpinePoints` carries the chest forward by `lean`, and the
 * shoulder sits at 76% of the spine's length — between its 3rd control point
 * (0.03 + 0.7·lean) and its 4th (0.02 + 0.95·lean). Interpolating gives this.
 *
 * This is the thing that was wrong. The arms started at z = 0.01 no matter
 * what the lean was — pinned to where the spine would be if he sat bolt
 * upright, i.e. 13 cm behind his own chest. Every point downstream then had
 * to sweep forward to catch up with the hands, and the two arms came out as
 * hoops thrown around the front of the body.
 */
const shoulderZ = (lean: number) => 0.023 + 0.88 * lean

export type ChairSitOptions = {
  /** Height of the seat's top face. */
  seatTop?: number
  /** Forward lean at the shoulders. 0 = upright, 0.2 = elbows-on-knees. */
  lean?: number
  /** Knees apart (metres, per side). */
  spread?: number
  /** Where the hands end up, hip-relative: 'lap' clasped, 'knees' resting. */
  hands?: 'lap' | 'knees'
  /** Amplitude of the idle breathing/shift, in metres. 0 disables it. */
  idle?: number
}

/**
 * Build a per-frame skeleton function for a figure sitting on a chair.
 * The returned pose has its origin on the floor directly under the hips, so
 * the caller positions the figure at the seat's centre, y = 0.
 */
export function chairSitSkeleton({
  seatTop = SEAT_TOP,
  lean = 0.10,
  spread = 0.13,
  hands = 'lap',
  idle = 0.006,
}: ChairSitOptions = {}) {
  return ({ P, t }: { P: Proportions; t: number; phase: number }): PoseGeometry => {
    // Breathing, plus a slow settle — waiting is never completely still.
    const breath = idle === 0 ? 0 : Math.sin(t * 1.7) * idle
    const hipY = seatTop + HIP_LIFT + breath
    const shY = hipY + (P.SHOULDER_Y - P.HIP_Y)
    const headY = hipY + (P.HEAD_Y - P.HIP_Y)
    const leanNow = lean + (idle === 0 ? 0 : Math.sin(t * 0.9 + 1.1) * idle * 3)
    const shZ = shoulderZ(leanNow)
    /** Shoulder joint: the outboard end of the yoke, where an arm hangs from. */
    const jointY = shY - 0.03

    const leg = (side: number) => {
      const hip = v(side * 0.02, hipY, 0)
      // Thigh forward and level; the knee sits just over the seat's front lip.
      const knee = v(side * spread, hipY - 0.02, 0.40)
      // Shin straight down to the floor, foot a touch forward of the knee.
      const ankle = v(side * spread * 1.1, P.FOOT_Y, 0.44)
      return [hip, hip.clone().lerp(knee, 0.5), knee, knee.clone().lerp(ankle, 0.5), ankle]
    }

    /**
     * The shoulder line.
     *
     * A stick figure has no deltoids to speak of, but it does need somewhere
     * for the arms to leave from that is not its throat. Both arms used to
     * start on the spine axis, so the upper body forked out of the neck and
     * the chest had no width at all. This is one short cross-tube — fat where
     * it crosses the spine, tapering out to the joints — and the arms hang
     * off its ends.
     */
    const yoke = {
      points: [
        v(-SH_HALF, jointY, shZ),
        v(-SH_HALF * 0.5, shY - 0.006, shZ + 0.004),
        v(0, shY, shZ + 0.006),
        v(SH_HALF * 0.5, shY - 0.006, shZ + 0.004),
        v(SH_HALF, jointY, shZ),
      ],
      // Ends at exactly the arm's radius and slimmer in the middle, where it
      // is buried in the trunk anyway. Tapering the other way left the yoke
      // tip narrower than the arm hanging off it, and buildBody caps every
      // tube end with a sphere — so each shoulder grew a little knob.
      radius: (u: number) => P.R * (0.84 + 0.16 * Math.abs(2 * u - 1)),
      segments: 14,
    }

    /**
     * Arm: down the side of the ribs to an elbow that sits BEHIND the wrist,
     * then forward onto the knee.
     *
     * The elbow breaking backwards is the whole pose. An elbow stacked
     * directly above the hand gives one straight tube with a crease in it,
     * which reads as a noodle rather than as an arm — and from a
     * three-quarter lens the crease is invisible, so it read as no joint at
     * all. Behind-the-wrist puts the forearm at a real angle to the upper arm
     * in every view.
     */
    const arm = (side: number, hand: THREE.Vector3) => {
      const sh = v(side * SH_HALF, jointY, shZ)
      const elbow = v(side * (SH_HALF + 0.022), shY - 0.30, shZ - 0.045)
      // Slight forward bow through the forearm, so it drapes onto the leg
      // instead of running dead straight at it.
      const wristward = elbow.clone().lerp(hand, 0.5)
      wristward.y -= 0.012
      wristward.z += 0.012
      return [sh, sh.clone().lerp(elbow, 0.5), elbow, wristward, hand]
    }

    const armR = (u: number) => P.R * (1.04 - 0.20 * u)

    // Hands ON the knees rather than clasped in the lap: the lap version put
    // both forearms against the thighs and the whole lower half read as one
    // mass. The knee tube's top face is (hipY - 0.02) + R, so a hand of the
    // same radius resting on it centres a further R above that.
    const kneeTopY = hipY - 0.02 + P.R * 2 + 0.005
    const handAt = hands === 'knees'
      ? [v(-spread * 0.96, kneeTopY, 0.355), v(spread * 0.96, kneeTopY, 0.355)]
      : [v(-0.075, hipY + 0.075, 0.235), v(0.075, hipY + 0.075, 0.235)]

    return {
      curves: [
        { points: buildSeatedSpinePoints(hipY, P, leanNow), radius: P.R, segments: 16 },
        yoke,
        // Slight taper out to the wrist. Barely readable at scene scale, but
        // it is what lets the arm blend into the shoulder instead of being
        // socketed into it with a bead at the joint.
        { points: arm(-1, handAt[0]), radius: armR, segments: 14 },
        { points: arm(+1, handAt[1]), radius: armR, segments: 14 },
        { points: leg(-1), radius: P.R, segments: 16 },
        { points: leg(+1), radius: P.R, segments: 16 },
      ],
      spheres: [
        // Head rides the top of the spine, which the lean has carried forward
        // too — it used to be posted at a fixed 0.03 + 0.8·lean and sat a
        // centimetre or two behind its own neck.
        { center: v(0, headY, 0.025 + leanNow * 1.05), radius: P.RH },
      ],
    }
  }
}
