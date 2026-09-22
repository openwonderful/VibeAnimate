/**
 * SceneCanvas — drop-in replacement for @react-three/fiber's <Canvas> that
 * makes a scene Remotion-renderable without restructuring it.
 *
 * Live mode: renders a normal R3F <Canvas> with all props passed through and
 * <DebugCamera> mounted (pass `debugTarget` to pin its orbit pivot).
 * Render mode (inside a Remotion composition): renders the render canvas
 * provided by SceneModeContext (@remotion/three's ThreeCanvas, sized to the
 * composition), which advances the R3F frame loop per video frame.
 *
 * Migrating a legacy scene = swap <Canvas …> for <SceneCanvas …>, drop its
 * inner <DebugCamera />, done. Works for hybrid scenes (DOM layers + a
 * transparent Canvas overlay) and for scenes embedded by other scenes.
 * New scenes should prefer createScene(), which uses this internally.
 */
import { lazy, Suspense } from 'react'
import type { CanvasProps } from '@react-three/fiber'
import { Canvas } from '@react-three/fiber'
import { useSceneMode } from './sceneMode'
import { DebugCamera } from './DebugCamera'
import { IS_STUDIO_APP } from '../studio/editable/env'

// Blender mode (object select + gizmo + frame governor) only exists on the
// studio page; lazy so viewer/render bundles never load it.
const StudioViewportTools = lazy(() => import('../studio/editable/StudioViewportTools'))

export type SceneCanvasProps = CanvasProps & {
  /** Orbit pivot for the live <DebugCamera> (see DebugCamera target prop). */
  debugTarget?: [number, number, number]
}

export function SceneCanvas({ debugTarget, children, ...canvasProps }: SceneCanvasProps) {
  const mode = useSceneMode()

  if (mode.kind === 'render') {
    const { RenderCanvas, width, height } = mode
    return (
      <RenderCanvas width={width} height={height} {...canvasProps}>
        {children}
      </RenderCanvas>
    )
  }

  // Shot refs snapshot the stage with canvas.toDataURL, which reads black
  // unless the drawing buffer survives past the frame's compositing. Studio
  // page only: the plain viewer and the Remotion render path (which has its
  // own readback) should not pay the buffer-retention cost. A scene's own
  // `gl` object still wins on conflict; a `gl` FACTORY is passed through
  // untouched (no such scene today).
  const gl = IS_STUDIO_APP && (canvasProps.gl == null || typeof canvasProps.gl === 'object')
    ? { preserveDrawingBuffer: true, ...canvasProps.gl }
    : canvasProps.gl

  return (
    <Canvas {...canvasProps} gl={gl}>
      <DebugCamera target={debugTarget} />
      {IS_STUDIO_APP && (
        <Suspense fallback={null}><StudioViewportTools /></Suspense>
      )}
      {children}
    </Canvas>
  )
}
