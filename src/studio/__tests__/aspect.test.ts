/**
 * Aspect as a real film property (S5).
 *
 * Two of these guard a failure that would not look like a failure: an odd
 * pixel dimension kills the h264 encode at the very END of a render, and a
 * cache key that ignores the shape lets a stream-copy stitch concatenate
 * 16:9 segments into a 9:16 film — which produces a file that plays.
 */
import { describe, expect, it } from 'vitest'
import {
  ASPECTS, DEFAULT_ASPECT, STAGE_FIT, aspectById, aspectCss, aspectRatio, aspectTag,
  draftSize, isStageFit, stageBoxCss,
} from '../aspect'
import { FILMS } from '../films'

describe('the catalogue', () => {
  it('is even in both axes everywhere', () => {
    // h264 chroma subsampling requires it. An odd dimension does not round —
    // it fails the encode, after every frame has already been rendered.
    for (const a of ASPECTS) {
      expect(a.width % 2, `${a.id} width`).toBe(0)
      expect(a.height % 2, `${a.id} height`).toBe(0)
    }
  })

  it('derives a draft tier that is also even, at 720 on the short side', () => {
    for (const a of ASPECTS) {
      const d = draftSize(a)
      expect(d.width % 2, `${a.id} draft width`).toBe(0)
      expect(d.height % 2, `${a.id} draft height`).toBe(0)
      expect(Math.min(d.width, d.height)).toBeGreaterThanOrEqual(718)
      expect(Math.min(d.width, d.height)).toBeLessThanOrEqual(722)
    }
  })

  it('keeps 16:9 at exactly the sizes the pipeline already renders', () => {
    const a = aspectById('16:9')
    expect([a.width, a.height]).toEqual([1920, 1080])
    expect(draftSize(a)).toEqual({ width: 1280, height: 720 })
  })

  it('falls back to 16:9 for anything unknown', () => {
    expect(aspectById(null).id).toBe(DEFAULT_ASPECT)
    expect(aspectById(undefined).id).toBe(DEFAULT_ASPECT)
    expect(aspectById('21:9').id).toBe(DEFAULT_ASPECT)
  })

  it('describes itself to CSS the way the stage needs', () => {
    expect(aspectCss(aspectById('9:16'))).toBe('1080 / 1920')
    expect(aspectRatio(aspectById('1:1'))).toBe(1)
  })
})

describe('stageBoxCss — the letterbox that was not letterboxing', () => {
  /**
   * The bug: `width: 100%` + `aspect-ratio` + `max-height: 100%`. CSS treats
   * aspect-ratio as a PREFERRED ratio, so when max-height clamps the height
   * the width stays at 100% and the ratio is simply abandoned — on a wide,
   * short panel a 16:9 film was drawn at nearly 3:1. It looked like framing
   * rather than a fault, because the picture is not distorted, the FRAME is.
   */
  it('never constrains the height, which is what abandoned the ratio', () => {
    for (const a of ASPECTS) {
      const box = stageBoxCss(a, false)
      expect(box.height, a.id).toBe('auto')
      expect(JSON.stringify(box), a.id).not.toContain('maxHeight')
    }
  })

  it('derives the width from BOTH container axes', () => {
    // Whichever edge runs out first wins; the height then follows from
    // aspect-ratio with nothing left to clamp it.
    const box = stageBoxCss(aspectById('16:9'), false)
    expect(box.width).toContain('100cqw')
    expect(box.width).toContain('100cqh')
    expect(box.aspectRatio).toBe('1920 / 1080')
  })

  it('measures against the CONTAINER, not the viewport', () => {
    // `100vh` was the old cage, and it is the whole window — including the
    // top bar and the Scenebuilder, neither of which the stage can use.
    for (const a of ASPECTS) expect(stageBoxCss(a, false).width, a.id).not.toContain('vh')
  })

  it('carries each shape\'s real ratio into the width', () => {
    expect(stageBoxCss(aspectById('9:16'), false).width).toContain('0.562500')
    expect(stageBoxCss(aspectById('1:1'), false).width).toContain('1.000000')
    expect(stageBoxCss(aspectById('16:9'), false).width).toContain('1.777778')
  })

  it('fills the panel and declares no shape when fitting', () => {
    const box = stageBoxCss(aspectById('16:9'), true)
    expect(box).toEqual({ width: '100%', height: '100%' })
    // No aspect-ratio at all: "fit" means the panel decides, and leaving a
    // ratio on it would be the original bug wearing a different hat.
    expect(box.aspectRatio).toBeUndefined()
  })
})

describe('isStageFit', () => {
  it('separates "fill the panel" from every real shape', () => {
    expect(isStageFit(STAGE_FIT)).toBe(true)
    expect(isStageFit(null)).toBe(false)
    for (const a of ASPECTS) expect(isStageFit(a.id), a.id).toBe(false)
  })

  it('is not something aspectById will ever resolve to a shape', () => {
    // It must fall back to the film's own shape, not silently become 16:9's
    // neighbour in the list.
    expect(aspectById(STAGE_FIT).id).toBe(DEFAULT_ASPECT)
  })
})

describe('aspectTag — the segment cache key', () => {
  it('is EMPTY for 16:9, so the existing cache stays valid', () => {
    expect(aspectTag('16:9')).toBe('')
    expect(aspectTag(null)).toBe('')
    expect(aspectTag(undefined)).toBe('')
  })

  it('separates every other shape, with no colon (it is a path)', () => {
    expect(aspectTag('9:16')).toBe('@9x16')
    expect(aspectTag('1:1')).toBe('@1x1')
    expect(aspectTag('2.39:1')).toBe('@2.39x1')
    expect(aspectTag('9:16')).not.toBe(aspectTag('1:1'))
  })
})

describe('the films as declared', () => {
  it('all still resolve to a real shape', () => {
    for (const f of FILMS) expect(ASPECTS).toContain(aspectById(f.aspect))
  })

  it('are all 16:9 today, which is why nothing re-renders', () => {
    // If this ever fails it is because someone RESHAPED A FILM — which is a
    // real change to the delivered video, and the segment cache for it is
    // now keyed differently and will re-render. That is correct; the test is
    // here so it is a decision rather than a surprise.
    for (const f of FILMS) expect(aspectById(f.aspect).id).toBe('16:9')
  })
})
