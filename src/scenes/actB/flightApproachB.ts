/**
 * Act 1 — THE APPROACH, alternate cut of 0:07 → 0:20.
 *
 * A VARIANT. It exists so the city run and the way the camera arrives at the
 * stadium can be recut without touching the take everything else in the film
 * is built on: `KEYS_B` is `KEYS` with one stretch spliced out and replaced,
 * and it rejoins the original EXACTLY on the punch key (0:07.47) and the rim
 * key (0:20.31). Everything before the star field and everything from the
 * crest of the wall onward — the bowl, the seven, the pull-out, the whole of
 * Acts 2 and 3 — is byte-for-byte the film.
 *
 * WHAT IS IN HERE IS THE OLDER CUT. It was the film's approach until the
 * director chose the low fast one over it, and the two swapped places: the
 * leaning, accelerating, ground-skimming run is now `KEYS` in `flight.ts`,
 * and this is the version it replaced, kept so the choice stays visible.
 *
 * Three differences, all on the same three lines of the song, and this cut is
 * on the losing side of each of them.
 *
 * ── 1. The nudges do not land on the beat ────────────────────────────
 * There are four "I need" signs hung down the canyon (`SIGNS` in city.tsx),
 * at 9.51, 11.50, 13.49 and 15.48. This cut leans −26 / +24 / 0 / −18 across
 * them and its keys sit slightly BEFORE the syllables, so the lean is already
 * unwinding by the time the sign lights. The film's is roughly twice as far,
 * on the onset, and cleanly alternating.
 *
 * ── 2. The words sit dead centre whatever the camera does ────────────
 * The lean above is aimed at a word that cannot be moved off centre. All four
 * signs hang on the canyon axis and the aim lags the lean by a third, so the
 * word lands within two per cent of frame centre however far the camera has
 * gone. That is what `SIGN_X_B` says below — the axis, four times — and it is
 * why the film's cut hangs each sign off the axis instead.
 *
 * ── 3. It DECELERATES into the stadium ───────────────────────────────
 * Down the canyon this runs 313 → 239 → 179 → 231 → 322 u/s, and then across
 * the apron it drops to 190 and stays there — the slowest stretch of travel
 * in the act is the one under the biggest line in it. The film's cut inverts
 * that shape: flat at ~205 through the canyon to buy runway, then 216 → 300
 * → 358 and still building on the line.
 *
 * It is also HIGH. 150 units up over empty dark ground puts nothing near the
 * lens and gives no optical flow at all, which is why 190 u/s feels like a
 * drift; the film's cut is at 90 over the apron and 76 on the line, where the
 * ground and its traffic stream under the camera.
 *
 * The reveal itself is in the same place in both — 16 units apart in z on the
 * line, 28 in height — so the facade fills the same frame on the same frame.
 * Only the speed it arrives at is different. And both ease over the rim,
 * because the rim key IS the shared one and the bowl behind it is untouched.
 * That is the point of rejoining there.
 */
import {
  KEYS, T_PUNCH, T_RIM, T_SIGN_1, T_SIGN_2, T_STADIUM,
  makeFlightPose, type Key,
} from './flight'
import { SIGNS } from './city'

/** Replaces every key of the film's take with T_PUNCH < t < T_RIM. */
const APPROACH_B: Key[] = [
  // ── City. Descending into the canyon between the towers. The two keys
  //    below sit ahead of the first two vocal onsets (9.51, 11.50) rather
  //    than on them.
  { t: 9.2, pos: [-26, 196, 2440], tgt: [-6, 178, 3060], fov: 65 },
  { t: 11.3, pos: [24, 178, 2940], tgt: [4, 164, 3540], fov: 63 },
  { t: T_SIGN_1, pos: [0, 164, 3330], tgt: [0, 160, 3940], fov: 61 },
  { t: T_SIGN_2, pos: [-18, 156, 3790], tgt: [0, 156, 4380], fov: 59 },
  // ── Out the far side. The towers fall away and the stadium is just there,
  //    already too big, sitting on its own in the dark.
  { t: 16.6, pos: [0, 152, 4150], tgt: [0, 180, 4810], fov: 57 },
  // Low and looking UP: the facade has to tower on the line, and at eye
  // level with the rim it reads as a scale model on a table instead.
  { t: T_STADIUM, pos: [0, 104, 4536], tgt: [0, 205, 4990], fov: 56 },
  // ── The climb. Up and over the wall on the line.
  { t: 19.6, pos: [0, 190, 4706], tgt: [0, 188, 5240], fov: 58 },
]

/** The film's take with its approach spliced out and `APPROACH_B` in. */
export const KEYS_B: Key[] = [
  ...KEYS.filter(k => k.t <= T_PUNCH),
  ...APPROACH_B,
  ...KEYS.filter(k => k.t >= T_RIM),
]

export const flightPoseB = makeFlightPose(KEYS_B)

/**
 * ON THE AXIS, four times.
 *
 * A cut owns the camera AND where the words hang, and this one hangs all four
 * signs at x=0 — which is what it always did. Combined with an aim that lags
 * the lean by a third, that puts every word within two per cent of frame
 * centre whichever way the camera has gone: four identical centred cards, and
 * the lean reads only as parallax on the towers behind them.
 *
 * Explicit zeros rather than nothing, because `INeedSigns` now defaults to
 * the FILM's placement (`SIGN_X` in city.tsx), which is derived from a camera
 * this cut does not fly.
 */
export const SIGN_X_B: number[] = SIGNS.map(() => 0)
