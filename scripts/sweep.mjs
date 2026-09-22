#!/usr/bin/env node
/**
 * sweep.mjs — smoke-test every scene: screenshot each act key and report
 * page errors, so refactors that break scenes get caught in one run.
 *
 * Usage:
 *   node scripts/sweep.mjs                  # all keys from src/App.tsx (~93)
 *   node scripts/sweep.mjs --filter 4.      # only keys containing "4."
 *   node scripts/sweep.mjs --t 3 --wait 6000 --concurrency 4
 *
 * Output: one PNG per act in --out (default out/screenshots/sweep/), a
 * per-act status line, and a failure summary. Exits non-zero if any scene
 * threw a page exception or produced a blank capture.
 */
import { writeFileSync, mkdirSync } from 'fs'
import path from 'path'
import { launchChrome, assertServerUp, sleep } from './lib/chrome.mjs'
import { listActKeys } from './lib/acts.mjs'

const HELP = `sweep.mjs — screenshot every scene and report page errors

Usage:
  node scripts/sweep.mjs [options]

Options:
  --filter S       Only act keys containing substring S (case-sensitive).
  --t SEC          Load each scene frozen at this anim time (?t=SEC).
  --wait MS        Settle wait per scene after canvas appears (default 4000).
  --size WxH       Viewport, default 960x540 (small = faster sweep).
  --concurrency N  Parallel Chrome sessions (default 3).
  --out DIR        Output directory (default out/screenshots/sweep).
  --port N         Dev server port (default 5173).
  --help           Show this help.

A scene FAILS if its page threw an exception, logged console errors, or the
capture stayed blank after retries. The final summary lists failures with
their first error; exit code is 1 if anything failed.
`

function fail(msg) {
  console.error(`sweep.mjs: ${msg}`)
  console.error('Run with --help for usage.')
  process.exit(1)
}

const opts = {
  filter: null, t: null, wait: 4000, width: 960, height: 540,
  concurrency: 3, out: 'out/screenshots/sweep', port: 5173,
}
{
  const argv = process.argv.slice(2)
  const takesValue = new Set(['--filter', '--t', '--wait', '--size', '--concurrency', '--out', '--port'])
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
      case '--filter': opts.filter = val; break
      case '--t': opts.t = val; break
      case '--wait': {
        const n = Number(val)
        if (!Number.isFinite(n) || n < 0) fail(`--wait expects milliseconds (got "${val}")`)
        opts.wait = n
        break
      }
      case '--size': {
        const m = /^(\d+)x(\d+)$/i.exec(val || '')
        if (!m) fail(`--size expects WxH (got "${val}")`)
        opts.width = Number(m[1]); opts.height = Number(m[2])
        break
      }
      case '--concurrency': {
        const n = Number(val)
        if (!Number.isInteger(n) || n < 1 || n > 8) fail(`--concurrency expects 1-8 (got "${val}")`)
        opts.concurrency = n
        break
      }
      case '--out': opts.out = val; break
      case '--port': {
        const n = Number(val)
        if (!Number.isInteger(n) || n <= 0) fail(`--port expects an integer (got "${val}")`)
        opts.port = n
        break
      }
      default:
        fail(`unknown option: ${arg}`)
    }
  }
}

let keys
try {
  keys = listActKeys()
} catch (e) {
  fail(e.message)
}
if (opts.filter) keys = keys.filter(k => k.includes(opts.filter))
if (keys.length === 0) fail(`no act keys match filter "${opts.filter}"`)

const outDir = path.resolve(opts.out)
mkdirSync(outDir, { recursive: true })

const baseUrl = `http://localhost:${opts.port}/`
try {
  await assertServerUp(baseUrl, opts.port)
} catch (e) {
  fail(e.message)
}

console.log(`sweeping ${keys.length} scene(s), concurrency ${opts.concurrency}, out ${outDir}`)

async function sweepOne(key) {
  const params = new URLSearchParams()
  params.set('act', key)
  if (opts.t !== null) params.set('t', String(opts.t))
  params.set('ui', '0')
  const url = `${baseUrl}?${params.toString()}`

  const result = { key, ok: true, blank: false, errors: [] }
  let session = null
  try {
    session = await launchChrome({ url, width: opts.width, height: opts.height })
    await session.waitForCanvas(30)
    await sleep(opts.wait)
    const buf = await session.screenshot()
    result.blank = buf.length < 25000
    writeFileSync(path.join(outDir, `${key}.png`), buf)
    result.errors = session.errorMsgs.slice()
  } catch (e) {
    result.errors.push(`sweep: ${e.message}`)
  } finally {
    await session?.close()
  }
  result.ok = result.errors.length === 0 && !result.blank
  const status = result.ok ? ' ok ' : result.blank ? 'BLANK' : 'ERROR'
  console.log(`[${status}] ${key}${result.errors.length ? ` — ${result.errors[0].slice(0, 120)}` : ''}`)
  return result
}

// Simple worker pool
const queue = keys.slice()
const results = []
await Promise.all(Array.from({ length: Math.min(opts.concurrency, queue.length) }, async () => {
  while (queue.length > 0) {
    const key = queue.shift()
    results.push(await sweepOne(key))
  }
}))

const failed = results.filter(r => !r.ok)
console.log(`\n${results.length - failed.length}/${results.length} scenes clean`)
if (failed.length > 0) {
  console.log('failures:')
  for (const r of failed) {
    console.log(`  ${r.key}${r.blank ? ' (blank capture)' : ''}`)
    for (const e of r.errors.slice(0, 3)) console.log(`    ${e.slice(0, 200)}`)
  }
}
process.exit(failed.length > 0 ? 1 : 0)
