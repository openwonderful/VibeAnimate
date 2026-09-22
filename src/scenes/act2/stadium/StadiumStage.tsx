import React from 'react';
import {
  CONCERT_PURPLE,
  CONCERT_WHITE,
} from '../../../theme/colors';
import { useAnimTime } from '../../../hooks/useAnimTime';
import { oscillate } from '../../../utils/animHelpers';

/**
 * StadiumStage — 2D dressing around the stage window.
 *
 * The actual stage (floor + Arirang backdrop + future figures) is rendered
 * by a full-viewport Act2_2_B Canvas that Scene2 mounts underneath. This
 * component only draws the 2D elements that give the stage its "hot from a
 * distance" look: bloom halo, side LED screens, light rig towers, and haze.
 */

// ── Zoom target geometry ──────────────────────────────────────────
// This rectangle is what the camera zooms into. It must have a 16:9
// aspect ratio so it maps perfectly onto the unified 3D scene.
const STAGE_W = 280;
const STAGE_H = STAGE_W * (1080 / 1920); // 157.5
const STAGE_CX = 960;
const STAGE_CY = 250;
const STAGE_LEFT = STAGE_CX - STAGE_W / 2;   // 820
const STAGE_TOP = STAGE_CY - STAGE_H / 2;    // 171.25

/** Map Scene-3 coordinates (1920x1080) into the miniature stage rect, used
 *  for overlays that visually hug the stage window (haze, bloom). */
function s3y(y: number): number {
  return STAGE_TOP + (y / 1080) * STAGE_H;
}
function s3h(h: number): number {
  return (h / 1080) * STAGE_H;
}

/** Light rig tower x positions (outside the zoom window, frame the stage) */
const TOWERS = [
  { x: 790, w: 5 },
  { x: 810, w: 4 },
  { x: 1110, w: 4 },
  { x: 1130, w: 5 },
];

// Side LED screens flank the stage. Mirror them around STAGE_CX so the
// "gap between LEDs" lines up with the actual stage center — otherwise
// the eye anchors on the LED frame and the rect appears to drift right
// as the dressing fades during the 2.1→2.2 zoom.
const LED_W = (500 / 1920) * STAGE_W;          // matches old s3w(500)
const LED_GAP_FROM_CX = 1100 + (100 / 1920) * STAGE_W - STAGE_CX; // ≈154.58
const LED_LEFT_X = STAGE_CX - LED_GAP_FROM_CX - LED_W;
const LED_RIGHT_X = STAGE_CX + LED_GAP_FROM_CX;

const StadiumStage: React.FC = () => {
  const time = useAnimTime();
  const leftScreenOpacity = oscillate(time, 3, 0.75, 0.95, 0);
  const rightScreenOpacity = oscillate(time, 3, 0.75, 0.95, 0.5);
  const bloomPulse = oscillate(time, 4, 0.25, 0.45, 0);

  return (
      <svg
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 51,
          pointerEvents: 'none',
        }}
        viewBox="0 0 1920 1080"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* White bloom glow — makes the stage read as white-hot from distance */}
          <radialGradient id="s2-stage-bloom" cx="50%" cy="40%" r="55%">
            <stop offset="0%" stopColor={CONCERT_WHITE} stopOpacity={0.5} />
            <stop offset="40%" stopColor={CONCERT_WHITE} stopOpacity={0.2} />
            <stop offset="70%" stopColor={CONCERT_PURPLE} stopOpacity={0.08} />
            <stop offset="100%" stopColor={CONCERT_PURPLE} stopOpacity={0} />
          </radialGradient>

          {/* Haze blur */}
          <filter id="s2-stage-haze">
            <feGaussianBlur stdDeviation="8" />
          </filter>

          {/* Bloom blur */}
          <filter id="s2-bloom-blur">
            <feGaussianBlur stdDeviation="15" />
          </filter>
        </defs>

        {/* ── Light rig towers (outside zoom window, frame the stage) ── */}
        {TOWERS.map((tower) => {
          const towerTop = s3y(-60);
          const towerBottom = s3y(500);
          return (
            <g key={`tower-${tower.x}`}>
              <rect
                x={tower.x}
                y={towerTop}
                width={tower.w}
                height={towerBottom - towerTop}
                fill={CONCERT_WHITE}
                opacity={0.3}
              />
              {/* Tower lights */}
              {[0.2, 0.4, 0.6, 0.8].map((frac, li) => (
                <circle
                  key={li}
                  cx={tower.x + tower.w / 2}
                  cy={towerTop + (towerBottom - towerTop) * frac}
                  r={1.5}
                  fill="white"
                  opacity={0.5}
                />
              ))}
            </g>
          );
        })}

        {/* ── Side LED screens (outside zoom window) ────────────────── */}
        <rect
          x={LED_LEFT_X}
          y={s3y(100)}
          width={LED_W}
          height={s3h(400)}
          fill={CONCERT_WHITE}
          opacity={leftScreenOpacity * 0.6}
          rx={1}
        />
        <rect
          x={LED_RIGHT_X}
          y={s3y(100)}
          width={LED_W}
          height={s3h(400)}
          fill={CONCERT_WHITE}
          opacity={rightScreenOpacity * 0.6}
          rx={1}
        />

        {/* ── Haze around stage ─────────────────────────────────────── */}
        <rect
          x={STAGE_LEFT - 30}
          y={s3y(200)}
          width={STAGE_W + 60}
          height={s3h(200)}
          fill="white"
          opacity={0.1}
          filter="url(#s2-stage-haze)"
        />
        <rect
          x={STAGE_LEFT - 10}
          y={s3y(550)}
          width={STAGE_W + 20}
          height={s3h(100)}
          fill="white"
          opacity={0.06}
          filter="url(#s2-stage-haze)"
        />

        {/* ── White bloom overlay (distance glow effect) ────────────── */}
        <ellipse
          cx={STAGE_CX}
          cy={STAGE_CY - 10}
          rx={STAGE_W * 0.55}
          ry={STAGE_H * 0.5}
          fill="url(#s2-stage-bloom)"
          opacity={bloomPulse}
          filter="url(#s2-bloom-blur)"
        />
      </svg>
  );
};

export default StadiumStage;
