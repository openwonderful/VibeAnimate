/**
 * ArirangAnimatedZenRipple — 파문 (Ripple)
 *
 * Extreme minimalism. Pure white symbols on pure black.
 * The only animation is expanding ripple rings around each symbol.
 *
 * CSS keyframe needed (add to index.css):
 * @keyframes zen-ripple-expand {
 *   0% { transform: scale(1); opacity: 0.25; }
 *   100% { transform: scale(2.2); opacity: 0; }
 * }
 *
 * Reuses existing: arirang-emerge-scene
 */
import StageSymbols, { type SymbolConfig } from '../act2/stage/StageSymbols';

const SYMBOLS: SymbolConfig[] = [
  { cx: 360, cy: 540, size: 250, variant: 'ring', holeRatio: 0.54 },
  { cx: 960, cy: 540, size: 250, variant: 'barred-circle', barCount: 2, gapRatio: 0.13, curveAmount: 35 },
  { cx: 1560, cy: 540, size: 250, variant: 'grid-circle', barCount: 2, gapRatio: 0.13, verticalBarPos: 0.50, curveAmount: 35 },
];

const RIPPLE_COUNT = 5;
const RIPPLE_STAGGER = 0.8; // seconds between each ring

export default function ArirangAnimatedZenRipple() {
  return (
    <div style={{
      position: 'relative', width: '100vw', height: '100vh',
      overflow: 'hidden', background: '#000',
      animation: 'arirang-emerge-scene 2s ease-out both',
    }}>
      {/* Ripple rings (z:5) */}
      <svg viewBox="0 0 1920 1080" preserveAspectRatio="none"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 5 }}>
        {SYMBOLS.map((sym, si) =>
          Array.from({ length: RIPPLE_COUNT }, (_, ri) => (
            <circle key={`${si}-${ri}`}
              cx={sym.cx} cy={sym.cy} r={sym.size}
              fill="none" stroke="#ffffff" strokeWidth={1}
              style={{
                animationName: 'zen-ripple-expand',
                animationDuration: '4s',
                animationTimingFunction: 'ease-out',
                animationIterationCount: 'infinite',
                animationDelay: `${ri * RIPPLE_STAGGER}s`,
                transformBox: 'fill-box',
                transformOrigin: 'center',
              }}
            />
          ))
        )}
      </svg>

      {/* Main symbols (z:10) — static, no pulse */}
      <StageSymbols
        symbols={SYMBOLS}
        color="#ffffff"
        opacity={0.9}
        glowBlur={3}
        pulseDuration={0}
      />
    </div>
  );
}
