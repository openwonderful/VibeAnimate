/**
 * Act 7 — "The Road Back": the clock, the walk home, and the handoff.
 *
 * Pure data + functions, no React. Everything here is expressed in ACT time —
 * seconds since song 1:51:
 *
 *   7.1   act 0 → 10      song 1:56.9 → 2:06.9   the long road out of the city
 *   7.2   act 10 → 25.1   song 2:06.9 → 2:22     the village, the night market, home
 *   8.55  act 25.1 →      song 2:22 →            the Arirang
 *
 * ── Where this happens ───────────────────────────────────────────────
 * Act B's valley, on Act B's road, walking up to Act B's house — the same
 * ground the child walks out of in 5.1 and the same ground the pair walk home
 * along in B.8. Everything below is in VILLAGE units (an adult is 1.9 tall) and
 * gets mounted in the valley through `act8_55/locale`; the two scenes are
 * windows onto two stretches of one road:
 *
 *   7.1   village z ≈ 303 → 285   Act B world −6,970 → −6,634
 *         Deep in the fields, on the exact ground B.7 stages Act 3.1 on
 *         (`WALK_31_Z` = −6,800). Seven kilometres of paddy in every direction,
 *         the range a line on the horizon, and the city he has left glowing
 *         behind it.
 *   7.2   village z ≈ 6.6 → −20   Act B world −1,052 → −520
 *         CUT. The last stretch: past the market, up the yard, to the door.
 *
 * The cut between them is not a shortcut, it is the only honest option. The two
 * stretches are 6,100 world units apart and he walks at 1.4 m/s; Act B learned
 * the same lesson carrying the pair over the same ground ("a time-lapse is a
 * worse lie than a cut").
 *
 * Everything in THIS file serves 7.2: the whole point of the act is its last
 * frame. At act 31 the hero stands on GOLDEN_POS, every figure stands on its
 * 8.55 position, and the camera sits on 8.55's opening key. That is enforced by
 * construction rather than eyeballed — see `HANDOFF_KEY`.
 */
import { GOLDEN_POS, OPEN_CAM, roadX } from '../act8_55/constants'
import { HERO_UNITS_PER_CYCLE } from '../act8_55/hero'
import { ORIGIN_Z, S } from '../act8_55/locale'
import { WALK_31_Z } from '../actB/flight'

/* ── The act clock ───────────────────────────────────────────────── */

/**
 * The two halves, and everything else in this file derived from them.
 *
 * These were 12 and 19 and are now 10 and 15.1. Act 6 needed the seconds: the
 * audition holds its point through "Somebody like you, ayy" instead of cutting
 * a quarter-second after the hand lands, and the busking corner is back in the
 * film at 3.7s. The director's own instruction was to push the walk home back
 * to pay for both.
 *
 * Nothing here is authored against a literal 12 or 31 any more — the camera
 * keys, the decel, the light ramp and 7.2's start-of-road all read these two
 * numbers — so the next retime is these two lines and nothing else. The only
 * thing that is NOT free is the last frame: `HANDOFF_KEY` and `Z_END` pin the
 * hero and the lens onto 8.55's opening pose at `ACT_DUR` whatever it is, and
 * a shorter 7.2 simply starts him further down the road rather than faster.
 */
export const S71_DUR = 10
export const S72_DUR = 15.1
/** Act time at which 7.2 begins (i.e. 7.2 local 0). */
export const S72_ACT0 = S71_DUR
export const ACT_DUR = S72_ACT0 + S72_DUR

/**
 * What to pass as `timeOffset` to the 8.55 components a scene reuses, so their
 * internal t=0 lands exactly on the act-7 handoff. 8.55 time = act − ACT_DUR.
 */
export const T_OFF_71 = -ACT_DUR              // 7.1 local == act
export const T_OFF_72 = -(ACT_DUR - S72_ACT0) // 7.2 local == act − 12

/* ── The walk ────────────────────────────────────────────────────── */

/**
 * His pace, in village units per second. A village adult is 1.9 units for
 * 1.73 m, so this is 1.4 m/s — an ordinary walking speed, and deliberately
 * quicker than Act B's own gait of 0.57 m/s. That one is a parent at the end of
 * a long day with a child on their shoulders; this is a man who can see his own
 * house.
 */
export const WALK_SPEED = 1.53

/** Where he stops: 8.55's mark, in front of the door. */
export const Z_END = GOLDEN_POS[2]
/** Where constant-speed walking ends and he eases to a halt. The last 1.5s of
 *  the act, wherever the act now ends. */
