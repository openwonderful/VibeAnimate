/**
 * Leaf clock components — the ONLY studio components allowed to consume
 * useAnimTime() (which re-renders 60×/s). Everything else reads the
 * clock imperatively via getAnimTime() inside handlers, so per-frame
 * React work stays chip-sized (SPEC §12.1).
 */
import { useEffect, useRef, useState } from 'react'
import { useAnimTime } from '../../hooks/useAnimTime'
import { fmtFrame, fmtTime, readFrames } from '../frames'
import { T, chipStyle } from './theme'
import type { ViewTarget } from '../types'

/** Local-time chip (and optional master-time variant). */
export function ClockChip({ masterFrom = null, style }: {
  /** Non-null → show master time (from + local); null → local time. */
  masterFrom?: number | null
  style?: React.CSSProperties
}) {
  const time = useAnimTime()
  const value = masterFrom != null ? masterFrom + time : time
  return <span style={{ ...chipStyle, ...style }}>{fmtTime(value)}</span>
}

/** The Scenebuilder playhead: line + cap, positioned per frame. */
export function PlayheadLayer({ masterFrom, pps }: {
  masterFrom: number | null
  pps: number
}) {
  const time = useAnimTime()
  if (masterFrom == null) return null
  const masterTime = masterFrom + time
  return (
    <div style={{
      position: 'absolute', top: 0, bottom: 0, left: masterTime * pps,
      width: 1, background: T.gold, pointerEvents: 'none', zIndex: 5,
    }}>
      <div style={{
        position: 'absolute', top: 0, left: -4, width: 0, height: 0,
        borderLeft: '4.5px solid transparent', borderRight: '4.5px solid transparent',
        borderTop: `6px solid ${T.gold}`,
      }} />
    </div>
  )
}

/* ── Frame readouts (C3) ───────────────────────────────────────────────────
 * "What frame am I on" has five answers here (see studio/frames.ts). Three
 * of them are worth screen space:
 *
 *   f 2,025      where the playhead is on the FILM — what you quote when you
 *                say "the cut at 2,025" and what render --frames addresses
 *   +184/660     where it is inside the CLIP, and how long the clip is; the
 *                only one that survives blading a clip in half
 *   129          where it is inside the SOURCE SCENE — equal to the clip
 *                frame until an in-point exists, so it is shown only when it
 *                differs, rather than sitting there as a duplicate
 *
 * Split into two components on purpose: the live chip subscribes to the
 * clock, the editor does not, so typing a frame number is not fighting 60
 * re-renders a second for the caret.
 */

const frameChipStyle: React.CSSProperties = {
  ...chipStyle,
  fontVariantNumeric: 'tabular-nums',
  cursor: 'text',
  minWidth: 62,
  textAlign: 'center',
}

export function FrameChips({ view, filmDurationSec, onSeekMasterFrame, aspectLabel, style }: {
  view: ViewTarget
  filmDurationSec: number
  /** Seek by absolute master frame. Absent → the chip is read-only. */
  onSeekMasterFrame?: (frame: number) => void
  aspectLabel: string
  style?: React.CSSProperties
}) {
  const [editing, setEditing] = useState(false)
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 4, ...style }}>
      {editing && onSeekMasterFrame
        ? <FrameInput onCommit={f => { setEditing(false); onSeekMasterFrame(f) }} onCancel={() => setEditing(false)} />
        : (
          <LiveFrameChips
            view={view}
            filmDurationSec={filmDurationSec}
            onEdit={onSeekMasterFrame ? () => setEditing(true) : undefined}
          />
        )}
      <span style={{ ...chipStyle, color: T.textFaint }} title="Frame rate — one value, src/scenes/manifest.ts">
        {readFrames(view, 0, filmDurationSec).fps} fps
      </span>
      <span style={{ ...chipStyle, color: T.textFaint }} title="Aspect ratio of the stage">{aspectLabel}</span>
    </span>
  )
}

function LiveFrameChips({ view, filmDurationSec, onEdit }: {
  view: ViewTarget
  filmDurationSec: number
  onEdit?: () => void
}) {
  const f = readFrames(view, useAnimTime(), filmDurationSec)
  return (
    <>
      <span
        onClick={onEdit}
        title={f.masterFrame == null
          ? 'Detached from the timeline — no film frame. Click a clip to attach.'
          : `Film frame ${fmtFrame(f.masterFrame)} of ${fmtFrame(f.masterFrames ?? 0)}. Click to type one.`}
        style={{
          ...frameChipStyle,
          color: f.masterFrame == null ? T.textFaint : T.gold,
          borderColor: f.masterFrame == null ? undefined : T.goldDim,
          cursor: onEdit ? 'text' : 'default',
        }}
      >{f.masterFrame == null ? 'f —' : `f ${fmtFrame(f.masterFrame)}`}</span>

      <span
        title={`Frame ${f.clipFrame} within this clip, which is ${f.clipFrames} frames long (last frame ${f.clipFrames - 1}).`}
        style={{ ...frameChipStyle, cursor: 'default' }}
      >{`+${f.clipFrame} / ${f.clipFrames}`}</span>

      {/* Only when an in-point makes it a different number — otherwise it is
          the clip frame again, and a duplicate readout is worse than none. */}
      {f.sceneFrame !== f.clipFrame && (
        <span
          title={`Frame ${f.sceneFrame} of the source scene — this clip starts ${f.sceneFrame - f.clipFrame} frames in.`}
          style={{ ...frameChipStyle, cursor: 'default', color: T.textDim }}
        >{`s ${fmtFrame(f.sceneFrame)}`}</span>
      )}
    </>
  )
}

function FrameInput({ onCommit, onCancel }: {
  onCommit: (frame: number) => void
  onCancel: () => void
}) {
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => { ref.current?.select() }, [])
  return (
    <input
      ref={ref}
      autoFocus
      defaultValue=""
      placeholder="frame"
      onBlur={onCancel}
      onKeyDown={e => {
        e.stopPropagation()   // never let a digit reach the film switcher
        if (e.key === 'Escape') { onCancel(); return }
        if (e.key !== 'Enter') return
        const n = parseInt(e.currentTarget.value.replace(/[^\d-]/g, ''), 10)
        if (Number.isFinite(n)) onCommit(n)
        else onCancel()
      }}
      style={{
        ...frameChipStyle,
        width: 62,
        background: T.inset,
        border: `1px solid ${T.accent}`,
        color: T.text,
        outline: 'none',
        padding: '2px 6px',
      }}
    />
  )
}
