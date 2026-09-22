import { useRef, useState, useCallback, useEffect } from 'react'

export interface AudioTimeline {
  currentTime: number
  duration: number
  isPlaying: boolean
  hasAudio: boolean
  play: () => void
  pause: () => void
  seek: (time: number) => void
}

const FALLBACK_DURATION = 30 // seconds — enough for Phase 1 testing

export function useAudioTimeline(audioSrc: string): AudioTimeline {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const rafRef = useRef<number>(0)
  const playStartRef = useRef<number>(0)
  const timeOffsetRef = useRef<number>(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(FALLBACK_DURATION)
  const [isPlaying, setIsPlaying] = useState(false)
  const [hasAudio, setHasAudio] = useState(false)

  // Try to create audio element
  useEffect(() => {
    const audio = new Audio(audioSrc)
    audio.preload = 'auto'

    audio.addEventListener('loadedmetadata', () => {
      setDuration(audio.duration)
      setHasAudio(true)
      audioRef.current = audio
    })

    audio.addEventListener('error', () => {
      // No audio file — use scrubber-only mode
      setHasAudio(false)
      audioRef.current = null
    })

    audio.addEventListener('ended', () => {
      setIsPlaying(false)
    })

    return () => {
      audio.pause()
      audio.src = ''
      audioRef.current = null
    }
  }, [audioSrc])

  // rAF loop for smooth time updates (works for both audio and scrubber mode)
  useEffect(() => {
    const tick = () => {
      if (isPlaying) {
        if (audioRef.current && hasAudio) {
          setCurrentTime(audioRef.current.currentTime)
        } else {
          // Scrubber-only mode: advance time using wall clock
          const elapsed = (performance.now() - playStartRef.current) / 1000
          const newTime = Math.min(timeOffsetRef.current + elapsed, duration)
          setCurrentTime(newTime)
          if (newTime >= duration) {
            setIsPlaying(false)
          }
        }
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [isPlaying, hasAudio, duration])

  const play = useCallback(() => {
    if (audioRef.current && hasAudio) {
      audioRef.current.play().then(() => setIsPlaying(true))
    } else {
      // Scrubber-only: start wall-clock playback from current position
      playStartRef.current = performance.now()
      timeOffsetRef.current = currentTime
      setIsPlaying(true)
    }
  }, [hasAudio, currentTime])

  const pause = useCallback(() => {
    if (audioRef.current && hasAudio) {
      audioRef.current.pause()
    }
    // Save current position for scrubber mode
    timeOffsetRef.current = currentTime
    setIsPlaying(false)
  }, [hasAudio, currentTime])

  const seek = useCallback(
    (time: number) => {
      const clamped = Math.max(0, Math.min(time, duration))
      if (audioRef.current && hasAudio) {
        audioRef.current.currentTime = clamped
      }
      timeOffsetRef.current = clamped
      playStartRef.current = performance.now()
      setCurrentTime(clamped)
    },
    [hasAudio, duration],
  )

  return { currentTime, duration, isPlaying, hasAudio, play, pause, seek }
}
