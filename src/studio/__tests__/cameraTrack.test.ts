/**
 * The camera track's time conversion (S4).
 *
 * This is the test the roadmap said to write FIRST, and it is the whole
 * reason the module exists: flight.ts's keys are in STORY time, the timeline
 * is in FILM time, and they are not the same number. A lane drawn with story
 * numbers on a film ruler is wrong by up to 21.5 seconds — plausibly wrong,
 * silently wrong, and impossible to catch by eye on a strip of diamonds.
 */
import { describe, expect, it } from 'vitest'
import { KEYS, T_EXIT, WARP_LAG, filmTime, storyTime } from '../../scenes/actB/flight'
import {
  cameraTrackFor, keyMasterTime, masterTimeToKey, keyToSource, placeCameraKeys,
  FLIGHT_WINDOWS_FOR_TEST, FLIGHT_WINDOW_SOURCES,
} from '../cameraTrack'
import { TIMELINE } from '../../remotion/timeline'
import type { TimelineItem } from '../../remotion/timeline'

const clip = (over: Partial<TimelineItem> = {}): TimelineItem =>
  ({ key: '1', from: 0, duration: 26, ...over })

/** Timebase + window offset, the pair every conversion needs. */
const STORY = { timebase: { kind: 'story' } as const, windowOffsetSec: 0 }
const LOCAL = { timebase: { kind: 'local' } as const, windowOffsetSec: 0 }
const window = (sec: number) => ({ ...STORY, windowOffsetSec: sec })

describe('story time vs film time', () => {
  it('is the identity before the warp begins', () => {
    for (const t of [0, 7.47, 20.31, T_EXIT]) {
      expect(storyTime(t)).toBeCloseTo(t, 6)
      expect(filmTime(t)).toBeCloseTo(t, 6)
    }
  })

  it('runs story ahead by the full lag once the warp is over', () => {
    // The journey home is authored as 31 seconds and plays in 10.
    expect(storyTime(50) - 50).toBeCloseTo(WARP_LAG, 6)
    expect(50 - filmTime(50 + WARP_LAG)).toBeCloseTo(0, 4)
  })

  it('round-trips', () => {
    for (const film of [0, 10, 27.4, 30, 35, 40, 50, 63.8]) {
      expect(filmTime(storyTime(film))).toBeCloseTo(film, 3)
    }
  })
})

describe('keyMasterTime', () => {
  it('converts story→film BEFORE applying the clip, not after', () => {
    // The tree key is at STORY 64. Applying the clip's arithmetic to 64 and
    // converting afterwards would land it 21.5s late — which is the bug this
    // whole module exists to prevent.
    const c = clip({ key: '3', from: 37.5, duration: 28.8, offsetSec: 37.5 })
    const at = keyMasterTime({ t: 64, pos: [0, 0, 0], tgt: [0, 0, 0], fov: 40 }, c, STORY)
    expect(at).toBeCloseTo(37.5 + (filmTime(64) - 37.5), 6)
    expect(at).toBeCloseTo(filmTime(64), 6)
    // …and filmTime(64) is well short of 64.
    expect(filmTime(64)).toBeLessThan(64 - 15)
  })

  it('leaves a local-timebase scene alone', () => {
    const c = clip({ from: 100, duration: 10, offsetSec: 0 })
    expect(keyMasterTime({ t: 4, pos: [0, 0, 0], tgt: [0, 0, 0], fov: 40 }, c, LOCAL))
      .toBeCloseTo(104, 6)
  })

  it('honours an in-point, so a bladed clip does not double-count it', () => {
    const c = clip({ from: 100, duration: 6, offsetSec: 4 })
    // A key 4s into the SCENE is this clip's first frame.
    expect(keyMasterTime({ t: 4, pos: [0, 0, 0], tgt: [0, 0, 0], fov: 40 }, c, LOCAL))
      .toBeCloseTo(100, 6)
  })

  it('returns null for a key the clip does not contain', () => {
    const c = clip({ from: 0, duration: 5, offsetSec: 0 })
    expect(keyMasterTime({ t: 9, pos: [0, 0, 0], tgt: [0, 0, 0], fov: 40 }, c, LOCAL)).toBeNull()
  })

  it('subtracts the flight WINDOW, or Act 3 loses every key it has', () => {
    // The real shape: the master's clip `3` sits at 37.5 with NO in-point,
    // and the scene behind it is makeFlightScene(37.5) — its local time 0 is
    // the flight's film-time 37.5. Forget that and every Act 3 key lands 37.5
    // seconds past the end of its own clip and is silently dropped, which
    // reads as "the camera lane just doesn't cover Act 3". That is exactly
    // what the first version did.
    const c = clip({ key: '3', from: 37.5, duration: 27.3 })
    const tree = { t: 64, pos: [0, 0, 0] as [number, number, number], tgt: [0, 0, 0] as [number, number, number], fov: 40 }

    expect(keyMasterTime(tree, c, STORY)).toBeNull()          // window ignored
    const at = keyMasterTime(tree, c, window(37.5))           // window applied
    expect(at).not.toBeNull()
    expect(at!).toBeCloseTo(filmTime(64), 6)
    expect(at!).toBeGreaterThanOrEqual(37.5)
    expect(at!).toBeLessThanOrEqual(64.8)
    // …and it inverts.
    expect(masterTimeToKey(at!, c, window(37.5))).toBeCloseTo(64, 2)
  })

  it('inverts through masterTimeToKey in both timebases', () => {
    const c = clip({ key: '3', from: 37.5, duration: 28.8, offsetSec: 37.5 })
    for (const key of [{ t: 40, x: 1 }, { t: 59, x: 1 }, { t: 64, x: 1 }]) {
      const at = keyMasterTime({ t: key.t, pos: [0, 0, 0], tgt: [0, 0, 0], fov: 40 }, c, STORY)
      if (at == null) continue
      expect(masterTimeToKey(at, c, STORY)).toBeCloseTo(key.t, 2)
    }
    const local = clip({ from: 100, duration: 10, offsetSec: 2 })
    expect(masterTimeToKey(105, local, LOCAL)).toBeCloseTo(7, 6)
  })
})

