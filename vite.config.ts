import { spawn } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { existsSync, mkdirSync, openSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
// @ts-expect-error — plain .mjs tooling helper, no types (same as scripts/lib/acts.mjs)
import { listFilms as listFilmsUntyped } from './scripts/lib/films.mjs'

/** What scripts/lib/films.mjs parses out of src/studio/films.ts. */
type ParsedFilm = {
  id: string
  name: string
  composition: string
  sourcePath: string
  timelineConst: string | null
  audio: string | null
  aspect: string | null
  durationSec: number | null
}
const listFilms = listFilmsUntyped as () => ParsedFilm[]

/**
 * Per-server-start secret for the two write-capable studio endpoints.
 * Injected into the dev HTML by `studioAuth()` and echoed back by
 * `src/studio/devApi.ts`. Regenerated every restart, never written to disk.
 */
const STUDIO_TOKEN = randomBytes(24).toString('hex')

/**
 * What both Claude surfaces are told about where they are.
 *
 * Shared by the one-shot `/__studio/agent` endpoint and by the embedded
 * terminal, which passes it once at spawn rather than per turn. One string,
 * because two copies of "what is this repo" drift and the drift is invisible
 * until an answer is confidently wrong.
 */
const STUDIO_SYSTEM = [
  'You are the assistant inside Flow Studio, a code-first animation editor',
  'layered over a React 19 + three.js + Remotion scene system for a music video.',
  'The repo root is your working directory; read CLAUDE.md and docs/studio/ first.',
  'Answer briefly and in prose — your output is shown in a narrow side panel',
  'inside the editor, so no headings, no tables, and no long code blocks unless',
  'the user asked for code.',
  'The user talks to you by typing plainly; they do NOT prefix questions.',
  'A message may begin with an "[attached object …]" block: that is whatever the',
  'user has SELECTED in the viewport right now, with its live transform and the',
  'file it is declared in. Treat it as the subject of the sentence — "make him',
  'taller" means that object. Its live transform can differ from the source file,',
  'because the studio lets you pose objects non-destructively; say which one you',
  'are changing.',
  'A message may contain a "[shotref …]" token: a framing the user captured on',
  'the stage — scene key, scene-local t, film time/frame, the camera pose as',
  'pos->target+fov, pose=orbited (a hand-flown debug-camera view: a framing the',
  'user WANTS) or pose=shot (what the scene\'s own rig renders at that t), and',
  'the absolute path of a PNG of that exact frame, which you should Read. A',
  'JSON sidecar sits next to the PNG. Treat the token as the subject of the',
  'sentence: "make the rig end here" means land the scene camera on that pose.',
  'UNITS: the studio console\'s @entity commands take DEGREES for rotation',
  '(editable/commands.ts converts to radians). Never emit radians to them.',
  'To move something only in the studio, tell the user to run "@id move y 0.5";',
  'to move it for real, edit the scene file.',
  'Scene keys look like 3.2 / 8.55 / 5.2-B and are declared in src/scenes/manifest.ts.',
  'The master timeline is length-locked at 3:10 and throws at module load on a',
  'gap, an overlap, or a different total — never propose an edit that breaks that.',
].join(' ')

/**
 * Gate for `/__studio/exec` and `/__studio/apply-timeline` — the two
 * endpoints that can run commands or write files.
 *
 * WHY THIS EXISTS. Both were previously ungated, and "dev-only + bound to
 * localhost" is not a defence: the request originates INSIDE the machine,
 * from the browser. A POST with `content-type: text/plain` is a CORS-SIMPLE
 * request — no preflight — so any page in any tab could fire one at
 * 127.0.0.1:5174 and have it execute. The browser blocks reading the
 * response, which makes it blind, not harmless. Demonstrated with:
 *
 *   curl -X POST .../__studio/exec -H 'content-type: text/plain' \
 *        -H 'Origin: https://evil.example.com' -d '{"cmd":"id -un"}'   → ran.
 *
 * Three independent gates, any one of which is sufficient:
 *   1. `content-type: application/json` — NOT a simple content type, so a
 *      cross-origin caller must preflight, and we answer no preflight at all.
 *   2. Origin / Sec-Fetch-Site must be same-origin when the browser sends them.
 *   3. A per-start token the attacker cannot read (it is only in our HTML,
 *      which the same-origin policy keeps them from fetching).
 */
function guardStudioWrite(req: IncomingMessage, res: ServerResponse): boolean {
  return guardStudio(req, res, { requireJson: true })
}

/**
 * The same gate, with the content-type requirement optional so it can also
 * cover GETs (the job registry's status and log reads). A GET still cannot be
 * made cross-origin: the token lives in a custom header, which is not a
 * CORS-simple header, so the browser preflights it and we answer nothing.
 */
function guardStudio(
  req: IncomingMessage,
  res: ServerResponse,
  { requireJson }: { requireJson: boolean },
): boolean {
  const deny = (code: number, why: string) => {
    res.statusCode = code
    res.end(`studio: ${why}`)
    return false
  }
  const type = String(req.headers['content-type'] ?? '')
  if (requireJson && !type.toLowerCase().startsWith('application/json')) {
    return deny(415, 'content-type must be application/json')
  }
  // Browsers set this on every fetch; curl and friends do not, and a missing
  // value is fine because gate 3 still applies.
  const site = req.headers['sec-fetch-site']
  if (typeof site === 'string' && site !== 'same-origin' && site !== 'none') {
    return deny(403, `cross-site request refused (sec-fetch-site: ${site})`)
  }
  const origin = req.headers.origin
  if (typeof origin === 'string' && origin !== '') {
    let originHost = ''
    try { originHost = new URL(origin).host } catch { return deny(403, 'bad origin') }
    if (originHost !== req.headers.host) {
      return deny(403, `cross-origin request refused (origin: ${origin})`)
    }
  }
  if (req.headers['x-studio-token'] !== STUDIO_TOKEN) {
    return deny(403, 'missing or stale x-studio-token — reload the studio tab')
  }
  return true
}

/**
 * Publishes the dev token to the page. Serve-only, so it never reaches a
 * production bundle; the value changes on every server start, which is why a
 * stale tab gets a 403 telling it to reload rather than a silent failure.
 */
function studioAuth(): Plugin {
  return {
    name: 'studio-auth',
    apply: 'serve',
    transformIndexHtml() {
      return [{
        tag: 'script',
        injectTo: 'head-prepend',
        children: `window.__STUDIO_TOKEN=${JSON.stringify(STUDIO_TOKEN)}`,
      }]
    },
  }
}

/**
 * Dev-only console endpoint for the studio's embedded terminal panel:
 * POST /__studio/exec {cmd} runs the command in the repo root via
 * `bash -lc` and streams combined stdout/stderr back as chunked text.
 * Closing the request (client abort / kill button) SIGTERMs the child.
 * Local dev tool only — the plugin is `apply: 'serve'`, never bundled.
 */
function studioExec(): Plugin {
  return {
    name: 'studio-exec',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__studio/exec', (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; res.end('POST only'); return }
        if (!guardStudioWrite(req, res)) return
        let body = ''
        req.on('data', (c: Buffer) => { body += c })
        req.on('end', () => {
          let cmd: string
          try {
            cmd = String((JSON.parse(body) as { cmd?: unknown }).cmd ?? '')
          } catch {
            res.statusCode = 400; res.end('bad json'); return
          }
          if (!cmd.trim()) { res.statusCode = 400; res.end('empty cmd'); return }
          res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-cache' })
          // detached → own process group, so an abort kills the whole
          // command tree (bash's grandchildren survive a plain SIGTERM).
          const child = spawn('bash', ['-lc', cmd], { cwd: server.config.root, env: process.env, detached: true })
          child.stdout.on('data', (d: Buffer) => res.write(d))
          child.stderr.on('data', (d: Buffer) => res.write(d))
          child.on('close', (code) => res.end(`\n[exit ${code}]\n`))
          child.on('error', (err) => res.end(`\n[spawn error: ${err.message}]\n`))
          // Kill only on premature CONNECTION close (client abort) — req
          // 'close' fires as soon as the request body ends, which would
          // SIGTERM the child immediately.
          res.on('close', () => {
            if (!res.writableEnded && child.pid) {
              try { process.kill(-child.pid, 'SIGTERM') } catch { /* gone */ }
            }
          })
        })
      })
    },
  }
}

