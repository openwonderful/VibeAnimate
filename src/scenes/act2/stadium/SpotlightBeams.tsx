import React from 'react';
import {
  CONCERT_PURPLE,
  CONCERT_BLUE,
  CONCERT_MAGENTA,
} from '../../../theme/colors';
import { useAnimTime } from '../../../hooks/useAnimTime';
import { sweep } from '../../../utils/animHelpers';

/**
 * SpotlightBeams — 8 upward beams from stage + volumetric haze + side sweeps.
 *
 * Beams originate from the distant stage (y=300) and shoot upward
 * to the top of the frame, creating dramatic vertical light columns.
 *
 * z-index 60
 */

interface UpBeam {
  baseX: number;
  topHalf: number;   // half-width at top of frame
  color: string;
  opacity: number;
  duration: number;
  delay: number;
  gradId: string;
}

const UP_BEAMS: UpBeam[] = [
  { baseX: 850,  topHalf: 40,  color: '#FFF8E1', opacity: 0.1,  duration: 12, delay: 0,   gradId: 'up-0' },
  { baseX: 890,  topHalf: 55,  color: CONCERT_PURPLE, opacity: 0.08, duration: 14, delay: 1,   gradId: 'up-1' },
  { baseX: 920,  topHalf: 60,  color: '#FFF8E1', opacity: 0.1,  duration: 10, delay: 2.5, gradId: 'up-2' },
  { baseX: 950,  topHalf: 50,  color: CONCERT_BLUE, opacity: 0.06, duration: 16, delay: 0.5, gradId: 'up-3' },
  { baseX: 970,  topHalf: 45,  color: CONCERT_PURPLE, opacity: 0.08, duration: 13, delay: 3,   gradId: 'up-4' },
  { baseX: 1000, topHalf: 70,  color: '#FFF8E1', opacity: 0.1,  duration: 11, delay: 1.5, gradId: 'up-5' },
  { baseX: 1030, topHalf: 55,  color: CONCERT_BLUE, opacity: 0.06, duration: 15, delay: 4,   gradId: 'up-6' },
  { baseX: 1070, topHalf: 60,  color: CONCERT_PURPLE, opacity: 0.08, duration: 12, delay: 2,   gradId: 'up-7' },
];

const SpotlightBeams: React.FC = () => {
  const time = useAnimTime();

  return (
    <svg
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 60,
        pointerEvents: 'none',
      }}
      viewBox="0 0 1920 1080"
      preserveAspectRatio="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Upward beam gradients: colored at base (y=300) fading to transparent at top (y=0) */}
        {UP_BEAMS.map((beam) => (
          <linearGradient
            key={beam.gradId}
            id={beam.gradId}
            x1="0" y1="1" x2="0" y2="0"
          >
            <stop offset="0%" stopColor={beam.color} stopOpacity={beam.opacity} />
            <stop offset="100%" stopColor={beam.color} stopOpacity={beam.opacity * 0.3} />
          </linearGradient>
        ))}

        {/* Side sweep gradients */}
        <linearGradient id="sweep-left-grad" x1="1" y1="0" x2="0" y2="0">
          <stop offset="0%" stopColor={CONCERT_PURPLE} stopOpacity={0.05} />
          <stop offset="100%" stopColor={CONCERT_PURPLE} stopOpacity={0} />
        </linearGradient>
        <linearGradient id="sweep-right-grad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={CONCERT_MAGENTA} stopOpacity={0.05} />
          <stop offset="100%" stopColor={CONCERT_MAGENTA} stopOpacity={0} />
        </linearGradient>
        <linearGradient id="sweep-center-grad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={CONCERT_PURPLE} stopOpacity={0} />
          <stop offset="50%" stopColor={CONCERT_PURPLE} stopOpacity={0.04} />
          <stop offset="100%" stopColor={CONCERT_PURPLE} stopOpacity={0} />
        </linearGradient>

        {/* Volumetric haze blur filter */}
        <filter id="beam-haze-blur">
          <feGaussianBlur stdDeviation="15" />
        </filter>
      </defs>

      {/* ── 8 upward beams from stage ───────────────────────────── */}
      {UP_BEAMS.map((beam) => {
        const baseHalf = 5; // ~10px base width at stage level
        const points = [
          `${beam.baseX - baseHalf},300`,
          `${beam.baseX + baseHalf},300`,
          `${beam.baseX + beam.topHalf},0`,
          `${beam.baseX - beam.topHalf},0`,
        ].join(' ');

        const rotation = sweep(time, beam.duration, -8, 8, beam.delay);

        return (
          <g
            key={beam.gradId}
            style={{
              transform: `rotate(${rotation}deg)`,
              transformOrigin: `${beam.baseX}px 300px`,
            }}
          >
            <polygon
              points={points}
              fill={`url(#${beam.gradId})`}
            />
          </g>
        );
      })}

      {/* ── Volumetric haze band at stage altitude ──────────────── */}
      <rect
        x={0}
        y={200}
        width={1920}
        height={150}
        fill="white"
        opacity={0.04}
        filter="url(#beam-haze-blur)"
      />

      {/* ── Side-sweeping beams from stage center ───────────────── */}
      {/* Left sweep */}
      <g
        style={{
          transform: `rotate(${sweep(time, 20, -15, 15, 0)}deg)`,
          transformOrigin: '960px 300px',
        }}
      >
        <polygon
          points="960,295 960,305 400,250 300,200"
          fill="url(#sweep-left-grad)"
        />
      </g>

      {/* Right sweep */}
      <g
        style={{
          transform: `rotate(${sweep(time, 20, -15, 15, 5)}deg)`,
          transformOrigin: '960px 300px',
        }}
      >
        <polygon
          points="960,295 960,305 1520,250 1620,200"
          fill="url(#sweep-right-grad)"
        />
      </g>

      {/* Center wide sweep */}
      <g
        style={{
          transform: `rotate(${sweep(time, 20, -15, 15, 10)}deg)`,
          transformOrigin: '960px 300px',
        }}
      >
        <polygon
          points="955,300 965,300 1200,180 720,180"
          fill="url(#sweep-center-grad)"
        />
      </g>
    </svg>
  );
};

export default SpotlightBeams;
