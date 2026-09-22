/**
 * TRACK HEADERS (C1) — the controls for each lane, in a fixed gutter down
 * the left of the lane stack.
 *
 * This used to be one full-width strip above the whole stack, which meant
 * the audio controls were nowhere near the waveform and the lyric controls
 * were nowhere near the lyric lane. A header column that stays put while the
 * lanes scroll sideways is most of what makes a timeline read as an NLE, and
 * it is where S4's camera-lane controls will go.
 *
 * Two sources for each: whatever is already under public/audio and
 * public/lyrics (listed by the dev server's /__studio/media endpoint), or a
 * file off the local disk. A local file becomes an object URL and lives for
 * the session only — it is deliberately NOT copied into public/, because
 * that would make the render pipeline silently depend on a file nobody
 * committed. The picker says so.
 */
import { T, btnStyle, chipStyle } from '../ui/theme'
import type { StudioMedia as Media } from '../state/useStudioMedia'
import type { SoundtrackState } from '../types'

const selectStyle: React.CSSProperties = {
  ...btnStyle, padding: '1px 3px', fontSize: 9, fontFamily: T.mono,
  maxWidth: '100%', minWidth: 0,
}

/** Lane name, in the gutter. Uppercase and small — it is a label, not a
 *  control, and it must not compete with the picture beside it. */
export function LaneLabel({ children, color }: { children: React.ReactNode; color?: string }) {
  return (
    <span style={{
      fontSize: 9, fontWeight: 700, letterSpacing: '0.08em',
      color: color ?? T.textDim, userSelect: 'none', flexShrink: 0,
    }}>{children}</span>
  )
}

/* ── Track headers ──────────────────────────────────────────────────────
 * One per lane, sized by the caller to match the lane it labels. They are
 * deliberately narrow: everything here is a picker or a toggle, and the
 * space belongs to the film. */

export function AudioTrackHeader({ soundtrack, onSoundtrackChange, media }: {
  soundtrack: SoundtrackState
  onSoundtrackChange: (next: Partial<SoundtrackState>) => void
  media: Media
}) {
  const current = soundtrack.src.replace(/^\//, '')
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <LaneLabel>AUDIO</LaneLabel>
        <button
          style={{
            ...btnStyle, padding: '0 5px', fontSize: 9,
            color: soundtrack.muted ? T.danger : T.textDim,
            borderColor: soundtrack.muted ? T.danger : T.borderSoft,
          }}
          title="Mute the soundtrack (the clock keeps running)"
          onClick={() => onSoundtrackChange({ muted: !soundtrack.muted })}
        >{soundtrack.muted ? 'M' : '🔊'}</button>
        <label style={{ ...chipStyle, cursor: 'pointer', padding: '0 4px', fontSize: 9 }} title="Load an audio file from disk (session only — never copied into public/, so a render cannot silently depend on it)">
          ⬆
          <input
            type="file"
            accept="audio/*"
            style={{ display: 'none' }}
            onChange={e => {
              const f = e.target.files?.[0]
              if (f) onSoundtrackChange({ src: URL.createObjectURL(f), name: `${f.name} (local)` })
              e.target.value = ''
            }}
          />
        </label>
      </div>
      <select
        value={media.audio.includes(current) ? current : ''}
        onChange={e => {
          const v = e.target.value
          onSoundtrackChange(v ? { src: `/${v}`, name: v.split('/').pop() ?? v } : { src: '', name: 'none' })
        }}
        style={selectStyle}
        title="Soundtrack from public/audio"
      >
        <option value="">— none —</option>
        {media.audio.map(f => <option key={f} value={f}>{f.split('/').pop()}</option>)}
        {soundtrack.src && !media.audio.includes(current) && (
          <option value="">{soundtrack.name}</option>
        )}
      </select>
      <input
        type="range"
        min={0} max={1} step={0.01}
        value={soundtrack.volume}
        onChange={e => onSoundtrackChange({ volume: parseFloat(e.target.value) })}
        title={`Level ${Math.round(soundtrack.volume * 100)}%`}
        style={{ width: '100%', accentColor: T.accent, height: 10 }}
      />
    </>
  )
}

export function LyricTrackHeader({ lyricName, lyricCount, onLyricsLoad, showLyrics, onShowLyrics, media }: {
  lyricName: string
  lyricCount: number
  onLyricsLoad: (name: string, text: string) => void
  showLyrics: boolean
  onShowLyrics: (show: boolean) => void
  media: Media
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0 }}>
      <LaneLabel>LYRICS</LaneLabel>
      <select
        value=""
        onChange={e => {
          const v = e.target.value
          if (!v) return
          fetch(`/${v}`)
            .then(r => (r.ok ? r.text() : ''))
            .then(text => { if (text) onLyricsLoad(v.split('/').pop() ?? v, text) })
            .catch(() => { /* leave the current sheet in place */ })
          e.target.value = ''
        }}
        style={{ ...selectStyle, flex: 1, minWidth: 0 }}
        title={`Lyric sheet from public/lyrics${lyricCount ? ` — ${lyricCount} cues` : ''}`}
      >
        <option value="">{lyricName || '— none —'}</option>
        {media.lyrics.map(f => <option key={f} value={f}>{f.split('/').pop()}</option>)}
      </select>
      <label style={{ ...chipStyle, cursor: 'pointer', padding: '0 4px', fontSize: 9 }} title="Load an .lrc from disk (session only)">
        ⬆
        <input
          type="file"
          accept=".lrc,.txt,text/plain"
          style={{ display: 'none' }}
          onChange={e => {
            const f = e.target.files?.[0]
            if (f) f.text().then(text => onLyricsLoad(`${f.name} (local)`, text))
            e.target.value = ''
          }}
        />
      </label>
      <button
        style={{
          ...btnStyle, padding: '0 5px', fontSize: 9,
          color: showLyrics ? T.select : T.textFaint,
          borderColor: showLyrics ? T.accent : T.borderSoft,
        }}
        title="Draw the current lyric over the viewport (editing aid — never rendered into the film)"
        onClick={() => onShowLyrics(!showLyrics)}
      >⌸</button>
    </div>
  )
}
