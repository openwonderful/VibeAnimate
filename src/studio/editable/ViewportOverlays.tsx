/**
 * ViewportOverlays — the DOM half of Blender mode, drawn over the stage.
 *
 *  - ObjectToolbar (left edge): mode column (G/R/S), axis constraint
 *    X/Y/Z, world/local space, snapping — Blender's toolbar affordances
 *    with the same single-key shortcuts.
 *  - TransformSidebar (right edge): Blender's N-panel. Numeric
 *    position/rotation/scale fields for the selected object, visibility,
 *    per-channel reset, and a paste-ready JSX snippet for the code.
 *  - PerfChip (bottom-left): fps · dpr · draw calls · tris · frameloop.
 *
 * All of it reads the editable store imperatively; the numeric fields
 * poll the transform channel rather than the 60fps clock, so an animating
 * scene never re-renders the editor chrome per frame (SPEC §12.1).
 */
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import {
  subscribeEditables, subscribeEditableTransforms, subscribePerf,
  listEditables, getSelectedEntry, selectEditable, getEditableTransform,
  setEditableTransform, resetEditableTransform, setEditableVisible,
  getGizmoMode, setGizmoMode, getAxisFilter, setAxisFilter,
  getGizmoSpace, toggleGizmoSpace, getSnapping, toggleSnapping,
  editableCodeSnippet, clearSceneOverrides, hasSceneOverrides, getPerf,
  type GizmoMode, type Vec3,
} from './store'
import { SELECT_ORANGE } from './ManipulatorLayer'
import { setPrefs } from '../state/prefs'
import { T } from '../ui/theme'

const MODES: { mode: GizmoMode; key: string; glyph: string; label: string }[] = [
  { mode: 'translate', key: 'G', glyph: '✥', label: 'Move (G)' },
  { mode: 'rotate', key: 'R', glyph: '⟳', label: 'Rotate (R)' },
  { mode: 'scale', key: 'S', glyph: '⤢', label: 'Scale (S)' },
]

/** X, Y, Z — the same red/green/blue the gizmo's arrows and the N-panel's
 *  field borders use, because they are the same three axes. */
const AXIS_COLOR = ['#c9424f', '#5f9e42', '#4a72c4']
const AXIS_INDEX = { x: 0, y: 1, z: 2 } as const

const toolBtn = (active: boolean): React.CSSProperties => ({
  width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: active ? SELECT_ORANGE + '2e' : '#1c1c1dcc',
  border: `1px solid ${active ? SELECT_ORANGE : T.borderSoft}`,
  color: active ? SELECT_ORANGE : T.textDim,
  borderRadius: 4, cursor: 'pointer', fontSize: 14, lineHeight: 1,
  userSelect: 'none', padding: 0, fontFamily: T.font,
})

/** Structure channel: selection, mode, axis, space, snap. */
function useEditableState() {
  return useSyncExternalStore(
    subscribeEditables,
    () => `${getSelectedEntry()?.id ?? ''}|${getGizmoMode()}|${getAxisFilter() ?? ''}|${getGizmoSpace()}|${getSnapping()}|${listEditables().length}`,
    () => '',
  )
}

/* ── Left tool column ──────────────────────────────────────────────── */

/** Caption over a group of tool buttons. The column used to be seven glyphs
 *  in a stack — ✥ ⟳ ⤢ X Y Z ⌗ — with the answer to "what is this" only in a
 *  tooltip, on a control you have to already suspect is a control. */
function ToolLabel({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      fontSize: 8, letterSpacing: '0.1em', textTransform: 'uppercase',
      color: T.textDim, textAlign: 'center', userSelect: 'none',
      fontFamily: T.font, marginTop: 5, marginBottom: 1,
      // Backing, because this label sits on the PICTURE — over a daylight
      // frame or the lit grid of the lab, unbacked 8px text disappears.
      background: '#1c1c1dcc', borderRadius: 2, padding: '1px 0',
    }}>{children}</span>
  )
}

/**
 * The object tools.
 *
 * NOTHING SELECTED IS A DIFFERENT PANEL, not a dimmed version of this one.
 * It used to draw the whole column the moment a scene registered any editable
 * object, so a stack of cryptic glyphs sat over the picture in shots where
 * every one of them was a no-op — there was no object for G/R/S to move and
 * no transform for X/Y/Z to constrain. Showing tools that cannot do anything
 * is how a viewport stops being legible; what belongs there instead is the
 * one fact you need, which is that clicking the picture will select something.
 */
