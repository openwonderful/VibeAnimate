import React from 'react';
import { CONCERT_WHITE } from '../../../theme/colors';

/**
 * PyroEffects — 6 spark gerb/fountain columns on the stage sides.
 * Each gerb is a narrow vertical spray of white/warm-white light,
 * with a bright base emitter, glow circle, and floor splash.
 *
 * z-index 40.
 */

const GERB_XS = [220, 320, 420, 1500, 1600, 1700];
const BASE_Y = 680;
const SPRAY_HEIGHT = 160;

const PULSE_DURATIONS = ['0.18s', '0.22s', '0.15s', '0.2s', '0.17s', '0.25s'];

const PyroEffects: React.FC = () => (
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
      {/* Gerb spray gradient — bright white base fading to transparent */}
      <linearGradient id="gerb-spray" x1="0" y1="1" x2="0" y2="0">
        <stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.8} />
        <stop offset="30%" stopColor="#FFF8E1" stopOpacity={0.5} />
        <stop offset="70%" stopColor="#FFF8E1" stopOpacity={0.15} />
        <stop offset="100%" stopColor="#FFF8E1" stopOpacity={0} />
      </linearGradient>

      {/* Base glow radial */}
      <radialGradient id="gerb-base-glow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.2} />
        <stop offset="60%" stopColor="#FFF8E1" stopOpacity={0.08} />
        <stop offset="100%" stopColor="#FFF8E1" stopOpacity={0} />
      </radialGradient>
    </defs>

    {GERB_XS.map((cx, i) => {
      const topY = BASE_Y - SPRAY_HEIGHT;
      return (
        <g
          key={`gerb-${i}`}
          style={{
            animationName: 'gerb-pulse',
            animationDuration: PULSE_DURATIONS[i],
            animationTimingFunction: 'ease-in-out',
            animationIterationCount: 'infinite',
          }}
        >
          {/* Spray cone — narrow tapered column */}
          <polygon
            points={`${cx - 10},${BASE_Y} ${cx - 1.5},${topY} ${cx + 1.5},${topY} ${cx + 10},${BASE_Y}`}
            fill="url(#gerb-spray)"
          />

          {/* Base emitter — bright hot point */}
          <circle
            cx={cx}
            cy={BASE_Y}
            r={8}
            fill="white"
            opacity={0.9}
          />

          {/* Base atmospheric glow */}
          <circle
            cx={cx}
            cy={BASE_Y}
            r={40}
            fill="url(#gerb-base-glow)"
          />

          {/* Floor splash */}
          <ellipse
            cx={cx}
            cy={BASE_Y + 10}
            rx={50}
            ry={8}
            fill={CONCERT_WHITE}
            opacity={0.08}
          />
        </g>
      );
    })}
  </svg>
);

export default PyroEffects;
