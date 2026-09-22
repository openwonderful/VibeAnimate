import { useFrame, useThree } from '@react-three/fiber'
import { useDepthCamera } from './DepthCamera'
import { useCameraHandoff } from '../DebugCamera'
import type { PerspectiveCamera } from 'three'

/**
 * Syncs the Three.js camera with our shared DepthCamera state.
 * Camera at z=cameraZ, looking forward along +Z toward objects.
 */
export default function DepthCameraSync() {
  const cam = useDepthCamera()
  const { camera } = useThree()
  const yieldCamera = useCameraHandoff()

  useFrame(() => {
    if (yieldCamera()) return
    camera.position.set(0, 0, cam.cameraZ)
    camera.lookAt(0, 0, cam.cameraZ + 10)

    if ('fov' in camera) {
      const perspCam = camera as PerspectiveCamera
      if (perspCam.fov !== cam.fov) {
        perspCam.fov = cam.fov
        perspCam.updateProjectionMatrix()
      }
    }
  })

  return null
}
