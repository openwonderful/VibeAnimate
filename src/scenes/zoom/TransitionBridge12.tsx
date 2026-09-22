import { CONCERT_PURPLE } from '../../theme/colors'

interface TransitionBridge12Props {
  progress: number // 0 to 1
  visible: boolean
}

/**
 * Transition overlay between Scene 1 (lake) and Scene 2 (stadium).
 * Renders ripple rings and emerging light dots during the portal dissolve.
 */
export default function TransitionBridge12({
  progress,
  visible,
}: TransitionBridge12Props) {
  if (!visible || progress <= 0) return null

  // Ripple rings expanding from lake center
  const ringCount = 4
  const rings = Array.from({ length: ringCount }, (_, i) => {
    const delay = i * 0.15
    const ringProgress = Math.max(0, Math.min(1, (progress - delay) / (1 - delay)))
    const radius = ringProgress * 600
    const opacity = (1 - ringProgress) * 0.15
    return { radius, opacity, key: i }
  })

  // Emerging light dots (preview of ARMY bombs)
  const dotCount = 20
  const dots = Array.from({ length: dotCount }, (_, i) => {
    const seed = i * 7.31
    const angle = (seed % 6.28)
    const dist = 50 + (seed * 3.7) % 200
    const dotProgress = Math.max(0, (progress - 0.3) / 0.7)
    const x = 960 + Math.cos(angle) * dist * dotProgress
    const y = 576 + Math.sin(angle) * dist * 0.6 * dotProgress
    const opacity = dotProgress * (0.3 + (seed % 0.5))
    const hue = i % 2 === 0 ? '#9B59B6' : '#6C5CE7' // purple/blue
    return { x, y, opacity: Math.min(opacity, 0.6), hue, key: i }
  })

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 25,
        pointerEvents: 'none',
      }}
    >
      {/* Dark purple vignette that blends into Scene 2's background */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(ellipse at 50% 53.3%, transparent 20%, ${CONCERT_PURPLE}40 60%, #020208 100%)`,
          opacity: progress * 0.8,
        }}
      />

      {/* Ripple rings and light dots */}
      <svg
        viewBox="0 0 1920 1080"
        preserveAspectRatio="none"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
        }}
      >
        {/* Ripple rings */}
        {rings.map(({ radius, opacity, key }) =>
          radius > 0 && (
            <ellipse
              key={`ring-${key}`}
              cx={960}
              cy={576}
              rx={radius}
              ry={radius * 0.6}
              fill="none"
              stroke="white"
              strokeWidth={1.5}
              opacity={opacity}
            />
          ),
        )}

        {/* Emerging ARMY bomb light dots */}
        {dots.map(({ x, y, opacity, hue, key }) =>
          opacity > 0 && (
            <circle
              key={`dot-${key}`}
              cx={x}
              cy={y}
              r={2}
              fill={hue}
              opacity={opacity}
            />
          ),
        )}
      </svg>
    </div>
  )
}
