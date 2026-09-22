import React from 'react';
import {
  JEOK,
  HWANG,
  CHEONG,
  WARM_CREAM,
  DANCHEONG_GREEN,
  DANCHEONG_TEAL,
  CORAL_PINK,
  PINE_DARK,
  PALE_JADE,
  HEUK,
} from '../../../theme/colors';

/**
 * MinhwaBorder — Arirang folk art (민화) border frame.
 *
 * Bold, saturated colors in the minhwa tradition. Organic motifs
 * evoking the Arirang folk song and mountain pass (아리랑 고개):
 *   Top:     Mountain ridgeline with pine trees & winding path
 *   Bottom:  Folk-art waves with curling crests & foam
 *   Sides:   Pine tree & cloud columns
 *   Corners: Five-petal folk flowers with brushstroke outlines
 *
 * z-index 90 — frames Scene 1.
 */

const BW = 44; // Border width

/* ── Top Edge: Mountain Ridgeline (아리랑 고개) ──────────────── */

const TopEdge: React.FC = () => (
  <svg
    width="100%"
    height={BW}
    style={{ display: 'block' }}
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <pattern id="minhwa-top" patternUnits="userSpaceOnUse" width={200} height={BW}>
        {/* Deep blue sky background */}
        <rect width={200} height={BW} fill={CHEONG} />

        {/* Back mountain range — bold green */}
        <path
          d="M 0 36 C 10 34, 25 18, 48 14 C 62 11, 78 26, 100 28 C 115 30, 135 16, 158 13 C 172 11, 188 30, 200 36 L 200 40 L 0 40 Z"
          fill={DANCHEONG_GREEN}
        />

        {/* Front mountain range — lighter green for depth */}
        <path
          d="M 0 34 C 18 30, 42 22, 72 18 C 92 15, 108 30, 132 33 C 148 35, 165 24, 180 21 C 192 19, 200 30, 200 34 L 200 40 L 0 40 Z"
          fill={PALE_JADE}
          opacity={0.85}
        />

        {/* Pine tree silhouettes — dark and visible */}
        <path
          d="M 72 12 C 67 17, 66 20, 68 22 C 69 23, 75 23, 76 22 C 78 20, 77 17, 72 12 Z"
          fill={PINE_DARK}
        />
        <line x1={72} y1={22} x2={72} y2={27} stroke={HEUK} strokeWidth={0.8} strokeLinecap="round" opacity={0.7} />

        <path
          d="M 180 14 C 176 18, 175 21, 177 23 C 178 24, 182 24, 183 23 C 185 21, 184 18, 180 14 Z"
          fill={PINE_DARK}
        />
        <line x1={180} y1={23} x2={180} y2={28} stroke={HEUK} strokeWidth={0.8} strokeLinecap="round" opacity={0.7} />

        {/* Winding pass path — gold dashed line */}
        <path
          d="M 0 28 Q 25 24, 50 27 Q 75 30, 100 26 Q 125 22, 150 25 Q 175 28, 200 26"
          fill="none"
          stroke={HWANG}
          strokeWidth={0.7}
          strokeDasharray="3 4"
          opacity={0.35}
          strokeLinecap="round"
        />

        {/* Mist wisps */}
        <path d="M 15 32 Q 35 30, 55 32" fill="none" stroke="white" strokeWidth={0.6} opacity={0.2} strokeLinecap="round" />
        <path d="M 120 30 Q 145 28, 170 30" fill="none" stroke="white" strokeWidth={0.5} opacity={0.15} strokeLinecap="round" />

        {/* Outer JEOK band */}
        <rect y={0} width={200} height={5} fill={JEOK} />
        {/* Outer wavy gold accent */}
        <path
          d="M 0 6 Q 10 5, 20 6 Q 30 7, 40 6 Q 50 5, 60 6 Q 70 7, 80 6 Q 90 5, 100 6 Q 110 7, 120 6 Q 130 5, 140 6 Q 150 7, 160 6 Q 170 5, 180 6 Q 190 7, 200 6"
          fill="none"
          stroke={HWANG}
          strokeWidth={1}
          opacity={0.7}
          strokeLinecap="round"
        />

        {/* Inner wavy gold accent */}
        <path
          d="M 0 39 Q 10 38, 20 39 Q 30 40, 40 39 Q 50 38, 60 39 Q 70 40, 80 39 Q 90 38, 100 39 Q 110 40, 120 39 Q 130 38, 140 39 Q 150 40, 160 39 Q 170 38, 180 39 Q 190 40, 200 39"
          fill="none"
          stroke={HWANG}
          strokeWidth={0.8}
          opacity={0.6}
          strokeLinecap="round"
        />
        {/* Inner cream band */}
        <rect y={40} width={200} height={4} fill={WARM_CREAM} />
      </pattern>
    </defs>
    <rect width="100%" height={BW} fill="url(#minhwa-top)" />
  </svg>
);

