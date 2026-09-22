/**
 * Clip dragging — where it lands, and what that does to its neighbours.
 *
 * Split from the gesture (T1) because the old drag resolved its destination
 * only on RELEASE: it shifted the real clip by raw pixels while you dragged
 * and then guessed a slot from where the centre happened to be. Nothing told
 * you where it would land, nothing snapped, and Esc could not cancel. Pure
 * functions here, gesture in TimelinePanel, unit tests beside splitClip.
 *
 * ── The invariant this has to live inside ────────────────────────────────
 *
 * `remotion/timeline.ts` THROWS AT MODULE LOAD on a gap, an overlap, or a
 * total that is not 3:10. That is not a lint — it means the film will not
 * build. So the timeline is gapless by construction and length-locked.
 *
 * Premiere's overwrite — drop a clip somewhere and leave a hole where it came
 * from — cannot exist inside that. Nor can the length-preserving version of
 * it: lifting the clip out AND destroying what it lands on removes its length
 * twice, which the tests caught by handing back a 25-second cut of a 30-second
 * film. "Overwrite" was never available here under any reading, so the word
 * has been retired along with the attempt.
 *
 * The two modes are:
 *
 *   insert (drag) — DEFAULT   the clip is lifted out and re-inserted at the
 *                             nearest boundary. Every other clip keeps its
 *                             full duration and simply moves. Nothing splits.
 *   splice (Ctrl-drag)        the clip lands EXACTLY where you point, and the
 *                             one clip under the drop point splits around it;
 *                             its tail carries an in-point.
 *
 * Insert is the default because moving a shot between two other shots is the
 * edit you make constantly, and splitting a neighbour is the one you should
 * have to ask for. Both preserve the total.
 *
 * A gap can still appear — trimming with ripple off makes one — so the panel
 * draws it in red and the length chip reports it. What cannot happen is a
 * gap appearing because you dragged something.
 *
 * ── Snapping is measured in PIXELS ───────────────────────────────────────
 *
 * A snap radius in seconds is wrong at both ends of the zoom range: 0.5s is
 * two pixels at `fit` (useless) and sixteen at 4× (grabby). The radius is
 * constant on screen, which is what a hand expects.
 */
import type { TimelineItem } from '../remotion/timeline'

export type DropMode = 'insert' | 'splice'

export type DropOptions = {
  mode: DropMode
  /** Times to magnet onto: clip edges, the playhead, lyric cues. */
  snapTo: number[]
  /** Pixels per second, so the radius below is a screen distance. */
  pps: number
  /** Snap radius, in pixels. 8 is about a fingertip at any zoom. */
  snapPx?: number
  /** Shortest a clip may be trimmed to before it is removed outright. */
  minDur?: number
}

export type DropPlan = {
  /**
   * The DROP POINT — where the pointer put the clip's in-point, after
   * snapping and clamping. In splice mode this is also where the clip ends
   * up; in insert mode it is not, because insert lands on a boundary.
   */
  from: number
  /**
   * Where the clip ACTUALLY ends up, and therefore what the drop indicator
   * draws. In splice mode this equals `from`.
   *
   * These were one field until insert became the default, and that was the
   * original complaint reintroduced by the back door: the indicator drew the
   * pointer's position while the commit put the clip on a boundary
   * elsewhere, so the one mode you use constantly was the one lying about
   * where the clip would go.
   */
  landsAt: number
  /** Index the clip ends up at, for the same reason. */
  landsIndex: number
  /** Seconds it actually moved (post-snap, post-clamp). */
  deltaSec: number
  /** The time it locked onto, for drawing the snap line. Null = free. */
  snappedTo: number | null
  /** Which edge locked — the indicator draws at the edge, not the in-point. */
  snappedEdge: 'in' | 'out' | null
  mode: DropMode
}

const DEFAULT_SNAP_PX = 8
const DEFAULT_MIN_DUR = 0.1

/** The film's span, which a drag may not leave. */
function bounds(items: TimelineItem[]): { start: number; end: number } {
  if (!items.length) return { start: 0, end: 0 }
  const last = items[items.length - 1]
  return { start: items[0].from, end: last.from + last.duration }
}

/**
 * Every time a drag should magnet to: each clip's edges, plus whatever the
 * caller adds (the playhead, lyric cues). The dragged clip's OWN edges are
 * excluded — snapping a clip to itself would pin it in place.
 */
export function snapTargets(items: TimelineItem[], excludeIndex: number, extra: number[] = []): number[] {
  const out: number[] = []
  items.forEach((it, i) => {
    if (i === excludeIndex) return
    out.push(it.from, it.from + it.duration)
  })
  out.push(...extra)
  return [...new Set(out)].sort((a, b) => a - b)
}

/**
 * Where would releasing here put the clip? Called on every pointer-move to
 * draw the indicator, and once more on release to commit — so what you saw
 * is exactly what you get, which is the entire point of T1.
 */
