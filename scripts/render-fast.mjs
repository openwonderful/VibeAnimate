#!/usr/bin/env node
/**
 * render-fast.mjs — fast master-video renders via per-scene segment caching.
 *
 * The FullVideo timeline is a sequence of independent scene slots over one
 * continuous audio track, so each slot renders as its own segment file
 * (video-only), cached in out/renders/segments/. A run only renders segments
 * that are missing (or that you name with --only), in a parallel pool of
 * separate browser processes, then stream-copies the segments together and
 * muxes the song on top. Iterating on one scene re-renders one segment —
 * minutes instead of re-rendering the whole 190s video.
 *
 * Usage:
 *   node scripts/render-fast.mjs                        # full video, cached
 *   node scripts/render-fast.mjs --only 2.1-zoom        # re-render one scene, reuse rest
 *   node scripts/render-fast.mjs --range 18:44          # just the act-2 chunk (+audio)
 *   node scripts/render-fast.mjs --comp FullVideo --out out/renders/FullVideo.mp4
 *   node scripts/render-fast.mjs --force                # ignore cache entirely
 *   node scripts/render-fast.mjs --comp StoryFilm720 \
 *     --timeline src/studio/story/timeline.ts --const STORY_TIMELINE \
 *     --audio public/audio/lantern-keeper-theme.mp3    # a film that isn't the master
 *   node scripts/render-fast.mjs --fps 12 --size 384x216 \
 *     --out out/renders/proxy/FullVideo720.mp4          # scrubbing proxy
 *
 * Options:
 *   --comp ID      Composition: FullVideo720 (default, fast) or FullVideo (1080p).
 *   --timeline F   Timeline source to read slots from (default
 *                  src/remotion/timeline.ts). Regex-parsed, so entries must
 *                  stay one-per-line literals — same rule as the manifest.
 *   --const NAME   Which array in that file to read when it holds more than
 *                  one (the story file holds three). Default: the first.
 *   --audio F      Score to mux, or `none` for video-only. DERIVED from the
 *                  composition via films.ts (same lookup --aspect uses);
 *                  falls back to public/audio/body-to-body.mp3 for a
 *                  composition films.ts does not describe.
 *                  (--fps is documented below; it is a RENDER rate, not an
 *                  output rate — the two meanings met in a merge and the
 *                  render-side one won, because it is the one that saves
 *                  anything.)
 *   --size WxH     Downscale the finished file to these dimensions, written
 *                  beside the master with a tier tag (`.384x216@12fps.mp4`).
 *                  This is the preview proxy: ~5% of the bytes, which is the
 *                  difference between the preview tab seeking instantly and
 *                  seeking through a 720p stream.
 *   --aspect ID    Override the shape used in the SEGMENT CACHE KEY. Normally
 *                  unnecessary: it is looked up from films.ts by composition
 *                  id, which is the same file the render gets its dimensions
 *                  from. It is a cache key and not a render setting —
 *                  stitching is a stream copy, which never re-encodes and
 *                  never checks dimensions, so a 16:9 segment reused inside a
 *                  9:16 film concatenates cleanly and plays wrong.
 *   --only K,K     Force re-render of these timeline keys (others come from cache).
 *   --range A:B    Only include timeline items inside [A,B) seconds. A and B
 *                  must land on segment boundaries.
 *   --shards N     Parallel render processes (default 4; >4 contends for the GPU).
 *   --concurrency N  Tabs per render process (default 3). Scenes whose cost is
 *                  DOM/SVG rasterization (1.2's depth chain: 3s/frame at 1) get
 *                  a near-linear speedup from this (0.3s/frame at 4); pure 3D
 *                  scenes are GPU-bound and gain nothing. shards × concurrency
 *                  is the real worker count — keep it near the core count.
 *   --force        Re-render every included segment.
 *   --out FILE     Output (default out/renders/<comp>[_A-B].mp4).
 *   --gl BACKEND   Chromium GL ($REMOTION_GL, else vulkan with a GPU, else swangle).
 *   --cpu          Force the software rasterizer (same as --gl swangle). For
 *                  boxes with no GPU, or when the GPU shouldn't be touched.
 *                  Viable at spotcheck scale (--scale 0.3 --fps 12); a
 *                  full-scale 30fps master on CPU is an hours-long job.
 *   --fps N        Spotcheck frame rate (default 30). Re-times the FullVideo
 *                  comps via calculateMetadata — 12fps is 2.5× fewer frames of
 *                  the same film. Cached separately (…@12fps). Pairs with
 *                  --scale: `--scale 0.3 --fps 12` is the ~40s spotcheck.
 *
 * Env: $CHROME_BIN (browser binary), $REMOTION_GL (GL backend override).
 */
