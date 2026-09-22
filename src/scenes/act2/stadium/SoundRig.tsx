import React from 'react';
import {
  CONCERT_PURPLE,
  CONCERT_BLUE,
  CONCERT_MAGENTA,
} from '../../../theme/colors';

/**
 * SoundRig — Hanging speaker arrays, lighting trusses, and cable lines.
 *
 * z-index 55
 */

interface SpeakerCluster {
  cx: number;
  cy: number;
  count: number;
}

const SPEAKER_CLUSTERS: SpeakerCluster[] = [
  { cx: 400, cy: 220, count: 4 },
  { cx: 700, cy: 180, count: 3 },
  { cx: 1220, cy: 180, count: 3 },
  { cx: 1520, cy: 220, count: 4 },
];

const TRUSS_LIGHT_COLORS = [
  CONCERT_PURPLE,
  CONCERT_BLUE,
  CONCERT_MAGENTA,
  CONCERT_PURPLE,
  CONCERT_BLUE,
  CONCERT_MAGENTA,
  CONCERT_PURPLE,
  CONCERT_BLUE,
];

const SoundRig: React.FC = () => {
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
      {/* ── Speaker arrays ─────────────────────────────────────── */}
      {SPEAKER_CLUSTERS.map((cluster, ci) => (
        <g key={`speaker-cluster-${ci}`}>
          {Array.from({ length: cluster.count }, (_, i) => (
            <rect
              key={`speaker-${ci}-${i}`}
              x={cluster.cx - 7.5}
              y={cluster.cy + i * 10}
              width={15}
              height={8}
              fill="#0A0A15"
              stroke="#1A1A2A"
              strokeWidth={0.5}
              rx={1}
            />
          ))}
        </g>
      ))}

      {/* ── Lighting truss bar 1 (left) ────────────────────────── */}
      <rect
        x={350} y={160} width={550} height={4}
        fill="#151525"
        stroke="#2A2A40"
        strokeWidth={0.5}
        rx={1}
      />
      {/* Moving head lights on bar 1 */}
      {Array.from({ length: 7 }, (_, i) => (
        <circle
          key={`truss1-light-${i}`}
          cx={380 + i * 78}
          cy={162}
          r={3}
          fill={TRUSS_LIGHT_COLORS[i % TRUSS_LIGHT_COLORS.length]}
          opacity={0.5}
        />
      ))}

      {/* ── Lighting truss bar 2 (right) ───────────────────────── */}
      <rect
        x={1020} y={160} width={550} height={4}
        fill="#151525"
        stroke="#2A2A40"
        strokeWidth={0.5}
        rx={1}
      />
      {/* Moving head lights on bar 2 */}
      {Array.from({ length: 7 }, (_, i) => (
        <circle
          key={`truss2-light-${i}`}
          cx={1050 + i * 78}
          cy={162}
          r={3}
          fill={TRUSS_LIGHT_COLORS[(i + 1) % TRUSS_LIGHT_COLORS.length]}
          opacity={0.5}
        />
      ))}

      {/* ── Cable lines (truss bars up to roof arch) ──────────── */}
      <line x1={420} y1={160} x2={380} y2={80} stroke="#1A1A2A" strokeWidth={0.5} opacity={0.3} />
      <line x1={830} y1={160} x2={860} y2={70} stroke="#1A1A2A" strokeWidth={0.5} opacity={0.3} />
      <line x1={1090} y1={160} x2={1060} y2={70} stroke="#1A1A2A" strokeWidth={0.5} opacity={0.3} />
      <line x1={1500} y1={160} x2={1540} y2={80} stroke="#1A1A2A" strokeWidth={0.5} opacity={0.3} />
    </svg>
  );
};

export default SoundRig;
