import { describe, expect, it } from 'vitest'
import { insertClip, repackOrder, trimDuration } from '../edit'
import { kf } from '../story/kf'
import { fmtTime, frameOf } from '../ui/theme'
import { makeToonRamp } from '../materials/toon'

const items = [
  { key: 'a', from: 0, duration: 10 },
  { key: 'b', from: 10, duration: 5, props: { x: 1 } },
  { key: 'c', from: 15, duration: 8 },
]

describe('repackOrder', () => {
  it('moves a clip and re-packs contiguously from the film start', () => {
    const out = repackOrder(items, 0, 2)
    expect(out.map(i => i.key)).toEqual(['b', 'c', 'a'])
    expect(out.map(i => i.from)).toEqual([0, 5, 13])
    expect(out.map(i => i.duration)).toEqual([5, 8, 10])
  })

  it('preserves props through the move', () => {
    const out = repackOrder(items, 1, 0)
    expect(out[0]).toMatchObject({ key: 'b', props: { x: 1 } })
  })

  it('is a no-op for same-index moves and bad indices', () => {
    expect(repackOrder(items, 1, 1)).toBe(items)
    expect(repackOrder(items, 99, 0)).toBe(items)
  })

  it('starts packing at the original first-clip offset', () => {
    const offset = items.map(i => ({ ...i, from: i.from + 3 }))
    const out = repackOrder(offset, 2, 0)
    expect(out[0].from).toBe(3)
  })
})

describe('insertClip', () => {
  it('inserts at the index and re-packs contiguously', () => {
    const out = insertClip(items, 'x', 4, 1)
    expect(out.map(i => i.key)).toEqual(['a', 'x', 'b', 'c'])
    expect(out.map(i => i.from)).toEqual([0, 10, 14, 19])
  })

  it('appends when the index is past the end, and clamps below zero', () => {
    expect(insertClip(items, 'x', 4, 99).map(i => i.key)).toEqual(['a', 'b', 'c', 'x'])
    expect(insertClip(items, 'x', 4, -5).map(i => i.key)).toEqual(['x', 'a', 'b', 'c'])
  })

  it('keeps the film anchored at the original first-clip start', () => {
    const offset = items.map(i => ({ ...i, from: i.from + 3 }))
    expect(insertClip(offset, 'x', 4, 0).map(i => i.from)).toEqual([3, 7, 17, 22])
  })

  it('seeds an empty film at zero', () => {
    expect(insertClip([], 'x', 4, 0)).toEqual([{ key: 'x', from: 0, duration: 4 }])
  })

  it('leaves the source array untouched', () => {
    insertClip(items, 'x', 4, 1)
    expect(items.map(i => i.key)).toEqual(['a', 'b', 'c'])
  })
})

describe('trimDuration', () => {
  it('ripple shifts later clips by the delta', () => {
    const out = trimDuration(items, 0, 12, true)
    expect(out.map(i => i.from)).toEqual([0, 12, 17])
    expect(out[0].duration).toBe(12)
  })

  it('without ripple only the trimmed clip changes', () => {
    const out = trimDuration(items, 0, 12, false)
    expect(out.map(i => i.from)).toEqual([0, 10, 15])
  })

  it('is a no-op when duration is unchanged', () => {
    expect(trimDuration(items, 1, 5, true)).toBe(items)
  })
})

describe('kf (time-keyed lerp)', () => {
  const pairs: [number, number][] = [[0, 0], [2, 10], [4, 10], [10, 4]]
  it('clamps before the first and after the last key', () => {
    expect(kf(-1, pairs)).toBe(0)
    expect(kf(99, pairs)).toBe(4)
  })
  it('interpolates linearly between keys', () => {
    expect(kf(1, pairs)).toBe(5)
    expect(kf(3, pairs)).toBe(10)
    expect(kf(7, pairs)).toBe(7)
  })
})

