/**
 * TopBar — brand, workspace switcher, transport, and the readouts.
 *
 * The readouts are the reason this is its own file. Before C3 there was no
 * frame number anywhere in the studio and two identical `m:ss.ff` chips whose
 * last field was frames without saying so; "which frame is that cut on" was
 * unanswerable without arithmetic. Now the bar carries the film frame, the
 * clip-relative frame with the clip's length, the frame rate and the aspect,
 * in the gutter that was already empty.
 */
import { useSyncExternalStore } from 'react'
import {
  getAnimSpeed, getAnimTime, isAnimPlaying, seekAnimTime, setAnimPlaying, setAnimSpeed,
  subscribeAnimControl,
} from '../../hooks/useAnimTime'
import { FPS } from '../../scenes/manifest'
import { ClockChip, FrameChips } from '../ui/clock'
import { T, btnStyle, chipStyle } from '../ui/theme'
import { RenderMenu } from './RenderMenu'
import type { TimelineItem } from '../../remotion/timeline'
import type { Film } from '../films'
import type { Selection, ViewMode, ViewTarget } from '../types'

export function TopBar({
  view, film, items, selection, aspectLabel, viewMode, onViewMode,
  onOpenSettings, onSeekMasterFrame,
}: {
  view: ViewTarget
  film: Film
  items: TimelineItem[]
  selection: Selection
  aspectLabel: string
  viewMode: ViewMode
  onViewMode: (m: ViewMode) => void
  onOpenSettings: () => void
  onSeekMasterFrame: (frame: number) => void
}) {
  const playing = useSyncExternalStore(subscribeAnimControl, isAnimPlaying, () => false)
  const speed = useSyncExternalStore(subscribeAnimControl, getAnimSpeed, () => 1)

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '6px 12px',
      background: T.panel, border: `1px solid ${T.border}`, borderRadius: 8, flexShrink: 0,
      userSelect: 'none',
    }}>
      <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.14em', color: T.text }}>
        FLOW<span style={{ fontWeight: 300, color: T.textDim }}> STUDIO</span>
      </span>
      <span style={{ fontSize: 11, color: T.textFaint }}>{film.name}</span>

      {/* Workspace switcher. All three are views of ONE state — same clock,
          same selection, same timeline — so this changes what you look at,
          not where you are. V cycles edit ⇄ storyboard; preview is a click,
          because it is the one you leave running rather than flick to. */}
      <div style={{ display: 'flex', gap: 2, marginLeft: 6 }}>
        {([['edit', 'edit'], ['board', 'storyboard'], ['preview', 'preview']] as const).map(([mode, label]) => (
          <button
            key={mode}
            onClick={() => onViewMode(mode)}
            title={mode === 'preview'
              ? 'Play the rendered film instead of the live scene — the master runs at 22 fps in Acts 1–3 and the render does not'
              : `${label} view (V)`}
            style={{
              ...btnStyle, padding: '4px 9px', fontSize: 11, fontWeight: 600,
              letterSpacing: '0.04em',
              background: viewMode === mode ? '#5b96e826' : 'transparent',
              color: viewMode === mode ? T.select : T.textFaint,
              border: `1px solid ${viewMode === mode ? T.accent : 'transparent'}`,
            }}
          >{label}</button>
        ))}
      </div>

      <span style={{ flex: 1 }} />

      {/* Transport */}
      <button style={btnStyle} title="Go to clip start (Home)" onClick={() => seekAnimTime(0)}>⏮</button>
      <button
        style={{ ...btnStyle, width: 46, color: playing ? T.play : T.gold, fontWeight: 700 }}
        title="Play/pause (Space)"
        onClick={() => setAnimPlaying(!playing)}
      >{playing ? '❚❚' : '▶'}</button>
      <button style={btnStyle} title="Step +1 frame (→)" onClick={() => { setAnimPlaying(false); seekAnimTime(getAnimTime() + 1 / FPS) }}>⏭</button>

      {/* Time, then frames. Both, because they answer different questions:
          a lyric lands on a SECOND, a cut lands on a FRAME. */}
      <ClockChip style={{ fontSize: 12, color: T.gold, borderColor: T.goldDim, minWidth: 74, textAlign: 'center' }} />
      {view.masterFrom != null
        ? <ClockChip masterFrom={view.masterFrom} style={{ minWidth: 54, textAlign: 'center' }} />
        : <span style={{ ...chipStyle, minWidth: 54, textAlign: 'center' }} title="Detached from the timeline — this shot has no film position.">free</span>}

      <FrameChips
        view={view}
        filmDurationSec={film.durationSec}
        aspectLabel={aspectLabel}
        onSeekMasterFrame={onSeekMasterFrame}
      />

      <select
        value={speed}
        onChange={e => setAnimSpeed(parseFloat(e.target.value))}
        style={{ ...btnStyle, padding: '4px 6px', fontFamily: T.mono, fontSize: 11 }}
      >
        {[0.1, 0.25, 0.5, 1, 2, 4].map(s => <option key={s} value={s}>{s}×</option>)}
      </select>

      <span style={{ flex: 1 }} />
      {/* No console button here. It was a second door to a panel that is
          permanently in the right rail with its own tab, and ` opens it —
          two affordances for one thing, one of which sat in the busiest
          strip in the editor. */}
      <RenderMenu film={film} items={items} view={view} selection={selection} />
      <button
        style={{ ...chipStyle, cursor: 'pointer', color: T.textDim }}
        title="Settings"
        onClick={onOpenSettings}
      >⚙</button>
      <a href="/" style={{ ...chipStyle, textDecoration: 'none', color: T.textDim }}>← viewer</a>
    </div>
  )
}
