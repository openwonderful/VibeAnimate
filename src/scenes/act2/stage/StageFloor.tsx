import React from 'react';
import {
  CONCERT_FLOOR,
  CONCERT_CYAN,
  CONCERT_PURPLE,
} from '../../../theme/colors';

/**
 * StageFloor — Reflective stage floor covering the bottom 45% of the frame.
 *
 * Features a dark gradient surface with faint plank lines, a glowing cyan LED
 * strip at the front edge, a subtle radial reflected-light overlay, and 7
 * X-shaped floor tape marks at each member position.
 *
 * z-index 10.
 */

const PLANK_YS = [660, 730, 800, 870, 940];

const TAPE_MARKS = [
  { x: 420, y: 665 },
  { x: 580, y: 670 },
  { x: 760, y: 675 },
  { x: 960, y: 680 },
  { x: 1160, y: 675 },
  { x: 1340, y: 670 },
  { x: 1500, y: 665 },
];

const StageFloor: React.FC = () => (
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
    preserveAspectRatio="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      {/* Floor gradient */}
      <linearGradient id="floor-grad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={CONCERT_FLOOR} />
        <stop offset="40%" stopColor="#241535" />
        <stop offset="100%" stopColor="#0A0510" />
      </linearGradient>

      {/* Reflected stage-light overlay */}
      <radialGradient id="floor-reflect" cx="50%" cy="0%" r="70%">
        <stop offset="0%" stopColor={CONCERT_PURPLE} stopOpacity={0.08} />
        <stop offset="100%" stopColor={CONCERT_PURPLE} stopOpacity={0} />
      </radialGradient>
    </defs>

    {/* Main floor rect */}
    <rect x={0} y={594} width={1920} height={486} fill="url(#floor-grad)" />

    {/* Faint horizontal plank lines */}
    {PLANK_YS.map((py, i) => (
      <line
        key={`plank-${i}`}
        x1={0}
        y1={py}
        x2={1920}
        y2={py}
        stroke="#2A2040"
        strokeWidth={0.5}
        opacity={0.04}
      />
    ))}

    {/* LED strip at stage front edge */}
    <rect x={0} y={594} width={1920} height={2} fill={CONCERT_CYAN} opacity={0.6} />

    {/* Radial reflected stage-light overlay */}
    <rect x={0} y={594} width={1920} height={486} fill="url(#floor-reflect)" />

    {/* X-shaped floor tape marks */}
    {TAPE_MARKS.map((mark, i) => {
      const s = 6; // half-size of the X
      return (
        <g key={`tape-${i}`} opacity={0.12}>
          <line
            x1={mark.x - s}
            y1={mark.y - s}
            x2={mark.x + s}
            y2={mark.y + s}
            stroke={CONCERT_CYAN}
            strokeWidth={0.8}
          />
          <line
            x1={mark.x + s}
            y1={mark.y - s}
            x2={mark.x - s}
            y2={mark.y + s}
            stroke={CONCERT_CYAN}
            strokeWidth={0.8}
          />
        </g>
      );
    })}
  </svg>
);

export default StageFloor;
