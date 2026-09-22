import React from 'react';
import {
  CONCERT_WHITE,
  CONCERT_PURPLE,
} from '../../../theme/colors';

/**
 * StageBacklight — God-ray backlight behind the members. A large radial glow
 * at centre-stage with 7 purple god-rays radiating outward, plus a wider
 * atmospheric purple wash layer.
 *
 * z-index 18.
 */

const CX = 960;
const CY = 480;

/** God-ray definitions: angle in degrees, base width at viewport edge, opacity */
const GOD_RAYS = [
  { angle: -45, baseW: 60,  opacity: 0.12 },
  { angle: -25, baseW: 50,  opacity: 0.15 },
  { angle: -10, baseW: 55,  opacity: 0.10 },
  { angle: 0,   baseW: 70,  opacity: 0.18 },
  { angle: 10,  baseW: 55,  opacity: 0.10 },
  { angle: 25,  baseW: 50,  opacity: 0.15 },
  { angle: 45,  baseW: 60,  opacity: 0.12 },
];

function rayPolygon(angleDeg: number, baseW: number): string {
  const rad = (angleDeg * Math.PI) / 180;
  const len = 1200;
  const apexHalf = 5;

  const px = -Math.sin(rad);
  const py = Math.cos(rad);

  const ax1 = CX + px * apexHalf;
  const ay1 = CY + py * apexHalf;
  const ax2 = CX - px * apexHalf;
  const ay2 = CY - py * apexHalf;

  const bx = CX + Math.cos(rad) * len;
  const by = CY + Math.sin(rad) * len;

  const bx1 = bx + px * (baseW / 2);
  const by1 = by + py * (baseW / 2);
  const bx2 = bx - px * (baseW / 2);
  const by2 = by - py * (baseW / 2);

  return `${ax1},${ay1} ${bx1},${by1} ${bx2},${by2} ${ax2},${ay2}`;
}

const RAY_DURATIONS = [6, 7.5, 5.5, 8, 5.5, 7.5, 6];

const StageBacklight: React.FC = () => (
  <svg
    style={{
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      zIndex: 18,
      pointerEvents: 'none',
    }}
    viewBox="0 0 1920 1080"
    preserveAspectRatio="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <radialGradient id="backlight-glow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor={CONCERT_WHITE} stopOpacity={0.35} />
        <stop offset="50%" stopColor={CONCERT_PURPLE} stopOpacity={0.15} />
        <stop offset="100%" stopColor={CONCERT_PURPLE} stopOpacity={0} />
      </radialGradient>
      {/* Wider atmospheric purple wash */}
      <radialGradient id="backlight-outer" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor={CONCERT_PURPLE} stopOpacity={0.08} />
        <stop offset="100%" stopColor={CONCERT_PURPLE} stopOpacity={0} />
      </radialGradient>
    </defs>

    {/* Outer atmospheric purple wash */}
    <ellipse
      cx={CX}
      cy={CY}
      rx={700}
      ry={480}
      fill="url(#backlight-outer)"
    />

    {/* Central glow ellipse */}
    <g
      style={{
        animationName: 'backlight-pulse',
        animationDuration: '4s',
        animationTimingFunction: 'ease-in-out',
        animationIterationCount: 'infinite',
      }}
    >
      <ellipse
        cx={CX}
        cy={CY}
        rx={550}
        ry={380}
        fill="url(#backlight-glow)"
      />
    </g>

    {/* God-ray triangles — purple tinted, animated breathing */}
    {GOD_RAYS.map((ray, i) => (
      <polygon
        key={`ray-${i}`}
        points={rayPolygon(ray.angle, ray.baseW)}
        fill={CONCERT_PURPLE}
        opacity={ray.opacity}
        style={{
          animationName: 'ray-breathe',
          animationDuration: `${RAY_DURATIONS[i]}s`,
          animationDelay: `${i * 0.7}s`,
          animationTimingFunction: 'ease-in-out',
          animationIterationCount: 'infinite',
        }}
      />
    ))}
  </svg>
);

export default StageBacklight;