import { spawn, spawnSync } from 'child_process'
import { chmodSync, existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'fs'
import path from 'path'
import { inflateSync } from 'zlib'
import { resolveChromeBin } from './lib/chrome.mjs'
import { listFilms } from './lib/films.mjs'

const DEFAULT_FPS = 30 // mirror of src/scenes/manifest.ts FPS
const DEFAULT_AUDIO = 'public/audio/body-to-body.mp3'
const FFMPEG = 'node_modules/@remotion/compositor-linux-x64-gnu/ffmpeg'

// A mid-render GPU context loss leaves the rest of a segment SOLID WHITE
// while the render still exits 0, so a visual check catches what the exit
// code misses. Two signals, both required, on every sampled frame:
//   1. the PNG compresses tiny (a solid 1280×720 frame is ~5KB, a real one
//      100KB+), and
//   2. its average pixel is essentially white.
// Size alone used to condemn legitimately dark scenes — Act 5.1 at night is
// a 39KB frame — which is why the brightness test is there too. $BLANK_BYTES=0
// disables the check entirely.
const BLANK_BYTES = Number(process.env.BLANK_BYTES ?? 45_000)
const BLANK_LUMA = 240

function fail(msg) {
  console.error(`render-fast.mjs: ${msg}`)
  process.exit(1)
}

/* ── args ─────────────────────────────────────────────────────── */
const opts = {
  comp: 'FullVideo720', only: [], range: null, shards: 4, force: false, out: null,
  gl: null, concurrency: 3, scale: null,
  timeline: 'src/remotion/timeline.ts', constName: null,
  audio: null, fps: DEFAULT_FPS, size: null, aspect: null,
}
{
  const argv = process.argv.slice(2)
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--comp') opts.comp = argv[++i]
    else if (a === '--only') opts.only = argv[++i].split(',').map(s => s.trim()).filter(Boolean)
    else if (a === '--range') {
      const m = /^([\d.]+):([\d.]+)$/.exec(argv[++i] ?? '')
      if (!m) fail('--range wants A:B in seconds, e.g. --range 18:44')
      opts.range = [parseFloat(m[1]), parseFloat(m[2])]
    }
    else if (a === '--shards') opts.shards = parseInt(argv[++i], 10) || 4
    else if (a === '--concurrency') opts.concurrency = parseInt(argv[++i], 10) || 1
    else if (a === '--force') opts.force = true
    else if (a === '--out') opts.out = argv[++i]
    else if (a === '--gl') opts.gl = argv[++i]
    else if (a === '--cpu') opts.gl = 'swangle'
    // A multiplier on the composition's own size (Root.tsx derives that from
    // the film's declared aspect), so on a 1920x1080 film --scale 2 is a
    // genuine 3840x2160 render rather than an upscale. Segments are whole
    // scenes rendered by separate processes, so this parallelises the way a
    // frame-range shard of one scene cannot: no seams, no seeding assumptions.
    else if (a === '--scale') opts.scale = argv[++i]
    else if (a === '--timeline') opts.timeline = argv[++i]
    else if (a === '--const') opts.constName = argv[++i]
    else if (a === '--audio') opts.audio = argv[++i]
    // Spotcheck lever: re-times the whole composition via calculateMetadata
    // (Root.tsx reads props.spotFps), so a 12fps render does 2.5× less work
    // than 30fps — same film, coarser sampling. FullVideo comps only.
    //
    // This is a RENDER rate, not an output rate. It used to be the latter on
    // the studio branch — a transcode of a finished 30fps master — and the
    // two met here. The render-side meaning wins because it is the one that
    // saves anything; --size below is what remains of the other, and the
    // studio's proxy asks for both together.
    else if (a === '--fps') opts.fps = parseInt(argv[++i], 10) || DEFAULT_FPS
    else if (a === '--size') opts.size = argv[++i]
    else if (a === '--aspect') opts.aspect = argv[++i]
    else if (a === '--help') { console.log(readFileSync(new URL(import.meta.url), 'utf8').split('*/')[0]); process.exit(0) }
    else fail(`unknown arg '${a}'`)
  }
}

