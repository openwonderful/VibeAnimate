/**
 * useStudioPrefs — the one persisted store.
 *
 * Before this, "settings" were spread across ~40 URL params, three
 * sessionStorage keys and a hardcoded constant per panel, and every new
 * preference invented its own storage. Everything the user can *choose*
 * about the editor lives here; everything that describes the FILM lives in
 * films.ts and timeline.ts. That line is the whole design: a star on a shot
 * is a preference, a clip's duration is not.
 *
 * TWO RULES, both load-bearing:
 *
 *  1. **Never persist by rewriting `location.search`.** SPEC.md hard
 *     constraint #5: the shot.mjs contract is `?act=KEY` plus an appended
 *     `ui=0` and `?t=` freezing. A settings panel that writes the URL breaks
 *     deterministic screenshots and every cached URL in the docs. Storage
 *     only; "copy link with these settings" is an explicit action.
 *  2. **A URL param always wins over the stored value**, and `?prefs=0`
 *     ignores storage entirely. Tooling has to be able to ask for a known
 *     state — otherwise a preference set by hand three days ago silently
 *     changes what a screenshot captures, which is the same class of bug as
 *     D5 (the preview shooting the wrong dev server).
 *
 * Deliberately a module-level store rather than context: the keymap and the
 * playback loop read it from inside handlers and rAF callbacks, and prefs
 * change on user action rather than per frame, so a subscription-based store
 * is both simpler and cheaper than threading a provider through.
 */
import { useSyncExternalStore } from 'react'
import type { ViewMode } from '../types'
import type { AspectId, StageFit } from '../aspect'

const KEY = 'flowstudio.prefs'

export type RightTab = 'outliner' | 'inspector' | 'console'
export type StageMode = 'normal' | 'focus' | 'full'
export type Guides = 'off' | 'thirds' | 'safe' | 'both'

export type StudioPrefs = {
  /* Workspace */
  viewMode: ViewMode
  leftTab: 'shots' | 'ingredients'
  /** Width of the left rail in pixels. Draggable — a shot list and an asset
   *  browser want different amounts of room, and so do different monitors. */
  leftRailWidth: number
  /** Width of the right rail. Wider than it looks like it needs, because that
   *  rail is a terminal now — see RIGHT_RAIL_W. */
  rightRailWidth: number
  rightTab: RightTab
  /** Outliner and Inspector stacked (posing an object reads both at once). */
  rightStacked: boolean

  /* Stage */
  stageMode: StageMode
  /**
   * Session override of the film's own aspect; null = whatever the film
   * declares. `'fit'` is not a shape — it means "stop letterboxing and fill
   * the panel", which is a different question from "what shape is this film".
   * See STAGE_FIT in aspect.ts.
   */
  aspectOverride: AspectId | StageFit | null
  guides: Guides
  /** 1 = fit. Above 1 the stage is scrolled/panned inside its cage. */
  stageZoom: number
  /**
   * Mount the NEXT clip early so a cut is instant.
   *
   * On by default and worth having — without it every cut flashes black for
   * about a third of a second. But it is also the one place in the project
   * where two scenes are mounted at once, and several scenes keep their world
   * clock in a module global on the documented assumption that exactly one
   * ever is (`actB/time.ts`, `act7r/journey74.ts`). Measured: when 7.4
   * prefetches, journey74's shift goes from −20.5 to 0 while 6.85 is still on
   * screen, so its walk-home valley jumps twenty seconds for the last 1.5s of
   * the shot. Turning this off costs the smooth cut and gives back a picture
   * that is exactly what the render will produce.
   */
  prefetch: boolean

  /* Timeline */
  timelineHeight: number
  timelineCollapsed: boolean
  /** Pixels per second. */
  pps: number
  ripple: boolean
  snap: boolean
  clipThumbs: boolean

  /* Playback */
  showLyrics: boolean
  volume: number
  muted: boolean

  /* Finding things */
  starred: string[]
  filterText: string
  filterChips: string[]

  /* Render */
  renderQuality: 'draft' | 'full'
  renderGl: string
  renderShards: number
  renderConcurrency: number

  /* Live AI render (features_1.md §7) — the stage pushed through a turbo
   * diffusion model on the local GPU. Off by default: on means a WebSocket,
   * a depth pass per frame and a model server. */
  liveRender: boolean
  livePrompt: string
  liveNegative: string
  /** img2img strength — how far the model may leave the raw render. */
  liveStrength: number
  /** Depth ControlNet weight. */
  liveControl: number
  /** Blend of the previous OUTPUT into the next init image (flicker vs smear). */
  liveBlend: number
  /** A/B wipe position on the stage, 0..1 (1 = all AI). */
  liveWipe: number
}

