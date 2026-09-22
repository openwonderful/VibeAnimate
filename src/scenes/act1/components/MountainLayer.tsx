import React from 'react';
import {
  PINE_DARK,
  DANCHEONG_GREEN,
  DANCHEONG_TEAL,
  CHEONG,
  HEUK,
} from '../../../theme/colors';
import { useAnimTime, loopPhase, cosWave, lerp } from '../../../hooks/useAnimTime';

/**
 * MountainLayer -- Four layered mountain ranges inspired by Irworobongdo (일월오봉도).
 * During zoom, each range has a different parallax depth so they peel away
 * at different speeds, creating a "flying through" effect.
 *
 * z-index 40
 */

/* ── Pine tree silhouette component ─────────────────────────────── */
interface PineTreeProps {
  x: number;
  y: number;
  height: number;
}

const PineTree: React.FC<PineTreeProps> = ({ x, y, height }) => {
  const trunkW = height * 0.1;
  const trunkH = height * 0.3;
  const tierCount = 3;
  const tierH = (height - trunkH) / tierCount;

  return (
    <g transform={`translate(${x}, ${y})`} opacity={0.6}>
      <polygon
        points={`${-trunkW / 2},0 ${trunkW / 2},0 ${trunkW / 4},${-trunkH} ${-trunkW / 4},${-trunkH}`}
        fill={HEUK}
      />
      {Array.from({ length: tierCount }).map((_, i) => {
        const tier = tierCount - 1 - i;
        const baseW = height * (0.25 + tier * 0.15);
        const tierBase = -(trunkH + tier * tierH);
        const tierTop = tierBase - tierH;
        return (
          <polygon
            key={i}
            points={`${-baseW / 2},${tierBase} ${baseW / 2},${tierBase} 0,${tierTop}`}
            fill={HEUK}
          />
        );
      })}
    </g>
  );
};

/* ── Mist wisp paths ────────────────────────────────────────────── */
const mistWisps = [
  'M 100 750 Q 300 744 500 748 Q 700 752 900 746',
  'M 400 735 Q 550 729 750 733 Q 950 737 1150 731',
  'M 50 765 Q 250 760 450 763 Q 650 766 850 761 Q 1050 756 1250 760',
  'M 700 740 Q 900 734 1100 738 Q 1300 742 1500 736',
  'M 250 775 Q 450 770 650 773 Q 850 776 1050 771 Q 1250 767 1450 770',
];

/* ── Pine tree placement data ───────────────────────────────────── */
const pines: PineTreeProps[] = [
  { x: 95,   y: 825, height: 18 },
  { x: 230,  y: 770, height: 24 },
  { x: 380,  y: 730, height: 20 },
  { x: 520,  y: 715, height: 28 },
  { x: 670,  y: 722, height: 16 },
  { x: 780,  y: 740, height: 22 },
  { x: 920,  y: 735, height: 26 },
  { x: 1050, y: 738, height: 18 },
  { x: 1180, y: 728, height: 24 },
  { x: 1340, y: 720, height: 20 },
  { x: 1480, y: 726, height: 28 },
  { x: 1610, y: 745, height: 16 },
  { x: 1740, y: 785, height: 22 },
  { x: 1860, y: 825, height: 18 },
];

/* ── Mountain path builder ──────────────────────────────────────── */
function buildRidgePath(
  peaks: { x: number; y: number }[],
  baseY: number,
  width: number,
): string {
  if (peaks.length === 0) return '';
  const parts: string[] = [`M -50 ${baseY}`];

  const first = peaks[0];
  parts.push(
    `C ${first.x * 0.15} ${baseY}, ${first.x * 0.5} ${first.y + (baseY - first.y) * 0.1}, ${first.x} ${first.y}`,
  );

  for (let i = 1; i < peaks.length; i++) {
    const prev = peaks[i - 1];
    const curr = peaks[i];
    const midX = (prev.x + curr.x) / 2;
    const valleyY = Math.max(prev.y, curr.y) + (baseY - Math.max(prev.y, curr.y)) * 0.6;
    const cp1x = prev.x + (midX - prev.x) * 0.6;
    const cp2x = midX - (midX - prev.x) * 0.15;
    parts.push(`C ${cp1x} ${prev.y + (valleyY - prev.y) * 0.1}, ${cp2x} ${valleyY}, ${midX} ${valleyY}`);
    const cp3x = midX + (curr.x - midX) * 0.15;
    const cp4x = curr.x - (curr.x - midX) * 0.6;
    parts.push(`C ${cp3x} ${valleyY}, ${cp4x} ${curr.y + (valleyY - curr.y) * 0.1}, ${curr.x} ${curr.y}`);
  }

  const last = peaks[peaks.length - 1];
  parts.push(
    `C ${last.x + (width - last.x) * 0.5} ${last.y + (baseY - last.y) * 0.1}, ${width - 100} ${baseY}, ${width + 50} ${baseY}`,
  );
  parts.push(`L ${width + 50} ${baseY + 200} L -50 ${baseY + 200} Z`);

  return parts.join(' ');
}

