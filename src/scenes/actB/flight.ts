/**
 * Act B — "THE APPROACH": the shared flight.
 *
 * Everything in Act B is one world and one camera move. The mountains, the
 * city, the stadium and the ocean of people inside it all exist in a single
 * three.js scene at the same time, laid out along +Z, and the camera flies
 * through the lot of it in one unbroken take from 0:00 to 0:26.
 *
 * That is the whole point of the act. The old opening was three separate
 * things stitched together — a DOM depth-chain of Scene 1 layers, a 3D city
 * built as flat rows, and a CSS portal that punched a pre-rendered stadium
 * over the top of it. Each seam had to be hidden. Here there are no seams to
 * hide: you cannot cut between the city and the stadium because they are two
 * ends of the same field.
 *
 * The sub-scenes (B.1 … B.4) are WINDOWS into this one flight, not separate
 * shots. B.2 is literally B.1 eight seconds later. They exist so the master
 * video can render the take in parallel segments and so each stretch can be
 * screenshotted on its own — play them back to back and the result is frame
 * identical to playing `B` straight through.
 *
 * ── The song drives the geography ────────────────────────────────────
 *   0:07.24  "I need"                         camera punches through the
 *                                             star field beyond the last ridge
 *   0:13.05  "I need (What you need?)"        the pixel sign lights, deep city
 *   0:14.96  "I need, I need"                 second flash, tower canyon
 *   0:18.65  "I need the WHOLE STADIUM"       the stadium fills the frame
 *   0:20.31  "…to jump / put your phone down" we crest the rim and the bowl
 *                                             opens up underneath
 */

/* ══ Song anchors ═══════════════════════════════════════════════════
 * Measured off the vocal, not read off the LRC. An onset envelope band-passed
 * to 300–2500 Hz (the voice, not the kick) puts the "I need"s at 7.47, 9.51,
 * 11.50, 13.49 and 15.48 — consistently about 0.4 s later than the lyric
 * file's timestamps, which is enough to feel early on screen. The 11.50 one
 * is the second half of the LRC's "I need, I need" and had no line of its
 * own at all, which is why it went unmarked.
 */
export const T_PUNCH = 7.47      // vocal onset; lrc says 00:07.24
/** The two "I need"s the LRC never marked — the run of four down the canyon
 *  is 9.51 / 11.50 / 13.49 / 15.48, and the approach leans on every one. */
export const T_SIGN_A = 9.51
export const T_SIGN_B = 11.50
export const T_SIGN_1 = 13.49    // lrc 00:13.05
export const T_SIGN_2 = 15.48    // lrc 00:14.96
export const T_STADIUM = 18.65   // 00:18.65 "I need the whole stadium to jump"
export const T_RIM = 20.31       // 00:20.31 "Put your phone down"
export const T_STAGE = 26        // the members are up, the shot settles
export const T_EXIT = 27.4       // the pull-out begins (the ease, as it always did)
/** The "heyyy". The loud shout at the end of "The vibe is high, let the
 *  building": measured off the vocal stem, it attacks at 27.78 (an F3, a
 *  different note from the rap line's G#3, and the loudest thing in the
 *  bar) and its tail rings to about 28.7. The shot JERKS backwards on this
 *  frame and the speed-up ends when the shout does — see "The jerk" below
 *  WARP_RATE. (The short syllable at 27.10 is the end of "building", not a
 *  hey; a kick put there read as too early.) */
export const T_HEY = 27.98       // the attack is 27.78; the jerk sits 200ms
                                 // AFTER it — on the frame it read as the
                                 // zoom-out arriving and THEN the shout
export const T_HEY_END = 28.7
/** Film units per second on the frame of the shout, and when the shout has
 *  rung out. These two numbers ARE the jerk; everything else about it is
 *  solved from them at load (see `warpCum`). The version before had 33 and
 *  164 here, i.e. no jerk at all. */
export const HEY_KICK = 150
export const HEY_SPEED = 450
export const T_RANGE = 40.64     // back at the pass
export const T_WIDE = 50.43      // the widest frame in the film — the far end
                                 // of the rail, where the pull-out eases to rest
export const T_31 = 62           // Act 3.1's framing settles, deep in the fields.
                                 // Was 60: the settle now comes two story-
                                 // seconds later, which hands those seconds to
                                 // the warp and takes two FILM seconds off the
                                 // watch — four seconds of watching them walk
                                 // was still two too many.
export const T_31_END = 64       // …and holds to here. CUT. A two-second look,
                                 // not a scene.
export const T_TREE = 64         // under the tree, at night, looking up
/**
 * Story seconds taken off the FRONT of the tree beat.
 *
 * The shot cuts in on two people sitting still and then does nothing but
 * push in on focal length for five seconds before their heads start back at
 * T_TREE + 4.4. That opening hold is the one stretch of the act that is
 * waiting rather than saying something, and it does not need all of it.
 *
 * Everything downstream of the cut moves with it — the fov push, the orbit,
 * the tilt, `restingSkeleton`'s head ramp in tree.tsx, `handheld`'s damping,
 * and the road and table that follow — so this is a dial, not an edit: set
 * it to 0.25 and the beat is a quarter-second longer again, with nothing
 * else to keep in sync. T_TREE itself does NOT move: the cut lands where it
 * always did, so the road look before it keeps its three seconds.
 *
 * Costs 0.5s off the flight's film length, which the master timeline hands
 * to Act 4 (see timeline.ts, the 4.2/4.3 pair).
 */
export const TREE_TRIM = 0.5
export const T_32 = 76 - TREE_TRIM   // CUT. carried, walking up to the door
export const T_33 = 82 - TREE_TRIM   // CUT. inside, at the table
// The table's last frame — and the last frame of Acts 1–3.
//
// It was 89 (film 67.5) until Act 4's doorway became three measures cut
// through the montage as time markers and needed 1.2s that the back half of
// the film does not have: Act 4 has to hand over at film 87.0 for 5.1's wave
// and 8.55 is nailed to 2:22, so the whole of 4–7 is pinned at both ends. The
// only slack in the picture is this join, which FILM.md's own gap list calls
// the one join in the film that has had no attention at all.
//
// It comes off the MEAL rather than off the journey. The meal is a hold, so
// 1.2s off it costs a beat of stillness; the journey is the stretch already
// flagged as most likely to read as rushed, and it is separately being asked
// to carry a bounce, which wants more room and not less.
//
// The meal gave another second on top of that, and this time it came out of
// the master timeline rather than out of here: the flight's picture ends at
// FLIGHT_FILM_END and the clip runs on past it with the camera parked, so
// the length of the last held frame on the table is `clip 3's duration`
// minus this. That hold was 2s and is 1s.
export const FLIGHT_END = 87.8 - TREE_TRIM   // 87.3 story · film 63.8


