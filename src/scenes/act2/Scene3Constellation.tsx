import { useMemo } from 'react'
import StageFloor from './stage/StageFloor'
import LEDWall from './stage/LEDWall'
import StageSymbols from './stage/StageSymbols'
import MemberSpotlights from './stage/MemberSpotlights'
import { seededRandom } from '../../utils/svgHelpers'
import { CONCERT_WHITE, CONCERT_CYAN } from '../../theme/colors'

// Anchor points that roughly form a human figure (relative to member center)
const BODY_ANCHORS = [
  // Head cluster (5 points)
  { x: 0, y: -55, spread: 5 },
  { x: -3, y: -50, spread: 3 },
  { x: 3, y: -50, spread: 3 },
  { x: 0, y: -45, spread: 4 },
  { x: 0, y: -52, spread: 3 },
  // Neck/shoulders (3 points)
  { x: 0, y: -38, spread: 2 },
  { x: -15, y: -35, spread: 4 },
  { x: 15, y: -35, spread: 4 },
  // Left arm (3 points)
  { x: -25, y: -28, spread: 5 },
  { x: -32, y: -20, spread: 4 },
  { x: -35, y: -12, spread: 3 },
  // Right arm (3 points)
  { x: 25, y: -28, spread: 5 },
  { x: 32, y: -20, spread: 4 },
  { x: 35, y: -12, spread: 3 },
  // Torso (6 points)
  { x: -8, y: -30, spread: 3 },
  { x: 8, y: -30, spread: 3 },
  { x: -6, y: -15, spread: 3 },
  { x: 6, y: -15, spread: 3 },
  { x: -5, y: 0, spread: 3 },
  { x: 5, y: 0, spread: 3 },
  // Left leg (4 points)
  { x: -8, y: 8, spread: 3 },
  { x: -12, y: 18, spread: 4 },
  { x: -14, y: 28, spread: 3 },
  { x: -13, y: 35, spread: 2 },
  // Right leg (4 points)
  { x: 8, y: 8, spread: 3 },
  { x: 12, y: 18, spread: 4 },
  { x: 14, y: 28, spread: 3 },
  { x: 13, y: 35, spread: 2 },
]

// V-formation member positions (7 members)
const MEMBER_POSITIONS = [
  { x: 960, y: 640, scale: 1.0 },   // Center
  { x: 760, y: 600, scale: 0.95 },  // Inner left
  { x: 1160, y: 600, scale: 0.95 }, // Inner right
  { x: 580, y: 560, scale: 0.9 },   // Mid left
  { x: 1340, y: 560, scale: 0.9 },  // Mid right
  { x: 420, y: 530, scale: 0.85 },  // Outer left
  { x: 1500, y: 530, scale: 0.85 }, // Outer right
]

interface ConstellationDot {
  localX: number
  localY: number
  radius: number
  color: string
  opacity: number
  glowRadius: number
  animName: string
  animDuration: number
  animDelay: number
}

interface ConstellationLine {
  x1: number
  y1: number
  x2: number
  y2: number
  opacity: number
}

interface MemberConstellation {
  dots: ConstellationDot[]
  lines: ConstellationLine[]
  swayDelay: number
  pulseDelay: number
}

const TWINKLE_ANIMS = ['twinkle-slow', 'twinkle-medium', 'twinkle-fast']
const CONNECTION_THRESHOLD = 25