const Z_DECEL = Z_END + 2.4
const DECEL_ACT = ACT_DUR - 1.5

/**
 * The 3.1 beat, in village z — the ground 7.1 is staged on. Derived from Act B's
 * own `WALK_31_Z` so the two scenes are provably on the same stretch of road
 * rather than two guesses at it.
 */
export const Z_31 = (ORIGIN_Z - WALK_31_Z) / S

/**
 * Where he enters 7.1: one scene's walk short of the 3.1 beat, so the beat
 * itself lands mid-shot. Walking home is village −z (Act B's road runs the
 * other way, and the locale's half turn is what makes those the same road).
 */
export const Z_START = Z_31 + S71_DUR * WALK_SPEED * 0.5

/**
 * 7.2 opens far enough out that its whole run of gait lands him exactly on
 * `Z_END` — the walk sets the framing, not the other way round. Shorten the
 * slot and he starts nearer the house, which costs the top of the market and
 * not the arrival.
 */
export const Z_START_72 = Z_DECEL + (DECEL_ACT - S72_ACT0) * WALK_SPEED

export function heroZ(a: number): number {
  // 7.1 and 7.2 are different stretches of the same road, so there is no one
  // continuous z(act): each half walks at the same speed from its own start.
  // Deliberately extrapolates outside its window rather than clamping, so speed
  // (and therefore the gait) is continuous across the first frame of either.
  if (a < S72_ACT0) return Z_START - a * WALK_SPEED
  if (a <= DECEL_ACT) return Z_START_72 - (a - S72_ACT0) * WALK_SPEED
  const s = Math.min(1, (a - DECEL_ACT) / (ACT_DUR - DECEL_ACT))
  return Z_DECEL + (Z_END - Z_DECEL) * (1 - Math.pow(1 - s, 3))
}

export function heroX(a: number): number {
  return roadX(heroZ(a))
}

/**
 * Distance walked so far — drives the walk cycle so strides lock to ground.
 *
 * Continuous in act time even though `heroZ` is not: the two halves are two
 * different stretches of the same road walked at the same speed, so the gait
 * carries straight through the cut instead of restarting on it.
 */
export function heroDist(a: number): number {
  if (a <= DECEL_ACT) return a * WALK_SPEED
  return DECEL_ACT * WALK_SPEED + (Z_DECEL - heroZ(a))
}

export function heroPhase(a: number): number {
  const p = (heroDist(a) / HERO_UNITS_PER_CYCLE) % 1
  return p < 0 ? p + 1 : p
}

/** 1 while walking, easing to 0 as he arrives — kills the gait and the lean. */
export function heroMotion(a: number): number {
  const dz = heroZ(a + 0.05) - heroZ(a - 0.05)
  return Math.min(1, Math.abs(dz) / (WALK_SPEED * 0.1))
}

/**
 * The last beat of the act: he squares up to the house and lifts his chin. 0
 * until he stops, 1 by the handoff, where the 8.55 group rotation takes over.
 */
export function heroSettle(a: number): number {
  return smooth01((a - (ACT_DUR - 1.6)) / 1.6)
}

/* ── The light: Act B's own clock, run to suit ────────────────────── */

export function smooth01(x: number): number {
  const c = Math.min(1, Math.max(0, x))
  return c * c * (3 - 2 * c)
}

/**
 * Act time → Act B world time. This is the whole lighting model for the act:
 * there is no dusk ramp, no city dissolve and no fog curve of its own any more,
 * because the valley the act is standing in has all of those already and they
 * are the ones the rest of the film is graded with.
 *
 * 7.1 runs Act B's clock BACKWARDS, 62 → 45. Act B's sun climbs out of the pass
 * over world 44 → 56 and holds; played in reverse that is a sun going down into
 * the pass, which is the direction he is walking. The film has never told anyone
 * which way is west, and 3.1 already stages that low sun in that gap — so the
 * light he walks into here is, frame for frame, the light he grew up walking
 * into. `dayTint` is pinned at 1 across the whole range, so the grade stays the
 * warm one and only the sun's height changes.
 *
 * 7.2 sits inside Act B's night window, 65 → 75.4. Two hard edges bound it and
 * both matter: `nightFall` steps at 64 (a step, because in Act B it lands on a
 * cut) so opening at 65 gets the full cold night with no half-lit frame, and
 * `indoors()` starts at 82 and would switch the valley's lights and fog off
 * under the scene. 64 → 76 is also exactly the window Act B's own pair are off
 * the road, which is belt-and-braces on top of `people={false}`.
 *
 * The dusk-to-night change therefore happens across the 7.1/7.2 cut, which is a
 * real cut in the film at 2:03 — the same place Act B puts its own night step.
 */