/* ══ STORY TIME vs FILM TIME ════════════════════════════════════════
 *
 * Every number above, every key below, every fog and light ramp in
 * World.tsx, and every `ValleyStill at={…}` in Acts 4, 5, 7 and 8.55 is a
 * STORY time: where we are in the flight. That is the base this act was
 * authored in and it does not change.
 *
 * FILM time is where we are in the song, and the two are no longer the same
 * thing. The journey out — leaving the stage, back through the city, over
 * the pass and down onto the two of them on the road — was thirty-one
 * seconds of pure travelling, and it does not carry thirty-one seconds. It
 * now plays in ten:
 *
 *      film  0     27.4        38.5                          63.8
 *            ├─────┼───────────┼─────────────────────────────┤
 *      story 0     27.4                    62               87.3
 *            └─────┴───────────────────────┴─────────────────┘
 *             1:1      3.4× average           1:1 again
 *
 * The middle number went 3.1× → 3.4× when the departure gained its second
 * (the dip at the head of WARP_RATE): the second is spent in the bowl and
 * earned back over the journey, so the same thirty-four story seconds now
 * cross in a fraction less film time.
 *
 * Doing it this way rather than by rewriting the keys is deliberate. Six
 * scenes outside this act sample the valley's grade by absolute world time —
 * `ValleyStill at={65}` is "the low sun sitting in the pass", `NIGHT = 70`
 * is "the valley after dark" — and those numbers should go on meaning what
 * they mean no matter how fast the film gets there. Retiming the keys would
 * have silently re-graded all six.
 *
 * The map is authored as a RATE — story seconds per film second — rather
 * than as one curve through (0,0)–(1,1), because everything that is wrong
 * or right about this stretch is a question of where the camera is
 * ACCELERATING, and a rate table says that out loud where a position curve
 * hides it. The first version was a single cubic Hermite, and its rate was
 * a smooth hump peaking at 4.2× halfway along: the trouble with a smooth
 * hump is that it is fastest exactly where the camera's own speed is
 * flattening off (out over the plain) and still at 3.7× where the camera
 * has to stop and turn round. The shot came out fast and uniform in the
 * middle and hinged at the end.
 *
 * So the rate winds up LATER and comes off the gas at the far end. Read the
 * second column below as the shape of the shot.
 */
/** Film seconds the compressed stretch occupies. The eleventh second came
 *  off the 3.1 walk hold (five seconds of watching them walk was one too
 *  many) and went to the far end of the pull-out, where the turnaround now
 *  plays as one slow reversal instead of a bounce. Two MORE seconds came
 *  off the same hold later (T_31 59 → 60 → 62), and those left the act
 *  entirely — WARP_LAG grew by two and everything after the flight starts
 *  two film-seconds sooner. */
const WARP_FILM = 11.1
const WARP_STORY = T_31 - T_EXIT           // 31.6 story seconds
/** Story seconds that film time runs behind by, once the warp is done. */
export const WARP_LAG = WARP_STORY - WARP_FILM   // 23.5

/** Story seconds per film second, keyed on film time. Relative, not
 *  absolute: the whole table is scaled at load so it integrates to
 *  WARP_STORY, so any one row can be moved without re-balancing the rest.
 *  This is the shot as it was authored; the jerk on the "heyyy" is laid
 *  OVER it at load — see `warpCum` — and the table is untouched by it.
 *
 *  (For a month this table opened with a DIP instead — a rate below 1 for the
 *  first two film seconds, holding the camera in the bowl a second longer so
 *  the seven could finish arriving. The jerk is the opposite instruction for
 *  the same two seconds and the later one, tuned frame by frame against the
 *  vocal over THIS table, so the dip is retired rather than layered under a
 *  kick that would override it anyway.)
 */
const WARP_RATE: [number, number][] = [
  [27.40, 1.00],   // the stage. 1:1 — the flight is cut to the vocal to here
  [28.30, 1.22],   // and it peels off it slowly (the jerk overrides this stretch)
  [29.30, 1.75],
  [30.30, 2.55],
  [31.10, 3.40],
  [31.90, 4.25],
  [32.60, 4.75],   // through the pass, still building
  [33.30, 4.65],
  [33.90, 3.90],
  [34.90, 2.85],   // the far end of the rail — time opens back up for it
  [35.90, 2.35],   // the turnaround plays slowest of the whole stretch: the
  [36.70, 2.95],   // reversal is an ease, not a bounce, and it needs room
  [37.40, 3.10],   // and the run home
  [38.00, 2.15],
  [38.50, 1.00],   // 1:1 again, for the rest of the film
]

/**
 * Monotone cubic (Fritsch–Carlson) through the rate table. A plain
 * Catmull-Rom would overshoot between two close rows and could put a
 * NEGATIVE rate on the clock — story time running backwards for two frames,
 * which is not a thing this act should be able to express.
 */
function pchipCurve(pts: [number, number][]): (x: number) => number {
  const n = pts.length
  const h: number[] = []
  const d: number[] = []
  for (let i = 0; i < n - 1; i++) {
    h.push(pts[i + 1][0] - pts[i][0])
    d.push((pts[i + 1][1] - pts[i][1]) / h[i])
  }
  const m: number[] = new Array(n)
  m[0] = d[0]
  m[n - 1] = d[n - 2]
  for (let i = 1; i < n - 1; i++) {
    if (d[i - 1] * d[i] <= 0) { m[i] = 0; continue }
    const w1 = 2 * h[i] + h[i - 1]
    const w2 = h[i] + 2 * h[i - 1]
    m[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i])
  }
  return (x: number) => {
    if (x <= pts[0][0]) return pts[0][1]
    if (x >= pts[n - 1][0]) return pts[n - 1][1]
    let i = 0
    while (i < n - 2 && x > pts[i + 1][0]) i++
    const s = (x - pts[i][0]) / h[i]
    const s2 = s * s
    const s3 = s2 * s
    return (
      (2 * s3 - 3 * s2 + 1) * pts[i][1] + (s3 - 2 * s2 + s) * h[i] * m[i] +
      (-2 * s3 + 3 * s2) * pts[i + 1][1] + (s3 - s2) * h[i] * m[i + 1]
    )
  }
}

const WARP_STEPS = 2220
const WARP_DT = WARP_FILM / WARP_STEPS

/* ══ The jerk on the "heyyy" ════════════════════════════════════════
 *
 * The note: the initial speed-up about five times harder, jerking in when
 * they say "heyyy", ending when the "heyyy" ends, then whatever — smooth —
 * and with the SAME timing otherwise. So the keys do not move (the exit is
 * still the ease from T_EXIT, the road is still 37.5, Act 4 is untouched)
 * and the table above is not hand-tuned for it either. The rate is SOLVED:
 *
 *   film speed = (speed of the keys' own line at the story time) × rate
 *
 * so for a wanted film speed V at film time f the rate is V / keySpeed(s),
 * where s is where the story has got to — which depends on the rates
 * before it, hence a forward integration rather than a formula. Between
 * T_HEY and T_HEY_END the wanted speed is a smoothstep from HEY_KICK to
 * HEY_SPEED: the step onto HEY_KICK on the first frame is the jerk (a rate
 * step is a velocity step on screen, no cut key, no position jump), the
 * ease-out at the end is the speed-up ending with the shout. After that
 * the shot holds AT LEAST HEY_SPEED until the authored build catches up
 * and passes it on its own (max of the two rates — continuous, no sag).
 *
 * The burst puts the story a second or two ahead. It is paid back in ONE
 * place, the far end of the rail and the turnaround (PAYBACK_FROM..TO),
 * where the camera is near-still and a slower clock is invisible, with a
 * raised-cosine window so the rate never steps. The amount is solved too
 * (pass 1 measures the lead, pass 2 applies it), so the road at 37.5 and
 * everything after it come out where they were to a hundredth of a story
 * second. The visible cost: the far end is reached a little sooner and
 * held a little longer.
 */
const PAYBACK_FROM = 33.6
const PAYBACK_TO = 36.7

const KS_A: Pose = { pos: [0, 0, 0], tgt: [0, 0, 0], fov: 60 }
const KS_B: Pose = { pos: [0, 0, 0], tgt: [0, 0, 0], fov: 60 }
/** Speed of the keys' own line at story time s — units per STORY second. */
function keySpeed(s: number): number {
  const h = 0.01
  const a = flightPose(s - h, KS_A)
  const b = flightPose(s + h, KS_B)
  return Math.hypot(b.pos[0] - a.pos[0], b.pos[1] - a.pos[1], b.pos[2] - a.pos[2]) / (2 * h)
}

