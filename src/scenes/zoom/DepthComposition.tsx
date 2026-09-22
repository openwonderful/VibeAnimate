import { useAnimTime } from '../../hooks/useAnimTime'
import { useSceneMode } from '../sceneMode'
import { SceneCanvas } from '../SceneCanvas'
import DepthScene from './DepthScene'

/**
 * Act 1.2 — the mountains → city → stadium push-in (`?act=1.2`).
 *
 * Time comes from the shared anim clock, so the scene scrubs with `?t=`, the
 * time scrubber and `window.__anim.seek()` in the viewer, and is driven by
 * Remotion's frame counter in a render. (It used to read `?t` off the URL
 * once and otherwise follow its own <audio> element — which meant every
 * screenshot after the first showed the same frame, and the FullVideo slot
 * baked a frozen t=0 mountain still plus a visible audio-scrubber overlay.)
 *
 * `timeOffset` places the scene inside the 18.65s depth chain: the master
 * timeline gives 1.2 the 0:13–0:18 slot, where scene-local time restarts at
 * 0, so it passes timeOffset={13} to pick the chain up at the city corridor.
 */
export interface DepthCompositionProps {
  /** Added to scene-local time before driving the depth chain (seconds). */
  timeOffset?: number
  /** Camera FOV. */
  fov?: number
}

export default function DepthComposition({
  timeOffset = 0,
  fov = 75,
}: DepthCompositionProps = {}) {
  const mode = useSceneMode()
  const effectiveTime = useAnimTime() + timeOffset

  return (
    <div style={{
      width: mode.kind === 'render' ? '100%' : '100vw',
      height: mode.kind === 'render' ? '100%' : '100vh',
      position: 'relative',
    }}>
      <DepthScene
        effectiveTime={effectiveTime}
        fov={fov}
        renderCanvas={(children) => (
          <SceneCanvas
            style={{ background: 'transparent' }}
            gl={{ alpha: true, antialias: true }}
            camera={{ fov, position: [0, 0, 5], near: 0.1, far: 100 }}
          >
            {children}
          </SceneCanvas>
        )}
      />
    </div>
  )
}
