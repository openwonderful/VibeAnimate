import type { SceneZoomState } from '../../utils/zoomTimeline'

interface ZoomLayerProps {
  state: SceneZoomState
  zIndex: number
  transformOrigin: string
  children: React.ReactNode
}

/**
 * Wraps an entire scene, applying scale/opacity/visibility based on zoom state.
 */
export default function ZoomLayer({
  state,
  zIndex,
  transformOrigin,
  children,
}: ZoomLayerProps) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex,
        transform: `scale(${state.scale})`,
        transformOrigin,
        opacity: state.opacity,
        visibility: state.visible ? 'visible' : 'hidden',
        willChange: 'transform, opacity',
      }}
    >
      {children}
    </div>
  )
}
