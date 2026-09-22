/**
 * useMediaFollow — make a media element CHASE the global anim clock.
 *
 * Lifted out of SongTrack when the preview tab (R2) needed the same thing
 * for a <video>. It is a rename, not a redesign: nothing here was ever
 * specific to audio, and the project rule that there is only ever one clock
 * is exactly what makes a second media element safe to add.
 *
 * The clock stays the source of truth: it is what the scrubber, `?t=`, the
 * studio transport and the render path all address. Media can only chase it,
 * because a media element's currentTime is not seekable with frame precision
 * and would drag the whole film around if it led.
 *
 * ── The position is NOT the anim clock ─────────────────────────────────
 * Callers pass `time()` rather than having this read the clock itself,
 * because "where are we in this file" is a different number in each host.
 * The film viewer sets an anim-time offset, so its clock IS song time; the
 * studio's clock is SCENE-LOCAL and the active clip's `masterFrom` converts
 * it. Reading the clock directly here made every clip after the first play
 * the song from 0:00.
 *
 * ── Correcting drift without making a noise ────────────────────────────
 * Assigning `currentTime` on a playing element is a re-seek: it stalls the
 * decoder and clicks. Doing that every frame — which is what a naive
 * `if (drift > frame) resync` does — turns any rendering hitch into audible
 * stutter, because a starved rAF makes the measured drift spike. So:
 *
 *   drift < SYNC_DEADBAND   leave it alone
 *   drift < SYNC_HARD_LIMIT nudge playbackRate ±TRIM so it converges over
 *                           a second or two — inaudible, no seek
 *   otherwise               a real discontinuity (seek, tab wake, clip
 *                           jump): take the one seek
 *
 * The consequence is that a laggy scene no longer breaks audio — the sound
 * runs clean and the picture drops frames, which is the correct trade.
 */
import { useEffect, useRef } from 'react'
import { isAnimPlaying, subscribeAnimControl } from '../hooks/useAnimTime'

/** Ignore drift under this (seconds) — well below audible. */
export const SYNC_DEADBAND = 0.02
/** Above this, seek; below it, trim the rate instead. */
export const SYNC_HARD_LIMIT = 0.35
/** Rate trim used to converge — 4% is under the ~6% pitch-detection floor. */
export const TRIM = 0.04

export type MediaFollowOptions = {
  /** Media URL. The loop stands down when this is empty. */
  src: string
  /**
   * Current position in the FILE, in seconds — or null when the view has no
   * position in it at all (a shot opened detached from the timeline), in
   * which case playback pauses rather than guessing.
   */
  time: () => number | null
  /** Upper bound for seeks before metadata gives us a real duration. */
  maxDuration?: number
}

export function useMediaFollow(
  ref: React.RefObject<HTMLMediaElement | null>,
  { src, time, maxDuration }: MediaFollowOptions,
) {
  // The accessor changes identity whenever the active clip changes; keep it
  // in a ref so the follow loop is installed exactly once per source.
  const timeRef = useRef(time)
  useEffect(() => { timeRef.current = time }, [time])

  useEffect(() => {
    const el = ref.current
    if (!el || !src) return

    const cap = (t: number) => Math.max(0, Math.min(t, el.duration || maxDuration || t))
    const wanted = () => {
      const t = timeRef.current()
      return t == null ? null : cap(t)
    }
    const tryPlay = () => { if (isAnimPlaying() && wanted() != null) el.play().catch(() => {}) }

    /** Hard resync — only for genuine discontinuities. */
    const snap = () => {
      const want = wanted()
      if (want == null) return
      el.playbackRate = 1
      if (Math.abs(el.currentTime - want) > SYNC_DEADBAND) el.currentTime = want
    }

    snap()
    tryPlay()
    window.addEventListener('pointerdown', tryPlay)
    window.addEventListener('keydown', tryPlay)

    // Play/pause/seek/speed from the shared clock. Every one of these is a
    // deliberate discontinuity, so this is where seeking is legitimate.
    const unsub = subscribeAnimControl(() => {
      if (isAnimPlaying()) { snap(); tryPlay() } else { el.pause(); snap() }
    })

    let raf = 0
    const tick = () => {
      raf = requestAnimationFrame(tick)
      const want = wanted()
      // Nothing to be in sync WITH — a detached shot has no film position.
      if (want == null) { if (!el.paused) el.pause(); return }
      if (isAnimPlaying() && el.paused) tryPlay()
      if (!isAnimPlaying() && !el.paused) el.pause()
      if (!Number.isFinite(el.duration)) return

      // Paused: track the playhead exactly. Selecting a clip or scrubbing
      // moves film time without any control event, and assigning
      // currentTime on a stopped element is free and silent — so this is
      // where "click a clip, see/hear that part" comes from.
      if (el.paused) {
        if (Math.abs(el.currentTime - want) > SYNC_DEADBAND) el.currentTime = want
        return
      }

      const drift = el.currentTime - want
      const mag = Math.abs(drift)
      if (mag > SYNC_HARD_LIMIT) {
        el.playbackRate = 1
        el.currentTime = want
      } else if (mag > SYNC_DEADBAND) {
        // Ahead → slow down, behind → speed up. Converges silently.
        el.playbackRate = drift > 0 ? 1 - TRIM : 1 + TRIM
      } else if (el.playbackRate !== 1) {
        el.playbackRate = 1
      }
    }
    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      unsub()
      window.removeEventListener('pointerdown', tryPlay)
      window.removeEventListener('keydown', tryPlay)
      el.pause()
    }
  }, [ref, src, maxDuration])
}
