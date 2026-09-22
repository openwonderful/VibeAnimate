/**
 * sceneMode — tells a scene whether it is running in the live viewer or
 * inside a Remotion render, without the scene (or this module) importing
 * anything from Remotion.
 *
 * Live mode is the default context value, so the viewer never needs a
 * provider. Remotion's SceneComposition (src/remotion/SceneComposition.tsx)
 * provides render mode, including the composition size and the
 * @remotion/three ThreeCanvas to use in place of the R3F <Canvas>.
 */
import { createContext, useContext } from 'react'
import type { ComponentType } from 'react'
import type { CanvasProps } from '@react-three/fiber'

/** R3F Canvas props + the explicit size a render-mode Three canvas needs
 *  (structural match for @remotion/three's ThreeCanvasProps, so this module
 *  stays remotion-free). */
export type RenderCanvasProps = Omit<CanvasProps, 'ref'> & {
  width: number
  height: number
}

export type SceneMode =
  | { kind: 'live' }
  | {
      kind: 'render'
      width: number
      height: number
      RenderCanvas: ComponentType<RenderCanvasProps>
    }

export const SceneModeContext = createContext<SceneMode>({ kind: 'live' })

export function useSceneMode(): SceneMode {
  return useContext(SceneModeContext)
}
