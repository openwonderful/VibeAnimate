/**
 * Blender-mode keyboard layer for the studio window.
 *
 * G/R/S set the gizmo mode, X/Y/Z constrain an axis, Esc deselects, H
 * hides / Alt+H shows, Alt+G/R/S reset a channel, Tab cycles objects.
 * Only active while an object is selected (except Tab, which selects the
 * first object) — so the editor's own transport keys keep working when
 * Blender mode is idle. Never fires while typing in a field.
 */
import { useEffect } from 'react'
import {
  setGizmoMode, setAxisFilter, selectEditable, getSelectedEntry,
  listEditables, resetEditableTransform, setEditableVisible,
  toggleGizmoSpace, toggleSnapping,
} from './store'

function typing(e: KeyboardEvent): boolean {
  const t = e.target as HTMLElement | null
  return !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)
}

/** @returns true when the key was consumed by Blender mode. */
export function handleBlenderKey(e: KeyboardEvent): boolean {
  if (typing(e) || e.ctrlKey || e.metaKey) return false
  const entry = getSelectedEntry()

  if (e.code === 'Tab') {
    const all = listEditables()
    if (all.length === 0) return false
    const i = entry ? all.findIndex(o => o.id === entry.id) : -1
    selectEditable(all[(i + 1) % all.length].id)
    return true
  }
  if (!entry) return false

  switch (e.code) {
    // Alt+key resets that channel; the bare key switches gizmo mode.
    case 'KeyG':
      if (e.altKey) resetEditableTransform(entry.id, 'position')
      else setGizmoMode('translate')
      return true
    case 'KeyR':
      if (e.altKey) resetEditableTransform(entry.id, 'rotation')
      else setGizmoMode('rotate')
      return true
    case 'KeyS':
      if (e.altKey) resetEditableTransform(entry.id, 'scale')
      else setGizmoMode('scale')
      return true
    case 'KeyX': setAxisFilter('x'); return true
    case 'KeyY': setAxisFilter('y'); return true
    case 'KeyZ': setAxisFilter('z'); return true
    case 'KeyH': setEditableVisible(entry.id, e.altKey); return true
    case 'KeyN': toggleGizmoSpace(); return true
    case 'KeyC': toggleSnapping(); return true
    case 'Escape': selectEditable(null); return true
    default: return false
  }
}

/** Mounted once by FlowStudio; runs BEFORE the transport keys. */
export function useBlenderKeys(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return
    const onKey = (e: KeyboardEvent) => {
      if (handleBlenderKey(e)) {
        e.preventDefault()
        e.stopImmediatePropagation()
      }
    }
    window.addEventListener('keydown', onKey, true) // capture: beat transport
    return () => window.removeEventListener('keydown', onKey, true)
  }, [enabled])
}
