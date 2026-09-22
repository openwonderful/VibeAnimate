/**
 * Live AI render — the client half (features_1.md §7b).
 *
 * The viewport captures (render JPEG, depth bytes) frames and hands them to
 * `sendFrame`; this module owns the WebSocket to scripts/live-render/server.py,
 * keeps ONE frame in flight, and publishes the latest stylised frame as an
 * object URL plus the numbers the status chip shows.
 *
 * Module store, not context: the capture runs inside R3F's frame loop and
 * the overlay is DOM on the stage; neither should re-render the editor per
 * frame. Same discipline as editable/store.ts.
 *
 * Off = nothing connected, nothing allocated. `LiveCapture` mounts its
 * render target only while `getPrefs().liveRender` is true.
 */
import { useSyncExternalStore } from 'react'
import { getPrefs, setPrefs, subscribePrefs } from '../state/prefs'
import { devApiAvailable, studioGet, studioPost } from '../devApi'

export type LiveStatus = 'off' | 'starting' | 'connecting' | 'open' | 'closed' | 'error'

export type LiveState = {
  status: LiveStatus
  model: string
  controlnet: boolean
  /** Model time for the last frame, ms, and an EMA of the round trip. */
  ms: number
  fps: number
  frames: number
  /** Latest stylised frame (object URL) — null until the first reply. */
  url: string | null
  /** Server log tail while it is starting (model download / load). */
  log: string
  error: string | null
}

let state: LiveState = {
  status: 'off', model: '', controlnet: false, ms: 0, fps: 0, frames: 0, url: null, log: '', error: null,
}
const listeners = new Set<() => void>()
function emit() { for (const l of listeners) l() }
function patch(p: Partial<LiveState>) { state = { ...state, ...p }; emit() }

export function getLive(): LiveState { return state }
export function subscribeLive(cb: () => void): () => void {
  listeners.add(cb)
  return () => { listeners.delete(cb) }
}
export function useLive(): LiveState {
  return useSyncExternalStore(subscribeLive, getLive, getLive)
}

export const LIVE_PORT = 8765
/** Capture size: the film's 16:9 at the model's native 512 width. */
export const LIVE_W = 512
export const LIVE_H = 288

let ws: WebSocket | null = null
let inflight: { id: number; sentAt: number } | null = null
let nextId = 1
let lastReplyAt = 0
let reconnectTimer = 0

function wsUrl() {
  const proto = location.protocol === 'https:' ? 'wss' : 'ws'
  return `${proto}://${location.hostname}:${LIVE_PORT}`
}

/** One frame in flight at a time; the capture asks before it pays for a readback. */
export function liveWantsFrame(): boolean {
  return state.status === 'open' && inflight === null && ws?.readyState === WebSocket.OPEN
}

function pack(header: Record<string, unknown>, ...payloads: ArrayBuffer[]): ArrayBuffer {
  const h = new TextEncoder().encode(JSON.stringify(header))
  const total = 4 + h.byteLength + payloads.reduce((n, p) => n + p.byteLength, 0)
  const out = new Uint8Array(total)
  new DataView(out.buffer).setUint32(0, h.byteLength, true)
  out.set(h, 4)
  let o = 4 + h.byteLength
  for (const p of payloads) { out.set(new Uint8Array(p), o); o += p.byteLength }
  return out.buffer
}

function unpack(data: ArrayBuffer): { header: Record<string, unknown>; payload: ArrayBuffer } {
  const n = new DataView(data).getUint32(0, true)
  const header = JSON.parse(new TextDecoder().decode(new Uint8Array(data, 4, n))) as Record<string, unknown>
  return { header, payload: data.slice(4 + n) }
}

export function sendFrame(scene: string, jpeg: ArrayBuffer, depth: ArrayBuffer | null) {
  if (!liveWantsFrame() || !ws) return
  const p = getPrefs()
  const id = nextId++
  const header = {
    id, w: LIVE_W, h: LIVE_H, scene,
    jpeg: jpeg.byteLength, depth: depth?.byteLength ?? 0,
    prompt: p.livePrompt, negative: p.liveNegative,
    strength: p.liveStrength, steps: 2, seed: 7,
    control: p.liveControl, blend: p.liveBlend,
  }
  inflight = { id, sentAt: performance.now() }
  ws.send(depth ? pack(header, jpeg, depth) : pack(header, jpeg))
}

