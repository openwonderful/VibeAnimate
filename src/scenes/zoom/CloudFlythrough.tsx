import { CONCERT_PURPLE, CONCERT_VIOLET, ARMY_BOMB_PURPLE, ARMY_BOMB_BLUE } from '../../theme/colors'
import { seededRandom } from '../../utils/svgHelpers'

/**
 * CloudFlythrough — Scene 1.5
 *
 * Dramatic clouds rushing toward the camera as we fly through them.
 * Starts as natural dark clouds, gradually lit with purple concert glow.
 * Gaps between clouds reveal the stadium glow below.
 *
 * progress: 0 = just entering clouds, 1 = clouds dissipating, stadium visible
 */

interface CloudFlythroughProps {
  progress: number // 0 to 1
  visible: boolean
}

// Pre-generate cloud positions deterministically
interface FlyCloud {
  cx: number // center x (0-1920)
  cy: number // center y (0-1080)
  rx: number // horizontal radius
  ry: number // vertical radius
  depth: number // 0=far, 1=near — controls fly-past speed
  seed: number // for sub-shape variation
}

const rand = seededRandom(123)
const clouds: FlyCloud[] = Array.from({ length: 18 }, () => ({
  cx: rand() * 1920,
  cy: 200 + rand() * 680,
  rx: 200 + rand() * 400,
  ry: 60 + rand() * 120,
  depth: rand(),
  seed: rand() * 1000,
}))

// ARMY bomb dots that peek through cloud gaps
const armyDots = Array.from({ length: 60 }, () => ({
  x: 200 + rand() * 1520,
  y: 300 + rand() * 600,
  r: 1 + rand() * 2.5,
  color: rand() < 0.5 ? ARMY_BOMB_PURPLE : ARMY_BOMB_BLUE,
  twinkleOffset: rand() * 4,
}))