// 'vulkan' (ANGLE-over-Vulkan) is the fast hardware path — measured on a
// 30-frame 3.2 render: 7s vulkan / 37s angle-egl / 196s swangle.
const gl = opts.gl || process.env.REMOTION_GL ||
  (existsSync('/dev/dri/renderD128') ? 'vulkan' : 'swangle')
// The device node proves a DRM driver is loaded, not that acceleration works
// — a virtio display or an unplugged eGPU leaves the node behind. When the
// backend was auto-picked (not user-forced), a failed segment retries on the
// software rasterizer instead of failing the run.
const glAutoPicked = !opts.gl && !process.env.REMOTION_GL && gl !== 'swangle'
const chromeBin = resolveChromeBin()

/* ── timeline (regex-parsed: entries must stay one-per-line literals) ── */
// --const matters because one file can hold several timelines: the story
// file declares STORY_TIMELINE, STORY_ANIME_TIMELINE and STORY_OVERLAYS, and
// parsing the whole file would silently stitch all three into one film.
let timelineSrc = readFileSync(opts.timeline, 'utf8')
if (opts.constName) {
  const scope = new RegExp(`const ${opts.constName}[^=]*=\\s*\\[([\\s\\S]*?)\\n\\]`).exec(timelineSrc)
  if (!scope) fail(`could not locate const ${opts.constName} in ${opts.timeline}`)
  timelineSrc = scope[1]
}
const items = []
const re = /\{\s*key:\s*'([^']+)'\s*,\s*from:\s*([\d.]+)\s*,\s*duration:\s*([\d.]+)/g
for (let m; (m = re.exec(timelineSrc)); ) {
  items.push({ key: m[1], from: parseFloat(m[2]), duration: parseFloat(m[3]) })
}
if (!items.length) fail(`could not parse a timeline from ${opts.timeline}${opts.constName ? ` (${opts.constName})` : ''}`)
items.sort((a, b) => a.from - b.from)

let included = items
if (opts.range) {
  const [a, b] = opts.range
  // Compare at millisecond resolution: the timeline is hand-typed decimals,
  // and 78.9 + 2.2 is 81.10000000000001 in a double, which used to make a
  // perfectly good boundary "not a boundary".
  const ms = n => Math.round(n * 1000)
  included = items.filter(it => ms(it.from) >= ms(a) && ms(it.from + it.duration) <= ms(b))
  if (!included.length) fail(`--range ${a}:${b} contains no timeline items`)
  const lo = included[0].from
  const hi = included[included.length - 1]
  if (ms(lo) !== ms(a) || ms(hi.from + hi.duration) !== ms(b)) {
    fail(`--range must land on segment boundaries; nearest: ${lo}:${hi.from + hi.duration}`)
  }
}
for (const k of opts.only) {
  if (!included.some(it => it.key === k)) fail(`--only '${k}' is not in the ${opts.range ? 'ranged ' : ''}timeline`)
}

/* ── plan ─────────────────────────────────────────────────────── */
// Scale is part of the cache identity, not just of the output: without it a
// 4K run would poison the 1080p cache (and vice versa) with segments that are
// the right key and the wrong resolution, and stream-copy stitching would
// happily concatenate them.
/*
 * The shape, DERIVED rather than trusted.
 *
 * `--aspect` started as a flag the caller passed, and that is exactly the
 * wrong shape for a cache key: the render's dimensions come from films.ts
 * (via Root.tsx), so a caller who forgets the flag writes 9:16 pixels into
 * the 16:9 cache directory. Demonstrated by accident while testing this —
 * one run without the flag poisoned `StoryFilm720/` with portrait segments,
 * which a later stream-copy stitch would have concatenated without a
 * complaint, because stream copy never re-encodes and never checks
 * dimensions.
 *
 * So the default is looked up from the SAME file the renderer reads, keyed
 * on the composition id (minus any `720` draft suffix). The flag survives
 * only as an override for a composition that films.ts does not describe.
 */
