/**
 * useStudioKeys — one keymap, one place to see the conflicts.
 *
 * There are FOUR keyboard consumers on this page and they overlap:
 *
 *   - this one (transport + edit)
 *   - Blender mode's object keys (`editable/keys.ts`), capture phase, so they
 *     win while an object is selected and stand down when nothing is
 *   - DebugCamera — WASD / QERF, live whenever the debug camera is on
 *   - TimeScrubber — `,` `.` `P`
 *
 * So a "free" key is rarer than it looks — `F`, in particular, is NOT free
 * (DebugCamera binds it to pitch). KEYMAP below is the list, and it lives
 * beside the switch so the cheat-sheet cannot drift from the behaviour.
 *
 * The console guard at the top is defence in depth for D1 and is not
 * optional — see the comment where it lives.
 */
import { useEffect, useRef } from 'react'
import { FPS } from '../../scenes/manifest'
import {
  getAnimSpeed, getAnimTime, isAnimPlaying, seekAnimTime, setAnimPlaying, setAnimSpeed,
} from '../../hooks/useAnimTime'
import { deleteClip, duplicateClip, splitClip } from '../edit'
import { getPrefs, setPrefs, toggleStar } from './prefs'
import type { TimelineItem } from '../../remotion/timeline'
import type { Film } from '../films'
import type { Selection, ViewTarget } from '../types'

export type StudioKeyBindings = {
  films: Film[]
  /** Stable accessors, not refs — see state/useLatest.ts. */
  getView: () => ViewTarget
  getItems: () => TimelineItem[]
  getSelection: () => Selection
  isConsoleOpen: () => boolean
  undo: () => void
  redo: () => void
  changeItems: (next: TimelineItem[]) => void
  selectClip: (index: number, item: TimelineItem) => void
  selectFilm: (film: Film) => void
  toggleConsole: () => void
}

/** Everything the studio binds, for the cheat-sheet in the settings panel and
 *  the Inspector. Kept beside the switch so the two cannot drift. */
export const KEYMAP: { keys: string; what: string; group: string }[] = [
  { keys: 'Space', what: 'play / pause', group: 'transport' },
  { keys: '← / →', what: 'step one frame (Shift ×10)', group: 'transport' },
  { keys: 'Home / End', what: 'clip start / last frame', group: 'transport' },
  { keys: 'J / K / L', what: 'shuttle down · stop · up', group: 'transport' },
  { keys: 'B', what: 'blade the selected clip at the playhead', group: 'edit' },
  { keys: 'Backspace', what: 'ripple-delete the selected clip', group: 'edit' },
  { keys: 'Ctrl+D', what: 'duplicate the selected clip', group: 'edit' },
  { keys: 'Ctrl+Z / Ctrl+Shift+Z', what: 'undo / redo', group: 'edit' },
  { keys: 'S', what: 'toggle snapping (Alt defeats it for one drag)', group: 'edit' },
  // Not bindings — drag modifiers. They belong in the cheat-sheet anyway,
  // because "what does dragging a clip actually do" is the question the
  // sheet exists to answer, and the modifier is the only way to find out.
  { keys: 'drag a clip', what: 'insert it between two shots — nothing splits', group: 'edit' },
  { keys: 'Ctrl + drag', what: 'splice it in exactly there — splits the clip underneath', group: 'edit' },
  { keys: 'M', what: 'star / unstar the shot on screen', group: 'workspace' },
  { keys: 'V', what: 'edit ⇄ storyboard', group: 'workspace' },
  { keys: '1 / 2 / 3', what: 'switch film', group: 'workspace' },
  { keys: '`', what: 'Claude — the embedded terminal', group: 'workspace' },
  { keys: '\\', what: 'fullscreen stage (Esc to leave)', group: 'workspace' },
  { keys: 'Ctrl+\\', what: 'focus — collapse both rails', group: 'workspace' },
  { keys: 'G / R / S · X / Y / Z', what: 'Blender mode: move · rotate · scale, axis', group: 'object' },
  { keys: 'click an object', what: 'select it — and attach it to your next question', group: 'object' },
]