/**
 * The agent (K2). POST /__studio/agent {prompt, sessionId, resume, cwdScene}
 * runs Claude Code headless and streams its text back.
 *
 * WHY THIS IS AN ENDPOINT AND NOT A CONSOLE COMMAND. The console could have
 * built `claude -p "…"` and posted it to /__studio/exec, and that would have
 * been a shell-injection hole in the one field the user types prose into —
 * quotes, backticks and `$(…)` are ORDINARY CHARACTERS in a sentence about a
 * film. Spawning with argv means the prompt is never parsed by a shell.
 *
 * Same reasoning as buildRenderJob: the browser sends intent, the server
 * decides what runs.
 *
 * SESSIONS. Each console tab mints a UUID and passes it as `sessionId`. The
 * first message uses --session-id, every later one --resume, so a tab is a
 * conversation and two tabs are two conversations. This is the documented
 * pattern; `--continue` is per-directory and would silently merge them.
 *
 * THE UNITS TRAP. `editable/commands.ts` converts degrees to radians, so
 * `@keeper rot y 1.57` is 1.57 DEGREES — about 0.027 radians, visually
 * nothing. An agent that has read three.js docs will emit radians and
 * produce a 1.6° nudge that looks like the command silently failed. The
 * system prompt says so explicitly.
 */
/**
 * The embedded terminal (K3). `/__studio/pty` is a WebSocket carrying a REAL
 * pty running the interactive `claude` TUI, rendered by xterm.js in the right
 * rail.
 *
 * ── Why this replaces the hand-written chat panel ──────────────────────
 * `/__studio/agent` runs `claude --print` — one turn, one process, text in and
 * text out. That was enough to answer a question and nothing else: no
 * permission prompts, no plan mode, no slash commands, no /clear, no ability
 * to see what it is doing. The panel was an imitation of Claude Code that got
 * steadily further from it. A pty is the actual thing, and the studio's job
 * shrinks to giving it a rectangle and a keyboard.
 *
 * ── The upgrade guard is NOT the HTTP guard ────────────────────────────
 * Two of the three gates on the other endpoints do not exist here, and pretending
 * otherwise would put an unauthenticated shell on the port:
 *
 *   - content-type: an upgrade has none.
 *   - x-studio-token: `new WebSocket()` cannot set headers. Full stop.
 *
 * What survives is stronger than it looks:
 *
 *   1. ORIGIN. Browsers send it on every WS upgrade and page script cannot
 *      forge it. Unlike the HTTP path, a MISSING origin is refused here rather
 *      than tolerated — a browser always sends one, so no origin means the
 *      caller is curl or wscat, which for a shell is precisely who to refuse.
 *   2. THE TOKEN, moved into the SUBPROTOCOL. `new WebSocket(url, ['studio.pty',
 *      token])` is the one client-controlled header a browser will send, and
 *      it keeps the secret out of the URL — out of logs, out of Referer, out
 *      of anything that records paths.
 *
 * ── Sessions outlive their socket, deliberately ────────────────────────
 * Same lesson as the render registry (R3): the work belongs to the SERVER, not
 * to the tab that started it. A reload, a tab switch, a dropped socket — none
 * of those should kill a conversation mid-turn. The pty lives in `sessions`
 * keyed by an id the client keeps in sessionStorage, its output is kept in a
 * capped ring buffer, and reconnecting replays it so the terminal comes back
 * looking exactly as it was left. A session with nobody attached is killed
 * after GRACE_MS.
 */
const PTY_GRACE_MS = 5 * 60_000
/** Replay buffer per session. Enough for a screen's worth of scrollback and a
 *  long answer; a TUI redraws itself anyway, so this is belt and braces. */
const PTY_SCROLLBACK = 256 * 1024

type PtySession = {
  id: string
  proc: import('node-pty').IPty
  /** Everything the pty has written, capped — replayed to a reattaching tab. */
  buffer: string
  sockets: Set<import('ws').WebSocket>
  reapAt: ReturnType<typeof setTimeout> | null
  cols: number
  rows: number
}

