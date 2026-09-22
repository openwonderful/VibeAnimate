import React from 'react';
import {
  JEOK,
  LED_CRIMSON,
  LED_CRIMSON_BRIGHT,
  LED_CRIMSON_DARK,
  LED_PANEL_FRAME,
} from '../../../theme/colors';

/**
 * LEDWall — Modular LED screen panels behind the members, arranged
 * architecturally like a real K-pop concert stage. Red/crimson dominant
 * with dark structural framing between panels.
 *
 * z-index 15.
 */

interface PanelDef {
  x: number;
  y: number;
  w: number;
  h: number;
  grad: string;
  delay: number;
  duration: number;
}

// ── Panel definitions by tier ──────────────────────────────────────

const UPPER_PANELS: PanelDef[] = [
  { x: 260, y: 10,  w: 280, h: 86,  grad: 'led-grad-std',  delay: 0,   duration: 5 },
  { x: 544, y: 10,  w: 310, h: 86,  grad: 'led-grad-dark', delay: 0.6, duration: 4.5 },
  { x: 1066, y: 10, w: 310, h: 86,  grad: 'led-grad-dark', delay: 1.2, duration: 4.5 },
  { x: 1380, y: 10, w: 280, h: 86,  grad: 'led-grad-std',  delay: 1.8, duration: 5 },
];

const CENTER_PANELS: PanelDef[] = [
  // Row 1
  { x: 200, y: 100, w: 500, h: 165, grad: 'led-grad-hot',  delay: 0.3, duration: 4 },
  { x: 706, y: 100, w: 508, h: 165, grad: 'led-grad-hot',  delay: 0,   duration: 3.5 },
  { x: 1220, y: 100, w: 500, h: 165, grad: 'led-grad-hot', delay: 0.6, duration: 4 },
  // Row 2
  { x: 200, y: 268, w: 370, h: 168, grad: 'led-grad-std',  delay: 1.0, duration: 5 },
  { x: 574, y: 268, w: 384, h: 168, grad: 'led-grad-std',  delay: 0.4, duration: 4 },
  { x: 962, y: 268, w: 384, h: 168, grad: 'led-grad-std',  delay: 0.8, duration: 4.5 },
  { x: 1350, y: 268, w: 370, h: 168, grad: 'led-grad-std', delay: 1.4, duration: 5 },
];

const LOWER_PANELS: PanelDef[] = [
  // Row 3
  { x: 200, y: 440, w: 260, h: 60,  grad: 'led-grad-dark', delay: 0.2, duration: 6 },
  { x: 464, y: 440, w: 310, h: 60,  grad: 'led-grad-dark', delay: 0.8, duration: 5 },
  { x: 778, y: 440, w: 364, h: 60,  grad: 'led-grad-std',  delay: 0.5, duration: 4.5 },
  { x: 1146, y: 440, w: 310, h: 60, grad: 'led-grad-dark', delay: 1.1, duration: 5 },
  { x: 1460, y: 440, w: 260, h: 60, grad: 'led-grad-dark', delay: 1.6, duration: 6 },
  // Row 4
  { x: 200, y: 504, w: 540, h: 66,  grad: 'led-grad-dark', delay: 0.3, duration: 5.5 },
  { x: 744, y: 504, w: 432, h: 66,  grad: 'led-grad-dark', delay: 0.9, duration: 4.5 },
  { x: 1180, y: 504, w: 540, h: 66, grad: 'led-grad-dark', delay: 1.5, duration: 5.5 },
  // Bottom strip
  { x: 200, y: 574, w: 1520, h: 16, grad: 'led-grad-std',  delay: 0,   duration: 3 },
];

const SIDE_PANELS: PanelDef[] = [
  // Left tower
  { x: 164, y: 10,  w: 30, h: 190, grad: 'led-grad-tower', delay: 0.2, duration: 5 },
  { x: 164, y: 204, w: 30, h: 190, grad: 'led-grad-tower', delay: 0.8, duration: 4.5 },
  { x: 164, y: 398, w: 30, h: 190, grad: 'led-grad-tower', delay: 1.4, duration: 5.5 },
  // Right tower
  { x: 1726, y: 10,  w: 30, h: 190, grad: 'led-grad-tower', delay: 0.4, duration: 5 },
  { x: 1726, y: 204, w: 30, h: 190, grad: 'led-grad-tower', delay: 1.0, duration: 4.5 },
  { x: 1726, y: 398, w: 30, h: 190, grad: 'led-grad-tower', delay: 1.6, duration: 5.5 },
];