/**
 * Accumulated lag: how far ahead of film time story time is, at every 5 ms
 * of the warp — the table, with the jerk laid over it and paid back. Built
 * on first use rather than at load because it reads `flightPose`, which is
 * declared further down. The last entry is scaled to exactly WARP_LAG (a
 * no-op to four decimals once the pay-back has done its job) so the table
 * stays a shape rather than a set of numbers that must add up by hand.
 */
let warpCumCache: Float64Array | null = null
function warpCum(): Float64Array {
  if (warpCumCache) return warpCumCache
  // The table is a SHAPE (see WARP_RATE): scale (rate − 1) so that on its own
  // it integrates to exactly WARP_LAG, as it always did. The burst's rates
  // are absolute — a wanted speed over a measured one — and must not be.
  const raw = pchipCurve(WARP_RATE)
  let rawLag = 0
  for (let i = 0; i < WARP_STEPS; i++) rawLag += (raw(T_EXIT + (i + 0.5) * WARP_DT) - 1) * WARP_DT
  const k0 = WARP_LAG / rawLag
  const table = (f: number) => 1 + k0 * (raw(f) - 1)
  const bump = (f: number) => {
    const u = (f - PAYBACK_FROM) / (PAYBACK_TO - PAYBACK_FROM)
    return u <= 0 || u >= 1 ? 0 : 0.5 - 0.5 * Math.cos(2 * Math.PI * u)
  }
  /** Story time reached at each step, midpoint-integrated. `coasting` is
   *  the hold-at-least-HEY_SPEED rule after the shout; it switches off for
   *  good the moment the table's own speed passes HEY_SPEED, because the
   *  same rule applied at the far end or the road — where the keys are
   *  meant to be nearly still — would be asking for 450 u/s from a camera
   *  that is parked, and the clock would run away. */
  const integrate = (payback: number): Float64Array => {
    let coasting = true
    const rateAt = (f: number, story: number): number => {
      let r = table(f)
      if (f >= T_HEY) {
        const vs = Math.max(1, keySpeed(story))
        if (f <= T_HEY_END) {
          const u = (f - T_HEY) / (T_HEY_END - T_HEY)
          r = (HEY_KICK + (HEY_SPEED - HEY_KICK) * smooth01(u)) / vs
        } else if (coasting) {
          if (r * vs >= HEY_SPEED) coasting = false
          else r = HEY_SPEED / vs
        }
      }
      return r * (1 - payback * bump(f))
    }
    const story = new Float64Array(WARP_STEPS + 1)
    story[0] = T_EXIT
    for (let i = 0; i < WARP_STEPS; i++) {
      const f = T_EXIT + i * WARP_DT
      const r1 = rateAt(f, story[i])
      const r2 = rateAt(f + WARP_DT / 2, story[i] + r1 * WARP_DT / 2)
      story[i + 1] = story[i] + r2 * WARP_DT
    }
    return story
  }
  // Pass 1: the plain table and the burst, no pay-back — how far ahead are we
  // by the start of the window, and how much story does the window hold?
  const at = (f: number) => Math.min(WARP_STEPS, Math.max(0, Math.round((f - T_EXIT) / WARP_DT)))
  const plain = new Float64Array(WARP_STEPS + 1)
  plain[0] = T_EXIT
  for (let i = 0; i < WARP_STEPS; i++) {
    const f = T_EXIT + i * WARP_DT
    plain[i + 1] = plain[i] + table(f + WARP_DT / 2) * WARP_DT
  }
  const burst = integrate(0)
  const lead = burst[at(PAYBACK_FROM)] - plain[at(PAYBACK_FROM)]
  let windowStory = 0
  for (let i = at(PAYBACK_FROM); i < at(PAYBACK_TO); i++) {
    const f = T_EXIT + (i + 0.5) * WARP_DT
    windowStory += table(f) * bump(f) * WARP_DT
  }
  const payback = Math.min(0.85, Math.max(0, lead / windowStory))
  // Pass 2: the real thing.
  const story = integrate(payback)
  const cum = new Float64Array(WARP_STEPS + 1)
  for (let i = 0; i <= WARP_STEPS; i++) cum[i] = story[i] - (T_EXIT + i * WARP_DT)
  // A no-op to three decimals once the pay-back has done its job; kept so
  // the end of the warp is exactly T_31 whatever the rounding.
  const k = WARP_LAG / cum[WARP_STEPS]
  for (let i = 0; i <= WARP_STEPS; i++) cum[i] *= k
  warpCumCache = cum
  return cum
}

/** Film time (seconds into the song) → story time (seconds into the flight). */
export function storyTime(film: number): number {
  if (film <= T_EXIT) return film
  if (film >= T_EXIT + WARP_FILM) return film + WARP_LAG
  const cum = warpCum()
  const x = (film - T_EXIT) / WARP_DT
  const i = Math.min(WARP_STEPS - 1, Math.floor(x))
  return film + cum[i] + (cum[i + 1] - cum[i]) * (x - i)
}

/** The inverse: story time → film time. Used to place a shot's internal cues
 *  (the table's serve and flare) on the clock the scene component reads. */
export function filmTime(story: number): number {
  if (story <= T_EXIT) return story
  if (story >= T_31) return story - WARP_LAG
  // Monotonic on the interval, so bisection is exact enough and needs no
  // cubic root solver.
  let lo = T_EXIT, hi = T_EXIT + WARP_FILM
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2
    if (storyTime(mid) < story) lo = mid; else hi = mid
  }
  return (lo + hi) / 2
}

/** Film-time length of the whole flight — what the manifest and the master
 *  timeline have to agree with. */
export const FLIGHT_FILM_END = FLIGHT_END - WARP_LAG   // 64.3

/* ── The cuts (two, once; now two again, differently placed) ─────────
 * Everything up to the tree is one unbroken camera. The act then cuts to
 * the pair resting under the tree, and — since the seamless rework — flies
 * CONTINUOUSLY from there to the road home while aimed at the sky (see the
 * "NO CUT. The camera SAILS home" keys), so the only other cut is into the
 * interior at T_33. The cuts that exist are deliberate reversals of the
 * rule the rest of the act is built on, and the right call — the
 * alternative was carrying them seven kilometres in twelve seconds while
 * their legs walked at 11 units a second, which is a time-lapse, and a
 * time-lapse is a worse lie than a cut. (The sky-flight beats both: the
 * WALKERS are what cannot cover the ground on screen; a camera can.)
 *
 * A cut is a key marked `cut`. `flightPose` never interpolates across one:
 * tangents are computed inside a segment only, so the camera holds the last
 * pose of a segment rather than easing into the next one.
 */

/* ══ World layout ═══════════════════════════════════════════════════
 * One straight corridor of world along +Z. Nothing overlaps, so the camera
 * never has to fade anything out — it just leaves it behind.
 *
 *      z        0 ─── 900        950 ─── 1900     2650 ─── 4300    4790 ── 5710
 *               ridges + mist    the star field   the city        the stadium
 */
export const RIDGE_BANDS = [220, 430, 660, 900]
/** The star field the camera punches through on "I need". The camera's
 *  keyframe sits at Z_PUNCH — 250 short of the far edge — so that ON the
 *  syllable there are still stars streaking past the lens rather than an
 *  already-empty sky. They are all astern half a second later. */
export const STARS_Z_NEAR = 950
export const STARS_Z_FAR = 2150
const Z_PUNCH = 1900
/** Central corridor kept clear of geometry so the flight path is never blocked. */
export const CORRIDOR_HALF = 240

