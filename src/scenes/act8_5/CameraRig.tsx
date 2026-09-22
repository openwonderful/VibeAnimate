/**
 * Act 8.5 camera — one continuous choreographed shot, five phases:
 *
 *   A  ground-level side view through the singing crowd (two gentle dollies,
 *      one per Arirang line)
 *   B  the climb — during "나를 버리고 가시는 님은" the camera itself leaves,
 *      rising in an arc to a straight-down bird's eye
 *   C  top-down hold over the paddy filigree; the field holds its breath
 *   D  the swing — out and down to a side view of the ascending river of souls
 *   E  landing on the road beside the golden figure, tilting up into the
 *      finished constellation sky
 *
 * Keyframes are eased per-segment (zero velocity at joins → move, settle,
 * move — each move lands with a lyric line). Driven by the global anim clock,
 * so it scrubs with ?t= and renders deterministically. Stands down while the
 * debug camera is active.
 */
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useRef } from 'react'
import { easeInOut, getAnimTime } from '../../hooks/useAnimTime'
import { useCameraHandoff } from '../DebugCamera'
import { T_DROP } from './constants'

type Key = { t: number; pos: [number, number, number]; tgt: [number, number, number]; fov: number }

const KEYS: Key[] = [
  { t: 0.0, pos: [-3.6, 2.05, 6.4], tgt: [1.4, 1.55, -24], fov: 55 },  // among the crowd
  { t: 8.4, pos: [-1.2, 2.35, 3.4], tgt: [0.7, 1.4, -25], fov: 55 },   // line 1: drift
  { t: 16.2, pos: [2.0, 3.1, -1.6], tgt: [0.1, 1.1, -26], fov: 56 },   // line 2: toward the house
  { t: 24.6, pos: [0.7, 44, -20.4], tgt: [0.25, 0, -23.6], fov: 58 },  // line 3: the climb
  { t: 33.9, pos: [-1.7, 46, -22.9], tgt: [0.1, 0, -24.2], fov: 58 },  // line 4: bird's-eye drift
  { t: 41.0, pos: [24, 13, 4], tgt: [-2, 17, -20], fov: 62 },          // the swing: river of souls
  { t: 45.0, pos: [3.5, 0.9, -16.8], tgt: [3.2, 60, -40], fov: 70 },   // landed by the golden figure
  { t: 48.0, pos: [3.45, 0.95, -16.9], tgt: [3.9, 60, -39], fov: 72 }, // final micro-drift, widen
]

export function CameraRig() {
  const yieldCamera = useCameraHandoff()
  const pos = useRef(new THREE.Vector3())
  const tgt = useRef(new THREE.Vector3())

  useFrame(({ camera }) => {
    if (yieldCamera()) return
    const t = getAnimTime()

    let i = 0
    while (i < KEYS.length - 2 && t >= KEYS[i + 1].t) i++
    const a = KEYS[i]
    const b = KEYS[i + 1]
    const u = Math.min(1, Math.max(0, (t - a.t) / (b.t - a.t)))
    const k = easeInOut(u)

    pos.current.set(
      a.pos[0] + (b.pos[0] - a.pos[0]) * k,
      a.pos[1] + (b.pos[1] - a.pos[1]) * k,
      a.pos[2] + (b.pos[2] - a.pos[2]) * k,
    )
    tgt.current.set(
      a.tgt[0] + (b.tgt[0] - a.tgt[0]) * k,
      a.tgt[1] + (b.tgt[1] - a.tgt[1]) * k,
      a.tgt[2] + (b.tgt[2] - a.tgt[2]) * k,
    )

    // Breath — barely-there handheld life (invisible at altitude).
    pos.current.x += Math.sin(t * 0.17) * 0.06
    pos.current.y += Math.sin(t * 0.28) * 0.045

    // Beat kick on the drop — a short damped dip.
    if (t > T_DROP) {
      const dt = t - T_DROP
      pos.current.y -= Math.exp(-dt * 5.5) * Math.sin(dt * 16) * 0.4
    }

    camera.position.copy(pos.current)
    camera.lookAt(tgt.current)
    const cam = camera as THREE.PerspectiveCamera
    const fov = a.fov + (b.fov - a.fov) * k
    if (Math.abs(cam.fov - fov) > 1e-3) {
      cam.fov = fov
      cam.updateProjectionMatrix()
    }
  })

  return null
}
