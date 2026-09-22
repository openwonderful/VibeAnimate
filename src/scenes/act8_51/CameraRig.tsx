/**
 * Act 8.51 camera — one continuous GLIDE, never stopping.
 *
 * v2 changes from 8.5:
 *   - Opens close and low: just the glowing golden figure in front of the
 *     house door. The world beyond is dark. As the crowd ignites, the camera
 *     pulls back and the frame fills with new light.
 *   - Keyframes are interpolated with a time-aware Catmull-Rom (cubic
 *     Hermite with finite-difference tangents), so velocity is continuous
 *     through every key — no ease-in/ease-out "settle" moments. Something
 *     is always moving.
 *   - The bird's-eye phase is itself an orbital arc around the field, so
 *     even the top-down hold keeps drifting/rotating.
 *
 * Driven by the global anim clock; hands the camera off when the debug camera takes over.
 */
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useRef } from 'react'
import { getAnimTime } from '../../hooks/useAnimTime'
import { useCameraHandoff } from '../DebugCamera'
import { T_DROP } from './constants'

type Key = { t: number; pos: [number, number, number]; tgt: [number, number, number]; fov: number }

// The camera keeps ONE bearing (south of the field, looking north) for the
// whole flight — pitch is the only thing that swings. No yaw sweeps, no
// "why is it rotating" moments: rise, hover, sink back down through the
// ascending souls, land, look up.
const KEYS: Key[] = [
  { t: 0.0, pos: [5.4, 1.15, -13.0], tgt: [1.1, 1.0, -20.6], fov: 42 },   // the singer, alone in the dark
  { t: 8.4, pos: [3.1, 1.7, -7.2], tgt: [0.7, 1.1, -22.5], fov: 49 },     // pulling back as light spreads
  { t: 16.2, pos: [-2.2, 4.8, -1.8], tgt: [0.2, 0.8, -25], fov: 55 },     // wide — a field of light now
  { t: 24.6, pos: [-1.2, 41, -13.5], tgt: [0.1, 0, -23.8], fov: 58 },     // risen straight up — bird's eye
  { t: 33.9, pos: [-0.2, 45, -18.5], tgt: [0.15, 0, -24.2], fov: 58 },    // creeping over the field, same bearing
  { t: 41.0, pos: [2.2, 24, 6], tgt: [0.6, 24, -20], fov: 62 },           // sinking WITH the souls streaming up past
  { t: 45.2, pos: [3.6, 0.95, -16.7], tgt: [3.2, 60, -40], fov: 70 },     // gliding onto the road, tilting up
  { t: 48.0, pos: [3.1, 1.15, -17.6], tgt: [4.2, 60, -38.5], fov: 72 },   // still drifting as it ends
]

/** Component-wise cubic Hermite through KEYS with finite-difference tangents
 *  (time-aware Catmull-Rom): C1-continuous — velocity never drops to zero. */
function sampleKeys(t: number, out: { pos: THREE.Vector3; tgt: THREE.Vector3; fov: number }) {
  const n = KEYS.length
  const tc = Math.min(Math.max(t, KEYS[0].t), KEYS[n - 1].t - 1e-4)
  let i = 0
  while (i < n - 2 && tc >= KEYS[i + 1].t) i++
  const a = KEYS[i]
  const b = KEYS[i + 1]
  const dt = b.t - a.t
  const s = (tc - a.t) / dt

  const h00 = (1 + 2 * s) * (1 - s) * (1 - s)
  const h10 = s * (1 - s) * (1 - s)
  const h01 = s * s * (3 - 2 * s)
  const h11 = s * s * (s - 1)

  // Finite-difference tangent at key k for one channel.
  const tan = (k: number, get: (key: Key) => number): number => {
    const prev = KEYS[Math.max(0, k - 1)]
    const next = KEYS[Math.min(n - 1, k + 1)]
    return (get(next) - get(prev)) / (next.t - prev.t)
  }

  const sample = (get: (key: Key) => number): number =>
    h00 * get(a) + h10 * dt * tan(i, get) + h01 * get(b) + h11 * dt * tan(i + 1, get)

  out.pos.set(sample(k => k.pos[0]), sample(k => k.pos[1]), sample(k => k.pos[2]))
  out.tgt.set(sample(k => k.tgt[0]), sample(k => k.tgt[1]), sample(k => k.tgt[2]))
  out.fov = sample(k => k.fov)
}

export function CameraRig() {
  const yieldCamera = useCameraHandoff()
  const state = useRef({ pos: new THREE.Vector3(), tgt: new THREE.Vector3(), fov: 42 })

  useFrame(({ camera }) => {
    if (yieldCamera()) return
    const t = getAnimTime()
    const s = state.current
    sampleKeys(t, s)

    // Breath — barely-there handheld life (invisible at altitude).
    s.pos.x += Math.sin(t * 0.17) * 0.05
    s.pos.y += Math.sin(t * 0.28) * 0.04

    // Beat kick on the drop — a short damped dip.
    if (t > T_DROP) {
      const dt = t - T_DROP
      s.pos.y -= Math.exp(-dt * 5.5) * Math.sin(dt * 16) * 0.4
    }

    camera.position.copy(s.pos)
    camera.lookAt(s.tgt)
    const cam = camera as THREE.PerspectiveCamera
    if (Math.abs(cam.fov - s.fov) > 1e-3) {
      cam.fov = s.fov
      cam.updateProjectionMatrix()
    }
  })

  return null
}
