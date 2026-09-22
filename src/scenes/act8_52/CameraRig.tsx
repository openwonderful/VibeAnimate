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

// 8.52: the long ascent. One fixed bearing (south, looking north) so there
// are no yaw rotations — the camera rises to a brief bird's-eye while the
// first orbs lift off, then sinks back DOWN INTO the swarm at ~26s and
// spends the whole middle of the scene swimming among the rising souls,
// tilting up by degrees until the landing look-up.
const KEYS: Key[] = [
  { t: 0.0, pos: [5.4, 1.15, -13.0], tgt: [1.1, 1.0, -20.6], fov: 42 },   // the singer, alone in the dark
  { t: 8.4, pos: [3.1, 1.7, -7.2], tgt: [0.7, 1.1, -22.5], fov: 49 },     // pulling back as light spreads
  { t: 16.2, pos: [-2.2, 4.8, -1.8], tgt: [0.2, 0.8, -25], fov: 55 },     // wide — a field of light now
  { t: 22.0, pos: [-1.0, 30, -8.5], tgt: [0.1, 3, -23.5], fov: 57 },      // brief bird's-eye; first orbs lift
  { t: 26.0, pos: [1.2, 14.5, -6.5], tgt: [0.4, 12.5, -24], fov: 58 },    // descended INTO the swarm
  { t: 31.0, pos: [0.4, 10.5, -11.5], tgt: [-0.4, 15, -30], fov: 60 },    // drifting among the rising orbs
  { t: 36.0, pos: [2.0, 6.8, -14], tgt: [1.2, 24, -33], fov: 63 },        // beat drop wave passes, tilting up
  { t: 41.0, pos: [3.1, 3.0, -15.6], tgt: [2.4, 42, -37], fov: 66 },      // low, looking up the light column
  { t: 45.2, pos: [3.6, 0.95, -16.7], tgt: [3.2, 60, -40], fov: 70 },     // landing on the road, full look-up
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