function onMessage(ev: MessageEvent) {
  if (typeof ev.data === 'string') {
    let j: Record<string, unknown>
    try { j = JSON.parse(ev.data) as Record<string, unknown> } catch { return }
    if (j.type === 'status') {
      patch({ model: String(j.model ?? ''), controlnet: !!j.controlnet, error: null })
    } else if (j.type === 'error') {
      inflight = null
      patch({ error: String(j.error ?? 'error') })
    }
    return
  }
  const { header, payload } = unpack(ev.data as ArrayBuffer)
  if (inflight && header.id === inflight.id) inflight = null
  const now = performance.now()
  const dt = lastReplyAt ? now - lastReplyAt : 0
  lastReplyAt = now
  const fps = dt > 0 ? (state.fps ? state.fps * 0.8 + (1000 / dt) * 0.2 : 1000 / dt) : state.fps
  const url = URL.createObjectURL(new Blob([payload], { type: 'image/jpeg' }))
  if (state.url) URL.revokeObjectURL(state.url)
  patch({ url, ms: Number(header.ms ?? 0), fps, frames: state.frames + 1, error: null })
}

function connect() {
  if (ws || !getPrefs().liveRender) return
  patch({ status: 'connecting' })
  const sock = new WebSocket(wsUrl())
  sock.binaryType = 'arraybuffer'
  ws = sock
  sock.onopen = () => { inflight = null; patch({ status: 'open', error: null }); sock.send(JSON.stringify({ type: 'hello' })) }
  sock.onmessage = onMessage
  sock.onerror = () => { /* onclose follows */ }
  sock.onclose = () => {
    if (ws !== sock) return
    ws = null
    inflight = null
    if (!getPrefs().liveRender) { patch({ status: 'off' }); return }
    // Not up yet (or gone): ask the dev server to start it, then keep trying.
    patch({ status: 'starting' })
    void ensureServer()
    reconnectTimer = window.setTimeout(connect, 2000)
  }
}

function disconnect() {
  clearTimeout(reconnectTimer)
  reconnectTimer = 0
  const sock = ws
  ws = null
  inflight = null
  if (sock) sock.close()
  if (state.url) URL.revokeObjectURL(state.url)
  state = { ...state, status: 'off', url: null, fps: 0, ms: 0, frames: 0, log: '', error: null }
  emit()
}

/**
 * The dev server starts scripts/live-render/server.py on demand (vite.config
 * `studioLive`) and hands back its log tail so the chip can say "loading
 * model…" instead of "connecting" for the ninety seconds that takes.
 */
let starting = false
async function ensureServer() {
  if (!devApiAvailable() || starting) return
  starting = true
  try {
    const r = await studioGet('/__studio/live')
    const j = await r.json() as { running: boolean; log?: string; error?: string }
    if (j.error) { patch({ error: j.error, log: j.log ?? '' }); return }
    patch({ log: j.log ?? '' })
    if (!j.running) {
      const s = await studioPost('/__studio/live', { action: 'start' })
      const sj = await s.json() as { started?: boolean; error?: string; log?: string }
      if (sj.error) patch({ error: sj.error })
    }
  } catch (e) {
    patch({ error: String(e) })
  } finally {
    starting = false
  }
}

/* React to the pref: the toggle IS the lifecycle. */
let wasOn = false
function sync() {
  const on = getPrefs().liveRender
  if (on && !wasOn) { wasOn = true; connect() }
  else if (!on && wasOn) { wasOn = false; disconnect() }
}
subscribePrefs(sync)
if (typeof window !== 'undefined') queueMicrotask(sync)

export function toggleLive() { setPrefs({ liveRender: !getPrefs().liveRender }) }

/* Tooling hooks (CDP tests, demo recording): `window.__live()` is the store
 * snapshot; `window.__liveDepth()` is the last depth map as a data URL
 * (set by LiveCapture). */
declare global {
  interface Window { __live?: () => LiveState; __liveDepth?: () => string | null }
}
if (typeof window !== 'undefined') window.__live = getLive
