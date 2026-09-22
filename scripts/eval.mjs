#!/usr/bin/env node
/**
 * eval.mjs — run JavaScript inside a live scene and print the result.
 *
 * The workhorse for interrogating scenes without opening a browser:
 * query the camera pose, drive the anim clock, poke a scene's globals —
 * and optionally screenshot the result in the same session.
 *
 * Usage:
 *   node scripts/eval.mjs --act 3.2 "window.__camPose"
 *   node scripts/eval.mjs --act 3.2 "window.__anim.seek(4); window.__anim.time"
 *   node scripts/eval.mjs --act 3.2 --wait 6000 \
 *     "window.__cam.set(0,3,7, -0.4,2.6,-1)" --shot out/screenshots/probe.png
 *
 * Multiple expressions run in order (each prints its own result line).
 * Async expressions are awaited. Results print as JSON.
 */
import { writeFileSync, mkdirSync } from 'fs'
import path from 'path'
import { launchChrome, assertServerUp, sleep } from './lib/chrome.mjs'

const HELP = `eval.mjs — run JS inside a live scene, print the result as JSON

Usage:
  node scripts/eval.mjs --act KEY [options] "expression" ["expression2" ...]

Options:
  --act KEY       Scene key (?act=KEY). Or use --url FULL_URL.
  --url FULL_URL  Full URL (overrides --act/--port; pass all params yourself).
  --t SEC         Load frozen at this anim time (?t=SEC).
  --wait MS       Settle wait after the canvas appears (default 2500).
  --shot PATH     After all expressions, save a PNG screenshot to PATH.
  --size WxH      Viewport, default 1280x720.
  --port N        Dev server port (default 5173).
  --camera        Append camera=1 (debug camera). REQUIRED when using
                  window.__cam.set on scenes with their own camera drivers
                  (CameraDrift etc.) — it makes them stand down; otherwise
                  they overwrite your pose on the next frame.
  --ui            Keep dev chrome visible (hidden by default via ui=0).
  --console       Print all page console messages.
  --help          Show this help.

Useful globals inside scenes:
  window.__anim     { time, playing, speed, seek(t), pause(), play(), setSpeed(s) }
  window.__camPose  live { pos, target, fov } of the scene camera
  window.__cam      { get(), set(x,y,z, tx,ty,tz, fov?) }
`

function fail(msg) {
  console.error(`eval.mjs: ${msg}`)
  console.error('Run with --help for usage.')
  process.exit(1)
}

const opts = {
  act: null, url: null, t: null, wait: 2500, shot: null,
  width: 1280, height: 720, port: 5173, ui: false, camera: false, console: false,
  expressions: [],
}
{
  const argv = process.argv.slice(2)
  const takesValue = new Set(['--act', '--url', '--t', '--wait', '--shot', '--size', '--port'])
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
      case '--t': opts.t = val; break
      case '--wait': {
        const n = Number(val)
        if (!Number.isFinite(n) || n < 0) fail(`--wait expects milliseconds (got "${val}")`)
        opts.wait = n
        break
      }
      case '--shot': opts.shot = val; break
      case '--size': {
        const m = /^(\d+)x(\d+)$/i.exec(val || '')
        if (!m) fail(`--size expects WxH (got "${val}")`)
        opts.width = Number(m[1]); opts.height = Number(m[2])
        break
      }
      case '--port': {
        const n = Number(val)
        if (!Number.isInteger(n) || n <= 0) fail(`--port expects an integer (got "${val}")`)
        opts.port = n
        break
      }
      case '--ui': opts.ui = true; break
      case '--camera': opts.camera = true; break
      case '--console': opts.console = true; break
      default:
        if (arg.startsWith('--')) fail(`unknown option: ${arg}`)
        opts.expressions.push(arg)
    }
  }
}

if (!opts.act && !opts.url) fail('either --act or --url is required')
if (opts.expressions.length === 0 && !opts.shot) {
  fail('nothing to do — pass at least one expression (or --shot)')
}

let targetUrl
if (opts.url) {
  targetUrl = opts.url
} else {
  const params = new URLSearchParams()
  params.set('act', opts.act)
  if (opts.t !== null) params.set('t', String(opts.t))
  if (opts.camera) params.set('camera', '1')
  if (!opts.ui) params.set('ui', '0')
  targetUrl = `http://localhost:${opts.port}/?${params.toString()}`
}

try {
  await assertServerUp(targetUrl, opts.port)
} catch (e) {
  console.error(`eval.mjs: ${e.message}`)
  process.exit(1)
}

let exitCode = 0
let session = null
try {
  session = await launchChrome({
    url: targetUrl,
    width: opts.width,
    height: opts.height,
    echoConsole: opts.console,
  })

  await session.waitForCanvas(30)
  await sleep(opts.wait)

  for (const expr of opts.expressions) {
    try {
      const value = await session.evaluate(expr)
      console.log(value === undefined ? 'undefined' : JSON.stringify(value))
    } catch (e) {
      console.error(`eval.mjs: expression failed — ${e.message}`)
      exitCode = 1
    }
    await sleep(300) // let a frame render between expressions
  }

  if (opts.shot) {
    const outPath = path.resolve(opts.shot)
    mkdirSync(path.dirname(outPath), { recursive: true })
    await sleep(600)
    writeFileSync(outPath, await session.screenshot())
    console.log(outPath)
  }
} catch (e) {
  console.error(`eval.mjs: error — ${e.message}`)
  exitCode = 1
} finally {
  await session?.close()
}

if (session && session.errorMsgs.length > 0) {
  console.error('--- page errors ---')
  for (const m of session.errorMsgs) console.error(m)
}

process.exit(exitCode)
