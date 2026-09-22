/**
 * Which rendered segment belongs to which timeline slot.
 *
 * `render-fast` names each cached segment `<key>@<from>+<duration>.mp4`, and
 * that name is the entire staleness mechanism: retiming a slot changes its
 * `from` or `duration`, so the segment it would need has a different name and
 * the cache misses BY CONSTRUCTION. The preview tab reads the same names to
 * answer "is what I am watching current" — no timestamps, no hashing, just
 * set membership.
 *
 * Kept beside the timeline types rather than in the panel so the two ends of
 * that convention (scripts/render-fast.mjs and the studio) have one place to
 * disagree if it ever changes.
 */
import type { TimelineItem } from '../remotion/timeline'

export function segmentName(item: TimelineItem): string {
  return `${item.key}@${item.from}+${item.duration}.mp4`
}
