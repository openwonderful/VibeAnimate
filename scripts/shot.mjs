#!/usr/bin/env node
/**
 * shot.mjs — unified screenshot CLI for the code_animation dev server.
 *
 * Drives system Chrome (headless=new, SwiftShader WebGL) over raw CDP via
 * scripts/lib/chrome.mjs (`ws` package only — no puppeteer, no new deps).
 * Replaces the one-off scripts archived in scripts/archive/.
 *
 * Usage: node scripts/shot.mjs --act 3.2 --t 0,2.5,8 [options]
 * Run with --help for the full option list.
 */
import { writeFileSync, mkdirSync } from 'fs'
import { spawnSync } from 'child_process'
import path from 'path'
import { launchChrome, assertServerUp, sleep } from './lib/chrome.mjs'
import { listActKeys } from './lib/acts.mjs'

// ---------------------------------------------------------------------------
// Help
// ---------------------------------------------------------------------------
const HELP = `shot.mjs — deterministic screenshots of animation scenes

Usage:
  node scripts/shot.mjs --act 3.2 --t 0,2.5,8 [options]

Options:
  --act KEY          Scene key (?act=KEY). Or use --url.
  --url FULL_URL     Full URL to capture (overrides --act/--port and all URL
                     params — pass everything yourself).
  --list             List all scene keys registered in src/App.tsx and exit.
  --t LIST           Comma-separated timestamps in seconds, e.g. --t 0,2.5,8.
                     The first timestamp goes in the URL (?t=) so the app's
                     animation clock starts FROZEN there; the rest are applied
                     via window.__anim.seek() in the same browser session
                     (~600ms settle after each seek). Default: none (live
                     capture after --wait).
  --range A:B        Capture a frame SEQUENCE from t=A to t=B seconds (uses
                     the same freeze+seek session as --t; mutually exclusive
                     with it). Frames are named <act>_f0001.png, ...
  --fps N            Frames per second for --range (default 12).
  --mp4 PATH         After a --range capture, assemble the frames into an
                     H.264 mp4 with ffmpeg (if installed) at --fps.
  --out PATH         Output file (single shot) or directory (multiple shots).
                     Default directory: out/screenshots.
                     Auto names: <act>_t<time>.png (dots in time -> 'p',
                     e.g. t2p5). Without --t: <act>.png.
  --size WxH         Viewport size, default 1280x720.
  --dpr N            Device scale factor, default 1.
  --wait MS          Extra settle wait after the canvas appears (default 2500;
                     heavy 3D scenes may need 6000+, but the blank-frame retry
                     usually compensates).
  --speed X          Playback speed multiplier (&speed=X).
  --query k=v        Extra URL parameter (repeatable) — for scene-specific
                     controls such as the lantern lab's ?scroll=.
  --pose CSV         Fixed camera pose "x,y,z,tx,ty,tz[,fov]" — shorthand for
                     --camA P --camB P (camera pinned to one angle).
  --camA CSV         Camera start pose "x,y,z,tx,ty,tz[,fov]".
  --camB CSV         Camera end pose   "x,y,z,tx,ty,tz[,fov]".
  --t0 SEC           Camera move start time (camT0).
  --t1 SEC           Camera move end time (camT1).
  --ease MODE        Camera easing: linear | inout (camEase).
                     Any cam flag also appends camplay=1 to activate the
                     camera interpolation driver.
  --port N           Dev server port (default 5173).
  --ui               Keep the app's dev chrome (nav link, scrubber, panels)
                     visible. By default shot.mjs appends ui=0 to hide it so
                     captures contain only the scene.
  --eval JS          Run JS in the page after it settles, before capturing —
                     for screenshotting a driven state, e.g. Blender mode:
                     --eval "window.__editables.select('keeper')".
  --console          Print all page console messages (errors and exceptions
                     are always printed regardless).
  --help             Show this help.

Notes:
  Scenes driven purely by the three.js clock (not the app anim clock) won't
  scrub via seek; for those, omit --t and use --wait to let them play in
  real time before capture.
  Blank-frame guard: captures that look solid black (tiny PNG) are retried
  automatically up to 3x with 3s extra wait — SwiftShader warms up slowly on
  heavy 3D scenes.

Examples:
  node scripts/shot.mjs --list
  node scripts/shot.mjs --act 1.1
  node scripts/shot.mjs --act 3.2 --t 0,2.5,8 --out out/screenshots
  node scripts/shot.mjs --act 3.2 --t 2 --pose 0,3,7,-0.4,2.6,-1
  node scripts/shot.mjs --act 5.3 --t 2,4,6 \\
    --camA 0,2,10,0,1,0 --camB 4,3,6,0,1,0,50 --t0 1 --t1 7 --ease inout
  node scripts/shot.mjs --act 2.2 --range 0:8 --fps 6 --mp4 out/preview.mp4
`

