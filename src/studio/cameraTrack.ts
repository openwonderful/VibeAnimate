/**
 * The camera track (S4) — camera keyframes as something the timeline can draw.
 *
 * ── This is an extraction, not an invention ────────────────────────────
 * `{ t, pos, tgt, fov }` is already declared, identically and separately, in
 * `actB/flight.ts` (plus `cut?: true`), `act8_51/CameraRig`, `act8b/
 * CameraRig8b`, `act8_52` and `act8_54`. Five copies of one type is the
 * signal that the format converged on its own; all this does is give it a
 * name and a place, and a registry saying which scene's keys are which.
 *
 * `act7r/journey.ts` is the genuine outlier — its `sampleCam` is
 * DISTANCE-parameterised rather than time-parameterised, so a key has no `t`
 * to draw at. Act 7 is marked read-only rather than adapted: pretending a
 * distance is a time would put diamonds at plausible, wrong places.
 *
 * ── The trap, which is the whole reason this needs a module ────────────
 * `flight.ts`'s keys are in STORY time. The timeline is in FILM time. They
 * are NOT the same number: identity below `T_EXIT`, then story runs ahead by
 * up to `WARP_LAG`, because the journey home is authored as 31 seconds and
 * plays in a fraction of that. A lane drawn over a film-time ruler that used
 * story numbers directly would put the tree a minute in when the film cuts to
 * it at forty seconds — plausible, wrong, and impossible to notice by eye.
 *
 * Neither constant is quoted here any more. `WARP_LAG` was 21.5 when this was
 * written and is 23.5 now, one merge later; the numbers live in flight.ts and
 * every conversion below reads them from there.
 *
 * `storyTime()`/`filmTime()` in flight.ts are the map, and every conversion
 * here goes through them.
 */
import { KEYS as FLIGHT_KEYS, filmTime, storyTime, type Key } from '../scenes/actB/flight'
import type { TimelineItem } from '../remotion/timeline'

export type { Key as CameraKey }

/** How a scene's keyframe times relate to the clock the studio shows. */
export type KeyTimebase =
  /** Keys are in the scene's own local seconds — the common case. */
  | { kind: 'local' }
  /**
   * Keys are in STORY seconds and the scene plays in FILM seconds — Acts
   * 1–3 only. See flight.ts; the journey home is authored as 31s and plays
   * in 10.
   */
  | { kind: 'story' }

export type CameraTrack = {
  keys: Key[]
  timebase: KeyTimebase
  /**
   * Where the scene's own clock sits inside the keyed timeline, in the same
   * units the clip is measured in (FILM seconds for the flight).
   *
   * Acts 1–3 are windows into ONE continuous shot: `makeFlightScene(37.5)`
   * gives a scene whose local time 0 is the flight's film-time 37.5. So a
   * key's scene-local time is its film time MINUS this. Getting it wrong
   * does not fail — it silently puts every key in Act 3 outside its own
   * clip, which reads as "the camera lane just doesn't cover Act 3".
   */
  windowOffsetSec: number
  /** Where the keys live, for the "copy these back" flow. */
  source: string
  /**
   * Can the studio offer to retime them? False where the format does not
   * carry a time to retime (Act 7's distance-parameterised rig).
   */
  editable: boolean
}

/**
 * Scene key → the flight window it is, as declared by its
 * `makeFlightScene(offset)` call. Every one of these reads the SAME KEYS —
 * they are windows into one shot, not separate shots — so the track they
 * return shares its `keys` array rather than copying it.
 *
 * Mirrors `src/scenes/actB/Act*.tsx`. It is a small hand-kept table because
 * the offsets live in fourteen one-line files; a wrong number here is caught
 * by the unit test that asserts every placed key lands inside its own clip.
 */
/**
 * Scene key → the `makeFlightScene(offset)` its file is built from.
 *
 * A MIRROR, and mirrors drift. It drifted on the very first merge after it
 * was written: "the flight loses its last cut and two seconds" moved 3.2, 3.3
 * and 3.4 two seconds earlier, and nothing here would have failed — the keys
 * would simply have been drawn two seconds off, which on a lane of diamonds
 * is invisible. `cameraTrack.test.ts` now reads the scene files and asserts
 * every entry against the real argument, so the next retiming is a red test
 * rather than a quietly wrong lane.
 *
 * It cannot be imported instead: the offset is an argument at each scene
 * module's top level, and those modules are lazy — the timeline needs all of
 * them before any of them has loaded.
 */
