/**
 * The frame coordinate system (C3).
 *
 * These are the numbers the top bar puts on screen, so a wrong one here is a
 * wrong one quoted in a conversation about where a cut goes. The cases that
 * matter are the ones where the five coordinates DIVERGE — an in-point, a
 * detached shot, a clip that does not start at zero — because while they
 * agree, any implementation looks correct.
 */
import { describe, expect, it } from 'vitest'
import { FPS, fmtClock, fmtFrame, frameOf, readFrames, timeOfFrame } from '../frames'
import type { ViewTarget } from '../types'

const clip = (over: Partial<ViewTarget> = {}): ViewTarget => ({
  key: '3.2', masterFrom: 42.5, durationSec: 12, offsetSec: 0, ...over,
})

describe('readFrames', () => {
  it('counts the clip from zero and the film from its start', () => {
    // 42.5s in = frame 1275; two seconds into the clip = +60.
    const f = readFrames(clip(), 2, 190)
    expect(f.clipFrame).toBe(60)
    expect(f.masterFrame).toBe(1275 + 60)
    expect(f.clipFrames).toBe(360)
    expect(f.masterFrames).toBe(5700)
  })

  it('separates clip time from scene time once an in-point exists', () => {
    // A blade at 4s into the source leaves the second half with offsetSec=4:
    // masterFrom stays "master time at scene-local 0", so it goes NEGATIVE
    // relative to the clip's own start. This is the case that made the
    // distinction worth having.
    const view = clip({ masterFrom: 10 - 4, durationSec: 8, offsetSec: 4 })
    const f = readFrames(view, 4, 190)         // the clip's first frame
    expect(f.clipFrame).toBe(0)
    expect(f.sceneFrame).toBe(120)             // 4s into the source scene
    expect(f.masterFrame).toBe(300)            // and 10s into the film
    expect(f.clipFrames).toBe(240)

    const end = readFrames(view, 4 + 8 - 1 / FPS, 190)   // its last frame
    expect(end.clipFrame).toBe(f.clipFrames - 1)
  })

  it('has no film frame when the shot is detached', () => {
    const f = readFrames(clip({ masterFrom: null }), 3, 190)
    expect(f.masterFrame).toBeNull()
    expect(f.masterFrames).toBeNull()
    expect(f.clipFrame).toBe(90)               // clip time still works
  })

  it('does not drift under accumulated frame stepping', () => {
    // Thirty →-presses from the clip's in-point. Floats accumulate; the
    // readout must still say "one second in", not "29 frames in".
    let t = 0
    for (let i = 0; i < 30; i++) t += 1 / FPS
    expect(readFrames(clip(), t, 190).clipFrame).toBe(30)
  })

  it('agrees with frameOf at every master clip boundary', () => {
    // Every `from` in the master timeline is a multiple of 0.1s, so these
    // round exactly — the readout must land ON the boundary frame, never one
    // short of it.
    for (const from of [0, 26, 37.5, 67.5, 87, 104, 111, 142, 190]) {
      const f = readFrames(clip({ masterFrom: from }), 0, 190)
      expect(f.masterFrame).toBe(Math.round(from * FPS))
      expect(frameOf(from)).toBe(Math.round(from * FPS))
    }
  })
})

describe('timeOfFrame', () => {
  it('round-trips through frameOf', () => {
    for (const frame of [0, 1, 29, 30, 1275, 5699]) {
      expect(frameOf(timeOfFrame(frame))).toBe(frame)
    }
  })
})

describe('formatting', () => {
  it('groups long frame numbers', () => {
    expect(fmtFrame(0)).toBe('0')
    expect(fmtFrame(5700)).toBe('5,700')
  })

  it('fmtClock drops the frame field and rounds to the nearest second', () => {
    expect(fmtClock(0)).toBe('0:00')
    expect(fmtClock(59.6)).toBe('1:00')
    expect(fmtClock(190)).toBe('3:10')
  })
})
