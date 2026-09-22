#!/usr/bin/env node
/**
 * review.mjs — scrubbable review page for rendered masters.
 *
 * Serves an mp4 with HTTP Range support (so seeking works in a browser
 * <video> and in VLC-over-HTTP) plus a review page: scrub bar, scene chips
 * parsed from src/remotion/timeline.ts (click to jump to a slot), keyboard
 * frame-stepping, and a readout of film time + the scene key under the
 * playhead.
 *
 * Usage:
 *   node scripts/review.mjs                       # newest mp4 in out/renders
 *   node scripts/review.mjs out/renders/spotcheck.mp4 --port 8090
 *
 * Then open  http://<box-ip>:8090/  in a browser, or
 *            vlc http://<box-ip>:8090/video       (seekable, unlike ssh|vlc -)
 */
import { createServer } from 'http'
import { createReadStream, readFileSync, readdirSync, statSync } from 'fs'
import path from 'path'
import { networkInterfaces } from 'os'

const args = process.argv.slice(2)
let fixedFile = null
let port = 8090
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--port') port = parseInt(args[++i], 10) || 8090
  else fixedFile = args[i]
}

/** With no file argument the server FOLLOWS the newest mp4 in out/renders,
 *  re-resolved on every request — so one long-running instance always serves
 *  the latest render and never needs restarting after a re-render. */
function newestMp4() {
  const dir = 'out/renders'
  const mp4s = readdirSync(dir).filter(f => f.endsWith('.mp4') && !f.endsWith('.noaudio.mp4'))
    .map(f => ({ f: path.join(dir, f), m: statSync(path.join(dir, f)).mtimeMs }))
    .sort((a, b) => b.m - a.m)
  if (!mp4s.length) { console.error('no mp4 in out/renders'); process.exit(1) }
  return mp4s[0].f
}
function currentFile() {
  return fixedFile ?? newestMp4()
}
const file = currentFile()
const size = statSync(file).size

// Same one-line-literal regex contract as render-fast.mjs. Re-parsed per
// page load so a retimed timeline shows fresh chips without a restart.
function timelineItems() {
  const timelineSrc = readFileSync('src/remotion/timeline.ts', 'utf8')
  const items = []
  const re = /\{\s*key:\s*'([^']+)'\s*,\s*from:\s*([\d.]+)\s*,\s*duration:\s*([\d.]+)/g
  for (let m; (m = re.exec(timelineSrc)); ) {
    items.push({ key: m[1], from: parseFloat(m[2]), duration: parseFloat(m[3]) })
  }
  items.sort((a, b) => a.from - b.from)
  return items
}