function studioPty(): Plugin {
  /*
   * On globalThis, not in the closure.
   *
   * Editing vite.config.ts re-evaluates the config IN THE SAME PROCESS. A
   * closure-held registry is replaced by an empty one and every live `claude`
   * is orphaned — still running, still holding an fd, with nothing left that
   * knows how to kill it. Same reason the job registry wants this treatment.
   */
  const sessions = ((globalThis as Record<string, unknown>).__studioPtys ??= new Map()) as Map<string, PtySession>

  return {
    name: 'studio-pty',
    apply: 'serve',
    async configureServer(server) {
      // Imported lazily and defensively: node-pty is a NATIVE module, and a
      // machine where it did not build should still get a working studio with
      // one dead panel rather than a dev server that refuses to start.
      let pty: typeof import('node-pty') | null = null
      let WebSocketServer: typeof import('ws').WebSocketServer | null = null
      try {
        pty = await import('node-pty')
        ;({ WebSocketServer } = await import('ws'))
      } catch (err) {
        server.config.logger.warn(
          `studio: embedded terminal disabled — ${(err as Error).message}`)
        return
      }

      // Pin the negotiated subprotocol. `ws` happens to echo the first one
      // offered when this is unset, which makes the client/server pair work by
      // luck; saying it is the difference between a contract and a coincidence.
      const wss = new WebSocketServer({
        noServer: true,
        handleProtocols: () => 'studio.pty',
      })
      const httpServer = server.httpServer
      if (!httpServer) return

      httpServer.on('upgrade', (req, socket, head) => {
        // Match ONLY our path and return otherwise. Destroying anything else
        // would take Vite's own HMR socket down with it.
        let url: URL
        try { url = new URL(req.url ?? '/', `http://${req.headers.host}`) } catch { return }
        if (url.pathname !== '/__studio/pty') return

        const refuse = (why: string) => {
          server.config.logger.warn(`studio/pty: refused — ${why}`)
          socket.write('HTTP/1.1 403 Forbidden\r\n\r\n')
          socket.destroy()
        }

        const origin = req.headers.origin
        if (typeof origin !== 'string' || origin === '') return refuse('no Origin (not a browser)')
        let originHost = ''
        try { originHost = new URL(origin).host } catch { return refuse('bad Origin') }
        if (originHost !== req.headers.host) return refuse(`cross-origin (${origin})`)

        const offered = String(req.headers['sec-websocket-protocol'] ?? '')
          .split(',').map(s => s.trim())
        if (offered[0] !== 'studio.pty' || offered[1] !== STUDIO_TOKEN) {
          return refuse('missing or stale token — reload the studio tab')
        }

        wss!.handleUpgrade(req, socket, head, ws => {
          attach(ws, url.searchParams.get('id') ?? '', url.searchParams)
        })
      })

      function attach(ws: import('ws').WebSocket, wantId: string, params: URLSearchParams) {
        const cols = clampInt(params.get('cols'), 20, 400, 80)
        const rows = clampInt(params.get('rows'), 5, 200, 24)

        let s = sessions.get(wantId)
        if (!s) {
          const id = /^[\w-]{1,64}$/.test(wantId) ? wantId : randomBytes(8).toString('hex')
          const proc = pty!.spawn('claude', [
            // The same grounding the one-shot endpoint used. A pty session is
            // long-lived, so this is said once instead of per turn.
            '--append-system-prompt', STUDIO_SYSTEM,
          ], {
            name: 'xterm-256color',
            cols, rows,
            cwd: server.config.root,
            env: ptyEnv(),
          })
          s = { id, proc, buffer: '', sockets: new Set(), reapAt: null, cols, rows }
          sessions.set(id, s)
          /*
           * Coalesced on a short timer. A TUI repaint is many small writes,
           * and forwarding each as its own frame turned a burst into a
           * thousand-plus messages the renderer had to schedule individually.
           * 8ms is under a frame, so nothing is perceptibly late.
           */
          let pending = ''
          let flushAt: ReturnType<typeof setTimeout> | null = null
          const flush = () => {
            flushAt = null
            if (!pending) return
            const out = pending
            pending = ''
            for (const sock of s!.sockets) if (sock.readyState === 1) sock.send(out)
          }
          proc.onData(d => {
            s!.buffer = (s!.buffer + d).slice(-PTY_SCROLLBACK)
            pending += d
            if (!flushAt) flushAt = setTimeout(flush, 8)
            // A client that cannot keep up must not be allowed to grow the
            // send queue without bound; the pty is paused until it drains.
            for (const sock of s!.sockets) {
              if (sock.bufferedAmount > 1_000_000) {
                try { proc.pause() } catch { /* exited */ }
                const wait = setInterval(() => {
                  if ([...s!.sockets].every(x => x.bufferedAmount < 256_000)) {
                    clearInterval(wait)
                    try { proc.resume() } catch { /* exited */ }
                  }
                }, 50)
                break
              }
            }
          })
          proc.onExit(({ exitCode }) => {
            for (const sock of s!.sockets) {
              if (sock.readyState === 1) sock.send(`\r\n\x1b[2m[claude exited ${exitCode}]\x1b[0m\r\n`)
            }
            sessions.delete(s!.id)
          })
        }

        const sess = s
        if (sess.reapAt) { clearTimeout(sess.reapAt); sess.reapAt = null }
        sess.sockets.add(ws)

        // Tell the tab which session it actually got (it may have asked for a
        // dead one), then replay. The id goes first so the client can pin it
        // before any pty bytes arrive.
        ws.send(`\x00id:${sess.id}\n`)
        if (sess.buffer) ws.send(sess.buffer)
        resize(sess, cols, rows)

        ws.on('message', (raw: Buffer) => {
          const text = raw.toString('utf8')
          // One control character namespaces the channel: everything is
          // keystrokes except a leading NUL, which is a control frame. A pty
          // never receives a bare NUL from a keyboard, so there is nothing to
          // escape and no framing protocol to get wrong.
          if (text.charCodeAt(0) === 0) {
            // Parsed by prefix rather than by regex: a control character in a
            // regex literal is a lint error for good reasons elsewhere, and
            // slicing a known prefix is clearer anyway.
            const body = text.slice(1)
            if (body.startsWith('resize:')) {
              const [c, r] = body.slice(7).split(',')
              resize(sess, parseInt(c, 10) || sess.cols, parseInt(r, 10) || sess.rows)
              return
            }
            /*
             * The viewport's selection, on its way to a file.
             *
             * A pty is bytes and has no idea a 3D scene exists, so the thing
             * the old chat panel did best — "make him taller" knowing who
             * "him" is — has to reach the agent some other way. It reaches it
             * as a file it can read, republished on every selection change.
             * Written under `.studio/`, which is gitignored: this is editor
             * state, not a fact about the film.
             */
            if (body.startsWith('sel:')) {
              const json = body.slice(4)
              try {
                JSON.parse(json) // reject anything that is not the shape we send
                const dir = path.join(server.config.root, '.studio')
                if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
                writeFileSync(path.join(dir, 'selection.json'), `${json}\n`)
              } catch { /* a malformed frame is not worth killing a terminal over */ }
            }
            return
          }
          sess.proc.write(text)
        })

        ws.on('close', () => {
          sess.sockets.delete(ws)
          if (sess.sockets.size === 0 && !sess.reapAt) {
            sess.reapAt = setTimeout(() => killSession(sess), PTY_GRACE_MS)
          }
        })
      }

      function resize(s: PtySession, cols: number, rows: number) {
        if (cols === s.cols && rows === s.rows) return
        s.cols = cols; s.rows = rows
        try { s.proc.resize(cols, rows) } catch { /* exited */ }
      }

      /*
       * Killing a pty is not "close the master and it hangs up".
       *
       * MEASURED: the pty master fd LEAKS into every child spawned afterwards
       * — a plain `spawn('sleep')` was holding `/dev/ptmx` — so a running
       * render job keeps the terminal open and a hangup does nothing at all.
       * Signal the process GROUP explicitly, then insist.
       *
       * A `setsid`'d grandchild survives everything we can send. Group-kill is
       * the ceiling and this comment is the whole mitigation.
       */
      function killSession(s: PtySession) {
        sessions.delete(s.id)
        if (s.reapAt) { clearTimeout(s.reapAt); s.reapAt = null }
        try { process.kill(-s.proc.pid, 'SIGHUP') } catch { /* gone */ }
        const hard = setTimeout(() => {
          try { process.kill(-s.proc.pid, 'SIGKILL') } catch { /* gone */ }
        }, 3000)
        // Unref'd: a pending kill timer must not hold the process open.
        hard.unref?.()
      }

      const sweep = () => { for (const s of [...sessions.values()]) killSession(s) }
      // `close` alone is not enough: the dev server must not be able to exit
      // leaving a `claude --permission-mode acceptEdits` alive on the repo.
      server.httpServer?.on('close', sweep)
      process.once('exit', sweep)
      for (const sig of ['SIGINT', 'SIGTERM'] as const) {
        process.once(sig, () => { sweep(); process.exit(0) })
      }
    },
  }
}