export function planDrop(
  items: TimelineItem[],
  index: number,
  dxSec: number,
  opts: DropOptions,
): DropPlan | null {
  const item = items[index]
  if (!item) return null
  const { start, end } = bounds(items)
  const raw = Math.max(start, Math.min(end - item.duration, item.from + dxSec))

  let from = raw
  let snappedTo: number | null = null
  let snappedEdge: 'in' | 'out' | null = null

  const radius = (opts.snapPx ?? DEFAULT_SNAP_PX) / Math.max(0.001, opts.pps)
  if (opts.snapTo.length && radius > 0) {
    let best = radius
    for (const t of opts.snapTo) {
      // Both edges compete, and the closest one wins. Only trying the
      // in-point means a clip never lines its TAIL up with anything, which
      // is half of what you are doing when you nudge a cut onto a beat.
      const dIn = Math.abs(t - raw)
      if (dIn < best) { best = dIn; from = t; snappedTo = t; snappedEdge = 'in' }
      const dOut = Math.abs(t - (raw + item.duration))
      if (dOut < best) { best = dOut; from = t - item.duration; snappedTo = t; snappedEdge = 'out' }
    }
    // A snap may push the clip outside the film; the clamp wins over it.
    const clamped = Math.max(start, Math.min(end - item.duration, from))
    if (clamped !== from) { from = clamped; snappedTo = null; snappedEdge = null }
  }

  // Resolve where it ACTUALLY ends up, here rather than at commit time, so
  // the indicator and the commit read the same number.
  const { at, index: landsIndex } = opts.mode === 'insert'
    ? insertSlot(items, index, from)
    : spliceSlot(items, index, from, opts.minDur ?? DEFAULT_MIN_DUR)

  return {
    from,
    landsAt: at,
    landsIndex,
    deltaSec: from - item.from,
    snappedTo,
    snappedEdge,
    mode: opts.mode,
  }
}

/**
 * Which slot an insert-mode drop resolves to, and where that puts the clip's
 * in-point once the film is re-packed.
 *
 * Measured against the timeline WITHOUT the dragged clip — otherwise a
 * rightward drag is measured against positions the clip itself is still
 * occupying and lands one slot short every time. Shared by `planDrop` (to
 * draw it) and `applyInsert` (to do it), which is the only way the two can
 * be guaranteed to agree.
 */
/**
 * Where a splice-mode drop resolves to, once the no-sliver rule has had its
 * say — which can move it by up to `minDur`.
 *
 * That rule used to live in `applySplice`, and the test that asserts the
 * plan and the commit agree is what found it: dropping at 19.9 against a
 * clip boundary at 20 reported 19.9 and committed 20. Anything that changes
 * the landing point belongs in the PLAN, or the indicator is drawing a
 * number the commit does not use.
 */
function spliceSlot(
  items: TimelineItem[],
  index: number,
  dropAt: number,
  minDur: number,
): { at: number; index: number } {
  const origin = items[0].from
  const others = items.filter((_, i) => i !== index)
  const othersTotal = others.reduce((sum, it) => sum + it.duration, 0)
  let before = Math.max(0, Math.min(othersTotal, dropAt - origin))

  // Don't manufacture a sliver. A split two frames from a clip's edge is
  // never an edit anyone meant to make, and dropping the remnant instead
  // would shorten the film — so the split point moves to the edge.
  let walk = 0
  let slot = 0
  for (; slot < others.length; slot++) {
    const it = others[slot]
    if (before > walk && before < walk + it.duration) {
      if (before - walk < minDur) before = walk
      else if (walk + it.duration - before < minDur) { before = walk + it.duration; slot++ }
      break
    }
    if (before <= walk) break
    walk += it.duration
  }
  return { at: origin + before, index: slot }
}

function insertSlot(
  items: TimelineItem[],
  index: number,
  dropAt: number,
): { at: number; index: number } {
  const origin = items[0].from
  const rest = items.filter((_, i) => i !== index)
  let slot = 0
  let cursor = origin
  for (; slot < rest.length; slot++) {
    const mid = cursor + rest[slot].duration / 2
    if (dropAt < mid) break
    cursor += rest[slot].duration
  }
  return { at: cursor, index: slot }
}

/**
 * Commit a plan. Always returns a gapless timeline of the same total length,
 * or the original array when nothing would change (so undo history and React
 * identity checks both stay honest).
 */
export function applyDrop(
  items: TimelineItem[],
  index: number,
  plan: DropPlan,
): { items: TimelineItem[]; index: number } {
  const item = items[index]
  if (!item || Math.abs(plan.deltaSec) < 1e-6) return { items, index }

  return plan.mode === 'insert'
    ? applyInsert(items, index, plan)
    : applySplice(items, index, plan)
}

