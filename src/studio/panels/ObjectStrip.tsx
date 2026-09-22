/**
 * ObjectStrip — the `@object` half of the old console, kept.
 *
 * ── Why it is a separate line and not typed into the terminal ─────────
 * `@keeper move y 0.5` never went to a server. It is parsed in the browser and
 * applied to the live three.js object in the same frame — that immediacy is
 * the whole point, and routing it through a pty would make it a round trip
 * through a program that cannot reach the scene at all.
 *
 * The tempting alternative was to watch xterm's keystrokes, notice a line
 * starting with `@`, swallow it and handle it locally. That fails on the one
 * thing it has to survive: `claude` draws a FULL-SCREEN TUI that owns every
 * row and redraws them constantly. Characters we echo ourselves land in its
 * frame buffer and are gone on its next paint; characters we withhold leave
 * its own input line out of sync with what the user believes they typed. An
 * elegant interception that corrupts a redraw is worse than an honest second
 * input.
 *
 * So: the terminal is a terminal, and this is the scene's command line. It
 * appears only when the loaded scene actually registered objects, so on the
 * many scenes with none it costs nothing.
 */
import { useRef, useState, useSyncExternalStore } from 'react'
import { T } from '../ui/theme'
import { SELECT_ORANGE } from '../editable/ManipulatorLayer'
import {
  parseEntityCommand, runEntityCommand, completeMention, describeTransform,
} from '../editable/commands'
import {
  subscribeEditables, subscribeEditableTransforms, listEditables, getEditable,
  getSelectedId, selectEditable,
} from '../editable/store'

type Line = { text: string; error?: boolean }

