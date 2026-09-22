import React from 'react';
import {
  JEOK,
  HWANG,
  CHEONG,
  WARM_CREAM,
  DANCHEONG_GREEN,
  CORAL_PINK,
} from '../../../theme/colors';

/**
 * DancheongBorder - Ornamental dancheong (단청) frame around the entire viewport.
 *
 * Structure: 4 edge SVGs (top, right, bottom, left) + 4 corner ornaments.
 * Each edge contains 5 nested decorative bands inspired by traditional Korean
 * architectural painting.
 */

const BAND_WIDTHS = [8, 6, 12, 6, 4]; // outer to inner
const TOTAL = BAND_WIDTHS.reduce((a, b) => a + b, 0); // 36

/* ------------------------------------------------------------------ */
/*  SVG pattern definitions (shared across edges)                      */
/* ------------------------------------------------------------------ */

const PatternDefs: React.FC = () => (
  <defs>
    {/* Band 2 - 4-petal flower motif */}
    <pattern
      id="band2-flowers"
      patternUnits="userSpaceOnUse"
      width={12}
      height={12}
    >
      <rect width={12} height={12} fill={DANCHEONG_GREEN} />
      <g transform="translate(6,6)">
        {/* 4 petals at 0, 90, 180, 270 degrees */}
        <ellipse cx={0} cy={-3} rx={1.5} ry={3} fill={HWANG} />
        <ellipse cx={0} cy={3} rx={1.5} ry={3} fill={HWANG} />
        <ellipse cx={-3} cy={0} rx={3} ry={1.5} fill={HWANG} />
        <ellipse cx={3} cy={0} rx={3} ry={1.5} fill={HWANG} />
        {/* center dot */}
        <circle cx={0} cy={0} r={1} fill={WARM_CREAM} />
      </g>
    </pattern>

    {/* Band 3 - Greek-key / meander (머리초) */}
    <pattern
      id="band3-meander"
      patternUnits="userSpaceOnUse"
      width={24}
      height={12}
    >
      <rect width={24} height={12} fill={CHEONG} />
      <path
        d="M 0 6 L 6 6 L 6 0 L 18 0 L 18 6 L 24 6"
        fill="none"
        stroke={HWANG}
        strokeWidth={1.5}
      />
      <path
        d="M 0 6 L 6 6 L 6 12 L 18 12 L 18 6 L 24 6"
        fill="none"
        stroke={WARM_CREAM}
        strokeWidth={0.8}
        opacity={0.4}
      />
    </pattern>

    {/* Band 4 - lotus petal scallop */}
    <pattern
      id="band4-scallop"
      patternUnits="userSpaceOnUse"
      width={14}
      height={6}
    >
      <rect width={14} height={6} fill={JEOK} />
      <path
        d="M 0 6 Q 7 0 14 6"
        fill="none"
        stroke={HWANG}
        strokeWidth={1}
      />
    </pattern>
  </defs>
);

/* ------------------------------------------------------------------ */
/*  Horizontal edge (used for top & bottom)                            */
/* ------------------------------------------------------------------ */

