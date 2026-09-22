/**
 * Act B world time.
 *
 * Sub-scenes B.1…B.4 are windows into one 26-second flight, so everything
 * inside the world needs the time since the top of the SONG, not the time
 * since the start of the clip. The window's offset is a module-level value
 * rather than React context because it is read inside useFrame — a context
 * read would mean re-rendering the whole tree every frame — and because
 * exactly one scene is ever mounted at a time (both in the viewer and in a
 * Remotion render).
 */
import { getAnimTime } from '../../hooks/useAnimTime'
import { storyTime } from './flight'

let offset = 0

/** The window's start, in FILM seconds (seconds into the song). */
export function setFlightOffset(seconds: number) {
  offset = seconds
}

/**
 * STORY time — seconds into the flight, which is the base everything in this
 * act is authored in.
 *
 * Not the same as seconds into the song any more: the journey home is played
 * roughly three times faster than it is authored, so the film reaches the
 * road at 0:37.5 and the flight thinks it is at 0:59. See `storyTime` in
 * flight.ts for the map and for why it is a map rather than a re-keying.
 */
export function worldTime(): number {
  return storyTime(getAnimTime() + offset)
}

/**
 * SONG time — seconds into the track, which is what `worldTime` used to be
 * and is still the right clock for exactly one thing: the beat.
 *
 * Everything the act draws happens on story time, but the 120 BPM pulse the
 * crowd and the light rig hit on belongs to the record, and the record does
 * not slow down when the flight does. Running it off story time meant the
 * stands bounced at 5× tempo through the middle of the warp — inaudible
 * there, four hundred units away and reading as shimmer — and it would have
 * been very audible indeed once the departure started playing under real
 * time (see the dip at the head of WARP_RATE).
 */
export function songTime(): number {
  return getAnimTime() + offset
}

/** Seconds into the song at which this window starts. */
export function flightOffset(): number {
  return offset
}