/* ── Bottom Edge: Folk Waves (물결) ──────────────────────────── */

const BottomEdge: React.FC = () => (
  <svg
    width="100%"
    height={BW}
    style={{ display: 'block' }}
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <pattern id="minhwa-bottom" patternUnits="userSpaceOnUse" width={120} height={BW}>
        {/* Deep blue background */}
        <rect width={120} height={BW} fill={CHEONG} />

        {/* Back wave — bold teal */}
        <path
          d="M 0 28 C 12 22, 28 12, 45 10 C 58 8, 72 22, 90 26 C 100 28, 112 20, 120 28 L 120 39 L 0 39 Z"
          fill={DANCHEONG_TEAL}
          opacity={0.85}
        />

        {/* Front wave — lighter jade */}
        <path
          d="M 0 32 C 8 26, 22 14, 38 10 C 48 8, 60 22, 75 26 C 82 28, 92 16, 105 12 C 112 10, 118 24, 120 32 L 120 39 L 0 39 Z"
          fill={PALE_JADE}
          opacity={0.8}
        />

        {/* Wave curl at first crest */}
        <path
          d="M 35 13 C 33 9, 36 6, 39 8 C 41 9, 40 12, 38 12"
          fill="none"
          stroke={WARM_CREAM}
          strokeWidth={0.7}
          opacity={0.5}
          strokeLinecap="round"
        />

        {/* Wave curl at second crest */}
        <path
          d="M 102 15 C 100 11, 103 8, 106 10 C 108 11, 107 14, 105 14"
          fill="none"
          stroke={WARM_CREAM}
          strokeWidth={0.7}
          opacity={0.45}
          strokeLinecap="round"
        />

        {/* Foam dots */}
        <circle cx={42} cy={11} r={0.8} fill="white" opacity={0.4} />
        <circle cx={45} cy={14} r={0.6} fill="white" opacity={0.3} />
        <circle cx={108} cy={13} r={0.7} fill="white" opacity={0.35} />

        {/* Inner cream band (top of SVG = facing the scene) */}
        <rect y={0} width={120} height={4} fill={WARM_CREAM} />
        {/* Inner gold accent */}
        <line x1={0} y1={5} x2={120} y2={5} stroke={HWANG} strokeWidth={0.8} opacity={0.6} strokeLinecap="round" />

        {/* Outer gold accent */}
        <line x1={0} y1={38} x2={120} y2={38} stroke={HWANG} strokeWidth={1} opacity={0.7} strokeLinecap="round" />
        {/* Outer JEOK band (bottom of SVG = viewport edge) */}
        <rect y={39} width={120} height={5} fill={JEOK} />
      </pattern>
    </defs>
    <rect width="100%" height={BW} fill="url(#minhwa-bottom)" />
  </svg>
);

/* ── Side Edge: Pine & Cloud Column ──────────────────────────── */

