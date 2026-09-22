#!/usr/bin/env node
/**
 * thumbs.mjs — render one still per manifest scene into public/thumbs/,
 * which is what the studio's Storyboard view shows on its cards.
 *
 * Why stills and not live canvases: the board shows 150+ scenes at once.
 * Each live R3F card would be its own WebGL context, and the GPU starts
 * evicting contexts well before that (see CLAUDE.md on concurrency) — the
 * page would fall back to software and crawl. A jpeg costs nothing.
 *
 * Frames are captured at ~35% into each scene rather than t=0, because a
 * lot of scenes open on black and a board of black cards is useless.
 *
 * Usage (dev server must already be running):
 *   node scripts/thumbs.mjs                      # every scene, skipping ones already done
 *   node scripts/thumbs.mjs --force              # re-render everything
 *   node scripts/thumbs.mjs --only 3.2,5.1       # just these keys
 *   node scripts/thumbs.mjs --port 5174 --jobs 4
 */
import { mkdirSync, existsSync, writeFileSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { launchChrome, assertServerUp, sleep } from './lib/chrome.mjs'
import { listActs, compositionId } from './lib/acts.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT_DIR = path.join(ROOT, 'public/thumbs')

const args = process.argv.slice(2)
const flag = (name, fallback) => {
  const i = args.indexOf(name)
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback
}
const has = name => args.includes(name)

if (has('--help') || has('-h')) {
  console.log(`thumbs.mjs — storyboard stills for every manifest scene

  --only KEYS     comma-separated scene keys (default: all)
  --force         re-render thumbnails that already exist
  --port N        dev server port (default 5173)
  --jobs N        parallel browsers (default 3)
  --size WxH      thumbnail size (default 480x270 — 16:9, the render aspect)
  --quality N     jpeg quality 1-100 (default 78)
  --settle MS     extra wait after the canvas appears (default 2500)
`)
  process.exit(0)
}

const PORT = Number(flag('--port', '5173'))
const JOBS = Math.max(1, Number(flag('--jobs', '3')))
const QUALITY = Number(flag('--quality', '78'))
const SETTLE = Number(flag('--settle', '2500'))
const [WIDTH, HEIGHT] = flag('--size', '480x270').split('x').map(Number)
const FORCE = has('--force')
const ONLY = flag('--only', '')?.split(',').map(s => s.trim()).filter(Boolean) ?? []

const DEFAULT_DURATION_SEC = 20

/** Where in a scene to grab the still: 35% in, clamped to a sane window. */
const thumbTime = durationSec =>
  Math.min(8, Math.max(0.6, (durationSec ?? DEFAULT_DURATION_SEC) * 0.35))

mkdirSync(OUT_DIR, { recursive: true })

let scenes = listActs()
if (ONLY.length) {
  const known = new Set(scenes.map(s => s.key))
  const missing = ONLY.filter(k => !known.has(k))
  if (missing.length) {
    console.error(`unknown scene key(s): ${missing.join(', ')}`)
    process.exit(1)
  }
  scenes = scenes.filter(s => ONLY.includes(s.key))
}

const pending = scenes.filter(s =>
  FORCE || !existsSync(path.join(OUT_DIR, `${compositionId(s.key)}.jpg`)))

if (pending.length === 0) {
  console.log(`all ${scenes.length} thumbnails already exist (use --force to re-render)`)
  process.exit(0)
}

await assertServerUp(`http://localhost:${PORT}/`, PORT)

console.log(`thumbs: ${pending.length} scene(s) → public/thumbs/ ` +
  `(${WIDTH}x${HEIGHT} q${QUALITY}, ${JOBS} job${JOBS > 1 ? 's' : ''})`)

// Round-robin so each job gets a mix of cheap and expensive scenes rather
// than one job inheriting every heavy Act 1-3 flight window.
const shards = Array.from({ length: JOBS }, () => [])
pending.forEach((s, i) => shards[i % JOBS].push(s))

let done = 0
let failed = 0

async function runShard(shard) {
  if (shard.length === 0) return
  // One browser per job, reused across scenes: relaunching Chrome per
  // scene costs more than the render does.
  const first = shard[0]
  const session = await launchChrome({
    url: sceneUrl(first),
    width: WIDTH,
    height: HEIGHT,
  })
  try {
    // --window-size is NOT the viewport: headless Chrome keeps ~143px of
    // chrome above the page, so a 480x270 window screenshots at 480x127 —
    // 4:1, nothing like the 16:9 the film renders at. Override the metrics
    // so captures are exactly WIDTHxHEIGHT. Survives navigation.
    await session.cdp('Emulation.setDeviceMetricsOverride', {
      width: WIDTH, height: HEIGHT, deviceScaleFactor: 1, mobile: false,
    })
    for (let i = 0; i < shard.length; i++) {
      const scene = shard[i]
      try {
        if (i > 0) {
          await session.cdp('Page.navigate', { url: sceneUrl(scene) })
          await sleep(400)
        }
        await session.waitForCanvas(30)
        await sleep(SETTLE)
        const buf = await capture(session)
        writeFileSync(path.join(OUT_DIR, `${compositionId(scene.key)}.jpg`), buf)
        done++
        console.log(`  [${done}/${pending.length}] ${scene.key} · ${(buf.length / 1024).toFixed(0)}KB`)
      } catch (e) {
        failed++
        console.error(`  ✗ ${scene.key}: ${e.message}`)
      }
    }
  } finally {
    await session.close()
  }
}

function sceneUrl(scene) {
  const t = thumbTime(scene.durationSec)
  return `http://localhost:${PORT}/?act=${encodeURIComponent(scene.key)}&t=${t}&ui=0`
}

/** JPEG straight out of CDP — no ffmpeg hop. Retries suspiciously tiny
 *  buffers, which is what a not-yet-presented WebGL frame looks like. */
async function capture(session) {
  let buf
  for (let attempt = 0; ; attempt++) {
    const ss = await session.cdp('Page.captureScreenshot',
      { format: 'jpeg', quality: QUALITY }, 30000)
    if (!ss?.data) throw new Error('captureScreenshot returned no data')
    buf = Buffer.from(ss.data, 'base64')
    if (buf.length >= 3000 || attempt >= 2) break
    await sleep(2500)
  }
  return buf
}

await Promise.all(shards.map(runShard))

console.log(`\nthumbs: ${done} written, ${failed} failed → ${OUT_DIR}`)
process.exit(failed > 0 && done === 0 ? 1 : 0)
