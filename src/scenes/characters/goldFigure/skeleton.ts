import * as THREE from 'three'
import { v } from './buildBody'
import { type Proportions } from './proportions'

export type FootState = { y: number; z: number; bend: number }

/** Walk-cycle foot position and knee bend at phase p. Wraps to [0..1)
 *  itself: callers that accumulate phase with distance (4.2's toddler,
 *  4.2r's walker) hand in 3.7 and expect step four, not a foot planted
 *  eleven stride-lengths behind the hip — which is exactly what the
 *  unwrapped `STRIDE * (2t - 1)` used to draw. */
export function footState(p: number, P: Proportions): FootState {
  p = p - Math.floor(p)
  if (p < 0.5) {
    const t = p / 0.5
    return { y: P.FOOT_Y, z: P.STRIDE * (1 - 2 * t), bend: 0.05 + 0.10 * Math.sin(t * Math.PI) }
  }
  const t = (p - 0.5) / 0.5
  return {
    y: P.FOOT_Y + P.FOOT_LIFT * Math.sin(t * Math.PI),
    z: P.STRIDE * (2 * t - 1),
    bend: 0.7 * Math.sin(t * Math.PI),
  }
}

export function buildLegPoints(hipX: number, foot: FootState, hipY: number): THREE.Vector3[] {
  const hip = v(hipX, hipY, 0)
  const ankle = v(hipX * 4, foot.y, foot.z)
  const mid = hip.clone().lerp(ankle, 0.5)
  mid.z += 0.18 * foot.bend
  mid.y += 0.04 * foot.bend
  return [
    hip,
    hip.clone().lerp(mid, 0.5),
    mid,
    mid.clone().lerp(ankle, 0.5),
    ankle,
  ]
}

/**
 * Legs straight down (idle standing, feet slightly apart).
 *
 * `spread` opens the stance by moving the ANKLE outward and leaving the hip
 * where it is, so the leg splays down its length rather than the whole body
 * widening. Default 0 = the idle stance, ankles at ±0.032 — all but touching,
 * which is right for a figure standing at rest and wrong under a pair of
 * raised arms, where it reads as attention rather than celebration.
 */
export function buildStandingLegPoints(
  hipX: number, hipY: number, P: Proportions, spread = 0,
): THREE.Vector3[] {
  const hip = v(hipX, hipY, 0)
  const ankle = v(hipX * 1.6 + Math.sign(hipX) * spread, P.FOOT_Y, 0)
  return [
    hip,
    hip.clone().lerp(ankle, 0.33),
    hip.clone().lerp(ankle, 0.5),
    hip.clone().lerp(ankle, 0.67),
    ankle,
  ]
}

/**
 * Seated-drape (legs hang apart, as when riding on shoulders). Kept from the
 * original GoldGlowFigure for backwards compat.
 */
export function buildSeatedDrapeLegPoints(hipX: number, hipY: number): THREE.Vector3[] {
  const hip = v(hipX, hipY, 0)
  const side = hipX > 0 ? 1 : -1
  const knee = v(side * 0.32, hipY - 0.10, 0.18)
  const ankle = v(side * 0.34, hipY - 0.46, 0.22)
  return [
    hip,
    hip.clone().lerp(knee, 0.5),
    knee,
    knee.clone().lerp(ankle, 0.5),
    ankle,
  ]
}

/**
 * Sitting-on-floor pose: knees up and forward, shins down to ankles on floor.
 * Used for figures seated cross-legged or kneeling around a low table.
 */
export function buildSeatedFloorLegPoints(hipX: number, hipY: number, P: Proportions): THREE.Vector3[] {
  const hip = v(hipX, hipY, 0)
  const side = hipX > 0 ? 1 : -1
  // Knee forward and slightly outward, at mid-height.
  const knee = v(side * 0.14, hipY - 0.05, 0.30)
  // Ankle forward and down on the floor.
  const ankle = v(side * 0.18, P.FOOT_Y, 0.52)
  return [
    hip,
    hip.clone().lerp(knee, 0.5),
    knee,
    knee.clone().lerp(ankle, 0.5),
    ankle,
  ]
}

export function buildArmPoints(shX: number, swingZ: number, shY: number, P: Proportions): THREE.Vector3[] {
  const sh = v(shX, shY, 0.01)
  const armSpan = P.ARM_SPAN
  const armLen = P.ARM
  const outX = shX > 0 ? armSpan : -armSpan
  const elbow = v(outX, shY - armLen * 0.49, swingZ * 0.08)
  const hand = v(outX * 0.85, shY - armLen, swingZ * 0.22)
  return [
    sh,
    sh.clone().lerp(elbow, 0.4),
    elbow,
    elbow.clone().lerp(hand, 0.5),
    hand,
  ]
}

/**
 * Arm whose hand is pinned to a fixed local target (for hand-holding,
 * reaching, etc). Elbow is the shoulder→hand midpoint, nudged outward and
 * slightly forward so the arm reads as naturally bent.
 */