/* ── Shared SVG wrapper style ───────────────────────────────────── */
const svgStyle: React.CSSProperties = {
  width: '120%',
  marginLeft: '-10%',
  display: 'block',
};

/* ── Per-range parallax depth values ───────────────────────────── */
const RANGE_DEPTHS = {
  range1: 0.6,
  range2: 0.7,
  range3: 0.8,
  mist: 0.75,
  range4: 0.9,
};

const FOCAL_X = 960;
const FOCAL_Y = 260;
const ORIGIN_X_PCT = (FOCAL_X / 1920) * 100;
const ORIGIN_Y_PCT = (FOCAL_Y / 1080) * 100;

interface MountainLayerProps {
  zoomScale?: number;
}

const MountainLayer: React.FC<MountainLayerProps> = ({ zoomScale }) => {
  const t = useAnimTime();

  // parallax-* : translateX(0 → -range → 0) ease-in-out infinite
  // Implemented as (1-cos)/2 swing, shifted: starts at 0, reaches -range at midpoint.
  const parallaxX = (range: number, duration: number) => {
    const p = loopPhase(t, duration);
    const swing = (1 - cosWave(p)) / 2; // 0 → 1 → 0 ease-like
    return `translateX(${lerp(0, -range, swing)}px)`;
  };

  const range1Path = buildRidgePath(
    [
      { x: 200, y: 570 },
      { x: 500, y: 520 },
      { x: 800, y: 550 },
      { x: 1150, y: 510 },
      { x: 1550, y: 540 },
    ],
    810,
    1920,
  );

  const baekduPath = [
    'M -50 850',
    'C 100 845, 200 830, 320 800',
    'C 420 760, 530 680, 620 580',
    'C 660 545, 690 520, 720 508',
    'C 735 503, 745 505, 755 502',
    'C 790 530, 840 590, 900 625',
    'C 930 635, 980 638, 960 638',
    'C 990 638, 1020 635, 1020 635',
    'C 1080 590, 1130 530, 1165 502',
    'C 1175 505, 1185 503, 1200 508',
    'C 1230 520, 1260 545, 1300 580',
    'C 1390 680, 1500 760, 1600 800',
    'C 1720 830, 1820 845, 1970 850',
    'L 1970 1080 L -50 1080 Z',
  ].join(' ');

  const cheonjiPath = [
    'M 790 535',
    'C 820 565, 870 600, 925 622',
    'C 950 630, 975 632, 960 632',
    'C 985 632, 1000 630, 995 622',
    'C 1050 600, 1100 565, 1130 535',
    'C 1085 527, 1020 522, 960 520',
    'C 900 522, 835 527, 790 535',
    'Z',
  ].join(' ');

  const craterWallPath = [
    'M 755 502',
    'C 790 530, 840 565, 900 600',
    'C 930 615, 960 620, 960 620',
    'C 990 620, 1020 615, 1020 600',
    'C 1080 565, 1130 530, 1165 502',
    'C 1100 510, 1020 518, 960 520',
    'C 900 518, 820 510, 755 502',
    'Z',
  ].join(' ');

  const range3Path = buildRidgePath(
    [
      { x: 220, y: 720 },
      { x: 600, y: 700 },
      { x: 1300, y: 700 },
      { x: 1650, y: 720 },
    ],
    930,
    1920,
  );

  const range4Path = buildRidgePath(
    [
      { x: 450, y: 760 },
      { x: 1350, y: 730 },
    ],
    970,
    1920,
  );

  // Per-range style: combines parallax drift (time-based) with zoom scale (depth-based).
  const rangeStyle = (
    depth: number,
    parallaxRange: number,
    parallaxDuration: number,
  ): React.CSSProperties => {
    const drift = parallaxX(parallaxRange, parallaxDuration);
    if (!zoomScale || zoomScale <= 1.01) {
      return { transform: drift };
    }
    const layerScale = 1 + (zoomScale - 1) * depth;
    return {
      transform: `${drift} scale(${layerScale})`,
      transformOrigin: `${ORIGIN_X_PCT}% ${ORIGIN_Y_PCT}%`,
    };
  };

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 40,
        pointerEvents: 'none',
      }}
    >
      {/* ─── Range 1 (farthest) ─── */}
      <div
        style={{
          position: 'absolute', bottom: 0, left: 0, width: '100%',
          willChange: 'transform',
          ...rangeStyle(RANGE_DEPTHS.range1, 20, 30),
        }}
      >
        <svg viewBox="0 0 1920 1080" preserveAspectRatio="none" style={svgStyle} xmlns="http://www.w3.org/2000/svg">
          <path d={range1Path} fill={PINE_DARK} opacity={0.5} />
        </svg>
      </div>

      {/* ─── Range 2: Baekdu Mountain ─── */}
      <div
        style={{
          position: 'absolute', bottom: 0, left: 0, width: '100%',
          willChange: 'transform',
          ...rangeStyle(RANGE_DEPTHS.range2, 15, 25),
        }}
      >
        <svg viewBox="0 0 1920 1080" preserveAspectRatio="none" style={svgStyle} xmlns="http://www.w3.org/2000/svg">
          <defs>
            <radialGradient id="cheonji-gradient" cx="50%" cy="35%" r="55%">
              <stop offset="0%" stopColor="#6DD4C8" stopOpacity={1} />
              <stop offset="40%" stopColor="#4DC4B7" stopOpacity={0.95} />
              <stop offset="100%" stopColor={DANCHEONG_TEAL} stopOpacity={0.85} />
            </radialGradient>
          </defs>
          <path d={baekduPath} fill={DANCHEONG_GREEN} opacity={1} />
          <path d={craterWallPath} fill={PINE_DARK} opacity={0.5} />
          <path d={cheonjiPath} fill="url(#cheonji-gradient)" opacity={0.9} />
          <path d="M 860 575 C 900 572, 950 570, 1000 570 C 1040 570, 1060 572, 1080 575" fill="none" stroke="white" strokeWidth={1.5} opacity={0.22} strokeLinecap="round" />
          <path d="M 890 595 C 920 593, 960 592, 1000 593 C 1030 594, 1040 595, 1040 595" fill="none" stroke="white" strokeWidth={0.8} opacity={0.12} strokeLinecap="round" />
          <path d="M 710 512 C 720 506, 735 503, 755 502" fill="none" stroke="white" strokeWidth={2.5} opacity={0.2} strokeLinecap="round" />
          <path d="M 1165 502 C 1180 503, 1195 506, 1205 512" fill="none" stroke="white" strokeWidth={2.5} opacity={0.2} strokeLinecap="round" />
          <path d="M 670 550 C 685 535, 700 520, 715 510" fill="none" stroke="white" strokeWidth={1.2} opacity={0.1} strokeLinecap="round" />
          <path d="M 1205 510 C 1220 520, 1235 535, 1250 550" fill="none" stroke="white" strokeWidth={1.2} opacity={0.1} strokeLinecap="round" />
          <path d="M 770 520 C 810 560, 860 600, 920 628" fill="none" stroke={HEUK} strokeWidth={1} opacity={0.08} strokeLinecap="round" />
          <path d="M 1000 628 C 1060 600, 1110 560, 1150 520" fill="none" stroke={HEUK} strokeWidth={1} opacity={0.08} strokeLinecap="round" />
        </svg>
      </div>

      {/* ─── Range 3 with pine trees ─── */}
      <div
        style={{
          position: 'absolute', bottom: 0, left: 0, width: '100%',
          willChange: 'transform',
          ...rangeStyle(RANGE_DEPTHS.range3, 10, 20),
        }}
      >
        <svg viewBox="0 0 1920 1080" preserveAspectRatio="none" style={svgStyle} xmlns="http://www.w3.org/2000/svg">
          <path d={range3Path} fill={CHEONG} opacity={0.7} />
          {pines.map((p, i) => (
            <PineTree key={i} x={p.x} y={p.y} height={p.height} />
          ))}
        </svg>
      </div>

      {/* ─── Mist wisps ─── */}
      <div style={rangeStyle(RANGE_DEPTHS.mist, 0, 1)}>
        <svg viewBox="0 0 1920 1080" preserveAspectRatio="none" style={{ ...svgStyle, position: 'absolute', bottom: 0, left: 0 }} xmlns="http://www.w3.org/2000/svg">
          {mistWisps.map((d, i) => (
            <path key={i} d={d} fill="none" stroke="white" strokeWidth={1 + (i % 2)} opacity={0.06} strokeLinecap="round" />
          ))}
        </svg>
      </div>

      {/* ─── Range 4 (nearest) ─── */}
      <div
        style={{
          position: 'absolute', bottom: 0, left: 0, width: '100%',
          willChange: 'transform',
          ...rangeStyle(RANGE_DEPTHS.range4, 5, 15),
        }}
      >
        <svg viewBox="0 0 1920 1080" preserveAspectRatio="none" style={svgStyle} xmlns="http://www.w3.org/2000/svg">
          <path d={range4Path} fill={HEUK} opacity={0.85} />
        </svg>
      </div>
    </div>
  );
};

export default MountainLayer;