export const CITY_Z_NEAR = 2650
export const CITY_Z_FAR = 4300

export const STADIUM_Z = 5250
/** Outer facade half-extents. The bowl is a wide ellipse, wider than deep. */
export const STADIUM_RX = 520
export const STADIUM_RZ = 460
/** Top of the outer facade — the rim the camera crests at 0:20.31. */
export const STADIUM_RIM_Y = 190
/** The pitch: inner edge of the lowest seating tier. The bowl profile's
 *  outermost step is 2.08x these, which is exactly STADIUM_RX/RZ. */
export const BOWL_RX = 250
export const BOWL_RZ = 221
/** Stage sits at the far end of the bowl, facing back toward the camera. */
export const STAGE_Z = STADIUM_Z + 120

/* ── The valley ──────────────────────────────────────────────────────
 * Act 3.1's world, and where the act ends up. It runs from the foot of the
 * range at z=430 all the way back to z=-11600 — roughly sixteen times the
 * ground the first version covered, because the pull-out now travels far
 * enough that a 2,500-unit strip of paddy ran out under the camera and left
 * it flying over bare plane.
 *
 * The floor sits ABOVE the act's own Ground (which crests around y=+7 out
 * here), so the two never interpenetrate. */
export const VALLEY_Y = 12
export const VALLEY_Z0 = -11600
/** Where the road ends — which is where the house is. */
export const VALLEY_Z1 = -370
export const VALLEY_X_HALF = 4600
/**
 * The farmhouse sits ON the road, square across the end of it, at the foot
 * of the pass. It was off in a field before, which made no sense of the road
 * at all: a road has to go somewhere. The camera flies over its roof in the
 * first four seconds and comes back to its door in the last four.
 *
 * z=-400 is measured, not guessed. Walking the scene graph for anything
 * that crosses x=0 turns up a set of low fill-hills in the first ridge band
 * whose footprints run from z=-258 all the way back to z=898 — the house at
 * z=+30 was standing INSIDE one of them, and the last frame of the act was
 * the inside of a hill. Everything forward of z=-280 on the axis is clear,
 * so the road ends at -370 and the house sits at -400, with those mounds
 * rising as a bank right behind its roof.
 *
 * The cost of moving it here is that the opening no longer flies over it:
 * the camera starts at z=-70, which is already past this point. The house
 * belongs at the end of the road more than it belongs in the first four
 * seconds.
 */
export const HOUSE_Z = -400
export const HOUSE_X = 0

/* ── The walk ────────────────────────────────────────────────────────
 * Act 3.1 happens seven kilometres out, and Act 3.2 happens at the door.
 * The pair cover that ground during the twelve seconds the light is going
 * out of the valley, when they are twenty pixels tall on a dark road — the
 * one stretch of the act where nobody can count their steps.
 */
/** 3.1's gait at Act B's scale: it slides the pair 10 units in 8 s with the
 *  adult at scale 2.2, and the adult here is at 20. */
export const WALK_SPEED = (10 / 8) * (20 / 2.2)
/** Where the 3.1 beat happens — deep enough into the fields that the range,
 *  the city and everything else is a long way off. */
export const WALK_31_Z = -6800
/** Where the run-in to the house starts — 12 s of gait from the door. */
export const WALK_32_Z = -616
/** Where the tree is, and the pair under it. Off the west verge, far enough
 *  down the road that neither the 3.1 beat nor the house is anywhere near
 *  it. */
export const TREE_X = 300
export const TREE_Z = -2600

/* ── What the two of them are looking at ─────────────────────────────
 * The whole of Act 3.2 is one question — where are they looking? — so the
 * answer lives here rather than in three files' worth of eyeballed numbers.
 * `tree.tsx` turns them by PAIR_YAW, `ascendedSky` hangs the river on
 * PAIR_GAZE's bearing, and the camera keys below end pointing along it.
 *
 * PAIR_GAZE is DERIVED, not dialled. `restingSkeleton` carries the head to
 * (0, +0.94·neck, −0.80·neck) off the shoulder at full look-up — the same
 * ratio for the adult and the child, since both come off `Proportions` —
 * so the neck axis is (0, 0.7615, −0.6481) whatever size the figure is.
 * A face is perpendicular to its own neck: rotate that axis a quarter turn
 * forward in the sagittal plane and the look comes out 8° BELOW level while
 * they are watching the ground, and 40.4° above it once their heads are
 * back. Then the same yaw the figures are under puts it in the world.
 */
export const PAIR_YAW = -1.058
export const PAIR_GAZE: [number, number, number] = [-0.6636, 0.6481, 0.3736]

/**
 * The pair's position on the road at world time t — gait speed on both
 * sides of the cuts, and nothing in between, because in between they are not
 * on screen. The camera keyframes read the same function, so the two can
 * never drift apart.
 */
/** The story second the pair cross WALK_31_Z. This used to BE T_31, but the
 *  two are different jobs: T_31 is where the camera settles (a film-pacing
 *  lever, free to move), and this is where the walkers are (which the framing
 *  keys at 58–64 are all built around). T_31 moving to 62 must not slide the
 *  pair twenty units up the road. */
const WALK_31_AT = 60
export function walkZ(t: number): number {
  if (t < T_32) return WALK_31_Z + (t - WALK_31_AT) * WALK_SPEED
  return WALK_32_Z + (t - T_32) * WALK_SPEED
}

/* ══ Camera ═════════════════════════════════════════════════════════ */
export type Key = {
  t: number
  pos: [number, number, number]
  tgt: [number, number, number]
  fov: number
  /** Starts a new segment. Nothing interpolates across this key. */
  cut?: true
}

/**
 * The flight, as keyframes. Position, look-at and focal length are all
 * interpolated with Catmull-Rom, so velocity is continuous through every key
 * — the camera never stops and restarts at a beat, it just leans.
 *
 * Read the z column on its own and you have the shot: a slow creep for the
 * first two seconds with the whole range in frame, a hard acceleration into
 * the star field, a leaning run down the middle of the city that keeps
 * getting lower and faster, and then a climb over the stadium wall.
 *
 * The approach — 0:07.5 to 0:20.3, the canyon and the wall — has an
 * alternate cut in `flightApproachB.ts`, which is the version that
 * DECELERATES into the stadium. It is spliced against these keys, so it
 * rejoins on the punch and on the rim; `?act=1-B` / `?act=1.2-B` fly it.
 */
