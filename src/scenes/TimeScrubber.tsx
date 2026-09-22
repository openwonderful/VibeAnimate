/**
 * TimeScrubber — play/pause/scrub the global anim clock (useAnimTime store).
 *
 * Collapsed: a small ⏱ chip bottom-right. Expanded: a bottom bar with
 * play/pause, ±1-frame stepping (30fps; Shift = ±10 frames), a scrub slider,
 * exact time input, speed control, and "t→URL" (writes ?t= so the current
 * frame is reload- and screenshot-stable).
 *
 * Keys while expanded: , / . step back / forward one frame (Shift ×10),
 * P toggles play. Chosen to not collide with DebugCamera's WASD/QERF/arrows.
 *
 * Only affects scenes driven by the anim clock (useAnimTime/getAnimTime).
 * three.js-clock-driven scenes keep real-time pace — port them to
 * getAnimTime() to make them scrubbable.
 */

import { useEffect, useState, useSyncExternalStore } from 'react'
import {
  useAnimTime,
  seekAnimTime,
  setAnimPlaying,
  isAnimPlaying,
  getAnimSpeed,
  setAnimSpeed,
  subscribeAnimControl,
  getAnimTime,
} from '../hooks/useAnimTime'

const FPS = 30
const SPEEDS = [0.1, 0.25, 0.5, 1, 2, 4]

const btn: React.CSSProperties = {
  padding: '4px 9px',
  background: '#0A1628cc',
  border: '1px solid #D4A84340',
  borderRadius: 4,
  color: '#D4A843',
  fontSize: 12,
  fontFamily: 'ui-monospace, monospace',
  cursor: 'pointer',
}

function step(frames: number) {
  setAnimPlaying(false)
  seekAnimTime(getAnimTime() + frames / FPS)
}

export function TimeScrubber() {
  const time = useAnimTime()
  const playing = useSyncExternalStore(subscribeAnimControl, isAnimPlaying, () => true)
  const speed = useSyncExternalStore(subscribeAnimControl, getAnimSpeed, () => 1)
  const [open, setOpen] = useState(() =>
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('t') != null)

  // Slider range grows with time (derived, no state → no cascading renders).
  const duration = Math.max(30, Math.ceil(time / 15) * 15)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return
      const mult = e.shiftKey ? 10 : 1
      if (e.code === 'Comma') step(-mult)
      else if (e.code === 'Period') step(mult)
      else if (e.code === 'KeyP') setAnimPlaying(!isAnimPlaying())
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        title="Open time scrubber"
        style={{ ...btn, position: 'fixed', bottom: 16, right: 16, zIndex: 99999, backdropFilter: 'blur(8px)' }}
      >
        ⏱ {time.toFixed(1)}s
      </button>
    )
  }

  const writeUrlT = () => {
    const url = new URL(window.location.href)
    url.searchParams.set('t', time.toFixed(2))
    window.history.replaceState(null, '', url.toString())
    navigator.clipboard?.writeText(url.toString())
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: 14,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 99999,
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '8px 12px',
      background: '#0A1628ee',
      border: '1px solid #D4A84340',
      borderRadius: 8,
      backdropFilter: 'blur(8px)',
      color: '#E8D5B5',
      fontSize: 12,
      fontFamily: 'ui-monospace, monospace',
      maxWidth: '92vw',
    }}>
      <button style={{ ...btn, fontWeight: 600, minWidth: 34 }}
        onClick={() => setAnimPlaying(!playing)} title="Play/pause (P)">
        {playing ? '⏸' : '▶'}
      </button>
      <button style={btn} onClick={() => step(-1)} title="Back 1 frame (,) — Shift ×10">−1f</button>
      <button style={btn} onClick={() => step(1)} title="Forward 1 frame (.) — Shift ×10">+1f</button>

      <input
        type="range"
        min={0}
        max={duration}
        step={1 / FPS}
        value={Math.min(time, duration)}
        onChange={e => { setAnimPlaying(false); seekAnimTime(parseFloat(e.target.value)) }}
        style={{ width: 'min(420px, 40vw)', accentColor: '#D4A843' }}
      />

      <input
        value={time.toFixed(2)}
        onChange={e => {
          const v = parseFloat(e.target.value)
          if (!Number.isNaN(v)) { setAnimPlaying(false); seekAnimTime(v) }
        }}
        title="Exact time (seconds)"
        style={{
          width: 58, background: '#050A14', border: '1px solid #D4A84330',
          borderRadius: 3, color: '#E8D5B5', fontSize: 12, padding: '3px 5px',
          fontFamily: 'ui-monospace, monospace', textAlign: 'right',
        }}
      />
      <span style={{ opacity: 0.55 }}>s · f{Math.round(time * FPS)}</span>

      <select
        value={speed}
        onChange={e => setAnimSpeed(parseFloat(e.target.value))}
        title="Playback speed"
        style={{
          background: '#050A14', border: '1px solid #D4A84330', borderRadius: 3,
          color: '#D4A843', fontSize: 11, padding: '3px 4px',
        }}
      >
        {SPEEDS.map(s => <option key={s} value={s}>{s}×</option>)}
      </select>

      <button style={btn} onClick={writeUrlT}
        title="Write current time into the URL (?t=) and copy it — reload/screenshot lands on this exact frame">
        t→URL
      </button>
      <button style={{ ...btn, opacity: 0.7 }} onClick={() => setOpen(false)} title="Collapse">✕</button>
    </div>
  )
}