/**
 * The environment the embedded `claude` gets — and the three variables it must
 * NOT inherit.
 *
 * The dev server is very often started from inside a Claude Code session, and
 * that session marks its environment: `CLAUDE_CODE_CHILD_SESSION=1`, plus a
 * session id and an entrypoint. A `claude` that sees the marker concludes it
 * is a nested child and switches transcript saving OFF — which is right for a
 * subagent and wrong for this, where it is the user's own terminal. The
 * symptom is the banner line:
 *
 *   ⚠ Transcript saving is off — inherited CLAUDE_CODE_CHILD_SESSION marker
 *
 * and the cost is that the panel's conversations are never written, so they
 * cannot be resumed, searched or found by /resume afterwards.
 *
 * Stripping the marker rather than setting FORCE_SESSION_PERSISTENCE, because
 * the marker is simply not true here: this pty is a top-level session that
 * happens to have been launched by a process that was itself a child.
 */
function ptyEnv(): Record<string, string> {
  const env: Record<string, string> = {}
  for (const [k, v] of Object.entries(process.env)) {
    if (v === undefined) continue
    if (k === 'CLAUDE_CODE_CHILD_SESSION') continue
    if (k === 'CLAUDE_CODE_SESSION_ID') continue
    if (k === 'CLAUDE_CODE_BRIDGE_SESSION_ID') continue
    env[k] = v
  }
  env.TERM = 'xterm-256color'
  // So a scene file, a hook or the agent itself can tell it is in the studio.
  env.FLOW_STUDIO = '1'
  return env
}

function clampInt(v: string | null, lo: number, hi: number, dflt: number): number {
  const n = v == null ? NaN : parseInt(v, 10)
  return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : dflt
}

function studioAgent(): Plugin {

  return {
    name: 'studio-agent',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__studio/agent', (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; res.end('POST only'); return }
        if (!guardStudioWrite(req, res)) return
        let body = ''
        req.on('data', (c: Buffer) => { body += c })
        req.on('end', () => {
          let parsed: { prompt?: unknown; sessionId?: unknown; resume?: unknown; context?: unknown }
          try { parsed = JSON.parse(body) as typeof parsed } catch {
            res.statusCode = 400; res.end('bad json'); return
          }
          const prompt = String(parsed.prompt ?? '').trim()
          if (!prompt) { res.statusCode = 400; res.end('empty prompt'); return }
          const sessionId = String(parsed.sessionId ?? '')
          if (!/^[0-9a-f-]{36}$/i.test(sessionId)) { res.statusCode = 400; res.end('sessionId must be a uuid'); return }

          const args = [
            '--print',
            // Not 'claude-opus-5' — `--model` documents fable/opus/sonnet or a
            // full model name, and an undocumented alias fails at start.
            '--model', 'opus',
            // One of six valid modes, and NOT the default. Chosen so the
            // agent can actually change the film rather than describe how.
            '--permission-mode', 'acceptEdits',
            '--append-system-prompt', STUDIO_SYSTEM
              + (typeof parsed.context === 'string' && parsed.context
                ? ` The editor is currently showing scene ${parsed.context}.`
                : ''),
            ...(parsed.resume === true ? ['--resume', sessionId] : ['--session-id', sessionId]),
            prompt,
          ]

          res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-cache' })
          const child = spawn('claude', args, {
            cwd: server.config.root,
            env: process.env,
            detached: true,
            // stdin CLOSED, not inherited. `claude --print` waits three
            // seconds for piped input before giving up ("no stdin data
            // received in 3s"), and that warning was landing in the console
            // ahead of every single answer.
            stdio: ['ignore', 'pipe', 'pipe'],
          })
          child.stdout.on('data', (d: Buffer) => res.write(d))
          child.stderr.on('data', (d: Buffer) => res.write(d))
          child.on('close', code => res.end(code === 0 ? '' : `\n[claude exited ${code}]\n`))
          child.on('error', err => res.end(
            `\n[cannot run claude: ${err.message}]\n`
            + '[the agent needs the Claude Code CLI on PATH]\n'))
          // Unlike a render, this one SHOULD die with the request: it is a
          // conversation turn, and an abandoned one has no output to keep.
          res.on('close', () => {
            if (!res.writableEnded && child.pid) {
              try { process.kill(-child.pid, 'SIGTERM') } catch { /* gone */ }
            }
          })
        })
      })
    },
  }
}