export const DEFAULT_PREFS: StudioPrefs = {
  viewMode: 'edit',
  leftTab: 'shots',
  leftRailWidth: 250,
  rightRailWidth: 420,
  rightTab: 'inspector',
  rightStacked: true,

  stageMode: 'normal',
  aspectOverride: null,
  guides: 'off',
  stageZoom: 1,
  prefetch: true,

  timelineHeight: 262,
  timelineCollapsed: false,
  pps: 8,
  ripple: true,
  snap: true,
  clipThumbs: true,

  showLyrics: true,
  volume: 0.8,
  muted: false,

  starred: [],
  filterText: '',
  filterChips: [],

  renderQuality: 'draft',
  renderGl: 'vulkan',
  renderShards: 4,
  renderConcurrency: 3,

  liveRender: false,
  livePrompt: 'hand-painted korean ink wash animation still, warm lantern light, soft film grain, cinematic',
  liveNegative: 'text, watermark, blurry, deformed',
  liveStrength: 0.5,
  liveControl: 0.8,
  liveBlend: 0.2,
  liveWipe: 1,
}

/* ── URL overrides ─────────────────────────────────────────────────────────
 * Only the params tooling and the docs already use. Adding to this list is
 * adding to the shot.mjs contract, so it is short on purpose. */
function fromUrl(): Partial<StudioPrefs> {
  const q = new URLSearchParams(window.location.search)
  const out: Partial<StudioPrefs> = {}
  const view = q.get('view')
  if (view) out.viewMode = view === 'board' ? 'board' : 'edit'
  const tab = q.get('tab')
  if (tab) out.leftTab = tab === 'ingredients' ? 'ingredients' : 'shots'
  if (q.get('console') === '1') out.rightTab = 'console'
  if (q.get('lyrics') === '0') out.showLyrics = false
  // `?prefetch=0` — one scene mounted, ever. On the allowlist because it is
  // exactly what the allowlist is for: a known state tooling can ask for. A
  // frame captured with the next clip warming behind it is not necessarily
  // the frame the render produces, because the two scenes share module-level
  // world clocks (see the pref's own comment), so a screenshot that has to
  // match a render needs this.
  if (q.get('prefetch') === '0') out.prefetch = false
  const zoom = q.get('zoom')
  if (zoom && Number.isFinite(parseFloat(zoom))) out.pps = parseFloat(zoom)
  return out
}

function load(): StudioPrefs {
  const q = new URLSearchParams(window.location.search)
  // ?prefs=0 → a known-good state, whatever is in storage. This is what
  // tooling passes when a screenshot has to be reproducible.
  if (q.get('prefs') === '0') return { ...DEFAULT_PREFS, ...fromUrl() }
  let stored: Partial<StudioPrefs> = {}
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) stored = JSON.parse(raw) as Partial<StudioPrefs>
  } catch {
    // Corrupt or unavailable storage is not worth a broken editor.
  }
  // Key-by-key rather than a blind spread: a stored blob written by an older
  // build can carry a key this one has dropped, or a value of the wrong
  // shape, and either would poison the whole store.
  const merged = { ...DEFAULT_PREFS }
  for (const k of Object.keys(DEFAULT_PREFS) as (keyof StudioPrefs)[]) {
    const v = stored[k]
    if (v === undefined) continue
    const dflt = DEFAULT_PREFS[k]
    // A default of `null` means the field is nullable and its non-null shape
    // is not knowable from the default — `aspectOverride` is null-or-string,
    // and a plain `typeof v === typeof dflt` would reject every value it can
    // actually hold, so the picker would silently never persist.
    const ok = dflt === null
      ? (v === null || typeof v === 'string')
      : typeof v === typeof dflt && Array.isArray(v) === Array.isArray(dflt)
    if (!ok) continue
    // @ts-expect-error — key-parallel assignment, checked above
    merged[k] = v
  }
  return { ...merged, ...fromUrl() }
}

let state: StudioPrefs = load()
const listeners = new Set<() => void>()

let flushAt = 0
function persist() {
  // Coalesced: a slider drag emits one of these per pointer-move, and
  // localStorage writes are synchronous and block the frame.
  if (flushAt) return
  flushAt = window.setTimeout(() => {
    flushAt = 0
    try { localStorage.setItem(KEY, JSON.stringify(state)) } catch { /* full or blocked */ }
  }, 250)
}

export function getPrefs(): StudioPrefs {
  return state
}

export function setPrefs(patch: Partial<StudioPrefs>) {
  let changed = false
  for (const k of Object.keys(patch) as (keyof StudioPrefs)[]) {
    if (patch[k] !== undefined && state[k] !== patch[k]) { changed = true; break }
  }
  if (!changed) return
  state = { ...state, ...patch }
  persist()
  for (const l of listeners) l()
}

export function resetPrefs() {
  state = { ...DEFAULT_PREFS }
  persist()
  for (const l of listeners) l()
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb)
  return () => { listeners.delete(cb) }
}
/** Imperative subscription for module stores (the live-render client). */
export const subscribePrefs = subscribe

/** The whole store. Changes on user action, never per frame. */
export function useStudioPrefs(): StudioPrefs {
  return useSyncExternalStore(subscribe, getPrefs, getPrefs)
}

/* ── Stars ─────────────────────────────────────────────────────────────────
 * A star is a personal view preference, not a property of the film, which is
 * why it is here and not in manifest.ts: another session edits this repo
 * concurrently, and a starred shot must not turn into a diff. */
export function isStarred(key: string): boolean {
  return state.starred.includes(key)
}

export function toggleStar(key: string) {
  const has = state.starred.includes(key)
  setPrefs({ starred: has ? state.starred.filter(k => k !== key) : [...state.starred, key] })
}
