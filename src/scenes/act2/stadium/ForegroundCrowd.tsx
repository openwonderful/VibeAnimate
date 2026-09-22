import React from 'react';
import { HEUK, CONCERT_WHITE, CONCERT_PURPLE } from '../../../theme/colors';
import { useAnimTime } from '../../../hooks/useAnimTime';
import { jumpBounce } from '../../../utils/animHelpers';

/**
 * ForegroundCrowd — 12 large close-up upper-body silhouettes at the bottom
 * of the frame (y=800-1080), partially cropped off the bottom edge.
 *
 * Creates the immersive "you are IN the crowd" feeling. 7 unique silhouette
 * path variants with distinct hair styles and arm poses.
 *
 * Static — no animation.
 *
 * z-index 75.
 */

// 7 unique upper-body SVG paths (~60-80px wide, ~100-140px tall in local coords).
// Each shows head + shoulders + arms in a distinct pose with unique hair.
const silhouettePaths: string[] = [
  // 0: Arms straight up, short spiky hair
  // Head at ~(35,18), shoulders ~y=38, arms extending straight up, torso to ~y=120
  `M 25,42 C 20,42 14,50 14,60 L 14,120 L 56,120 L 56,60 C 56,50 50,42 45,42
   L 45,38 C 50,36 53,30 53,24 C 53,14 45,8 35,8 C 25,8 17,14 17,24 C 17,30 20,36 25,38 Z
   M 30,4 L 31,12 M 34,2 L 35,11 M 38,3 L 37,11 M 41,5 L 39,12 M 27,6 L 29,13
   M 14,52 L 4,10 L 8,8 L 18,48
   M 56,52 L 66,10 L 62,8 L 52,48
   M 14,120 L 10,140 L 24,140 L 28,120
   M 42,120 L 46,140 L 60,140 L 56,120`,

  // 1: Phone held up (right hand), ponytail hair
  // Head at ~(35,20), ponytail swooping right, right arm up with phone rectangle
  `M 25,44 C 20,44 14,52 14,62 L 14,130 L 56,130 L 56,62 C 56,52 50,44 45,44
   L 45,38 C 50,36 53,30 53,24 C 53,14 45,8 35,8 C 25,8 17,14 17,24 C 17,30 20,36 25,38 Z
   M 45,14 C 52,12 58,18 56,28 C 54,36 48,38 48,38
   M 14,54 L 6,76 L 10,78 L 18,58
   M 56,54 L 64,16 L 58,14 L 52,50
   M 60,6 L 68,6 L 68,20 L 60,20 Z
   M 14,130 L 10,145 L 24,145 L 28,130
   M 42,130 L 46,145 L 60,145 L 56,130`,

  // 2: Fist pump (right arm bent up), cap/hat brim
  // Head with flat brim cap, one arm up fist
  `M 25,46 C 20,46 14,54 14,64 L 14,130 L 56,130 L 56,64 C 56,54 50,46 45,46
   L 45,40 C 50,38 53,32 53,26 C 53,16 45,10 35,10 C 25,10 17,16 17,26 C 17,32 20,38 25,40 Z
   M 12,18 L 58,18 L 58,14 L 12,14 Z
   M 10,14 L 4,16
   M 14,56 L 4,78 L 8,80 L 18,60
   M 56,56 L 62,36 L 66,30 L 62,28 L 56,34 L 52,52
   M 64,24 C 66,20 70,20 70,24 C 70,28 66,28 64,24
   M 14,130 L 10,145 L 24,145 L 28,130
   M 42,130 L 46,145 L 60,145 L 56,130`,

  // 3: Heart shape above head, curly/voluminous hair
  // Both arms up forming a heart
  `M 25,46 C 20,46 14,54 14,64 L 14,130 L 56,130 L 56,64 C 56,54 50,46 45,46
   L 45,40 C 50,38 54,32 54,26 C 54,16 46,8 35,8 C 24,8 16,16 16,26 C 16,32 20,38 25,40 Z
   M 17,14 C 12,10 14,4 20,4 C 26,4 28,10 24,14
   M 53,14 C 58,10 56,4 50,4 C 44,4 42,10 46,14
   M 30,18 C 24,20 18,16 18,12
   M 40,18 C 46,20 52,16 52,12
   M 14,54 L 6,34 C 4,28 8,22 14,18 L 22,10 L 35,-4 L 48,10 L 56,18 C 62,22 66,28 64,34 L 56,54
   M 14,130 L 10,145 L 24,145 L 28,130
   M 42,130 L 46,145 L 60,145 L 56,130`,

  // 4: Arms wide/spread, long straight hair
  // Both arms spread wide to the sides, hair hanging down
  `M 25,48 C 20,48 14,56 14,66 L 14,130 L 56,130 L 56,66 C 56,56 50,48 45,48
   L 45,40 C 50,38 53,32 53,26 C 53,16 45,8 35,8 C 25,8 17,16 17,26 C 17,32 20,38 25,40 Z
   M 18,16 C 14,16 10,20 10,30 L 8,60
   M 52,16 C 56,16 60,20 60,30 L 62,60
   M 14,58 L -6,50 L -8,54 L 12,62
   M 56,58 L 76,50 L 78,54 L 58,62
   M 14,130 L 10,145 L 24,145 L 28,130
   M 42,130 L 46,145 L 60,145 L 56,130`,

  // 5: Pointing at stage (one arm extended forward), short neat hair
  // Right arm extended forward/outward, left arm relaxed
  `M 25,44 C 20,44 14,52 14,62 L 14,130 L 56,130 L 56,62 C 56,52 50,44 45,44
   L 45,38 C 50,36 53,30 53,24 C 53,14 45,8 35,8 C 25,8 17,14 17,24 C 17,30 20,36 25,38 Z
   M 20,12 C 22,8 28,6 35,6 C 42,6 48,8 50,12
   M 14,54 L 4,74 L 8,76 L 18,58
   M 56,54 L 78,46 L 80,42 L 78,40 L 56,50
   M 14,130 L 10,145 L 24,145 L 28,130
   M 42,130 L 46,145 L 60,145 L 56,130`,

  // 6: Clapping (hands together at chest), medium wavy hair
  // Both hands meeting at center chest
  `M 25,46 C 20,46 14,54 14,64 L 14,130 L 56,130 L 56,64 C 56,54 50,46 45,46
   L 45,40 C 50,38 53,32 53,26 C 53,16 45,10 35,10 C 25,10 17,16 17,26 C 17,32 20,38 25,40 Z
   M 18,14 C 16,8 22,4 28,6 C 30,2 40,2 42,6 C 48,4 54,8 52,14
   M 14,56 L 6,64 L 14,72 L 28,68 L 35,66
   M 56,56 L 64,64 L 56,72 L 42,68 L 35,66
   M 33,64 C 33,62 37,62 37,64 C 37,66 33,66 33,64
   M 14,130 L 10,145 L 24,145 L 28,130
   M 42,130 L 46,145 L 60,145 L 56,130`,
];