export default function CloudFlythrough({ progress, visible }: CloudFlythroughProps) {
  if (!visible) return null

  // Concert glow intensity: builds from 0 at progress=0 to full at progress=0.7
  const glowIntensity = Math.min(1, progress / 0.7)

  // Cloud opacity: full at progress 0-0.5, fading out 0.5-1.0
  const cloudOpacity = progress < 0.5 ? 1 : Math.max(0, 1 - (progress - 0.5) / 0.5)

  // ARMY dots: appear faintly through cloud gaps, get brighter as clouds thin
  const dotOpacity = progress < 0.3 ? progress / 0.3 * 0.3 : Math.min(1, 0.3 + (progress - 0.3) * 1.5)

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 25,
        pointerEvents: 'none',
      }}
    >
      {/* Stadium glow from below — purple radial that intensifies */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(ellipse at 50% 80%, ${CONCERT_PURPLE}${Math.round(glowIntensity * 60).toString(16).padStart(2, '0')} 0%, ${CONCERT_VIOLET}${Math.round(glowIntensity * 30).toString(16).padStart(2, '0')} 40%, transparent 70%)`,
        }}
      />

      {/* Dark sky base */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `linear-gradient(180deg, #050A14 0%, #0A0520 50%, #150A30 100%)`,
          opacity: cloudOpacity * 0.6,
        }}
      />

      <svg
        viewBox="0 0 1920 1080"
        preserveAspectRatio="none"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      >
        <defs>
          <radialGradient id="cloud-fill-1">
            <stop offset="0%" stopColor="#2A2040" stopOpacity={0.9} />
            <stop offset="60%" stopColor="#1A1030" stopOpacity={0.6} />
            <stop offset="100%" stopColor="#100820" stopOpacity={0} />
          </radialGradient>
          <radialGradient id="cloud-fill-lit">
            <stop offset="0%" stopColor={CONCERT_PURPLE} stopOpacity={0.4} />
            <stop offset="50%" stopColor={CONCERT_VIOLET} stopOpacity={0.2} />
            <stop offset="100%" stopColor={CONCERT_PURPLE} stopOpacity={0} />
          </radialGradient>
          <filter id="cloud-blur">
            <feGaussianBlur stdDeviation="20" />
          </filter>
          <filter id="cloud-blur-sm">
            <feGaussianBlur stdDeviation="8" />
          </filter>
        </defs>

        {/* ARMY bomb dots visible through gaps */}
        {armyDots.map((dot, i) => (
          <circle
            key={`dot-${i}`}
            cx={dot.x}
            cy={dot.y}
            r={dot.r}
            fill={dot.color}
            opacity={dotOpacity * 0.7}
            style={{
              animation: `twinkle-army ${2 + dot.twinkleOffset}s ease-in-out infinite`,
              animationDelay: `${dot.twinkleOffset}s`,
            }}
          />
        ))}

        {/* Cloud layers — each flies toward camera at different speeds */}
        {clouds.map((cloud, i) => {
          // Clouds scale up (flying toward camera) based on depth and progress
          // Near clouds (depth~1) move faster than far ones (depth~0)
          const flySpeed = 1 + cloud.depth * 3
          const scale = 1 + progress * flySpeed
          // Clouds spread outward from center as they "pass" the camera
          const spreadX = (cloud.cx - 960) * progress * cloud.depth * 0.8
          const spreadY = (cloud.cy - 540) * progress * cloud.depth * 0.5
          const cx = cloud.cx + spreadX
          const cy = cloud.cy + spreadY

          // Individual cloud opacity — near clouds fade first
          const cloudFade = cloud.depth > 0.6
            ? Math.max(0, 1 - (progress - 0.2) / 0.5)
            : Math.max(0, 1 - (progress - 0.4) / 0.5)

          if (cloudFade <= 0) return null

          // Lit from below by concert glow
          const isLit = cloud.cy > 500 && glowIntensity > 0.3
          const fillId = isLit ? 'cloud-fill-lit' : 'cloud-fill-1'

          return (
            <g key={i} opacity={cloudFade * cloudOpacity}>
              {/* Main cloud body */}
              <ellipse
                cx={cx} cy={cy}
                rx={cloud.rx * scale}
                ry={cloud.ry * scale}
                fill={`url(#${fillId})`}
                filter="url(#cloud-blur)"
              />
              {/* Cloud bumps for texture */}
              <ellipse
                cx={cx - cloud.rx * 0.3 * scale} cy={cy - cloud.ry * 0.4 * scale}
                rx={cloud.rx * 0.5 * scale}
                ry={cloud.ry * 0.6 * scale}
                fill={`url(#${fillId})`}
                filter="url(#cloud-blur-sm)"
              />
              <ellipse
                cx={cx + cloud.rx * 0.4 * scale} cy={cy - cloud.ry * 0.2 * scale}
                rx={cloud.rx * 0.4 * scale}
                ry={cloud.ry * 0.5 * scale}
                fill={`url(#${fillId})`}
                filter="url(#cloud-blur-sm)"
              />
              {/* Concert light edge glow on bottom of cloud */}
              {isLit && (
                <ellipse
                  cx={cx} cy={cy + cloud.ry * 0.3 * scale}
                  rx={cloud.rx * 0.7 * scale}
                  ry={cloud.ry * 0.3 * scale}
                  fill={CONCERT_PURPLE}
                  opacity={glowIntensity * 0.15}
                  filter="url(#cloud-blur-sm)"
                />
              )}
            </g>
          )
        })}

        {/* Bright central glow as clouds part — "the stadium is down there" */}
        {progress > 0.4 && (
          <ellipse
            cx={960} cy={700}
            rx={400 + progress * 200}
            ry={200 + progress * 100}
            fill={CONCERT_PURPLE}
            opacity={(progress - 0.4) / 0.6 * 0.25}
            filter="url(#cloud-blur)"
          />
        )}
      </svg>
    </div>
  )
}
