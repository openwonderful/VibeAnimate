import React, { useMemo } from 'react';
import { seededRandom } from '../../../utils/svgHelpers';
import { useAnimTime } from '../../../hooks/useAnimTime';
import { flashPulse } from '../../../utils/animHelpers';

/**
 * CameraFlashes — 20 random bright flashes scattered across the crowd,
 * simulating camera phones going off at staggered intervals.
 *
 * Each flash is a white circle that stays invisible most of its cycle
 * then briefly flares to full opacity via flashPulse().
 *
 * z-index 72.
 */

interface FlashData {
  cx: number;
  cy: number;
  r: number;
  duration: number;
  delay: number;
}

const CameraFlashes: React.FC = () => {
  const time = useAnimTime();

  const flashes = useMemo(() => {
    const rand = seededRandom(888);
    const result: FlashData[] = [];

    for (let i = 0; i < 20; i++) {
      result.push({
        cx: 100 + rand() * 1720,
        cy: 200 + rand() * 550,
        r: 2 + rand() * 2,
        duration: 4 + rand() * 6,
        delay: rand() * 8,
      });
    }

    return result;
  }, []);

  return (
    <svg
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 72,
        pointerEvents: 'none',
      }}
      viewBox="0 0 1920 1080"
      preserveAspectRatio="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {flashes.map((flash, i) => {
        const opacity = flashPulse(time, flash.duration, flash.delay);

        return (
          <g
            key={`flash-${i}`}
            style={{ opacity }}
          >
            <circle
              cx={flash.cx}
              cy={flash.cy}
              r={flash.r}
              fill="white"
            />
          </g>
        );
      })}
    </svg>
  );
};

export default CameraFlashes;
