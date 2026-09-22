/**
 * useTimelineEdit — the film's working copy, and the history over it.
 *
 * `items` is the film's timeline as the studio has it, which is not
 * necessarily what `timeline.ts` on disk says: the master film is paste-only
 * by decision (vite.config.ts refuses to write it), so an edit lives here
 * until the Inspector's exported lines are pasted back.
 *
 * History is arrays of references, not deep clones — every edit helper in
 * `edit.ts` returns a NEW array of the SAME item objects, so a snapshot costs
 * one array. That is the reason those helpers are written the way they are.
 *
 * Everything returned is either a value or a stable function; no refs cross
 * this boundary. See useLatest for why that matters.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import type { TimelineItem } from '../../remotion/timeline'
import type { Film } from '../films'

/** How long two edits have to be apart to become two undo steps. A drag
 *  gesture emits one update per snap step; without this, undoing a single
 *  drag would take forty presses. */
const COALESCE_MS = 400

const HISTORY_CAP = 100

export type TimelineEdit = {
  items: TimelineItem[]
  /** Latest items, readable from inside rAF callbacks and key handlers. */
  getItems: () => TimelineItem[]
  changeItems: (next: TimelineItem[]) => void
  /** Replace without touching history — switching films, not editing one. */
  resetTo: (items: TimelineItem[]) => void
  /** Stable for the life of the component, so the keymap can bind them once. */
  undo: () => void
  redo: () => void
  dirty: boolean
}

export function useTimelineEdit(film: Film): TimelineEdit {
  const [items, setItems] = useState<TimelineItem[]>(film.items)

  const undoStack = useRef<TimelineItem[][]>([])
  const redoStack = useRef<TimelineItem[][]>([])
  const itemsRef = useRef(items)
  useEffect(() => { itemsRef.current = items }, [items])
  const getItems = useCallback(() => itemsRef.current, [])

  const lastPushAt = useRef(0)
  const changeItems = useCallback((next: TimelineItem[]) => {
    const now = Date.now()
    if (now - lastPushAt.current > COALESCE_MS) {
      undoStack.current.push(itemsRef.current)
      if (undoStack.current.length > HISTORY_CAP) undoStack.current.shift()
    }
    lastPushAt.current = now
    redoStack.current = []
    itemsRef.current = next   // visible to the keymap before the commit lands
    setItems(next)
  }, [])

  const resetTo = useCallback((next: TimelineItem[]) => {
    undoStack.current = []
    redoStack.current = []
    // Reset the coalescing window too, or the first edit after a film switch
    // lands inside the previous film's window and gets no undo entry.
    lastPushAt.current = 0
    itemsRef.current = next
    setItems(next)
  }, [])

  const undo = useCallback(() => {
    const prev = undoStack.current.pop()
    if (!prev) return
    redoStack.current.push(itemsRef.current)
    itemsRef.current = prev
    setItems(prev)
  }, [])

  const redo = useCallback(() => {
    const next = redoStack.current.pop()
    if (!next) return
    undoStack.current.push(itemsRef.current)
    itemsRef.current = next
    setItems(next)
  }, [])

  return { items, getItems, changeItems, resetTo, undo, redo, dirty: items !== film.items }
}
