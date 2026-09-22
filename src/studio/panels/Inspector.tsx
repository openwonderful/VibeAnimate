/**
 * Inspector — details + editing for the current selection.
 *
 * Timeline edits don't write files from the browser: adjusting a clip's
 * from/duration produces a regex-safe one-line `timeline.ts` literal to
 * copy out (the agent applies it) — see SPEC.md §4.
 */
import { useEffect, useState } from 'react'
import { sceneByKey, DEFAULT_DURATION_SEC, FPS } from '../../scenes/manifest'
import type { TimelineItem } from '../../remotion/timeline'
import type { Film } from '../films'
import { studioPost } from '../devApi'
import { ingredientById } from '../ingredients/registry'
import { T, panelStyle, panelHeaderStyle, btnStyle, inputStyle, chipStyle, fmtTime } from '../ui/theme'
import type { Selection } from '../types'

/** One regex-safe timeline.ts line for an item (keeps `key:` first). */
function itemLine(item: TimelineItem): string {
  const offsetSrc = item.offsetSec ? `, offsetSec: ${item.offsetSec}` : ''
  const propsSrc = item.props ? `, props: ${JSON.stringify(item.props).replace(/"([^"]+)":/g, '$1: ').replace(/"/g, "'")}` : ''
  return `  { key: '${item.key}', from: ${item.from}, duration: ${item.duration}${offsetSrc}${propsSrc} },`
}

/** Mounted with key=clip-index so state re-initializes per selected clip. */
function ClipEditor({ item }: { item: TimelineItem }) {
  const [from, setFrom] = useState(String(item.from))
  const [duration, setDuration] = useState(String(item.duration))
  const entry = sceneByKey(item.key)
  const f = parseFloat(from)
  const d = parseFloat(duration)
  const valid = Number.isFinite(f) && Number.isFinite(d) && d > 0
  const propsSrc = item.props ? `, props: ${JSON.stringify(item.props).replace(/"([^"]+)":/g, '$1: ').replace(/"/g, "'")}` : ''
  const line = valid ? `  { key: '${item.key}', from: ${f}, duration: ${d}${propsSrc} },` : ''
  const dirty = valid && (f !== item.from || d !== item.duration)
  return (
    <>
      <div style={{ fontSize: 14, fontWeight: 700, color: T.gold, fontFamily: T.mono, marginBottom: 8 }}>
        {item.key} <span style={{ fontSize: 10, color: T.textFaint }}>timeline clip</span>
      </div>
      <Row label="scene">{entry?.title ?? '—'}</Row>
      <Row label="range">{fmtTime(item.from)} → {fmtTime(item.from + item.duration)}</Row>
      {item.props && <Row label="props"><span style={{ fontSize: 11 }}>{JSON.stringify(item.props)}</span></Row>}

      <div style={{ marginTop: 14, fontSize: 11, color: T.textDim, marginBottom: 6 }}>Edit clip timing</div>
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, color: T.textFaint, marginBottom: 3 }}>from (s)</div>
          <input style={inputStyle} value={from} onChange={e => setFrom(e.target.value)} spellCheck={false} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, color: T.textFaint, marginBottom: 3 }}>duration (s)</div>
          <input style={inputStyle} value={duration} onChange={e => setDuration(e.target.value)} spellCheck={false} />
        </div>
      </div>
      {dirty && (
        <div style={{ marginTop: 10 }}>
          <div style={{ ...chipStyle, whiteSpace: 'pre', overflowX: 'auto', display: 'block', padding: 8, marginBottom: 6 }}>
            {line}
          </div>
          <CopyButton label="copy timeline.ts line" text={line} />
          <div style={{ fontSize: 10, color: T.textFaint, marginTop: 6, lineHeight: 1.5 }}>
            Paste over this clip's line in src/remotion/timeline.ts (or hand it to the agent).
          </div>
        </div>
      )}
    </>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0' }}>
      <span style={{ fontSize: 11, color: T.textDim, minWidth: 64, flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, minWidth: 0, fontSize: 12, fontFamily: T.mono, color: T.text }}>{children}</div>
    </div>
  )
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    if (!copied) return
    const id = setTimeout(() => setCopied(false), 1200)
    return () => clearTimeout(id)
  }, [copied])
  return (
    <button
      style={{ ...btnStyle, fontSize: 11, width: '100%', color: copied ? T.play : T.text }}
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true) }}
    >{copied ? '✓ copied' : label}</button>
  )
}

/** Persists the edited timeline through the dev server's write endpoint. */
function ApplyButton({ film, editedItems }: { film: Film; editedItems: TimelineItem[] }) {
  const [state, setState] = useState<'idle' | 'busy' | 'ok' | 'error'>('idle')
  return (
    <button
      style={{ ...btnStyle, fontSize: 11, width: '100%', marginTop: 6, color: state === 'ok' ? T.play : state === 'error' ? T.danger : T.gold }}
      disabled={state === 'busy'}
      onClick={async () => {
        setState('busy')
        try {
          const res = await studioPost('/__studio/apply-timeline',
            { filmId: film.id, items: editedItems })
          setState(res.ok ? 'ok' : 'error')
        } catch {
          setState('error')
        }
      }}
    >{state === 'busy' ? 'applying…' : state === 'ok' ? '✓ applied to file' : state === 'error' ? 'apply failed — see server log' : `apply to ${film.sourcePath.split('/').pop()}`}</button>
  )
}

