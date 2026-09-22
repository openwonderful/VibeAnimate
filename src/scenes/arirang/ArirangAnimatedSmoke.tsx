/**
 * ArirangAnimatedSmoke — Temple incense / smoke variant of the Arirang symbols.
 *
 * White/gray symbols on pure black. Symbols emerge from and dissolve into smoke.
 * Maximum negative space. No color, no particles, no stars, no rings.
 *
 * CSS keyframes needed (add to index.css):
 *
 * @keyframes smoke-wisp-drift {
 *   0%   { transform: translateY(0) translateX(0); opacity: 1; }
 *   50%  { transform: translateY(-100px) translateX(25px); opacity: 0.7; }
 *   100% { transform: translateY(-200px) translateX(-15px); opacity: 0.3; }
 * }
 *
 * @keyframes smoke-symbol-breathe {
 *   0%, 100% { opacity: 0.4; }
 *   50%      { opacity: 0.85; }
 * }
 *
 * @keyframes smoke-glow-breathe {
 *   0%, 100% { opacity: 0.05; transform: scale(1); }
 *   50%      { opacity: 0.12; transform: scale(1.04); }
 * }
 */

import { seededRandom } from '../../utils/svgHelpers'
import StageSymbols, { type SymbolConfig } from '../act2/stage/StageSymbols'

const SYMBOLS: SymbolConfig[] = [
  { cx: 360, cy: 540, size: 250, variant: 'ring', holeRatio: 0.54 },
  { cx: 960, cy: 540, size: 250, variant: 'barred-circle', barCount: 2, gapRatio: 0.13, curveAmount: 35 },
  { cx: 1560, cy: 540, size: 250, variant: 'grid-circle', barCount: 2, gapRatio: 0.13, verticalBarPos: 0.50, curveAmount: 35 },
]

export default function ArirangAnimatedSmoke() {
  const rand = seededRandom(888)

  // ── Smoke wisps: 4 per symbol ────────────────────────────────────
  const wisps = SYMBOLS.flatMap((sym) =>
    Array.from({ length: 4 }, () => {
      const offsetX = (rand() - 0.5) * sym.size * 0.8
      const cy = sym.cy - 50 - rand() * 150
      const rx = 30 + rand() * 50
      const ry = 60 + rand() * 90
      const opacity = 0.04 + rand() * 0.06
      const blur = 35 + rand() * 15
      const duration = 12 + rand() * 6
      const delay = rand() * 10
      return {
        cx: sym.cx + offsetX,
        cy,
        rx,
        ry,
        opacity,
        blur,
        duration,
        delay,
      }
    })
  )

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        background: '#000000',
        overflow: 'hidden',
        animationName: 'arirang-emerge-scene',
        animationDuration: '2s',
        animationTimingFunction: 'ease-out',
        animationFillMode: 'both',
      }}
    >
      {/* ── Layer 1: Background — pure black (handled by container bg) ── */}

      {/* ── Layer 2: Inner glow (z:5) ── */}
      <svg
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          zIndex: 5,
          pointerEvents: 'none',
        }}
        viewBox="0 0 1920 1080"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {SYMBOLS.map((sym, i) => (
            <radialGradient
              key={`glow-grad-${i}`}
              id={`smoke-glow-grad-${i}`}
              cx={sym.cx}
              cy={sym.cy}
              r={sym.size * 1.2}
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor="#ffffff" stopOpacity={0.35} />
              <stop offset="40%" stopColor="#ffffff" stopOpacity={0.12} />
              <stop offset="100%" stopColor="#ffffff" stopOpacity={0} />
            </radialGradient>
          ))}
        </defs>
        {SYMBOLS.map((sym, i) => (
          <circle
            key={`glow-${i}`}
            cx={sym.cx}
            cy={sym.cy}
            r={sym.size * 1.2}
            fill={`url(#smoke-glow-grad-${i})`}
            style={{
              animationName: 'smoke-glow-breathe',
              animationDuration: '6s',
              animationTimingFunction: 'ease-in-out',
              animationIterationCount: 'infinite',
              animationDelay: `${i * 1.8}s`,
              transformOrigin: `${sym.cx}px ${sym.cy}px`,
            }}
          />
        ))}
      </svg>

      {/* ── Layer 3: Smoke wisps (z:8) ── */}
      <svg
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          zIndex: 8,
          pointerEvents: 'none',
        }}
        viewBox="0 0 1920 1080"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {wisps.map((w, i) => (
            <filter
              key={`wisp-blur-${i}`}
              id={`wisp-blur-${i}`}
              x="-100%"
              y="-100%"
              width="300%"
              height="300%"
            >
              <feGaussianBlur in="SourceGraphic" stdDeviation={w.blur} />
            </filter>
          ))}
        </defs>
        {wisps.map((w, i) => (
          <ellipse
            key={`wisp-${i}`}
            cx={w.cx}
            cy={w.cy}
            rx={w.rx}
            ry={w.ry}
            fill="#ffffff"
            opacity={w.opacity}
            filter={`url(#wisp-blur-${i})`}
            style={{
              animationName: 'smoke-wisp-drift',
              animationDuration: `${w.duration}s`,
              animationTimingFunction: 'ease-in-out',
              animationIterationCount: 'infinite',
              animationDelay: `${w.delay}s`,
            }}
          />
        ))}
      </svg>

      {/* ── Layer 4: Smoke distortion filter (hidden SVG) ── */}
      <svg
        style={{ position: 'absolute', width: 0, height: 0 }}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <filter id="smoke-distort" x="-10%" y="-10%" width="120%" height="120%">
            <feTurbulence
              type="turbulence"
              numOctaves={3}
              seed={42}
              result="turbulence"
            >
              <animate
                attributeName="baseFrequency"
                values="0.004 0.006;0.012 0.008;0.004 0.006"
                dur="15s"
                repeatCount="indefinite"
              />
            </feTurbulence>
            <feDisplacementMap
              in="SourceGraphic"
              in2="turbulence"
              scale={18}
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
      </svg>

      {/* ── Layer 5: Main symbols (z:15) ── */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          zIndex: 15,
          pointerEvents: 'none',
          filter: 'url(#smoke-distort)',
          animationName: 'smoke-symbol-breathe',
          animationDuration: '8s',
          animationTimingFunction: 'ease-in-out',
          animationIterationCount: 'infinite',
        }}
      >
        <StageSymbols
          symbols={SYMBOLS}
          color="#ffffff"
          opacity={1}
          glowBlur={14}
          pulseDuration={0}
        />
      </div>
    </div>
  )
}