export const WORLD_71_T0 = 62
export const WORLD_71_T1 = 45
export const WORLD_72_T0 = 65
export const WORLD_72_T1 = 75.4

export function worldAt(a: number): number {
  if (a < S72_ACT0) {
    return WORLD_71_T0 + (a / S71_DUR) * (WORLD_71_T1 - WORLD_71_T0)
  }
  const s = (a - S72_ACT0) / S72_DUR
  return WORLD_72_T0 + s * (WORLD_72_T1 - WORLD_72_T0)
}

/* ── Camera: the same move, twice ────────────────────────────────── */

/**
 * Keys are HERO-RELATIVE — `d` is the camera offset from the hero, `t` the
 * look-at offset — so the framing rides the walk instead of being re-authored
 * against it. The final key of 7.2 is the one that matters: added to the hero's
 * arrival position it evaluates to 8.55's opening key exactly.
 *
 * Both scenes run profile → arc behind → trail. 7.1 does it small, with three
 * people at dusk; 7.2 does it wide, at night, with a field of them, and lands.
 */
export type CamKey = {
  a: number
  d: [number, number, number]
  t: [number, number, number]
  fov: number
}

/**
 * Hero-relative form of 8.55's opening pose, given the hero ends on GOLDEN_POS —
 * so the last frame of this act IS the first frame of that one, by subtraction
 * rather than by eye. `OPEN_CAM` is the single definition; if 8.55 re-frames its
 * opening, this follows it.
 *
 * Note the sign of `d[2]`: it is POSITIVE. 8.55's lens stands on the road seven
 * village units DOWN-valley of where he stops, looking back up it at him, the
 * person who came out to meet him, and the lit door behind them — so Act 7's
 * camera ends behind him and trails him all the way in. It used to overtake and
 * turn to receive him, because a cut of 8.55 put its opening lens in the yard
 * facing the other way; that cut is gone (see `act8_55/CameraRig`).
 */
export const HANDOFF_KEY: CamKey = {
  a: ACT_DUR,
  d: [
    OPEN_CAM.pos[0] - GOLDEN_POS[0],
    OPEN_CAM.pos[1],
    OPEN_CAM.pos[2] - GOLDEN_POS[2],
  ],
  t: [
    OPEN_CAM.tgt[0] - GOLDEN_POS[0],
    OPEN_CAM.tgt[1],
    OPEN_CAM.tgt[2] - GOLDEN_POS[2],
  ],
  fov: OPEN_CAM.fov,
}

/**
 * The lateral offsets below are much smaller than they were, and that is the
 * whole story of moving this act into Act B's valley.
 *
 * Act B's road is a 62-unit plane with a 30-unit verge either side of it, and
 * then flooded paddy. In village units that is a road 1.55 wide and dry ground
 * out to 3. The old keys stood the camera 10.5 village units off the axis, which
 * was fine on Act 7's own flat terrain and here is 210 world units — deep in a
 * 210-wide bay of `StylizedWater`, whose mirror then filled the bottom half of
 * every frame and left the man a speck at the edge of it. Nothing is off the
 * verge any more.
 */

/**
 * 7.1 — THE LONG ROAD. A travelling shot in the manner of 3.1: the camera holds
 * a near-constant offset from him for the first half, so he keeps his size in
 * frame and the poles, shrines and paddy bunds stream past on either side. The
 * subject is the ground being covered, not the man.
 *
 * It opens in profile at chest height — the most legible way to say "walking" —
 * and swings behind him for the second half, where the road runs out to the pass
 * with the sun going down into it and the skyline standing over it. Nothing he
 * is walking toward is any nearer at the end of the scene than at the start.
 * That is the scene.
 */
/** Keyed as FRACTIONS of 7.1's run, so the whole move still plays whatever the
 *  slot is worth. The shape was authored over twelve seconds at 0 / 5 / 9 / 12. */
export const KEYS_71: CamKey[] = [
  { a: 0.000 * S71_DUR, d: [5.0, 1.50, 2.2], t: [0.0, 1.10, -2.0], fov: 50 },   // profile, one man in a very big valley
  { a: 0.417 * S71_DUR, d: [4.4, 1.70, 3.6], t: [0.0, 1.15, -4.5], fov: 48 },
  { a: 0.750 * S71_DUR, d: [3.0, 2.05, 5.2], t: [0.0, 1.15, -9.0], fov: 46 },   // swinging in behind
  { a: 1.000 * S71_DUR, d: [1.0, 2.45, 6.8], t: [0.0, 1.10, -15.0], fov: 44 },  // the road running out to the pass, and the sun in it
]