export const KEYS: Key[] = [
  // ── The house. The act opens on the one warm thing in the valley — the
  //    lamp at the end of the road, four hundred units off, with the paddies
  //    black around it and two orbs lifting off its roof — and then the
  //    camera rises off the ground and the range and the wordmark come in
  //    over the top of it. It still flies straight over the roof at ~0:03.
  { t: 0.0, pos: [2, 62, -880], tgt: [-2, 44, -420], fov: 44 },
  { t: 1.4, pos: [2, 74, -790], tgt: [-2, 62, -380], fov: 47 },
  { t: 2.6, pos: [3, 108, -560], tgt: [0, 168, 60], fov: 54 },
  { t: 3.6, pos: [4, 150, -170], tgt: [0, 232, 700], fov: 60 },
  { t: 4.8, pos: [10, 168, 400], tgt: [-4, 244, 1180], fov: 63 },
  { t: 6.0, pos: [8, 186, 830], tgt: [0, 248, 1560], fov: 65 },
  // The punch. z lands exactly on the far edge of the star field, so the
  // last star crosses the lens on the syllable.
  { t: T_PUNCH, pos: [0, 200, Z_PUNCH], tgt: [0, 226, 2560], fov: 67 },
  // ── City. Down the canyon between the towers, and the four nudges.
  //
  //    THE LEAN IS THE RHYTHM. There are four "I need" signs hung down the
  //    canyon (`SIGNS` in city.tsx) and the camera leans on every one of
  //    them, alternating and hard: LEFT (−52), RIGHT (+50), LEFT (−48), and
  //    then dead centre for the fourth, which is where the shot stops leaning
  //    and starts running. The keys sit ON the vocal onsets rather than
  //    slightly ahead of them, so the lean is at full stretch when the sign
  //    lights instead of already unwinding.
  //
  //    The aim lags the camera by about a third of the offset. On the axis
  //    that would park the word dead centre of frame whatever the camera did
  //    — the lean would read as parallax on the towers and do nothing at all
  //    for the thing it is nudging at — so the signs hang OFF the axis
  //    instead, thrown to the side the camera has leaned to. See `SIGN_X` in
  //    city.tsx, which derives that from these keys.
  { t: T_SIGN_A, pos: [-52, 192, 2420], tgt: [-16, 178, 3070], fov: 65 },
  { t: T_SIGN_B, pos: [50, 178, 2810], tgt: [16, 166, 3460], fov: 63 },
  // Held back 130 units from where the deceleration cut sat — this and the
  // key after it are where the runway comes from — and the 98-unit swing
  // right-to-left across the canyon is what carries the beat while the
  // forward speed sits flat at ~205 u/s.
  { t: T_SIGN_1, pos: [-48, 166, 3200], tgt: [-14, 160, 3850], fov: 61 },
  // ── Dead centre, and the push starts. Nothing leans again until the bowl.
  { t: T_SIGN_2, pos: [0, 146, 3620], tgt: [0, 156, 4270], fov: 59 },
  // ── The descent. The camera gets DOWN before it gets fast, because what
  //    reads as speed out here is not units per second — the alternate cut
  //    crosses the apron at 185 u/s over empty dark ground with nothing near
  //    the lens, which is why it feels like a drift. It is things going past
  //    close.
  { t: 16.7, pos: [0, 106, 3880], tgt: [0, 158, 4480], fov: 58 },
  // UNDER the third canyon crossing — a 980-wide deck at y=120 spanning
  // z=4063…4097, piers at x=±333, so the corridor itself is clear and the
  // camera passes beneath the deck with about twenty units to spare
  // (measured: y=95.4 at z=4051, y=93.5 at z=4099). The deck itself never
  // appears — the lens is pitched up at the wall by then and it goes by
  // overhead, out of frame. What the low line buys is the apron: at y≈90 the
  // ground and its traffic stream under the camera instead of sitting a
  // hundred and fifty units below it, and that is the speed.
  { t: 17.7, pos: [0, 90, 4180], tgt: [0, 172, 4700], fov: 57 },
  // ── The line, arriving flat and low off the skim: 76 units up, and still
  //    accelerating (216 → 300 → 358 u/s). Low and looking UP, because the
  //    facade has to tower on the line — at eye level with the rim it reads
  //    as a scale model on a table instead.
  { t: T_STADIUM, pos: [0, 76, 4520], tgt: [0, 202, 4980], fov: 55 },
  // ── The climb. Up and over the wall on the line, off a much lower start,
  //    so the vault is a bigger move than the deceleration cut's for the
  //    same rim key.
  { t: 19.6, pos: [0, 160, 4706], tgt: [0, 190, 5240], fov: 57 },
  { t: T_RIM, pos: [0, 246, 4838], tgt: [0, 128, 5330], fov: 62 },
  // ── Inside. Down over the ocean of people toward the stage.
  { t: 21.6, pos: [0, 228, 4960], tgt: [0, 74, 5420], fov: 64 },
  { t: 23.4, pos: [0, 168, 5050], tgt: [0, 56, 5470], fov: 61 },
  { t: T_STAGE, pos: [0, 104, 5096], tgt: [0, 48, 5480], fov: 56 },
  // ── The stage holds while the seven arrive. Barely any move at all: this
  //    is the one moment in the act that is about something other than
  //    travelling, and it needs to sit still to read as one.
  { t: T_EXIT, pos: [0, 110, 5080], tgt: [0, 48, 5480], fov: 55 },
  // ── And out. A SWOOP, not a drift: up just far enough to clear the rim
  //    and then flat, running for the pass. The previous pass climbed to 770
  //    to keep the stage's sight line over the wall, and the cost of that was
  //    the whole stadium legible for ten seconds while the camera crawled
  //    away from it. The interior is switched off past the range instead —
  //    which is where you stop being able to see into it anyway.
  //
  //    ── The route is the one it always was; the TIMING is not. ──
  //    These keys are derived rather than dialled: the shot's line through
  //    the world (height, look-ahead and focal length as functions of z, and
  //    the dip to 169 that threads the pass) is unchanged to the unit from
  //    the version before, and every t was recomputed from a target FILM-time
  //    speed curve — a build with no plateau in it, from 0 through 6,700 u/s,
  //    and then nearly a second of ease-out into the far end. The old spacing
  //    put ten story-seconds (the city, the plain, the pass) at a near
  //    constant 500-600 u/s and let the warp's rising rate do all the
  //    accelerating, so the middle of the move read as one flat fast note
  //    with a surge tacked on the end of it.
  { t: 28.53, pos: [0, 138, 5031], tgt: [0, 69, 5441], fov: 56.5 },   // film 28.4
  { t: 30.13, pos: [0, 221, 4832], tgt: [0, 115, 5343], fov: 59.6 },  // film 29.4
  { t: 32.37, pos: [0, 253, 4298], tgt: [0, 158, 5008], fov: 62.5 },  // film 30.35
  { t: 35.22, pos: [0, 264, 3226], tgt: [0, 188, 4066], fov: 64.4 },  // film 31.2
  { t: 38.73, pos: [0, 251, 1229], tgt: [0, 223, 2176], fov: 63.1 },  // film 32.0
  // The pass: down to 169 to thread the gap in the ridge line, and back up.
  { t: T_RANGE, pos: [0, 169, -255], tgt: [0, 238, 783], fov: 58.1 }, // film 32.38
  { t: 42.60, pos: [0, 266, -2104], tgt: [0, 244, -992], fov: 62.0 }, // film 32.75
  { t: 44.50, pos: [0, 378, -4267], tgt: [0, 270, -3069], fov: 62.0 },// film 33.11
  { t: 46.27, pos: [0, 436, -6486], tgt: [0, 291, -5215], fov: 60.6 },// film 33.45
  { t: 47.95, pos: [0, 464, -8768], tgt: [0, 313, -7425], fov: 58.3 },// film 33.8
  { t: 49.22, pos: [0, 469, -10359], tgt: [0, 328, -8966], fov: 56.3 },// film 34.1
  // ── THE TURN. No zigzag — the camera changes direction exactly once —
  //    but it is a SPRING, not a parabola: the bounce's elasticity lives in
  //    the timing, not in a counter-swing. Three beats:
  //      1. arrive fast, speed dying hard into the apex;
  //      2. HANG — a second and a half where the position barely creeps
  //         (the true apex falls inside this stretch) while the focal
  //         length is still opening: the lens lags the body, which is what
  //         stretched-elastic feels like;
  //      3. leave accelerating — 240 u/s at the end of the hang, 485 into
  //         the next key — so the run home is released, not resumed.
  { t: T_WIDE, pos: [0, 488, -11150], tgt: [0, 337, -9723], fov: 58.3 },  // film 35.0
  { t: 51.9, pos: [0, 486, -11080], tgt: [0, 335, -9690], fov: 58.8 },    // the hang — film 35.6
  // ── …and forward: the held breath lets go into the run home.
  { t: 54.71, pos: [0, 416, -10113], tgt: [0, 288, -8784], fov: 52.5 },// film 36.6
  { t: 56.35, pos: [0, 293, -8921], tgt: [0, 187, -7772], fov: 48.2 }, // film 37.0
  { t: 58.04, pos: [-3, 164, -7744], tgt: [0, 107, -7120], fov: 45.1 },// film 37.6
  { t: 59.16, pos: [-6, 87, -7142], tgt: [0, 67, -6859], fov: 43.5 },  // film 38.0
  { t: 59.71, pos: [-6, 53, -6979], tgt: [0, 59, -6745], fov: 42.3 },  // film 38.28
  // ── ACT 3.1. Four figure-heights back, at 3.1's own height, and
  //    travelling at their pace so the frame sits still. TWO seconds, not
  //    four — the walk itself is not the interesting part, and the warp now
  //    runs to T_31 = 62, so the first two seconds of what used to be the
  //    hold are the warp's own deceleration lane (the camera is near-still
  //    through them either way; only the clock changed).
  { t: 60, pos: [-6, 47, -6952], tgt: [0, 60, -6712], fov: 42 },
  { t: T_31, pos: [-6, 46, -6929], tgt: [0, 59, -6689], fov: 42 },
  { t: T_31_END, pos: [-5, 47, -6907], tgt: [0, 60, -6667], fov: 42 },

  // ══ CUT ══ Night, under a tree on the verge.
  //
  //    ONE ORBIT AND ONE TILT, and both of them are about PAIR_GAZE.
  //
  //    The shot opens in front of them, at their eye level, while they are
  //    still watching the ground — held, not locked off (see `handheld`) —
  //    and pushes in on focal length alone. Their heads go back over
  //    68.4→70.4 (`restingSkeleton`'s ramp), and the camera goes with them:
  //    it swings a full 180° round to the far side, rising the whole way,
  //    and comes off their shoulders onto the line they are looking down.
  //
  //    The azimuth needs no separate keying. Standing behind someone and
  //    looking at them IS looking along the way they face, so an orbit that
  //    keeps them centred arrives at PAIR_GAZE's bearing on its own — the
  //    only thing scheduled by hand is the ELEVATION, which lifts off them
  //    (−23°) and onto the gaze (+40.4°) over 72.4→74.2, once the shot has
  //    got round to their shoulders. They are out of frame from about 73.2,
  //    which is also where the trunk would have come between the lens and
  //    them: the tilt takes the frame off them exactly as it has to.
  //
  //    The previous version tilted straight up from a standstill. It read as
  //    a crane in an empty field because nothing in it said whose look it
  //    was, and it landed on the sky's own bearing rather than on theirs —
  //    which was a hundred and eighty degrees away from where they were
  //    facing. `ascendedSky` now hangs the river on PAIR_GAZE instead.
  //
  //    ── WHY THE SWING IS SHALLOW AND WHY IT IS SLOW ──
  //    "0:52 star gazing flipping like that is too weird" — and it was, for a
  //    reason that is measurable rather than aesthetic. A `lookAt` camera on
  //    the world's up never rolls, but the PICTURE inside it rotates at
  //    ψ̇·sin(elevation): yaw, at elevation, spins the frame. The first pass
  //    swung 126° of yaw while the aim sat 30° BELOW the horizon and then
  //    whipped it up through level at 157°/s, which turned the frame 52° one
  //    way and then reversed it — the reversal landing at story 73.3, dead on
  //    the note. That is the flip. It is not `lookAt` going degenerate at the
  //    pole (nothing here gets within 50° of vertical) and no amount of
  //    easing fixes it, because the total rotation is a property of the PATH.
  //
  //    So the path changed, in the only two ways that touch that integral:
  //    the aim through the orbit sits ~8° shallower (the two targets below
  //    used to point BELOW the valley floor, at y=−87 and y=−68, which bought
  //    nothing but sine), and the swing is spread across 2.3 s of the hold at
  //    the end instead of 1.4 s. Measured, level camera, over 68→76:
  //
  //                        peak aim   peak frame-spin   total spin
  //        before           157°/s         40°/s           52°
  //        now               84°/s         33°/s           46°
  //
  //    A transported (rotation-minimising) up vector kills the spin outright
  //    and was tried; it is the wrong trade here, because the horizon is in
  //    frame right through the whip and it arrives at 45° off level. Roll is
  //    only free where there is no horizon to measure it against, and this
  //    shot has one until 74.2.
  { t: T_TREE, cut: true, pos: [150, 40, -2557], tgt: [528, 11, -2682], fov: 44 },
  { t: 66.6 - TREE_TRIM, pos: [150, 40, -2557], tgt: [528, 11, -2682], fov: 40 },
  // Their heads start back here…
  { t: 68.4 - TREE_TRIM, pos: [150, 40, -2557], tgt: [528, 11, -2682], fov: 36 },
  // …and the camera leaves with them, screen-RIGHT (which from this bearing
  // is +z) and up.
  { t: 69.2 - TREE_TRIM, pos: [150, 40, -2557], tgt: [528, 11, -2682], fov: 34 },
  { t: 70.1 - TREE_TRIM, pos: [163, 50, -2536], tgt: [512, -9, -2724], fov: 34.5 },
  { t: 71.0 - TREE_TRIM, pos: [203, 64, -2501], tgt: [445, -40, -2802], fov: 36.5 },
  { t: 71.9 - TREE_TRIM, pos: [269, 90, -2480], tgt: [312, -58, -2836], fov: 41 },
  // Square on their shoulders, the trunk past them — the one frame in the
  // orbit that shows the pose in profile: heads back, hands planted.
  { t: 72.6 - TREE_TRIM, pos: [332, 128, -2487], tgt: [115, -38, -2760], fov: 46 },
  // And UP. The climb is steep on purpose: a crown 130 units across is
  // between the lens and them from here on, and a camera that comes round
  // level with it hangs a black icosahedron in the middle of the frame for
  // two seconds. From above, the same tree is a rim along the bottom edge
  // and then nothing at all.
  // (Spread over 1.6 s rather than 1.2 — the elevation whip peaked hard
  //  enough to read as a flick, and stretching the climb is the only lever
  //  that lowers peak frame-spin without changing the path's total spin.)
  { t: 74.2 - TREE_TRIM, pos: [391, 190, -2521], tgt: [30, 335, -2428], fov: 52 },
  { t: 75.3 - TREE_TRIM, pos: [426, 238, -2584], tgt: [161, 497, -2435], fov: 58 },
  // Behind them, above the tree, looking up their own line…
  { t: 75.75 - TREE_TRIM, pos: [427, 272, -2649], tgt: [162, 531, -2499], fov: 63 },
  { t: 76.0 - TREE_TRIM, pos: [429, 279, -2661], tgt: [160, 539, -2511], fov: 66 },

  // ── NO CUT. The camera SAILS home.
  //
  // This was a cut hidden mid-sky (direction and fov matched across it),
  // and it could not be made invisible: the river, the stars and the moon
  // all live at finite distance, so a seventeen-hundred-unit position jump
  // reads as one frame of parallax stutter however well the angles agree —
  // and the terrain at the bottom edge changed between the two frames.
  //
  // So the camera now flies the distance instead, aimed up the river the
  // whole way: off the tree at 76, down the valley at nine hundred units a
  // second — nothing near the lens to betray the speed, the sky drifting
  // instead of jumping — braking as the aim comes down through the range,
  // and settling onto the road behind the walkers exactly where the old
  // pan-down landed. The pair are off frame for all of it, so the story's
  // sleight of hand (it is a long way from the tree to the house, and we
  // never watch them cover it) survives with the act's one-camera rule
  // intact: the interior at T_33 is the only cut left in Acts 1–3.
  { t: 76.9 - TREE_TRIM, pos: [185, 205, -1905], tgt: [-70, 455, -1760], fov: 63 },
  { t: 77.5 - TREE_TRIM, pos: [30, 105, -1310], tgt: [-140, 230, -1135], fov: 55 },
  // The tilt comes down through the range and finds them on the road…
  { t: 78.1 - TREE_TRIM, pos: [-26, 62, -985], tgt: [-70, 115, -750], fov: 45 },
  // …and from here the original arc plays: swinging out to screen-right
  // while still closing, three-quarters on them with the house past their
  // shoulders by the last second. Looking down +z, screen-right is world −x.
  { t: 78.8 - TREE_TRIM, pos: [-70, 56, -944], tgt: [-16, 70, -700], fov: 40 },
  { t: 80.3 - TREE_TRIM, pos: [-140, 50, -848], tgt: [-14, 66, -620], fov: 38 },
  { t: 81.9 - TREE_TRIM, pos: [-196, 44, -724], tgt: [-12, 62, -556], fov: 38 },

  // ══ CUT ══ Act 3.3, inside. World = (HOUSE_X, VALLEY_Y + 7, HOUSE_Z) +
  //    3.3's local × 20.
  { t: T_33, cut: true, pos: [1, 37, -350.8], tgt: [0, 31, -407.2], fov: 42 },
  { t: FLIGHT_END, pos: [0, 36.2, -356.8], tgt: [0, 30.6, -407.6], fov: 41.5 },
]