/**
 * Dev-only studio write endpoint (SPEC §12.5 #2): the ONLY sanctioned
 * path for the browser to persist timeline edits. POST
 * /__studio/apply-timeline {filmId, items:[{key,from,duration,props?}]}
 * rewrites the matching const's array body in the timeline source with
 * regex-safe one-line literals (comments regenerated from scene keys).
 * The master timeline is excluded — its hand-written beat comments are
 * source-of-truth documentation; use the Inspector's copy flow there.
 */
function studioApply(): Plugin {
  const TARGETS: Record<string, { file: string; constName: string }> = {
    story: { file: 'src/studio/story/timeline.ts', constName: 'STORY_TIMELINE' },
    'story-anime': { file: 'src/studio/story/timeline.ts', constName: 'STORY_ANIME_TIMELINE' },
  }
  return {
    name: 'studio-apply-timeline',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__studio/apply-timeline', (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; res.end('POST only'); return }
        if (!guardStudioWrite(req, res)) return
        let body = ''
        req.on('data', (c: Buffer) => { body += c })
        req.on('end', () => {
          try {
            const { filmId, items } = JSON.parse(body) as {
              filmId: string
              items: { key: string; from: number; duration: number; offsetSec?: number; props?: Record<string, unknown> }[]
            }
            const target = TARGETS[filmId]
            if (!target) { res.statusCode = 400; res.end(`film '${filmId}' is not writable (master keeps its hand-written comments — use copy/paste)`); return }
            if (!Array.isArray(items) || items.length === 0) { res.statusCode = 400; res.end('empty items'); return }
            const file = path.resolve(server.config.root, target.file)
            const src = readFileSync(file, 'utf8')
            const re = new RegExp(`(const ${target.constName}[^=]*=\\s*\\[)[\\s\\S]*?(\\n\\])`)
            if (!re.test(src)) { res.statusCode = 500; res.end(`cannot locate ${target.constName}`); return }
            // Regenerate trailing comments from manifest titles so the
            // applied file stays human-readable.
            const manifest = readFileSync(path.resolve(server.config.root, 'src/scenes/manifest.ts'), 'utf8')
            const titles = new Map<string, string>()
            for (const m of manifest.matchAll(/\{ key: '([^']+)',.*?title: '([^']+)'/g)) titles.set(m[1], m[2])
            const bare = items.map(it => {
              const offset = it.offsetSec ? `, offsetSec: ${it.offsetSec}` : ''
              const props = it.props
                ? `, props: ${JSON.stringify(it.props).replace(/"([^"]+)":/g, '$1: ').replace(/"/g, "'")}`
                : ''
              return `  { key: '${it.key}', from: ${it.from}, duration: ${it.duration}${offset}${props} },`
            })
            const pad = Math.max(...bare.map(l => l.length)) + 1
            const lines = bare.map((l, i) => {
              const title = titles.get(items[i].key)
              return title ? `${l.padEnd(pad)}// ${title}` : l
            }).join('\n')
            writeFileSync(file, src.replace(re, `$1\n${lines}$2`))
            res.setHeader('content-type', 'application/json')
            res.end(JSON.stringify({ ok: true, file: target.file, count: items.length }))
          } catch (e) {
            res.statusCode = 500
            res.end(String(e))
          }
        })
      })
    },
  }
}

/**
 * Shot refs (see src/studio/shotref.ts — the client half and the why).
 * POST /__studio/shotref {basename, png?: dataURL, meta} writes
 * out/shotrefs/<basename>.png + <basename>.json and answers with their
 * ABSOLUTE paths — absolute because the whole point of the token is being
 * pasted to a model whose working directory is not guaranteed.
 */
function studioShotref(): Plugin {
  return {
    name: 'studio-shotref',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__studio/shotref', (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; res.end('POST only'); return }
        if (!guardStudioWrite(req, res)) return
        let body = ''
        let size = 0
        req.on('data', (c: Buffer) => {
          size += c.length
          // A 1080p PNG as base64 is single-digit MB; 64MB means a bug.
          if (size > 64 * 1024 * 1024) { res.statusCode = 413; res.end('too large'); req.destroy(); return }
          body += c
        })
        req.on('end', () => {
          try {
            const { basename, png, meta } = JSON.parse(body) as {
              basename: string
              png?: string | null
              meta: Record<string, unknown>
            }
            // The basename is client-authored — keep it to one path segment.
            if (!/^[\w.@-]+$/.test(basename)) { res.statusCode = 400; res.end('bad basename'); return }
            const dir = path.resolve(server.config.root, 'out/shotrefs')
            mkdirSync(dir, { recursive: true })
            let pngPath: string | null = null
            if (png) {
              const b64 = png.replace(/^data:image\/png;base64,/, '')
              pngPath = path.join(dir, `${basename}.png`)
              writeFileSync(pngPath, Buffer.from(b64, 'base64'))
            }
            const jsonPath = path.join(dir, `${basename}.json`)
            writeFileSync(jsonPath, JSON.stringify({ ...meta, png: pngPath }, null, 2))
            res.setHeader('content-type', 'application/json')
            res.end(JSON.stringify({ ok: true, png: pngPath, json: jsonPath }))
          } catch (e) {
            res.statusCode = 500
            res.end(String(e))
          }
        })
      })
    },
  }
}

