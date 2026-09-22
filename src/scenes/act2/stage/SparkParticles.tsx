import React, { useMemo } from 'react';
import { seededRandom } from '../../../utils/svgHelpers';
import {
  CONCERT_WHITE,
} from '../../../theme/colors';

/**
 * SparkParticles — Floating dust motes and floor smoke wisps.
 * Atmospheric particles for stage ambience.
 *
 * z-index 55.
 */

const SparkParticles: React.FC = () => {

  // Dust particles
  const dust = useMemo(() => {
    const rand = seededRandom(707);
    const particles = [];
    for (let i = 0; i < 8; i++) {
      particles.push({
        cx: 300 + rand() * 1300,
        cy: 400 + rand() * 200,
        r: 3 + rand() * 2,
        opacity: 0.03 + rand() * 0.02,
        duration: 15 + rand() * 7,
        delay: -(rand() * 20),
      });
    }
    return particles;
  }, []);

  // Floor smoke wisps
  const smokeWisps = useMemo(() => {
    const rand = seededRandom(808);
    const wisps = [];
    for (let i = 0; i < 4; i++) {
      wisps.push({
        cx: 300 + rand() * 1320,
        cy: 680 + rand() * 20,
        rx: 60 + rand() * 40,
        ry: 4 + rand() * 2,
        opacity: 0.03 + rand() * 0.03,
      });
    }
    return wisps;
  }, []);

  return (
    <svg
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 55,
        pointerEvents: 'none',
      }}
      viewBox="0 0 1920 1080"
      preserveAspectRatio="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Blur filter for floor smoke */}
        <filter id="smoke-blur">
          <feGaussianBlur stdDeviation="5" />
        </filter>
      </defs>

      {/* ── Dust motes (floating) ────────────────────────────────── */}
      {dust.map((d, i) => (
        <g
          key={`dust-${i}`}
          style={{
            animationName: 'float-up-down',
            animationDuration: `${d.duration}s`,
            animationDelay: `${d.delay}s`,
            animationTimingFunction: 'ease-in-out',
            animationIterationCount: 'infinite',
          }}
        >
          <circle
            cx={d.cx}
            cy={d.cy}
            r={d.r}
            fill={CONCERT_WHITE}
            opacity={d.opacity}
          />
        </g>
      ))}

      {/* ── Floor smoke wisps ────────────────────────────────────── */}
      {smokeWisps.map((w, i) => (
        <ellipse
          key={`smoke-${i}`}
          cx={w.cx}
          cy={w.cy}
          rx={w.rx}
          ry={w.ry}
          fill="white"
          opacity={w.opacity}
          filter="url(#smoke-blur)"
        />
      ))}
    </svg>
  );
};

export default SparkParticles;