const buildPage = (file, items, total) => /* html */`<!doctype html>
<meta charset="utf-8">
<title>review — ${path.basename(file)}</title>
<style>
  body { margin: 0; background: #0b0e14; color: #cdd6e4; font: 13px/1.5 system-ui, sans-serif; }
  main { max-width: 1100px; margin: 18px auto; padding: 0 16px; }
  video { width: 100%; background: #000; border-radius: 6px; outline: none; }
  .bar { position: relative; height: 34px; margin: 10px 0 4px; background: #161b26; border-radius: 4px; overflow: hidden; }
  .slot { position: absolute; top: 0; bottom: 0; border-right: 1px solid #0b0e14; cursor: pointer;
          display: flex; align-items: center; justify-content: center; overflow: hidden;
          color: #8fa0b8; font-size: 10px; white-space: nowrap; background: #1d2534; }
  .slot:hover { background: #2a3550; color: #dfe8f5; }
  .slot.on { background: #3d5a99; color: #fff; }
  .head { position: absolute; top: 0; bottom: 0; width: 2px; background: #e8b04a; pointer-events: none; }
  .row { display: flex; gap: 16px; align-items: baseline; margin-top: 6px; flex-wrap: wrap; }
  .big { font-size: 18px; color: #e8b04a; font-variant-numeric: tabular-nums; }
  kbd { background: #1d2534; border-radius: 3px; padding: 1px 5px; font-size: 11px; }
  .hint { color: #5c6a80; }
</style>
<main>
  <video id="v" src="/video" controls preload="auto"></video>
  <div class="bar" id="bar"><div class="head" id="head"></div></div>
  <div class="row">
    <span class="big" id="t">0:00.00</span>
    <span id="scene"></span>
    <span class="hint">
      <kbd>space</kbd> play/pause · <kbd>←</kbd><kbd>→</kbd> frame · shift ×12 ·
      <kbd>↑</kbd><kbd>↓</kbd> scene · <kbd>,</kbd><kbd>.</kbd> 10s · click a slot to jump
    </span>
  </div>
</main>
<script>
  const ITEMS = ${JSON.stringify(items)}
  const TOTAL = ${total}
  const FPS = 12  // display stepping granularity; harmless if the file differs
  const v = document.getElementById('v')
  const bar = document.getElementById('bar')
  const head = document.getElementById('head')
  const tEl = document.getElementById('t')
  const sceneEl = document.getElementById('scene')
  const slots = ITEMS.map(it => {
    const d = document.createElement('div')
    d.className = 'slot'
    d.style.left = (it.from / TOTAL * 100) + '%'
    d.style.width = (it.duration / TOTAL * 100) + '%'
    d.textContent = it.key
    d.title = it.key + '  ' + it.from + 's +' + it.duration + 's'
    d.onclick = () => { v.currentTime = it.from + 0.01; v.pause() }
    bar.appendChild(d)
    return d
  })
  function fmt(t) {
    const m = Math.floor(t / 60), s = (t % 60).toFixed(2).padStart(5, '0')
    return m + ':' + s
  }
  function tick() {
    const t = v.currentTime
    head.style.left = (t / TOTAL * 100) + '%'
    tEl.textContent = fmt(t)
    let cur = -1
    ITEMS.forEach((it, i) => { if (t >= it.from && t < it.from + it.duration) cur = i })
    slots.forEach((d, i) => d.classList.toggle('on', i === cur))
    sceneEl.textContent = cur >= 0 ? 'scene ' + ITEMS[cur].key : ''
    requestAnimationFrame(tick)
  }
  tick()
  addEventListener('keydown', e => {
    if (e.target === v && e.code === 'Space') return  // native handling
    const cur = ITEMS.findIndex(it => v.currentTime >= it.from && v.currentTime < it.from + it.duration)
    if (e.code === 'Space') { v.paused ? v.play() : v.pause(); e.preventDefault() }
    else if (e.key === 'ArrowRight') { v.pause(); v.currentTime += (e.shiftKey ? 12 : 1) / FPS; e.preventDefault() }
    else if (e.key === 'ArrowLeft') { v.pause(); v.currentTime -= (e.shiftKey ? 12 : 1) / FPS; e.preventDefault() }
    else if (e.key === 'ArrowDown') { if (cur < ITEMS.length - 1) v.currentTime = ITEMS[cur + 1].from + 0.01; e.preventDefault() }
    else if (e.key === 'ArrowUp') { if (cur > 0) v.currentTime = ITEMS[cur - 1].from + 0.01; e.preventDefault() }
    else if (e.key === '.') { v.currentTime += 10 }
    else if (e.key === ',') { v.currentTime -= 10 }
  })
</script>`

const server = createServer((req, res) => {
  if (req.url === '/' || req.url === '/index.html') {
    const items = timelineItems()
    const total = items.length ? items[items.length - 1].from + items[items.length - 1].duration : 190
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
    res.end(buildPage(currentFile(), items, total))
    return
  }
  if (req.url === '/video') {
    const f = currentFile()
    const sz = statSync(f).size
    const range = req.headers.range
    if (range) {
      // VLC probes EOF with `bytes=<filesize>-` (start one past the last
      // byte); an unclamped start > end makes createReadStream THROW and the
      // uncaught exception took the whole server down mid-session. RFC 7233:
      // an unsatisfiable range gets a 416 with the `*/size` form, a
      // satisfiable one gets its end clamped to the file.
      const m = /bytes=(\d*)-(\d*)/.exec(range)
      const start = m?.[1] ? parseInt(m[1], 10) : 0
      const end = m?.[2] ? Math.min(parseInt(m[2], 10), sz - 1) : sz - 1
      if (!m || start >= sz || start > end) {
        res.writeHead(416, { 'Content-Range': `bytes */${sz}` })
        res.end()
        return
      }
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${sz}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': end - start + 1,
        'Content-Type': 'video/mp4',
      })
      createReadStream(f, { start, end }).pipe(res)
    } else {
      res.writeHead(200, { 'Content-Length': sz, 'Content-Type': 'video/mp4', 'Accept-Ranges': 'bytes' })
      createReadStream(f).pipe(res)
    }
    return
  }
  res.writeHead(404)
  res.end('not found')
})

server.listen(port, '0.0.0.0', () => {
  const ip = Object.values(networkInterfaces()).flat()
    .find(i => i && !i.internal && i.family === 'IPv4')?.address ?? 'localhost'
  console.log(`review: ${file} (${(size / 1e6).toFixed(1)} MB)`)
  console.log(`  page:  http://${ip}:${port}/`)
  console.log(`  vlc:   vlc http://${ip}:${port}/video`)
})
