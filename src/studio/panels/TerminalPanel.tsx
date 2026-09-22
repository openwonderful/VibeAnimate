/**
 * TerminalPanel — the actual Claude Code, in the rail.
 *
 * ── What this replaces ────────────────────────────────────────────────
 * ConsolePanel was a hand-written chat over `claude --print`: one process per
 * turn, text in, text out. It could answer a question and nothing else. No
 * permission prompts, no plan mode, no slash commands, no /clear, no way to
 * see what it was doing or to stop it halfway. Every improvement to it was a
 * step towards reimplementing a program that already exists.
 *
 * So this is that program. `node-pty` runs the real interactive `claude` on
 * the dev server, xterm.js draws it here, and the studio's job shrinks to
 * giving it a rectangle, a keyboard and the right size.
 *
 * ── This component owns almost nothing ────────────────────────────────
 * The terminal, its element and its socket live in `terminalSession.ts` at
 * module scope, because they have to outlive this component — the panel is
 * destroyed by a tab switch, by the Preview and Storyboard workspaces, by
 * focus mode and by fullscreen, and a conversation should survive all four.
 * What is left here is a host div, a resize observer and a header.
 *
 * ── The one thing a raw terminal cannot do ────────────────────────────
 * The old panel knew what was SELECTED in the viewport and attached it to
 * your question. A pty is bytes; it has no idea a 3D scene exists. Both halves
 * of that are kept, by different means:
 *
 *   - `@keeper move y 0.5` stays a LOCAL, instant edit — the object strip
 *     below, which is the old dispatch with the chat removed. It never goes
 *     near the pty, so a TUI redrawing the screen cannot be confused by it,
 *     which is what intercepting `@` inside xterm would have risked.
 *   - The selection is published to `.studio/selection.json` over the same
 *     socket, and the system prompt names it. So "make him taller" in the real
 *     terminal still knows who "him" is.
 */
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { T, chipStyle, panelHeaderStyle } from '../ui/theme'
import { ObjectStrip } from './ObjectStrip'
import {
  fitTerminal, focusTerminal, getTerminalStatus, isTerminalFocused, mountTerminal,
  publishSelection, restartTerminal, sendKeys, subscribeTerminal, unmountTerminal,
} from './terminalSession'
import { subscribeEditables, getSelectedId, getEditable } from '../editable/store'
import { describeTransform } from '../editable/commands'
import type { ViewTarget } from '../types'

export function TerminalPanel({ view, onClose }: { view: ViewTarget; onClose: () => void }) {
  const hostRef = useRef<HTMLDivElement>(null)
  const [cols, setCols] = useState(0)
  const status = useSyncExternalStore(subscribeTerminal, getTerminalStatus, () => 'idle' as const)
  const selectedId = useSyncExternalStore(subscribeEditables, getSelectedId, () => null)

  /* Borrow the terminal. No construction here, so this effect can run as often
   * as React likes — StrictMode's double-mount included — without costing a
   * socket or a scrollback. */
  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    mountTerminal(host)
    const ro = new ResizeObserver(() => {
      const size = fitTerminal()
      if (size) setCols(size.cols)
    })
    ro.observe(host)
    // A frame's grace: the panel is often still laying out on mount, and
    // fitting to a half-measured box hands the TUI the wrong column count.
    const raf = requestAnimationFrame(() => {
      const size = fitTerminal()
      if (size) setCols(size.cols)
    })
    return () => { cancelAnimationFrame(raf); ro.disconnect(); unmountTerminal() }
  }, [])

  /*
   * The selection, on its own effect.
   *
   * This is the whole reason the terminal moved to module scope: when it was
   * built in an effect that depended on the selection, clicking an object in
   * the viewport disposed the terminal and reconnected. Measured before the
   * split: two clicks, two new sockets, a new .xterm element each time. Now a
   * selection change sends one frame and touches nothing else.
   */
  const lastRef = useRef<string | null>(null)
  useEffect(() => {
    const e = selectedId ? getEditable(selectedId) : undefined
    const t = selectedId ? describeTransform(selectedId) : null

    /*
     * Put the object's FILE on the prompt, as a real Claude Code `@` reference.
     *
     * Typed as keystrokes and never echoed locally — `claude` owns the screen,
     * so letting it draw its own input line is the only way this cannot
     * corrupt a redraw. Verified against the live TUI: `@path ` lands on the
     * prompt and the trailing space dismisses the file picker `@` opens.
     *
     * NOT while the terminal has focus. If you are typing, your line is yours;
     * this only fires when you are working in the viewport, which is exactly
     * when clicking a character means "let's talk about this one".
     */
    if (e?.sourcePath && e.sourcePath !== lastRef.current && !isTerminalFocused()) {
      lastRef.current = e.sourcePath
      sendKeys(`@${e.sourcePath} `)
    }
    if (!e) lastRef.current = null

    publishSelection({
      scene: view.key,
      selected: e && t ? {
        id: e.id, name: e.name, kind: e.kind, sourcePath: e.sourcePath,
        visible: e.object.visible,
        live: { position: t.position, rotationDeg: t.rotation, scale: t.scale },
        note: 'The live transform includes studio-only poses that are NOT in the source file.',
      } : null,
    })
  }, [selectedId, view.key])

  // 40 columns is about where Claude Code's own layout stops fitting. The
  // default rail lands almost exactly there, so this is a nudge to drag it
  // wider rather than a fault.
  const narrow = cols > 0 && cols < 40

  return (
    <div style={{
      flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column',
      background: T.panel, border: `1px solid ${T.border}`, borderRadius: 4, overflow: 'hidden',
    }}>
      <div style={panelHeaderStyle}>
        <span>Claude</span>
        <span style={{
          ...chipStyle, fontSize: 9,
          color: status === 'open' ? T.play : status === 'connecting' ? T.textDim : T.danger,
        }}>{status === 'open' ? 'live' : status}</span>
        <span style={{ flex: 1 }} />
        {narrow && (
          <span style={chipStyle} title={`${cols} columns — Claude Code's layout wants about 40. Drag the rail wider.`}>
            {cols}c
          </span>
        )}
        <button
          onClick={restartTerminal}
          title="New session — ends this conversation and starts a fresh claude"
          style={{ ...chipStyle, cursor: 'pointer' }}
        >new</button>
        <button title="Close (`)" style={{ ...chipStyle, cursor: 'pointer' }} onClick={onClose}>×</button>
      </div>

      {status === 'unavailable' && (
        <div style={{ padding: '8px 10px', fontSize: 10, color: T.textFaint, lineHeight: 1.6 }}>
          No dev token on this page — the terminal only exists on the dev server.
        </div>
      )}
      {status === 'closed' && (
        <div style={{ padding: '6px 10px', fontSize: 10, color: T.danger, lineHeight: 1.5 }}>
          Disconnected. If the dev server restarted, reload the tab — the token
          changes on every restart.
        </div>
      )}

      {/* `overflow: hidden` matters: xterm measures its host, and a scrollbar
          appearing would make it re-measure forever. */}
      <div
        ref={hostRef}
        onMouseDown={focusTerminal}
        style={{ flex: 1, minHeight: 0, padding: '4px 2px 2px 6px', background: T.inset, overflow: 'hidden' }}
      />

      <ObjectStrip sceneKey={view.key} />
    </div>
  )
}
