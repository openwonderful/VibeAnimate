/**
 * LiveCapture — the viewport half of the live AI render (features_1.md §7b).
 *
 * Mounted INSIDE the scene's canvas by StudioViewportTools. While the `live`
 * pref is on and the server has no frame in flight, each rendered frame
 * produces two things and hands them to the live store:
 *
 *   colour — the drawing buffer, scaled to 512×288 and JPEG-encoded. Read
 *            off `gl.domElement` (the studio canvas keeps its buffer, see
 *            SceneCanvas), so bloom, grade and every post pass are in it.
 *            It is the PREVIOUS frame: useFrame runs before R3F renders.
 *            One frame of skew at 30fps, accepted — the model adds far more.
 *   depth  — a second render of the scene at 512×288 with a depth override
 *            material into a small render target, unpacked, linearised
 *            with the camera's near/far, and normalised to the frame's own
 *            2nd–98th percentile range (smoothed) so a close-up and a
 *            24 000-unit valley both fill the 8 bits. NEAR = WHITE, the
 *            convention the depth ControlNets were trained on. Additive
 *            point clouds (stars, souls) write depth like anything else,
 *            which reads as "far" once normalised — what a sky should be.
 *
 * Only the scene ON TOP captures (`[data-on-top="1"]`), so the prefetched
 * next clip never sends frames. Off = this component allocates nothing.
 */
import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { subscribePrefs, useStudioPrefs } from '../state/prefs'
import { LIVE_H, LIVE_W, liveWantsFrame, sendFrame, subscribeLive } from './store'

// three r183 packDepthToRGBA: R carries the integer byte (most significant),
// A the last fraction. unpackRGBAToDepth is dot(rgba/255, UnpackFactors4)
// with UnpackFactors4 = (255/256) / (1, 256, 65536) and 1 / 16777216 — folded
// here into per-BYTE factors so the loop reads the Uint8Array directly.
const UNPACK = [1 / 256, 1 / 65536, 1 / 16777216, 1 / (255 * 16777216)]

export function LiveCapture() {
  const on = useStudioPrefs().liveRender
  return on ? <Capture /> : null
}

