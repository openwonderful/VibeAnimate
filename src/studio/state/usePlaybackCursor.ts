/**
 * usePlaybackCursor — continuous playback across cuts, and scene warming.
 *
 * The viewport mounts ONE scene at a time, so without this the playhead just
 * runs off the end of the active clip and keeps playing that scene past its
 * out-point. While attached to the timeline (`masterFrom != null`) we roll on
 * to the next clip instead — the overshoot is carried across the cut so
 * master time stays continuous. Detached shots (opened from the Shots panel)
 * keep playing on their own, as before.
 *
 * Moved out of FlowStudio.tsx intact when the shell was split (F1). Nothing
 * here is new; the ordering comments below are the expensive part.
 */
import { useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import type { TimelineItem } from '../../remotion/timeline'
import { FPS, preloadScene, preloadSceneQueue } from '../../scenes/manifest'
import { getAnimTime, isAnimPlaying, seekAnimTime, setAnimPlaying } from '../../hooks/useAnimTime'
import type { Selection, ViewTarget } from '../types'

/** How far ahead of a cut to start fetching the next scene's module. */
const PRELOAD_LEAD_SEC = 4

/** How far ahead of a cut to actually MOUNT the next scene. Measured
 *  mount-to-first-draw is ~350ms; this is that with room to spare, kept
 *  short because the mounted scene renders every frame while it waits. */
const PREFETCH_LEAD_SEC = 1.5

/** A cut stays "in flight" this long while `view` state catches up. Bounded
 *  so a re-click on the clip we just left cannot wedge playback. */
const CUT_SETTLE_MS = 500

type Args = {
  /** Stable accessors, not refs — see state/useLatest.ts. */
  getView: () => ViewTarget
  getItems: () => TimelineItem[]
  getSelection: () => Selection
  selectClip: (index: number, item: TimelineItem) => void
}

/**
 * Returns the key of the clip AFTER this one, mounted hidden so the cut can
 * happen in a single frame — without it the outgoing scene stays on top
 * while the incoming one warms, and since the clock has already jumped to
 * the new clip's local time, the outgoing shot rewinds and replays its own
 * opening for a third of a second before the cut lands.
 *
 * TIME-BOXED, and that matters: a hidden scene is still a live R3F canvas
 * rendering every frame, so holding the next clip for the whole of the
 * current one halves the frame rate on heavy scenes — it would buy a clean
 * cut by making everything before it worse. It is only mounted in the run-up
 * to the cut, which is the only time it is needed.
 */
export function usePlaybackCursor({ getView, getItems, getSelection, selectClip }: Args): string | null {
  const [prefetchKey, setPrefetchKey] = useState<string | null>(null)

  const cutFrom = useRef<number | null>(null)
  const cutAt = useRef(0)
  const preloadedRef = useRef('')

  useEffect(() => {
    let raf = requestAnimationFrame(function tick() {
      raf = requestAnimationFrame(tick)
      const v = getView()
      // Hold off while a cut is settling — otherwise the next frame still
      // sees the OLD out-point and skips a whole clip.
      if (v.masterFrom === cutFrom.current && performance.now() - cutAt.current < CUT_SETTLE_MS) return
      if (!isAnimPlaying() || v.masterFrom == null) return

      const items = getItems()
      const sel = getSelection()
      const idx = sel?.type === 'clip' && items[sel.index]?.key === v.key
        ? sel.index
        : items.findIndex(it => it.key === v.key && it.from - (it.offsetSec ?? 0) === v.masterFrom)
      if (idx === -1) return   // the clip was edited away — leave playback alone
      const out = v.offsetSec + v.durationSec
      const t = getAnimTime()

      // Warm the next scene's chunk before the cut so the swap doesn't stall
      // on a lazy import while the clock keeps running. The window is
      // generous because in dev the first load of a heavy scene is a whole
      // transform waterfall, not one file — and preloading early costs
      // nothing once the idle sweep below has usually done it already.
      const next = items[idx + 1]
      if (next && t > out - PRELOAD_LEAD_SEC && preloadedRef.current !== next.key) {
        preloadedRef.current = next.key
        void preloadScene(next.key)
        // The one after that too, so a run of short clips (Act 4 is 1.7s
        // apiece) can't outpace the lead time.
        if (items[idx + 2]) void preloadScene(items[idx + 2].key)
      }

      // Mount the next scene for real, but only now — see the doc comment.
      if (next && next.key !== v.key && t > out - PREFETCH_LEAD_SEC) {
        setPrefetchKey(k => (k === next.key ? k : next.key))
      }

      if (t < out) return

      // Which clip owns the playhead now? Usually items[idx + 1], but a seek
      // can land further along, so resolve by master time.
      const masterT = v.masterFrom + t
      let nextIdx = -1
      for (let i = idx + 1; i < items.length; i++) {
        if (masterT < items[i].from + items[i].duration) { nextIdx = i; break }
      }
      cutFrom.current = v.masterFrom
      cutAt.current = performance.now()

      if (nextIdx === -1) {   // end of the film — park on the last frame
        const lastIdx = items.length - 1
        const last = items[lastIdx]
        setAnimPlaying(false)
        if (lastIdx !== idx) flushSync(() => selectClip(lastIdx, last))
        seekAnimTime(Math.max(0, (last.offsetSec ?? 0) + last.duration - 1 / FPS))
        return
      }
      const nextClip = items[nextIdx]
      // ORDER MATTERS, and this is the whole fix for "the shot rewinds and
      // replays its opening before the cut": the clock reset below moves
      // every mounted scene to the next clip's local time (≈0). If React has
      // not yet committed the scene swap when that happens — and by default
      // it has not, the update is async — the OUTGOING scene is still on
      // screen and obediently renders itself at t≈0.
      //
      // flushSync forces the swap (and the viewport's promotion layout
      // effect) to complete first, so the clock only ever moves under the
      // scene that owns it. One synchronous render per cut is cheap.
      flushSync(() => {
        selectClip(nextIdx, nextClip)
        // Drop the prefetch slot on the way through: the scene it was
        // holding is the one being promoted, and keeping a second live
        // canvas around costs frames for no benefit until the next cut
        // approaches.
        setPrefetchKey(null)
      })
      // Local time that keeps master time continuous across the cut
      // (clamped to the in-point, in case the playhead landed in a gap).
      seekAnimTime((nextClip.offsetSec ?? 0) + Math.max(0, masterT - nextClip.from))
    })
    return () => cancelAnimationFrame(raf)
  }, [selectClip, getView, getItems, getSelection])

  return prefetchKey
}

/**
 * Warm every scene the active film uses, one at a time during idle.
 *
 * The lead-time preload at the cut covers a playthrough, but only just, and
 * only for the clip you are about to reach — jumping around the timeline
 * still hits cold modules. This makes the whole film warm after a minute or
 * so of sitting there, so every cut and every click is instant from then on.
 * Starts with the current clip's neighbours.
 */
export function useScenePreload(filmId: string, items: TimelineItem[], activeKey: string) {
  // Deliberately NOT a dependency: re-running this on every clip change
  // would restart the queue and never finish it. Read through a ref so the
  // rotation still begins wherever the playhead was when the film loaded.
  const activeRef = useRef(activeKey)
  useEffect(() => { activeRef.current = activeKey }, [activeKey])

  useEffect(() => {
    const keys = items.map(i => i.key)
    const start = Math.max(0, keys.indexOf(activeRef.current))
    return preloadSceneQueue([...keys.slice(start), ...keys.slice(0, start)])
  }, [filmId, items])
}