const HorizontalEdge: React.FC<{ flip?: boolean; style?: React.CSSProperties }> = ({
  flip,
  style,
}) => {
  // Bands are drawn from outer edge inward.
  // For top: band1 starts at y=0, band2 at y=8, etc.
  let y = 0;
  const offsets = BAND_WIDTHS.map((w) => {
    const cur = y;
    y += w;
    return cur;
  });

  return (
    <svg
      width="100%"
      height={TOTAL}
      style={{
        display: 'block',
        ...style,
      }}
      preserveAspectRatio="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <PatternDefs />

      {/* If flipped (bottom edge), apply a vertical mirror */}
      <g transform={flip ? `translate(0,${TOTAL}) scale(1,-1)` : undefined}>
        {/* Band 1 - solid JEOK */}
        <rect x={0} y={offsets[0]} width="100%" height={BAND_WIDTHS[0]} fill={JEOK} />

        {/* Band 2 - flower motif */}
        <rect
          x={0}
          y={offsets[1]}
          width="100%"
          height={BAND_WIDTHS[1]}
          fill="url(#band2-flowers)"
        />

        {/* Band 3 - meander */}
        <rect
          x={0}
          y={offsets[2]}
          width="100%"
          height={BAND_WIDTHS[2]}
          fill="url(#band3-meander)"
        />

        {/* Band 4 - scallop */}
        <rect
          x={0}
          y={offsets[3]}
          width="100%"
          height={BAND_WIDTHS[3]}
          fill="url(#band4-scallop)"
        />

        {/* Band 5 - solid HWANG */}
        <rect x={0} y={offsets[4]} width="100%" height={BAND_WIDTHS[4]} fill={HWANG} />
      </g>
    </svg>
  );
};

/* ------------------------------------------------------------------ */
/*  Vertical edge (left / right) - reuses horizontal patterns rotated  */
/* ------------------------------------------------------------------ */

const VerticalEdge: React.FC<{ side: 'left' | 'right'; style?: React.CSSProperties }> = ({
  side,
  style,
}) => {
  // We draw the bands horizontally within the SVG. For a vertical edge the
  // SVG itself is narrow (width=TOTAL) and full viewport-height tall.
  // Band order: outermost = furthest from viewport center.
  // Left edge: band1 at x=0 (left-most).  Right edge: band1 at x=TOTAL-8 (right-most).
  const reverse = side === 'right';

  let x = 0;
  const offsets = BAND_WIDTHS.map((w) => {
    const cur = x;
    x += w;
    return cur;
  });

  return (
    <svg
      width={TOTAL}
      height="100%"
      style={{
        display: 'block',
        ...style,
      }}
      preserveAspectRatio="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Vertical versions of patterns - rotated 90 degrees */}
        <pattern
          id={`band2-flowers-v-${side}`}
          patternUnits="userSpaceOnUse"
          width={12}
          height={12}
        >
          <rect width={12} height={12} fill={DANCHEONG_GREEN} />
          <g transform="translate(6,6)">
            <ellipse cx={0} cy={-3} rx={1.5} ry={3} fill={HWANG} />
            <ellipse cx={0} cy={3} rx={1.5} ry={3} fill={HWANG} />
            <ellipse cx={-3} cy={0} rx={3} ry={1.5} fill={HWANG} />
            <ellipse cx={3} cy={0} rx={3} ry={1.5} fill={HWANG} />
            <circle cx={0} cy={0} r={1} fill={WARM_CREAM} />
          </g>
        </pattern>

        <pattern
          id={`band3-meander-v-${side}`}
          patternUnits="userSpaceOnUse"
          width={12}
          height={24}
        >
          <rect width={12} height={24} fill={CHEONG} />
          <path
            d="M 6 0 L 6 6 L 0 6 L 0 18 L 6 18 L 6 24"
            fill="none"
            stroke={HWANG}
            strokeWidth={1.5}
          />
          <path
            d="M 6 0 L 6 6 L 12 6 L 12 18 L 6 18 L 6 24"
            fill="none"
            stroke={WARM_CREAM}
            strokeWidth={0.8}
            opacity={0.4}
          />
        </pattern>

        <pattern
          id={`band4-scallop-v-${side}`}
          patternUnits="userSpaceOnUse"
          width={6}
          height={14}
        >
          <rect width={6} height={14} fill={JEOK} />
          <path
            d="M 6 0 Q 0 7 6 14"
            fill="none"
            stroke={HWANG}
            strokeWidth={1}
          />
        </pattern>
      </defs>

      <g transform={reverse ? `translate(${TOTAL},0) scale(-1,1)` : undefined}>
        {/* Band 1 - solid JEOK */}
        <rect x={offsets[0]} y={0} width={BAND_WIDTHS[0]} height="100%" fill={JEOK} />

        {/* Band 2 - flower motif */}
        <rect
          x={offsets[1]}
          y={0}
          width={BAND_WIDTHS[1]}
          height="100%"
          fill={`url(#band2-flowers-v-${side})`}
        />

        {/* Band 3 - meander */}
        <rect
          x={offsets[2]}
          y={0}
          width={BAND_WIDTHS[2]}
          height="100%"
          fill={`url(#band3-meander-v-${side})`}
        />

        {/* Band 4 - scallop */}
        <rect
          x={offsets[3]}
          y={0}
          width={BAND_WIDTHS[3]}
          height="100%"
          fill={`url(#band4-scallop-v-${side})`}
        />

        {/* Band 5 - solid HWANG */}
        <rect x={offsets[4]} y={0} width={BAND_WIDTHS[4]} height="100%" fill={HWANG} />
      </g>
    </svg>
  );
};

