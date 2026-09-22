import React from 'react';

/**
 * StageEquipment — Wedge monitors, mic stands, and a camera boom arm.
 * Subtle dark shapes that ground the stage scene in realism.
 *
 * z-index 20.
 */

const MONITORS = [
  { x: 550, y: 680 },
  { x: 750, y: 680 },
  { x: 1170, y: 680 },
  { x: 1370, y: 680 },
];

const MIC_STANDS = [
  { x: 880 },
  { x: 960 },
  { x: 1040 },
];

const StageEquipment: React.FC = () => (
  <svg
    style={{
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      zIndex: 20,
      pointerEvents: 'none',
    }}
    viewBox="0 0 1920 1080"
    preserveAspectRatio="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* ── Wedge monitors ─────────────────────────────────────── */}
    {MONITORS.map((m, i) => (
      <g key={`monitor-${i}`}>
        {/* Trapezoidal body — wider at front, narrower at back */}
        <polygon
          points={`${m.x - 20},${m.y + 12} ${m.x + 20},${m.y + 12} ${m.x + 16},${m.y} ${m.x - 16},${m.y}`}
          fill="#1A1A2E"
          stroke="#333"
          strokeWidth={0.8}
        />
        {/* Front grille */}
        <rect
          x={m.x - 14}
          y={m.y + 1}
          width={28}
          height={4}
          fill="#222"
          opacity={0.2}
        />
      </g>
    ))}

    {/* ── Mic stands ─────────────────────────────────────────── */}
    {MIC_STANDS.map((ms, i) => (
      <g key={`mic-${i}`}>
        {/* Vertical pole */}
        <line
          x1={ms.x}
          y1={600}
          x2={ms.x}
          y2={680}
          stroke="#444"
          strokeWidth={1.2}
        />
        {/* Mic head */}
        <circle cx={ms.x} cy={600} r={2.5} fill="#333" />
        {/* Triangle base */}
        <polygon
          points={`${ms.x - 6},${680} ${ms.x + 6},${680} ${ms.x},${676}`}
          fill="#333"
        />
      </g>
    ))}

    {/* ── Camera boom ────────────────────────────────────────── */}
    <g opacity={0.4}>
      {/* Boom arm */}
      <line
        x1={1650}
        y1={300}
        x2={1550}
        y2={550}
        stroke="#222"
        strokeWidth={2}
      />
      {/* Camera body */}
      <rect
        x={1546}
        y={547}
        width={8}
        height={6}
        fill="#0D0D18"
      />
      {/* Counterweight */}
      <circle cx={1680} cy={280} r={4} fill="#0D0D18" />
    </g>
  </svg>
);

export default StageEquipment;
