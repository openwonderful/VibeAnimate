import {
  CONCERT_PURPLE,
  CONCERT_VIOLET,
  ARMY_BOMB_PURPLE,
  ARMY_BOMB_BLUE,
  HWANG,
} from '../../theme/colors'
import { seededRandom } from '../../utils/svgHelpers'

/**
 * CityFlythrough — Scene 1.5
 *
 * Multi-layer city buildings that we zoom through after passing the mountains.
 * Buildings at different depths create parallax as we fly forward.
 * Ends with a stadium structure growing to fill the screen → crossfade to Scene 2.
 *
 * progress: 0 = entering city, 1 = stadium fills screen
 */

interface CityFlythroughProps {
  progress: number
  visible: boolean
}

// --- Building generation ---

interface Building {
  x: number       // center x in viewBox
  width: number
  height: number
  windows: { wx: number; wy: number; lit: boolean }[]
}

interface CityLayer {
  depth: number
  buildings: Building[]
  color: string
  windowColor: string
  opacity: number
}

function generateBuildings(
  rand: () => number,
  count: number,
  minH: number,
  maxH: number,
  minW: number,
  maxW: number,
): Building[] {
  const buildings: Building[] = []
  for (let i = 0; i < count; i++) {
    const width = minW + rand() * (maxW - minW)
    const height = minH + rand() * (maxH - minH)
    // Spread buildings across the viewport width
    const x = rand() * 1920

    // Generate window grid
    const cols = Math.floor(width / 12)
    const rows = Math.floor(height / 16)
    const windows: Building['windows'] = []
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        windows.push({
          wx: (c + 0.5) * (width / cols) - width / 2,
          wy: -(r + 1) * (height / rows) + 4,
          lit: rand() < 0.4,
        })
      }
    }

    buildings.push({ x, width, height, windows })
  }
  return buildings
}

// Pre-generate all city layers deterministically
const rand = seededRandom(999)

const cityLayers: CityLayer[] = [
  // Layer 0: Far skyline — small, many buildings
  {
    depth: 0.3,
    buildings: generateBuildings(rand, 20, 30, 80, 20, 50),
    color: '#1a1a2e',
    windowColor: '#FFDD8844',
    opacity: 0.6,
  },
  // Layer 1: Mid-distance buildings
  {
    depth: 0.6,
    buildings: generateBuildings(rand, 14, 60, 160, 40, 90),
    color: '#16162a',
    windowColor: '#FFE0A0',
    opacity: 0.75,
  },
  // Layer 2: Near buildings — larger, fewer
  {
    depth: 1.0,
    buildings: generateBuildings(rand, 10, 100, 280, 60, 120),
    color: '#121228',
    windowColor: '#FFD480',
    opacity: 0.85,
  },
  // Layer 3: Closest structures — rush past edges
  {
    depth: 1.5,
    buildings: generateBuildings(rand, 6, 200, 400, 80, 150),
    color: '#0e0e22',
    windowColor: '#FFC860',
    opacity: 0.9,
  },
]

