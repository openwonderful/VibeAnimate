/**
 * Act 8b camera — 8.55's move, held a few degrees lower at the end.
 *
 * The first pass ran its own route: down out of the sky at 30s to stand on
 * the road among the crowd, then a shallow tilt up. It kept the people in
 * frame and it was wrong. What sells four thousand lights leaving the ground
 * is being AMONG them at altitude while they pass the lens — which is exactly
 * what 8.55's rig does between 22s and 36s, and there is no reason for the two
 * endings to disagree about the best way to watch the same event.
 *
 * So: 8.55's keys verbatim through 36s. Only the last three are changed, and
 * only in the look-at — held lower so the valley floor and the near crowd stay
 * along the bottom edge. That difference is the variant in one number: 8.55 ends
 * on pure sky because there is nobody left down there, and this one can't,
 * because there is.
 *
 * Poses are in village units and mapped into Act B's valley through `toWorld`,
 * exactly as 8.55's rig does — including the fact that the shot now looks DOWN
 * the valley rather than up it. See `act8_55/CameraRig` for why.
 */
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useRef } from 'react'
import { getAnimTime } from '../../hooks/useAnimTime'
import { useCameraHandoff } from '../DebugCamera'
import { OPEN_CAM, T_DROP } from '../act8_55/constants'
import { toWorld } from '../act8_55/locale'

type Key = { t: number; pos: [number, number, number]; tgt: [number, number, number]; fov: number }

const KEYS: Key[] = [
  { t: 0.0, ...OPEN_CAM },                                                 // === 8.55 t=0, and 7.2's last frame
  { t: 8.4, pos: [3.0, 3.2, -22.0], tgt: [0.4, 1.0, -12.0], fov: 51 },     // pulling back as the ring spreads
  { t: 16.2, pos: [2.4, 9.5, -25.0], tgt: [0.2, 0.4, -2.0], fov: 57 },     // high enough to see the lit valley
  { t: 22.0, pos: [1.4, 16.5, -27.0], tgt: [0.2, 0.8, 6.0], fov: 58 },     // high OBLIQUE — never full bird's-eye
  { t: 26.0, pos: [0.6, 13.0, -23.0], tgt: [0.4, 10.0, 2.0], fov: 58 },    // descended INTO the rising field
  { t: 31.0, pos: [0.2, 10.5, -19.0], tgt: [-0.4, 15.0, 6.0], fov: 60 },   // drifting among the lanterns
  // 8.55 aims at y=24 here; 20 keeps the valley floor just inside the bottom
  // edge, so the people never leave the frame entirely.
  { t: 36.0, pos: [1.2, 6.8, -16.5], tgt: [1.2, 13.0, 11.0], fov: 63 },    // the drop lands, tilting up
  // From here it parts from 8.55 — same positions, lower aim. At 8.55's
  // targets the last twelve seconds are sky and nothing else, which is the
  // one thing this variant can't say: the people are still down there.
  { t: 41.0, pos: [2.2, 3.0, -15.0], tgt: [2.4, 15.0, 16.0], fov: 66 },    // low, looking up the column
  { t: 45.2, pos: [2.6, 1.4, -14.0], tgt: [3.2, 14.0, 19.0], fov: 70 },    // landed on the road among them
  { t: 48.0, pos: [2.2, 1.9, -13.2], tgt: [4.5, 13.0, 18.0], fov: 72 },    // still drifting as it ends
]

/** Cubic Hermite with finite-difference tangents — C1, so nothing ever stops. */
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

export function CameraRig8b() {
  const yieldCamera = useCameraHandoff()
  const state = useRef({ pos: new THREE.Vector3(), tgt: new THREE.Vector3(), fov: 42 })
  const world = useRef({ pos: new THREE.Vector3(), tgt: new THREE.Vector3() })

  useFrame(({ camera }) => {
    if (yieldCamera()) return
    const t = getAnimTime()
    const s = state.current
    sampleKeys(t, s)

    s.pos.x += Math.sin(t * 0.17) * 0.05
    s.pos.y += Math.sin(t * 0.28) * 0.04
    if (t > T_DROP) {
      const dt = t - T_DROP
      s.pos.y -= Math.exp(-dt * 5.5) * Math.sin(dt * 16) * 0.4
    }

    // Village units out to Act B's; the camera cannot ride inside `<Village>`.
    const w = world.current
    w.pos.set(...toWorld(s.pos.x, s.pos.y, s.pos.z))
    w.tgt.set(...toWorld(s.tgt.x, s.tgt.y, s.tgt.z))
    camera.position.copy(w.pos)
    camera.lookAt(w.tgt)
    const cam = camera as THREE.PerspectiveCamera
    if (Math.abs(cam.fov - s.fov) > 1e-3) {
      cam.fov = s.fov
      cam.updateProjectionMatrix()
    }
  })

  return null
}