export function ObjectToolbar() {
  useEditableState()
  const entry = getSelectedEntry()
  const objects = listEditables()
  const axis = getAxisFilter()
  if (objects.length === 0) return null

  if (!entry) return (
    <div style={{
      position: 'absolute', top: 10, left: 10, zIndex: 20,
      display: 'flex', alignItems: 'center', gap: 6, padding: '3px 8px',
      background: '#1c1c1dcc', border: `1px solid ${T.border}`, borderRadius: 4,
      fontSize: 10, color: T.textDim, fontFamily: T.font, userSelect: 'none',
      pointerEvents: 'none',
    }}>
      <span style={{ color: SELECT_ORANGE }}>◆</span>
      click an object to edit it
      <span style={{ color: T.textFaint }}>· {objects.length} here</span>
    </div>
  )

  return (
    <div style={{
      position: 'absolute', top: 10, left: 10, display: 'flex', flexDirection: 'column',
      gap: 4, zIndex: 20,
    }}>
      <ToolLabel>tool</ToolLabel>
      {MODES.map(m => (
        <button
          key={m.mode}
          title={`${m.label} — drag the gizmo in the viewport, or type numbers in the panel on the right`}
          onClick={() => setGizmoMode(m.mode)}
          style={toolBtn(getGizmoMode() === m.mode)}
        >{m.glyph}</button>
      ))}
      <ToolLabel>axis</ToolLabel>
      {(['x', 'y', 'z'] as const).map(a => (
        <button
          key={a}
          title={`Lock the drag to ${a.toUpperCase()} only (press ${a.toUpperCase()}; press it again to free it).`
            + ' Y is up.'}
          onClick={() => setAxisFilter(a)}
          style={{
            ...toolBtn(axis === a), fontSize: 11, fontWeight: 700, fontFamily: T.mono,
            // The gizmo's own arrows are already coloured per axis; matching
            // them is what makes "X" and "the red arrow" one idea.
            color: axis === a ? AXIS_COLOR[AXIS_INDEX[a]] : T.textDim,
            borderColor: axis === a ? AXIS_COLOR[AXIS_INDEX[a]] : T.borderSoft,
          }}
        >{a.toUpperCase()}</button>
      ))}
      <ToolLabel>opts</ToolLabel>
      <button
        title={getGizmoSpace() === 'local'
          ? 'LOCAL: the arrows follow the object\'s own rotation. Click for world axes.'
          : 'WORLD: the arrows follow the scene\'s axes. Click for the object\'s own.'}
        onClick={toggleGizmoSpace}
        style={{ ...toolBtn(getGizmoSpace() === 'local'), fontSize: 9, fontWeight: 700 }}
      >{getGizmoSpace() === 'local' ? 'LOC' : 'WLD'}</button>
      <button
        title="Snap to increments while dragging (0.25 units · 15° · 0.1×)"
        onClick={toggleSnapping}
        style={{ ...toolBtn(getSnapping()), fontSize: 13 }}
      >⌗</button>
      <button
        title="Deselect (Esc)"
        onClick={() => selectEditable(null)}
        style={{ ...toolBtn(false), fontSize: 12, marginTop: 8 }}
      >✕</button>
    </div>
  )
}

/* ── Right N-panel ─────────────────────────────────────────────────── */

const CHANNELS: { part: 'position' | 'rotation' | 'scale'; label: string; step: number; deg?: boolean }[] = [
  { part: 'position', label: 'Location', step: 0.05 },
  { part: 'rotation', label: 'Rotation', step: 1, deg: true },
  { part: 'scale', label: 'Scale', step: 0.02 },
]