const compFilm = listFilms().find(f => f.composition === opts.comp.replace(/720$/, '')) ?? null
const compAspect = opts.aspect ?? compFilm?.aspect ?? null
/*
 * The SCORE, derived for the same reason the shape is.
 *
 * This defaulted to the master's mp3 no matter which composition ran, which
 * is a silent-wrong rather than a loud-wrong: render FullVideoArirang720 and
 * you got a perfectly good file with the master's outro glued back on — the
 * exact verse the cut exists to remove — and nothing anywhere says so. The
 * alt-audio cuts share the master's TIMELINE, so not one segment differs and
 * there is no other tell. Keyed on composition id (minus the 720 draft
 * suffix), so the renderer and the mux read the same row of films.ts.
 */
if (!opts.audio) opts.audio = compFilm?.audio ?? DEFAULT_AUDIO
// 16:9 contributes nothing, so the existing cache — hundreds of megabytes
// of it — stays valid.
const aspectTag = !compAspect || compAspect === '16:9' ? '' : `@${compAspect.replace(':', 'x')}`
// FPS is cache identity for the same reason scale and aspect are: a 12fps
// segment stream-copied into a 30fps stitch would play at the wrong speed,
// and stream copy neither re-encodes nor checks.
const segDir = path.join('out/renders/segments',
  opts.comp + aspectTag
  + (opts.scale ? `@${opts.scale}x` : '')
  + (opts.fps !== DEFAULT_FPS ? `@${opts.fps}fps` : ''))
mkdirSync(segDir, { recursive: true })
// The cache key carries the slot's placement, not just the scene key: retiming
// a scene in timeline.ts (a different `from`, a longer/shorter `duration`)
// changes which frames the segment holds, so it has to miss the cache instead
// of silently stitching the old length back in.
const plan = included.map(it => ({
  ...it,
  file: path.join(segDir, `${it.key}@${it.from}+${it.duration}.mp4`),
}))
const toRender = plan.filter(p =>
  opts.force || opts.only.includes(p.key) || !existsSync(p.file))

const cached = plan.length - toRender.length
console.log(`render-fast: ${plan.length} segments (${cached} cached, ${toRender.length} to render), gl=${gl}, shards=${opts.shards}`)

/* ── bundle once ──────────────────────────────────────────────── */
let bundleDir = null
if (toRender.length) {
  bundleDir = 'out/renders/.bundle'
  console.log('render-fast: bundling…')
  const r = spawnSync('npx', ['remotion', 'bundle', 'src/remotion/index.ts', `--out-dir=${bundleDir}`],
    { stdio: ['ignore', 'ignore', 'inherit'] })
  if (r.status !== 0) fail('remotion bundle failed')
}

/* ── render pool ──────────────────────────────────────────────── */

/** Average pixel brightness (0–255) of a 1×1 PNG, by inflating its IDAT.
 *  A single pixel has no left/up neighbours, so every PNG filter type
 *  reconstructs to the stored bytes — no un-filtering needed. */
function pngPixelLuma(file) {
  const buf = readFileSync(file)
  let idat = null
  for (let o = 8; o + 8 <= buf.length; ) {
    const len = buf.readUInt32BE(o)
    const type = buf.toString('ascii', o + 4, o + 8)
    if (type === 'IDAT') { idat = buf.subarray(o + 8, o + 8 + len); break }
    o += 12 + len
  }
  if (!idat) return null
  const raw = inflateSync(idat)              // [filter, R, G, B(, A)]
  if (raw.length < 4) return null
  return (raw[1] + raw[2] + raw[3]) / 3
}

