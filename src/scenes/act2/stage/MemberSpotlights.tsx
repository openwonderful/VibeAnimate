import React from 'react';
import { CONCERT_WHITE } from '../../../theme/colors';

/**
 * MemberSpotlights — 7 visible volumetric spotlight cones from above,
 * one for each member. Each spotlight has a gradient cone, a radial
 * light pool at feet, a fixture dot at the top, and a shared haze band.
 *
 * z-index 45.
 */

interface SpotMember {
  x: number;
  y: number;
  baseHalf: number;
}

const MEMBERS: SpotMember[] = [
  { x: 960,  y: 640, baseHalf: 55 },  // center
  { x: 760,  y: 600, baseHalf: 50 },  // inner left
  { x: 1160, y: 600, baseHalf: 50 },  // inner right
  { x: 580,  y: 560, baseHalf: 45 },  // mid left
  { x: 1340, y: 560, baseHalf: 45 },  // mid right
  { x: 420,  y: 530, baseHalf: 40 },  // outer left
  { x: 1500, y: 530, baseHalf: 40 },  // outer right
];

const MemberSpotlights: React.FC = () => (
  <svg
    style={{
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      zIndex: 45,
      pointerEvents: 'none',
    }}
    viewBox="0 0 1920 1080"
    preserveAspectRatio="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      {/* Cone gradient — volumetric falloff with mid-bloom */}
      {MEMBERS.map((_, i) => (
        <linearGradient
          key={`spot-grad-${i}`}
          id={`spot-cone-${i}`}
          x1="0.5"
          y1="0"
          x2="0.5"
          y2="1"
        >
          <stop offset="0%" stopColor={CONCERT_WHITE} stopOpacity={0.06} />
          <stop offset="40%" stopColor={CONCERT_WHITE} stopOpacity={0.12} />
          <stop offset="100%" stopColor={CONCERT_WHITE} stopOpacity={0.18} />
        </linearGradient>
      ))}

      {/* Light pool radial gradient */}
      <radialGradient id="spot-pool" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor={CONCERT_WHITE} stopOpacity={0.2} />
        <stop offset="100%" stopColor={CONCERT_WHITE} stopOpacity={0} />
      </radialGradient>

      {/* Haze band blur */}
      <filter id="haze-blur">
        <feGaussianBlur stdDeviation="20" />
      </filter>
    </defs>

    {/* Atmospheric haze band */}
    <rect
      x={0}
      y={250}
      width={1920}
      height={100}
      fill="white"
      opacity={0.03}
      filter="url(#haze-blur)"
    />

    {MEMBERS.map((m, i) => {
      const apexHalf = 4;
      const baseY = m.y - 30;

      const points = [
        `${m.x - apexHalf},0`,
        `${m.x + apexHalf},0`,
        `${m.x + m.baseHalf},${baseY}`,
        `${m.x - m.baseHalf},${baseY}`,
      ].join(' ');

      return (
        <g
          key={`spotlight-${i}`}
          style={{
            animationName: 'spot-breathe',
            animationDuration: '3s',
            animationDelay: `${i * 0.4}s`,
            animationTimingFunction: 'ease-in-out',
            animationIterationCount: 'infinite',
          }}
        >
          {/* Fixture dot at top */}
          <circle
            cx={m.x}
            cy={0}
            r={3}
            fill={CONCERT_WHITE}
            opacity={0.4}
          />

          {/* Cone */}
          <polygon
            points={points}
            fill={`url(#spot-cone-${i})`}
          />

          {/* Pool of light at feet */}
          <ellipse
            cx={m.x}
            cy={m.y + 60}
            rx={50}
            ry={10}
            fill="url(#spot-pool)"
          />
        </g>
      );
    })}
  </svg>
);

export default MemberSpotlights;