export function Inspector({ selection, film, editedItems }: {
  selection: Selection
  film?: Film
  editedItems?: TimelineItem[]
}) {
  const timelineDirty = !!film && !!editedItems && editedItems !== film.items
  return (
    <div style={{ ...panelStyle, flex: 1 }}>
      <div style={panelHeaderStyle}><span>Inspector</span></div>
      <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
        {timelineDirty && (
          <div style={{
            marginBottom: 12, padding: 8, borderRadius: 6,
            border: `1px solid ${T.goldDim}`, background: '#5b96e812',
          }}>
            <div style={{ fontSize: 11, color: T.gold, fontWeight: 700, marginBottom: 6 }}>
              Timeline edited
            </div>
            <CopyButton
              label={`copy edited ${film.sourcePath.split('/').pop()} array`}
              text={editedItems.map(itemLine).join('\n')}
            />
            {import.meta.env.DEV && !film.timelineReadOnly && (
              <ApplyButton film={film} editedItems={editedItems} />
            )}
            <div style={{ fontSize: 10, color: T.textFaint, marginTop: 6, lineHeight: 1.5 }}>
              {film.timelineReadOnly
                ? `Paste over the array body in ${film.sourcePath} (its beat comments are hand-written — no direct write). Every film standing on it retimes together.`
                : `Copy for review, or apply writes ${film.sourcePath} via the dev server (HMR reloads the studio).`}
            </div>
          </div>
        )}
        {!selection && (
          <div style={{ fontSize: 12, color: T.textFaint, lineHeight: 1.6 }}>
            Select a clip in the Scenebuilder or a shot in the Shots panel.
            <div style={{ marginTop: 14, fontSize: 11, lineHeight: 1.7 }}>
              <b style={{ color: T.textDim }}>Transport</b><br />
              Space play/pause · ←/→ frame-step (Shift ×10)<br />
              J/K/L shuttle · Home/End clip start/end<br />
              1/2/3 switch films<br />
              <b style={{ color: T.textDim }}>Editing</b><br />
              B blade at playhead · Del ripple-delete<br />
              Ctrl+D duplicate · Ctrl+Z / +Shift undo/redo<br />
              drag clip = reorder · drag out-point = trim<br />
              <b style={{ color: T.textDim }}>Objects (Blender mode)</b><br />
              click to select · G/R/S move/rotate/scale<br />
              X/Y/Z constrain axis · Alt+G/R/S reset channel<br />
              H hide (Alt+H show) · Tab cycle · Esc deselect<br />
              N world/local · C snap<br />
              <b style={{ color: T.textDim }}>Tools</b><br />
              ` console (@object to drive a character) · ● Camera
            </div>
          </div>
        )}

        {selection?.type === 'shot' && (() => {
          const entry = sceneByKey(selection.key)
          if (!entry) return null
          return (
            <>
              <div style={{ fontSize: 14, fontWeight: 700, color: T.gold, fontFamily: T.mono, marginBottom: 8 }}>
                {entry.key}
              </div>
              <Row label="title">{entry.title}</Row>
              <Row label="group">{entry.group}</Row>
              <Row label="duration">{entry.durationSec ?? DEFAULT_DURATION_SEC}s @ {FPS}fps</Row>
              <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <CopyButton label="copy render command" text={`npm run render:act -- ${entry.key}`} />
                <CopyButton label="copy screenshot command" text={`node scripts/shot.mjs --act ${entry.key} --t 0,2,5`} />
              </div>
            </>
          )
        })()}

        {selection?.type === 'clip' && (
          <ClipEditor key={selection.index} item={selection.item} />
        )}

        {selection?.type === 'ingredient' && (() => {
          const ing = ingredientById.get(selection.id)
          if (!ing) return null
          return (
            <>
              <div style={{ fontSize: 14, fontWeight: 700, color: T.gold, fontFamily: T.mono, marginBottom: 8 }}>
                {ing.id}
              </div>
              <Row label="name">{ing.name}</Row>
              <Row label="category">{ing.category}</Row>
              <Row label="tags"><span style={{ fontSize: 11 }}>{ing.tags.join(', ')}</span></Row>
              <Row label="source"><span style={{ fontSize: 10 }}>{ing.sourcePath}</span></Row>
              <div style={{ fontSize: 11, color: T.textDim, lineHeight: 1.5, margin: '10px 0' }}>
                {ing.description}
              </div>
              <div style={{ fontSize: 11, color: T.textDim, marginBottom: 6 }}>Usage</div>
              <div style={{ ...chipStyle, whiteSpace: 'pre', overflowX: 'auto', display: 'block', padding: 8, marginBottom: 6, lineHeight: 1.6 }}>
                {ing.snippet}
              </div>
              <CopyButton label="copy usage snippet" text={ing.snippet} />
            </>
          )
        })()}
      </div>
    </div>
  )
}
