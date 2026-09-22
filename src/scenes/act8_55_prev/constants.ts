/**
 * Act 8.54 — "Arirang Ascension: Pulse" — shared constants.
 *
 * Scene-local time: t=0 ↔ song 2:22 (master-timeline slot from=142).
 * Covers the Arirang (2:22–2:56) and finale (2:56–3:10) in one shot: 48s.
 */

/**
 * Kick-drum onsets in the Arirang section, measured from the actual mp3
 * (35–140 Hz band, scene-local seconds). The ignition snaps to these:
 * every hit lights a new burst of people. (6.06 is felt more than heard —
 * the detector missed it under the bass, but the ring belongs there.)
 */
export const BEAT_HITS = [
  2.06, 2.82, 4.08, 4.82, 6.06, 6.82, 8.06, 8.82, 10.10, 10.80,
  12.04, 12.80, 14.06, 14.82, 16.08, 16.82,
]

/** The heavier hits from ~18s — new figures wake on these. */
export const HEAVY_HITS = [18.06, 18.82, 20.06, 20.82, 22.82, 24.06, 24.84, 26.04, 26.82]

/**
 * The glow-to-the-beat window: every heavy hit from Arirang line 3 (17.93) up
 * to line 4 (25.89) — the whole field is lit by then, so the beat lives in the
 * flash, and the last one at 24.84 has decayed out by the time line 4 lands.
 * After that, nothing pulses: the eye is on the souls leaving the ground.
 * (Director's note: flash on beat from the third line just to the start of the
 * fourth, then no more flashing. It used to stop at 20.82.)
 */
export const PULSE_HITS = [18.06, 18.82, 20.06, 20.82, 22.82, 24.06, 24.84]

/** 0..1 surge on the windowed beats; decays naturally after the last one. */
export function beatPulse(t: number): number {
  let p = 0
  for (let i = PULSE_HITS.length - 1; i >= 0; i--) {
    const dt = t - PULSE_HITS[i]
    if (dt < 0) continue
    if (dt > 1.4) break // list is sorted; nothing older matters
    const e = Math.exp(-dt * 4.2)
    if (e > p) p = e
  }
  return p
}

/**
 * Deterministic LCG. Lives here rather than in world.ts because the market
 * layout needs it too, and world.ts imports the market — routing it through
 * constants keeps that from becoming an import cycle.
 */
