/**
 * Scenebuilder lanes below the clip track: the soundtrack's waveform and
 * the lyric sheet. Both are laid out in the same master seconds as the clip
 * track (x = t * pps), so a beat in the waveform sits directly under the
 * clip that plays on it — which is the entire point of putting them on one
 * timeline.
 */
import { useEffect, useRef, useState } from 'react'
import { loadWaveform, type Waveform } from '../audio/waveform'
import { lyricEnd, type LyricLine } from '../lyrics'
import { T, fmtTime } from '../ui/theme'

export const AUDIO_LANE_H = 44
export const LYRIC_LANE_H = 20

/**
 * The soundtrack as peaks, drawn to a canvas.
 *
 * Canvas rather than 2,048 divs: the lane redraws on every zoom step and
 * the DOM version janked. The decode is cached per URL (see waveform.ts),
 * so switching zoom or film never re-decodes.
 */
export function WaveformLane({ src, pps, width, muted }: {
  src: string
  pps: number
  width: number
  muted: boolean
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  // Keyed by the URL it came from, so "which src is this result for" is
  // data rather than a second piece of state to keep in sync — the lane's
  // loading/failed states are then derived, not assigned.
  const [result, setResult] = useState<{ src: string; wave: Waveform | null } | null>(null)

  useEffect(() => {
    if (!src) return
    let live = true
    loadWaveform(src).then(w => { if (live) setResult({ src, wave: w }) })
    return () => { live = false }
  }, [src])

  const wave = result?.src === src ? result.wave : null
  const state: 'idle' | 'loading' | 'failed' =
    !src || wave ? 'idle' : result?.src !== src ? 'loading' : 'failed'

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !wave) return
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    // The lane can be 6,000+ CSS px at high zoom; cap the backing store so
    // a zoom-in on a long film doesn't allocate a 24k-wide bitmap.
    const cssW = Math.max(1, Math.min(width, 16000))
    canvas.width = Math.floor(cssW * dpr)
    canvas.height = Math.floor(AUDIO_LANE_H * dpr)
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, cssW, AUDIO_LANE_H)

    const mid = AUDIO_LANE_H / 2
    const { peaks, duration } = wave
    ctx.fillStyle = muted ? '#4a4d52' : '#5b96e8'
    for (let x = 0; x < cssW; x++) {
      // x → master seconds → bucket. The song and the timeline share an
      // origin, so no offset: a clip at 1:27 sits over the song at 1:27.
      const t = x / pps
      if (t > duration) break
      const b = Math.min(peaks.length - 1, Math.floor((t / duration) * peaks.length))
      const h = Math.max(1, peaks[b] * (AUDIO_LANE_H - 6))
      ctx.fillRect(x, mid - h / 2, 1, h)
    }
    // Centre line, drawn over the peaks so quiet passages still read as a track.
    ctx.fillStyle = '#ffffff14'
    ctx.fillRect(0, mid, cssW, 1)
  }, [wave, pps, width, muted])

  return (
    <div style={{
      position: 'relative', height: AUDIO_LANE_H, marginTop: 6,
      background: '#0d0d0e', borderTop: `1px solid ${T.borderSoft}`,
      borderBottom: `1px solid ${T.borderSoft}`,
    }}>
      <canvas
        ref={canvasRef}
        style={{ display: 'block', width: Math.min(width, 16000), height: AUDIO_LANE_H, opacity: muted ? 0.45 : 1 }}
      />
      {state !== 'idle' && (
        <span style={{
          position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)',
          fontSize: 10, fontFamily: T.mono,
          color: state === 'failed' ? T.danger : T.textFaint,
        }}>
          {state === 'failed' ? 'could not decode this audio' : 'decoding waveform…'}
        </span>
      )}
      {!src && (
        <span style={{
          position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)',
          fontSize: 10, fontFamily: T.mono, color: T.textFaint,
        }}>no soundtrack</span>
      )}
    </div>
  )
}

/** Lyric cues as blocks; click one to jump the playhead to it. */
export function LyricLane({ lines, pps, onSeek }: {
  lines: LyricLine[]
  pps: number
  onSeek: (t: number) => void
}) {
  return (
    <div style={{ position: 'relative', height: LYRIC_LANE_H, marginTop: 4 }}>
      {lines.map((line, i) => {
        const end = lyricEnd(lines, i)
        const w = Math.max(2, (end - line.t) * pps - 2)
        return (
          <div
            key={`${line.t}-${i}`}
            onPointerDown={e => { e.stopPropagation(); onSeek(line.t) }}
            title={`${fmtTime(line.t)} — ${line.text || '(gap)'}`}
            style={{
              position: 'absolute', left: line.t * pps, width: w,
              top: 0, height: LYRIC_LANE_H - 2,
              background: line.text ? '#75604a40' : 'transparent',
              border: `1px solid ${line.text ? '#75604a' : T.borderSoft}`,
              borderRadius: 3, boxSizing: 'border-box',
              fontSize: 9, color: T.text, lineHeight: '16px',
              padding: '0 5px', overflow: 'hidden', whiteSpace: 'nowrap',
              userSelect: 'none', cursor: 'pointer',
            }}
          >{w > 24 ? line.text : ''}</div>
        )
      })}
    </div>
  )
}
