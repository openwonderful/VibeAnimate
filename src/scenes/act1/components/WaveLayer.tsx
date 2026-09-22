import React, { useMemo } from 'react';
import {
  CHEONG,
  DANCHEONG_TEAL,
  DANCHEONG_GREEN,
  DEEP_INDIGO,
} from '../../../theme/colors';
import { useAnimTime, loopPhase } from '../../../hooks/useAnimTime';

/**
 * WaveLayer -- Traditional Korean wave pattern (파도문 / 波濤紋) rendered as
 * four overlapping SVG wave bands at the bottom 18% of the viewport.
 *
 * Each layer is wider than the viewport so its horizontal `wave-drift` /
 * `wave-drift-slow` animation loops seamlessly without visible seams.
 * The backmost waves include spiral curl (소용돌이) details at crests;
 * the third layer carries tiny foam marks for texture.
 *
 * z-index 60 -- in front of mountains, cranes, and blossoms.
 */

/* ── Wave path generator ────────────────────────────────────────── */
function buildWavePath(
  crests: number,
  amplitude: number,
  baseY: number,
  totalWidth: number,
): string {
  const segW = totalWidth / crests;
  const parts: string[] = [`M 0 ${baseY}`];

  for (let i = 0; i < crests; i++) {
    const x0 = i * segW;
    const x1 = x0 + segW;
    const midX = (x0 + x1) / 2;
    // Crest then trough via cubic bezier
    parts.push(
      `C ${x0 + segW * 0.25} ${baseY - amplitude} ${midX - segW * 0.08} ${baseY - amplitude} ${midX} ${baseY}`,
    );
    parts.push(
      `C ${midX + segW * 0.08} ${baseY + amplitude * 0.5} ${x1 - segW * 0.25} ${baseY + amplitude * 0.5} ${x1} ${baseY}`,
    );
  }

  // Close downward to fill below
  parts.push(`L ${totalWidth} ${baseY + 300} L 0 ${baseY + 300} Z`);
  return parts.join(' ');
}

/* ── Spiral curl at wave crest ──────────────────────────────────── */
function spiralCurl(cx: number, cy: number, r: number): string {
  // Approximates a 270-degree inward spiral
  return [
    `M ${cx + r} ${cy}`,
    `A ${r} ${r} 0 0 1 ${cx} ${cy + r}`,
    `A ${r * 0.7} ${r * 0.7} 0 0 1 ${cx - r * 0.7} ${cy + r * 0.3}`,
    `A ${r * 0.4} ${r * 0.4} 0 0 1 ${cx - r * 0.1} ${cy - r * 0.1}`,
  ].join(' ');
}

/* ── Shared container style ─────────────────────────────────────── */
const extendedWidth: React.CSSProperties = {
  width: 'calc(100% + 400px)',
  marginLeft: '-200px',
  display: 'block',
};

const WaveLayer: React.FC = () => {
  const t = useAnimTime();
  /*
   * Pre-compute all wave paths once. Total drawing width matches the
   * extended container so every crest is visible during the drift.
   */
  const W = 2320; // viewport-width + 400px margin
  const viewBox = `0 0 ${W} 200`;

  // wave-drift: translateX(0 → -200) linear infinite
  // wave-drift-slow: translateX(0 → -180) linear infinite
  const driftX = (range: number, duration: number) =>
    `translateX(${-range * loopPhase(t, duration)}px)`;

  const wave1Path = useMemo(() => buildWavePath(6, 18, 40, W), []);
  const wave2Path = useMemo(() => buildWavePath(7, 14, 50, W), []);
  const wave3Path = useMemo(() => buildWavePath(8, 10, 55, W), []);
  const wave4Path = useMemo(() => buildWavePath(9, 8, 60, W), []);

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        width: '100%',
        height: '18%',
        zIndex: 60,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    >
      {/* ─── Wave 1 (backmost) ─── */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          transform: driftX(200, 20),
          willChange: 'transform',
        }}
      >
        <svg
          viewBox={viewBox}
          preserveAspectRatio="none"
          style={extendedWidth}
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d={wave1Path} fill={CHEONG} opacity={0.35} />
          {/* Spiral curl details at selected crests */}
          <path
            d={spiralCurl(W / 6 / 2, 24, 5)}
            fill="none"
            stroke="white"
            strokeWidth={0.8}
            opacity={0.12}
          />
          <path
            d={spiralCurl((W / 6) * 2.5, 24, 4)}
            fill="none"
            stroke="white"
            strokeWidth={0.8}
            opacity={0.12}
          />
          <path
            d={spiralCurl((W / 6) * 4.5, 25, 5.5)}
            fill="none"
            stroke="white"
            strokeWidth={0.7}
            opacity={0.1}
          />
        </svg>
      </div>

      {/* ─── Wave 2 ─── */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          transform: driftX(200, 16),
          willChange: 'transform',
        }}
      >
        <svg
          viewBox={viewBox}
          preserveAspectRatio="none"
          style={extendedWidth}
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d={wave2Path} fill={DANCHEONG_TEAL} opacity={0.45} />
        </svg>
      </div>

      {/* ─── Wave 3 ─── */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          transform: driftX(180, 12),
          willChange: 'transform',
        }}
      >
        <svg
          viewBox={viewBox}
          preserveAspectRatio="none"
          style={extendedWidth}
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d={wave3Path} fill={DANCHEONG_GREEN} opacity={0.55} />
          {/* Foam marks -- small dots / dashes near crests */}
          {[290, 580, 870, 1160, 1450].map((fx, i) => (
            <g key={i} opacity={0.15}>
              <circle cx={fx} cy={48} r={1.2} fill="white" />
              <line
                x1={fx + 6}
                y1={47}
                x2={fx + 12}
                y2={47}
                stroke="white"
                strokeWidth={0.8}
                strokeLinecap="round"
              />
            </g>
          ))}
        </svg>
      </div>

      {/* ─── Wave 4 (frontmost) ─── */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          transform: driftX(180, 8),
          willChange: 'transform',
        }}
      >
        <svg
          viewBox={viewBox}
          preserveAspectRatio="none"
          style={extendedWidth}
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d={wave4Path} fill={DEEP_INDIGO} opacity={0.8} />
        </svg>
      </div>
    </div>
  );
};

export default WaveLayer;
