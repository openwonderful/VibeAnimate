/**
 * The Lantern Keeper — story film master timeline (docs/studio/STORY.md).
 * Same shape and one-line-literal convention as src/remotion/timeline.ts.
 */
import { FPS } from '../../scenes/manifest'

export type StoryTimelineItem = {
  key: string
  from: number
  duration: number
}

export const STORY_TIMELINE: StoryTimelineItem[] = [
  { key: 'story.1', from: 0, duration: 10 },   // Waking the lanterns (dusk wide)
  { key: 'story.2', from: 10, duration: 10 },  // The follower (night lane)
  { key: 'story.3', from: 20, duration: 10 },  // The bridge (river crossing)
  { key: 'story.4', from: 30, duration: 10 },  // The climb (shrine steps)
  { key: 'story.5', from: 40, duration: 10 },  // The passing (the handover)
  { key: 'story.6', from: 50, duration: 10 },  // First light (dawn + title)
]

/** The anime cut — same beats, every shot through AnimeLook. */
export const STORY_ANIME_TIMELINE: StoryTimelineItem[] = [
  { key: 'story.1-B', from: 0, duration: 10 },  // Waking the Lanterns (anime)
  { key: 'story.2-B', from: 10, duration: 10 }, // The Follower (anime toon)
  { key: 'story.3-B', from: 20, duration: 10 }, // The Bridge (anime)
  { key: 'story.4-B', from: 30, duration: 10 }, // The Climb (anime)
  { key: 'story.5-B', from: 40, duration: 10 }, // The Passing (anime)
  { key: 'story.6-B', from: 50, duration: 10 }, // First Light (anime)
]

/** Overlay track (compositor lane): stacked above the base track. */
export const STORY_OVERLAYS: StoryTimelineItem[] = [
  { key: 'fx.letterbox', from: 0, duration: 60 },
]

export const STORY_DURATION_SEC = 60
export const STORY_DURATION_FRAMES = STORY_DURATION_SEC * FPS

for (let i = 1; i < STORY_TIMELINE.length; i++) {
  const prev = STORY_TIMELINE[i - 1]
  if (STORY_TIMELINE[i].from < prev.from + prev.duration) {
    throw new Error(`story timeline overlap: '${prev.key}' runs past '${STORY_TIMELINE[i].key}'`)
  }
}
