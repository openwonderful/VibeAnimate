/**
 * FullFilm — the whole film, playable in the browser.
 *
 * `?act=film`. This is the live-mode twin of the Remotion FullVideo
 * composition: it reads the SAME master timeline (src/remotion/timeline.ts),
 * mounts whichever scene owns the current second, and offsets the anim clock
 * so that scene sees its own local time starting at zero — which is how every
 * scene in this project is authored. The song plays underneath, so the lyric
 * pins can be judged by watching rather than by arithmetic.
 *
 * Three things make it cheap enough to be useful:
 *
 *  - ONE scene is mounted at a time. Each scene owns a WebGL canvas, and
 *    keeping twenty of them alive would evict contexts and drop the page to
 *    software rendering. A cut therefore costs a canvas teardown and rebuild
 *    — visible as a hitch, and the reason this is a preview tool and not the
 *    render path. `npm run render:full` is still the thing that makes a file.
 *  - The clock is the shared one, so the ⏱ scrubber, `?t=`, `window.__anim`
 *    and the ,/. frame-step keys all address SONG time here. Seeking to 2:30
 *    lands inside Act 8 with Act 8 at its own 0:08.
 *  - The offset is applied in a layout effect rather than from a second rAF
 *    loop, so the scene mounted for a frame and the offset applied on that
 *    frame can never be one frame out of step at a cut. (A second rAF would
 *    race the clock's own; whichever registered first would win, and at a
 *    cut that is one frame of a scene playing at the wrong local time.)
 */
import { lazy, useLayoutEffect, useState, Suspense } from 'react'
import type { ComponentType } from 'react'
import { SCENES, sceneByKey } from './manifest'
import { TIMELINE, TOTAL_DURATION_SEC } from '../remotion/timeline'
import {
  getMasterTime, setAnimTimeOffset, useAnimTime, seekAnimTime,
} from '../hooks/useAnimTime'
import { SongTrack } from '../components/SongTrack'

// Validate at module load, the same way FullVideo does — a manifest rename
// should fail loudly here rather than render a black slot.
for (const item of TIMELINE) {
  if (!sceneByKey(item.key)) {
    throw new Error(
      `timeline references unknown scene key '${item.key}' — keys: ${SCENES.map(s => s.key).join(', ')}`,
    )
  }
}

/** The timeline with its scene components resolved — built once, at module
 *  load, so nothing here is ever created during a render. */
const SLOTS = TIMELINE.map(item => ({
  ...item,
  props: (item.props ?? {}) as Record<string, unknown>,
  Scene: lazy(sceneByKey(item.key)!.load) as ComponentType<Record<string, unknown>>,
}))

/** Index of the slot containing song time `t`, or the last one past the end. */
function slotAt(t: number): number {
  for (let i = SLOTS.length - 1; i >= 0; i--) {
    if (t >= SLOTS[i].from) return i
  }
  return 0
}

export default function FullFilm() {
  // Re-render every frame off the shared clock. The VALUE is scene-local and
  // therefore useless here; master time is read from the store, which is
  // always current rather than a frame behind.
  useAnimTime()
  const t = getMasterTime()
  const i = slotAt(t)
  const slot = SLOTS[i]

  // Layout effect, not an effect and not a render-time write: it has to land
  // before the browser paints and before R3F's rAF runs, so the scene that
  // just mounted reads the right local time on its very first `useFrame` —
  // but writing it during render would mean a render React discarded (a
  // Suspense retry, StrictMode's double pass) could leave the wrong offset
  // behind.
  useLayoutEffect(() => { setAnimTimeOffset(slot.from) }, [slot.from])

  /**
   * Hand the clock back on the way out.
   *
   * The offset is this component's private business, but it is GLOBAL state,
   * and without a cleanup it outlived the film player. In the studio that is
   * reachable in one click — `film` is a listed shot, so opening it and then
   * clicking any other shot left a stale offset behind, after which
   * `getAnimTime()` returned master−offset while `seekAnimTime()` kept
   * writing master. Every clock chip then read a plausible lie (`0:02.15`
   * with the clock at 40), and a single frame-step jumped the clock from 40
   * to 2.533. Own-mount scope deliberately: the effect above re-sets it on
   * every cut, and only a real unmount should surrender it.
   */
  useLayoutEffect(() => () => setAnimTimeOffset(0), [])

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', background: '#050A14' }}>
      <Suspense fallback={null}>
        {/* Keyed on the slot so a cut is a clean remount rather than a scene
            trying to reconcile itself into a different scene's tree. */}
        <slot.Scene key={slot.key + '@' + slot.from} {...slot.props} />
      </Suspense>
      {/* Here the anim clock IS song time — the film player sets the
          anim-time offset, so getMasterTime() is the master. */}
      <SongTrack src="/audio/body-to-body.mp3" time={getMasterTime} maxDuration={TOTAL_DURATION_SEC} />
      <SlotReadout index={i} time={t} />
    </div>
  )
}

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

/** Which act is on screen, where it sits in the song, and a click-to-seek
 *  strip of the whole timeline. Hidden by `?ui=0` like the rest of the
 *  dev chrome, so screenshots of the film are clean. */
function SlotReadout({ index, time }: { index: number; time: number }) {
  const [hidden] = useState(() => new URLSearchParams(window.location.search).get('ui') === '0')
  if (hidden) return null
  const item = SLOTS[index]
  const entry = sceneByKey(item.key)!

  return (
    <div style={{
      position: 'fixed', left: 12, bottom: 12, zIndex: 50,
      fontFamily: 'system-ui, sans-serif', color: '#E8D5B5', pointerEvents: 'auto',
    }}>
      <div style={{
        display: 'flex', gap: 2, width: 420, height: 10, marginBottom: 6,
        borderRadius: 3, overflow: 'hidden', cursor: 'pointer',
      }}>
        {SLOTS.map((s, n) => (
          <div
            key={s.key + s.from}
            title={`${s.key} — ${fmt(s.from)}`}
            onClick={() => seekAnimTime(s.from)}
            style={{
              width: `${(s.duration / TOTAL_DURATION_SEC) * 100}%`,
              background: n === index ? '#D4A843' : '#ffffff22',
            }}
          />
        ))}
      </div>
      <div style={{ fontSize: 12, background: '#000000A0', padding: '4px 8px', borderRadius: 4 }}>
        <b style={{ color: '#D4A843' }}>{item.key}</b>{' '}
        {entry.title}{' '}
        <span style={{ opacity: 0.5 }}>
          — {fmt(time)} / {fmt(TOTAL_DURATION_SEC)} (local {(time - item.from).toFixed(1)}s)
        </span>
      </div>
    </div>
  )
}
