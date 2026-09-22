import React, { useMemo } from 'react';
import { generateConfettiPositions } from '../../../utils/svgHelpers';
import {
  CONCERT_PURPLE,
  CONCERT_MAGENTA,
  CONCERT_CYAN,
  PYRO_YELLOW,
  CONCERT_WHITE,
} from '../../../theme/colors';
import { useAnimTime } from '../../../hooks/useAnimTime';
import { linearLoop, sway } from '../../../utils/animHelpers';

/**
 * ConfettiLayer — 80 falling confetti pieces in concert colours.
 *
 * Each piece combines three simultaneous transforms:
 *   - vertical fall (linearLoop for translateY)
 *   - horizontal sway (sway for translateX)
 *   - spin (linearLoop * 720 for rotation)
 *
 * Negative delays pre-distribute pieces so confetti is visible from the first frame.
 *
 * z-index 70 — above stadium lighting (65), below text (80).
 */

const ConfettiLayer: React.FC = () => {
  const time = useAnimTime();

  const confetti = useMemo(
    () =>
      generateConfettiPositions(80, 505, [
        CONCERT_PURPLE,
        CONCERT_MAGENTA,
        CONCERT_CYAN,
        PYRO_YELLOW,
        CONCERT_WHITE,
      ]),
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
        zIndex: 70,
        pointerEvents: 'none',
      }}
    >
      {confetti.map((c, i) => {
        // Fall: translateY from -20px to viewport height + 20px
        const fallProgress = linearLoop(time, c.fallDuration, c.delay);
        const translateY = -20 + fallProgress * (window.innerHeight + 40);

        // Sway: horizontal oscillation
        const translateX = sway(time, c.swayDuration, 20, c.delay);

        // Spin: 0-720deg rotation
        const spinProgress = linearLoop(time, c.spinDuration, c.delay);
        const rotation = spinProgress * 720;

        return (
          <div
            key={`confetti-${i}`}
            style={{
              position: 'absolute',
              left: `${c.x}%`,
              top: 0,
              transform: `translateY(${translateY}px) translateX(${translateX}px)`,
            }}
          >
            <svg
              width={c.width * c.scale}
              height={c.height * c.scale}
              viewBox={`0 0 ${c.width} ${c.height}`}
              xmlns="http://www.w3.org/2000/svg"
              style={{
                display: 'block',
                transform: `rotate(${rotation}deg)`,
              }}
            >
              <rect
                x={0}
                y={0}
                width={c.width}
                height={c.height}
                rx={0.5}
                fill={c.color}
              />
            </svg>
          </div>
        );
      })}
    </div>
  );
};

export default ConfettiLayer;
