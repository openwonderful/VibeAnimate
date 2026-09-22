import React from 'react';

/**
 * BassShockwave — 2 concentric pulse rings radiating from the stage center
 * (960, 280). Each ring scales from 0 to 1 while fading out, creating a
 * continuous bass-pulse effect. The second ring is offset by half the
 * animation duration for a seamless loop.
 *
 * z-index 38.
 */

const BassShockwave: React.FC = () => {
  return (
    <svg
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 38,
        pointerEvents: 'none',
      }}
      viewBox="0 0 1920 1080"
      preserveAspectRatio="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Ring 1 */}
      <g
        style={{
          transformOrigin: '960px 280px',
          animationName: 'bass-pulse-ring',
          animationDuration: '2.5s',
          animationDelay: '0s',
          animationTimingFunction: 'ease-out',
          animationIterationCount: 'infinite',
        }}
      >
        <circle
          cx={960}
          cy={280}
          r={500}
          fill="none"
          stroke="white"
          strokeWidth={1}
        />
      </g>

      {/* Ring 2 — offset by half cycle */}
      <g
        style={{
          transformOrigin: '960px 280px',
          animationName: 'bass-pulse-ring',
          animationDuration: '2.5s',
          animationDelay: '1.25s',
          animationTimingFunction: 'ease-out',
          animationIterationCount: 'infinite',
        }}
      >
        <circle
          cx={960}
          cy={280}
          r={500}
          fill="none"
          stroke="white"
          strokeWidth={1}
        />
      </g>
    </svg>
  );
};

export default BassShockwave;
