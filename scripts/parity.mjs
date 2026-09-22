#!/usr/bin/env node
/**
 * parity.mjs — "is this branch still rendering the same film as master?"
 *
 * ── Why this exists ───────────────────────────────────────────────────
 * The studio branch carries a lot of machinery that touches scene files:
 * the camera handoff, `<Editable>` wrappers, SceneCanvas, the post-chain
 * rework in 6.85. Every one of those is supposed to be invisible with the
 * debug camera off — the picture is master's picture and the studio only
 * changes what surrounds it. "Supposed to be" is not a guarantee, and the
 * failure mode is the worst kind: a shot that still renders, still looks
 * plausible, and is quietly a few units off what the film is.
 *
 * So this renders the same frame of every clip in the film out of TWO live
 * dev servers — this worktree and master's — and compares them pixel for
 * pixel. It is the check behind the claim, and it takes about six minutes.
 *
 * ── Usage ─────────────────────────────────────────────────────────────
 *   node scripts/parity.mjs                    # film clips, :5174 vs :5173
 *   node scripts/parity.mjs --keys 8.55,7.4    # just these
 *   node scripts/parity.mjs --all              # every manifest scene
 *   node scripts/parity.mjs --a 5174 --b 5173  # which server is which
 *
 * BOTH servers must already be running, on worktrees checked out to the two
 * things you are comparing. Mine:
 *   /srv/work/code_animation-studio  → :5174 (this branch)
 *   /srv/work/code_animation         → :5173 (master)
 *
 * Exits non-zero if any frame differs, so it can gate a merge.
 *
 * ── Reading the number ────────────────────────────────────────────────
 * SSIM 1.000000 is identical. Anything below is a real difference and worth
 * opening the two PNGs side by side — they are kept in out/screenshots/parity
 * precisely so you can. Note that a difference is not automatically a BUG:
 * if master retimed a scene and this branch has not merged it yet, that is
 * the tool doing its job.
 */
import { spawnSync } from 'child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import path from 'path'

const root = process.cwd()
const OUT = 'out/screenshots/parity'
const FFMPEG = ['/usr/bin/ffmpeg', 'node_modules/@remotion/compositor-linux-x64-gnu/ffmpeg']
  .find(p => existsSync(p)) ?? 'ffmpeg'

const opts = { a: 5174, b: 5173, keys: null, all: false, size: '1280x720', wait: 7000 }
{
  const argv = process.argv.slice(2)
  for (let i = 0; i < argv.length; i++) {
    const x = argv[i]
    if (x === '--a') opts.a = parseInt(argv[++i], 10)
    else if (x === '--b') opts.b = parseInt(argv[++i], 10)
    else if (x === '--keys') opts.keys = argv[++i].split(',').map(s => s.trim()).filter(Boolean)
    else if (x === '--all') opts.all = true
    else if (x === '--size') opts.size = argv[++i]
    else if (x === '--wait') opts.wait = parseInt(argv[++i], 10)
    else if (x === '--help') {
      console.log(readFileSync(new URL(import.meta.url), 'utf8').split('*/')[0])
      process.exit(0)
    } else { console.error(`parity: unknown arg '${x}'`); process.exit(1) }
  }
}

/**
 * Which frame of each clip to compare.
 *
 * The MIDDLE of the clip, not its first frame, and that is deliberate: a lot
 * of these scenes open on a handoff pose shared with their neighbour, so
 * frame 0 is the one frame most likely to match even when everything after
 * it does not. Clamped just inside the out-point so a clip that plays past
 * its scene's own duration still lands on something.
 */
function filmClips() {
  const src = readFileSync(path.join(root, 'src/remotion/timeline.ts'), 'utf8')
  const re = /\{ key: '([^']+)', from: [\d.]+, duration: ([\d.]+)(?:, offsetSec: ([\d.]+))?/g
  const out = []
  for (const m of src.matchAll(re)) {
    const dur = parseFloat(m[2])
    const off = m[3] ? parseFloat(m[3]) : 0
    out.push({ key: m[1], t: +(off + Math.min(dur * 0.5, dur - 0.05)).toFixed(2) })
  }
  return out
}

function allScenes() {
  const src = readFileSync(path.join(root, 'src/scenes/manifest.ts'), 'utf8')
  const block = src.match(/const SCENES[^=]*=\s*\[([\s\S]*?)\n\]/)?.[1] ?? ''
  return [...block.matchAll(/^\s*\{ key: '([^']+)'/gm)].map(m => ({ key: m[1], t: 3 }))
}

const clips = opts.keys
  ? opts.keys.map(k => (filmClips().find(c => c.key === k) ?? { key: k, t: 3 }))
  : opts.all ? allScenes() : filmClips()

mkdirSync(OUT, { recursive: true })

function shot(key, t, port, file) {
  const r = spawnSync('node', [
    'scripts/eval.mjs', '--act', key, '--t', String(t), '--port', String(port),
    '--size', opts.size, '--wait', String(opts.wait), "'ok'", '--shot', file,
  ], { encoding: 'utf8' })
  return r.status === 0 && existsSync(file)
}

/** SSIM of two PNGs, or null if ffmpeg could not compare them. */
function ssim(a, b) {
  const r = spawnSync(FFMPEG, ['-hide_banner', '-i', a, '-i', b, '-lavfi', 'ssim', '-f', 'null', '-'],
    { encoding: 'utf8' })
  const m = /All:([\d.]+)/.exec(`${r.stdout ?? ''}${r.stderr ?? ''}`)
  return m ? parseFloat(m[1]) : null
}

console.log(`parity: :${opts.a} (this branch) vs :${opts.b} (reference) · ${clips.length} scene(s) @ ${opts.size}\n`)

const rows = []
for (const { key, t } of clips) {
  const safe = key.replace(/[^\w-]/g, '_')
  const A = path.join(OUT, `S-${safe}.png`)
  const B = path.join(OUT, `M-${safe}.png`)
  const okA = shot(key, t, opts.a, A)
  const okB = shot(key, t, opts.b, B)
  const v = okA && okB ? ssim(A, B) : null
  rows.push({ key, t, v })
  const verdict = v == null ? 'COULD NOT COMPARE' : v >= 0.9999 ? 'identical' : `DIFFERS  ${v.toFixed(6)}`
  console.log(`  ${key.padEnd(9)} t=${String(t).padEnd(7)} ${verdict}`)
}

writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(rows, null, 2))
const bad = rows.filter(r => r.v == null || r.v < 0.9999)
console.log(`\nparity: ${rows.length - bad.length}/${rows.length} identical`)
if (bad.length) {
  console.log(`  differing: ${bad.map(r => r.key).join(', ')}`)
  console.log(`  frames are in ${OUT}/ as S-<key>.png (this branch) and M-<key>.png (reference)`)
  process.exit(1)
}
