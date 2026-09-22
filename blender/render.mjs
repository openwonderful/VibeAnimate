#!/usr/bin/env node
// render.mjs — Flow Studio Backend B CLI.
//
//   node blender/render.mjs <scene> [--frames A:B] [--fps 30]
//        [--res WxH] [--samples N] [--out out/renders/blender/<scene>.mp4]
//        [--keep-frames]
//
// Runs `blender -b -P blender/scenes/<scene>.py -- --out FRAMES_DIR ...`
// (PNG frames), then stitches to mp4 with the first working ffmpeg found
// (system ffmpeg → Remotion's bundled libx264 ffmpeg → Playwright's
// VP8-only build, which falls back to .webm).

import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, rmSync, chmodSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const BLENDER = process.env.BLENDER_BIN || '/usr/bin/blender'

// --- args ------------------------------------------------------------------
const argv = process.argv.slice(2)
const scene = argv[0] && !argv[0].startsWith('--') ? argv[0] : null
if (!scene) {
  const scenes = readdirSync(join(ROOT, 'blender/scenes'))
    .filter((f) => f.endsWith('.py'))
    .map((f) => f.replace(/\.py$/, ''))
  console.error('usage: node blender/render.mjs <scene> [--frames A:B] [--fps 30] [--res WxH] [--samples N] [--out file.mp4] [--keep-frames]')
  console.error('scenes: ' + scenes.join(', '))
  process.exit(1)
}
const opt = (name, dflt) => {
  const i = argv.indexOf('--' + name)
  return i >= 0 && argv[i + 1] ? argv[i + 1] : dflt
}
const frames = opt('frames', '1:120')
const fps = Number(opt('fps', '30'))
const res = opt('res', '640x360')
const samples = opt('samples', '48')
const keepFrames = argv.includes('--keep-frames')
let out = resolve(ROOT, opt('out', `out/renders/blender/${scene}.mp4`))

const sceneFile = join(ROOT, 'blender/scenes', scene + '.py')
if (!existsSync(sceneFile)) {
  console.error(`scene not found: ${sceneFile}`)
  process.exit(1)
}

// --- ffmpeg discovery ------------------------------------------------------
function findFfmpeg() {
  const candidates = [
    { bin: 'ffmpeg', name: 'system ffmpeg' },
    { bin: join(ROOT, 'node_modules/@remotion/compositor-linux-x64-gnu/ffmpeg'), name: 'remotion ffmpeg' },
    { bin: '/opt/pw-browsers/ffmpeg-1011/ffmpeg-linux', name: 'playwright ffmpeg (vp8 only)', vp8Only: true },
  ]
  for (const c of candidates) {
    try {
      if (c.bin.includes('/')) {
        if (!existsSync(c.bin)) continue
        try { chmodSync(c.bin, 0o755) } catch { /* may already be executable */ }
      }
      const probe = spawnSync(c.bin, ['-hide_banner', '-encoders'], { encoding: 'utf8' })
      if (probe.status !== 0) continue
      const hasX264 = /libx264/.test(probe.stdout || '')
      return { ...c, hasX264 }
    } catch { /* try next */ }
  }
  return null
}

// --- render frames ---------------------------------------------------------
const framesDir = join(ROOT, 'out/renders/blender/.frames', scene)
if (!keepFrames) rmSync(framesDir, { recursive: true, force: true })
mkdirSync(framesDir, { recursive: true })
mkdirSync(dirname(out), { recursive: true })

console.log(`[render.mjs] ${scene}: frames ${frames} @ ${res}, ${samples} samples -> ${framesDir}`)
const t0 = Date.now()
const blender = spawnSync(BLENDER, [
  '-b', '-P', sceneFile, '--',
  '--out', framesDir, '--frames', frames, '--res', res, '--samples', String(samples),
], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })

// surface only the interesting lines (Saved/errors), not per-tile spam
const lines = (blender.stdout + '\n' + blender.stderr).split('\n')
const saved = lines.filter((l) => l.startsWith('Saved:'))
const errors = lines.filter((l) => /error|traceback/i.test(l) && !/OpenImageDenois/.test(l))
if (saved.length) console.log(`[render.mjs] ${saved.length} frames rendered in ${((Date.now() - t0) / 1000).toFixed(1)}s`)
if (blender.status !== 0 || saved.length === 0) {
  console.error('[render.mjs] blender failed:')
  console.error(errors.concat(lines.slice(-15)).join('\n'))
  process.exit(1)
}

// --- stitch ----------------------------------------------------------------
const ff = findFfmpeg()
if (!ff) {
  console.error(`[render.mjs] no ffmpeg found — frames left in ${framesDir}`)
  process.exit(1)
}
const startNumber = frames.split(':')[0]
let vcodec = ['-c:v', 'libx264', '-preset', 'medium', '-crf', '21', '-pix_fmt', 'yuv420p']
if (!ff.hasX264) {
  out = out.replace(/\.mp4$/, '.webm')
  vcodec = ['-c:v', 'libvpx', '-b:v', '2M']
  console.log(`[render.mjs] ${ff.name} has no libx264 — writing ${out}`)
}
const st = spawnSync(ff.bin, [
  '-y', '-framerate', String(fps), '-start_number', startNumber,
  '-i', join(framesDir, 'frame_%04d.png'), ...vcodec, out,
], { encoding: 'utf8' })
if (st.status !== 0) {
  console.error(`[render.mjs] ${ff.name} failed:\n` + (st.stderr || '').slice(-1200))
  process.exit(1)
}
if (!keepFrames) rmSync(framesDir, { recursive: true, force: true })
console.log(`[render.mjs] wrote ${out} (${ff.name}, ${saved.length} frames @ ${fps}fps, total ${((Date.now() - t0) / 1000).toFixed(1)}s)`)
