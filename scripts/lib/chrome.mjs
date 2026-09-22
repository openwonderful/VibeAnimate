/**
 * chrome.mjs — shared headless-Chrome-over-CDP core for scripts/*.mjs.
 *
 * Launches system Chrome (--headless=new, SwiftShader WebGL), connects over
 * raw CDP via the `ws` package (transitive dep — no puppeteer), and exposes
 * a tiny session API. Callers must always `await session.close()` (use
 * try/finally).
 */
import { spawn } from 'child_process'
import http from 'http'
import { createRequire } from 'module'
import { existsSync, mkdtempSync, rmSync } from 'fs'
import path from 'path'
import os from 'os'

/** First usable Chrome/Chromium binary: $CHROME_BIN, then known locations. */
export function resolveChromeBin() {
  const candidates = [
    process.env.CHROME_BIN,
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    path.join(os.homedir(), '.cache/ms-playwright/chromium-1228/chrome-linux64/chrome'),
  ].filter(Boolean)
  for (const c of candidates) if (existsSync(c)) return c
  throw new Error(
    `no Chrome binary found (tried ${candidates.join(', ')}) — set $CHROME_BIN`)
}

const require = createRequire(import.meta.url)
const WebSocket = require('ws')

export const sleep = ms => new Promise(r => setTimeout(r, ms))

export function httpGet(url, timeoutMs = 4000) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, res => {
      res.resume()
      resolve(res.statusCode)
    })
    req.on('error', reject)
    req.setTimeout(timeoutMs, () => req.destroy(new Error('timeout')))
  })
}

/** Throws with a helpful message if the dev server isn't answering. */
export async function assertServerUp(targetUrl, port) {
  let probe
  try {
    const u = new URL(targetUrl)
    probe = `${u.protocol}//${u.host}/`
  } catch {
    throw new Error(`invalid URL: ${targetUrl}`)
  }
  try {
    await httpGet(probe)
  } catch {
    throw new Error(
      `dev server not running on port ${port} — start with: npm run dev\n(probed ${probe})`)
  }
}

function describeRemoteArg(a) {
  if (a.value !== undefined) {
    return typeof a.value === 'object' ? JSON.stringify(a.value) : String(a.value)
  }
  return a.description || a.unserializableValue || `[${a.type}]`
}

/**
 * WebGL backend flags. On a box with a render node (/dev/dri/renderD128),
 * ANGLE-over-Vulkan runs on the real GPU — heavy 3D scenes present their
 * first frame in a second instead of the 20–30s SwiftShader takes (and
 * `--use-angle=gl`/`--use-gl=egl` fail to create a context at all in
 * headless Chrome here, so Vulkan is the one hardware path that works).
 * Set $CHROME_GL=swiftshader to force the software fallback.
 */
export function glFlags() {
  const mode = process.env.CHROME_GL ||
    (existsSync('/dev/dri/renderD128') ? 'vulkan' : 'swiftshader')
  if (mode === 'vulkan') {
    return [
      '--use-angle=vulkan',
      '--use-vulkan=native',
      '--enable-gpu',
      '--ignore-gpu-blocklist',
      '--enable-webgl',
    ]
  }
  return ['--enable-unsafe-swiftshader', '--enable-webgl', `--use-angle=${mode}`]
}

/**
 * Launch Chrome at `url` and return a CDP session:
 *   { cdp, evaluate, waitForCanvas, screenshot, consoleMsgs, errorMsgs, close }
 */
