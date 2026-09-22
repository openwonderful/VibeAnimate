import React from 'react';
import { JEOK, HWANG, WARM_CREAM, CORAL_PINK } from '../../../theme/colors';
import { useAnimTime, loopPhase, cosWave, lerp } from '../../../hooks/useAnimTime';

/**
 * ArtistBadge - "BTS" rendered in a traditional Korean seal (도장) style cartouche.
 *
 * An elliptical frame with peony accents on each side, positioned above the main title.
 * Floats gently with the float-up-down animation.
 */

const ArtistBadge: React.FC = () => {
  const t = useAnimTime();
  // float-up-down: translateY(0 → -12 → 0) over 6s ease-in-out
  const floatY = lerp(0, -12, (1 - cosWave(loopPhase(t, 6))) / 2);
  const svgWidth = 160;
  const svgHeight = 70;
  const cx = svgWidth / 2;
  const cy = svgHeight / 2;

  // Simplified 3-petal peony accent
  const PeonyAccent: React.FC<{ x: number; y: number; flip?: boolean }> = ({
    x,
    y,
    flip,
  }) => {
    const scaleX = flip ? -1 : 1;
    return (
      <g transform={`translate(${x},${y}) scale(${scaleX},1)`}>
        {/* Center petal */}
        <path
          d="M 0 0 Q -2 -4 0 -6 Q 2 -4 0 0"
          fill={CORAL_PINK}
          opacity={0.8}
        />
        {/* Left petal */}
        <path
          d="M 0 0 Q -4 -3 -3 -6 Q -1 -4 0 0"
          fill={CORAL_PINK}
          opacity={0.6}
        />
        {/* Right petal */}
        <path
          d="M 0 0 Q 4 -3 3 -6 Q 1 -4 0 0"
          fill={CORAL_PINK}
          opacity={0.6}
        />
        {/* Tiny center dot */}
        <circle cx={0} cy={-2} r={0.6} fill={HWANG} opacity={0.8} />
      </g>
    );
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: '27%',
        left: '50%',
        transform: `translateX(-50%) translateY(${floatY}px)`,
        zIndex: 80,
        pointerEvents: 'none',
      }}
      aria-hidden="true"
    >
      <svg
        width={svgWidth}
        height={svgHeight}
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Decorative line above */}
        <line
          x1={cx - 15}
          y1={12}
          x2={cx + 15}
          y2={12}
          stroke={HWANG}
          strokeWidth={0.8}
          opacity={0.3}
        />
        {/* Small dots at ends of upper line */}
        <circle cx={cx - 15} cy={12} r={0.8} fill={HWANG} opacity={0.3} />
        <circle cx={cx + 15} cy={12} r={0.8} fill={HWANG} opacity={0.3} />

        {/* Ellipse frame */}
        <ellipse
          cx={cx}
          cy={cy}
          rx={45}
          ry={20}
          stroke={JEOK}
          strokeWidth={2}
          fill={JEOK}
          fillOpacity={0.12}
        />

        {/* Inner thin ellipse line for extra detail */}
        <ellipse
          cx={cx}
          cy={cy}
          rx={41}
          ry={17}
          stroke={JEOK}
          strokeWidth={0.5}
          fill="none"
          opacity={0.4}
        />

        {/* "BTS" text */}
        <text
          x={cx}
          y={cy + 1}
          fill={WARM_CREAM}
          fontFamily="'Playfair Display', serif"
          fontWeight={900}
          fontSize={18}
          letterSpacing="0.4em"
          textAnchor="middle"
          dominantBaseline="central"
        >
          BTS
        </text>

        {/* Peony accents on each side */}
        <PeonyAccent x={cx - 50} y={cy + 2} />
        <PeonyAccent x={cx + 50} y={cy + 2} flip />

        {/* Decorative line below */}
        <line
          x1={cx - 15}
          y1={svgHeight - 12}
          x2={cx + 15}
          y2={svgHeight - 12}
          stroke={HWANG}
          strokeWidth={0.8}
          opacity={0.3}
        />
        {/* Small dots at ends of lower line */}
        <circle cx={cx - 15} cy={svgHeight - 12} r={0.8} fill={HWANG} opacity={0.3} />
        <circle cx={cx + 15} cy={svgHeight - 12} r={0.8} fill={HWANG} opacity={0.3} />
      </svg>
    </div>
  );
};

export default ArtistBadge;