const FLIGHT_WINDOWS: Record<string, number> = {
  // `1-3` used to be here as well; it is the whole take's LABEL now, not a
  // key — `0e8effd Key 'flight', not '1-3'` — so it matched nothing.
  flight: 0,
  '1': 0, '1.1': 0, '1-B': 0,
  '1.2': 8, '1.2-B': 8, '1.3': 16, '1.4': 20.4,
  '2': 26, '2.1': 26, '2.2': 31,
  '3': 37.5, '3.1': 37.5, '3.2': 40.5, '3.3': 52, '3.4': 58,
}

/** Which file each key's window comes from — the test reads these. */
export const FLIGHT_WINDOW_SOURCES: Record<string, string> = {
  flight: 'Flight',
  '1': 'Act1', '1.1': 'Act1_1', '1-B': 'Act1B',
  '1.2': 'Act1_2', '1.2-B': 'Act1_2B', '1.3': 'Act1_3', '1.4': 'Act1_4',
  '2': 'Act2', '2.1': 'Act2_1', '2.2': 'Act2_2',
  '3': 'Act3', '3.1': 'Act3_1', '3.2': 'Act3_2', '3.3': 'Act3_3', '3.4': 'Act3_4',
}

/** Exposed for the drift test only. */
export const FLIGHT_WINDOWS_FOR_TEST = FLIGHT_WINDOWS

export function cameraTrackFor(sceneKey: string): CameraTrack | null {
  const window = FLIGHT_WINDOWS[sceneKey]
  if (window === undefined) return null
  return {
    keys: FLIGHT_KEYS,
    timebase: { kind: 'story' },
    windowOffsetSec: window,
    source: 'src/scenes/actB/flight.ts',
    editable: true,
  }
}

/**
 * A key's position on the FILM's ruler, in master seconds — or null when it
 * falls outside the clip that carries it.
 *
 * `clip.from` is where the clip starts on the master; `clip.offsetSec` is how
 * far into the source scene it starts. So a key at scene-local `t` sits at
 * `from + (t - offsetSec)`, and only if that lands inside the clip.
 */
export function keyMasterTime(
  key: Key,
  clip: TimelineItem,
  track: Pick<CameraTrack, 'timebase' | 'windowOffsetSec'>,
): number | null {
  // Story → film FIRST. Doing it after the clip arithmetic would apply the
  // clip's offset to a number in the wrong timebase.
  const filmT = track.timebase.kind === 'story' ? filmTime(key.t) : key.t
  // …then into the SCENE's own clock, which starts at its window offset…
  const local = filmT - track.windowOffsetSec
  // …then onto the master, honouring the clip's in-point.
  const master = clip.from + (local - (clip.offsetSec ?? 0))
  const end = clip.from + clip.duration
  return master >= clip.from - 1e-6 && master <= end + 1e-6 ? master : null
}

/** The inverse — where a drag to master time `t` puts the key's own value. */
export function masterTimeToKey(
  master: number,
  clip: TimelineItem,
  track: Pick<CameraTrack, 'timebase' | 'windowOffsetSec'>,
): number {
  const local = master - clip.from + (clip.offsetSec ?? 0)
  const filmT = local + track.windowOffsetSec
  return track.timebase.kind === 'story' ? storyTime(filmT) : filmT
}

export type PlacedKey = {
  key: Key
  /** Index into the track's `keys`, so an edit knows which one it is. */
  index: number
  /** Master seconds. */
  at: number
  clip: TimelineItem
}

/**
 * Every camera key the film's clips carry, placed on the master ruler.
 *
 * A scene used twice is TWO sets of diamonds — the same keys seen through
 * two clips — which is correct: retiming one of them is a different edit
 * from retiming the other, even though both would end up rewriting the same
 * line of flight.ts.
 */
export function placeCameraKeys(items: TimelineItem[]): PlacedKey[] {
  const out: PlacedKey[] = []
  for (const clip of items) {
    const track = cameraTrackFor(clip.key)
    if (!track) continue
    track.keys.forEach((key, index) => {
      const at = keyMasterTime(key, clip, track)
      if (at != null) out.push({ key, index, at, clip })
    })
  }
  return out.sort((a, b) => a.at - b.at)
}

/**
 * A key as a paste-ready `flight.ts` line.
 *
 * Paste-only, deliberately, and for the same reason the master timeline is:
 * `KEYS` is hand-written and carries comments that are documentation — the
 * vocal onsets each key is anchored to ("punch through the stars at 0:07.24",
 * "over the rim on 0:20.31"). A rewriting endpoint would regenerate the
 * array and throw those away, and they are the reason anyone can retime this
 * act at all.
 */
export function keyToSource(key: Key, t = key.t): string {
  const v = (a: [number, number, number]) => `[${a.map(n => +n.toFixed(2)).join(', ')}]`
  return `  { t: ${+t.toFixed(2)}, pos: ${v(key.pos)}, tgt: ${v(key.tgt)}, fov: ${key.fov}${key.cut ? ', cut: true' : ''} },`
}