/** Cubic Hermite with Catmull-Rom (finite-difference) tangents, non-uniform
 *  in t. Continuous position AND velocity at every key. */
function hermite(
  p0: number, p1: number, m0: number, m1: number, s: number, dt: number,
): number {
  const s2 = s * s
  const s3 = s2 * s
  return (
    (2 * s3 - 3 * s2 + 1) * p0 +
    (s3 - 2 * s2 + s) * dt * m0 +
    (-2 * s3 + 3 * s2) * p1 +
    (s3 - s2) * dt * m1
  )
}

function tangent(prev: number, next: number, tPrev: number, tNext: number): number {
  return (next - prev) / Math.max(1e-6, tNext - tPrev)
}

export type Pose = {
  pos: [number, number, number]
  tgt: [number, number, number]
  fov: number
}

/** What `makeFlightPose` returns: the camera of one cut of the act. */
export type PoseFn = (time: number, out?: Pose) => Pose

const scratch: Pose = { pos: [0, 0, 0], tgt: [0, 0, 0], fov: 60 }

/**
 * Build an evaluator for a keyframe list. `flightPose` is this over `KEYS`;
 * alternate cuts of a stretch of the act (see `flightApproachB.ts`) are the
 * same function over a spliced copy, so a variant never has to carry its own
 * copy of the interpolation and can never drift from it.
 */