// ---------------------------------------------------------------------------
// Argument parsing (manual, no deps)
// ---------------------------------------------------------------------------
function fail(msg) {
  console.error(`shot.mjs: ${msg}`)
  console.error('Run with --help for usage.')
  process.exit(1)
}

function parseArgs(argv) {
  const opts = {
    act: null, url: null, t: null, out: null, range: null, fps: 12, mp4: null,
    width: 1280, height: 720, dpr: 1, wait: 2500, speed: null,
    pose: null, camA: null, camB: null, t0: null, t1: null, ease: null,
    port: 5173, console: false, ui: false, list: false, query: [],
  }
  const takesValue = new Set([
    '--act', '--url', '--t', '--out', '--size', '--dpr', '--wait', '--speed', '--eval',
    '--pose', '--camA', '--camB', '--t0', '--t1', '--ease', '--port',
    '--range', '--fps', '--mp4', '--query',
  ])
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    let key = arg, val = null
    const eq = arg.indexOf('=')
    if (arg.startsWith('--') && eq > 0) {
      key = arg.slice(0, eq)
      val = arg.slice(eq + 1)
    } else if (takesValue.has(arg)) {
      val = argv[++i]
      if (val === undefined) fail(`${arg} requires a value`)
    }
    switch (key) {
      case '--help': case '-h':
        process.stdout.write(HELP)
        process.exit(0)
        break
      case '--act': opts.act = val; break
      case '--url': opts.url = val; break
      case '--list': opts.list = true; break
      case '--t': opts.t = val; break
      case '--out': opts.out = val; break
      case '--range': {
        const m = /^(-?[\d.]+):(-?[\d.]+)$/.exec(val || '')
        if (!m) fail(`--range expects A:B seconds (got "${val}")`)
        opts.range = [Number(m[1]), Number(m[2])]
        if (!opts.range.every(Number.isFinite) || opts.range[1] <= opts.range[0]) {
          fail(`--range needs finite A < B (got "${val}")`)
        }
        break
      }
      case '--fps': {
        const n = Number(val)
        if (!Number.isFinite(n) || n <= 0 || n > 60) fail(`--fps expects 0-60 (got "${val}")`)
        opts.fps = n
        break
      }
      case '--mp4': opts.mp4 = val; break
      case '--size': {
        const m = /^(\d+)x(\d+)$/i.exec(val || '')
        if (!m) fail(`--size expects WxH (got "${val}")`)
        opts.width = Number(m[1]); opts.height = Number(m[2])
        break
      }
      case '--dpr': {
        const n = Number(val)
        if (!Number.isFinite(n) || n <= 0) fail(`--dpr expects a positive number (got "${val}")`)
        opts.dpr = n
        break
      }
      case '--wait': {
        const n = Number(val)
        if (!Number.isFinite(n) || n < 0) fail(`--wait expects milliseconds (got "${val}")`)
        opts.wait = n
        break
      }
      case '--query': opts.query.push(val); break
      case '--speed': opts.speed = val; break
      case '--pose': opts.pose = val; break
      case '--camA': opts.camA = val; break
      case '--camB': opts.camB = val; break
      case '--t0': opts.t0 = val; break
      case '--t1': opts.t1 = val; break
      case '--ease':
        if (val !== 'linear' && val !== 'inout') fail(`--ease expects linear|inout (got "${val}")`)
        opts.ease = val
        break
      case '--port': {
        const n = Number(val)
        if (!Number.isInteger(n) || n <= 0) fail(`--port expects an integer (got "${val}")`)
        opts.port = n
        break
      }
      case '--eval': opts.eval = val; break
      case '--console': opts.console = true; break
      case '--ui': opts.ui = true; break
      case '--full': break // legacy no-op (full-page capture is the default)
      default:
        fail(`unknown option: ${arg}`)
    }
  }
  return opts
}

