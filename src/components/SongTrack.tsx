/**
 * SongTrack — an <audio> element that FOLLOWS the global anim clock.
 *
 * The chase loop itself lives in `useMediaFollow`, which the preview tab's
 * <video> uses too — nothing about it was ever specific to audio. What is
 * left here is the element, and the volume.
 *
 * The reasoning that matters (why media chases and never leads, why drift is
 * corrected with a rate trim rather than a seek, and why the caller supplies
 * `time()` instead of this reading the clock) is documented there.
 */
import { useEffect, useRef } from 'react'
import { useMediaFollow } from './useMediaFollow'

type Props = {
  /** Audio URL. Nothing is mounted when this is empty. */
  src: string
  /** Current position in the SONG, in seconds, or null when there is none. */
  time: () => number | null
  /** 0..1. */
  volume?: number
  muted?: boolean
  /** Upper bound for seeks before metadata gives us a real duration. */
  maxDuration?: number
}

export function SongTrack({ src, time, volume = 1, muted = false, maxDuration }: Props) {
  const ref = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.volume = Math.max(0, Math.min(1, volume))
    el.muted = muted
  }, [volume, muted])

  useMediaFollow(ref, { src, time, maxDuration })

  if (!src) return null
  return <audio ref={ref} src={src} preload="auto" />
}
