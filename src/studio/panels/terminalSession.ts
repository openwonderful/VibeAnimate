/**
 * terminalSession — the pty terminal as a MODULE SINGLETON, not a component.
 *
 * ── Why this is not just "the panel's useEffect" ──────────────────────
 * It was, for one commit, and it was wrong in a way that only shows up when
 * you use the feature the panel exists for. The terminal was built in an
 * effect whose dependency chain reached the viewport SELECTION, so clicking an
 * object disposed the terminal and reconnected the socket. Measured: two
 * clicks, two new sockets, a new `.xterm` element each time. Mid-answer that
 * throws away the answer.
 *
 * Then there is unmounting, and there are FOUR ways the panel unmounts — only
 * one of which is the one you would think to defend against:
 *
 *   1. switching the right-rail tab              (StudioLayout's ternary)
 *   2. the Preview and Storyboard workspaces     (FlowStudio passes right=undefined)
 *   3. focus mode, Ctrl+\                        (StudioLayout drops both rails)
 *   4. fullscreen stage, \                       (same)
 *
 * Two of those SHOULD not render a right rail, so "keep the panel mounted and
 * hide it" cannot be the answer. The terminal has to outlive its panel
 * entirely. So the xterm instance, its wrapper element and the socket live
 * here, at module scope; the panel borrows the wrapper and hands it back.
 *
 * ── Rules that make that correct ──────────────────────────────────────
 * - `term.open()` runs ONCE, into a wrapper this module owns. Mounting moves
 *   the WRAPPER into the panel's host; unmounting takes it out again. Never
 *   re-open: FitAddon measures `terminal.element.parentElement`, so a stable
 *   wrapper keeps its measurement source stable across re-parents.
 * - Unmount NEVER disposes. React StrictMode mounts, unmounts and remounts
 *   every effect in dev, and all four paths above are routine. Disposal
 *   happens on `pagehide` and nowhere else.
 * - The pty outlives the socket anyway (the server holds it for a grace
 *   period), so even a hard reload resumes — this just means you do not pay
 *   the reconnect for a tab switch.
 */
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'
import { T } from '../ui/theme'

export type TerminalStatus = 'idle' | 'connecting' | 'open' | 'closed' | 'unavailable'

const ID_KEY = 'flowstudio.pty'

type Session = {
  wrap: HTMLDivElement
  term: Terminal
  fit: FitAddon
  ws: WebSocket | null
  status: TerminalStatus
  subs: Set<() => void>
  /** Last selection frame, resent on every (re)connect so a reattached
   *  terminal is not stale about what is selected. */
  lastSelection: string | null
}

/**
 * Stashed on globalThis rather than held in a module `let`.
 *
 * Editing this file triggers an HMR update, which re-evaluates the module and
 * would otherwise orphan a live `claude` behind a socket nobody holds. Same
 * reason the server keeps its pty registry there.
 */
const G = globalThis as unknown as { __studioTerm?: Session }

function newId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

function xtermTheme() {
  return {
    background: T.inset,
    foreground: T.text,
    cursor: T.gold,
    cursorAccent: T.inset,
    selectionBackground: '#5b96e855',
    black: '#161616', red: '#c4574d', green: '#6fbf73', yellow: '#d8a34a',
    blue: '#5b96e8', magenta: '#a08ad0', cyan: '#5fb0b7', white: '#c9cbce',
    brightBlack: '#5d6165', brightRed: '#d97b71', brightGreen: '#8fd493',
    brightYellow: '#e8bd6d', brightBlue: '#7fb0f2', brightMagenta: '#bda6e8',
    brightCyan: '#7fc9cf', brightWhite: '#e6e8ea',
  }
}

function create(): Session {
  const wrap = document.createElement('div')
  wrap.style.width = '100%'
  wrap.style.height = '100%'

  const term = new Terminal({
    fontFamily: T.mono,
    fontSize: 11,
    lineHeight: 1.2,
    // Studio chrome must not animate — the global anim clock pins document
    // animations when paused, and a frozen half-drawn caret looks broken.
    cursorBlink: false,
    scrollback: 5000,
    allowProposedApi: true,
    theme: xtermTheme(),
  })
  const fit = new FitAddon()
  term.loadAddon(fit)
  term.open(wrap)

  /* The studio's keymap binds BARE LETTERS — `b` blades the selected clip,
   * Backspace ripple-deletes it. It stands down for INPUT/TEXTAREA targets and
   * xterm's hidden input is a textarea, so that already holds; tagging it as
   * the prompt makes the console-open guard in useStudioKeys treat it the same
   * way it treated the old input. */
  term.textarea?.setAttribute('data-studio-prompt', '')

  const s: Session = { wrap, term, fit, ws: null, status: 'idle', subs: new Set(), lastSelection: null }

  term.onData(d => {
    if (s.ws && s.ws.readyState === WebSocket.OPEN) s.ws.send(d)
  })

  // Disposal happens here and nowhere else. Every other teardown path in the
  // app is routine and must be free.
  window.addEventListener('pagehide', () => {
    try { s.ws?.close() } catch { /* closing */ }
  })

  G.__studioTerm = s
  connect(s)
  return s
}

