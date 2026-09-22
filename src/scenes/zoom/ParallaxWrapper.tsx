interface ParallaxWrapperProps {
  depth: number
  baseScale: number
  focalX?: number // in SVG viewBox coords (0-1920)
  focalY?: number // in SVG viewBox coords (0-1080)
  children: React.ReactNode
}

/**
 * Wraps a scene layer and applies parallax-scaled transforms during zoom.
 * Layers with depth < 1 zoom slower (background), depth > 1 zoom faster (foreground).
 * At baseScale=1, no transform is applied (identity).
 */
export default function ParallaxWrapper({
  depth,
  baseScale,
  focalX = 960,
  focalY = 260,
  children,
}: ParallaxWrapperProps) {
  const layerScale = 1 + (baseScale - 1) * depth
  const originX = (focalX / 1920) * 100
  const originY = (focalY / 1080) * 100

  // Skip transform when at identity (no zoom)
  if (Math.abs(layerScale - 1) < 0.001) {
    return <>{children}</>
  }

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        transform: `scale(${layerScale})`,
        transformOrigin: `${originX}% ${originY}%`,
        willChange: 'transform',
      }}
    >
      {children}
    </div>
  )
}
