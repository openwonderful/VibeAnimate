/**
 * FrameGovernor — Blender-grade viewport economy for the studio.
 *
 * 1. Demand rendering: while the anim clock is paused and nothing is
 *    interacting (no orbit camera, no gizmo drag), the frameloop drops to
 *    'demand' — the viewport costs ~zero GPU at rest, exactly like a 3D
 *    DCC that only redraws on interaction. Seeks, pointer activity,
 *    gizmo/console edits all invalidate a frame.
 * 2. Adaptive DPR: while playing, an FPS EMA steps the pixel ratio down
 *    (1.5 → 0.65) when the scene can't hold ~45fps and back up when it
 *    comfortably can — user-generated scenes degrade resolution, never
 *    responsiveness.
 * 3. Stats: draw calls / triangles / fps / dpr sampled into the perf
 *    store 4×/s for the viewport's stats chip.
 *
 * Mounted only inside the studio viewport (SceneCanvas gates on
 * IS_STUDIO_APP) — plain ?act= pages and Remotion renders are untouched.
 */
import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { isAnimPlaying, subscribeAnimControl } from '../../hooks/useAnimTime'
import { useDebugCameraEnabled } from '../../scenes/DebugCamera'
import { subscribeEditables, subscribeEditableTransforms, isGizmoDragging, reportPerf } from './store'

const DPR_STEPS = [1.5, 1.25, 1, 0.8, 0.65]

export function FrameGovernor() {
  const gl = useThree(s => s.gl)
  const setDpr = useThree(s => s.setDpr)
  const setFrameloop = useThree(s => s.setFrameloop)
  const invalidate = useThree(s => s.invalidate)
  const orbit = useDebugCameraEnabled()

  const step = useRef(0)

  // Initial DPR: device ratio capped at 1.5 (the viewport is a sub-panel;
  // full-res retina buys little and costs a lot on integrated GPUs).
  useEffect(() => {
    const initial = Math.min(window.devicePixelRatio || 1, DPR_STEPS[0])
    let idx = DPR_STEPS.findIndex(s => s <= initial + 1e-3)
    if (idx < 0) idx = DPR_STEPS.length - 1
    step.current = idx
    setDpr(DPR_STEPS[idx])
  }, [setDpr])

  // Frameloop policy + invalidation sources.
  useEffect(() => {
    const apply = () => {
      const active = isAnimPlaying() || orbit || isGizmoDragging()
      setFrameloop(active ? 'always' : 'demand')
      invalidate()
    }
    apply()
    const unsubs = [
      subscribeAnimControl(apply),          // play/pause/seek/speed
      subscribeEditables(apply),            // selection & gizmo-drag state
      subscribeEditableTransforms(() => invalidate()), // console/sidebar edits
    ]
    const el = gl.domElement
    const poke = () => invalidate()
    el.addEventListener('pointerdown', poke)
    el.addEventListener('pointermove', poke)
    el.addEventListener('wheel', poke, { passive: true })
    return () => {
      unsubs.forEach(u => u())
      el.removeEventListener('pointerdown', poke)
      el.removeEventListener('pointermove', poke)
      el.removeEventListener('wheel', poke)
      setFrameloop('always')
    }
  }, [orbit, gl, setFrameloop, invalidate])

  // Manual gl.info lifecycle so per-frame draw counts survive to be read.
  // (three resets the counters at the start of each render; useFrame runs
  // before that, so autoReset must be off for the stats to be meaningful.
  // Mutating the renderer's own state is the documented way to do it.)
  useEffect(() => {
    const info = gl.info
    const prev = info.autoReset
    /* eslint-disable-next-line react-hooks/immutability -- three.js renderer state, not React state */
    info.autoReset = false
    return () => { info.autoReset = prev }
  }, [gl])

  const ema = useRef(60)
  const below = useRef(0)
  const above = useRef(0)
  const acc = useRef(1) // report immediately on first frame
  const peakCalls = useRef(0)
  const peakTris = useRef(0)

  useFrame((state, delta) => {
    // Read last frame's counters, then reset for the coming render. Report
    // the peak over the sampling window: scenes that render through an
    // EffectComposer (or otherwise take over the loop) leave a zeroed
    // counter on some frames, and a peak-hold reads honestly for both.
    peakCalls.current = Math.max(peakCalls.current, gl.info.render.calls)
    peakTris.current = Math.max(peakTris.current, gl.info.render.triangles)
    gl.info.reset()

    if (delta > 1e-4 && delta < 0.5) ema.current = ema.current * 0.9 + (1 / delta) * 0.1

    // Adaptive DPR — judged only during playback (paused frames are free).
    if (isAnimPlaying()) {
      if (ema.current < 45) {
        below.current++
        if (below.current > 45 && step.current < DPR_STEPS.length - 1) {
          step.current++
          setDpr(DPR_STEPS[step.current])
          below.current = 0
        }
      } else below.current = 0
      if (ema.current > 57) {
        above.current++
        if (above.current > 240 && step.current > 0) {
          step.current--
          setDpr(DPR_STEPS[step.current])
          above.current = 0
        }
      } else above.current = 0
    }

    acc.current += delta
    if (acc.current > 0.25) {
      acc.current = 0
      reportPerf({
        fps: Math.round(ema.current),
        dpr: DPR_STEPS[step.current],
        calls: peakCalls.current,
        triangles: peakTris.current,
        frameloop: state.frameloop,
      })
      peakCalls.current = 0
      peakTris.current = 0
    }
  })

  return null
}
