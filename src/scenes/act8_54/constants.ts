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
 * The glow-to-the-beat window: ONLY the first run of bigger beats, from the
 * heavy hit at 18.06 until the levels lift (~21s). Pulsing the whole scene
 * read as tacky — everywhere else the light holds steady.
 */
export const PULSE_HITS = [18.06, 18.82, 20.06, 20.82]

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

/* ── Camera phase boundaries (see CameraRig) ─────────────────────── */
export const T_RISE = 16.2      // camera starts climbing (line 3: "the one who leaves…")
export const T_TOPDOWN = 24.6   // fully bird's-eye
export const T_SWING = 33.9     // top-down → side view of the ascent
export const T_SIDE = 41.0      // side view reached
export const T_LAND = 45.0      // landed on the road, looking up

/* ── World layout ────────────────────────────────────────────────── */
export const HOUSE_Z = -26
export const GOLDEN_Z = -20
/** The dirt road snakes toward the house; x as a function of z. */
export function roadX(z: number): number {
  return 2.2 * Math.sin((z - HOUSE_Z) * 0.09)
}
export const GOLDEN_POS: [number, number, number] = [roadX(GOLDEN_Z), 0, GOLDEN_Z]

/** Sky dome the souls rise to (world-space). */
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
