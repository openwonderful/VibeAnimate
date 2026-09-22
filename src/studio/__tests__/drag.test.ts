/**
 * Clip dragging (T1).
 *
 * The thing every case here is really checking is the invariant: the master
 * timeline THROWS AT MODULE LOAD on a gap, an overlap, or a total that is
 * not its declared length. A drag that can produce any of those produces a
 * film that will not build, so "gapless and the same length afterwards" is
 * asserted on every mutation, not just the interesting ones.
 */
import { describe, expect, it } from 'vitest'
import { applyDrop, lengthBudget, planDrop, snapTargets, type DropOptions } from '../drag'
import type { TimelineItem } from '../../remotion/timeline'

/** a:0–10, b:10–20, c:20–30 */
const film = (): TimelineItem[] => [
  { key: 'a', from: 0, duration: 10 },
  { key: 'b', from: 10, duration: 10 },
  { key: 'c', from: 20, duration: 10 },
]

const opts = (over: Partial<DropOptions> = {}): DropOptions => ({
  // Insert is what a plain drag does, so it is what an unspecified test does.
  mode: 'insert', snapTo: [], pps: 8, ...over,
})

/** Gapless, in order, and the same total. The build depends on all three. */
function expectIntact(items: TimelineItem[], totalSec: number) {
  const b = lengthBudget(items, totalSec)
  expect(b.gaps).toEqual([])
  expect(b.overlaps).toEqual([])
  expect(b.total).toBeCloseTo(totalSec, 6)
  expect(b.ok).toBe(true)
}

describe('planDrop', () => {
  it('reports the landing point before anything moves', () => {
    const plan = planDrop(film(), 0, 7, opts())!
    expect(plan.from).toBe(7)
    expect(plan.deltaSec).toBe(7)
    expect(plan.snappedTo).toBeNull()
  })

  it('cannot be dragged out of the film', () => {
    expect(planDrop(film(), 0, -50, opts())!.from).toBe(0)
    // The LAST valid in-point is end − duration, not end.
    expect(planDrop(film(), 0, +50, opts())!.from).toBe(20)
  })

  it('snaps within a pixel radius, not a time radius', () => {
    const targets = [10]
    // 8px at 8px/s is a 1-second radius: 0.6s away snaps.
    expect(planDrop(film(), 0, 9.4, opts({ snapTo: targets, pps: 8 }))!.from).toBe(10)
    // The same 0.6s at 32px/s is 19 pixels away — out of reach, as it should
    // be, or zooming in would make the timeline stickier instead of finer.
    expect(planDrop(film(), 0, 9.4, opts({ snapTo: targets, pps: 32 }))!.from).toBeCloseTo(9.4)
  })

  it('snaps the OUT edge too, not just the in-point', () => {
    // Clip a is 10s. Dragging it so its tail lands near 25 should put its
    // tail exactly on 25 — lining a cut up with a lyric cue is done from
    // whichever end is near it.
    const plan = planDrop(film(), 0, 15.3, opts({ snapTo: [25], pps: 8 }))!
    expect(plan.from).toBe(15)
    expect(plan.snappedEdge).toBe('out')
    expect(plan.snappedTo).toBe(25)
  })

  it('does not contribute the dragged clip\'s own edges', () => {
    // In a GAPLESS film this is invisible — b's edges are also a's tail and
    // c's head, so 10 and 20 are still targets, and snapping back to where
    // you started is exactly how you cancel a nudge. It shows up once a clip
    // has an edge nothing else shares.
    const items: TimelineItem[] = [
      { key: 'a', from: 0, duration: 10 },
      { key: 'b', from: 13, duration: 4 },      // adrift; 13 and 17 are its own
      { key: 'c', from: 20, duration: 10 },
    ]
    const t = snapTargets(items, 1)
    expect(t).not.toContain(13)
    expect(t).not.toContain(17)
    expect(t).toEqual([0, 10, 20, 30])
  })

  it('takes the extra targets the caller adds', () => {
    // The playhead and the lyric cues — the two things a cut is usually
    // being lined up against, and neither is a clip edge.
    expect(snapTargets(film(), 0, [7.24, 13.05])).toContain(7.24)
  })

  it('can put a clip\'s tail exactly on the end of the film', () => {
    // The out edge snapping to 30 is the same thing as the in-point being
    // clamped to 20 — but it is reported as a snap, so the panel draws the
    // line and you can see WHY it stopped there.
    const plan = planDrop(film(), 0, 28, opts({ snapTo: [30], pps: 8 }))!
    expect(plan.from).toBe(20)
    expect(plan.snappedEdge).toBe('out')
  })
})