describe('fmtTime', () => {
  it('formats minutes/seconds/frames at 30fps', () => {
    expect(fmtTime(0)).toBe('0:00.00')
    expect(fmtTime(61.5)).toBe('1:01.15')
  })

  /* Regression: the fields used to be computed from `t` independently and
   * without an epsilon, so accumulated frame-stepping desynced them — thirty
   * →-presses from zero left the clock at 0.9999999999999999 and printed
   * `0:00.29`: the frame field had rolled over but the second field had not. */
  it('survives accumulated frame stepping', () => {
    let t = 0
    for (let i = 0; i < 30; i++) t += 1 / 30
    expect(fmtTime(t)).toBe('0:01.00')

    for (let i = 30; i < 1800; i++) t += 1 / 30
    expect(fmtTime(t)).toBe('1:00.00')
  })

  it('counts frames, not centiseconds', () => {
    expect(fmtTime(1 / 30)).toBe('0:00.01')
    expect(fmtTime(29 / 30)).toBe('0:00.29')
    expect(fmtTime(-2.5)).toBe('-0:02.15')
  })

  it('frameOf is exact on clip boundaries', () => {
    // Every `from` in the master timeline is a multiple of 0.1s = 3 frames.
    for (const s of [0, 0.1, 0.3, 0.7, 2.9, 5.6, 37.5, 87.5, 142]) {
      expect(frameOf(s)).toBe(Math.round(s * 30))
    }
  })
})

describe('makeToonRamp', () => {
  it('hard ramp: one texel per band, nearest-filtered', () => {
    const tex = makeToonRamp(3)
    expect(tex.image.width).toBe(3)
    const d = tex.image.data as Uint8Array
    expect(d[0]).toBeLessThan(d[1])
    expect(d[1]).toBeLessThan(d[2])
  })

  it('soft ramp: 256 texels, monotonically non-decreasing', () => {
    const tex = makeToonRamp(['#000000', '#808080', '#ffffff'], 0.1)
    expect(tex.image.width).toBe(256)
    const d = tex.image.data as Uint8Array
    for (let i = 1; i < d.length; i++) expect(d[i]).toBeGreaterThanOrEqual(d[i - 1])
    expect(d[0]).toBe(0)
    expect(d[d.length - 1]).toBe(255)
  })
})

import { splitClip, deleteClip, duplicateClip } from '../edit'

describe('splitClip (blade)', () => {
  it('splits into two contiguous clips with an in-point on the second', () => {
    const out = splitClip(items, 0, 4)
    expect(out).toHaveLength(4)
    expect(out[0]).toMatchObject({ key: 'a', from: 0, duration: 4 })
    expect(out[1]).toMatchObject({ key: 'a', from: 4, duration: 6, offsetSec: 4 })
    expect(out[2]).toMatchObject({ key: 'b', from: 10 })
  })
  it('accumulates offsets when splitting an already-split clip', () => {
    const once = splitClip(items, 0, 4)
    const twice = splitClip(once, 1, 2)
    expect(twice[1]).toMatchObject({ from: 4, duration: 2, offsetSec: 4 })
    expect(twice[2]).toMatchObject({ from: 6, duration: 4, offsetSec: 6 })
  })
  it('rejects edge and out-of-range cuts', () => {
    expect(splitClip(items, 0, 0)).toBe(items)
    expect(splitClip(items, 0, 10)).toBe(items)
    expect(splitClip(items, 0, -1)).toBe(items)
  })
})

describe('deleteClip', () => {
  it('ripple-closes the gap', () => {
    const out = deleteClip(items, 1, true)
    expect(out.map(i => i.key)).toEqual(['a', 'c'])
    expect(out[1].from).toBe(10)
  })
  it('without ripple leaves later clips in place', () => {
    const out = deleteClip(items, 1, false)
    expect(out[1].from).toBe(15)
  })
  it('refuses to delete the last remaining clip', () => {
    const solo = [{ key: 'a', from: 0, duration: 5 }]
    expect(deleteClip(solo, 0, true)).toBe(solo)
  })
})

describe('duplicateClip', () => {
  it('inserts the copy after the original and shifts the rest', () => {
    const out = duplicateClip(items, 0)
    expect(out.map(i => i.key)).toEqual(['a', 'a', 'b', 'c'])
    expect(out[1].from).toBe(10)
    expect(out[2].from).toBe(20)
    expect(out[3].from).toBe(25)
  })
})
