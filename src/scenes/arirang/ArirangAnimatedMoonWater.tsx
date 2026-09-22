import StageSymbols, { type SymbolConfig } from '../act2/stage/StageSymbols'

/**
 * CSS keyframes needed (add to index.css):
 *
 * @keyframes dalbit-float {
 *   0%, 100% { transform: translateY(0); }
 *   50% { transform: translateY(-6px); }
 * }
 *
 * @keyframes dalbit-ripple {
 *   0% { transform: scale(1); opacity: 0.2; }
 *   100% { transform: scale(2); opacity: 0; }
 * }
 *
 * @keyframes dalbit-glow {
 *   0%, 100% { opacity: 0.06; transform: scale(1); }
 *   50% { opacity: 0.12; transform: scale(1.03); }
 * }
 */

/**
 * ArirangAnimatedMoonWater (달빛)
 *
 * Arirang symbols floating on a dark pond under moonlight.
 * Serene, reflective, monochrome. White symbols on near-black.
 * No red, no color — just cool moonlight.
 *
 * Layers (bottom to top):
 *  1. Background       (z:1)  — deep near-black gradient, lighter at top
 *  2. Moonlight halos  (z:3)  — per-symbol radial glows, breathing
 *  3. Reflections      (z:8)  — flipped symbols below water line, distorted
 *  4. Water surface    (z:9)  — thin horizontal line at y~650
 *  5. Main symbols     (z:10) — 3 StageSymbols with gentle float
 *  6. Water ripples    (z:14) — expanding circles at water line
 *  7. Water distortion filter — feTurbulence + feDisplacementMap (SMIL animated)
 *  8. Entrance         — arirang-emerge-scene keyframe on container
 */

const SYMBOLS: SymbolConfig[] = [
  { cx: 360, cy: 540, size: 250, variant: 'ring', holeRatio: 0.54 },
  { cx: 960, cy: 540, size: 250, variant: 'barred-circle', barCount: 2, gapRatio: 0.13, curveAmount: 35 },
  { cx: 1560, cy: 540, size: 250, variant: 'grid-circle', barCount: 2, gapRatio: 0.13, verticalBarPos: 0.50, curveAmount: 35 },
]

const SYMBOL_COLOR = '#C8CDD8'
const WATER_Y = 650

