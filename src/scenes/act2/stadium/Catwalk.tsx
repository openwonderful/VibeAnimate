import React from 'react';
import { CONCERT_CYAN } from '../../../theme/colors';

/**
 * Catwalk — BTS concert T-shaped runway extending from stage into the crowd.
 *
 * z-index 25
 */

/** Dot lights along the main runway edges */
const RUNWAY_DOTS_LEFT = Array.from({ length: 9 }, (_, i) => ({
  cx: 938,
  cy: 960 - i * 23,
}));
const RUNWAY_DOTS_RIGHT = Array.from({ length: 9 }, (_, i) => ({
  cx: 982,
  cy: 960 - i * 23,
}));

const Catwalk: React.FC = () => {
  return (
    <svg
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 25,
        pointerEvents: 'none',
      }}
      viewBox="0 0 1920 1080"
      preserveAspectRatio="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <filter id="catwalk-glow">
          <feGaussianBlur stdDeviation={3} />
        </filter>
      </defs>

      {/* ── LED edge glow (rendered first, beneath solid shapes) ── */}
      {/* Runway glow */}
      <rect
        x={940} y={750} width={40} height={210}
        fill="none"
        stroke={CONCERT_CYAN}
        strokeWidth={2}
        opacity={0.15}
        filter="url(#catwalk-glow)"
      />
      {/* Cross piece glow */}
      <rect
        x={700} y={790} width={560} height={20}
        fill="none"
        stroke={CONCERT_CYAN}
        strokeWidth={2}
        opacity={0.15}
        filter="url(#catwalk-glow)"
      />
      {/* B-stage glow */}
      <circle
        cx={960} cy={750} r={25}
        fill="none"
        stroke={CONCERT_CYAN}
        strokeWidth={2}
        opacity={0.15}
        filter="url(#catwalk-glow)"
      />

      {/* ── Main runway ──────────────────────────────────────── */}
      <rect
        x={940} y={750} width={40} height={210}
        fill="#111128"
        stroke={CONCERT_CYAN}
        strokeWidth={1}
        strokeOpacity={0.5}
      />

      {/* ── Cross piece ──────────────────────────────────────── */}
      <rect
        x={700} y={790} width={560} height={20}
        fill="#111128"
        stroke={CONCERT_CYAN}
        strokeWidth={1}
        strokeOpacity={0.5}
      />

      {/* ── B-stage circle ───────────────────────────────────── */}
      <circle
        cx={960} cy={750} r={25}
        fill="#111128"
        stroke={CONCERT_CYAN}
        strokeWidth={1}
        strokeOpacity={0.5}
      />

      {/* ── Dot lights along runway edges ────────────────────── */}
      {RUNWAY_DOTS_LEFT.map((dot, i) => (
        <circle
          key={`dot-l-${i}`}
          cx={dot.cx} cy={dot.cy}
          r={1.5}
          fill={CONCERT_CYAN}
          opacity={0.4}
        />
      ))}
      {RUNWAY_DOTS_RIGHT.map((dot, i) => (
        <circle
          key={`dot-r-${i}`}
          cx={dot.cx} cy={dot.cy}
          r={1.5}
          fill={CONCERT_CYAN}
          opacity={0.4}
        />
      ))}
    </svg>
  );
};

export default Catwalk;