function setStatus(s: Session, status: TerminalStatus) {
  if (s.status === status) return
  s.status = status
  for (const fn of s.subs) fn()
}

function connect(s: Session) {
  const token = (window as { __STUDIO_TOKEN?: string }).__STUDIO_TOKEN
  if (!token) { setStatus(s, 'unavailable'); return }

  let id = sessionStorage.getItem(ID_KEY)
  if (!id) { id = newId(); sessionStorage.setItem(ID_KEY, id) }

  const proto = location.protocol === 'https:' ? 'wss' : 'ws'
  const url = `${proto}://${location.host}/__studio/pty`
    + `?id=${encodeURIComponent(id)}&cols=${s.term.cols}&rows=${s.term.rows}`
  // The token rides in the SUBPROTOCOL: it is the one client-set header a
  // browser will send on an upgrade, and it keeps the secret out of anything
  // that records paths.
  const ws = new WebSocket(url, ['studio.pty', token])
  s.ws = ws
  setStatus(s, 'connecting')

  ws.onopen = () => {
    setStatus(s, 'open')
    ws.send(`\x00resize:${s.term.cols},${s.term.rows}`)
    if (s.lastSelection) ws.send(s.lastSelection)
  }
  ws.onmessage = ev => {
    const text = typeof ev.data === 'string' ? ev.data : ''
    // A leading NUL is a control frame, never keyboard bytes.
    if (text.charCodeAt(0) === 0) {
      if (text.startsWith('\x00id:')) sessionStorage.setItem(ID_KEY, text.slice(4).trim())
      return
    }
    s.term.write(text)
  }
  const done = () => { if (s.ws === ws) setStatus(s, 'closed') }
  ws.onclose = done
  ws.onerror = done
}

export function acquire(): Session {
  return G.__studioTerm ?? create()
}

/** Put the terminal into a panel. Moves the wrapper; never rebuilds. */
export function mountTerminal(host: HTMLElement): Session {
  const s = acquire()
  if (s.wrap.parentElement !== host) host.appendChild(s.wrap)
  return s
}

/** Take it out again. Deliberately not a teardown — see the header. */
export function unmountTerminal() {
  G.__studioTerm?.wrap.remove()
}

export function fitTerminal(): { cols: number; rows: number } | null {
  const s = G.__studioTerm
  if (!s) return null
  const host = s.wrap.parentElement
  if (!host) return null
  const r = host.getBoundingClientRect()
  // A tab mid-switch measures zero; fitting to that would hand the TUI a
  // 0-column terminal and it would never recover its layout.
  if (r.width < 8 || r.height < 8) return null
  try { s.fit.fit() } catch { return null }
  if (s.ws && s.ws.readyState === WebSocket.OPEN) {
    s.ws.send(`\x00resize:${s.term.cols},${s.term.rows}`)
  }
  return { cols: s.term.cols, rows: s.term.rows }
}

export function focusTerminal() {
  G.__studioTerm?.term.focus()
}

/** Is the user currently typing in here? xterm's keyboard input is a hidden
 *  textarea, so document.activeElement is the honest answer. */
export function isTerminalFocused(): boolean {
  const ta = G.__studioTerm?.term.textarea
  return !!ta && document.activeElement === ta
}

/**
 * Type into the terminal as if the user had.
 *
 * Bytes go to the pty, exactly like a keystroke — we do NOT echo anything
 * ourselves. That is the whole reason this is safe against a full-screen TUI:
 * `claude` owns the screen, so the only correct way to put text on its input
 * line is to let it draw it.
 */
export function sendKeys(text: string) {
  const s = G.__studioTerm
  if (s?.ws && s.ws.readyState === WebSocket.OPEN) s.ws.send(text)
}

/** Publish the viewport selection for the agent to read. Cached so a reconnect
 *  re-sends it rather than leaving the file describing a stale selection. */
export function publishSelection(payload: unknown) {
  const s = G.__studioTerm
  if (!s) return
  s.lastSelection = `\x00sel:${JSON.stringify(payload)}`
  if (s.ws && s.ws.readyState === WebSocket.OPEN) s.ws.send(s.lastSelection)
}

/** End this conversation and start a fresh `claude`. The old pty reaps on its
 *  own once nothing is attached. */
export function restartTerminal() {
  const s = G.__studioTerm
  if (!s) return
  const old = s.ws
  s.ws = null
  // Closing a socket that has not finished connecting logs a console error
  // that reads like a server fault; wait for it to open, then close it.
  if (old) {
    if (old.readyState === WebSocket.CONNECTING) old.onopen = () => old.close()
    else old.close()
  }
  sessionStorage.removeItem(ID_KEY)
  s.term.reset()
  connect(s)
}

export function subscribeTerminal(fn: () => void): () => void {
  const s = acquire()
  s.subs.add(fn)
  return () => { s.subs.delete(fn) }
}

export function getTerminalStatus(): TerminalStatus {
  return G.__studioTerm?.status ?? 'idle'
}
