import React, { useMemo } from 'react';
import { generateBlossomPositions } from '../../../utils/svgHelpers';
import { CORAL_PINK, SOFT_PEACH, WARM_CREAM, HWANG } from '../../../theme/colors';
import { useAnimTime, loopPhase, keyframeLerp } from '../../../hooks/useAnimTime';

/**
 * BlossomLayer -- 40 cherry/plum blossom petals (매화 / 벚꽃) drifting across
 * the scene, plus 3 complete static blossoms perched on the mountain ridgeline.
 *
 * Each falling petal uses a 3-level nested div structure so fall, sway, and
 * spin can animate independently on different axes. The petal shape is a
 * teardrop SVG path.
 *
 * The static blossoms are 5-petal rosettes with a golden (HWANG) center
 * cluster, positioned at fixed ridgeline coordinates.
 *
 * z-index 55 -- between cranes (50) and waves (60).
 */

/* ── Teardrop petal SVG path ────────────────────────────────────── */
const PETAL_PATH = 'M 5 0 C 8 3 10 8 5 14 C 0 8 2 3 5 0';

/* ── Static blossom component (5 petals + gold center) ──────────── */
interface StaticBlossomProps {
  cx: number;    // percentage from left
  cy: number;    // percentage from top
  size: number;  // overall scale in px
  color: string;
}

const StaticBlossom: React.FC<StaticBlossomProps> = ({ cx, cy, size, color }) => {
  return (
    <div
      style={{
        position: 'absolute',
        left: `${cx}%`,
        top: `${cy}%`,
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox="-18 -18 36 36"
        xmlns="http://www.w3.org/2000/svg"
        style={{ overflow: 'visible' }}
      >
        {/* 5 petals rotated 72 degrees apart */}
        {[0, 72, 144, 216, 288].map((angle) => (
          <g key={angle} transform={`rotate(${angle} 0 0)`}>
            <path
              d="M 0 -2 C 4 -6 6 -14 0 -16 C -6 -14 -4 -6 0 -2 Z"
              fill={color}
              stroke={color}
              strokeWidth={0.3}
              opacity={0.85}
            />
          </g>
        ))}
        {/* Center cluster -- 5 tiny gold circles */}
        <circle cx={0} cy={0} r={2.2} fill={HWANG} />
        <circle cx={1.5} cy={-1} r={1} fill={HWANG} opacity={0.8} />
        <circle cx={-1.5} cy={-1} r={1} fill={HWANG} opacity={0.8} />
        <circle cx={1} cy={1.3} r={0.9} fill={HWANG} opacity={0.7} />
        <circle cx={-1} cy={1.3} r={0.9} fill={HWANG} opacity={0.7} />
      </svg>
    </div>
  );
};

/* ── Static blossom placements on mountain ridgelines ───────────── */
const staticBlossoms: StaticBlossomProps[] = [
  { cx: 18, cy: 52, size: 28, color: CORAL_PINK },
  { cx: 55, cy: 46, size: 32, color: SOFT_PEACH },
  { cx: 78, cy: 50, size: 24, color: WARM_CREAM },
];

/* ── Main layer component ───────────────────────────────────────── */
const BlossomLayer: React.FC = () => {
  const t = useAnimTime();
  const blossoms = useMemo(
    () =>
      generateBlossomPositions(40, 77, [CORAL_PINK, SOFT_PEACH, WARM_CREAM]),
    [],
  );

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 55,
        pointerEvents: 'none',
      }}
    >
      {/* ─── Falling petals ─── */}
      {blossoms.map((b, i) => {
        // blossom-fall: translateY(-60px → calc(100vh + 60px)) linear
        const fallP = loopPhase(t, b.fallDuration, b.delay);
        const fallY = `translateY(calc(${-60 + 120 * fallP}px + ${100 * fallP}vh))`;
        // blossom-sway: translateX 0→35→0→-25→0 at 0,25,75,100 ease-in-out
        const swayP = loopPhase(t, b.swayDuration, b.delay);
        const swayX = keyframeLerp(swayP, [
          { at: 0,    value: 0  },
          { at: 0.25, value: 35 },
          { at: 0.75, value: -25 },
          { at: 1,    value: 0  },
        ]);
        return (
        /* Outer: absolute positioning + fall */
        <div
          key={i}
          style={{
            position: 'absolute',
            left: `${b.x}%`,
            top: 0,
            transform: fallY,
          }}
        >
          {/* Middle: horizontal sway */}
          <div
            style={{
              transform: `translateX(${swayX}px)`,
            }}
          >
            {/* Inner: the petal SVG */}
            <svg
              width={10 * b.scale}
              height={14 * b.scale}
              viewBox="0 0 10 14"
              xmlns="http://www.w3.org/2000/svg"
              style={{
                opacity: b.opacity,
                transform: `rotate(${b.rotation}deg)`,
                display: 'block',
              }}
            >
              <path
                d={PETAL_PATH}
                fill={b.color}
                stroke={b.color}
                strokeWidth={0.5}
                strokeOpacity={0.5}
              />
            </svg>
          </div>
        </div>
        );
      })}

      {/* ─── Static ridgeline blossoms ─── */}
      {staticBlossoms.map((sb, i) => (
        <StaticBlossom key={`static-${i}`} {...sb} />
      ))}
    </div>
  );
};

export default BlossomLayer;
