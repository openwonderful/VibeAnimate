import { spawn } from 'child_process'
import http from 'http'
import { createRequire } from 'module'
import { writeFileSync } from 'fs'
const require = createRequire(import.meta.url)
const WebSocket = require('ws')

// Parse args: URL, OUTPUT, --port=XXXX
const args = process.argv.slice(2)
const portArg = args.find(a => a.startsWith('--port='))
const port = portArg ? parseInt(portArg.split('=')[1]) : 9229
const positional = args.filter(a => !a.startsWith('--'))
const url = positional[0] || 'http://localhost:5173/?act=char-crystal'
const out = positional[1] || 'out/screenshots/char-test.png'
const sleep = ms => new Promise(r => setTimeout(r, ms))

console.log(`URL: ${url}`)
console.log(`Output: ${out}`)
console.log(`Chrome debug port: ${port}`)

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
  console.log('Waiting for page to load...')
  const tab = await tryConnect(port)
  if (!tab?.webSocketDebuggerUrl) throw new Error('Tab not found')
  console.log('Tab found:', tab.url)

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

  // Wait for canvas
  console.log('Polling for canvas...')
  for (let i = 0; i < 30; i++) {
    const check = await cdp('Runtime.evaluate', {
      expression: `!!document.querySelector('canvas')`
    })
    if (check?.result?.value === true) {
      console.log(`Canvas appeared at check ${i + 1}`)
      break
    }
    if (i === 29) console.log('Canvas never appeared')
    await sleep(1000)
  }

  // Extra render time
  console.log('Waiting 5s for GL render...')
  await sleep(5000)

  // Try canvas toDataURL
  console.log('Trying canvas.toDataURL...')
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
    console.log(`Saved canvas capture: ${buf.length} bytes → ${out}`)
  } else {
    console.log('Canvas result:', typeof val === 'string' ? val.substring(0, 100) : val)

    // Fallback to Page.captureScreenshot
    console.log('Falling back to Page.captureScreenshot...')
    try {
      const ss = await cdp('Page.captureScreenshot', { format: 'png' }, 20000)
      if (ss?.data) {
        const buf = Buffer.from(ss.data, 'base64')
        writeFileSync(out, buf)
        console.log(`Saved page screenshot: ${buf.length} bytes → ${out}`)
      }
    } catch (e2) {
      console.error('Page screenshot also failed:', e2.message)
    }
  }

  ws.close()
} catch (e) {
  console.error('Error:', e.message)
} finally {
  chrome.kill('SIGTERM')
  await sleep(500)
}
