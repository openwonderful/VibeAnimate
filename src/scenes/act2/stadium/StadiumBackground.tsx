import React, { useMemo } from 'react';
import { generateStarPositions } from '../../../utils/svgHelpers';
import type { StarData } from '../../../utils/svgHelpers';
import { useAnimTime } from '../../../hooks/useAnimTime';
import { oscillate } from '../../../utils/animHelpers';

/**
 * StadiumBackground — Dark sky with stars and city lights above
 * the stadium opening.
 *
 * z-index 10
 */

const TWINKLE_PERIODS: Record<string, number> = {
  'twinkle-slow': 4,
  'twinkle-medium': 2.5,
  'twinkle-fast': 1.5,
};

interface CityLight {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  opacity: number;
}

const CITY_LIGHTS: CityLight[] = [
  { x: 120, y: 258, w: 1, h: 2, color: '#FFD59E', opacity: 0.3 },
  { x: 215, y: 270, w: 2, h: 1, color: '#FFFFFF', opacity: 0.2 },
  { x: 340, y: 264, w: 1, h: 1, color: '#FFD59E', opacity: 0.4 },
  { x: 480, y: 275, w: 2, h: 2, color: '#FFD59E', opacity: 0.25 },
  { x: 555, y: 260, w: 1, h: 2, color: '#FFFFFF', opacity: 0.3 },
  { x: 640, y: 282, w: 1, h: 1, color: '#FFD59E', opacity: 0.35 },
  { x: 720, y: 253, w: 2, h: 1, color: '#FFFFFF', opacity: 0.2 },
  { x: 830, y: 290, w: 1, h: 2, color: '#FFD59E', opacity: 0.3 },
  { x: 910, y: 268, w: 2, h: 1, color: '#FFD59E', opacity: 0.25 },
  { x: 1020, y: 255, w: 1, h: 1, color: '#FFFFFF', opacity: 0.4 },
  { x: 1100, y: 278, w: 2, h: 2, color: '#FFD59E', opacity: 0.2 },
  { x: 1210, y: 262, w: 1, h: 1, color: '#FFD59E', opacity: 0.35 },
  { x: 1310, y: 286, w: 1, h: 2, color: '#FFFFFF', opacity: 0.3 },
  { x: 1400, y: 252, w: 2, h: 1, color: '#FFD59E', opacity: 0.25 },
  { x: 1500, y: 274, w: 1, h: 2, color: '#FFD59E', opacity: 0.4 },
  { x: 1600, y: 265, w: 2, h: 1, color: '#FFFFFF', opacity: 0.2 },
  { x: 1700, y: 295, w: 1, h: 1, color: '#FFD59E', opacity: 0.3 },
  { x: 1800, y: 257, w: 2, h: 2, color: '#FFD59E', opacity: 0.35 },
];

interface StadiumBackgroundProps {
  /** When true, skip the opaque sky fill so a Canvas underneath shows through.
   *  Used by Act2Zoom, where the 3D stage world renders as the sky. */
  transparentSky?: boolean;
}

const StadiumBackground: React.FC<StadiumBackgroundProps> = ({ transparentSky = false }) => {
  const time = useAnimTime();
  const stars: StarData[] = useMemo(
    () => generateStarPositions(45, 200, 1920, 300),
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
      preserveAspectRatio="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <radialGradient id="stadium-sky-grad" cx="50%" cy="0%" r="80%">
          <stop offset="0%" stopColor="#0A0515" />
          <stop offset="100%" stopColor="#050510" />
        </radialGradient>
      </defs>

      {/* Full-viewport sky background (skipped when a 3D Canvas renders the sky) */}
      {!transparentSky && (
        <rect x="0" y="0" width="1920" height="1080" fill="url(#stadium-sky-grad)" />
      )}

      {/* Stars — sky band y: 0-300 */}
      {stars.map((star, i) => {
        const period = TWINKLE_PERIODS[star.animClass] || 4;
        const animOpacity = oscillate(time, period, 0.3, star.opacity, star.delay);
        return (
          <circle
            key={`star-${i}`}
            cx={star.cx}
            cy={star.cy}
            r={star.r}
            fill="#FFFFFF"
            opacity={animOpacity}
          />
        );
      })}

      {/* City lights along the horizon */}
      {CITY_LIGHTS.map((light, i) => (
        <rect
          key={`city-light-${i}`}
          x={light.x}
          y={light.y}
          width={light.w}
          height={light.h}
          fill={light.color}
          opacity={light.opacity}
        />
      ))}
    </svg>
  );
};

export default StadiumBackground;
