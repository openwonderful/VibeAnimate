import React from 'react';
import {
  CONCERT_PURPLE,
  CONCERT_BLUE,
  CONCERT_MAGENTA,
} from '../../../theme/colors';
import { useAnimTime } from '../../../hooks/useAnimTime';
import { sweep } from '../../../utils/animHelpers';

/**
 * CrowdBeams — 6 downward-fanning light beams from stage into the crowd,
 * creating visible rays sweeping across the audience.
 *
 * z-index 40 (above CrowdLayer 30 + ArmyBombField 35, below StadiumStage 50).
 */

interface CrowdBeam {
  originX: number;
  targetX: number;
  targetY: number;
  spreadHalf: number;
  color: string;
  opacity: number;
  duration: number;
  delay: number;
  gradId: string;
}

const ORIGIN_Y = 300;
const BASE_HALF = 4;

const BEAMS: CrowdBeam[] = [
  { originX: 940,  targetX: 400,  targetY: 800, spreadHalf: 80,  color: CONCERT_PURPLE,  opacity: 0.08, duration: 18, delay: 0,   gradId: 'cb-0' },
  { originX: 980,  targetX: 1520, targetY: 800, spreadHalf: 90,  color: CONCERT_MAGENTA, opacity: 0.07, duration: 20, delay: 3,   gradId: 'cb-1' },
  { originX: 950,  targetX: 700,  targetY: 850, spreadHalf: 70,  color: CONCERT_BLUE,    opacity: 0.06, duration: 22, delay: 1,   gradId: 'cb-2' },
  { originX: 970,  targetX: 1200, targetY: 850, spreadHalf: 75,  color: CONCERT_PURPLE,  opacity: 0.08, duration: 16, delay: 5,   gradId: 'cb-3' },
  { originX: 930,  targetX: 200,  targetY: 750, spreadHalf: 100, color: CONCERT_BLUE,    opacity: 0.06, duration: 24, delay: 2,   gradId: 'cb-4' },
  { originX: 990,  targetX: 1700, targetY: 750, spreadHalf: 100, color: CONCERT_MAGENTA, opacity: 0.07, duration: 19, delay: 4,   gradId: 'cb-5' },
];

const CrowdBeams: React.FC = () => {
  const time = useAnimTime();

  return (
    <svg
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 40,
        pointerEvents: 'none',
      }}
      viewBox="0 0 1920 1080"
      preserveAspectRatio="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {BEAMS.map((beam) => (
          <linearGradient
            key={beam.gradId}
            id={beam.gradId}
            x1="0" y1="0" x2="0" y2="1"
          >
            <stop offset="0%" stopColor={beam.color} stopOpacity={beam.opacity} />
            <stop offset="100%" stopColor={beam.color} stopOpacity={beam.opacity * 0.25} />
          </linearGradient>
        ))}

        <filter id="crowd-beam-blur">
          <feGaussianBlur stdDeviation="8" />
        </filter>
      </defs>

      {BEAMS.map((beam) => {
        const points = [
          `${beam.originX - BASE_HALF},${ORIGIN_Y}`,
          `${beam.originX + BASE_HALF},${ORIGIN_Y}`,
          `${beam.targetX + beam.spreadHalf},${beam.targetY}`,
          `${beam.targetX - beam.spreadHalf},${beam.targetY}`,
        ].join(' ');

        const rotation = sweep(time, beam.duration, -12, 12, beam.delay);

        return (
          <g
            key={beam.gradId}
            style={{
              transform: `rotate(${rotation}deg)`,
              transformOrigin: `${beam.originX}px ${ORIGIN_Y}px`,
            }}
          >
            <polygon
              points={points}
              fill={`url(#${beam.gradId})`}
              filter="url(#crowd-beam-blur)"
            />
          </g>
        );
      })}

      {/* Volumetric haze where beams pass through crowd atmosphere */}
      <rect
        x={0}
        y={400}
        width={1920}
        height={200}
        fill="white"
        opacity={0.03}
        filter="url(#crowd-beam-blur)"
      />
    </svg>
  );
};

export default CrowdBeams;
