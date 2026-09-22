/**
 * Timecode — the studio's frame coordinate system.
 *
 * "What frame am I on" has FIVE answers in this editor, and conflating any
 * two of them is how a readout becomes a plausible lie:
 *
 *   1. scene-local seconds — `getAnimTime()`, what every scene is authored in
 *   2. clip-local          — `animTime − offsetSec`; 0 at the clip's first frame
 *   3. master/film         — `masterFrom + animTime`, per film (there are three)
 *   4. song                — numerically identical to 3
 *   5. Acts 1–3 STORY time — `storyTime()`, which runs ahead by `WARP_LAG`
 *
 * This module owns 1–4. Story time stays in `scenes/actB/flight.ts`, where
 * the map between it and film time lives.
 *
 * `offsetSec` is a real in-point (timeline.ts renders it as a nested negative
 * Sequence), so clip-local and scene-local genuinely differ the moment you
 * blade a clip. Before that they are the same number, which is exactly why
 * the distinction is easy to get wrong and worth having in one place.
 */
import { FPS } from '../scenes/manifest'
import type { ViewTarget } from './types'

export { FPS }

/**
 * Seconds → integer frame index.
 *
 * ONE canonical count, which is the whole point: computing minutes, seconds
 * and frames from `t` independently meant they could disagree. Thirty
 * →-presses from zero leaves the clock at 0.9999999999999999 (rAF
 * accumulates floats), which the old code printed as `0:00.29` — right frame
 * field, stale second field — instead of `0:01.00`. The epsilon is in FRAMES
 * (≈33 ns of clock): enough to absorb accumulated stepping, far too small to
 * swallow a real sub-frame value.
 */
export function frameOf(t: number, fps = FPS): number {
  return Math.floor(t * fps + 1e-6)
}

/** Seconds → `m:ss.ff`, where the last field is FRAMES, not centiseconds. */
export function fmtTime(t: number, fps = FPS): string {
  const neg = t < 0
  const total = frameOf(Math.abs(t), fps)
  const f = total % fps
  const secs = (total - f) / fps
  const s = secs % 60
  const m = (secs - s) / 60
  return `${neg ? '-' : ''}${m}:${String(s).padStart(2, '0')}.${String(f).padStart(2, '0')}`
}

/** `m:ss` — for places where the frame field is noise (durations, tooltips). */
export function fmtClock(t: number): string {
  const neg = t < 0
  const total = Math.max(0, Math.round(Math.abs(t)))
  return `${neg ? '-' : ''}${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}

/**
 * A frame count back to the seconds it starts at. The inverse of `frameOf`
 * for whole frames; used when a typed frame number has to become a seek.
 */
export function timeOfFrame(frame: number, fps = FPS): number {
  return frame / fps
}

/** Every frame coordinate for one instant, resolved together. */
export type FrameReadout = {
  fps: number
  /** Frame within the CLIP — 0 at its first frame. Can go negative if the
   *  clock is parked before the in-point (a seek into a gap). */
  clipFrame: number
  /** Frames the clip lasts; its last frame is `clipFrames - 1`. */
  clipFrames: number
  /** Frame within the SOURCE SCENE — what `render:act --frames` addresses. */
  sceneFrame: number
  /** Frame on the film's master timeline; null when the shot is detached. */
  masterFrame: number | null
  /** The film's length in frames; null when detached. */
  masterFrames: number | null
}

/**
 * Resolve every coordinate at once.
 *
 * `animTime` MUST be scene-local — i.e. `getAnimTime()`, which already
 * subtracts the global anim-time offset. Passing master time here produces
 * numbers that look right and are not (that was D3: the film player left a
 * stale offset behind and every chip read a consistent lie).
 */
export function readFrames(
  view: ViewTarget,
  animTime: number,
  filmDurationSec: number,
  fps = FPS,
): FrameReadout {
  const clipFrame = frameOf(animTime - view.offsetSec, fps)
  // The in-point and the clip's master start are authored values, not
  // accumulated ones, so they round exactly — only `animTime` needs the
  // floor-with-epsilon above.
  const inFrame = Math.round(view.offsetSec * fps)
  return {
    fps,
    clipFrame,
    clipFrames: Math.round(view.durationSec * fps),
    sceneFrame: inFrame + clipFrame,
    masterFrame: view.masterFrom == null
      ? null
      : Math.round((view.masterFrom + view.offsetSec) * fps) + clipFrame,
    masterFrames: view.masterFrom == null ? null : Math.round(filmDurationSec * fps),
  }
}

/** `2025` → `2,025` — frame numbers get long, and the film is 5,700 of them. */
export function fmtFrame(n: number): string {
  return n.toLocaleString('en-US')
}