export function ObjectStrip({ sceneKey }: { sceneKey: string }) {
  const [input, setInput] = useState('')
  const [last, setLast] = useState<Line | null>(null)
  const [menu, setMenu] = useState<{ from: number; options: string[]; index: number } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const history = useRef<string[]>([])
  const cursor = useRef(-1)

  const count = useSyncExternalStore(subscribeEditables, () => listEditables().length, () => 0)
  const selectedId = useSyncExternalStore(subscribeEditables, getSelectedId, () => null)
  // Re-read after any command so the readout tracks what just moved.
  useSyncExternalStore(subscribeEditableTransforms, () => {
    const t = selectedId ? describeTransform(selectedId) : null
    return t ? `${t.position}|${t.rotation}|${t.scale}` : ''
  }, () => '')

  if (count === 0) return null

  const selected = selectedId ? getEditable(selectedId) : undefined
  const t = selectedId ? describeTransform(selectedId) : null

  const submit = (raw: string) => {
    const line = raw.trim()
    if (!line) return
    history.current = [...history.current, line].slice(-100)
    cursor.current = -1
    const parsed = parseEntityCommand(line)
    if (!parsed) {
      setLast({ text: `not an object command — try @${listEditables()[0]?.id ?? 'id'} move y 0.5, or ls`, error: true })
      return
    }
    const r = runEntityCommand(parsed)
    setLast(r.kind === 'list'
      ? { text: r.ids.map(i => `@${i}`).join('  ') }
      : r.kind === 'card'
        ? { text: `@${r.id} → ${describeTransform(r.id)?.position ?? ''}` }
        : { text: r.text, error: r.error })
  }

  const accept = (id: string) => {
    if (!menu) return
    const caret = inputRef.current?.selectionStart ?? input.length
    setInput(`${input.slice(0, menu.from)}@${id} ${input.slice(caret)}`)
    setMenu(null)
    requestAnimationFrame(() => inputRef.current?.focus())
  }

  return (
    <div style={{ borderTop: `1px solid ${T.borderSoft}`, background: T.panel, flexShrink: 0 }}>
      {/* What is selected, and what it is doing. This is the readout the old
          chat panel put above its prompt; the terminal cannot show it because
          the terminal does not know the scene exists. */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6, padding: '3px 6px 0',
        fontSize: 9, fontFamily: T.mono, color: T.textFaint,
      }}>
        <span style={{ color: SELECT_ORANGE }}>◆</span>
        {selected && t ? (
          <>
            <button
              type="button"
              onClick={() => { setInput(v => `${v}@${selected.id} `); inputRef.current?.focus() }}
              title={`${selected.name} — click to put @${selected.id} on the line`}
              style={{
                background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                color: SELECT_ORANGE, fontFamily: T.mono, fontSize: 9, fontWeight: 700,
              }}
            >@{selected.id}</button>
            <span style={{ color: T.textDim, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {t.position}
            </span>
            <span style={{ flex: 1 }} />
            <button
              type="button"
              onClick={() => selectEditable(null)}
              title="Deselect (Esc)"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.textFaint, fontSize: 10, padding: 0 }}
            >✕</button>
          </>
        ) : (
          <span>{count} object{count > 1 ? 's' : ''} in {sceneKey} — click one, or type @</span>
        )}
      </div>

      {last && (
        <div style={{
          padding: '2px 8px', fontFamily: T.mono, fontSize: 9,
          color: last.error ? T.danger : T.textDim,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }} title={last.text}>{last.text}</div>
      )}

      <div style={{ position: 'relative' }}>
        {menu && (
          <div style={{
            position: 'absolute', bottom: '100%', left: 26, marginBottom: 2, zIndex: 30,
            background: T.panelAlt, border: `1px solid ${T.borderSoft}`, borderRadius: 4,
            overflow: 'hidden', minWidth: 150, boxShadow: '0 -4px 16px #00000066',
          }}>
            {menu.options.slice(0, 8).map((id, i) => (
              <div
                key={id}
                onMouseDown={ev => { ev.preventDefault(); accept(id) }}
                style={{
                  padding: '3px 8px', cursor: 'pointer', fontFamily: T.mono, fontSize: 10,
                  background: i === menu.index ? '#ffffff10' : 'transparent', color: SELECT_ORANGE,
                }}
              >@{id} <span style={{ color: T.textFaint }}>{getEditable(id)?.name}</span></div>
            ))}
          </div>
        )}
        <form
          onSubmit={e => { e.preventDefault(); const v = input; setInput(''); setMenu(null); submit(v) }}
          style={{ display: 'flex', gap: 5, padding: '4px 6px 5px', alignItems: 'center' }}
        >
          <span style={{ fontFamily: T.mono, fontSize: 10, color: SELECT_ORANGE, flexShrink: 0 }}>◆</span>
          <input
            ref={inputRef}
            value={input}
            spellCheck={false}
            placeholder="@id move y 0.5 · rot y 45 · scale 1.2 · hide · reset · ls"
            onChange={e => {
              setInput(e.target.value)
              const m = completeMention(e.target.value, e.target.selectionStart ?? e.target.value.length)
              setMenu(m ? { ...m, index: 0 } : null)
            }}
            onKeyDown={e => {
              // Stop every key here from reaching the studio's global keymap —
              // this is a real input so the keymap already stands down, but the
              // terminal is one element away and a stray Backspace ripple-deleting
              // a clip is not a mistake worth risking twice.
              e.stopPropagation()
              if (menu) {
                if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                  e.preventDefault()
                  const n = Math.min(menu.options.length, 8)
                  setMenu({ ...menu, index: (menu.index + (e.key === 'ArrowDown' ? 1 : -1) + n) % n })
                } else if (e.key === 'Tab' || (e.key === 'Enter' && menu.options.length)) {
                  e.preventDefault(); accept(menu.options[menu.index])
                } else if (e.key === 'Escape') setMenu(null)
                return
              }
              if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                const h = history.current
                if (!h.length) return
                e.preventDefault()
                cursor.current = Math.max(-1, e.key === 'ArrowUp'
                  ? Math.min(cursor.current + 1, h.length - 1)
                  : cursor.current - 1)
                setInput(cursor.current < 0 ? '' : h[h.length - 1 - cursor.current])
              }
            }}
            style={{
              flex: 1, minWidth: 0, background: T.inset,
              border: `1px solid ${T.borderSoft}`, borderRadius: 3,
              padding: '3px 6px', outline: 'none', color: T.text,
              fontFamily: T.mono, fontSize: 10,
            }}
            onFocus={e => { e.currentTarget.style.borderColor = SELECT_ORANGE }}
            onBlur={e => { e.currentTarget.style.borderColor = T.borderSoft }}
          />
        </form>
      </div>
    </div>
  )
}
