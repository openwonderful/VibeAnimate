import React, { useMemo } from 'react';
import { generateStarPositions } from '../../../utils/svgHelpers';
import type { StarData } from '../../../utils/svgHelpers';
import { useAnimTime, loopPhase, cosWave, lerp } from '../../../hooks/useAnimTime';

// Twinkle opacity ranges + durations by class (matches index.css keyframes).
const TWINKLE: Record<string, { min: number; max: number; dur: number }> = {
  'twinkle-slow':   { min: 0.3, max: 0.9,  dur: 4   },
  'twinkle-medium': { min: 0.4, max: 1.0,  dur: 2.5 },
  'twinkle-fast':   { min: 0.2, max: 0.85, dur: 1.5 },
};

function twinkleOpacity(t: number, star: StarData, scale: number = 1): number {
  const cfg = TWINKLE[star.animClass] ?? TWINKLE['twinkle-slow'];
  // 0%,100% → min ; 50% → max  (via cosine)
  const cos = cosWave(loopPhase(t, cfg.dur, -star.delay));
  const v = lerp(cfg.max, cfg.min, (cos + 1) / 2);
  return v * scale;
}

/**
 * StarField — 100 deterministically-placed twinkling stars across the
 * upper 60 % of the viewport, plus faint constellation lines and a
 * handful of brighter cross-shaped stars.
 *
 * z-index 10 — behind every scene element except the sky gradient.
 */

/** Constellation definitions: each is an array of indices into the
 *  star array.  We pick small groups of nearby stars so the
 *  connecting lines look plausible. */
const CONSTELLATION_GROUPS: number[][] = [
  [3, 11, 27, 42],   // group A — four stars
  [7, 19, 35],        // group B — three stars
  [52, 64, 78, 88],   // group C — four stars
];

const StarField: React.FC = () => {
  const t = useAnimTime();
  const stars: StarData[] = useMemo(
    () => generateStarPositions(100, 42, 1920, 1080),
    [],
  );

  return (
    <svg
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 10,
        pointerEvents: 'none',
      }}
      viewBox="0 0 1920 1080"
      preserveAspectRatio="xMidYMid slice"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Soft radial glow re-used by the brighter cross-stars. */}
        <radialGradient id="star-glow">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.9} />
          <stop offset="60%" stopColor="#FFFFFF" stopOpacity={0.3} />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity={0} />
        </radialGradient>
      </defs>

      {/* ── Constellation lines ─────────────────────────────────── */}
      {CONSTELLATION_GROUPS.map((group, gi) => (
        <g key={`constellation-${gi}`}>
          {group.map((starIdx, i) => {
            if (i === 0) return null;
            const prev = stars[group[i - 1]];
            const curr = stars[starIdx];
            if (!prev || !curr) return null;
            return (
              <line
                key={`cline-${gi}-${i}`}
                x1={prev.cx}
                y1={prev.cy}
                x2={curr.cx}
                y2={curr.cy}
                stroke="#FFFFFF"
                strokeWidth={0.6}
                opacity={0.04}
              />
            );
          })}
        </g>
      ))}

      {/* ── Stars ───────────────────────────────────────────────── */}
      {stars.map((star, i) => {
        const isBright = star.r > 1.5;
        const baseOp = twinkleOpacity(t, star, star.opacity);

        return (
          <g key={`star-${i}`}>
            {/* Base circle — every star gets one */}
            <circle
              cx={star.cx}
              cy={star.cy}
              r={star.r}
              fill="#FFFFFF"
              opacity={baseOp}
            />

            {/* Brighter stars get a subtle cross / plus shape and a
                soft glow halo to differentiate them. */}
            {isBright && (
              <>
                {/* Horizontal bar */}
                <rect
                  x={star.cx - star.r * 2.2}
                  y={star.cy - 0.35}
                  width={star.r * 4.4}
                  height={0.7}
                  rx={0.35}
                  fill="#FFFFFF"
                  opacity={baseOp * 0.55}
                />
                {/* Vertical bar */}
                <rect
                  x={star.cx - 0.35}
                  y={star.cy - star.r * 2.2}
                  width={0.7}
                  height={star.r * 4.4}
                  rx={0.35}
                  fill="#FFFFFF"
                  opacity={baseOp * 0.55}
                />
                {/* Soft glow circle behind */}
                <circle
                  cx={star.cx}
                  cy={star.cy}
                  r={star.r * 3.5}
                  fill="url(#star-glow)"
                  opacity={baseOp * 0.25}
                />
              </>
            )}
          </g>
        );
      })}
    </svg>
  );
};

export default StarField;
