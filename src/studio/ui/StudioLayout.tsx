/**
 * StudioLayout — the rails and splits, as ONE state machine.
 *
 * Split out of the shell (F1) so that focus mode, fullscreen and a collapsed
 * Scenebuilder are three values of one thing rather than three independent
 * booleans sprinkled through the JSX. Everything about where a panel goes is
 * here; nothing about what a panel does is.
 *
 * The shell hands it slots. It does not know what is in them.
 */
import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { T } from './theme'
import type { RightTab, StageMode } from '../state/prefs'

export type LayoutSlots = {
  topBar: ReactNode
  /** Left rail — shots / ingredients. Hidden in focus and fullscreen. */
  left?: ReactNode
  center: ReactNode
  /** Right rail — outliner / inspector. Hidden in focus and fullscreen. */
  right?: ReactNode
  /** Console drawer, between the workspace row and the timeline. */
  console?: ReactNode
  /** Scenebuilder. Hidden in fullscreen. */
  timeline?: ReactNode
  /** Mounted always, rendering nothing — the song, the keymap probes. */
  ambient?: ReactNode
}

export const LEFT_RAIL_W = 250
/**
 * Wider than it was (290), because the rail is a terminal now and Claude
 * Code's own layout wants about 40 columns before it starts wrapping its
 * frame. At the studio's 11px mono the advance is ~6.6px, so 290 bought
 * exactly 40 — the edge of usable. 420 is a comfortable ~60.
 */
export const RIGHT_RAIL_W = 420

/** Narrow enough that a shot title still fits; wide enough that a very wide
 *  monitor can give the asset browser a real column. */
export const LEFT_RAIL_MIN_W = 170
export const LEFT_RAIL_MAX_W = 560
export const RIGHT_RAIL_MIN_W = 240
/** Generous: reading a long answer or a diff in here is a real thing to want,
 *  and the stage keeps its aspect however much room is left. */
export const RIGHT_RAIL_MAX_W = 900

/**
 * The three modes, and what each one is FOR:
 *
 *   normal  everything.
 *   focus   both rails away, timeline kept. For working on the picture while
 *           still being able to move the playhead — which is most of editing.
 *   full    only the picture, edge to edge. For judging a frame with nothing
 *           beside it to compare against.
 *
 * `full` drops the top bar too, so the way back out has to be ON the picture:
 * the viewport draws an `✕ esc` chip in that mode, and Esc works.
 */