/** Sample frames across a rendered segment; true if all of them are solid
 *  white, which means the GPU context was lost mid-render. */
function segmentLooksBlank(seg) {
  if (!BLANK_BYTES) return false
  try { chmodSync(FFMPEG, 0o755) } catch { /* already executable */ }
  const base = path.join(segDir, `.probe-${seg.key.replace(/[^\w.-]/g, '_')}`)
  let sampled = 0
  let blank = 0
  for (const frac of [0.35, 0.6, 0.85]) {
    const full = `${base}.png`
    const avg = `${base}-1px.png`
    const at = String(seg.duration * frac)
    const r = spawnSync(FFMPEG, ['-y', '-ss', at, '-i', seg.file, '-frames:v', '1', full],
      { stdio: 'ignore' })
    const r1 = spawnSync(FFMPEG,
      ['-y', '-ss', at, '-i', seg.file, '-frames:v', '1', '-vf', 'scale=1:1',
       '-pix_fmt', 'rgb24', avg],
      { stdio: 'ignore' })
    if (r.status === 0 && existsSync(full) && r1.status === 0 && existsSync(avg)) {
      sampled++
      const luma = pngPixelLuma(avg)
      if (statSync(full).size < BLANK_BYTES && luma !== null && luma > BLANK_LUMA) blank++
    }
    rmSync(full, { force: true })
    rmSync(avg, { force: true })
  }
  return sampled > 0 && blank === sampled
}

function renderSegment(seg, glBackend = gl) {
  // Rounding both edges against the SAME grid telescopes: this segment's
  // last frame is round(end*fps)-1 and the next segment starts at
  // round(end*fps), so a timeline boundary that is not on the fps grid
  // (35.9s at 12fps) still yields no dropped and no doubled frames.
  const from = Math.round(seg.from * opts.fps)
  const to = Math.round((seg.from + seg.duration) * opts.fps) - 1
  const args = [
    'remotion', 'render', bundleDir, opts.comp, seg.file,
    `--frames=${from}-${to}`,
    `--gl=${glBackend}`,
    `--concurrency=${opts.concurrency}`,
    '--muted',
    '--timeout=300000',
    `--browser-executable=${chromeBin}`,
    ...(opts.scale ? [`--scale=${opts.scale}`] : []),
    ...(opts.fps !== DEFAULT_FPS ? [`--props={"spotFps":${opts.fps}}`] : []),
  ]
  return new Promise((resolve, reject) => {
    const t0 = Date.now()
    const child = spawn('npx', args, { stdio: ['ignore', 'pipe', 'pipe'] })
    let tail = ''
    const keep = d => { tail = (tail + d.toString()).slice(-4000) }
    child.stdout.on('data', keep)
    child.stderr.on('data', keep)
    child.on('close', code => {
      const secs = ((Date.now() - t0) / 1000).toFixed(0)
      if (code !== 0) {
        console.error(`  ✗ ${seg.key} failed:\n${tail}`)
        reject(new Error(`segment '${seg.key}' failed`))
        return
      }
      // Exit 0 but a GPU context loss can leave the tail of the segment solid
      // white — verify visually before accepting it.
      if (segmentLooksBlank(seg)) {
        rmSync(seg.file, { force: true })  // don't cache a blank segment
        console.error(`  ✗ ${seg.key} rendered blank (GPU context loss)`)
        reject(new Error(`segment '${seg.key}' blank`))
        return
      }
      console.log(`  ✓ ${seg.key} (${seg.duration}s, ${secs}s wall)`)
      resolve()
    })
  })
}

async function pool(tasks, n) {
  const queue = [...tasks]
  let failed = false
  const workers = Array.from({ length: Math.min(n, queue.length) }, async () => {
    while (queue.length && !failed) {
      const seg = queue.shift()
      try {
        await renderSegment(seg)
      } catch {
        // Renders can die transiently under memory/GPU pressure — retry once.
        // If the GPU backend was our guess rather than the user's choice, the
        // retry drops to the software rasterizer: slower, but it finishes on
        // a box whose render node has nothing behind it.
        const fallback = glAutoPicked ? 'swangle' : gl
        console.log(`  ↻ retrying ${seg.key}${fallback !== gl ? ` (gl=${fallback})` : ''}`)
        try { await renderSegment(seg, fallback) } catch { failed = true }
      }
    }
  })
  await Promise.all(workers)
  if (failed) fail('one or more segments failed')
}