const ALL_PANELS = [...SIDE_PANELS, ...UPPER_PANELS, ...CENTER_PANELS, ...LOWER_PANELS];

const LEDWall: React.FC = () => (
  <svg
    style={{
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      zIndex: 15,
      pointerEvents: 'none',
    }}
    viewBox="0 0 1920 1080"
    preserveAspectRatio="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      {/* Standard crimson gradient (most panels) */}
      <linearGradient id="led-grad-std" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={LED_CRIMSON_BRIGHT} stopOpacity={0.85} />
        <stop offset="100%" stopColor={LED_CRIMSON} stopOpacity={0.7} />
      </linearGradient>

      {/* Darker / recessed gradient */}
      <linearGradient id="led-grad-dark" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={LED_CRIMSON} stopOpacity={0.6} />
        <stop offset="100%" stopColor={LED_CRIMSON_DARK} stopOpacity={0.5} />
      </linearGradient>

      {/* Hot / bright accent gradient (hero center panels) */}
      <linearGradient id="led-grad-hot" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor={LED_CRIMSON_BRIGHT} stopOpacity={0.95} />
        <stop offset="50%" stopColor={JEOK} stopOpacity={0.85} />
        <stop offset="100%" stopColor={LED_CRIMSON} stopOpacity={0.75} />
      </linearGradient>

      {/* Side tower vertical gradient */}
      <linearGradient id="led-grad-tower" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={LED_CRIMSON_BRIGHT} stopOpacity={0.7} />
        <stop offset="50%" stopColor={LED_CRIMSON} stopOpacity={0.5} />
        <stop offset="100%" stopColor={LED_CRIMSON_DARK} stopOpacity={0.3} />
      </linearGradient>

      {/* Subtle horizontal LED pixel-line texture */}
      <pattern id="led-pixel-lines" width={4} height={4} patternUnits="userSpaceOnUse">
        <line x1={0} y1={2} x2={4} y2={2} stroke="rgba(0,0,0,0.15)" strokeWidth={0.5} />
      </pattern>

      {/* Ambient center glow */}
      <radialGradient id="led-ambient-glow" cx="50%" cy="45%" r="50%">
        <stop offset="0%" stopColor={LED_CRIMSON_BRIGHT} stopOpacity={0.12} />
        <stop offset="100%" stopColor={LED_CRIMSON_DARK} stopOpacity={0} />
      </radialGradient>
    </defs>

    {/* Wall background — dark structural frame */}
    <rect x={160} y={0} width={1600} height={594} fill={LED_PANEL_FRAME} />

    {/* Wall border */}
    <rect
      x={160}
      y={0}
      width={1600}
      height={594}
      fill="none"
      stroke="#1A1A2A"
      strokeWidth={2}
    />

    {/* All LED panels */}
    {ALL_PANELS.map((p, i) => (
      <rect
        key={`panel-${i}`}
        x={p.x}
        y={p.y}
        width={p.w}
        height={p.h}
        fill={`url(#${p.grad})`}
        style={{
          animationName: 'led-panel-pulse',
          animationDuration: `${p.duration}s`,
          animationTimingFunction: 'ease-in-out',
          animationIterationCount: 'infinite',
          animationDelay: `${p.delay}s`,
        }}
      />
    ))}

    {/* Dark mask behind Arirang symbols area */}
    <rect x={800} y={0} width={320} height={100} fill={LED_PANEL_FRAME} />

    {/* LED pixel-line texture overlay */}
    <rect
      x={160}
      y={0}
      width={1600}
      height={594}
      fill="url(#led-pixel-lines)"
      opacity={0.3}
    />

    {/* Ambient center glow */}
    <ellipse
      cx={960}
      cy={280}
      rx={650}
      ry={260}
      fill="url(#led-ambient-glow)"
    />

    {/* Scan line */}
    <rect
      x={164}
      y={0}
      width={1592}
      height={2}
      fill={LED_CRIMSON_BRIGHT}
      opacity={0.06}
      style={{
        animationName: 'led-scanline',
        animationDuration: '4s',
        animationTimingFunction: 'linear',
        animationIterationCount: 'infinite',
      }}
    />
  </svg>
);

export default LEDWall;