export function makeFlightPose(keys: Key[]) {
  /** For each key index, the [first, last] key index of the segment it is in. */
  const segments: [number, number][] = (() => {
    const bounds: [number, number][] = []
    let start = 0
    for (let i = 1; i <= keys.length; i++) {
      if (i === keys.length || keys[i].cut) {
        for (let k = start; k < i; k++) bounds[k] = [start, i - 1]
        start = i
      }
    }
    return bounds
  })()

  /** Evaluate at world time t (seconds from the top of the song). */
  return function pose(time: number, out: Pose = scratch): Pose {
    const t = Math.max(keys[0].t, Math.min(keys[keys.length - 1].t, time))
    // Last key at or before t. Ties go to the LATER key, so on the exact frame
    // of a cut the new segment is already showing.
    let i = 0
    for (let k = 0; k < keys.length; k++) if (keys[k].t <= t) i = k
    const [lo, hi] = segments[i]
    if (i >= hi) {
      // Past the end of this segment: hold its last pose rather than easing
      // toward a shot that is somewhere else entirely.
      const k = keys[hi]
      out.pos[0] = k.pos[0]; out.pos[1] = k.pos[1]; out.pos[2] = k.pos[2]
      out.tgt[0] = k.tgt[0]; out.tgt[1] = k.tgt[1]; out.tgt[2] = k.tgt[2]
      out.fov = k.fov
      return out
    }
    const a = keys[i]
    const b = keys[i + 1]
    const prev = keys[Math.max(lo, i - 1)]
    const next = keys[Math.min(hi, i + 2)]
    const dt = b.t - a.t
    const s = dt > 1e-6 ? (t - a.t) / dt : 0

    for (let c = 0; c < 3; c++) {
      out.pos[c] = hermite(
        a.pos[c], b.pos[c],
        tangent(prev.pos[c], b.pos[c], prev.t, b.t),
        tangent(a.pos[c], next.pos[c], a.t, next.t),
        s, dt,
      )
      out.tgt[c] = hermite(
        a.tgt[c], b.tgt[c],
        tangent(prev.tgt[c], b.tgt[c], prev.t, b.t),
        tangent(a.tgt[c], next.tgt[c], a.t, next.t),
        s, dt,
      )
    }
    out.fov = hermite(
      a.fov, b.fov,
      tangent(prev.fov, b.fov, prev.t, b.t),
      tangent(a.fov, next.fov, a.t, next.t),
      s, dt,
    )
    return out
  }
}

/** Evaluate the flight at world time t (seconds from the top of the song). */
export const flightPose = makeFlightPose(KEYS)

/* ══ The hand on the camera ═════════════════════════════════════════
 * Act 3.2 is the only shot in Acts 1–3 that is being HELD. Everything else
 * is a crane or a drone and is dead steady, because it is describing a
 * landscape; the one shot that is describing two people sitting on the
 * ground gets somebody holding the lens, and it wants that most while the
 * frame is otherwise still.
 *
 * Three incommensurable sines per axis, so nothing repeats inside the
 * twelve seconds, and no accumulated state anywhere: this has to be a pure
 * function of t or `?t=` scrubbing, the ⏱ scrubber and Remotion's
 * frame-addressed render would each land somewhere different.
 *
 * The target carries the position's offset PLUS a smaller one of its own —
 * shifting both together is a dolly and changes nothing about the framing;
 * it is the difference between them that is the sway.
 */
const HANDHELD: Pose = { pos: [0, 0, 0], tgt: [0, 0, 0], fov: 0 }

export function handheld(t: number, out: Pose = HANDHELD): Pose {
  const gate = smooth01((t - T_TREE) / 0.9) * (1 - smooth01((t - (T_32 - 0.9)) / 0.9))
  if (gate <= 0) {
    out.pos[0] = out.pos[1] = out.pos[2] = 0
    out.tgt[0] = out.tgt[1] = out.tgt[2] = 0
    return out
  }
  // Half of it once the orbit is under way — a swing supplies its own life,
  // and a hand-shake on top of a moving camera reads as a dropped frame.
  const k = gate * (1 - 0.5 * smooth01((t - (70.4 - TREE_TRIM)) / 3.2))
  const n = (f: number, p: number) => Math.sin(t * f + p)
  const px = k * (1.30 * n(0.83, 0.0) + 0.60 * n(2.11, 1.7) + 0.28 * n(4.70, 0.4))
  const py = k * (0.95 * n(0.61, 2.3) + 0.44 * n(1.79, 0.9) + 0.20 * n(3.90, 2.8))
  const pz = k * (1.30 * n(0.71, 4.1) + 0.60 * n(1.93, 3.2) + 0.28 * n(4.30, 1.1))
  out.pos[0] = px; out.pos[1] = py; out.pos[2] = pz
  out.tgt[0] = px + k * (2.3 * n(0.47, 1.2) + 1.0 * n(1.31, 5.0))
  out.tgt[1] = py + k * (1.9 * n(0.53, 3.4) + 0.9 * n(1.51, 2.1))
  out.tgt[2] = pz + k * (2.3 * n(0.43, 0.6) + 1.0 * n(1.21, 4.4))
  return out
}