export function StudioLayout({
  topBar, left, center, right, console: consolePanel, timeline, ambient,
  timelineHeight = 262, mode = 'normal', onTimelineHeight,
  leftWidth = LEFT_RAIL_W, onLeftWidth,
  rightWidth = RIGHT_RAIL_W, onRightWidth,
}: LayoutSlots & {
  timelineHeight?: number
  mode?: StageMode
  onTimelineHeight?: (h: number) => void
  leftWidth?: number
  onLeftWidth?: (w: number) => void
  rightWidth?: number
  onRightWidth?: (w: number) => void
}) {
  const full = mode === 'full'
  const rails = mode === 'normal'
  return (
    <div style={{
      position: 'fixed', inset: 0, background: T.bg, color: T.text,
      fontFamily: T.font, display: 'flex', flexDirection: 'column',
      gap: full ? 0 : 8, padding: full ? 0 : 8,
      boxSizing: 'border-box',
    }}>
      {!full && topBar}
      {/*
       * THE RIGHT RAIL IS A FULL-HEIGHT COLUMN, beside the Scenebuilder rather
       * than above it.
       *
       * It used to live inside the workspace row, which put the bottom of the
       * rail at the top of the timeline and left the panel about 250px tall.
       * That was survivable for an Inspector and useless for a terminal: a TUI
       * in 250px is roughly 16 rows, and Claude Code spends most of them on
       * its own frame. So the row/column nesting is inverted here — everything
       * that scrolls with the film (rails, stage, Scenebuilder) is one column,
       * and the rail stands beside all of it.
       */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ flex: 1, minHeight: 0, display: 'flex', gap: 8 }}>
            {rails && left != null && (
              <>
                <div style={{ width: leftWidth, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {left}
                </div>
                <ColumnResizeHandle width={leftWidth} onWidth={onLeftWidth} />
              </>
            )}
            {center}
          </div>
          {!full && consolePanel}
          {!full && timeline != null && (
            <>
              <ResizeHandle height={timelineHeight} onHeight={onTimelineHeight} />
              {/* Height covers the audio strip + ruler + lyric, clip and waveform
                  lanes; the lane stack scrolls inside if a film adds an overlay
                  track. Resizable because that budget is per-film — a film with
                  an overlay track needs more, and 262 was a guess. */}
              <div style={{ height: timelineHeight, flexShrink: 0, display: 'flex' }}>
                {timeline}
              </div>
            </>
          )}
        </div>
        {rails && right != null && (
          <>
            <ColumnResizeHandle
              width={rightWidth}
              onWidth={onRightWidth}
              // The seam is on the rail's LEFT, so dragging left widens it.
              invert
              min={RIGHT_RAIL_MIN_W}
              max={RIGHT_RAIL_MAX_W}
              reset={RIGHT_RAIL_W}
              label="right rail"
            />
            <div style={{ width: rightWidth, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {right}
            </div>
          </>
        )}
      </div>
      {ambient}
    </div>
  )
}

/** Minimum useful Scenebuilder: the audio strip, the ruler and the clip
 *  track. Below this the lanes are unreadable rather than compact. */
export const TIMELINE_MIN_H = 96
export const TIMELINE_MAX_H = 620

/**
 * Drag the divider to resize the Scenebuilder; double-click to collapse it.
 *
 * Pointer capture rather than window listeners: the pointer leaves the 6px
 * strip on the first frame of any real drag, and without capture the drag
 * ends the moment it starts working.
 */
function ResizeHandle({ height, onHeight }: {
  height: number
  onHeight?: (h: number) => void
}) {
  const drag = useRef<{ y: number; h: number } | null>(null)
  useEffect(() => () => { drag.current = null }, [])
  if (!onHeight) return null
  return (
    <div
      onPointerDown={e => {
        drag.current = { y: e.clientY, h: height }
        ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
      }}
      onPointerMove={e => {
        const d = drag.current
        if (!d) return
        // Dragging UP makes it taller — the divider is above the panel.
        onHeight(Math.max(TIMELINE_MIN_H, Math.min(TIMELINE_MAX_H, d.h - (e.clientY - d.y))))
      }}
      onPointerUp={() => { drag.current = null }}
      onDoubleClick={() => onHeight(0)}
      title="Drag to resize the Scenebuilder · double-click to collapse"
      style={{
        height: 6, flexShrink: 0, cursor: 'ns-resize',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div style={{ width: 44, height: 2, borderRadius: 1, background: T.borderSoft }} />
    </div>
  )
}

/**
 * Drag the seam to widen the left rail; double-click to put it back.
 *
 * Same pointer-capture rule as ResizeHandle, and for the same reason: the
 * pointer leaves the 6px strip on the first frame of any real drag. The gap
 * this sits in was already there — the row lays its columns out with `gap: 8`
 * — so the handle costs no layout, it just makes the existing seam grabbable.
 */
function ColumnResizeHandle({
  width, onWidth, invert = false,
  min = LEFT_RAIL_MIN_W, max = LEFT_RAIL_MAX_W, reset = LEFT_RAIL_W,
  label = 'left rail',
}: {
  width: number
  onWidth?: (w: number) => void
  /** The seam is on the column's RIGHT edge by default; `invert` puts it on
   *  the left, so dragging towards the centre of the screen widens it. */
  invert?: boolean
  min?: number
  max?: number
  reset?: number
  label?: string
}) {
  const drag = useRef<{ x: number; w: number } | null>(null)
  useEffect(() => () => { drag.current = null }, [])
  if (!onWidth) return null
  return (
    <div
      onPointerDown={e => {
        drag.current = { x: e.clientX, w: width }
        ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
      }}
      onPointerMove={e => {
        const d = drag.current
        if (!d) return
        const dx = (e.clientX - d.x) * (invert ? -1 : 1)
        onWidth(Math.max(min, Math.min(max, d.w + dx)))
      }}
      onPointerUp={() => { drag.current = null }}
      onDoubleClick={() => onWidth(reset)}
      title={`Drag to resize the ${label} · double-click to reset`}
      style={{
        width: 6, flexShrink: 0, cursor: 'ew-resize', marginLeft: -7, marginRight: -7,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div style={{ width: 2, height: 44, borderRadius: 1, background: T.borderSoft }} />
    </div>
  )
}

/**
 * The collapsed Scenebuilder: a rail that still shows the playhead.
 *
 * Collapsing to nothing would be the easy version and the wrong one — the
 * playhead's position in the film is the one thing you cannot reconstruct
 * from the picture, and losing it is why "just hide the panel" is not the
 * same feature.
 */
export function TimelineRail({ progress, label, onExpand }: {
  /** 0..1 through the film, or null when detached from the timeline. */
  progress: number | null
  label: string
  onExpand: () => void
}) {
  return (
    <div
      onClick={onExpand}
      title="Show the Scenebuilder"
      style={{
        height: 22, flexShrink: 0, cursor: 'pointer', position: 'relative',
        background: T.panel, border: `1px solid ${T.border}`, borderRadius: 4,
        display: 'flex', alignItems: 'center', gap: 8, padding: '0 10px',
        fontSize: 10, color: T.textFaint, letterSpacing: '0.08em',
        textTransform: 'uppercase', userSelect: 'none', overflow: 'hidden',
      }}
    >
      <span>▴ scenebuilder</span>
      <span style={{ textTransform: 'none', letterSpacing: 0 }}>{label}</span>
      {progress != null && (
        <div style={{
          position: 'absolute', left: `${Math.max(0, Math.min(1, progress)) * 100}%`,
          top: 0, bottom: 0, width: 1, background: T.gold,
        }} />
      )}
    </div>
  )
}

/**
 * The right rail, tabbed (C2).
 *
 * The console was a DRAWER between the viewport row and the timeline, which
 * shoved both of them every time it opened — the one panel you open to look
 * something up was also the one that moved everything you were looking at.
 * It belongs where the other inspectors live.
 *
 * Outliner and Inspector keep a STACKED mode as well as tabs, because posing
 * an object reads both at once: the Outliner says what is selectable and the
 * Inspector says where the selected thing is. Splitting them into tabs would
 * make Blender mode a two-click loop.
 */
export function RightRail({ tab, stacked, onTab, onStacked, outliner, inspector, console: consolePanel }: {
  tab: RightTab
  stacked: boolean
  onTab: (t: RightTab) => void
  onStacked: (v: boolean) => void
  outliner: ReactNode
  inspector: ReactNode
  console: ReactNode
}) {
  // The id stays `console` — it is in stored prefs and in the `?console=1`
  // deep link, and renaming it would silently reset both. Only the label
  // moved, to match what the panel now is.
  const TABS: { id: RightTab; label: string }[] = [
    { id: 'outliner', label: 'outliner' },
    { id: 'inspector', label: 'inspector' },
    { id: 'console', label: 'claude' },
  ]
  // In stacked mode the two object panels share the column, so the tab strip
  // only chooses between "the pair" and the console.
  const showPair = stacked && tab !== 'console'

  return (
    <>
      <div style={{ display: 'flex', gap: 3, flexShrink: 0, alignItems: 'center' }}>
        {TABS.map(t => {
          const on = t.id === 'console' ? tab === 'console' : showPair || tab === t.id
          const dim = showPair && t.id !== 'console'
          return (
            <button
              key={t.id}
              onClick={() => onTab(t.id)}
              title={t.id === 'console' ? 'Ask Claude about this film (`)' : t.label}
              style={{
                flex: 1, padding: '5px 0', fontSize: 10, fontWeight: 700,
                letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer',
                background: on ? T.panel : 'transparent',
                color: on ? (dim ? T.textDim : T.gold) : T.textFaint,
                border: `1px solid ${on ? T.border : 'transparent'}`,
                borderRadius: 6, userSelect: 'none',
              }}
            >{t.label}</button>
          )
        })}
        <button
          onClick={() => onStacked(!stacked)}
          title={stacked
            ? 'Stack outliner + inspector — posing an object reads both'
            : 'One panel at a time'}
          style={{
            padding: '5px 7px', fontSize: 10, cursor: 'pointer', borderRadius: 6,
            background: 'transparent', userSelect: 'none',
            color: stacked ? T.gold : T.textFaint,
            border: `1px solid ${stacked ? T.border : 'transparent'}`,
          }}
        >{stacked ? '⧉' : '▤'}</button>
      </div>
      {tab === 'console' ? consolePanel : showPair ? <>{outliner}{inspector}</> : tab === 'outliner' ? outliner : inspector}
    </>
  )
}
