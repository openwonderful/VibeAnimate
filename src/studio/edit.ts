/**
 * Pure timeline-edit math — extracted from the Scenebuilder so the
 * operations are unit-testable (SPEC §12.5 #5).
 */
import type { TimelineItem } from '../remotion/timeline'

/**
 * Move items[fromIdx] to position toIdx and re-pack the film
 * contiguously from the first clip's start (every clip keeps its
 * duration and props).
 */
export function repackOrder(items: TimelineItem[], fromIdx: number, toIdx: number): TimelineItem[] {
  if (fromIdx === toIdx || !items[fromIdx]) return items
  const order = [...items]
  const [moved] = order.splice(fromIdx, 1)
  order.splice(toIdx, 0, moved)
  let at = items[0].from
  return order.map(it => {
    const next = { ...it, from: at }
    at += it.duration
    return next
  })
}

/**
 * Trim items[index] to newDuration; with ripple, later clips shift so
 * the timeline stays contiguous.
 */
export function trimDuration(items: TimelineItem[], index: number, newDuration: number, ripple: boolean): TimelineItem[] {
  const cur = items[index]
  if (!cur || newDuration === cur.duration) return items
  const diff = newDuration - cur.duration
  return items.map((it, i) => {
    if (i === index) return { ...it, duration: newDuration }
    if (ripple && i > index) return { ...it, from: it.from + diff }
    return it
  })
}

/**
 * Blade: split items[index] at `atLocalTime` seconds into the clip.
 * Produces two clips of the same scene; the second starts mid-scene via
 * offsetSec (the render pipeline's in-point). No-op when the cut would
 * land on (or outside) a clip edge.
 */
export function splitClip(items: TimelineItem[], index: number, atLocalTime: number): TimelineItem[] {
  const cur = items[index]
  if (!cur || atLocalTime <= 0 || atLocalTime >= cur.duration) return items
  const first: TimelineItem = { ...cur, duration: atLocalTime }
  const second: TimelineItem = {
    ...cur,
    from: cur.from + atLocalTime,
    duration: cur.duration - atLocalTime,
    offsetSec: (cur.offsetSec ?? 0) + atLocalTime,
  }
  return [...items.slice(0, index), first, second, ...items.slice(index + 1)]
}

/**
 * Insert a scene as a new clip at position `atIndex` and re-pack the film
 * contiguously (the Storyboard's "add to film" drop). `atIndex` is clamped,
 * so appending is just passing items.length.
 */
export function insertClip(
  items: TimelineItem[],
  key: string,
  durationSec: number,
  atIndex: number,
): TimelineItem[] {
  const order = [...items]
  order.splice(Math.max(0, Math.min(atIndex, order.length)), 0, { key, from: 0, duration: durationSec })
  let at = items.length ? items[0].from : 0
  return order.map(it => {
    const next = { ...it, from: at }
    at += it.duration
    return next
  })
}

/** Delete items[index]; with ripple, later clips close the gap. */
export function deleteClip(items: TimelineItem[], index: number, ripple: boolean): TimelineItem[] {
  const cur = items[index]
  if (!cur || items.length <= 1) return items
  return items
    .filter((_, i) => i !== index)
    .map(it => (ripple && it.from > cur.from ? { ...it, from: it.from - cur.duration } : it))
}

/** Duplicate items[index] immediately after itself; later clips shift right. */
export function duplicateClip(items: TimelineItem[], index: number): TimelineItem[] {
  const cur = items[index]
  if (!cur) return items
  const copy: TimelineItem = { ...cur, from: cur.from + cur.duration }
  return [
    ...items.slice(0, index + 1),
    copy,
    ...items.slice(index + 1).map(it => ({ ...it, from: it.from + cur.duration })),
  ]
}