/* ══ Shared easing / noise ══════════════════════════════════════════ */
export const clamp01 = (x: number) => Math.max(0, Math.min(1, x))
export const smooth01 = (x: number) => {
  const c = clamp01(x)
  return c * c * (3 - 2 * c)
}
/** Ramp from a→b over [t0,t1], smoothstepped. */
export function ramp(t: number, t0: number, t1: number, a = 0, b = 1): number {
  return a + (b - a) * smooth01((t - t0) / Math.max(1e-6, t1 - t0))
}

/* ══ The beat ═══════════════════════════════════════════════════════
 * Measured off the track rather than guessed: an onset-flux envelope from
 * body-to-body.mp3, autocorrelated for tempo and then comb-filtered over a
 * fine BPM/phase grid. 120.0 BPM with the first beat at 0:00.472 scores 1.81
 * against 0.15 for the 124 BPM this used to assume, and it lands on the
 * lyric anchors: 0:26.52 falls 46 ms off a beat, 0:44.99 falls 14 ms off.
 *
 * Everything that pulses in this act pulses off this one clock, so the
 * stadium, the crowd, the light rig and the wall all hit together — and they
 * now hit with the record.
 */
export const BPM = 120
export const BEAT = 60 / BPM
/** Seconds from the top of the song to the first beat. */
export const BEAT_PHASE = 0.472

/** 0…1 position within the current beat. */
export function beatPhase01(t: number): number {
  const p = ((t - BEAT_PHASE) / BEAT) % 1
  return p < 0 ? p + 1 : p
}
export const T_DROP = 20.31

/** 0…1 sawtooth-with-decay on every beat. Silent before the stadium is in
 *  frame — nothing should be throbbing while we are still in the mountains.
 *  This is the LIGHT: a hard attack is right for a lamp. */
export function beatPulse(t: number, from = T_STADIUM - 2): number {
  if (t < from) return 0
  const p = beatPhase01(t)
  // Dies on the jerk (T_HEY): the clock runs 4.6× from that frame, and a
  // pulse still going would be a lamp flickering at 9 Hz.
  return Math.exp(-p * 5.5) * smooth01((t - from) / 1.5) * (1 - smooth01((t - T_HEY) / 1.0))
}

/**
 * And this is the BODY: a raised cosine over the beat, so a jump leaves the
 * ground and lands instead of teleporting. Driving the crowd's height off
 * beatPulse (an instant rise and an exponential fall) made forty thousand
 * people flicker vertically once a beat, which reads as a glitch rather than
 * as a room full of people going up.
 */
export function beatJump(t: number, from = T_STADIUM - 2): number {
  if (t < from) return 0
  const arc = 0.5 - 0.5 * Math.cos(2 * Math.PI * beatPhase01(t))
  // Dies on the jerk (T_HEY), same reason as beatPulse: forty thousand
  // people jumping at 4.6× the record's tempo would show.
  return arc * smooth01((t - from) / 1.5) * (1 - smooth01((t - T_HEY) / 1.0))
}

/**
 * 0 = night, 1 = the dusk the film's next scene lives in. The pull-out turns
 * the world over from the night of Act 1 into the sunset Act 3.1 opens on,
 * so the last frame of Act B and the first frame of 3.1 are the same range
 * under the same light.
 */
export function dayTint(t: number): number {
  // Reaches full dusk by 0:47 and holds — everything after that is the sun
  // coming up rather than the sky still turning.
  return smooth01((t - 32) / 13)
}

/**
 * How high and how warm the sun is. Up over the fields for Act 3.1's golden
 * hour, and then down — because Act 3.2 is night, and the film's order is
 * sunset road, then dark, then home. Everything warm in the valley is
 * multiplied by this: the key light, the sun sprite, the haze, the dust.
 */
export function sunRise(t: number): number {
  return smooth01((t - 44) / 12) * (1 - nightFall(t))
}

/**
 * 0 → 1 the moment the act cuts away from the golden hour: the moon back,
 * the fog cold, the paddies black, the lamp in the house and the windows of
 * fifty farmsteads the only warm things left.
 *
 * This is a STEP, not a ramp, and that is only allowed because it happens on
 * a cut. There is no half-second of the tree scene lit like a sunset.
 */
export function nightFall(t: number): number {
  return t >= T_TREE ? 1 : 0
}

/** Inside the house for the last fourteen seconds — everything the valley
 *  lights has to stand down, or Act 3.3's small warm room gets a moon in it. */
export function indoors(t: number): boolean {
  return t >= T_33
}

/* ══ The two of them, as light ══════════════════
 * They ARE light, so which one is which can live in the emission rather than
 * in the body. The parent is the deeper, steadier gold and the child the
 * brighter, cooler one (`goldParent` / `goldChild` in materials.ts) — and
 * across the last stretch home the two CROSS OVER. The parent's light goes
 * down; the child's, up on their shoulders, comes up past it. By the door
 * the brightest thing in frame is no longer the one doing the carrying.
 *
 * The crossover happens INSIDE the two cuts, never across a frame where the
 * two of them match: the pair go under the tree one way round at 1:04 and
 * come out of it the other way at 1:16.
 */

/**
 * Three gutters, not a shimmer.
 *
 * A continuous sine-noise flicker — the first pass ran one at 0.34 amplitude
 * — reads as a failing fluorescent tube, i.e. as a rendering fault, and it
 * never stops, so it stops meaning anything within two seconds. Three
 * deliberate stutters read as a person who is nearly out of road. Each is a
 * fast fall (down inside 30 ms), one ragged re-dip, and a slower recovery.
 */
const GUTTERS = [77.4, 79.15, 80.9]
const GUTTER_DUR = 0.62
const GUTTER_DEPTH = 0.52

function gutter(t: number): number {
  let dip = 0
  for (const t0 of GUTTERS) {
    const u = (t - t0) / GUTTER_DUR
    if (u <= 0 || u >= 1) continue
    const env = Math.sin(Math.PI * Math.pow(u, 0.42))
    dip = Math.max(dip, env * (0.78 + 0.22 * Math.sin(u * 26)))
  }
  return 1 - GUTTER_DEPTH * dip
}

/** The parent's light: steady the whole way out, then going, on the run in
 *  to the door. Multiplies their emissive. */
export function parentGlow(t: number): number {
  return ramp(t, T_32, T_33, 1, 0.62) * gutter(t)
}

/** The child's, coming up to meet it over the same six seconds. */
export function childGlow(t: number): number {
  return ramp(t, T_32, T_33, 1, 1.30)
}

/* ══ Palette ════════════════════════════════════════════════════════ */
export const NIGHT_SKY_TOP = '#050A1A'
export const NIGHT_SKY_LOW = '#123048'
export const MOON_COLOR = '#EAF2FF'
export const RIDGE_DARK = '#0B1526'
export const RIDGE_LIT = '#33506E'
export const CITY_HAZE = '#160E2E'
export const GOLD = '#FFC978'
export const GOLD_BRIGHT = '#FFF0CC'
export const GOLD_DEEP = '#F0A03C'
export const PURPLE = '#8B4FE0'
export const PURPLE_DEEP = '#4A1D82'
export const CYAN = '#5FE6FF'