export function useStudioKeys(b: StudioKeyBindings) {
  // The whole bag through a ref so the listener registers exactly once —
  // re-registering on every render loses keydowns during the gap.
  const ref = useRef(b)
  useEffect(() => { ref.current = b })

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = ref.current
      const t = e.target as HTMLElement
      if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable) return

      /* Defence in depth for the console. The guard above is correct but it
       * only fires when focus is ALREADY in a field — and if focus escapes to
       * BODY with the console open, every key here becomes an edit command:
       * `b` blades, `v` flips workspace, digits switch films, and Backspace
       * DELETES THE SELECTED CLIP. So while the console is open, a bare
       * character key means "you meant to type" — send focus to the prompt
       * and swallow it. One dropped character beats a destroyed edit.
       * Backtick is exempt: it is the console's own toggle. */
      if (k.isConsoleOpen() && !e.ctrlKey && !e.metaKey && !e.altKey && e.key !== '`'
        && (e.key.length === 1 || e.key === 'Backspace' || e.key === 'Delete')) {
        const prompt = document.querySelector<HTMLInputElement>('[data-studio-prompt]')
        if (prompt) { e.preventDefault(); prompt.focus(); return }
      }

      const frame = 1 / FPS
      const mod = e.ctrlKey || e.metaKey

      // Modified keys first — they must not fall through to the bare-key
      // switch, where `d` duplicates and `z` would do nothing.
      if (mod) {
        switch (e.key) {
          case 'z': case 'Z':
            e.preventDefault()
            if (e.shiftKey) k.redo()
            else k.undo()
            return
          case '\\':
            e.preventDefault()
            setPrefs({ stageMode: getPrefs().stageMode === 'focus' ? 'normal' : 'focus' })
            return
          case 'd': case 'D': {
            e.preventDefault()
            const sel = k.getSelection()
            if (sel?.type !== 'clip') return
            const next = duplicateClip(k.getItems(), sel.index)
            if (next !== k.getItems()) {
              k.changeItems(next)
              k.selectClip(sel.index + 1, next[sel.index + 1])
              seekAnimTime(next[sel.index + 1].offsetSec ?? 0)
            }
            return
          }
        }
        // Ctrl+V (paste), Ctrl+C, Ctrl+A … are the browser's. Fall through
        // to nothing rather than to the bare-key handlers below.
        return
      }

      switch (e.key) {
        case '`':
          e.preventDefault()
          k.toggleConsole()
          break
        case '\\':
          e.preventDefault()
          setPrefs({ stageMode: getPrefs().stageMode === 'full' ? 'normal' : 'full' })
          break
        case 'Escape':
          // Only ever LEAVES a mode, never enters one. Blender mode's deselect
          // is also on Esc but runs in the capture phase, so it has already
          // had its turn by the time this fires.
          if (getPrefs().stageMode !== 'normal') {
            e.preventDefault()
            setPrefs({ stageMode: 'normal' })
          }
          break
        case ' ':
          e.preventDefault()
          setAnimPlaying(!isAnimPlaying())
          break
        case 'ArrowLeft':
          e.preventDefault()
          setAnimPlaying(false)
          seekAnimTime(Math.max(0, getAnimTime() - frame * (e.shiftKey ? 10 : 1)))
          break
        case 'ArrowRight':
          e.preventDefault()
          setAnimPlaying(false)
          seekAnimTime(getAnimTime() + frame * (e.shiftKey ? 10 : 1))
          break
        case 'Home':
          e.preventDefault()
          seekAnimTime(0)
          break
        case 'End':
          e.preventDefault()
          setAnimPlaying(false)
          seekAnimTime(Math.max(0, k.getView().offsetSec + k.getView().durationSec - frame))
          break
        case '1': case '2': case '3': {
          const target = k.films[parseInt(e.key, 10) - 1]
          if (target) k.selectFilm(target)
          break
        }
        case 'b': case 'B': {
          // Blade: split the selected clip at the playhead.
          const sel = k.getSelection()
          if (sel?.type !== 'clip') break
          const item = k.getItems()[sel.index]
          if (!item) break
          const atClipLocal = getAnimTime() - (item.offsetSec ?? 0)
          const next = splitClip(k.getItems(), sel.index, Math.round(atClipLocal * FPS) / FPS)
          if (next !== k.getItems()) {
            k.changeItems(next)
            k.selectClip(sel.index, next[sel.index])
          }
          break
        }
        case 'Delete': case 'Backspace': {
          const sel = k.getSelection()
          if (sel?.type !== 'clip') break
          const next = deleteClip(k.getItems(), sel.index, true)
          if (next !== k.getItems()) {
            e.preventDefault()
            k.changeItems(next)
            const idx = Math.min(sel.index, next.length - 1)
            k.selectClip(idx, next[idx])
            seekAnimTime(next[idx].offsetSec ?? 0)
          }
          break
        }
        case 's': case 'S':
          // Premiere: S toggles snapping. Alt defeats it for one drag, which
          // the drag code reads off the event rather than from here.
          e.preventDefault()
          setPrefs({ snap: !getPrefs().snap })
          break
        case 'm': case 'M':
          // Star the shot on screen. `F` would be the obvious key and is
          // taken — DebugCamera binds it to pitch, and the debug camera is
          // live exactly when you are most likely to want to mark a frame.
          e.preventDefault()
          toggleStar(k.getView().key)
          break
        case 'v': case 'V':
          e.preventDefault()
          setPrefs({ viewMode: getPrefs().viewMode === 'board' ? 'edit' : 'board' })
          break
        case 'j': case 'J':
          setAnimSpeed(Math.max(0.1, getAnimSpeed() / 2)); setAnimPlaying(true)
          break
        case 'k': case 'K':
          setAnimPlaying(false); setAnimSpeed(1)
          break
        case 'l': case 'L':
          setAnimSpeed(Math.min(8, isAnimPlaying() ? getAnimSpeed() * 2 : getAnimSpeed())); setAnimPlaying(true)
          break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}