export default function ArirangAnimatedMoonWater() {
  return (
    <div style={{
      position: 'relative',
      width: '100vw',
      height: '100vh',
      overflow: 'hidden',
      background: '#030308',
      animation: 'arirang-emerge-scene 2.5s cubic-bezier(0.23, 1, 0.32, 1) both',
    }}>

      {/* ═══ Layer 1: Background (z:1) ═════════════════════════════════ */}
      <svg
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 1 }}
        viewBox="0 0 1920 1080"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="dalbit-bg" x1="960" y1="0" x2="960" y2="1080" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#0A0A14" />
            <stop offset="35%" stopColor="#060610" />
            <stop offset="100%" stopColor="#020205" />
          </linearGradient>
        </defs>
        <rect width="1920" height="1080" fill="url(#dalbit-bg)" />
      </svg>

      {/* ═══ Layer 2: Moonlight halos (z:3) ════════════════════════════ */}
      <svg
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 3, pointerEvents: 'none' }}
        viewBox="0 0 1920 1080"
        preserveAspectRatio="none"
      >
        <defs>
          {SYMBOLS.map((sym, i) => (
            <radialGradient
              key={i}
              id={`dalbit-halo-${i}`}
              cx={sym.cx}
              cy={sym.cy}
              r={sym.size * 2}
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor="#ffffff" stopOpacity={0.35} />
              <stop offset="40%" stopColor="#ffffff" stopOpacity={0.08} />
              <stop offset="100%" stopColor="#ffffff" stopOpacity={0} />
            </radialGradient>
          ))}
        </defs>
        {SYMBOLS.map((sym, i) => (
          <circle
            key={`halo-${i}`}
            cx={sym.cx}
            cy={sym.cy}
            r={sym.size * 2}
            fill={`url(#dalbit-halo-${i})`}
            style={{
              transformBox: 'fill-box',
              transformOrigin: 'center',
              animationName: 'dalbit-glow',
              animationDuration: '7s',
              animationTimingFunction: 'ease-in-out',
              animationIterationCount: 'infinite',
              animationDelay: `${i * 2.3}s`,
            }}
          />
        ))}
      </svg>

      {/* ═══ Water distortion filter (hidden SVG) ══════════════════════ */}
      <svg style={{ position: 'absolute', width: 0, height: 0 }} aria-hidden="true">
        <defs>
          <filter id="water-distort" x="-10%" y="-10%" width="120%" height="120%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.008"
              numOctaves={3}
              seed={42}
              result="noise"
            >
              <animate
                attributeName="baseFrequency"
                values="0.008;0.015;0.008"
                dur="8s"
                repeatCount="indefinite"
              />
            </feTurbulence>
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale={18}
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
      </svg>

      {/* ═══ Layer 3: Reflections (z:8) ════════════════════════════════ */}
      {SYMBOLS.map((sym, i) => (
        <div
          key={`refl-${i}`}
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 8,
            pointerEvents: 'none',
            transform: 'scaleY(-1)',
            transformOrigin: '0 60%',
            opacity: 0.18,
            filter: 'url(#water-distort)',
            maskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, transparent 60%)',
            WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, transparent 60%)',
          }}
        >
          <StageSymbols
            symbols={[sym]}
            color={SYMBOL_COLOR}
            opacity={0.9}
            glowBlur={8}
            pulseDuration={0}
          />
        </div>
      ))}

      {/* ═══ Layer 4: Water surface (z:9) ══════════════════════════════ */}
      <svg
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 9, pointerEvents: 'none' }}
        viewBox="0 0 1920 1080"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="dalbit-waterline" x1="0" y1={WATER_Y} x2="1920" y2={WATER_Y} gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#ffffff" stopOpacity={0} />
            <stop offset="15%" stopColor="#ffffff" stopOpacity={0.08} />
            <stop offset="50%" stopColor="#ffffff" stopOpacity={0.08} />
            <stop offset="85%" stopColor="#ffffff" stopOpacity={0.08} />
            <stop offset="100%" stopColor="#ffffff" stopOpacity={0} />
          </linearGradient>
        </defs>
        <rect
          x={0}
          y={WATER_Y - 1}
          width={1920}
          height={2}
          fill="url(#dalbit-waterline)"
        />
      </svg>

      {/* ═══ Layer 5: Main symbols (z:10) ══════════════════════════════ */}
      {SYMBOLS.map((sym, i) => (
        <div
          key={`main-${i}`}
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 10,
            pointerEvents: 'none',
            animationName: 'dalbit-float',
            animationDuration: '8s',
            animationTimingFunction: 'ease-in-out',
            animationIterationCount: 'infinite',
            animationDelay: `${i * 2.7}s`,
          }}
        >
          <StageSymbols
            symbols={[sym]}
            color={SYMBOL_COLOR}
            opacity={0.9}
            glowBlur={12}
            pulseDuration={0}
          />
        </div>
      ))}

      {/* ═══ Layer 6: Water ripples (z:14) ═════════════════════════════ */}
      <svg
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 14, pointerEvents: 'none' }}
        viewBox="0 0 1920 1080"
        preserveAspectRatio="none"
      >
        {SYMBOLS.map((sym, si) =>
          [0, 1, 2].map((ri) => (
            <circle
              key={`ripple-${si}-${ri}`}
              cx={sym.cx}
              cy={WATER_Y}
              r={250}
              fill="none"
              stroke="#ffffff"
              strokeWidth={1}
              style={{
                transformBox: 'fill-box',
                transformOrigin: 'center',
                animationName: 'dalbit-ripple',
                animationDuration: '4s',
                animationTimingFunction: 'ease-out',
                animationIterationCount: 'infinite',
                animationDelay: `${si * 1.0 + ri * 1.3}s`,
              }}
            />
          ))
        )}
      </svg>
    </div>
  )
}