/* ── Render jobs (R1 / R3) ────────────────────────────────────────────────
 *
 * A render used to be a `/__studio/exec` call, which meant it died with the
 * request: `res.on('close')` SIGTERMs the process group, so reloading the
 * studio tab silently killed a render that had been going for ten minutes,
 * and there was nothing to reattach to. There was also no limit — every POST
 * spawned another one, and per CLAUDE.md two renders contending for the GPU
 * can turn a 14-second segment from four minutes into over two hours.
 *
 * So renders are JOBS: owned by the dev server, outliving any tab, with a
 * queue in front of them and a log you can rejoin from a byte offset.
 *
 * The browser NEVER sends a command. It sends a request — "the whole film",
 * "this clip", "this range" — and the server builds the argv. That is the
 * difference between a render button and a second shell endpoint: the
 * guardrails (which GL backend, how many shards, which timeline belongs to
 * which film) are decided here, where they can be validated, rather than
 * being whatever the page felt like sending.
 */

type JobStatus = 'queued' | 'running' | 'done' | 'failed' | 'killed'

type Job = {
  id: string
  label: string
  /** argv as spawned, for the log header and for "what did that actually run". */
  argv: string[]
  /** Repo-relative file this job should produce, if it produces one. */
  out: string | null
  status: JobStatus
  createdAt: number
  startedAt: number | null
  endedAt: number | null
  exitCode: number | null
  /** Rolling tail of combined stdout+stderr. */
  log: string
  /** Bytes dropped off the front of `log`, so `?from=` stays absolute. */
  dropped: number
  pid: number | null
}

/** Renders are GPU-bound and contend badly; one at a time, the rest queue. */
const MAX_RUNNING = Number(process.env.STUDIO_MAX_RENDERS ?? 1)

/** Tail kept per job. Remotion is chatty; this is minutes of progress lines. */
const LOG_CAP = 512 * 1024

const jobs = new Map<string, Job>()
const children = new Map<string, ReturnType<typeof spawn>>()
let jobSeq = 0

function jobView(j: Job) {
  const { log: _log, ...rest } = j
  return { ...rest, logBytes: j.dropped + j.log.length }
}

function appendLog(j: Job, chunk: string) {
  j.log += chunk
  if (j.log.length > LOG_CAP) {
    const cut = j.log.length - LOG_CAP
    j.dropped += cut
    j.log = j.log.slice(cut)
  }
}

function pumpJobs(root: string) {
  if ([...jobs.values()].filter(j => j.status === 'running').length >= MAX_RUNNING) return
  const next = [...jobs.values()].find(j => j.status === 'queued')
  if (!next) return

  next.status = 'running'
  next.startedAt = Date.now()
  appendLog(next, `$ ${next.argv.join(' ')}\n`)
  // detached → its own process group, so killing it takes the whole render
  // tree (npx → remotion → chrome) and not just the shim on top.
  const child = spawn(next.argv[0], next.argv.slice(1), {
    cwd: root, env: process.env, detached: true,
  })
  next.pid = child.pid ?? null
  children.set(next.id, child)
  child.stdout?.on('data', (d: Buffer) => appendLog(next, d.toString()))
  child.stderr?.on('data', (d: Buffer) => appendLog(next, d.toString()))
  child.on('error', (err) => {
    appendLog(next, `\n[spawn error: ${err.message}]\n`)
    next.status = 'failed'
    next.endedAt = Date.now()
    children.delete(next.id)
    pumpJobs(root)
  })
  child.on('close', (code, signal) => {
    next.exitCode = code
    next.endedAt = Date.now()
    // A killed job exits on a signal with a null code; that is not a failure
    // to report as one — the user asked for it.
    next.status = next.status === 'killed' || signal ? 'killed' : code === 0 ? 'done' : 'failed'
    appendLog(next, `\n[${next.status}${code == null ? ` on ${signal}` : ` ${code}`}]\n`)
    children.delete(next.id)
    pumpJobs(root)
  })
}

/**
 * Turn a render REQUEST into argv. The whole reason the browser does not get
 * to send a command line.
 *
 * `render:act` is deliberately not used for a clip: a per-scene composition's
 * length is the manifest's `durationSec`, and six of the master's slots are
 * LONGER than their scene (4.3/4.4/4.6/4.7/4.9 are 1.7s slots over 1s
 * compositions, 4.10 is 2.5s over 1.8s). `render-act 4.3 --frames 0-50`
 * fails outright. render-fast renders the slot's frames out of the film
 * composition, so it honours slot duration by construction — and it caches.
 */
type RenderRequest = {
  kind?: unknown
  filmId?: unknown
  key?: unknown
  from?: unknown
  to?: unknown
  quality?: unknown
  force?: unknown
  gl?: unknown
  shards?: unknown
  concurrency?: unknown
  proxy?: unknown
}

/**
 * The proxy tier, in one place.
 *
 * These three strings have to agree across two endpoints and a script:
 * buildRenderJob passes them to render-fast, render-fast composes the tier tag
 * from them, and studioMedia looks the finished file up by name. They were
 * three separate literals and the merge changed what `--fps` MEANS, which is
 * exactly the kind of change that leaves such a set half-updated.
 */
const PROXY_FPS = 12
const PROXY_SIZE = '384x216'
/** What render-fast writes for a proxy job of `comp` — its tier tag rule. */
const proxyFile = (comp: string) => `out/renders/${comp}.proxy.${PROXY_SIZE}@${PROXY_FPS}fps.mp4`