export async function launchChrome({ url, width = 1280, height = 720, dpr = 1, echoConsole = false }) {
  const debugPort = 9222 + Math.floor(Math.random() * (9999 - 9222 + 1))
  const profileDir = mkdtempSync(path.join(os.tmpdir(), 'shot-chrome-'))

  const chrome = spawn(resolveChromeBin(), [
    '--headless=new',
    `--remote-debugging-port=${debugPort}`,
    ...glFlags(),
    '--disable-dev-shm-usage',
    '--no-sandbox',
    '--hide-scrollbars',
    `--user-data-dir=${profileDir}`,
    `--force-device-scale-factor=${dpr}`,
    `--window-size=${width},${height}`,
    url,
  ], { stdio: 'pipe' })

  let chromeExited = false
  chrome.on('exit', () => { chromeExited = true })

  let ws = null
  const close = async () => {
    try { ws?.close() } catch { /* ignore */ }
    try { chrome.kill('SIGTERM') } catch { /* ignore */ }
    await sleep(300)
    try { rmSync(profileDir, { recursive: true, force: true }) } catch { /* ignore */ }
  }

  try {
    // Find the page tab (debug port needs a moment to come up)
    let tab = null
    for (let i = 0; i < 30 && !tab; i++) {
      if (chromeExited) throw new Error('chrome exited before the debug port came up')
      try {
        const data = await new Promise((resolve, reject) => {
          http.get(`http://localhost:${debugPort}/json`, r => {
            let d = ''; r.on('data', c => d += c); r.on('end', () => resolve(d))
          }).on('error', reject)
        })
        const tabs = JSON.parse(data)
        tab = tabs.find(t => t.type === 'page' && t.webSocketDebuggerUrl) || null
      } catch { /* not up yet */ }
      if (!tab) await sleep(1000)
    }
    if (!tab) throw new Error(`could not connect to Chrome debug port ${debugPort}`)

    ws = new WebSocket(tab.webSocketDebuggerUrl)
    await new Promise((resolve, reject) => {
      ws.on('open', resolve)
      ws.on('error', reject)
    })

    let msgId = 0
    function cdp(method, params = {}, timeout = 30000) {
      return new Promise((resolve, reject) => {
        const id = ++msgId
        const timer = setTimeout(() => reject(new Error(`CDP timeout: ${method}`)), timeout)
        const handler = m => {
          let msg
          try { msg = JSON.parse(m.toString()) } catch { return }
          if (msg.id === id) {
            ws.removeListener('message', handler)
            clearTimeout(timer)
            if (msg.error) reject(new Error(`CDP ${method}: ${msg.error.message}`))
            else resolve(msg.result)
          }
        }
        ws.on('message', handler)
        ws.send(JSON.stringify({ id, method, params }))
      })
    }

    const consoleMsgs = []   // { level, text }
    const errorMsgs = []     // errors + exceptions, for end-of-run reporting
    ws.on('message', m => {
      let msg
      try { msg = JSON.parse(m.toString()) } catch { return }
      if (msg.method === 'Runtime.consoleAPICalled') {
        const level = msg.params.type
        const text = (msg.params.args || []).map(describeRemoteArg).join(' ')
        consoleMsgs.push({ level, text })
        if (echoConsole) console.log(`[console.${level}] ${text}`)
        if (level === 'error' || level === 'assert') errorMsgs.push(`console.${level}: ${text}`)
      } else if (msg.method === 'Runtime.exceptionThrown') {
        const d = msg.params.exceptionDetails
        const text = d.exception?.description || d.exception?.value || d.text || 'unknown exception'
        errorMsgs.push(`exception: ${text}`)
        if (echoConsole) console.log(`[exception] ${text}`)
      }
    })

    await cdp('Runtime.enable')
    await cdp('Page.enable')

    return {
      cdp,
      consoleMsgs,
      errorMsgs,
      close,

      /** Evaluate an expression in the page; returns { value } or throws on JS exception. */
      async evaluate(expression) {
        const r = await cdp('Runtime.evaluate', {
          expression, returnByValue: true, awaitPromise: true,
        })
        if (r?.exceptionDetails) {
          const d = r.exceptionDetails
          throw new Error(d.exception?.description || d.text || 'evaluate failed')
        }
        return r?.result?.value
      },

      /** Poll for a <canvas> up to `seconds`; returns true if one appeared.
       *  SVG-only scenes never grow a canvas — once an <svg> is present and
       *  a few polls have passed, stop waiting instead of burning 30s. */
      async waitForCanvas(seconds = 30) {
        for (let i = 0; i < seconds; i++) {
          const r = await cdp('Runtime.evaluate', {
            expression: `document.querySelector('canvas') ? 'canvas' : (document.querySelector('svg') ? 'svg' : 'none')`,
            returnByValue: true,
          })
          if (r?.result?.value === 'canvas') return true
          if (r?.result?.value === 'svg' && i >= 4) return false
          await sleep(1000)
        }
        return false
      },

      /** PNG screenshot as a Buffer, retrying suspiciously blank frames.
       *  SwiftShader can take 10s+ to present the first real frame of a heavy
       *  3D scene; near-black PNGs compress to a few KB, so retry small
       *  buffers (some scenes are legitimately dark — keep the last attempt).
       */
      async screenshot({ blankRetries = 3 } = {}) {
        let buf
        for (let attempt = 0; ; attempt++) {
          const ss = await cdp('Page.captureScreenshot', { format: 'png' }, 30000)
          if (!ss?.data) throw new Error('Page.captureScreenshot returned no data')
          buf = Buffer.from(ss.data, 'base64')
          if (buf.length >= 25000 || attempt >= blankRetries) break
          console.error(`chrome.mjs: frame looks blank (${buf.length}B) — waiting 3s and retrying`)
          await sleep(3000)
        }
        return buf
      },
    }
  } catch (e) {
    await close()
    throw e
  }
}
