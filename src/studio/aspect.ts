/**
 * Aspect ratio — a property of a FILM, not of the preview.
 *
 * The decision on record (ROADMAP "Decisions"): a film can genuinely BE
 * 9:16 or 1:1, so the ratio is declared on `Film` and carried through to the
 * render (S5), with the stage picker as a per-session override for framing
 * checks. This module is the shared vocabulary both ends use.
 *
 * Width and height are the RENDER dimensions, not just a ratio, because
 * Remotion compositions need integers and because "1080p" means different
 * pixel counts in different shapes. Every one is even in both axes — h264
 * chroma subsampling requires it, and an odd dimension fails the encode
 * rather than rounding.
 */

export type AspectId = '16:9' | '9:16' | '1:1' | '4:3' | '2.39:1'

export type Aspect = {
  id: AspectId
  label: string
  width: number
  height: number
  /** What it is FOR — the picker is a framing decision, not a maths quiz. */
  note: string
}

export const ASPECTS: Aspect[] = [
  { id: '16:9', label: '16:9', width: 1920, height: 1080, note: 'the film' },
  { id: '9:16', label: '9:16', width: 1080, height: 1920, note: 'vertical' },
  { id: '1:1', label: '1:1', width: 1080, height: 1080, note: 'square' },
  { id: '4:3', label: '4:3', width: 1440, height: 1080, note: 'academy' },
  { id: '2.39:1', label: '2.39:1', width: 2048, height: 858, note: 'scope' },
]

export const DEFAULT_ASPECT: AspectId = '16:9'

/**
 * "Fit" is not a shape.
 *
 * Every other value in the stage picker answers *what shape is the picture*;
 * this one answers *do I want to see the shape at all*. On a very wide monitor
 * a correctly letterboxed 16:9 leaves a lot of panel unused, and sometimes you
 * would rather have the pixels than the truth — while blocking out a move, or
 * reading a face. It is kept in the same picker because it is the same
 * decision from the user's side ("how is the stage laid out"), and it is
 * flagged as an override for the same reason a shape override is: a stage
 * quietly showing something other than the delivered frame is how eight shots
 * get cut to the wrong crop.
 */
export type StageFit = 'fit'
export const STAGE_FIT: StageFit = 'fit'

export function isStageFit(id: string | null | undefined): id is StageFit {
  return id === STAGE_FIT
}

export function aspectById(id: string | null | undefined): Aspect {
  return ASPECTS.find(a => a.id === id) ?? ASPECTS[0]
}

/** The CSS `aspect-ratio` value — `'1920 / 1080'`. */
export function aspectCss(a: Aspect): string {
  return `${a.width} / ${a.height}`
}

/** Numeric w/h. */
export function aspectRatio(a: Aspect): number {
  return a.width / a.height
}

/**
 * The stage box, as CSS, inside a `container-type: size` parent.
 *
 * THIS IS A BUG FIX WITH A COMMENT ATTACHED, so it does not come back. The
 * stage used to be `width: 100%; aspect-ratio: R; max-height: 100%`, and that
 * does not letterbox — `aspect-ratio` is a *preferred* ratio, so when
 * `max-height` clamps the height the width stays at 100% and the ratio is
 * simply abandoned. On a wide, short panel (which is what a wide monitor with
 * a top bar and a Scenebuilder gives you) a 16:9 film was drawn at nearly 3:1.
 * It looked like a framing choice rather than a bug, which is why it survived:
 * the picture is not distorted, the *frame* is, so you are judging a crop the
 * render will never produce.
 *
 * Deriving the width from BOTH container axes is the fix — `min()` picks
 * whichever edge runs out first, and the height then follows from
 * `aspect-ratio` with nothing left to clamp it. Container units rather than
 * `vh`, because the panel is not the viewport: `100vh` was measuring the whole
 * window, including the chrome above and below the stage.
 */
export function stageBoxCss(a: Aspect, fit: boolean): {
  width: string
  height: string
  aspectRatio?: string
} {
  if (fit) return { width: '100%', height: '100%' }
  return {
    width: `min(100cqw, calc(100cqh * ${aspectRatio(a).toFixed(6)}))`,
    height: 'auto',
    aspectRatio: aspectCss(a),
  }
}

/**
 * The 720p working tier for a shape — the size `<comp>720` renders at.
 *
 * Derived rather than declared so a new shape cannot ship with a delivery
 * size and no draft size. Both axes are forced EVEN: h264 chroma subsampling
 * requires it and an odd dimension fails the encode outright rather than
 * rounding, which is a two-minute render that dies at the last step.
 */
export function draftSize(a: Aspect): { width: number; height: number } {
  const scale = 720 / Math.min(a.width, a.height)
  const even = (n: number) => Math.max(2, Math.round(n / 2) * 2)
  return { width: even(a.width * scale), height: even(a.height * scale) }
}

/**
 * Cache-key fragment for a shape. Empty for 16:9 so the existing segment
 * cache — hundreds of megabytes of it — stays valid.
 *
 * This is load-bearing: `render-fast` stitches segments with a stream copy,
 * which does not re-encode and does not check dimensions. Reusing a 16:9
 * segment inside a 9:16 film would produce a file that concatenates
 * cleanly and plays wrong.
 */
export function aspectTag(id: string | null | undefined): string {
  return !id || id === DEFAULT_ASPECT ? '' : `@${id.replace(':', 'x')}`
}
