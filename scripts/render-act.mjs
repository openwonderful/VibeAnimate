#!/usr/bin/env node
/**
 * render-act.mjs — render any scene (by its ?act= key) to an mp4 via Remotion.
 *
 * Usage:
 *   npm run render:act -- 3.2                 # → out/renders/3.2.mp4 (GPU if present)
 *   npm run render:act -- 3.2 --gpu           # force the GPU (vulkan) backend
 *   REMOTION_GL=swangle npm run render:act -- 3.2   # force software rendering
 *   npm run render:act -- 3.2 --out my.mp4 --frames 0-60   # extra args pass through
 *   npm run render:act -- FullVideo           # composition ids work too
 *
 * Scene keys are sanitised to Remotion composition ids ('3.2' → '3-2') the
 * same way src/scenes/manifest.ts#compositionId does.
 */
import { spawnSync } from 'child_process'
import { existsSync, mkdirSync, renameSync } from 'fs'
import path from 'path'
import { listActKeys } from './lib/acts.mjs'

const argv = process.argv.slice(2)
const key = argv[0]
if (!key || key.startsWith('--')) {
  console.error('render-act.mjs: usage: npm run render:act -- <scene-key> [--gpu] [--out FILE] [extra remotion args]')
  process.exit(1)
}

const rest = argv.slice(1)
// Clips come out silent otherwise — only the FullVideo composition carries
// an <Audio>. Mux the song over the finished file, trimmed to its length,
// unless --no-audio is passed.
const noAudio = rest.includes('--no-audio')
const gpu = rest.includes('--gpu')
const outIdx = rest.indexOf('--out')
const out = outIdx >= 0 ? rest[outIdx + 1] : path.join('out/renders', `${key}.mp4`)
const passthrough = rest.filter((a, i) =>
  a !== '--gpu' && a !== '--no-audio' && a !== '--out' && (outIdx < 0 || i !== outIdx + 1))

// Mirror manifest.ts#compositionId
const compId = key.replace(/[^a-zA-Z0-9-]/g, '-')

const knownKeys = listActKeys()
if (!knownKeys.includes(key) && !['FullVideo', 'FullVideo720', 'ZoomThrough', 'ZoomThrough720p'].includes(key)) {
  console.error(`render-act.mjs: '${key}' is not a scene key (see: node scripts/shot.mjs --list) — trying it as a composition id anyway`)
}

mkdirSync(path.dirname(path.resolve(out)), { recursive: true })

// GL backend: 'vulkan' (ANGLE-over-Vulkan) is the only hardware path that
// works here and is ~27x faster than software rasterization (30 frames of
// 3.2: 7s vulkan / 37s angle-egl / 196s swangle), so it is the default
// whenever a GPU render node exists. $REMOTION_GL overrides; boxes without a
// GPU fall back to 'swangle'. $CHROME_BIN points Remotion at a browser binary.
const defaultGl = existsSync('/dev/dri/renderD128') ? 'vulkan' : 'swangle'
const args = [
  'remotion', 'render', 'src/remotion/index.ts', compId, out,
  `--gl=${process.env.REMOTION_GL || (gpu ? 'vulkan' : defaultGl)}`,
  '--concurrency=1',
  '--timeout=180000',
  ...(process.env.CHROME_BIN ? [`--browser-executable=${process.env.CHROME_BIN}`] : []),
  ...passthrough,
]
console.log(`render-act: npx ${args.join(' ')}`)
const r = spawnSync('npx', args, { stdio: 'inherit' })
if (r.status) process.exit(r.status)

// ── Audio ─────────────────────────────────────────────────────────
// Only the FullVideo composition mounts an <Audio>; a per-scene render is
// silent, which makes every review clip harder to judge than it needs to be.
// Mux the song over the finished file (trimmed to the video's length) unless
// --no-audio was passed. Remotion ships its own ffmpeg, so there is no
// dependency on a system one.
if (!noAudio) {
  const song = 'public/audio/body-to-body.mp3'
  const ffmpeg = 'node_modules/@remotion/compositor-linux-x64-gnu/ffmpeg'
  if (existsSync(song) && existsSync(ffmpeg)) {
    const withAudio = out.replace(/\.mp4$/, '.audio.mp4')
    const a = spawnSync(ffmpeg, [
      '-v', 'error', '-y', '-i', out, '-i', song,
      '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac',
      '-b:a', '160k', '-shortest', withAudio,
    ], { stdio: 'inherit' })
    if (a.status === 0) {
      renameSync(withAudio, out)
      console.log(`render-act: muxed ${song}`)
    } else {
      console.warn('render-act: audio mux failed; leaving the video silent')
    }
  }
}
process.exit(0)