/**
 * 7.2 — THE MARKET, AND THE DOOR. The same arc as 7.1 for its first half, then it
 * does the one thing 7.1 never does: it goes past him.
 *
 * It opens trailing him into the market at head height, drifts round to profile
 * as the stalls and the crowd stream by, and over the last quarter it settles
 * back in behind him and comes down to eye level ON the road, so the last
 * seconds are his back, the road, and the lit door coming up at the end of it.
 * That is where 8.55 starts, and it is why the camera ends down-valley of him.
 */
/**
 * The heights in the middle of this list are the market's doing. Act B's road is
 * 1.55 village units of aisle with the stall rows hard against the verge either
 * side, a canopy roof stands at about 2.1, and the 야시장 banner is strung across
 * the road with its top edge at 3.58. A camera anywhere near head height out on
 * the verge is not beside him, it is behind two stalls; at 3.4 it goes straight
 * through the banner. So the middle of the shot goes over the top of all of it —
 * a high three-quarter looking down into a lit aisle, which is the only angle
 * from which a market this narrow reads as a market rather than as a wall — and
 * comes back down to eye level over the last five seconds, as he does.
 */
/** Same idea, as fractions of 7.2's own run offset from its start. Authored
 *  over nineteen seconds at act 12 / 17 / 22 / 26.5 / 29.5 / 31. */
export const KEYS_72: CamKey[] = [
  { a: S72_ACT0 + 0.000 * S72_DUR, d: [3.4, 2.60, 5.6], t: [0.5, 1.30, -3.0], fov: 42 },   // trailing him in, before the first stalls
  { a: S72_ACT0 + 0.263 * S72_DUR, d: [3.6, 4.60, 4.0], t: [0.4, 1.25, -3.0], fov: 46 },   // lifting clear of the banner and the canopies
  { a: S72_ACT0 + 0.526 * S72_DUR, d: [3.4, 5.00, 2.4], t: [0.3, 1.20, -2.6], fov: 48 },   // high over the aisle, the whole market lit below
  { a: S72_ACT0 + 0.763 * S72_DUR, d: [3.0, 3.20, 4.4], t: [0.2, 1.15, -1.2], fov: 46 },   // dropping in behind him as the market thins
  { a: S72_ACT0 + 0.921 * S72_DUR, d: [2.0, 1.70, 5.8], t: [0.2, 1.02, -0.6], fov: 43 },   // eye level on the road as he stops
  HANDOFF_KEY,                                                                              // === 8.55 t=0
]

/**
 * Component-wise cubic Hermite with finite-difference tangents — the same
 * time-aware Catmull-Rom 8.55's rig uses, so velocity is continuous through
 * every key and the two scenes move in the same handwriting.
 */
export function sampleCam(keys: CamKey[], a: number): { d: number[]; t: number[]; fov: number } {
  const n = keys.length
  const ac = Math.min(Math.max(a, keys[0].a), keys[n - 1].a - 1e-6)
  let i = 0
  while (i < n - 2 && ac >= keys[i + 1].a) i++
  const k0 = keys[i]
  const k1 = keys[i + 1]
  const dt = k1.a - k0.a
  const s = (ac - k0.a) / dt

  const h00 = (1 + 2 * s) * (1 - s) * (1 - s)
  const h10 = s * (1 - s) * (1 - s)
  const h01 = s * s * (3 - 2 * s)
  const h11 = s * s * (s - 1)

  const tan = (k: number, get: (key: CamKey) => number): number => {
    const prev = keys[Math.max(0, k - 1)]
    const next = keys[Math.min(n - 1, k + 1)]
    return (get(next) - get(prev)) / (next.a - prev.a)
  }
  const smp = (get: (key: CamKey) => number): number =>
    h00 * get(k0) + h10 * dt * tan(i, get) + h01 * get(k1) + h11 * dt * tan(i + 1, get)

  return {
    d: [smp(k => k.d[0]), smp(k => k.d[1]), smp(k => k.d[2])],
    t: [smp(k => k.t[0]), smp(k => k.t[1]), smp(k => k.t[2])],
    fov: smp(k => k.fov),
  }
}
