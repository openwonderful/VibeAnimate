/*
 * CSS keyframes required (add to index.css):
 *
 * @keyframes ink-breathe-a {
 *   0%, 100% { opacity: 0.15; transform: scale(1); }
 *   50% { opacity: 0.35; transform: scale(1.04); }
 * }
 *
 * @keyframes ink-breathe-b {
 *   0%, 100% { opacity: 0.10; transform: scale(1); }
 *   50% { opacity: 0.28; transform: scale(1.06); }
 * }
 *
 * @keyframes ink-breathe-c {
 *   0%, 100% { opacity: 0.08; transform: scale(1); }
 *   50% { opacity: 0.22; transform: scale(1.08); }
 * }
 *
 * @keyframes ink-symbol-breathe {
 *   0%, 100% { opacity: 0.7; }
 *   50% { opacity: 0.95; }
 * }
 */

import StageSymbols, { type SymbolConfig } from '../act2/stage/StageSymbols'

/**
 * ArirangAnimatedInkWash — Ink wash (수묵화) Arirang symbol scene.
 *
 * Korean ink painting aesthetic: meditative, organic, fluid.
 * White symbols on black. No color.
 *
 * Layers (bottom to top):
 *  1. Background — pure black with subtle dark gray radial gradient
 *  2. Ink diffusion glow — 3 radial gradient circles per symbol, breathing
 *  3. Paper grain — feTurbulence fractalNoise overlay
 *  4. Main symbols — StageSymbols white, with breathing opacity + fluid distortion
 *  5. Fluid distortion filter — hidden SVG with SMIL-animated feTurbulence
 *  6. Entrance — arirang-emerge-scene fade-in
 */

const SYMBOLS: SymbolConfig[] = [
  { cx: 360, cy: 540, size: 250, variant: 'ring', holeRatio: 0.54 },
  { cx: 960, cy: 540, size: 250, variant: 'barred-circle', barCount: 2, gapRatio: 0.13, curveAmount: 35 },
  { cx: 1560, cy: 540, size: 250, variant: 'grid-circle', barCount: 2, gapRatio: 0.13, verticalBarPos: 0.50, curveAmount: 35 },
]

/** Breathing animation configs for the 3 ink diffusion layers per symbol */
const INK_BREATH_LAYERS = [
  { anim: 'ink-breathe-a', duration: '6s',  radius: 1.3 },
  { anim: 'ink-breathe-b', duration: '8s',  radius: 1.0 },
  { anim: 'ink-breathe-c', duration: '11s', radius: 0.7 },
] as const

export default function ArirangAnimatedInkWash() {
  return (
    <div style={{
      position: 'relative',
      width: '100vw',
      height: '100vh',
      overflow: 'hidden',
      background: '#000',
      animation: 'arirang-emerge-scene 2.5s cubic-bezier(0.23, 1, 0.32, 1) both',
    }}>

      {/* ═══ Layer 1: Background — black with subtle center gradient ═══ */}
      <svg
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        viewBox="0 0 1920 1080"
        preserveAspectRatio="none"
      >
        <defs>
          <radialGradient id="ink-bg-grad" cx="960" cy="540" r="960" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#080808" />
            <stop offset="100%" stopColor="#000000" />
          </radialGradient>
        </defs>
        <rect width="1920" height="1080" fill="url(#ink-bg-grad)" />
      </svg>

      {/* ═══ Layer 2: Ink diffusion glow — 3 breathing circles per symbol ═══ */}
      <svg
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
        viewBox="0 0 1920 1080"
        preserveAspectRatio="none"
      >
        <defs>
          {SYMBOLS.map((sym, si) =>
            INK_BREATH_LAYERS.map((layer, li) => (
              <radialGradient
                key={`ink-diff-grad-${si}-${li}`}
                id={`ink-diff-grad-${si}-${li}`}
                cx={sym.cx}
                cy={sym.cy}
                r={sym.size * layer.radius}
                gradientUnits="userSpaceOnUse"
              >
                <stop offset="0%" stopColor="#ffffff" stopOpacity={0.25 - li * 0.06} />
                <stop offset="50%" stopColor="#ffffff" stopOpacity={0.08 - li * 0.02} />
                <stop offset="100%" stopColor="#ffffff" stopOpacity={0} />
              </radialGradient>
            ))
          )}
        </defs>

        {SYMBOLS.map((sym, si) =>
          INK_BREATH_LAYERS.map((layer, li) => (
            <circle
              key={`ink-diff-${si}-${li}`}
              cx={sym.cx}
              cy={sym.cy}
              r={sym.size * layer.radius}
              fill={`url(#ink-diff-grad-${si}-${li})`}
              style={{
                transformBox: 'fill-box',
                transformOrigin: 'center',
                animationName: layer.anim,
                animationDuration: layer.duration,
                animationTimingFunction: 'ease-in-out',
                animationIterationCount: 'infinite',
                animationDelay: `${si * 0.8}s`,
              }}
            />
          ))
        )}
      </svg>

      {/* ═══ Layer 3: Paper grain — static feTurbulence noise ═══ */}
      <svg
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
        viewBox="0 0 1920 1080"
        preserveAspectRatio="none"
      >
        <defs>
          <filter id="ink-paper-grain" x="0" y="0" width="100%" height="100%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.65"
              numOctaves={4}
              stitchTiles="stitch"
              result="grain"
            />
            <feColorMatrix
              in="grain"
              type="saturate"
              values="0"
              result="grayGrain"
            />
          </filter>
        </defs>
        <rect
          width="1920"
          height="1080"
          filter="url(#ink-paper-grain)"
          opacity={0.04}
        />
      </svg>

      {/* ═══ Layer 5 (rendered before layer 4 in DOM, but layer 4 visually on top):
           Fluid distortion filter — hidden SVG with SMIL animation ═══ */}
      <svg
        style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}
        aria-hidden="true"
      >
        <defs>
          <filter id="ink-distortion" x="-10%" y="-10%" width="120%" height="120%">
            <feTurbulence
              type="turbulence"
              baseFrequency="0.003 0.003"
              numOctaves={2}
              seed={42}
              result="warp"
            >
              <animate
                attributeName="baseFrequency"
                values="0.003 0.003;0.008 0.004;0.003 0.003"
                dur="10s"
                repeatCount="indefinite"
              />
            </feTurbulence>
            <feDisplacementMap
              in="SourceGraphic"
              in2="warp"
              scale={10}
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
      </svg>

      {/* ═══ Layer 4: Main symbols — white, glowing, breathing, distorted ═══ */}
      <div style={{
        position: 'absolute',
        inset: 0,
        animationName: 'ink-symbol-breathe',
        animationDuration: '6s',
        animationTimingFunction: 'ease-in-out',
        animationIterationCount: 'infinite',
        filter: 'url(#ink-distortion)',
      }}>
        <StageSymbols
          symbols={SYMBOLS}
          color="#ffffff"
          glowBlur={18}
          opacity={0.85}
          pulseDuration={0}
        />
      </div>

    </div>
  )
}
