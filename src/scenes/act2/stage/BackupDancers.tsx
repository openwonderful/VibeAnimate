import React from 'react';
import {
  HEUK,
  CONCERT_PURPLE,
} from '../../../theme/colors';

/**
 * BackupDancers — 6 smaller dancer silhouettes flanking the main BTS
 * formation. Simpler figures with a purple rim light, gently swaying.
 *
 * z-index 22.
 */

interface DancerDef {
  x: number;
  y: number;
  scale: number;
  duration: string;
  delay: string;
}

const DANCERS: DancerDef[] = [
  { x: 300, y: 520, scale: 0.70, duration: '2.8s', delay: '0s' },
  { x: 380, y: 530, scale: 0.65, duration: '3.1s', delay: '0.4s' },
  { x: 340, y: 510, scale: 0.75, duration: '3.5s', delay: '0.8s' },
  { x: 1540, y: 530, scale: 0.65, duration: '3.0s', delay: '0.2s' },
  { x: 1620, y: 520, scale: 0.70, duration: '2.5s', delay: '0.6s' },
  { x: 1580, y: 510, scale: 0.75, duration: '3.3s', delay: '1.0s' },
];

/**
 * Simple dancer silhouette path: head circle approximation via arc,
 * straight body, simple arms, legs apart.
 * Origin at (0, 0) = top-centre of head, total height ~110px.
 */
const DANCER_PATH =
  'M 0,-5 ' +
  'C 6,-5 8,-2 8,3 C 8,8 6,11 0,11 C -6,11 -8,8 -8,3 C -8,-2 -6,-5 0,-5 Z ' + // head
  'M 0,11 L 0,55 ' +    // neck to waist
  'M -18,28 L 0,22 L 18,28 ' + // arms
  'M 0,55 L -10,95 ' +  // left leg
  'M 0,55 L 10,95';     // right leg

const BackupDancers: React.FC = () => (
  <svg
    style={{
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      zIndex: 22,
      pointerEvents: 'none',
    }}
    viewBox="0 0 1920 1080"
    preserveAspectRatio="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    {DANCERS.map((d, i) => (
      <g
        key={`dancer-${i}`}
        transform={`translate(${d.x}, ${d.y}) scale(${d.scale})`}
        style={{
          animationName: 'member-sway',
          animationDuration: d.duration,
          animationDelay: d.delay,
          animationTimingFunction: 'ease-in-out',
          animationIterationCount: 'infinite',
        }}
      >
        {/* Base silhouette */}
        <path
          d={DANCER_PATH}
          fill={HEUK}
          stroke={HEUK}
          strokeWidth={4}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.7}
        />
        {/* Purple rim light */}
        <path
          d={DANCER_PATH}
          fill="none"
          stroke={CONCERT_PURPLE}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.25}
          transform="translate(1, 0)"
        />
      </g>
    ))}
  </svg>
);

export default BackupDancers;