interface FigureInstance {
  x: number;
  y: number;
  scale: number;
  pathIdx: number;
  opacity: number;
  hasPhone: boolean;
}

const figureInstances: FigureInstance[] = [
  { x: 80, y: 850, scale: 3.5, pathIdx: 0, opacity: 0.9, hasPhone: false },
  { x: 250, y: 870, scale: 2.8, pathIdx: 1, opacity: 0.8, hasPhone: true },
  { x: 420, y: 830, scale: 3.2, pathIdx: 2, opacity: 0.85, hasPhone: false },
  { x: 580, y: 880, scale: 2.5, pathIdx: 3, opacity: 0.75, hasPhone: false },
  { x: 720, y: 840, scale: 3.0, pathIdx: 4, opacity: 0.88, hasPhone: false },
  { x: 900, y: 860, scale: 2.6, pathIdx: 5, opacity: 0.82, hasPhone: false },
  { x: 1050, y: 835, scale: 3.3, pathIdx: 6, opacity: 0.9, hasPhone: false },
  { x: 1200, y: 875, scale: 2.7, pathIdx: 0, opacity: 0.78, hasPhone: false },
  { x: 1350, y: 845, scale: 3.1, pathIdx: 1, opacity: 0.85, hasPhone: true },
  { x: 1500, y: 870, scale: 2.9, pathIdx: 3, opacity: 0.8, hasPhone: false },
  { x: 1650, y: 855, scale: 3.4, pathIdx: 2, opacity: 0.92, hasPhone: false },
  { x: 1820, y: 840, scale: 2.6, pathIdx: 5, opacity: 0.83, hasPhone: false },
];

// Phone screen position offset in local coords (near the right hand area)
const PHONE_OFFSET = { x: 60, y: 6 };

const ForegroundCrowd: React.FC = () => {
  const time = useAnimTime();

  return (
    <svg
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 75,
        pointerEvents: 'none',
      }}
      viewBox="0 0 1920 1080"
      preserveAspectRatio="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {figureInstances.map((fig, i) => {
        const isHeartFigure = fig.pathIdx === 3 && fig.x === 580;
        const period = 1.0 + (i % 3) * 0.15;
        const delay = i * 0.12;
        const jumpY = jumpBounce(time, period, 22, delay);

        return (
          <g
            key={`fg-crowd-${i}`}
            transform={`translate(0, ${jumpY})`}
          >
            <g transform={`translate(${fig.x}, ${fig.y}) scale(${fig.scale})`}>
              {/* Purple rim for the heart-shape figure */}
              {isHeartFigure && (
                <g transform="translate(0.5, 0)">
                  <path
                    d={silhouettePaths[fig.pathIdx]}
                    fill="none"
                    stroke={CONCERT_PURPLE}
                    strokeWidth={0.8}
                    opacity={0.3}
                  />
                </g>
              )}

              {/* Main silhouette */}
              <path
                d={silhouettePaths[fig.pathIdx]}
                fill={HEUK}
                opacity={fig.opacity}
                stroke={HEUK}
                strokeWidth={0.5}
                strokeLinejoin="round"
              />

              {/* Phone screen glow for hasPhone figures */}
              {fig.hasPhone && (
                <>
                  {/* Halo */}
                  <rect
                    x={PHONE_OFFSET.x - 1}
                    y={PHONE_OFFSET.y - 1}
                    width={5}
                    height={7}
                    rx={0.5}
                    fill={CONCERT_WHITE}
                    opacity={0.15}
                  />
                  {/* Screen */}
                  <rect
                    x={PHONE_OFFSET.x}
                    y={PHONE_OFFSET.y}
                    width={3}
                    height={5}
                    rx={0.3}
                    fill={CONCERT_WHITE}
                    opacity={0.7}
                  />
                </>
              )}
            </g>
          </g>
        );
      })}
    </svg>
  );
};

export default ForegroundCrowd;