export default function CityFlythrough({ progress, visible }: CityFlythroughProps) {
  if (!visible) return null

  // City glow: dark navy → purple city atmosphere
  const glowIntensity = Math.min(1, progress / 0.6)

  // Stadium visibility: appears at progress 0.4, fills screen by 1.0
  const stadiumProgress = Math.max(0, (progress - 0.4) / 0.6)

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 25,
        pointerEvents: 'none',
      }}
    >
      {/* City atmosphere — dark to purple gradient */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `linear-gradient(180deg,
            #050A14 0%,
            ${glowIntensity > 0.3 ? '#0A0520' : '#050A14'} 30%,
            ${glowIntensity > 0.5 ? '#150A30' : '#080E1F'} 70%,
            #0A0515 100%)`,
          opacity: Math.min(1, progress * 3),
        }}
      />

      {/* City glow from below (light pollution) */}
      {glowIntensity > 0.2 && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: `radial-gradient(ellipse at 50% 100%, ${CONCERT_PURPLE}30 0%, transparent 60%)`,
            opacity: glowIntensity * 0.6,
          }}
        />
      )}

      <svg
        viewBox="0 0 1920 1080"
        preserveAspectRatio="none"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      >
        {/* Building layers — back to front */}
        {cityLayers.map((layer, li) => {
          // Each layer scales up from center as progress increases
          const layerScale = 1 + progress * layer.depth * 4
          // Layers fade: far layers visible early, near layers appear later
          const layerDelay = layer.depth * 0.15
          const layerOpacity = Math.max(0, Math.min(1,
            (progress - layerDelay) / 0.3
          ))
          // Near layers also fade out as they fly past
          const layerFadeOut = layer.depth > 0.8
            ? Math.max(0, 1 - (progress - 0.5) / 0.4)
            : layer.depth > 0.5
              ? Math.max(0, 1 - (progress - 0.7) / 0.3)
              : 1

          if (layerOpacity <= 0 || layerFadeOut <= 0) return null

          return (
            <g
              key={li}
              transform={`translate(960, 1080) scale(${layerScale}) translate(-960, -1080)`}
              opacity={layerOpacity * layerFadeOut * layer.opacity}
            >
              {layer.buildings.map((bld, bi) => {
                const bx = bld.x - bld.width / 2
                const by = 1080 - bld.height

                return (
                  <g key={bi}>
                    {/* Building body */}
                    <rect
                      x={bx}
                      y={by}
                      width={bld.width}
                      height={bld.height}
                      fill={layer.color}
                    />
                    {/* Roof edge */}
                    <rect
                      x={bx}
                      y={by}
                      width={bld.width}
                      height={2}
                      fill="#333355"
                      opacity={0.5}
                    />
                    {/* Windows */}
                    {bld.windows.map((w, wi) =>
                      w.lit && (
                        <rect
                          key={wi}
                          x={bld.x + w.wx}
                          y={1080 + w.wy}
                          width={6}
                          height={8}
                          fill={layer.windowColor}
                          opacity={0.7 + Math.sin(wi * 2.3) * 0.3}
                          rx={0.5}
                        />
                      ),
                    )}
                  </g>
                )
              })}
            </g>
          )
        })}

        {/* Stadium — grows from center */}
        {stadiumProgress > 0 && (
          <g opacity={Math.min(1, stadiumProgress * 1.5)}>
            {/* Stadium scales up from a small structure to fill viewport */}
            <g transform={`translate(960, 800) scale(${0.5 + stadiumProgress * 3}) translate(-960, -800)`}>
              {/* Stadium bowl shape */}
              <path
                d={`M 760 800
                    Q 760 700, 820 680
                    L 820 800 Z`}
                fill="#1E1E40"
                opacity={0.9}
              />
              <path
                d={`M 1160 800
                    Q 1160 700, 1100 680
                    L 1100 800 Z`}
                fill="#1E1E40"
                opacity={0.9}
              />
              {/* Stadium floor / arena */}
              <rect
                x={820} y={750}
                width={280} height={50}
                fill="#0A0515"
                opacity={0.9}
              />
              {/* Stadium roof arch */}
              <path
                d="M 760 680 Q 960 640 1160 680"
                fill="none"
                stroke="#333358"
                strokeWidth={3}
                opacity={0.7}
              />
              {/* Stage glow inside */}
              <rect
                x={930} y={740}
                width={60} height={20}
                fill={CONCERT_PURPLE}
                opacity={0.8}
                rx={2}
              />
              {/* ARMY bomb dots inside stadium */}
              {Array.from({ length: 30 }, (_, i) => {
                const dotRand = seededRandom(500 + i)
                const dx = 830 + dotRand() * 260
                const dy = 755 + dotRand() * 40
                const color = dotRand() < 0.5 ? ARMY_BOMB_PURPLE : ARMY_BOMB_BLUE
                return (
                  <circle
                    key={`sdot-${i}`}
                    cx={dx} cy={dy}
                    r={1.5}
                    fill={color}
                    opacity={stadiumProgress * 0.6}
                    style={{
                      animation: `twinkle-army ${2 + i * 0.1}s ease-in-out infinite`,
                      animationDelay: `${i * 0.15}s`,
                    }}
                  />
                )
              })}
              {/* Side LED screens */}
              <rect x={770} y={700} width={40} height={30} fill={CONCERT_VIOLET} opacity={0.4} rx={1} />
              <rect x={1110} y={700} width={40} height={30} fill={CONCERT_VIOLET} opacity={0.4} rx={1} />
            </g>
          </g>
        )}

        {/* Scattered city lights / stars in the sky */}
        {progress < 0.7 && Array.from({ length: 30 }, (_, i) => {
          const lr = seededRandom(700 + i)
          return (
            <circle
              key={`star-${i}`}
              cx={lr() * 1920}
              cy={lr() * 400}
              r={0.8}
              fill={HWANG}
              opacity={(1 - progress) * 0.3}
            />
          )
        })}
      </svg>
    </div>
  )
}