function generateMemberConstellation(
  memberSeed: number,
): MemberConstellation {
  const rand = seededRandom(memberSeed)
  const dots: ConstellationDot[] = []

  // Generate 1-2 dots per anchor point
  for (const anchor of BODY_ANCHORS) {
    const numDots = rand() < 0.5 ? 1 : 2
    for (let d = 0; d < numDots; d++) {
      const angle = rand() * Math.PI * 2
      const dist = rand() * anchor.spread
      const localX = anchor.x + Math.cos(angle) * dist
      const localY = anchor.y + Math.sin(angle) * dist

      // Head and torso get larger radii
      const isCore = Math.abs(anchor.y) > 30 || Math.abs(anchor.x) < 10
      const radius = isCore ? 2.0 + rand() * 1.0 : 1.5 + rand() * 0.8

      // 20% cyan accent, 80% white
      const isCyan = rand() < 0.2
      const color = isCyan ? CONCERT_CYAN : CONCERT_WHITE

      const animIdx = Math.floor(rand() * 3)
      const durations = [4, 2.5, 1.5]

      dots.push({
        localX,
        localY,
        radius,
        color,
        opacity: 0.6 + rand() * 0.3,
        glowRadius: radius * 2.5,
        animName: TWINKLE_ANIMS[animIdx],
        animDuration: durations[animIdx],
        animDelay: rand() * 5,
      })
    }
  }

  // Generate connection lines between nearby dots
  const lines: ConstellationLine[] = []
  for (let i = 0; i < dots.length; i++) {
    for (let j = i + 1; j < dots.length; j++) {
      const dx = dots[i].localX - dots[j].localX
      const dy = dots[i].localY - dots[j].localY
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < CONNECTION_THRESHOLD) {
        // Closer pairs are more opaque
        const opacity = 0.15 * (1 - dist / CONNECTION_THRESHOLD)
        lines.push({
          x1: dots[i].localX,
          y1: dots[i].localY,
          x2: dots[j].localX,
          y2: dots[j].localY,
          opacity,
        })
      }
    }
  }

  const swayDelay = rand() * 3
  const pulseDelay = rand() * 4

  return { dots, lines, swayDelay, pulseDelay }
}

export default function Scene3Constellation() {
  const constellations = useMemo(() => {
    return MEMBER_POSITIONS.map((_, idx) =>
      generateMemberConstellation(7000 + idx * 137)
    )
  }, [])

  return (
    <div
      style={{
        position: 'relative',
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        background:
          'linear-gradient(180deg, #050510 0%, #0A0515 40%, #1A1025 100%)',
      }}
    >
      <StageFloor />
      <LEDWall />
      <StageSymbols />

      {/* Constellation Members */}
      <svg
        viewBox="0 0 1920 1080"
        preserveAspectRatio="none"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          zIndex: 30,
        }}
      >
        <defs>
          <filter id="dot-glow" x="-200%" y="-200%" width="500%" height="500%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {MEMBER_POSITIONS.map((member, mIdx) => {
          const constellation = constellations[mIdx]
          return (
            <g
              key={mIdx}
              transform={`translate(${member.x}, ${member.y}) scale(${member.scale})`}
              style={{
                animationName: 'member-sway, member-pulse',
                animationDuration: '6s, 4s',
                animationTimingFunction: 'ease-in-out, ease-in-out',
                animationIterationCount: 'infinite, infinite',
                animationDelay: `${constellation.swayDelay}s, ${constellation.pulseDelay}s`,
                transformOrigin: `${member.x}px ${member.y}px`,
              }}
            >
              {/* Connection lines (drawn first, behind dots) */}
              {constellation.lines.map((line, lIdx) => (
                <line
                  key={`l-${lIdx}`}
                  x1={line.x1}
                  y1={line.y1}
                  x2={line.x2}
                  y2={line.y2}
                  stroke={CONCERT_CYAN}
                  strokeWidth={0.5}
                  opacity={line.opacity}
                />
              ))}

              {/* Dots with glow */}
              {constellation.dots.map((dot, dIdx) => (
                <g key={`d-${dIdx}`}>
                  {/* Glow layer */}
                  <circle
                    cx={dot.localX}
                    cy={dot.localY}
                    r={dot.glowRadius}
                    fill={dot.color}
                    opacity={0.15}
                    style={{
                      animationName: dot.animName,
                      animationDuration: `${dot.animDuration}s`,
                      animationTimingFunction: 'ease-in-out',
                      animationIterationCount: 'infinite',
                      animationDelay: `${dot.animDelay}s`,
                    }}
                  />
                  {/* Core dot */}
                  <circle
                    cx={dot.localX}
                    cy={dot.localY}
                    r={dot.radius}
                    fill={dot.color}
                    opacity={dot.opacity}
                    filter="url(#dot-glow)"
                    style={{
                      animationName: dot.animName,
                      animationDuration: `${dot.animDuration}s`,
                      animationTimingFunction: 'ease-in-out',
                      animationIterationCount: 'infinite',
                      animationDelay: `${dot.animDelay}s`,
                    }}
                  />
                </g>
              ))}
            </g>
          )
        })}
      </svg>

      <MemberSpotlights />
    </div>
  )
}