function buildRenderJob(req: RenderRequest): { label: string; argv: string[]; out: string } | { error: string } {
  const films = listFilms()
  const film = films.find(f => f.id === req.filmId)
  if (!film) return { error: `unknown film '${String(req.filmId)}'` }

  const kind = String(req.kind ?? '')
  if (!['film', 'range', 'clip'].includes(kind)) return { error: `unknown render kind '${kind}'` }

  // 720p is the working tier and the default; 1080 is the delivery tier.
  const comp = req.quality === 'full' ? film.composition : `${film.composition}720`

  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null)
  const from = num(req.from)
  const to = num(req.to)

  const argv = ['node', 'scripts/render-fast.mjs', '--comp', comp]
  if (film.sourcePath !== 'src/remotion/timeline.ts') {
    argv.push('--timeline', film.sourcePath)
  }
  if (film.timelineConst) argv.push('--const', film.timelineConst)
  argv.push('--audio', film.audio ?? 'none')
  // Part of the segment cache key, not of the render — see render-fast's
  // --aspect. Reusing a 16:9 segment inside a 9:16 film stitches cleanly
  // (stream copy never checks dimensions) and plays wrong.
  if (film.aspect) argv.push('--aspect', film.aspect)

  // Clamped, not trusted. shards × concurrency is the real worker count and
  // over-subscribing it is the documented way to turn four minutes into two
  // hours — see CLAUDE.md.
  const clamp = (v: unknown, lo: number, hi: number, dflt: number) => {
    const n = num(v)
    return n == null ? dflt : Math.max(lo, Math.min(hi, Math.round(n)))
  }
  argv.push('--shards', String(clamp(req.shards, 1, 8, 4)))
  argv.push('--concurrency', String(clamp(req.concurrency, 1, 8, 3)))
  if (typeof req.gl === 'string' && /^[a-z-]+$/.test(req.gl)) argv.push('--gl', req.gl)
  if (req.force === true) argv.push('--force')

  /*
   * The proxy tier: a small file the preview tab can SCRUB.
   *
   * `--fps 12` used to be a transcode of a finished 30fps master. After the
   * merge it is a RENDER rate — the composition is genuinely re-timed — which
   * is strictly better here (2.5× fewer frames of the same film) but changes
   * what this flag pair costs if it is pointed at the wrong file. Sending it
   * with the default `out` would have written a 12fps render straight over
   * `out/renders/FullVideo.mp4`, the 1080p DELIVERY master, and the studio
   * would then have reported it as "master" in the preview tab.
   *
   * So a proxy render never touches the canonical path. It writes its own
   * stem, and render-fast hangs the tier tag off that — `<comp>.proxy.mp4`
   * plus `<comp>.proxy.384x216@12fps.mp4`, which is the name studioMedia
   * looks for.
   */
  const proxy = req.proxy === true
  if (proxy) argv.push('--fps', String(PROXY_FPS), '--size', PROXY_SIZE)

  let label = `${film.name} — whole film`
  let out = `out/renders/${comp}${proxy ? '.proxy' : ''}.mp4`

  if (kind !== 'film') {
    if (from == null || to == null || to <= from) return { error: 'range needs numeric from < to' }
    // render-fast requires segment-boundary alignment and says so loudly; the
    // studio only ever sends clip boundaries, so a failure here is a bug
    // worth seeing rather than something to round away silently.
    argv.push('--range', `${from}:${to}`)
    // `.proxy` here too: a 12fps chunk sitting at the 30fps chunk's name is
    // the same lie in miniature, and `review.mjs` serves this directory.
    out = `out/renders/${comp}_${from}-${to}${proxy ? '.proxy' : ''}.mp4`
    label = kind === 'clip'
      ? `${film.name} — clip ${String(req.key ?? '')} (${from}–${to}s)`
      : `${film.name} — ${from}–${to}s`
    if (kind === 'clip' && typeof req.key === 'string') argv.push('--only', req.key)
  }

  argv.push('--out', out)
  return { label, argv, out }
}

function studioJobs(): Plugin {
  return {
    name: 'studio-jobs',
    apply: 'serve',
    configureServer(server) {
      const root = server.config.root

      server.middlewares.use('/__studio/jobs', (req, res) => {
        const isPost = req.method === 'POST'
        if (!guardStudio(req, res, { requireJson: isPost })) return

        const url = new URL(req.url ?? '/', 'http://x')
        const parts = url.pathname.split('/').filter(Boolean)
        const json = (body: unknown, code = 200) => {
          res.statusCode = code
          res.setHeader('content-type', 'application/json')
          res.end(JSON.stringify(body))
        }

        // GET / — every job, no logs. This is what a reloaded tab calls to
        // find the render it left running.
        if (!isPost && parts.length === 0) {
          json({ jobs: [...jobs.values()].map(jobView), maxRunning: MAX_RUNNING })
          return
        }

        // GET /<id>?from=N — the job plus the log from an absolute offset.
        if (!isPost && parts.length === 1) {
          const j = jobs.get(parts[0])
          if (!j) { json({ error: 'no such job' }, 404); return }
          const from = Math.max(0, parseInt(url.searchParams.get('from') ?? '0', 10) || 0)
          const start = Math.max(0, from - j.dropped)
          json({
            job: jobView(j),
            // `from` echoed back as what the caller ACTUALLY got, which is
            // not what it asked for when the tail has rolled past it.
            from: j.dropped + start,
            log: j.log.slice(start),
          })
          return
        }

        if (!isPost) { json({ error: 'not found' }, 404); return }

        let body = ''
        req.on('data', (c: Buffer) => { body += c })
        req.on('end', () => {
          let parsed: Record<string, unknown>
          try { parsed = JSON.parse(body || '{}') as Record<string, unknown> } catch {
            json({ error: 'bad json' }, 400); return
          }

          // POST /<id>/kill
          if (parts.length === 2 && parts[1] === 'kill') {
            const j = jobs.get(parts[0])
            if (!j) { json({ error: 'no such job' }, 404); return }
            if (j.status === 'queued') {
              j.status = 'killed'
              j.endedAt = Date.now()
              json({ job: jobView(j) })
              return
            }
            const child = children.get(j.id)
            if (child?.pid) {
              j.status = 'killed'
              try { process.kill(-child.pid, 'SIGTERM') } catch { /* already gone */ }
            }
            json({ job: jobView(j) })
            return
          }

          // POST / — enqueue a render.
          if (parts.length !== 0) { json({ error: 'not found' }, 404); return }
          const built = buildRenderJob(parsed as RenderRequest)
          if ('error' in built) { json({ error: built.error }, 400); return }

          const job: Job = {
            id: `r${++jobSeq}-${Date.now().toString(36)}`,
            label: built.label,
            argv: built.argv,
            out: built.out,
            status: 'queued',
            createdAt: Date.now(),
            startedAt: null,
            endedAt: null,
            exitCode: null,
            log: '',
            dropped: 0,
            pid: null,
          }
          jobs.set(job.id, job)
          pumpJobs(root)
          json({ job: jobView(job) })
        })
      })
    },
  }
}