/**
 * THE DEFAULT. Lift the clip out and put it back at the boundary nearest
 * where it was dropped. Everything keeps its duration; only the order
 * changes, and nothing is ever split.
 *
 * The clip therefore does NOT land exactly under the pointer — it lands
 * between two shots — which is why the drop indicator draws the resolved
 * slot rather than following the cursor. That is the honest thing to show:
 * the gesture means "put this shot here in the order", and the order is what
 * it changes.
 */
function applyInsert(items: TimelineItem[], index: number, plan: DropPlan): { items: TimelineItem[]; index: number } {
  const item = items[index]
  const rest = items.filter((_, i) => i !== index)
  // The SAME resolution the indicator drew — planDrop already ran it.
  const at = plan.landsIndex

  const order = [...rest.slice(0, at), item, ...rest.slice(at)]
  let t = items[0].from
  const out = order.map(it => {
    const next = { ...it, from: t }
    t += it.duration
    return next
  })
  return { items: out, index: at }
}

/**
 * SPLICE (Ctrl-drag). Place the clip exactly where it was dropped, and let
 * everything else close up around it in order — splitting the one clip the
 * drop point falls inside.
 *
 * ── Why this is on the modifier, and why it is not "overwrite" ──────────
 *
 * The first version of this tried Premiere's overwrite literally: lift the
 * clip out (rippling the hole shut) and then destroy whatever it now
 * covered. The tests killed it immediately — that removes the clip's length
 * TWICE, so a 30s film came back 25s, which is a film that will not build.
 *
 * The arithmetic is not negotiable. In a gapless, length-locked timeline the
 * other clips must exactly fill what the dragged clip does not occupy, and
 * they already do: their total IS the film minus this clip. So the only
 * operation that lands the clip where you pointed AND keeps the film
 * exportable is this one — lay the others out in order, interrupted at the
 * drop point. Nothing is destroyed; at most one clip splits, and its tail
 * carries an in-point so it renders the frames it should.
 *
 * That is a genuinely useful edit, and it is also one that turns one shot
 * into two. Splitting a neighbour should be asked for, not stumbled into, so
 * it lives on Ctrl and `insert` is what a plain drag does.
 */
function applySplice(
  items: TimelineItem[],
  index: number,
  plan: DropPlan,
): { items: TimelineItem[]; index: number } {
  const item = items[index]
  const origin = items[0].from
  const others = items.filter((_, i) => i !== index)

  // How much of the remaining material goes in FRONT of the dropped clip —
  // taken from the PLAN, which already applied the no-sliver rule, so the
  // clip lands exactly where the indicator drew it.
  const before = plan.landsAt - origin

  const head: TimelineItem[] = []
  const tail: TimelineItem[] = []
  let at = 0
  for (const it of others) {
    const end = at + it.duration
    if (end <= before + 1e-9) head.push(it)
    else if (at >= before - 1e-9) tail.push(it)
    else {
      // The clip the drop point falls inside: split it. The two halves sum
      // to the original duration exactly, which is what keeps the total
      // right to the last frame.
      const cut = before - at
      head.push({ ...it, duration: cut })
      tail.push({ ...it, duration: it.duration - cut, offsetSec: (it.offsetSec ?? 0) + cut })
    }
    at = end
  }

  const order = [...head, item, ...tail]
  let t = origin
  const out = order.map(it => {
    const next = { ...it, from: t }
    t += it.duration
    return next
  })
  return { items: out, index: head.length }
}

/**
 * Is this timeline exportable? `remotion/timeline.ts` refuses to load
 * otherwise, and until now nothing told you before it did.
 */
export type LengthBudget = {
  total: number
  target: number
  /** Positive = the film is too long. */
  overSec: number
  /** [from, to) spans with nothing in them. */
  gaps: { from: number; to: number }[]
  overlaps: { from: number; to: number }[]
  ok: boolean
}

export function lengthBudget(items: TimelineItem[], targetSec: number, epsilon = 1e-6): LengthBudget {
  const gaps: { from: number; to: number }[] = []
  const overlaps: { from: number; to: number }[] = []
  const sorted = [...items].sort((a, b) => a.from - b.from)
  for (let i = 1; i < sorted.length; i++) {
    const prevEnd = sorted[i - 1].from + sorted[i - 1].duration
    if (sorted[i].from - prevEnd > epsilon) gaps.push({ from: prevEnd, to: sorted[i].from })
    if (prevEnd - sorted[i].from > epsilon) overlaps.push({ from: sorted[i].from, to: prevEnd })
  }
  const last = sorted[sorted.length - 1]
  const total = last ? last.from + last.duration : 0
  const overSec = total - targetSec
  return {
    total,
    target: targetSec,
    overSec,
    gaps,
    overlaps,
    ok: Math.abs(overSec) <= epsilon && !gaps.length && !overlaps.length,
  }
}