describe('the plan and the commit agree', () => {
  it('reports where an insert ACTUALLY lands, not where the pointer is', () => {
    // Insert puts the clip on a boundary, so the drop point and the landing
    // point are different numbers. The indicator draws `landsAt`; if that
    // drifted from what applyDrop does, the default gesture would be lying
    // about its destination — which is the whole complaint T1 exists for.
    const items = film()
    const plan = planDrop(items, 0, 13, opts())!
    expect(plan.from).toBe(13)              // where the pointer put it
    expect(plan.landsAt).toBe(10)           // where it goes: after b
    const { items: out, index } = applyDrop(items, 0, plan)
    expect(out[index].from).toBe(plan.landsAt)
    expect(index).toBe(plan.landsIndex)
  })

  it('holds for every drop across the film, in both modes', () => {
    for (const mode of ['insert', 'splice'] as const) {
      for (let dx = -30; dx <= 30; dx += 0.35) {
        const items = film()
        const plan = planDrop(items, 1, dx, opts({ mode }))!
        const { items: out, index } = applyDrop(items, 1, plan)
        if (out === items) continue          // no-op drop
        expect(out[index].from, `${mode} dx=${dx}`).toBeCloseTo(plan.landsAt, 6)
        expect(out[index].key, `${mode} dx=${dx}`).toBe('b')
      }
    }
  })

  it('leaves splice landing exactly where it was pointed', () => {
    const plan = planDrop(film(), 0, 15, opts({ mode: 'splice' }))!
    expect(plan.landsAt).toBe(plan.from)
  })
})

describe('applyDrop — insert (plain drag, the default)', () => {
  it('re-orders without changing anyone\'s duration', () => {
    const items = film()
    const plan = planDrop(items, 0, 20, opts())!
    const { items: out, index } = applyDrop(items, 0, plan)
    expect(out.map(i => i.key)).toEqual(['b', 'c', 'a'])
    expect(out.map(i => i.duration)).toEqual([10, 10, 10])
    expect(index).toBe(2)
    expectIntact(out, 30)
  })

  it('measures the drop against the timeline WITHOUT the dragged clip', () => {
    // Dragging `a` right by 10 puts its in-point at 10. Measured against the
    // original timeline that is b's start and would land it back where it
    // came from; measured against [b, c] it is the middle of b, so it goes
    // after b. This off-by-one-slot was the old drag's whole problem.
    const items = film()
    const plan = planDrop(items, 0, 10, opts())!
    expect(applyDrop(items, 0, plan).items.map(i => i.key)).toEqual(['b', 'a', 'c'])
  })

  it('is a no-op when nothing moved', () => {
    const items = film()
    const plan = planDrop(items, 1, 0, opts())!
    expect(applyDrop(items, 1, plan).items).toBe(items)
  })
})