describe('the flight windows, against the scene files themselves', () => {
  /**
   * FLIGHT_WINDOWS mirrors an argument written in sixteen separate scene
   * files, and it went stale on the first merge after it was written: "the
   * flight loses its last cut and two seconds" moved 3.2, 3.3 and 3.4 two
   * seconds earlier and nothing failed — the lane would just have drawn every
   * Act 3 key two seconds off, which on a strip of diamonds is not something
   * you can see. So the mirror is checked against the glass.
   */
  // Vite's raw glob rather than fs: this test compiles under tsconfig.app,
  // which has no node types, and `import 'fs'` fails the BUILD rather than
  // the test — which is a worse way to find out.
  const SOURCES = import.meta.glob('../../scenes/actB/*.tsx', {
    query: '?raw', import: 'default', eager: true,
  }) as Record<string, string>

  const offsetIn = (name: string): number => {
    const path = Object.keys(SOURCES).find(p => p.endsWith(`/${name}.tsx`))
    if (!path) throw new Error(`no such scene file: actB/${name}.tsx`)
    const m = /makeFlightScene\(\s*([\d.]+)/.exec(SOURCES[path])
    if (!m) throw new Error(`${name}.tsx does not call makeFlightScene(<number>`)
    return parseFloat(m[1])
  }

  it('has a named source file for every key it claims', () => {
    expect(Object.keys(FLIGHT_WINDOWS_FOR_TEST).sort())
      .toEqual(Object.keys(FLIGHT_WINDOW_SOURCES).sort())
  })

  it('matches what each scene actually passes to makeFlightScene', () => {
    for (const [key, name] of Object.entries(FLIGHT_WINDOW_SOURCES)) {
      expect(FLIGHT_WINDOWS_FOR_TEST[key], `${key} → ${name}.tsx`).toBe(offsetIn(name))
    }
  })

  it('covers Act 3, which is where a two-second slip would hide', () => {
    // Named explicitly because these three are the ones that moved, and a
    // loop that silently iterated an empty object would also pass.
    expect(FLIGHT_WINDOWS_FOR_TEST['3.2']).toBe(offsetIn('Act3_2'))
    expect(FLIGHT_WINDOWS_FOR_TEST['3.3']).toBe(offsetIn('Act3_3'))
    expect(FLIGHT_WINDOWS_FOR_TEST['3.4']).toBe(offsetIn('Act3_4'))
  })
})

describe('the registry', () => {
  it('gives every window into the flight the SAME track, not a copy', () => {
    const a = cameraTrackFor('1.2')
    const b = cameraTrackFor('3.2')
    expect(a?.keys).toBe(b?.keys)
    expect(a?.timebase.kind).toBe('story')
  })

  it('has nothing for a scene with no keyed camera', () => {
    expect(cameraTrackFor('5.2')).toBeNull()
  })
})

describe('placeCameraKeys, against the real master timeline', () => {
  const placed = placeCameraKeys(TIMELINE)

  it('places some keys and drops the ones outside their clip', () => {
    expect(placed.length).toBeGreaterThan(0)
    expect(placed.length).toBeLessThanOrEqual(KEYS.length * 3)
  })

  it('never places one outside the film', () => {
    const last = TIMELINE[TIMELINE.length - 1]
    const end = last.from + last.duration
    for (const p of placed) {
      expect(p.at).toBeGreaterThanOrEqual(0)
      expect(p.at).toBeLessThanOrEqual(end)
    }
  })

  it('never places one outside the clip that carries it', () => {
    for (const p of placed) {
      expect(p.at).toBeGreaterThanOrEqual(p.clip.from - 1e-6)
      expect(p.at).toBeLessThanOrEqual(p.clip.from + p.clip.duration + 1e-6)
    }
  })

  it('comes back in order', () => {
    for (let i = 1; i < placed.length; i++) expect(placed[i].at).toBeGreaterThanOrEqual(placed[i - 1].at)
  })
})

describe('keyToSource', () => {
  it('round-trips a key into a line flight.ts would accept', () => {
    const line = keyToSource({ t: 7.47, pos: [1.5, 2, -3.25], tgt: [0, 1, 0], fov: 42 })
    expect(line.trim()).toBe('{ t: 7.47, pos: [1.5, 2, -3.25], tgt: [0, 1, 0], fov: 42 },')
  })

  it('keeps a cut, because nothing interpolates across one', () => {
    expect(keyToSource({ t: 1, pos: [0, 0, 0], tgt: [0, 0, 0], fov: 40, cut: true }))
      .toContain('cut: true')
  })

  it('writes the retimed value when one is supplied', () => {
    expect(keyToSource({ t: 10, pos: [0, 0, 0], tgt: [0, 0, 0], fov: 40 }, 12.5)).toContain('t: 12.5')
  })
})