export function seededRandom(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

/* ── Palette ─────────────────────────────────────────────────────── */
export const GOLD_BRIGHT = '#F0CE7E'
export const GOLD = '#D4A843'
export const GOLD_AMBER = '#C4913A'
export const GOLD_WARM = '#DAB050'
export const GOLD_DEEP = '#8B6914'
export const HOUSE_GLOW = '#F5C36C'
export const PARENT_WARM = '#F5C36C'
export const FIREFLY_GREEN = '#C8E880'
export const MOON_COLOR = '#EAE0CC'
export const STAR_WARM = '#E8C472'
export const STAR_WHITE = '#F2ECDC'
export const STAR_PURPLE = '#B8A0D8'
export const STAR_BLUE = '#A8CCE8'
export const LINE_COLOR = '#8A96C0'
export const NIGHT_BG = '#04070E'
export const FOG_COLOR = '#060B14'

export const WARM_FIGURE_COLORS = [
  GOLD_BRIGHT, GOLD, GOLD_AMBER, GOLD_WARM, GOLD_DEEP, GOLD, GOLD_AMBER,
]

/* ── Song timing (scene-local seconds; slot starts at 2:22 = 142s) ── */
/** Arirang line starts: 아리랑 아리랑 아라리요 / 고개로 넘어간다 / 나를 버리고 / 십리도 못가서 */
export const T_LINES = [1.87, 9.69, 17.93, 25.89]
export const LINE_DUR = 7.8
/** Held breath before the drop — the whole field goes still. */
export const T_STILL_START = 31.6
export const T_STILL_END = 33.9
/** "I need the whole stadium to jump" — the beat drop. Everyone jumps. */
export const T_DROP = 34.26
/** First souls leave the ground shortly after the jump lands. */
export const T_ASCEND = T_DROP + 0.5
export const DURATION_SEC = 48

/**
 * The opening camera, in village units — and therefore Act 7.2's last frame.
 *
 * It lives here, in the act's pure-data module, rather than in `CameraRig`,
 * because two things have to agree on it and neither should import the other's
 * React: this act's rig starts here, and Act 7's `HANDOFF_KEY` is derived from it
 * so that 7.2's final frame IS this frame rather than a good match for it.
 *
 * ── Turned back around ───────────────────────────────────────────────
 * The lens stands ON the road, seven village units DOWN-valley of the two of
 * them, at eye height, looking back up the road: him and the person who came
 * out to meet him mid-frame, the lit door of the house behind them, and Act B's
 * range and its risen city behind that. The crowd banks up either side of the
 * lens and recedes toward the house.
 *
 * That is 8.55-old's frame, and it is here because it is better than the one
 * that replaced it. The version this restores put the lens in the yard looking
 * the other way, which made the shot an intimate two-shot with a festival
 * somewhere behind it; every figure in the ocean was a kilometre off and
 * rasterised as a bokeh dot rather than as a body. See
 * `out/threads/8.55-diagnosis.md`.
 *
 * x is 1.3 and not the old cut's 5.4: Act B's road plus verge is ±53 world
 * units before flooded paddy, which is ±2.65 village, and the crowd generator
 * keeps |x| < 1.7 clear. At 5.4 the lens stood in a field.
 */
export const OPEN_CAM = {
  pos: [5.4, 1.15, -13.0] as [number, number, number],
  tgt: [1.1, 1.00, -20.6] as [number, number, number],
  fov: 42,
}

/* ── Camera phase boundaries (see CameraRig) ─────────────────────── */
export const T_RISE = 16.2      // camera starts climbing (line 3: "the one who leaves…")
export const T_TOPDOWN = 24.6   // fully bird's-eye
export const T_SWING = 33.9     // top-down → side view of the ascent
export const T_SIDE = 41.0      // side view reached
export const T_LAND = 43.6      // landed on the road, looking up (runs early
                                // so the star-centred hold gets 4.4s)

/* ── World layout ────────────────────────────────────────────────── */
export const HOUSE_Z = -26
/**
 * Where he stops, and where the two of them meet.
 *
 * Back to −20, the mark 8.55-old used. It moved to −16 only because that cut
 * put the opening camera BETWEEN the door and the two of them and needed the
 * yard to be deep enough to stand in. The lens is down-road of them again, so
 * the yard does not have to fit anything: Act B's hanok has its front wall at
 * village z = −24.3, which leaves him standing 4.3 units — about four metres —
 * out from it, with the door over his shoulder.
 */
export const GOLDEN_Z = -20
/**
 * The road's x as a function of z — and it is STRAIGHT, because this valley is
 * Act B's valley (see `locale.tsx`) and Act B's road is one 62-unit plane laid
 * down the axis at x=0. This used to snake ±2.2 units toward the house, which
 * at the locale's scale is ±44 world units against a road 31 wide: every figure
 * lining "the road" stood in a paddy, and the hero walked home through the
 * verge.
 *
 * Kept as a function rather than folded away because the whole act reads the
 * road's position through it, and this is the one place to change if Act B's
 * road ever bends.
 */
export function roadX(_z: number): number {
  return 0
}
export const GOLDEN_POS: [number, number, number] = [roadX(GOLDEN_Z), 0, GOLDEN_Z]

/* ── The homecoming, and the light that comes out of it ──────────── */

/**
 * Where the parent stands, and it is BESIDE him on the +x side — the porch
 * side, frame-RIGHT from the opening lens out at x = 5.4.
 *
 * It was at −1.30 across on the FAR side of the road, which is why 7.4's
 * rise-from-the-chair beat had to send them sprinting the whole width of the
 * yard in under two seconds (director's note: "the parent goes all the way to
 * the other side… really quickly, and that's a little bit weird"). On the
 * porch side, the walk down to the road edge is a short, unhurried amble that
 * never crosses the frame — and he is the one who closes the last of the
 * distance, with his hand: his reach leads now (see homecoming.ts).
 *
 * The numbers keep everything the old mark solved for: 1.34 apart (a reach,
 * not a hug — two outstretched arms meet in the middle and no closer), a
 * three-quarter angle to the lens with both hands visible in the gap, and
 * clear of the camera's sightlines to him and to the lit door (the door line
 * passes her depth at x ≈ 1.79; her hat brim ends at 1.60). `TOUCH_POS` is
 * their midpoint and follows.
 */
export const PARENT_MEET_POS: [number, number, number] = [
  GOLDEN_POS[0] + 1.22, 0, GOLDEN_POS[2] - 0.55,
]

/** Where the parent has been waiting: out on the yard, facing up the road. */
export const PARENT_HOME_POS: [number, number, number] = [1.05, 0, HOUSE_Z + 3.0]

/**
 * The parent is SHORTER than him. It used to be the other way round.
 *
 * He left as a child and came back grown, and the height difference is the only
 * thing in the frame that says how long he was gone without saying it. The
 * earlier reading — parent a head taller — is the shape of the relationship in
 * Act 3, when he was small enough to be carried; by the time he walks back up
 * this road he is the tall one and they are the one who has got older.
 *
 * Hero crown = HEAD_Y + RH = 1.89; at 0.90 the parent's is 1.70, about a head
 * short, which reads at a glance without turning them into a child. Act 7.2's
 * arrival reads the same constant, so the two frames either side of the cut
 * agree by construction.
 */
export const PARENT_SCALE = 0.90

/** The moment their hands meet — the first drum hit of the Arirang. */
export const T_TOUCH = BEAT_HITS[0]
/** The parent lights WITH him, on the touch itself — not a beat later.
 *  (It was BEAT_HITS[1]; the note: "have both the characters light up at
 *  the same time when they touch, not just the one kid".) Her ramp is a
 *  shade longer than his (0.7 vs 0.55, see homecoming.ts) so the two bodies
 *  still read as two, but the EVENT is one. */
export const T_PARENT_LIGHT = T_TOUCH

/**
 * Midpoint of the two hands. Everything about the ignition is measured from
 * here rather than from the singer: the light in this scene is not something he
 * brought home, it is something that happened when he got there.
 */
export const TOUCH_POS: [number, number, number] = [
  (GOLDEN_POS[0] + PARENT_MEET_POS[0]) / 2, 1.32, (GOLDEN_POS[2] + PARENT_MEET_POS[2]) / 2,
]

/**
 * Outer edge of the world the ring has to cross (the far wings). The field now
 * lies wholly down-valley of the two hands rather than wrapped around them (see
 * `locale.tsx`), so its far corner is 91 units out instead of 88.
 */
const IGNITE_R_MAX = 88

/**
 * When the ring reaches a figure `d` metres from the touch: the earlier of two
 * curves, which is a radius that ACCELERATES.
 *
 *   near   T_TOUCH + 14.7·(d/34)^1.5 — the close-up ignition, area-weighted so
 *          each early drum hit gets a similar-sized crowd. Bit-identical to the
 *          approved cut out to d ≈ 20 / t ≈ 8.5, where the curves cross.
 *   far    T_TOUCH + 14.7·(d/88)^0.55 — takes over from there and sweeps the
 *          rest of the world by 16.76, so the LAST big beat before Arirang
 *          line 3 (the 16.82 hit) lands the final ring. Every increment is
 *          bigger than the one before it — ~2.4 units/s at the crossover,
 *          10+ by the end — so the growth is the thing you see from altitude.
 *
 * It used to run the far field out to 26.8s; the director's note is that the
 * whole valley — mountains included — must already burn when line 3 starts
 * (song 2:39.93), with the beat carried by the flash from there (PULSE_HITS).
 */
export function igniteRaw(d: number): number {
  return Math.min(
    T_TOUCH + 14.7 * Math.pow(d / 34, 1.5),
    T_TOUCH + 14.7 * Math.pow(d / IGNITE_R_MAX, 0.55),
  )
}

/** Every hit the ring is allowed to land on, in order. */
export const IGNITE_HITS = [...BEAT_HITS, ...HEAVY_HITS].sort((a, b) => a - b)

/**
 * Ring time for a figure, snapped to the nearest drum hit at or after it so the
 * circle grows on the beat rather than sliding. `jitter` is a small per-figure
 * offset in [0,1) — enough that the edge is a crowd and not a laser line, small
 * enough that it stays a circle.
 */
export function igniteTime(d: number, jitter: number): number {
  const raw = igniteRaw(d)
  let snapped = IGNITE_HITS[IGNITE_HITS.length - 1] + 0.3
  for (const h of IGNITE_HITS) {
    if (h >= raw) { snapped = h; break }
  }
  return snapped + jitter * 0.12
}

/** Sky dome the souls rise to (village-space) — centred over the house, which
 *  is where the field is centred. 8.55-old's value, restored with the layout. */
export const SKY_CENTER: [number, number, number] = [0, 2, -22]
export const SKY_R = 66

/* ── Envelopes ───────────────────────────────────────────────────── */
function smooth01(x: number): number {
  const c = Math.min(1, Math.max(0, x))
  return c * c * (3 - 2 * c)
}

/**
 * 0..1 "the crowd is singing" envelope — swells over each Arirang line
 * (attack 1.4s, hold, release 1.8s), rests between lines. Drives sway
 * amplitude, figure glow, the golden figure's halo and the house light.
 */
export function phraseEnv(t: number): number {
  let v = 0
  for (const s of T_LINES) {
    const a = smooth01((t - s) / 1.4)
    const r = 1 - smooth01((t - (s + LINE_DUR - 1.8)) / 1.8)
    v = Math.max(v, Math.min(a, r))
  }
  return v
}

/** 1 → ~0.08 during the held breath before the drop, back to 1 at the drop. */
export function stillness(t: number): number {
  const into = smooth01((t - T_STILL_START) / 0.9)
  const outof = smooth01((t - T_STILL_END) / (T_DROP - T_STILL_END))
  return 1 - 0.92 * Math.min(into, 1 - outof)
}