export function buildPinnedArmPoints(shX: number, shY: number, handAt: THREE.Vector3): THREE.Vector3[] {
  const sh = v(shX, shY, 0.01)
  const hand = handAt.clone()
  const mid = sh.clone().lerp(hand, 0.5)
  const side = shX > 0 ? 1 : -1
  mid.x += side * 0.05
  mid.z += 0.03
  mid.y -= 0.01
  return [
    sh,
    sh.clone().lerp(mid, 0.45),
    mid,
    mid.clone().lerp(hand, 0.5),
    hand,
  ]
}

/**
 * The same pinned arm, SOLVED rather than interpolated.
 *
 * `buildPinnedArmPoints` puts the elbow on the shoulder→hand line and nudges
 * it a few centimetres sideways, which means the elbow is wherever the hand
 * is — the whole limb swings as one rigid unit and the bones stretch and
 * shrink to suit. It is fine for a hand that barely leaves the body, and it
 * is exactly what a reach overhead must not look like: a person reaching up
 * for something they can see leads with the HAND, and the elbow trails and
 * rotates out from under it.
 *
 * So: two bones of fixed length, and the elbow placed on the circle of
 * solutions the way a shoulder actually resolves it — hanging down and out
 * from the plane the arm is working in. Overhead that puts the elbow out to
 * the side and a little behind; reaching forward it drops under the hand;
 * at rest the arm goes straight, which is the same silhouette the old code
 * gave, so nothing that only ever pinned a hand near the hip changes.
 *
 * Out of reach, the arm straightens and points — the tube stretches, exactly
 * as before. A pose that needs a target it cannot reach has a pose problem,
 * and it should look like one rather than be silently hidden by a bend.
 */
export function buildSolvedArmPoints(
  shX: number,
  shY: number,
  handAt: THREE.Vector3,
  P: Proportions,
  shZ = 0.01,
): THREE.Vector3[] {
  const sh = v(shX, shY, shZ)
  const hand = handAt.clone()
  const armLen = P.ARM
  const bone = armLen * 0.5

  const to = hand.clone().sub(sh)
  const d = to.length()
  const dir = to.clone().divideScalar(Math.max(d, 1e-6))

  // Half the span along the arm, and how far off it the elbow sits. Equal
  // bones put the elbow at the midpoint; `out` is 0 at full extension and
  // grows as the hand comes in.
  const along = d / 2
  const out = Math.sqrt(Math.max(0, bone * bone - along * along))

  const elbow = sh.clone().addScaledVector(dir, along)
  if (out > 1e-4) {
    // Where the elbow prefers to be: down, out to its own side, and a little
    // behind. Projected off the arm's direction, this is what makes the
    // elbow trail the hand instead of orbiting with it.
    const side = shX > 0 ? 1 : -1
    const swivel = v(side * 0.42, -1, -0.22).normalize()
    swivel.addScaledVector(dir, -swivel.dot(dir))
    if (swivel.lengthSq() < 1e-6) swivel.set(side, 0, -0.2)
    elbow.addScaledVector(swivel.normalize(), out)
  }

  return [
    sh,
    sh.clone().lerp(elbow, 0.5),
    elbow,
    elbow.clone().lerp(hand, 0.5),
    hand,
  ]
}

/** Arm resting at side (idle standing). */
export function buildRestingArmPoints(shX: number, shY: number, P: Proportions): THREE.Vector3[] {
  const sh = v(shX, shY, 0.01)
  const armLen = P.ARM
  const outX = shX > 0 ? 0.11 : -0.11
  const elbow = v(outX, shY - armLen * 0.5, 0.0)
  const hand = v(outX * 0.95, shY - armLen, 0.01)
  return [
    sh,
    sh.clone().lerp(elbow, 0.4),
    elbow,
    elbow.clone().lerp(hand, 0.5),
    hand,
  ]
}

export function buildSpinePoints(hipY: number, P: Proportions): THREE.Vector3[] {
  const len = P.SHOULDER_Y - P.HIP_Y + 0.17
  return [
    v(0, hipY, 0),
    v(0, hipY + len * 0.25, 0.02),
    v(0, hipY + len * 0.56, 0.03),
    v(0, hipY + len * 0.84, 0.02),
    v(0, hipY + len, 0.02),
  ]
}

/**
 * Curved, forward-leaning spine for seated figures — spine bends forward
 * from the hips as if leaning toward a low table or bowl.
 */
export function buildSeatedSpinePoints(hipY: number, P: Proportions, lean = 0.12): THREE.Vector3[] {
  const len = P.SHOULDER_Y - P.HIP_Y + 0.17
  return [
    v(0, hipY, 0),
    v(0, hipY + len * 0.25, 0.02 + lean * 0.3),
    v(0, hipY + len * 0.56, 0.03 + lean * 0.7),
    v(0, hipY + len * 0.84, 0.02 + lean * 0.95),
    v(0, hipY + len, 0.02 + lean),
  ]
}
