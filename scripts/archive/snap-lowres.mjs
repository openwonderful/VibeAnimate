/**
 * Ultra low-resolution screenshot with SwiftShader.
 * Uses DPR override to force tiny canvas.
 */
import { spawn } from 'child_process'
import http from 'http'
import { createRequire } from 'module'
import { writeFileSync } from 'fs'
const require = createRequire(import.meta.url)
const WebSocket = require('ws')

const port = 9242
const positional = process.argv.slice(2).filter(a => !a.startsWith('--'))
const url = positional[0] || 'http://localhost:5173/?act=char-human-a&nopp=1'
const out = positional[1] || 'out/screenshots/char-lowres.png'
const sleep = ms => new Promise(r => setTimeout(r, ms))

console.log(`URL: ${url}`)

const chrome = spawn('google-chrome', [
  '--headless=new',
  '--enable-unsafe-swiftshader',
  '--enable-webgl',
  '--use-angle=swiftshader',
  '--disable-dev-shm-usage',
  '--no-sandbox',
  '--force-device-scale-factor=0.5',
  `--remote-debugging-port=${port}`,
  '--window-size=640,480',
  url
], { stdio: 'pipe' })

async function tryConnect(debugPort, retries = 30) {
  for (let i = 0; i < retries; i++) {
    try {
      const data = await new Promise((resolve, reject) => {
        http.get(`http://localhost:${debugPort}/json`, r => {
          let d = ''; r.on('data', c => d += c); r.on('end', () => resolve(d))
        }).on('error', reject)
      })
      const tabs = JSON.parse(data)
      const tab = tabs.find(t => t.url.includes('localhost:5173'))
      if (tab) return tab
    } catch {}
    await sleep(1000)
  }
  return null
}

try {
  const tab = await tryConnect(port)
  if (!tab?.webSocketDebuggerUrl) throw new Error('Tab not found')

  const ws = new WebSocket(tab.webSocketDebuggerUrl)
  await new Promise(r => ws.on('open', r))

  let msgId = 0
  function cdp(method, params = {}, timeout = 15000) {
    return new Promise((resolve, reject) => {
      const id = ++msgId
      const timer = setTimeout(() => reject(new Error(`timeout: ${method}`)), timeout)
      const handler = (m) => {
        const msg = JSON.parse(m.toString())
        if (msg.id === id) {
          ws.removeListener('message', handler)
          clearTimeout(timer)
          resolve(msg.result)
        }
      }
      ws.on('message', handler)
      ws.send(JSON.stringify({ id, method, params }))
    })
  }

  await cdp('Runtime.enable')

  const consoleMsgs = []
  ws.on('message', (m) => {
    const msg = JSON.parse(m.toString())
    if (msg.method === 'Runtime.consoleAPICalled') {
      const text = msg.params.args.map(a => a.value || a.description || '').join(' ')
      consoleMsgs.push(`[${msg.params.type}] ${text}`)
    }
  })

  for (let i = 0; i < 30; i++) {
    const check = await cdp('Runtime.evaluate', {
      expression: `!!document.querySelector('canvas')`
    })
    if (check?.result?.value === true) {
      console.log(`Canvas at check ${i + 1}`)
      break
    }
    await sleep(1000)
  }

  // Force canvas to be very small via R3F's DPR
  await cdp('Runtime.evaluate', {
    expression: `(() => {
      const c = document.querySelector('canvas');
      if (c) {
        c.width = 320;
        c.height = 240;
        console.log('Forced canvas to 320x240');
      }
    })()`
  })

  console.log('Waiting 15s...')
  await sleep(15000)

  consoleMsgs.forEach(m => console.log(m))

  const glInfo = await cdp('Runtime.evaluate', {
    expression: `(() => {
      const c = document.querySelector('canvas');
      if (!c) return 'no canvas';
      const gl = c.getContext('webgl2') || c.getContext('webgl');
      if (!gl) return 'no gl';
      return 'GL: ' + gl.getParameter(gl.RENDERER) + ' | ' + c.width + 'x' + c.height;
    })()`,
    returnByValue: true
  })
  console.log('GL:', glInfo?.result?.value)

  // Canvas capture
  const canvasData = await cdp('Runtime.evaluate', {
    expression: `(() => {
      const c = document.querySelector('canvas');
      if (!c) return null;
      try { return c.toDataURL('image/png'); }
      catch(e) { return 'err:' + e.message; }
    })()`,
    returnByValue: true
  })

  const val = canvasData?.result?.value
  if (val && val.startsWith('data:image')) {
    const b64 = val.replace('data:image/png;base64,', '')
    const buf = Buffer.from(b64, 'base64')
    writeFileSync(out, buf)
    console.log(`Canvas: ${buf.length} bytes -> ${out}`)
  } else {
    console.log('Canvas:', typeof val === 'string' ? val.substring(0, 100) : val)
    const ss = await cdp('Page.captureScreenshot', { format: 'png' }, 20000)
    if (ss?.data) {
      const buf = Buffer.from(ss.data, 'base64')
      writeFileSync(out, buf)
      console.log(`Page: ${buf.length} bytes -> ${out}`)
    }
  }

  ws.close()
} catch (e) {
  console.error('Error:', e.message)
} finally {
  chrome.kill('SIGTERM')
  await sleep(500)
}
