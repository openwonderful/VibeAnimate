/**
 * Screenshot using desktop GL (not SwiftShader). Requires real GPU + display.
 * Falls back to EGL, then to ozone/vulkan if needed.
 */
import { spawn } from 'child_process'
import http from 'http'
import { createRequire } from 'module'
import { writeFileSync } from 'fs'
const require = createRequire(import.meta.url)
const WebSocket = require('ws')

const port = parseInt(process.argv.find(a => a.startsWith('--port='))?.split('=')[1] || '9240')
const positional = process.argv.slice(2).filter(a => !a.startsWith('--'))
const url = positional[0] || 'http://localhost:5173/?act=char-human-a'
const out = positional[1] || 'out/screenshots/char-gpu.png'
const sleep = ms => new Promise(r => setTimeout(r, ms))

console.log(`URL: ${url}`)
console.log(`Output: ${out}`)
console.log(`Port: ${port}`)

const chrome = spawn('google-chrome', [
  '--headless=new',
  '--no-sandbox',
  '--disable-dev-shm-usage',
  '--enable-webgl',
  '--use-gl=egl',
  '--enable-gpu',
  `--remote-debugging-port=${port}`,
  '--window-size=1280,720',
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
    if (i === 29) console.log('Canvas never appeared')
    await sleep(1000)
  }

  console.log('Waiting 8s for render...')
  await sleep(8000)

  consoleMsgs.forEach(m => console.log(m))

  // GL info
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

  // Canvas capture first
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
    console.log('Canvas result:', typeof val === 'string' ? val.substring(0, 100) : val)
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