/** Blender-style drag-scrub number field (drag horizontally or type). */
function NumField({ value, onChange, step, accent }: {
  value: number
  onChange: (v: number) => void
  step: number
  accent: string
}) {
  const [text, setText] = useState<string | null>(null)
  const drag = useRef<{ x: number; start: number } | null>(null)

  return (
    <input
      value={text ?? value.toFixed(3)}
      spellCheck={false}
      onChange={e => setText(e.target.value)}
      onBlur={() => {
        if (text !== null) {
          const v = parseFloat(text)
          if (Number.isFinite(v)) onChange(v)
          setText(null)
        }
      }}
      onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
      onPointerDown={e => {
        if (e.button !== 0 || document.activeElement === e.currentTarget) return
        drag.current = { x: e.clientX, start: value }
        e.currentTarget.setPointerCapture(e.pointerId)
      }}
      onPointerMove={e => {
        const d = drag.current
        if (!d) return
        const dx = e.clientX - d.x
        if (Math.abs(dx) < 3) return
        e.preventDefault()
        onChange(+(d.start + dx * step).toFixed(4))
      }}
      onPointerUp={e => {
        const moved = drag.current && Math.abs(e.clientX - drag.current.x) > 3
        drag.current = null
        e.currentTarget.releasePointerCapture(e.pointerId)
        if (!moved) e.currentTarget.select()
      }}
      style={{
        width: '100%', boxSizing: 'border-box', background: T.inset,
        border: `1px solid ${T.borderSoft}`, borderLeft: `2px solid ${accent}`,
        borderRadius: 3, color: T.text, fontFamily: T.mono, fontSize: 10,
        padding: '3px 5px', outline: 'none', cursor: 'ew-resize',
      }}
    />
  )
}

