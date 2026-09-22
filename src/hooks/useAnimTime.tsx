/* eslint-disable react-refresh/only-export-components -- the anim-clock module deliberately exports the provider + imperative API + math helpers together */
import { createContext, useContext, useEffect, useState } from 'react'
import { installThreeClockLock } from '../utils/threeClockLock'

/**
 * Animation time context — provides a monotonically increasing time (seconds)
 * that drives all JS-computed animations.
 *
 * In Remotion: set to frame/fps (deterministic, scrubbable)
 * In live mode: driven by requestAnimationFrame (real-time)
 *
 * Live mode is controllable — for deterministic screenshots and editing:
 *   URL params:  ?t=12.5   start FROZEN at t=12.5s (add &play=1 to keep playing)
 *                &speed=0.5 playback speed multiplier
 *   Console/CDP: window.__anim.seek(t) / .pause() / .play() / .setSpeed(s) / .time
 *   In-canvas code (useFrame etc.): call getAnimTime() directly — React context
 *   does not cross the R3F reconciler boundary, the module store does.
 */
export const AnimTimeContext = createContext<number>(0)

/* ── Module-level time store (shared across React roots / R3F canvases) ── */

let current = 0
let playing = true
let speed = 1
/**
 * Seconds subtracted from the master clock before a scene sees it.
 *
 * Every scene in this project is authored from t=0, and the master timeline
 * plays them one after another — so the film player (src/scenes/FullFilm.tsx)
 * sets this to the active slot's start time and the scene underneath goes on
 * believing it started when it started. It is a module-level global rather
 * than context because `getAnimTime()` is called from inside `useFrame`,
 * where React context does not reach; and it is safe to be a global because
 * exactly one scene is ever mounted at a time.
 *
 * Zero everywhere except inside the film player.
 */
let offset = 0
const controlListeners = new Set<() => void>()

function notifyControl() {
  controlListeners.forEach(cb => cb())
  syncCssAnimations()
}

/**
 * Keep CSS keyframe animations in step with the anim clock: frozen → pause
 * them at the current time; playing → resume at the current speed. Called on
 * every seek/pause/play/speed change, and periodically while paused so
 * late-mounting elements get frozen too.
 */
function syncCssAnimations() {
  if (typeof document === 'undefined' || typeof document.getAnimations !== 'function') return
  for (const a of document.getAnimations()) {
    try {
      if (playing) {
        a.playbackRate = speed
        if (a.playState === 'paused') a.play()
      } else {
        a.currentTime = (current - offset) * 1000
        a.pause()
      }
    } catch { /* animations mid-teardown can throw — skip them */ }
  }
}

/** Current animation time in seconds — safe to call inside useFrame.
 *  This is the SCENE's clock: master time minus the film player's offset. */
export function getAnimTime(): number {
  return current - offset
}

/** The master clock — song time, the thing the scrubber and `?t=` address.
 *  Only the film player and the time UI want this; scenes want getAnimTime. */
export function getMasterTime(): number {
  return current
}

export function getAnimTimeOffset(): number {
  return offset
}

/** Set by the film player when the active timeline slot changes. */
export function setAnimTimeOffset(o: number) {
  if (o === offset) return
  offset = o
  notifyControl()
}

export function seekAnimTime(t: number) {
  current = Math.max(0, t)
  notifyControl()
}

export function isAnimPlaying(): boolean {
  return playing
}

export function setAnimPlaying(p: boolean) {
  playing = p
  notifyControl()
}

export function getAnimSpeed(): number {
  return speed
}

export function setAnimSpeed(s: number) {
  speed = Math.max(0, s)
  notifyControl()
}

/** Subscribe to play/pause/seek/speed changes (for control UIs). */
export function subscribeAnimControl(cb: () => void): () => void {
  controlListeners.add(cb)
  return () => { controlListeners.delete(cb) }
}

declare global {
  interface Window {
    __anim?: {
      readonly time: number
      readonly playing: boolean
      readonly speed: number
      seek: (t: number) => void
      pause: () => void
      play: () => void
      toggle: () => void
      setSpeed: (s: number) => void
    }
  }
}