function validateCamPose(flag, csv) {
  const parts = csv.split(',')
  if (parts.length !== 6 && parts.length !== 7) {
    fail(`${flag} expects "x,y,z,tx,ty,tz[,fov]" (got ${parts.length} values)`)
  }
  if (parts.some(p => p.trim() === '' || !Number.isFinite(Number(p)))) {
    fail(`${flag} has a non-numeric value: "${csv}"`)
  }
}

const opts = parseArgs(process.argv.slice(2))

// ---------------------------------------------------------------------------
// --list: enumerate scene keys from src/App.tsx (heuristic regex parse)
// ---------------------------------------------------------------------------
if (opts.list) {
  try {
    console.log(listActKeys().join('\n'))
  } catch (e) {
    fail(e.message)
  }
  process.exit(0)
}

if (!opts.act && !opts.url) fail('either --act or --url is required')
if (opts.pose) {
  if (opts.camA || opts.camB) fail('--pose replaces --camA/--camB — use one or the other')
  validateCamPose('--pose', opts.pose)
  opts.camA = opts.pose
  opts.camB = opts.pose
}
if (opts.camA) validateCamPose('--camA', opts.camA)
if (opts.camB) validateCamPose('--camB', opts.camB)

// Timestamps
let times = []
if (opts.t !== null) {
  times = opts.t.split(',').map(s => s.trim()).filter(s => s !== '').map(s => {
    const n = Number(s)
    if (!Number.isFinite(n)) fail(`--t contains a non-numeric timestamp: "${s}"`)
    return n
  })
  if (times.length === 0) fail('--t was given but no timestamps parsed')
}

// Frame-sequence mode
const rangeMode = opts.range !== null
if (rangeMode && opts.t !== null) fail('--range and --t are mutually exclusive')
if (opts.mp4 && !rangeMode) fail('--mp4 requires --range')
if (rangeMode) {
  const [a, b] = opts.range
  const step = 1 / opts.fps
  for (let t = a; t <= b + 1e-9; t += step) times.push(+t.toFixed(4))
  console.log(`range ${a}..${b}s @ ${opts.fps}fps → ${times.length} frames`)
}

// ---------------------------------------------------------------------------
// URL construction
// ---------------------------------------------------------------------------
let targetUrl
if (opts.url) {
  targetUrl = opts.url
} else {
  const params = new URLSearchParams()
  params.set('act', opts.act)
  if (times.length > 0) params.set('t', String(times[0]))
  if (opts.speed !== null) params.set('speed', String(opts.speed))
  const hasCam = opts.camA !== null || opts.camB !== null || opts.t0 !== null
    || opts.t1 !== null || opts.ease !== null
  if (opts.camA !== null) params.set('camA', opts.camA)
  if (opts.camB !== null) params.set('camB', opts.camB)
  if (opts.t0 !== null) params.set('camT0', String(opts.t0))
  if (opts.t1 !== null) params.set('camT1', String(opts.t1))
  if (opts.ease !== null) params.set('camEase', opts.ease)
  if (hasCam) params.set('camplay', '1')
  // Scene-specific params (e.g. the lantern lab's `scroll`).
  for (const q of opts.query) {
    const eq = q.indexOf('=')
    if (eq > 0) params.set(q.slice(0, eq), q.slice(eq + 1))
  }
  if (!opts.ui) params.set('ui', '0')
  targetUrl = `http://localhost:${opts.port}/?${params.toString()}`
}

// ---------------------------------------------------------------------------
// Output paths
// ---------------------------------------------------------------------------
const fmtTime = t => `t${String(t).replace(/\./g, 'p')}`
const actKey = opts.act || 'shot'
const shotCount = Math.max(times.length, 1)

