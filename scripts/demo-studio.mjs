#!/usr/bin/env node
/**
 * demo-studio.mjs — record a walkthrough of Flow Studio's Blender mode.
 *
 * Drives the real app over CDP with real input events (mouse clicks on the
 * viewport and the Outliner, keystrokes for G/R/S, typing into the console)
 * while capturing frames, then muxes them to an mp4 with ffmpeg. Nothing is
 * faked: every frame is the running studio responding to input.
 *
 * Usage: node scripts/demo-studio.mjs [--out out/renders/studio-demo.mp4]
 *                                     [--fps 10] [--size 1600x1000]
 * Requires the dev server to be running (npm run dev).
 */
import { mkdirSync, writeFileSync, rmSync } from 'fs'
import { spawnSync } from 'child_process'
import path from 'path'
import { launchChrome, assertServerUp, sleep } from './lib/chrome.mjs'

const args = process.argv.slice(2)
const flag = (name, fallback) => {
  const i = args.indexOf(name)
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback
}

const OUT = path.resolve(flag('--out', 'out/renders/studio-demo.mp4'))
const FPS = Number(flag('--fps', '10'))
const [WIDTH, HEIGHT] = flag('--size', '1600x1000').split('x').map(Number)
const PORT = Number(flag('--port', '5173'))
const FRAME_DIR = path.resolve('out/renders/.demo-frames')

const URL = `http://localhost:${PORT}/?app=studio&act=lab.manip&t=2&console=1`

let frameNo = 0
let session

/** Capture N frames spaced at the target frame interval (a "hold"). */
async function hold(seconds) {
  const n = Math.max(1, Math.round(seconds * FPS))
  for (let i = 0; i < n; i++) {
    const buf = await session.screenshot({ blankRetries: 0 })
    writeFileSync(path.join(FRAME_DIR, `f${String(++frameNo).padStart(5, '0')}.png`), buf)
  }
}

/* ── Input helpers (real CDP events, not synthetic JS dispatch) ─────── */

async function click(x, y) {
  for (const type of ['mousePressed', 'mouseReleased']) {
    await session.cdp('Input.dispatchMouseEvent', {
      type, x, y, button: 'left', clickCount: 1, buttons: type === 'mousePressed' ? 1 : 0,
    })
  }
}

async function key(code, keyName, modifiers = 0) {
  for (const type of ['keyDown', 'keyUp']) {
    await session.cdp('Input.dispatchKeyEvent', { type, code, key: keyName, windowsVirtualKeyCode: 0, modifiers })
  }
}

/** Type into the focused element, capturing frames so typing is visible. */
async function type(text, { perChar = 1 } = {}) {
  for (const ch of text) {
    await session.cdp('Input.insertText', { text: ch })
    if (perChar) {
      const buf = await session.screenshot({ blankRetries: 0 })
      writeFileSync(path.join(FRAME_DIR, `f${String(++frameNo).padStart(5, '0')}.png`), buf)
    }
  }
}

/** Enter needs the keyDown → char → keyUp trio: implicit form submission
 *  hangs off the char event, which a bare keyDown does not produce. */
async function enter() {
  const base = { code: 'Enter', key: 'Enter', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 }
  await session.cdp('Input.dispatchKeyEvent', { type: 'rawKeyDown', ...base })
  await session.cdp('Input.dispatchKeyEvent', { type: 'char', ...base, text: '\r', unmodifiedText: '\r' })
  await session.cdp('Input.dispatchKeyEvent', { type: 'keyUp', ...base })
}

/** Screen position of a DOM element matched by a page-side predicate. */
async function locate(js) {
  return session.evaluate(`(() => {
    const el = ${js};
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
  })()`)
}

async function main() {
  await assertServerUp(URL, PORT)
  rmSync(FRAME_DIR, { recursive: true, force: true })
  mkdirSync(FRAME_DIR, { recursive: true })
  mkdirSync(path.dirname(OUT), { recursive: true })

  session = await launchChrome({ url: URL, width: WIDTH, height: HEIGHT, dpr: 1 })
  await session.waitForCanvas(30)
  await sleep(7000) // scene warm-up (SwiftShader/llvmpipe present slowly)

  // 1. The studio at rest.
  await hold(1.6)

  // 2. Click the keeper in the viewport — a real click through the app's
  //    own raycaster. The store projects the object to screen space, so
  //    this aims at the character rather than at guessed pixels.
  const keeper = await session.evaluate(`JSON.stringify(window.__editables.screen('keeper'))`)
    .then(s => (s && s !== 'null' ? JSON.parse(s) : null))
  if (!keeper) throw new Error('could not locate @keeper on screen')
  await click(keeper.x, keeper.y)
  await hold(1.8)

  // 3. Gizmo modes: rotate, scale, back to move.
  for (const [code, name, label] of [['KeyR', 'r', 'rotate'], ['KeyS', 's', 'scale'], ['KeyG', 'g', 'move']]) {
    void label
    await key(code, name)
    await hold(1.2)
  }

  // 4. Axis constraint.
  await key('KeyY', 'y')
  await hold(1.2)
  await key('KeyY', 'y') // toggle off
  await hold(0.6)

  // 5. The console: @ autocomplete, then drive the object by name.
  const input = await locate(`document.querySelector('form input[placeholder*="@object"]')`)
  if (input) await click(input.x, input.y)
  await hold(0.5)

  await type('@')
  await hold(1.4)                     // autocomplete menu
  await type('keeper move y 0.6')
  await hold(0.6)
  await enter()
  await hold(2.0)                     // entity card + object rises

  await type('@lanternA rot y 45')
  await hold(0.4)
  await enter()
  await hold(1.8)

  await type('ls')
  await hold(0.3)
  await enter()
  await hold(2.0)                     // object chips

  // 6. Outliner selection, then hide/show from the keyboard.
  const row = await locate(`document.querySelector('[data-editable-row="tree"]')`)
  if (!row) throw new Error('outliner row for @tree not found')
  await click(row.x, row.y)
  await hold(1.8)
  await key('KeyH', 'h')              // hide
  await hold(1.8)
  await key('KeyH', 'h', 1)           // Alt+H — show again
  await hold(1.6)

  // 7. Reset everything through the store, then park.
  await session.evaluate(`(() => { const e = window.__editables; e.list().forEach(o => e.reset(o.id)); e.select(null); return true })()`)
  await hold(2.0)

  await session.close()

  // ── Encode ────────────────────────────────────────────────────────
  const r = spawnSync('ffmpeg', [
    '-y', '-framerate', String(FPS), '-i', path.join(FRAME_DIR, 'f%05d.png'),
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20',
    '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2', OUT,
  ], { stdio: 'inherit' })
  if (r.status !== 0) {
    console.error('demo-studio.mjs: ffmpeg failed — frames kept in', FRAME_DIR)
    process.exit(1)
  }
  rmSync(FRAME_DIR, { recursive: true, force: true })
  console.log(`${OUT}  (${frameNo} frames @ ${FPS}fps ≈ ${(frameNo / FPS).toFixed(1)}s)`)
}

main().catch(async e => {
  console.error('demo-studio.mjs:', e.message)
  if (session) await session.close()
  process.exit(1)
})