let initialised = false
function initFromUrlOnce() {
  if (initialised || typeof window === 'undefined') return
  initialised = true

  const params = new URLSearchParams(window.location.search)
  const t = params.get('t')
  if (t != null && !Number.isNaN(parseFloat(t))) {
    current = Math.max(0, parseFloat(t))
    // ?t= freezes by default so screenshots are deterministic; &play=1 overrides.
    playing = params.get('play') != null
  }
  const sp = params.get('speed')
  if (sp != null && !Number.isNaN(parseFloat(sp))) speed = Math.max(0, parseFloat(sp))

  // Lock THREE.Clock to the anim clock so three.js-driven scenes freeze and
  // scrub too. ?t= implies it; &lockclock=0 opts out, &lockclock=1 forces it.
  const lock = params.get('lockclock')
  if (lock === '1' || (t != null && lock !== '0')) {
    installThreeClockLock(getAnimTime)
  }

  window.__anim = {
    get time() { return current },
    get playing() { return playing },
    get speed() { return speed },
    seek: seekAnimTime,
    pause: () => setAnimPlaying(false),
    play: () => setAnimPlaying(true),
    toggle: () => setAnimPlaying(!playing),
    setSpeed: setAnimSpeed,
  }
}

/**
 * Get the current animation time in seconds.
 * Works in both Remotion (frame-perfect) and live (real-time) modes.
 */
export function useAnimTime(): number {
  return useContext(AnimTimeContext)
}

/**
 * Loop phase 0..1 over `duration` seconds. Offsets by `delay` (negative
 * = start partway through the cycle, matches CSS animation-delay).
 */
export function loopPhase(
  t: number,
  duration: number,
  delay: number = 0,
): number {
  const offset = (((t - delay) % duration) + duration) % duration
  return offset / duration
}

/** 0 → 1 → 0 as p goes 0 → 0.5 → 1. */
export function pingPong(p: number): number {
  return p < 0.5 ? p * 2 : 2 - p * 2
}

/** Cubic ease-in-out matching CSS `ease-in-out` closely enough. */
export function easeInOut(p: number): number {
  return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2
}

/** Smooth cosine oscillator: returns 1 → -1 → 1 over p 0 → 0.5 → 1. */
export function cosWave(p: number): number {
  return Math.cos(p * Math.PI * 2)
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

/**
 * Linear interpolation across arbitrary keyframe stops (CSS-style %).
 * Stops must be sorted ascending by `at` (0..1).
 */
export function keyframeLerp(
  phase: number,
  stops: ReadonlyArray<{ at: number; value: number }>,
): number {
  if (phase <= stops[0].at) return stops[0].value
  for (let i = 0; i < stops.length - 1; i++) {
    if (phase <= stops[i + 1].at) {
      const localP =
        (phase - stops[i].at) / (stops[i + 1].at - stops[i].at)
      return lerp(stops[i].value, stops[i + 1].value, localP)
    }
  }
  return stops[stops.length - 1].value
}

/**
 * Provider for live (non-Remotion) mode.
 * Advances the module time store via requestAnimationFrame and mirrors it
 * into React context. Honours ?t= / ?speed= and the window.__anim API.
 */
export function AnimTimeProvider({ children }: { children: React.ReactNode }) {
  const [time, setTime] = useState(() => {
    initFromUrlOnce()
    return current - offset
  })

  useEffect(() => {
    let last = performance.now()
    let raf: number
    let frame = 0
    const tick = () => {
      const now = performance.now()
      const dt = (now - last) / 1000
      last = now
      if (playing && speed > 0) {
        current += dt * speed
      } else if (++frame % 30 === 0) {
        // While frozen, periodically re-freeze CSS animations so elements
        // mounted after the seek (lazy scenes, re-renders) get pinned too.
        syncCssAnimations()
      }
      setTime(current - offset) // paused: same value → React bails out of re-render
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <AnimTimeContext.Provider value={time}>
      {children}
    </AnimTimeContext.Provider>
  )
}
