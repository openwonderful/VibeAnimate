/**
 * Act 7 camera. Keys are hero-relative (see journey.ts) and resolved every frame
 * against the walk, so the framing follows him instead of being authored against
 * a path that might change.
 *
 * Poses are authored in VILLAGE units, like everything else in the act, and
 * mapped out into Act B's valley through `toWorld`. The camera cannot simply go
 * inside `<Village>` the way the rest of the act does: a camera in a group at
 * 20× has its near plane, far plane and focal length scaled along with it.
 *
 * Driven by the global anim clock; hands the camera off when the debug camera takes over.
 */
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { getAnimTime } from '../../hooks/useAnimTime'
import { useCameraHandoff } from '../DebugCamera'
import { toWorld } from '../act8_55/locale'
import { heroX, heroZ, sampleCam, type CamKey } from './journey'

export function CameraRig7({ keys, actOffset }: { keys: CamKey[]; actOffset: number }) {
  const yieldCamera = useCameraHandoff()
  const tgt = useRef(new THREE.Vector3())

  useFrame(({ camera }) => {
    if (yieldCamera()) return
    const a = getAnimTime() + actOffset
    const { d, t, fov } = sampleCam(keys, a)
    const hx = heroX(a)
    const hz = heroZ(a)

    // A slow hand-held breath, small enough to read as life rather than drift.
    // In village units, so it survives the trip out to Act B's scale.
    const bx = Math.sin(a * 0.29) * 0.05
    const by = Math.sin(a * 0.41 + 1.2) * 0.04

    const p = toWorld(hx + d[0] + bx, d[1] + by, hz + d[2])
    const q = toWorld(hx + t[0], t[1], hz + t[2])
    camera.position.set(p[0], p[1], p[2])
    tgt.current.set(q[0], q[1], q[2])
    camera.lookAt(tgt.current)

    const cam = camera as THREE.PerspectiveCamera
    if (cam.isPerspectiveCamera && Math.abs(cam.fov - fov) > 1e-4) {
      cam.fov = fov
      cam.updateProjectionMatrix()
    }
  })

  return null
}