function outputPaths() {
  const frameName = (stem, i) => `${stem}_f${String(i + 1).padStart(4, '0')}.png`
  const auto = i => rangeMode
    ? frameName(actKey, i)
    : times.length > 0
      ? `${actKey}_${fmtTime(times[i])}.png`
      : `${actKey}.png`
  if (opts.out) {
    const looksLikeFile = /\.(png|jpe?g|webp)$/i.test(opts.out)
    if (looksLikeFile && shotCount === 1 && !rangeMode) return [path.resolve(opts.out)]
    if (looksLikeFile) {
      // Multiple shots but a file path given: use it as a stem.
      const dir = path.dirname(path.resolve(opts.out))
      const stem = path.basename(opts.out).replace(/\.[^.]+$/, '')
      return times.map((t, i) => path.join(dir,
        rangeMode ? frameName(stem, i) : `${stem}_${fmtTime(t)}.png`))
    }
    const dir = path.resolve(opts.out)
    return Array.from({ length: shotCount }, (_, i) => path.join(dir, auto(i)))
  }
  const dir = path.resolve('out/screenshots')
  return Array.from({ length: shotCount }, (_, i) => path.join(dir, auto(i)))
}

const outPaths = outputPaths()
for (const p of outPaths) mkdirSync(path.dirname(p), { recursive: true })

// ---------------------------------------------------------------------------
// Capture
// ---------------------------------------------------------------------------
try {
  await assertServerUp(targetUrl, opts.port)
} catch (e) {
  console.error(`shot.mjs: ${e.message}`)
  process.exit(1)
}

console.log(`URL: ${targetUrl}`)

let exitCode = 0
let session = null
try {
  session = await launchChrome({
    url: targetUrl,
    width: opts.width,
    height: opts.height,
    dpr: opts.dpr,
    echoConsole: opts.console,
  })

  const canvasFound = await session.waitForCanvas(30)
  if (!canvasFound) {
    console.error('shot.mjs: note — no <canvas> (SVG-only scene, or still loading); capturing after --wait')
  }
  await sleep(opts.wait)

  // --eval runs JS in the page after it has settled and before the first
  // capture — the way to screenshot a driven state (select an object,
  // move it, open a panel) rather than the scene's default one.
  if (opts.eval) {
    try {
      const value = await session.evaluate(opts.eval)
      if (value !== undefined) console.error(`shot.mjs: --eval → ${JSON.stringify(value)}`)
    } catch (e) {
      console.error(`shot.mjs: --eval failed — ${e.message}`)
    }
    await sleep(400)
  }

  async function capture(outPath) {
    const buf = await session.screenshot()
    writeFileSync(outPath, buf)
    console.log(outPath)
  }

  // First shot (either live, or frozen at times[0] via ?t= in the URL)
  await capture(outPaths[0])

  // Remaining timestamps via window.__anim.seek()
  for (let i = 1; i < times.length; i++) {
    const t = times[i]
    let seeked = false
    try {
      seeked = await session.evaluate(
        `window.__anim && typeof window.__anim.seek === 'function' ? (window.__anim.seek(${t}), true) : false`)
    } catch { /* fall through to warning */ }
    if (!seeked) {
      session.errorMsgs.push(`seek(${t}) failed: window.__anim.seek not available`)
      console.error(`shot.mjs: window.__anim.seek not available — capturing t=${t} without seeking`)
    }
    await sleep(rangeMode ? 400 : 600)
    await capture(outPaths[i])
  }

  // Assemble the frame sequence into an mp4 (requires ffmpeg)
  if (opts.mp4 && rangeMode) {
    const pattern = outPaths[0].replace(/_f0001\.png$/, '_f%04d.png')
    const mp4Path = path.resolve(opts.mp4)
    mkdirSync(path.dirname(mp4Path), { recursive: true })
    const r = spawnSync('ffmpeg', [
      '-y', '-framerate', String(opts.fps), '-start_number', '1', '-i', pattern,
      '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
      '-vf', 'pad=ceil(iw/2)*2:ceil(ih/2)*2', // libx264 needs even dimensions
      mp4Path,
    ], { encoding: 'utf8' })
    if (r.error?.code === 'ENOENT') {
      console.error('shot.mjs: ffmpeg not found — frames captured but no mp4 assembled')
    } else if (r.status !== 0) {
      console.error(`shot.mjs: ffmpeg failed:\n${(r.stderr || '').slice(-800)}`)
      exitCode = 1
    } else {
      console.log(mp4Path)
    }
  }
} catch (e) {
  console.error(`shot.mjs: error — ${e.message}`)
  exitCode = 1
} finally {
  await session?.close()
}

// Always surface errors/exceptions at the end
if (session && session.errorMsgs.length > 0) {
  console.error('--- page errors ---')
  for (const m of session.errorMsgs) console.error(m)
}

process.exit(exitCode)
