import { spawn } from 'child_process'
import http from 'http'
import { createRequire } from 'module'
import { writeFileSync } from 'fs'
const require = createRequire(import.meta.url)
const WebSocket = require('ws')

const port = 9237
const url = process.argv[2] || 'http://localhost:5173/?act=char-human-a'
const out = process.argv[3] || 'out/screenshots/char-human-a-debug.png'
const sleep = ms => new Promise(r => setTimeout(r, ms))

const chrome = spawn('google-chrome', [
  '--headless=new', '--enable-unsafe-swiftshader', '--enable-webgl',
  '--use-angle=swiftshader', '--disable-dev-shm-usage',
  `--remote-debugging-port=${port}`, '--window-size=1920,1080',
  '--no-sandbox', url
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

  // Collect console messages
  const consoleMsgs = []
  ws.on('message', (m) => {
    const msg = JSON.parse(m.toString())
    if (msg.method === 'Runtime.consoleAPICalled') {
      const text = msg.params.args.map(a => a.value || a.description || '').join(' ')
      consoleMsgs.push(`[${msg.params.type}] ${text}`)
    }
    if (msg.method === 'Runtime.exceptionThrown') {
      consoleMsgs.push(`[EXCEPTION] ${JSON.stringify(msg.params.exceptionDetails?.exception?.description || msg.params)}`)
    }
  })

  // Wait for canvas
  for (let i = 0; i < 30; i++) {
    const check = await cdp('Runtime.evaluate', {
      expression: `!!document.querySelector('canvas')`
    })
    if (check?.result?.value === true) {
      console.log(`Canvas appeared at check ${i + 1}`)
      break
    }
    await sleep(1000)
  }

  // Wait 10 seconds for model loading
  console.log('Waiting 10s for model loading...')
  await sleep(10000)

  console.log('=== Console messages ===')
  consoleMsgs.forEach(m => console.log(m))
  console.log('=== End ===')

  // Check WebGL status
  const glInfo = await cdp('Runtime.evaluate', {
    expression: `(() => {
      const c = document.querySelector('canvas');
      if (!c) return 'no canvas';
      const gl = c.getContext('webgl2') || c.getContext('webgl');
      if (!gl) return 'no gl context on existing canvas';
      return 'GL: ' + gl.getParameter(gl.RENDERER) + ' | canvas: ' + c.width + 'x' + c.height;
    })()`,
    returnByValue: true
  })
  console.log('GL Info:', glInfo?.result?.value)

  // Try Page.captureScreenshot (DOM-level, not canvas)
  const ss = await cdp('Page.captureScreenshot', { format: 'png' }, 20000)
  if (ss?.data) {
    const buf = Buffer.from(ss.data, 'base64')
    writeFileSync(out, buf)
    console.log(`Saved page screenshot: ${buf.length} bytes -> ${out}`)
  }

  ws.close()
} catch (e) {
  console.error('Error:', e.message)
} finally {
  chrome.kill('SIGTERM')
  await sleep(500)
}