const SideEdge: React.FC<{ side: 'left' | 'right' }> = ({ side }) => {
  const isRight = side === 'right';
  const pid = `minhwa-side-${side}`;

  return (
    <svg
      width={BW}
      height="100%"
      style={{ display: 'block' }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <pattern id={pid} patternUnits="userSpaceOnUse" width={BW} height={250}>
          {/* Rich green background */}
          <rect width={BW} height={250} fill={DANCHEONG_GREEN} />

          {/* ── Pine tree 1: bold canopy tiers ── */}
          {/* Top canopy — light jade */}
          <path
            d="M 23 35 C 17 44, 16 50, 18 55 C 19 57, 27 57, 28 55 C 30 50, 29 44, 23 35 Z"
            fill={PALE_JADE}
            opacity={0.8}
          />
          {/* Bottom canopy — dark pine */}
          <path
            d="M 23 48 C 15 58, 14 65, 16 70 C 17 72, 29 72, 30 70 C 32 65, 31 58, 23 48 Z"
            fill={PINE_DARK}
          />
          {/* Trunk */}
          <line x1={23} y1={70} x2={23} y2={82} stroke={HEUK} strokeWidth={2} strokeLinecap="round" opacity={0.6} />

          {/* ── Folk cloud wisp 1 (구름) — visible cream ── */}
          <path
            d="M 11 112 C 13 107, 17 105, 21 105 C 23 103, 27 104, 29 106 C 31 104, 34 106, 35 109 C 35 112, 33 114, 29 114 L 17 114 C 13 114, 11 113, 11 112 Z"
            fill={WARM_CREAM}
            opacity={0.3}
          />

          {/* ── Pine tree 2: slightly different shape & offset ── */}
          <path
            d="M 24 148 C 19 156, 18 162, 20 166 C 21 168, 27 168, 28 166 C 30 162, 29 156, 24 148 Z"
            fill={PINE_DARK}
          />
          <path
            d="M 24 160 C 17 170, 15 177, 17 182 C 18 184, 30 184, 31 182 C 33 177, 31 170, 24 160 Z"
            fill={PALE_JADE}
            opacity={0.7}
          />
          <line x1={24} y1={182} x2={24} y2={195} stroke={HEUK} strokeWidth={2} strokeLinecap="round" opacity={0.6} />

          {/* ── Folk cloud wisp 2 ── */}
          <path
            d="M 13 227 C 15 222, 19 220, 23 221 C 26 219, 29 221, 31 224 C 33 222, 35 224, 35 227 C 35 229, 33 230, 29 230 L 19 230 C 15 230, 13 229, 13 227 Z"
            fill={WARM_CREAM}
            opacity={0.25}
          />

          {/* Outer JEOK band */}
          <rect x={0} y={0} width={5} height={250} fill={JEOK} />
          {/* Outer gold accent */}
          <line x1={6.5} y1={0} x2={6.5} y2={250} stroke={HWANG} strokeWidth={1} opacity={0.7} strokeLinecap="round" />

          {/* Inner gold accent */}
          <line x1={37.5} y1={0} x2={37.5} y2={250} stroke={HWANG} strokeWidth={0.8} opacity={0.6} strokeLinecap="round" />
          {/* Inner cream band */}
          <rect x={40} y={0} width={4} height={250} fill={WARM_CREAM} />
        </pattern>
      </defs>

      <g transform={isRight ? `translate(${BW},0) scale(-1,1)` : undefined}>
        <rect x={0} y={0} width={BW} height="100%" fill={`url(#${pid})`} />
      </g>
    </svg>
  );
};

/* ── Corner Ornament: Folk Flower (민화 꽃) ──────────────────── */

interface CornerProps {
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

/* Five petals with intentionally imperfect bezier paths for brushstroke feel. */
const petalData = [
  { angle: -2,  d: 'M 0 0 C -3 -4, -4.5 -9, -2.5 -12 C -1 -14, 1.5 -13, 2.5 -11.5 C 4 -9, 3 -4, 0 0 Z' },
  { angle: 70,  d: 'M 0 0 C -2.5 -4, -4 -9.5, -2 -12 C -1 -13.5, 1 -13.5, 2 -12 C 3.5 -9, 3 -4, 0 0 Z' },
  { angle: 143, d: 'M 0 0 C -3.5 -4, -4 -8.5, -3 -11.5 C -2 -13, 1.5 -13, 3 -11 C 4.5 -8, 3.5 -4, 0 0 Z' },
  { angle: 217, d: 'M 0 0 C -2.5 -3.5, -4.5 -9, -2.5 -12 C -1 -13, 1 -14, 2.5 -12 C 4 -9, 2.5 -3.5, 0 0 Z' },
  { angle: 287, d: 'M 0 0 C -3 -4.5, -3.5 -8.5, -2 -11.5 C -1 -13, 1.5 -13, 2.5 -11.5 C 3.5 -8.5, 3 -4.5, 0 0 Z' },
];

const stamenAngles = [36, 108, 180, 252, 324];

const CornerOrnament: React.FC<CornerProps> = ({ position }) => {
  const cx = BW / 2;
  const cy = BW / 2;

  const posStyle: React.CSSProperties = {
    position: 'absolute',
    width: BW,
    height: BW,
    ...(position.includes('top') ? { top: 0 } : { bottom: 0 }),
    ...(position.includes('left') ? { left: 0 } : { right: 0 }),
  };

  return (
    <svg
      width={BW}
      height={BW}
      viewBox={`0 0 ${BW} ${BW}`}
      style={posStyle}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Background */}
      <rect width={BW} height={BW} fill={DANCHEONG_GREEN} />

      {/* Small leaves behind flower */}
      <path
        d="M 22 24 C 18 27, 14 32, 12 36 C 14 33, 17 29, 20 26 Z"
        fill={PINE_DARK}
        opacity={0.7}
      />
      <path
        d="M 22 24 C 26 27, 30 32, 32 36 C 30 33, 27 29, 24 26 Z"
        fill={PINE_DARK}
        opacity={0.65}
      />

      {/* Petals — bold coral pink and red with brushstroke outlines */}
      {petalData.map((p, i) => (
        <path
          key={i}
          d={p.d}
          fill={i % 2 === 0 ? CORAL_PINK : JEOK}
          stroke={HEUK}
          strokeWidth={0.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.95}
          transform={`translate(${cx},${cy}) rotate(${p.angle})`}
        />
      ))}

      {/* Center dot */}
      <circle cx={cx} cy={cy} r={3} fill={HWANG} />
      <circle cx={cx} cy={cy} r={4.5} fill="none" stroke={HWANG} strokeWidth={0.5} opacity={0.6} />

      {/* Stamen dots between petals */}
      {stamenAngles.map((deg, i) => {
        const r = 6;
        const sx = cx + r * Math.cos((deg * Math.PI) / 180);
        const sy = cy + r * Math.sin((deg * Math.PI) / 180);
        return <circle key={i} cx={sx} cy={sy} r={0.8} fill={HWANG} opacity={0.7} />;
      })}
    </svg>
  );
};

/* ── Main Component ───────────────────────────────────────────── */

const MinhwaBorder: React.FC = () => (
  <div
    style={{
      position: 'absolute',
      inset: 0,
      zIndex: 90,
      pointerEvents: 'none',
      overflow: 'hidden',
    }}
    aria-hidden="true"
  >
    {/* Top edge */}
    <div style={{ position: 'absolute', top: 0, left: BW, right: BW, height: BW }}>
      <TopEdge />
    </div>

    {/* Bottom edge */}
    <div style={{ position: 'absolute', bottom: 0, left: BW, right: BW, height: BW }}>
      <BottomEdge />
    </div>

    {/* Left edge */}
    <div style={{ position: 'absolute', top: BW, bottom: BW, left: 0, width: BW }}>
      <SideEdge side="left" />
    </div>

    {/* Right edge */}
    <div style={{ position: 'absolute', top: BW, bottom: BW, right: 0, width: BW }}>
      <SideEdge side="right" />
    </div>

    {/* Corner ornaments */}
    <CornerOrnament position="top-left" />
    <CornerOrnament position="top-right" />
    <CornerOrnament position="bottom-left" />
    <CornerOrnament position="bottom-right" />
  </div>
);

export default MinhwaBorder;
