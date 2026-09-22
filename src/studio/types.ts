/** Shared Flow Studio editor types. */
import type { TimelineItem } from '../remotion/timeline'

/**
 * Which workspace the middle of the shell is showing:
 *
 *   edit     shots · viewport · inspector — the scene, live
 *   board    the thumbnail storyboard
 *   preview  the film as a rendered video file, chasing the same clock
 *
 * All three are views of ONE state — the same clock, the same selection, the
 * same timeline. Switching changes what you are looking at, not where you
 * are.
 */
export type ViewMode = 'edit' | 'board' | 'preview'

/** The film's soundtrack as the studio is currently playing it. `src` is a
 *  URL — either a path under public/ or an object URL for a file the user
 *  dropped in this session (which is why `name` is carried separately). */
export type SoundtrackState = {
  src: string
  name: string
  /** 0..1. */
  volume: number
  muted: boolean
}

export type Selection =
  | { type: 'clip'; index: number; item: TimelineItem }
  | { type: 'shot'; key: string }
  | { type: 'ingredient'; id: string }
  | null

/** What the viewport is showing: a manifest scene, plus (when the scene
 *  was entered from the master timeline) its master-time offset so the
 *  transport can display both local and master time. */
export type ViewTarget = {
  key: string
  /** Master-timeline start of this clip; null when opened outside the timeline. */
  masterFrom: number | null
  /** Clip duration when known (timeline clip or manifest durationSec). */
  durationSec: number
  /** Clip in-point (scene-local seconds skipped before the clip starts). */
  offsetSec: number
}
