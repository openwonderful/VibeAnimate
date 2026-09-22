/* eslint-disable react-refresh/only-export-components -- component-factory module (makeSceneComposition), no fast-refresh boundary needed */
/**
 * SceneComposition — turns any scene-manifest entry into a Remotion
 * composition component: loads the scene module (delaying the render until
 * it arrives), provides render mode (composition size + the @remotion/three
 * ThreeCanvas for the SceneShell to use), and drives the shared anim clock
 * from Remotion's frame counter.
 */
import { useEffect, useMemo, useState } from 'react'
import type { ComponentType } from 'react'
import { cancelRender, continueRender, delayRender, useVideoConfig } from 'remotion'
import { ThreeCanvas } from '@remotion/three'
import { SceneModeContext, type RenderCanvasProps, type SceneMode } from '../scenes/sceneMode'
import type { SceneEntry } from '../scenes/manifest'
import { RemotionTimeDriver } from './RemotionTimeDriver'

function RenderCanvas({ width, height, children, ...rest }: RenderCanvasProps) {
  return (
    <ThreeCanvas width={width} height={height} {...(rest as Omit<RenderCanvasProps, 'width' | 'height' | 'children'>)}>
      {children}
    </ThreeCanvas>
  )
}

export function makeSceneComposition(
  entry: SceneEntry,
  /** Extra props spread onto the scene component (timeline overrides). */
  sceneProps?: Record<string, unknown>,
  /**
   * An OVERLAY clip, stacked above a base track rather than being the
   * picture. The only difference is the wrapper's background, and it is the
   * whole difference: the opaque `#050A14` below is right for a base clip —
   * a scene that does not fill the frame gets the film's black instead of
   * white — and catastrophic for an overlay, which then paints that field
   * over everything under it.
   *
   * That is not hypothetical. The Lantern Keeper carries `fx.letterbox` on
   * its overlay track from 0 for the full 60s, so every frame of that film
   * rendered as a flat navy rectangle with bars: no village, no keeper, no
   * lanterns. It looked like a deliberate letterbox card, which is why it
   * survived — the one shape a blank-frame check cannot catch is a blank
   * frame that is supposed to have something drawn on it.
   */
  opts?: { overlay?: boolean },
): ComponentType {
  function SceneComposition() {
    const { width, height } = useVideoConfig()
    const [Scene, setScene] = useState<ComponentType<Record<string, unknown>> | null>(null)

    useEffect(() => {
      const handle = delayRender(`load scene module for '${entry.key}'`)
      entry.load()
        .then(m => {
          setScene(() => m.default)
          continueRender(handle)
        })
        .catch(err => cancelRender(err))
    }, [])

    const mode = useMemo<SceneMode>(
      () => ({ kind: 'render', width, height, RenderCanvas }),
      [width, height],
    )

    return (
      <SceneModeContext.Provider value={mode}>
        <RemotionTimeDriver>
          <div style={{
            width, height,
            position: 'relative', overflow: 'hidden',
            background: opts?.overlay ? 'transparent' : '#050A14',
          }}>
            {Scene && <Scene {...sceneProps} />}
          </div>
        </RemotionTimeDriver>
      </SceneModeContext.Provider>
    )
  }
  SceneComposition.displayName = `SceneComposition(${entry.key})`
  return SceneComposition
}