export function TransformSidebar() {
  useEditableState()
  // Re-read on every gizmo step so the numbers track the drag.
  useSyncExternalStore(subscribeEditableTransforms, () => {
    const e = getSelectedEntry()
    if (!e) return ''
    const t = getEditableTransform(e.id)
    return t ? `${t.position}|${t.rotation}|${t.scale}|${e.object.visible}` : ''
  }, () => '')

  const entry = getSelectedEntry()
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    if (!copied) return
    const id = setTimeout(() => setCopied(false), 1200)
    return () => clearTimeout(id)
  }, [copied])

  if (!entry) return null
  const t = getEditableTransform(entry.id)
  if (!t) return null
  const snippet = editableCodeSnippet(entry.id)

  return (
    <div style={{
      position: 'absolute', top: 10, right: 10, width: 214, zIndex: 20,
      background: '#1c1c1de8', border: `1px solid ${T.border}`, borderRadius: 5,
      backdropFilter: 'blur(3px)', overflow: 'hidden',
    }}>
      <div style={{
        padding: '5px 8px', borderBottom: `1px solid ${T.borderSoft}`,
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        <span style={{ width: 7, height: 7, borderRadius: 2, background: SELECT_ORANGE, flexShrink: 0 }} />
        <span style={{
          fontSize: 11, fontWeight: 700, color: T.text, flex: 1,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{entry.name}</span>
        <span
          title={'Where this object sits in the scene. Editing these poses it in the STUDIO ONLY —'
            + ' the scene file is untouched until you paste the JSX back with "copy JSX".'}
          style={{ fontSize: 8, letterSpacing: '0.08em', color: T.textFaint, cursor: 'help' }}
        >TRANSFORM</span>
        <button
          title={entry.object.visible ? 'Hide (H)' : 'Show (Alt+H)'}
          onClick={() => setEditableVisible(entry.id, !entry.object.visible)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
            fontSize: 11, color: entry.object.visible ? T.textDim : T.textFaint,
          }}
        >{entry.object.visible ? '👁' : '⃠'}</button>
      </div>

      <div style={{
        padding: '5px 8px', display: 'flex', alignItems: 'center', gap: 6,
        fontSize: 9, fontFamily: T.mono, color: T.textFaint,
      }}>
        <span>@{entry.id} · {entry.kind}</span>
        <span style={{ flex: 1 }} />
        {/*
         * "Select the thing, then talk about the thing." Selecting already
         * attaches the object to the console prompt — this is the signpost
         * that says so, for the case where the console is not the visible
         * tab and there is nothing on screen to reveal it.
         */}
        <button
          onClick={() => {
            setPrefs({ rightTab: 'console', stageMode: 'normal' })
            // After the rail has rendered, or there is no prompt to focus.
            requestAnimationFrame(() =>
              document.querySelector<HTMLInputElement>('[data-studio-prompt]')?.focus())
          }}
          title={`Ask Claude about ${entry.name} — it goes with the question, along with its source file and where it is right now`}
          style={{
            background: SELECT_ORANGE + '1c', border: `1px solid ${SELECT_ORANGE}55`,
            borderRadius: 3, color: SELECT_ORANGE, fontSize: 9, padding: '1px 6px',
            cursor: 'pointer', fontFamily: T.font, whiteSpace: 'nowrap',
          }}
        >ask Claude</button>
      </div>

      {CHANNELS.map(ch => (
        <div key={ch.part} style={{ padding: '0 8px 6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 3 }}>
            <span style={{ fontSize: 9, letterSpacing: '0.05em', textTransform: 'uppercase', color: T.textDim, flex: 1 }}>
              {ch.label}{ch.deg ? ' °' : ''}
            </span>
            <button
              title={`Reset ${ch.part} to the value in code`}
              onClick={() => resetEditableTransform(entry.id, ch.part)}
              style={{ background: 'none', border: 'none', color: T.textFaint, cursor: 'pointer', fontSize: 10, padding: 0 }}
            >⟲</button>
          </div>
          <div style={{ display: 'flex', gap: 3 }}>
            {[0, 1, 2].map(i => (
              <NumField
                key={i}
                accent={AXIS_COLOR[i]}
                step={ch.step}
                value={ch.deg ? +(t[ch.part][i] * 180 / Math.PI).toFixed(3) : t[ch.part][i]}
                onChange={v => {
                  const next = [...t[ch.part]] as Vec3
                  next[i] = ch.deg ? v * Math.PI / 180 : v
                  setEditableTransform(entry.id, { [ch.part]: next })
                }}
              />
            ))}
          </div>
        </div>
      ))}

      <div style={{ padding: '2px 8px 8px', display: 'flex', gap: 4 }}>
        <button
          onClick={() => { navigator.clipboard.writeText(snippet); setCopied(true) }}
          title={snippet}
          style={{
            flex: 1, background: T.panelAlt, border: `1px solid ${T.borderSoft}`,
            borderRadius: 3, color: copied ? T.play : T.textDim, fontSize: 9,
            padding: '3px 4px', cursor: 'pointer', fontFamily: T.font,
          }}
        >{copied ? '✓ copied' : 'copy JSX'}</button>
        <button
          onClick={() => resetEditableTransform(entry.id)}
          style={{
            background: T.panelAlt, border: `1px solid ${T.borderSoft}`,
            borderRadius: 3, color: T.textDim, fontSize: 9, padding: '3px 6px',
            cursor: 'pointer', fontFamily: T.font,
          }}
        >reset all</button>
      </div>
    </div>
  )
}

/* ── Stats chip ────────────────────────────────────────────────────── */

export function PerfChip() {
  const perf = useSyncExternalStore(subscribePerf, getPerf, getPerf)
  useEditableState()
  const dirty = hasSceneOverrides()
  const fpsColor = perf.frameloop === 'demand' ? T.textFaint : perf.fps >= 50 ? T.play : perf.fps >= 30 ? '#d0a24c' : T.danger
  return (
    <div style={{
      position: 'absolute', left: 10, bottom: 10, zIndex: 20, display: 'flex', gap: 6,
      alignItems: 'center', fontFamily: T.mono, fontSize: 9, color: T.textDim,
      background: '#1c1c1dcc', border: `1px solid ${T.border}`, borderRadius: 4,
      padding: '3px 7px', userSelect: 'none',
    }}>
      <span style={{ color: fpsColor }}>
        {perf.frameloop === 'demand' ? 'idle' : `${perf.fps} fps`}
      </span>
      <span style={{ color: T.textFaint }}>·</span>
      <span>{perf.dpr.toFixed(2)}×</span>
      <span style={{ color: T.textFaint }}>·</span>
      <span>{perf.calls} calls</span>
      <span style={{ color: T.textFaint }}>·</span>
      <span>{(perf.triangles / 1000).toFixed(1)}k tris</span>
      {dirty && (
        <>
          <span style={{ color: T.textFaint }}>·</span>
          <button
            title="Discard this scene's manual object edits"
            onClick={clearSceneOverrides}
            style={{
              background: 'none', border: 'none', padding: 0, cursor: 'pointer',
              color: SELECT_ORANGE, fontFamily: T.mono, fontSize: 9,
            }}
          >edited ⟲</button>
        </>
      )}
    </div>
  )
}