describe('applyDrop — splice (Ctrl-drag: land exactly here)', () => {
  it('lands where the ghost showed it, and nothing is destroyed', () => {
    const items = film()
    // Drop `a` (10s) so it starts at 15. b and c are 20s between them and
    // must fill [0,15) and [25,30) — which is exactly 20s, so nothing has
    // to be thrown away. c is the clip that gets split.
    const plan = planDrop(items, 0, 15, opts({ mode: 'splice' }))!
    const { items: out, index } = applyDrop(items, 0, plan)
    expectIntact(out, 30)
    expect(out[index].key).toBe('a')
    expect(out[index].from).toBe(15)
    expect(out[index].duration).toBe(10)
    expect(out.map(i => i.key)).toEqual(['b', 'c', 'a', 'c'])
  })

  it('splits the clip it lands inside, and the tail keeps an in-point', () => {
    const items: TimelineItem[] = [
      { key: 'a', from: 0, duration: 4 },
      { key: 'b', from: 4, duration: 20 },
    ]
    const plan = planDrop(items, 0, 8, opts({ mode: 'splice' }))!
    const { items: out } = applyDrop(items, 0, plan)
    expectIntact(out, 24)
    expect(out.map(i => i.key)).toEqual(['b', 'a', 'b'])
    // 8 seconds of b go in front, so its tail starts 8s into the source —
    // which is what makes it render the right frames instead of replaying
    // b's opening.
    expect(out[0].duration).toBe(8)
    expect(out[2].offsetSec).toBe(8)
    expect(out[2].duration).toBe(12)
  })

  it('moves the split to the edge rather than manufacturing a sliver', () => {
    const items = film()
    // Landing 0.05s past b's start would leave 0.05s of b in front. Dropping
    // that remnant would SHORTEN the film, so the split moves to the edge
    // and the clip lands a frame or two from where the pointer was.
    const plan = planDrop(items, 0, 10.05, opts({ mode: 'splice', minDur: 0.1 }))!
    const { items: out } = applyDrop(items, 0, plan)
    // …and the indicator said so before the release, not after.
    expect(plan.landsAt).toBe(10)
    expect(out.some(i => i.duration < 0.1)).toBe(false)
    expectIntact(out, 30)
  })

  it('never changes the total, wherever it is dropped', () => {
    // The property that matters more than any single case: timeline.ts
    // throws at module load if this is ever false.
    for (const mode of ['insert', 'splice'] as const) {
      for (let dx = -30; dx <= 30; dx += 0.7) {
        const items = film()
        const plan = planDrop(items, 1, dx, opts({ mode }))!
        expectIntact(applyDrop(items, 1, plan).items, 30)
      }
    }
  })

  it('keeps the selection on the clip you actually dragged', () => {
    // The same scene twice at the same length — matching on (key, duration)
    // would select the other one.
    const items: TimelineItem[] = [
      { key: 'x', from: 0, duration: 5 },
      { key: 'dup', from: 5, duration: 5 },
      { key: 'dup', from: 10, duration: 5 },
    ]
    const plan = planDrop(items, 2, -10, opts())!
    const { items: out, index } = applyDrop(items, 2, plan)
    expect(out.map(i => i.key)).toEqual(['dup', 'x', 'dup'])
    expect(index).toBe(0)
  })
})

describe('lengthBudget', () => {
  it('passes a contiguous film of the right length', () => {
    expect(lengthBudget(film(), 30).ok).toBe(true)
  })

  it('finds the gap a ripple-off trim leaves', () => {
    const items: TimelineItem[] = [
      { key: 'a', from: 0, duration: 8 },
      { key: 'b', from: 10, duration: 10 },
    ]
    const b = lengthBudget(items, 20)
    expect(b.gaps).toEqual([{ from: 8, to: 10 }])
    expect(b.ok).toBe(false)
  })

  it('reports how far over or under the target the film is', () => {
    expect(lengthBudget(film(), 27.5).overSec).toBeCloseTo(2.5)
    expect(lengthBudget(film(), 32.5).overSec).toBeCloseTo(-2.5)
  })

  it('finds an overlap', () => {
    const items: TimelineItem[] = [
      { key: 'a', from: 0, duration: 12 },
      { key: 'b', from: 10, duration: 10 },
    ]
    expect(lengthBudget(items, 20).overlaps).toEqual([{ from: 10, to: 12 }])
  })
})
