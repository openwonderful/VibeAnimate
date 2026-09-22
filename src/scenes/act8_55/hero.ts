/**
 * The hero — the one person in this world drawn as a person.
 *
 * He is a stick figure and always has been; the crowd around him are capsule
 * silhouettes. This module is the single definition of his body, shared by Act
 * 7 (where he walks the road home) and Act 8.55 (where he stands on it and
 * sings), so the frame Act 7 ends on and the frame 8.55 opens on contain the
 * same figure in the same pose rather than two that merely resemble each other.
 */
import { ADULT, buildPose, type PoseGeometry } from '../characters/goldFigure'

/**
 * Stride is lengthened well past the `ADULT` default of 0.18. At the default he
 * covers 4·STRIDE = 0.72 units per walk cycle, so crossing Act 7's 46 units in
 * 31s would take ~4 steps a second — a scurry. At 0.42 the cadence lands near
 * 1.75 steps/s with an ~0.8-unit step, which for a 1.89-unit-tall figure is a
 * human walk.
 */
export const HERO_PROPS = { ...ADULT, STRIDE: 0.42, FOOT_LIFT: 0.16 }
export const HERO_UNITS_PER_CYCLE = 4 * HERO_PROPS.STRIDE
/** Chin carried a little forward, walking or singing. */
export const HERO_HEAD_TILT = 0.04

/**
 * @param motion 0 = standing still (8.55's singer), 1 = full stride (Act 7).
 * @param phase  walk-cycle phase in [0,1); Act 7 drives it from distance
 *               travelled so his feet stay planted instead of skating.
 *
 * Standing is the walk with the stride closed rather than a separate pose, so
 * arriving is one continuous motion — and so `motion = 0` here is bit-for-bit
 * what 8.55 renders.
 */
export function heroSkeleton(
  motion: number,
  phase: number,
  rightHandAt?: [number, number, number],
): PoseGeometry {
  const m = Math.min(1, Math.max(0, motion))
  const P = {
    ...HERO_PROPS,
    // Floored rather than zeroed: the walking pose derives arm swing by
    // dividing by STRIDE, and 0/0 would put NaN into the geometry.
    STRIDE: Math.max(0.02, HERO_PROPS.STRIDE * m),
    FOOT_LIFT: HERO_PROPS.FOOT_LIFT * m,
  }
  return buildPose('walking', {
    P,
    phase: m > 0.02 ? phase : 0,
    headForwardTilt: HERO_HEAD_TILT,
    rightHandAt,
  })
}

/** Where his right hand sits when he isn't reaching (from `buildArmPoints`). */
export const HERO_REST_HAND: [number, number, number] = [0.085, ADULT.SHOULDER_Y - 0.55, 0]
