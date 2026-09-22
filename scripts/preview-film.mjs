#!/usr/bin/env node
/**
 * preview-film.mjs — fast watchable preview of a studio film without a
 * GPU: captures each timeline shot as frames via the shot.mjs pipeline
 * (dev server must be running), assembles per-shot segment mp4s (cached
 * — delete out/renders/preview/<film>/<key>.mp4 to force), then concats
 * the film.
 *
 *   node scripts/preview-film.mjs story-anime
 *   node scripts/preview-film.mjs story --fps 10 --size 1280x720 --force
 *
 * Films come from src/studio/story/timeline.ts / src/remotion/timeline.ts
 * (regex-parsed, same one-line-literal convention as render-fast.mjs).
 * Uses SHOT_GL=gl-egl by default (Mesa — ~30% faster than SwiftShader;
 * set SHOT_GL=swiftshader to opt out). Requires system ffmpeg.
 */
import { execFileSync, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const args = process.argv.slice(2)
const filmId = args.find(a => !a.startsWith('--')) ?? 'story'
const flag = (name, dflt) => {
  const i = args.indexOf(`--${name}`)
  return i !== -1 ? args[i + 1] : dflt
}
const FPS = parseInt(flag('fps', '10'), 10)
const SIZE = flag('size', '1280x720')
const FORCE = args.includes('--force')
const PORT = parseInt(flag('port', process.env.STUDIO_PORT || '5173'), 10)

/** Parse a timeline array out of a TS source by array const name. */
function parseTimeline(file, constName) {
  const src = readFileSync(path.join(root, file), 'utf8')
  const m = src.match(new RegExp(`const ${constName}[^=]*=\\s*\\[([\\s\\S]*?)\\n\\]`))
  if (!m) throw new Error(`cannot find ${constName} in ${file}`)
  const items = []
  for (const line of m[1].split('\n')) {
    const im = line.match(/\{ key: '([^']+)', from: ([\d.]+), duration: ([\d.]+)/)
    if (im) items.push({ key: im[1], from: parseFloat(im[2]), duration: parseFloat(im[3]) })
  }
  return items
}

const FILMS = {
  master: { file: 'src/remotion/timeline.ts', constName: 'TIMELINE', audio: 'public/audio/body-to-body.mp3' },
  // Alt-audio cuts of the master: identical picture, song ends on the Arirang.
  arirang: { file: 'src/remotion/timeline.ts', constName: 'TIMELINE', audio: 'public/audio/body-to-body-arirang.mp3' },
  'arirang-bed': { file: 'src/remotion/timeline.ts', constName: 'TIMELINE', audio: 'public/audio/body-to-body-arirang-bed.mp3' },
  story: { file: 'src/studio/story/timeline.ts', constName: 'STORY_TIMELINE', audio: 'public/audio/lantern-keeper-theme.mp3' },
  'story-anime': { file: 'src/studio/story/timeline.ts', constName: 'STORY_ANIME_TIMELINE', audio: 'public/audio/lantern-keeper-theme.mp3' },
}
const film = FILMS[filmId]
if (!film) {
  console.error(`unknown film '${filmId}' — one of: ${Object.keys(FILMS).join(', ')}`)
  process.exit(1)
}
const items = parseTimeline(film.file, film.constName)
if (items.length === 0) throw new Error('empty timeline')

/**
 * Confirm the dev server we are about to shoot is THIS worktree's.
 *
 * Without it the failure is silent and expensive: shot.mjs defaults to 5173,
 * a second checkout of this repo is commonly serving that port, and it
 * answers happily. Its manifest has never heard of `story.1`, so every
 * capture came back as whatever that app renders for an unknown key — five
 * byte-identical mp4s of the wrong title card, cached as if they were good,
 * plus 226 MB of matching junk frames. The timeline we just parsed off disk
 * is the discriminator: if the server's manifest does not contain our first
 * key, it is not our server.
 */
async function assertOurServer() {
  const probe = items[0].key
  const url = `http://localhost:${PORT}/src/scenes/manifest.ts`
  let src
  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    src = await res.text()
  } catch (e) {
    console.error(`no dev server on :${PORT} (${e.message}) — start one, or pass --port`)
    process.exit(1)
  }
  // Quote style is whatever esbuild emitted, so match either.
  const quoted = new RegExp(`['"]${probe.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`)
  if (!quoted.test(src)) {
    console.error(
      `the dev server on :${PORT} is serving a DIFFERENT checkout — its manifest has no '${probe}'.\n` +
      `Point at this worktree's server with --port <n> (or STUDIO_PORT=<n>).`)
    process.exit(1)
  }
}
await assertOurServer()

const segDir = path.join(root, 'out/renders/preview', filmId)
const framesDir = path.join(root, 'out/screenshots/preview_frames', filmId)
mkdirSync(segDir, { recursive: true })

const env = { ...process.env, SHOT_GL: process.env.SHOT_GL || 'gl-egl' }

let failed = 0
for (const item of items) {
  const seg = path.join(segDir, `${item.key}.mp4`)
  if (!FORCE && existsSync(seg)) {
    console.log(`[cache] ${item.key}`)
    continue
  }
  rmSync(seg, { force: true })
  console.log(`[capture] ${item.key} (${item.duration}s @ ${FPS}fps)`)
  // --port is NOT optional: shot.mjs defaults to 5173, and on a machine with
  // a second worktree checked out that is somebody ELSE's dev server. It
  // answered, `?act=story.1` meant nothing to its manifest, and every segment
  // came back as the same title card — five byte-identical mp4s of the wrong
  // app, cached as if they were good.
  const r = spawnSync('node', [
    'scripts/shot.mjs', '--act', item.key, '--port', String(PORT),
    '--range', `0:${item.duration}`, '--fps', String(FPS),
    '--size', SIZE, '--mp4', seg, '--out', framesDir,
  ], { cwd: root, env, stdio: ['ignore', 'ignore', 'inherit'] })
  if (r.status !== 0 || !existsSync(seg)) {
    console.error(`[FAILED] ${item.key}`)
    failed++
  }
}

if (failed > 0) {
  console.error(`${failed} segment(s) failed — fix and re-run (cache keeps the good ones)`)
  process.exit(1)
}

const concatList = path.join(segDir, 'concat.txt')
writeFileSync(concatList, items.map(i => `file '${path.join(segDir, `${i.key}.mp4`)}'`).join('\n'))
const out = path.join(root, `out/renders/${filmId}_preview.mp4`)
const audioPath = film.audio && existsSync(path.join(root, film.audio)) ? path.join(root, film.audio) : null
if (audioPath) {
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0',
    '-i', concatList, '-i', audioPath, '-c:v', 'copy', '-c:a', 'aac', '-shortest', out])
} else {
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0',
    '-i', concatList, '-c', 'copy', out])
}
console.log(out)
