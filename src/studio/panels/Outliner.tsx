/**
 * Outliner — Blender's object list for the loaded scene. Every
 * <Editable> the scene registered, with select / visibility toggles and
 * the @id you type in the console. Reads the editable store directly
 * (imperative, structure channel only) so an animating scene never
 * re-renders this list per frame.
 */
import { useSyncExternalStore } from 'react'
import {
  subscribeEditables, listEditables, getSelectedId, selectEditable,
  setEditableVisible, type EditableKind,
} from '../editable/store'
import { SELECT_ORANGE } from '../editable/ManipulatorLayer'
import { T, panelStyle, panelHeaderStyle, chipStyle } from '../ui/theme'

const KIND_GLYPH: Record<EditableKind, string> = {
  character: '☻', prop: '◈', environment: '⛰', light: '☀', fx: '✧', object: '□',
}

export function Outliner() {
  const stamp = useSyncExternalStore(
    subscribeEditables,
    () => `${listEditables().map(e => e.id + (e.object.visible ? '' : '!')).join(',')}|${getSelectedId() ?? ''}`,
    () => '',
  )
  void stamp
  const objects = listEditables()
  const selected = getSelectedId()

  return (
    <div style={{ ...panelStyle, maxHeight: 220, flexShrink: 0 }}>
      <div style={panelHeaderStyle}>
        <span>Outliner</span>
        <span style={chipStyle}>{objects.length}</span>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '2px 0' }}>
        {objects.length === 0 && (
          <div style={{ padding: '8px 12px', fontSize: 10, color: T.textFaint, lineHeight: 1.6 }}>
            No editable objects in this scene.<br />
            Wrap an actor in <span style={{ fontFamily: T.mono, color: T.textDim }}>&lt;Editable id="…"&gt;</span> to
            select it in the viewport and address it as <span style={{ fontFamily: T.mono, color: SELECT_ORANGE }}>@id</span> in
            the console. Try <span style={{ fontFamily: T.mono, color: T.textDim }}>lab.manip</span>.
          </div>
        )}
        {objects.map(o => {
          const isSel = o.id === selected
          return (
            <div
              key={o.id}
              /* stable hook for CDP tooling / demo recording */
              data-editable-row={o.id}
              onClick={() => selectEditable(isSel ? null : o.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 7, padding: '3px 10px',
                cursor: 'pointer', userSelect: 'none',
                background: isSel ? SELECT_ORANGE + '1f' : 'transparent',
                borderLeft: `2px solid ${isSel ? SELECT_ORANGE : 'transparent'}`,
                opacity: o.object.visible ? 1 : 0.45,
              }}
            >
              <span style={{ fontSize: 11, color: isSel ? SELECT_ORANGE : T.textDim, width: 12 }}>
                {KIND_GLYPH[o.kind]}
              </span>
              <span style={{
                fontSize: 11, color: isSel ? T.text : T.textDim, flex: 1,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>{o.name}</span>
              <span style={{ fontSize: 9, fontFamily: T.mono, color: T.textFaint }}>@{o.id}</span>
              <button
                title={o.object.visible ? 'Hide' : 'Show'}
                onClick={e => { e.stopPropagation(); setEditableVisible(o.id, !o.object.visible) }}
                style={{
                  background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                  fontSize: 10, color: o.object.visible ? T.textDim : T.textFaint,
                }}
              >{o.object.visible ? '👁' : '⃠'}</button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
