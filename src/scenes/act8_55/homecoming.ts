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
 *   before all of it     the parent is ALREADY on the road, out from the door,
 *                        stood still and looking down the valley for him
 *   act 31    (t  0)    the hero arrives on GOLDEN_POS — the handoff frame
 *   t  0.30            he lifts his hand — the kid reaches first
 *   t  0.75            the parent's hand comes out to answer it
 *   t  2.06  (T_TOUCH)  they touch. THEY BOTH LIGHT — one event, two ramps
 *                       (his 0.55s, hers 0.7s; simultaneous by note)
 *   t  2.06 →          the ring leaves the two hands and crosses the valley
 *   t  7.5 → 9.5       arms come down; they stand together for the rest of it
 *
 * Nothing glows before T_TOUCH. Not the hero on the road at dusk, not the
 * parent waiting, not one figure in the crowd. The light in this film is not
 * something he carried home — it is what happened when he got there.
 */
import {
  PARENT_MEET_POS, T_PARENT_LIGHT, T_TOUCH, TOUCH_POS,
} from './constants'

function smooth01(x: number): number {
  const c = Math.min(1, Math.max(0, x))
  return c * c * (3 - 2 * c)
}

/* ── The parent's walk down to the road ──────────────────────────── */

/**
 * They do not walk down any more. They are already there.
 *
 * The parent used to step off the yard at act 25.5 and arrive on the road as he
 * did, which meant Act 7.2 had to carry half a walk and 8.55 the other half,
 * and it meant the last thing before the touch was two people converging. The
 * note was "make it so that the parent's already waiting there and they're just
 * looking out into the road" — which is both simpler to stage and a better
 * sentence: they have been standing out here for a long time.
 *
 * Kept as a function of `t` rather than folded into a constant because
 * `parentMotion` and `parentPhase` are derived from it and Act 7 asks for all
 * three; they now correctly return zero for every frame.
 */
export function parentPos(_t: number): [number, number] {
  return [PARENT_MEET_POS[0], PARENT_MEET_POS[2]]
}

/** 0 = standing still, 1 = walking. Drives the gait and the forward lean. */
export function parentMotion(t: number): number {
  const a = parentPos(t - 0.06)
  const b = parentPos(t + 0.06)
  return Math.min(1, Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.075)
}

/** Gait phase. Zero, and constant: they are standing. Kept so the callers that
 *  ask for it do not have to know the walk is gone. */
export function parentPhase(_t: number): number {
  return 0
}

/* ── The reach ───────────────────────────────────────────────────── */

/**
 * 0 = arm at the side, 1 = hand on the touch point. HIS hand is up first —
 * the kid reaches for them the moment he has stopped walking, and theirs
 * comes out to answer it. (Director's note: the kid touches them. It used to
 * be the other way — the parent waiting with a hand already out.)
 */
export function heroReach(t: number): number {
  return smooth01((t - 0.3) / (T_TOUCH - 0.3)) * (1 - smooth01((t - 7.5) / 2.0))
}

export function parentReach(t: number): number {
  return smooth01((t - 0.75) / (T_TOUCH - 0.75)) * (1 - smooth01((t - 7.5) / 2.0))
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

/**
 * How much of the porch light is left: 1 → PORCH_FLOOR, and it stays there.
 *
 * The note: when they light up, dim the light under them so they read against
 * the background. They ignite pale gold while standing in the one hot amber
 * pool in the frame, in front of the one lit wall in it — same hue, same
 * value, so the event the film has waited two acts for had the least contrast
 * of anything on screen. The porch goes down AS they come up (the same 0.55s
 * ramp as `heroGlow`, started a hair early so the eye reads "the house gave
 * its light to them" rather than two unrelated fades), and it is never off:
 * the door is still a lit door, it just stops competing.
 *
 * And it STAYS down to the end of the shot (director's note: "the brightness
 * just comes back later — keep it low through the end so we can see the
 * people"). An earlier pass brought it back at t = 10–14 for the high oblique,
 * on the theory that the lit house was that frame's landmark; on screen the
 * hot amber pool was simply the brightest thing in a valley full of lit
 * people, and it sat on top of the two that matter. The door and windows
 * still glow at half, which is all the landmark the wide shot needs.
 */
const PORCH_FLOOR = 0.22
export function porchLight(t: number): number {
  const down = smooth01((t - (T_TOUCH - 0.15)) / 0.7)
  return 1 - (1 - PORCH_FLOOR) * down
}

