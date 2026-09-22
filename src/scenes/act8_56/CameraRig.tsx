/**
 * Act 8.56 camera — 8.51's flight, flown over the CURRENT world.
 *
 * The keys below are Act 8.51's ("Ignition"), character for character. What
 * 8.51 does that the shipping 8.55 arc does not is the END: it keeps a true
 * bird's-eye over the lit field (t 24.6–33.9), sinks WITH the souls at their
 * own eye level (t 41, target level with the lens), and then lands on the
 * road and throws the whole aim up to near-zenith (target y 60) in ONE move
 * between 41 and 45.2 — so the pan into the sky arrives as a beat rather
 * than being smeared over the last twelve seconds. That decisive look-up is
 * the reason this variant exists.
 *
 * Same interpolation as both parents: time-aware Catmull-Rom, C1-continuous,
 * never stopping. Poses are in village units and mapped out to Act B's world
 * every frame (the camera cannot live inside the 20× locale group — near/far
 * planes and focal length would scale with it).
 *
 * Driven by the global anim clock; hands the camera off when the debug camera takes over.
 */
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useRef } from 'react'
import { getAnimTime } from '../../hooks/useAnimTime'
import { useCameraHandoff } from '../DebugCamera'
import { publishSceneLookAt } from '../cameraHandoff'
import { T_DROP } from '../act8_55/constants'
import { toWorld } from '../act8_55/locale'

type Key = { t: number; pos: [number, number, number]; tgt: [number, number, number]; fov: number }

// From act8_51/CameraRig — the SHAPE and the TIMING are 8.51's, unedited:
// bird's-eye held to 33.9, the dive from 41, the whip up landing at 45.2.
// Two keys carry world corrections (marked), because 8.51's world is not
// this one: its soul column and its house stood elsewhere.
const KEYS: Key[] = [
  { t: 0.0, pos: [5.4, 1.15, -13.0], tgt: [1.1, 1.0, -20.6], fov: 42 },   // the singer, alone in the dark
  { t: 8.4, pos: [3.1, 1.7, -7.2], tgt: [0.7, 1.1, -22.5], fov: 49 },     // pulling back as light spreads
  { t: 16.2, pos: [-2.2, 4.8, -1.8], tgt: [0.2, 0.8, -25], fov: 55 },     // wide — a field of light now
  { t: 24.6, pos: [-1.2, 41, -13.5], tgt: [0.1, 0, -23.8], fov: 58 },     // risen straight up — bird's eye
  { t: 33.9, pos: [-0.2, 45, -18.5], tgt: [0.15, 0, -24.2], fov: 58 },    // creeping over the field, same bearing
  // WORLD FIX (was pos y 24 / z +6, tgt level at y 24): this world's souls
  // are higher by 41s than 8.51's were, so the sink aims INTO the column
  // above the field instead of level across empty air.
  { t: 41.0, pos: [2.2, 14, 2], tgt: [0.8, 34, -26], fov: 62 },           // sinking, aim climbing into the column
  // WORLD FIX (was x 3.6 / z -16.7, tgt y 60): pulled out from under the
  // house eave — at the near-zenith aim the facade filled half the frame —
  // and the aim lands on the bearing THIS world hangs its river of souls
  // (8.51's y-60 zenith put it in the top corner over a barren frame). The
  // whip itself keeps 8.51's timing: level at 41, all the way up by 45.2,
  // one move.
  { t: 45.2, pos: [4.7, 0.95, -13.6], tgt: [3.2, 44, -38], fov: 70 },     // landing on the road, full look-up
  { t: 48.0, pos: [4.3, 1.15, -14.5], tgt: [4.4, 42, -36], fov: 72 },     // still drifting as it ends
]

/** The opening pose, in Act B world units — the canvas needs it before the
 *  rig's first useFrame lands. */
export const OPEN_POS = toWorld(...KEYS[0].pos)
export const OPEN_TGT = toWorld(...KEYS[0].tgt)
export const OPEN_FOV = KEYS[0].fov

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
  const world = useRef({ pos: new THREE.Vector3(), tgt: new THREE.Vector3() })

  useFrame(({ camera }) => {
    if (yieldCamera()) return
    const t = getAnimTime()
    const s = state.current
    sampleKeys(t, s)

    // Breath — barely-there handheld life (invisible at altitude). In village
    // units, so it survives the trip out to Act B's scale.
    s.pos.x += Math.sin(t * 0.17) * 0.05
    s.pos.y += Math.sin(t * 0.28) * 0.04

    // Beat kick on the drop — a short damped dip.
    if (t > T_DROP) {
      const dt = t - T_DROP
      s.pos.y -= Math.exp(-dt * 5.5) * Math.sin(dt * 16) * 0.4
    }

    const w = world.current
    w.pos.set(...toWorld(s.pos.x, s.pos.y, s.pos.z))
    w.tgt.set(...toWorld(s.tgt.x, s.tgt.y, s.tgt.z))
    camera.position.copy(w.pos)
    camera.lookAt(w.tgt)
    // The debug camera orbits this if you take over — without it the pivot
    // would sit a few units off the nose, and every aim here is hundreds of
    // world units out (a thousand, up the column of souls), so that is
    // orbiting empty air.
    publishSceneLookAt(w.tgt.x, w.tgt.y, w.tgt.z)
    const cam = camera as THREE.PerspectiveCamera
    if (Math.abs(cam.fov - s.fov) > 1e-3) {
      cam.fov = s.fov
      cam.updateProjectionMatrix()
    }
  })

  return null
}
