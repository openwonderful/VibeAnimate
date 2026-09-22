/**
 * Act 6B — the rise-and-grandmother arc: shared vocabulary.
 *
 * The arc runs the empty table → the walk home, replacing 7.1/7.2 in the
 * cut.
 *
 * Its pivot USED TO BE a cut in the song itself: the track died at 126.8 and
 * held eight seconds of true silence for the death alone, then resumed from
 * source 123.0 replaying "Somebody like you, somebody like". That is gone.
 * The record is whole again and film time == song time everywhere, which
 * cost the picture 11.8 seconds — 6.85 went from 20.5s to 9.05s and lost the
 * crowd and the bed to pay for it. The five constants that described the
 * splice (SONG_CUT, SONG_GAP, SONG_RESUME_SRC, FILM_SHIFT, SONG_RETURN) were
 * deleted with it; nothing imported them, and left in place their only
 * remaining function would have been to describe a film that no longer
 * exists. See FILM.md and the 6.85 block in remotion/timeline.ts.
 *
 * The wave is the arc's spine — he waves into broadcast cameras so the
 * grandmother can tell which of the seven is him. One implementation,
 * everywhere, so every wave in the film is recognisably the same gesture
 * (it quotes 5.1's mutual wave; see act5/Act5_1.tsx).
 */

// ── grief palette ───────────────────────────────────────────────────
/** The hero drained: gray, but still the subject — a notch lighter than crowd grey. */
export const HERO_GRAY = '#9A9AA4'
/** His emissive floor when gray (never zero — the glow guts, it does not die). */
export const HERO_GRAY_EMISSIVE = 0.12
/** First thaw at the trophy head-lift — warm gray, not yet gold. */
export const HERO_THAW = '#B8A98E'
/** Hospital / gray-world surfaces, darkest → lightest. */
export const GRIEF_DARK = '#2A2A31'
export const GRIEF_MID = '#3A3A42'
export const GRIEF_BODY = '#5A5A62'
export const GRIEF_LIGHT = '#6E6E76'
/** The stadium of gray souls (6.95 crowd clouds). */
export const SOUL_GRAYS = ['#8E939E', '#AAB0BA', '#6E737E', '#565B66']
/** Gray-violet for the dead ARMY-bomb layer. */
export const SOUL_BOMB_GRAY = '#8A82A0'

/** The interviewed member (6.6): RM's blue — the safest contrast to gold. */
export const INTERVIEW_BLUE = '#5B7BFF'

// ── timing helpers (the house envelope math, re-exported) ───────────
export const clamp01 = (x: number) => Math.min(1, Math.max(0, x))
export const smooth = (x: number) => { const c = clamp01(x); return c * c * (3 - 2 * c) }
export const ramp = (t: number, t0: number, t1: number) => smooth((t - t0) / Math.max(1e-6, t1 - t0))

// ── THE WAVE ────────────────────────────────────────────────────────
/**
 * Figure-local right-hand target for the wave, per 5.1's recipe: the hand
 * rises beside the body to head height (satgat wearers: shoulder height —
 * the 0.42-unit brim swallows anything higher) with a sinusoidal shake.
 * `up` is the raise envelope 0..1 (ramp it in ~0.3–0.4s); `t` is scene time.
 * Feed the result into a `rightHandAt` ref with `solvedArms` on. For a left
 * hand, pass mirror: true and use `leftHandAt`.
 */
export function waveHand(
  t: number,
  up: number,
  opts?: { satgat?: boolean; freq?: number; amp?: number; mirror?: boolean },
): [number, number, number] {
  const satgat = opts?.satgat ?? false
  const freq = opts?.freq ?? (satgat ? 9 : 11)
  const amp = opts?.amp ?? (satgat ? 0.06 : 0.07)
  const sx = opts?.mirror ? -1 : 1
  if (satgat) {
    return [sx * (0.26 + up * 0.2 + Math.sin(t * freq) * amp * up), 0.94 + up * 0.64, 0.06]
  }
  return [sx * (0.3 + up * 0.06 + Math.sin(t * freq) * amp * up), 0.98 + up * 0.8, 0.08 - up * 0.02]
}

/**
 * The 5.1 caregiver's breathing sag, generalised — a light failing without
 * ever toggling. Multiply an emissive intensity by this while a figure
 * drains. u is the drain progress 0..1.
 */
export function gutterSag(t: number, u: number): number {
  const sag = 0.5 + 0.5 * Math.sin(t * 11.3 + 1.7) * Math.sin(t * 4.1)
  return (1 - u * 0.45) * (1 - u * 0.34 * sag)
}

/**
 * THE GUTTER — the grandmother's light, already going.
 *
 * `gutterSag` above is the drain: a one-way ramp for a figure losing its
 * glow inside the shot. This is the other half of that idea and the one the
 * arc needs BEFORE the death: a light that is still full, that sags toward
 * dim and comes back, over and over. She reads gold, then a duller gold,
 * then gold again — never off, never a strobe, never a disappearance. It is
 * the only warning the film gives that 6.85 is coming, and it has to be
 * readable in three seconds without being a light-bulb gag.
 *
 * Returns a multiplier that sits near 1 and sags to 1 − `depth` in the
 * troughs. Three incommensurable frequencies, so no shot is long enough to
 * hear it repeat; the smoothstep on the trough gives each dip a shape rather
 * than a corner. `phase` offsets the pattern between scenes so 6.4 and 6.6
 * are the same affliction and not the same footage.
 */
export function lifeFlicker(t: number, depth = 0.3, phase = 0): number {
  const s =
    Math.sin(t * 1.7 + phase) * 0.5 +
    Math.sin(t * 3.3 + phase * 1.7) * 0.32 +
    Math.sin(t * 6.7 + phase * 2.3) * 0.18
  const dip = clamp01((0.18 - s) / 0.85)
  return 1 - depth * smooth(dip)
}