/* ------------------------------------------------------------------ */
/*  Corner ornament - simplified radial peony                          */
/* ------------------------------------------------------------------ */

interface CornerProps {
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

const CornerOrnament: React.FC<CornerProps> = ({ position }) => {
  // Generate 8 teardrop petals radiating from center
  const cx = TOTAL / 2;
  const cy = TOTAL / 2;

  const petals = Array.from({ length: 8 }, (_, i) => {
    const angle = i * 45;
    const isOuter = i % 2 === 0;
    return (
      <path
        key={i}
        d="M 0 0 Q -4 -8 0 -14 Q 4 -8 0 0"
        fill={isOuter ? JEOK : CORAL_PINK}
        transform={`translate(${cx},${cy}) rotate(${angle})`}
        opacity={isOuter ? 0.9 : 0.7}
      />
    );
  });

  const posStyle: React.CSSProperties = {
    position: 'absolute',
    width: TOTAL,
    height: TOTAL,
    ...(position.includes('top') ? { top: 0 } : { bottom: 0 }),
    ...(position.includes('left') ? { left: 0 } : { right: 0 }),
  };

  return (
    <svg
      width={TOTAL}
      height={TOTAL}
      viewBox={`0 0 ${TOTAL} ${TOTAL}`}
      style={posStyle}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Background fill */}
      <rect width={TOTAL} height={TOTAL} fill={DANCHEONG_GREEN} />

      {/* Outer petals then inner */}
      {petals}

      {/* Center dot */}
      <circle cx={cx} cy={cy} r={3} fill={HWANG} />

      {/* Thin ring */}
      <circle cx={cx} cy={cy} r={5} fill="none" stroke={HWANG} strokeWidth={0.5} opacity={0.6} />
    </svg>
  );
};

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

const DancheongBorder: React.FC = () => {
  return (
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
      {/* ---- Edges ---- */}

      {/* Top edge */}
      <div style={{ position: 'absolute', top: 0, left: TOTAL, right: TOTAL, height: TOTAL }}>
        <HorizontalEdge />
      </div>

      {/* Bottom edge */}
      <div style={{ position: 'absolute', bottom: 0, left: TOTAL, right: TOTAL, height: TOTAL }}>
        <HorizontalEdge flip />
      </div>

      {/* Left edge */}
      <div style={{ position: 'absolute', top: TOTAL, bottom: TOTAL, left: 0, width: TOTAL }}>
        <VerticalEdge side="left" />
      </div>

      {/* Right edge */}
      <div style={{ position: 'absolute', top: TOTAL, bottom: TOTAL, right: 0, width: TOTAL }}>
        <VerticalEdge side="right" />
      </div>

      {/* ---- Corner ornaments ---- */}
      <CornerOrnament position="top-left" />
      <CornerOrnament position="top-right" />
      <CornerOrnament position="bottom-left" />
      <CornerOrnament position="bottom-right" />
    </div>
  );
};

export default DancheongBorder;