function Capture() {
  const gl = useThree(s => s.gl)
  const scene = useThree(s => s.scene)
  const camera = useThree(s => s.camera)
  const invalidate = useThree(s => s.invalidate)

  // The governor parks the frameloop on 'demand' while paused. Live means a
  // reply (or a prompt edit) asks for the next frame even then — that is how
  // the prompt box is tuned on a parked frame.
  useEffect(() => {
    const u1 = subscribeLive(() => invalidate())
    const u2 = subscribePrefs(() => invalidate())
    return () => { u1(); u2() }
  }, [invalidate])

  const rt = useMemo(() => new THREE.WebGLRenderTarget(LIVE_W, LIVE_H, {
    minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter,
    type: THREE.UnsignedByteType, depthBuffer: true, stencilBuffer: false,
  }), [])
  const depthMat = useMemo(() => new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking }), [])
  const pixels = useMemo(() => new Uint8Array(LIVE_W * LIVE_H * 4), [])
  const depthOut = useMemo(() => new Uint8Array(LIVE_W * LIVE_H), [])
  const dist = useMemo(() => new Float32Array(LIVE_W * LIVE_H), [])
  const hist = useMemo(() => new Uint32Array(1024), [])
  const canvas2d = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = LIVE_W; c.height = LIVE_H
    return c
  }, [])
  // Smoothed depth window, so the normalisation does not pump frame to frame.
  const range = useRef<{ lo: number; hi: number } | null>(null)
  const busy = useRef(false)

  useEffect(() => () => { rt.dispose(); depthMat.dispose() }, [rt, depthMat])

  // Tooling: the last depth map, viewable — how the normalisation is checked
  // by eye on the tree (3.2) and the souls (8.55) rather than trusted.
  useEffect(() => {
    window.__liveDepth = () => {
      const c = document.createElement('canvas')
      c.width = LIVE_W; c.height = LIVE_H
      const ctx = c.getContext('2d')!
      const img = ctx.createImageData(LIVE_W, LIVE_H)
      for (let i = 0; i < LIVE_W * LIVE_H; i++) {
        const v = depthOut[i]
        img.data[i * 4] = v; img.data[i * 4 + 1] = v; img.data[i * 4 + 2] = v; img.data[i * 4 + 3] = 255
      }
      ctx.putImageData(img, 0, 0)
      return c.toDataURL('image/png')
    }
    return () => { delete window.__liveDepth }
  }, [depthOut])

  useFrame(() => {
    if (busy.current || !liveWantsFrame()) return
    const el = gl.domElement
    if (!el.closest('[data-on-top="1"]')) return
    const sceneKey = el.closest<HTMLElement>('[data-scene]')?.dataset.scene ?? ''
    busy.current = true

    // ── depth pass ──
    const prevRT = gl.getRenderTarget()
    const prevOverride = scene.overrideMaterial
    const prevAutoClear = gl.autoClear
    const prevClear = new THREE.Color()
    gl.getClearColor(prevClear)
    const prevAlpha = gl.getClearAlpha()
    // Overlays that do not occlude in the picture must not occlude in the
    // depth: glow planes, fog cards, billboards and additive point clouds
    // all draw with depthWrite off (or nearly transparent), and an override
    // material would otherwise turn every one of them into a wall.
    const hidden: THREE.Object3D[] = []
    scene.traverse(o => {
      const m = (o as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined
      if (!m || !o.visible) return
      const mat = Array.isArray(m) ? m[0] : m
      if (mat && (mat.depthWrite === false || (mat.transparent && mat.opacity < 0.35))) {
        o.visible = false
        hidden.push(o)
      }
    })
    try {
      scene.overrideMaterial = depthMat
      gl.setRenderTarget(rt)
      gl.setClearColor(0xffffff, 1) // no geometry = far
      gl.autoClear = true
      gl.clear()
      gl.render(scene, camera)
      gl.readRenderTargetPixels(rt, 0, 0, LIVE_W, LIVE_H, pixels)
    } finally {
      for (const o of hidden) o.visible = true
      scene.overrideMaterial = prevOverride
      gl.setRenderTarget(prevRT)
      gl.setClearColor(prevClear, prevAlpha)
      gl.autoClear = prevAutoClear
    }

    const cam = camera as THREE.PerspectiveCamera
    const near = cam.near, far = cam.far
    const n = LIVE_W * LIVE_H
    let cleared = 0
    for (let i = 0; i < n; i++) {
      const o = i * 4
      const z = pixels[o] * UNPACK[0] + pixels[o + 1] * UNPACK[1] + pixels[o + 2] * UNPACK[2] + pixels[o + 3] * UNPACK[3]
      if (z >= 0.9999) { dist[i] = -1; cleared++; continue }
      // perspectiveDepthToViewZ, distance made positive
      dist[i] = -(near * far) / ((far - near) * z - far)
    }
    // Percentile window over covered pixels (log-spaced bins: the valley
    // spans four orders of magnitude and a linear histogram would put every
    // near thing in bin 0).
    let lo = near, hi = far
    if (cleared < n) {
      hist.fill(0)
      const lmin = Math.log(near), lmax = Math.log(far), ls = 1023 / (lmax - lmin)
      for (let i = 0; i < n; i++) {
        const d = dist[i]
        if (d < 0) continue
        const b = Math.min(1023, Math.max(0, ((Math.log(d) - lmin) * ls) | 0))
        hist[b]++
      }
      const covered = n - cleared
      let acc = 0, bLo = 0, bHi = 1023
      for (let b = 0; b < 1024; b++) { acc += hist[b]; if (acc >= covered * 0.02) { bLo = b; break } }
      acc = 0
      for (let b = 1023; b >= 0; b--) { acc += hist[b]; if (acc >= covered * 0.02) { bHi = b; break } }
      lo = Math.exp(lmin + bLo / ls)
      hi = Math.exp(lmin + (bHi + 1) / ls)
      if (hi <= lo * 1.01) hi = lo * 1.5
    }
    const r = range.current
    if (!r) range.current = { lo, hi }
    else { r.lo = r.lo * 0.85 + lo * 0.15; r.hi = r.hi * 0.85 + hi * 0.15 }
    const { lo: L, hi: H } = range.current!
    const lL = Math.log(L), lH = Math.log(H), inv = 1 / Math.max(1e-6, lH - lL)
    // The render target is bottom-up; the JPEG is top-down. Flip rows here.
    for (let y = 0; y < LIVE_H; y++) {
      const src = (LIVE_H - 1 - y) * LIVE_W
      const dst = y * LIVE_W
      for (let x = 0; x < LIVE_W; x++) {
        const d = dist[src + x]
        if (d < 0) { depthOut[dst + x] = 0; continue }
        const t = (Math.log(d) - lL) * inv
        depthOut[dst + x] = Math.round(255 * (1 - Math.min(1, Math.max(0, t))))
      }
    }
    const depthBuf = depthOut.slice().buffer

    // ── colour pass ──
    // Synchronous encode on purpose: `toBlob` schedules its callback as a
    // task, and while a heavy scene is playing the main thread never yields
    // long enough for it to land — measured 0.7 fps on the flight with the
    // model idle. toDataURL of 512×288 is ~2ms and returns now.
    const ctx = canvas2d.getContext('2d')!
    ctx.drawImage(el, 0, 0, LIVE_W, LIVE_H)
    const b64 = canvas2d.toDataURL('image/jpeg', 0.85)
    const bin = atob(b64.slice(b64.indexOf(',') + 1))
    const jpeg = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) jpeg[i] = bin.charCodeAt(i)
    sendFrame(sceneKey, jpeg.buffer, depthBuf)
    busy.current = false
  })

  return null
}
