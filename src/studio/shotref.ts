/**
 * Shot refs — hand a FRAMING to the model instead of describing it.
 *
 * The workflow this kills: "go up a little more… no, right a bit… left a
 * bit". Instead: fly the debug camera (or just park the playhead), press
 * ⌖ ref, and the studio captures everything the model needs to reproduce
 * and reason about the exact view —
 *
 *   - the scene key and the CLOCK, in every coordinate that matters
 *     (scene-local seconds, film seconds, master frame),
 *   - the full camera orientation (`window.__camPose`: position, look-at,
 *     fov) and whether that pose is the shot's own rig or a hand-flown
 *     debug-camera override,
 *   - a PNG of the stage as it looks right now, written server-side to
 *     `out/shotrefs/` so a model with filesystem access can Read it.
 *
 * The result is ONE bracketed token, safe to paste mid-sentence:
 *
 *   [shotref 8.55 t=38.00 film=3:00.00 f5400 cam=(2.7,6.4,-12.9)->(-14.2,131,-24.1)
 *    fov=62 pose=orbited png=/abs/path/8.55@t38.00-….png]
 *
 * "⌖ copy" puts it on the clipboard for any chat anywhere; "⌖ → Claude"
 * types it straight onto the sidebar terminal's prompt (not submitted — you
 * finish the sentence: "…make the real rig land here").
 *
 * The png/json pair is also a sidecar the paste target does NOT need to be
 * live for: everything in the token is duplicated into `<basename>.json`.
 */
// Deliberately import-light: this module is also loaded by node-side tests
// (the token format is pinned there), and `state/prefs` / `terminalSession`
// touch `window` at module init. Everything DOM-flavoured is imported
// dynamically inside the function that needs it.
import { getAnimTime } from '../hooks/useAnimTime'
import type { CamPose } from '../scenes/DebugCamera'
import { devApiAvailable, studioPost } from './devApi'
import { fmtTime, frameOf } from './frames'
import type { ViewTarget } from './types'

declare global {
  interface Window {
    /** Tooling entry point (headless capture, no clipboard) — see ViewportPanel. */
    __shotref?: () => Promise<string>
  }
}

export type ShotRefMeta = {
  key: string
  /** Scene-local seconds — what the scene's own code is authored in. */
  t: number
  /** Film/master seconds, when the view came from the timeline. */
  filmTime: number | null
  /** Master frame index at FPS, when the view came from the timeline. */
  frame: number | null
  pose: CamPose | null
  /** True when the debug camera is on — the pose is a hand-flown override,
   *  not what the shot's rig renders. */
  orbit: boolean
  /** Absolute path of the saved PNG, once the dev server has written it. */
  png: string | null
}

const f2 = (n: number) => +n.toFixed(2)
const vec = (v: [number, number, number]) => `(${v.map(f2).join(',')})`

/** The paste token. Pure — the tests pin this format, and future sessions
 *  of the model parse it by eye, so keep it one line and self-labelling. */
export function formatShotRef(m: ShotRefMeta): string {
  const parts = [`shotref ${m.key}`, `t=${m.t.toFixed(2)}`]
  if (m.filmTime != null) parts.push(`film=${fmtTime(m.filmTime)}`)
  if (m.frame != null) parts.push(`f${m.frame}`)
  parts.push(m.pose
    ? `cam=${vec(m.pose.pos)}->${vec(m.pose.target)}${m.pose.fov != null ? ` fov=${f2(m.pose.fov)}` : ''}`
    : 'cam=none(DOM scene)')
  if (m.pose) parts.push(`pose=${m.orbit ? 'orbited' : 'shot'}`)
  if (m.png) parts.push(`png=${m.png}`)
  return `[${parts.join(' ')}]`
}

/** Everything captureShotRef can know without the dev server. */
function gather(view: ViewTarget): Omit<ShotRefMeta, 'png'> & { pngData: string | null } {
  const t = getAnimTime()
  const filmTime = view.masterFrom != null ? view.masterFrom + t : null
  // The stage marks the VISIBLE slot — during a cut two scenes are mounted,
  // and the hidden one must never be what gets snapshotted.
  const canvas = document.querySelector<HTMLCanvasElement>(
    '[data-scene][data-on-top="1"] canvas')
  return {
    key: view.key,
    t: +t.toFixed(3),
    filmTime: filmTime != null ? +filmTime.toFixed(3) : null,
    frame: filmTime != null ? frameOf(filmTime) : null,
    pose: window.__camPose ?? null,
    orbit: new URLSearchParams(window.location.search).has('camera'),
    // toDataURL needs preserveDrawingBuffer, which SceneCanvas turns on for
    // the studio page only — see the comment there.
    pngData: canvas ? canvas.toDataURL('image/png') : null,
  }
}

/**
 * Capture the current framing. Saves the PNG + a JSON sidecar through the
 * dev server when it is there (the deployed preview has no write path — the
 * token is then still complete, just without an image on disk).
 */
export async function captureShotRef(view: ViewTarget): Promise<{ text: string; meta: ShotRefMeta }> {
  const { pngData, ...meta } = gather(view)
  let png: string | null = null
  if (devApiAvailable()) {
    // Millisecond stamp so refs never overwrite each other; the key is in
    // the name so a directory listing reads as a shot list.
    const basename = `${view.key}@t${meta.t.toFixed(2)}-${Date.now()}`
    try {
      const res = await studioPost('/__studio/shotref', { basename, png: pngData, meta })
      if (res.ok) png = ((await res.json()) as { png: string | null }).png
    } catch {
      // Dev server gone mid-session — the token still carries every number.
    }
  }
  const full: ShotRefMeta = { ...meta, png }
  return { text: formatShotRef(full), meta: full }
}

/** ⌖ copy — capture and put the token on the clipboard. */
export async function copyShotRef(view: ViewTarget): Promise<string> {
  const { text } = await captureShotRef(view)
  await navigator.clipboard.writeText(text)
  return text
}

/**
 * ⌖ → Claude — capture, open the console tab, and type the token onto the
 * sidebar Claude's prompt with a trailing space, exactly like the object
 * strip's `@file ` references. NOT submitted: the point is that you finish
 * the sentence with what you want done to this framing.
 */
export async function shotRefToClaude(view: ViewTarget): Promise<string | null> {
  const { text } = await captureShotRef(view)
  const [{ setPrefs }, term] = await Promise.all([
    import('./state/prefs'),
    import('./panels/terminalSession'),
  ])
  setPrefs({ rightTab: 'console' })

  // The terminal only types-through while its socket is open; `acquire()`
  // starts it connecting (the panel mount would too, a frame later) and
  // this waits for it.
  term.acquire()
  const open = await new Promise<boolean>(resolve => {
    if (term.getTerminalStatus() === 'open') { resolve(true); return }
    const done = (ok: boolean) => { clearTimeout(timer); unsub(); resolve(ok) }
    const timer = setTimeout(() => done(false), 4000)
    const unsub = term.subscribeTerminal(() => {
      const s = term.getTerminalStatus()
      if (s === 'open') done(true)
      if (s === 'closed' || s === 'unavailable') done(false)
    })
  })
  if (!open) return null
  term.sendKeys(`${text} `)
  return text
}
