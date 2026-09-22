/**
 * The homecoming — the four seconds the whole video is built around.
 *
 * Pure functions of 8.55's local clock, so Act 7 and Act 8.55 can both ask
 * "where is the parent, how far is each arm out, how bright is each of them"
 * and get the same answer on the same frame. Act 7 passes a negative offset;
 * everything below is defined for negative t as well, which is what makes the
 * parent's walk down off the yard start inside 7.2 and finish inside 8.55
 * without a seam.
 *
 * The beat, in order:
 *
 *   act 25.5  (t −5.5)  the parent steps off the yard and starts down the road
 *   act 31    (t  0)    the hero arrives on GOLDEN_POS — the handoff frame
 *   t  0.55            he lifts his hand; the parent already has theirs out
 *   t  2.06  (T_TOUCH)  they touch. HE LIGHTS.
 *   t  2.82            the parent lights.
 *   t  2.06 →          the ring leaves the two hands and crosses the valley
 *   t  7.5 → 9.5       arms come down; they stand together for the rest of it
 *
 * Nothing glows before T_TOUCH. Not the hero on the road at dusk, not the
 * parent waiting, not one figure in the crowd. The light in this film is not
 * something he carried home — it is what happened when he got there.
 */
import {
  PARENT_HOME_POS, PARENT_MEET_POS, T_PARENT_LIGHT, T_TOUCH, TOUCH_POS,
} from './constants'

function smooth01(x: number): number {
  const c = Math.min(1, Math.max(0, x))
  return c * c * (3 - 2 * c)
}

/* ── The parent's walk down to the road ──────────────────────────── */

const WALK_T0 = -5.5
const WALK_T1 = 0.9

/** Ground position at 8.55-local time `t`. Defined for all t. */
export function parentPos(t: number): [number, number] {
  const k = smooth01((t - WALK_T0) / (WALK_T1 - WALK_T0))
  return [
    PARENT_HOME_POS[0] + (PARENT_MEET_POS[0] - PARENT_HOME_POS[0]) * k,
    PARENT_HOME_POS[2] + (PARENT_MEET_POS[2] - PARENT_HOME_POS[2]) * k,
  ]
}

/** 0 = standing still, 1 = walking. Drives the gait and the forward lean. */
export function parentMotion(t: number): number {
  const a = parentPos(t - 0.06)
  const b = parentPos(t + 0.06)
  return Math.min(1, Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.075)
}

/** Distance walked, for a gait locked to the ground rather than to the clock. */
export function parentPhase(t: number): number {
  const k = smooth01((t - WALK_T0) / (WALK_T1 - WALK_T0))
  const total = Math.hypot(
    PARENT_MEET_POS[0] - PARENT_HOME_POS[0],
    PARENT_MEET_POS[2] - PARENT_HOME_POS[2],
  )
  const p = ((k * total) / 0.62) % 1
  return p < 0 ? p + 1 : p
}

/* ── The reach ───────────────────────────────────────────────────── */

/**
 * 0 = arm at the side, 1 = hand on the touch point. The parent's hand is out
 * first — they have been waiting, and the reaching is the waiting. His comes up
 * after he has stopped walking.
 */
export function heroReach(t: number): number {
  return smooth01((t - 0.55) / (T_TOUCH - 0.55)) * (1 - smooth01((t - 7.5) / 2.0))
}

export function parentReach(t: number): number {
  return smooth01((t - 0.3) / (T_TOUCH - 0.3)) * (1 - smooth01((t - 7.5) / 2.0))
}

/**
 * Where a reaching hand is, in the world, at reach amount `r` — the rest pose
 * blended toward the touch point. `restY` is roughly hand-at-side height for
 * the figure asking.
 */
export function reachHandWorld(
  from: [number, number],
  r: number,
  restX: number,
  restY: number,
  restZ: number,
): [number, number, number] {
  return [
    (from[0] + restX) + (TOUCH_POS[0] - (from[0] + restX)) * r,
    restY + (TOUCH_POS[1] - restY) * r,
    (from[1] + restZ) + (TOUCH_POS[2] - (from[1] + restZ)) * r,
  ]
}

/* ── Who is lit, and when ────────────────────────────────────────── */

/** The hero. Dark for two entire scenes, then this. */
export function heroGlow(t: number): number {
  return smooth01((t - T_TOUCH) / 0.55)
}

/** The parent, a beat behind him — the light passes from him to them. */
export function parentGlow(t: number): number {
  return smooth01((t - T_PARENT_LIGHT) / 0.7)
}

/**
 * The flare at the contact itself: a short, hard spike at the touch that the
 * expanding ring is visibly born out of. Without it the two of them just fade
 * up and the ring appears to start from nothing.
 */
export function touchFlash(t: number): number {
  return t > T_TOUCH ? Math.exp(-(t - T_TOUCH) * 2.6) : 0
}