/* ── stitch + audio ───────────────────────────────────────────── */
function run(cmd, args) {
  const r = spawnSync(cmd, args, { stdio: ['ignore', 'ignore', 'pipe'] })
  if (r.status !== 0) fail(`${path.basename(cmd)} failed:\n${r.stderr}`)
}

const rangeTag = opts.range ? `_${opts.range[0]}-${opts.range[1]}` : ''
const out = opts.out ?? path.join('out/renders', `${opts.comp}${rangeTag}.mp4`)

const t0 = Date.now()
await pool(toRender, opts.shards)

try { chmodSync(FFMPEG, 0o755) } catch { /* already executable */ }
const listFile = path.join(segDir, `.concat${rangeTag}.txt`)
writeFileSync(listFile, plan.map(p => `file '${path.resolve(p.file)}'`).join('\n') + '\n')
const silent = out.replace(/\.mp4$/, '.noaudio.mp4')
run(FFMPEG, ['-y', '-f', 'concat', '-safe', '0', '-i', listFile, '-c', 'copy', silent])

// +faststart moves the moov atom to the front (inline/streaming players need
// it); make_zero normalizes the seeked audio's timestamps so strict demuxers
// don't reject the file.
const AUDIO = opts.audio === 'none' ? null : opts.audio
if (AUDIO && existsSync(AUDIO)) {
  const start = plan[0].from
  const dur = plan.reduce((s, p) => s + p.duration, 0)
  run(FFMPEG, ['-y', '-i', silent, '-ss', String(start), '-t', String(dur), '-i', AUDIO,
    '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k',
    // NO -shortest. The song is 189.77s and the film is 190.0s, so -shortest
    // trimmed the video to the audio and every master silently lost its last
    // nine frames — the end of 8.55, i.e. the last thing in the picture.
    // Without it the video keeps its full length and the audio simply runs
    // out 0.23s early, which is what the cut has always intended.
    '-avoid_negative_ts', 'make_zero', '-movflags', '+faststart', out])
} else {
  if (AUDIO) console.log(`render-fast: ${AUDIO} not found — output is video-only`)
  run(FFMPEG, ['-y', '-i', silent, '-c', 'copy', '-movflags', '+faststart', out])
}

/* ── proxy transcode ──────────────────────────────────────────── */
// A downscale, AFTER the stitch. A segment is always rendered at the
// composition's own size, because that is what the cache holds and what a
// re-stitch has to be able to reuse; what this produces is a small file that
// SCRUBS — 384x216@12 is ~5% of the bytes, which is the difference between
// the preview tab seeking instantly and seeking through a 1280x720 stream.
// Written beside the master with a tier tag rather than over it.
//
// Gated on --size ALONE, and that is the merge showing: --fps is now a render
// rate (the spotcheck lever), so it defaults to 30 rather than to null and
// `if (opts.fps || opts.size)` would fire on every render there is. The rate
// still lands in the tier tag, because the file name is what the preview
// panel looks for — but there is no -r any more, since the master is already
// at that rate by the time we get here.
if (opts.size) {
  const tier = [opts.size, opts.fps !== DEFAULT_FPS && `${opts.fps}fps`].filter(Boolean).join('@')
  const proxy = out.replace(/\.mp4$/, `.${tier}.mp4`)
  run(FFMPEG, ['-y', '-i', out,
    '-s', opts.size,
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '28',
    // Keyframe every half second: the preview scrubs by seeking, and a long
    // GOP means every seek decodes back to the last I-frame.
    '-g', String(Math.max(1, Math.round(opts.fps / 2))),
    '-c:a', 'copy', '-movflags', '+faststart', proxy])
  console.log(`render-fast: ${proxy} (proxy)`)
}

console.log(`render-fast: ${out} (${((Date.now() - t0) / 1000).toFixed(0)}s total)`)
