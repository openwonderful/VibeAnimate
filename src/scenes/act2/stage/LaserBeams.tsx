import React from 'react';
import { CONCERT_CYAN } from '../../../theme/colors';

/**
 * LaserBeams — Symmetric cyan laser fan from center lighting truss.
 * 10 beams fan outward symmetrically, all sweeping together as one unit.
 *
 * z-index 50.
 */

const ORIGIN = { x: 960, y: 80 };

/** Beam endpoints — left fan + right fan (symmetric) */
const BEAM_ENDS: { x: number; y: number }[] = [
  // Left fan (outermost to innermost)
  { x: 300,  y: 720 },
  { x: 460,  y: 700 },
  { x: 620,  y: 690 },
  { x: 780,  y: 685 },
  { x: 900,  y: 682 },
  // Right fan (innermost to outermost)
  { x: 1020, y: 682 },
  { x: 1140, y: 685 },
  { x: 1300, y: 690 },
  { x: 1460, y: 700 },
  { x: 1620, y: 720 },
];

const LaserBeams: React.FC = () => (
  <svg
    style={{
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      zIndex: 50,
      pointerEvents: 'none',
    }}
    viewBox="0 0 1920 1080"
    preserveAspectRatio="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      {/* Sharp laser glow */}
      <filter id="laser-glow">
        <feGaussianBlur stdDeviation="3" />
      </filter>
      {/* Wider atmospheric scatter */}
      <filter id="laser-scatter">
        <feGaussianBlur stdDeviation="6" />
      </filter>
    </defs>

    {/* All beams sweep together as one unit */}
    <g
      style={{
        animationName: 'laser-sweep',
        animationDuration: '6s',
        animationTimingFunction: 'ease-in-out',
        animationIterationCount: 'infinite',
        transformOrigin: `${ORIGIN.x}px ${ORIGIN.y}px`,
      }}
    >
      {/* Atmospheric scatter layer (soft wide glow) */}
      {BEAM_ENDS.map((end, i) => (
        <line
          key={`scatter-${i}`}
          x1={ORIGIN.x}
          y1={ORIGIN.y}
          x2={end.x}
          y2={end.y}
          stroke={CONCERT_CYAN}
          strokeWidth={1.2}
          opacity={0.15}
          filter="url(#laser-scatter)"
        />
      ))}

      {/* Primary laser lines */}
      {BEAM_ENDS.map((end, i) => (
        <line
          key={`laser-${i}`}
          x1={ORIGIN.x}
          y1={ORIGIN.y}
          x2={end.x}
          y2={end.y}
          stroke={CONCERT_CYAN}
          strokeWidth={1.2}
          opacity={0.45}
          filter="url(#laser-glow)"
        />
      ))}
    </g>
  </svg>
);

export default LaserBeams;