/**
 * What has actually been RENDERED (R2). GET /__studio/segments?comp=…
 *
 * The preview tab has to answer "is what I am about to watch current", and
 * the answer is already encoded in the filenames: `render-fast` names each
 * cached segment `<key>@<from>+<duration>.mp4`, so a retimed slot misses by
 * construction. Staleness is therefore free — no timestamps, no hashing,
 * just set membership against the timeline the studio currently holds.
 *
 * Read-only, and it lists only names and sizes under `out/renders`.
 */
function studioSegments(): Plugin {
  const stat = (root: string, rel: string) => {
    const abs = path.resolve(root, rel)
    if (!existsSync(abs)) return null
    const s = statSync(abs)
    return { file: rel, bytes: s.size, mtime: s.mtimeMs }
  }
  return {
    name: 'studio-segments',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__studio/segments', (req, res) => {
        if (!guardStudio(req, res, { requireJson: false })) return
        const url = new URL(req.url ?? '/', 'http://x')
        const comp = (url.searchParams.get('comp') ?? '').replace(/[^\w@.+-]/g, '')
        const root = server.config.root
        const segDir = path.resolve(root, 'out/renders/segments', comp)
        const segments = existsSync(segDir)
          ? readdirSync(segDir).filter(f => f.endsWith('.mp4'))
          : []
        // The stitched master, and the proxy tier beside it if one exists.
        // The proxy has its own stem so that rendering one can never overwrite
        // the delivery master — see PROXY_FPS.
        const master = stat(root, `out/renders/${comp}.mp4`)
        const proxy = stat(root, proxyFile(comp))
        res.setHeader('content-type', 'application/json')
        res.end(JSON.stringify({ comp, segments, master, proxy }))
      })
    },
  }
}

/**
 * Dev-only media listing for the studio's soundtrack/lyrics pickers:
 * GET /__studio/media → { audio: [...], lyrics: [...] }, paths relative to
 * public/ so they double as staticFile() paths for the render side.
 *
 * Read-only and scoped to two directories under public/ — it lists what is
 * already publicly served, so it exposes nothing new.
 */
function studioMedia(): Plugin {
  const KINDS: Record<string, RegExp> = {
    audio: /\.(mp3|wav|m4a|ogg|flac)$/i,
    lyrics: /\.(lrc|srt|vtt)$/i,
  }
  return {
    name: 'studio-media',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__studio/media', (_req, res) => {
        const out: Record<string, string[]> = {}
        for (const [kind, pattern] of Object.entries(KINDS)) {
          const dir = path.resolve(server.config.root, 'public', kind)
          out[kind] = existsSync(dir)
            ? readdirSync(dir).filter(f => pattern.test(f)).sort().map(f => `${kind}/${f}`)
            : []
        }
        res.setHeader('content-type', 'application/json')
        res.end(JSON.stringify(out))
      })
    },
  }
}

/**
 * studioLive — starts and reports on the live AI render server
 * (scripts/live-render/server.py, features_1.md §7). The browser cannot
 * spawn a process; the ✦ live toggle asks here, and polls the WebSocket
 * itself. GET → { running, log } (a TCP probe of the port plus the log
 * tail, so the chip can say "loading model…"); POST {action:'start'} →
 * spawns it detached, once. The venv is scripts/live-render/setup.sh's job.
 */
function studioLive(): Plugin {
  const LIVE_PORT = 8765
  let child: ReturnType<typeof spawn> | null = null
  const probe = () => new Promise<boolean>(resolve => {
    import('node:net').then(net => {
      const s = net.createConnection({ port: LIVE_PORT, host: '127.0.0.1' })
      s.once('connect', () => { s.destroy(); resolve(true) })
      s.once('error', () => resolve(false))
      s.setTimeout(500, () => { s.destroy(); resolve(false) })
    })
  })
  return {
    name: 'studio-live',
    configureServer(server) {
      const root = server.config.root
      const logPath = path.resolve(root, 'out/live/server.log')
      const tail = () => {
        try { return readFileSync(logPath, 'utf8').split('\n').filter(Boolean).slice(-6).join('\n') } catch { return '' }
      }
      server.middlewares.use('/__studio/live', (req, res) => {
        const isPost = req.method === 'POST'
        if (!guardStudio(req, res, { requireJson: isPost })) return
        const json = (body: unknown, code = 200) => {
          res.statusCode = code
          res.setHeader('content-type', 'application/json')
          res.end(JSON.stringify(body))
        }
        if (!isPost) {
          void probe().then(running => json({ running, port: LIVE_PORT, log: tail() }))
          return
        }
        let body = ''
        req.on('data', (c: Buffer) => { body += c })
        req.on('end', () => {
          let parsed: { action?: string; model?: string } = {}
          try { parsed = JSON.parse(body) as typeof parsed } catch { json({ error: 'bad json' }, 400); return }
          if (parsed.action !== 'start') { json({ error: 'unknown action' }, 400); return }
          const py = path.resolve(root, '.venv-live/bin/python')
          if (!existsSync(py)) {
            json({ error: 'no live-render venv — run: bash scripts/live-render/setup.sh' })
            return
          }
          void probe().then(running => {
            if (running || (child && child.exitCode === null)) { json({ started: false, running: true, log: tail() }); return }
            mkdirSync(path.dirname(logPath), { recursive: true })
            const model = parsed.model === 'sdxl-turbo' ? 'sdxl-turbo' : 'sd-turbo'
            const fd = openSync(logPath, 'a')
            child = spawn(py, ['-u', path.resolve(root, 'scripts/live-render/server.py'), '--model', model, '--port', String(LIVE_PORT)], {
              cwd: root, env: process.env, detached: true, stdio: ['ignore', fd, fd],
            })
            child.unref()
            server.config.logger.info(`studio/live: started ${model} server (pid ${child.pid}) → ${logPath}`)
            json({ started: true, pid: child.pid, model })
          })
        })
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), studioAuth(), studioApply(), studioExec(), studioAgent(), studioJobs(), studioSegments(), studioMedia(), studioPty(), studioShotref(), studioLive()],
})
