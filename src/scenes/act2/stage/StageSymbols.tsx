import React from 'react';
import { ARIRANG_RED } from '../../../theme/colors';

/**
 * StageSymbols — Three stylized Arirang (아리랑) title symbols at the top
 * of the LED wall. Each symbol represents a Korean syllable rendered as a
 * geometric shape with cutouts, glowing vivid red with translucency.
 *
 * 아 (a) = ring/donut (ㅇ)
 * 리 (ri) = circle with 2 curved horizontal bars
 * 랑 (rang) = circle with 2 curved horizontal bars + vertical bar in middle only
 *
 * All symbols have radial edge fade (bright center → transparent edges).
 * Horizontal bars have a subtle S-curve (up on left, down on right).
 *
 * z-index 16.
 */

export type SymbolVariant = 'ring' | 'barred-circle' | 'grid-circle';

export interface SymbolConfig {
  cx: number;
  cy: number;
  size: number;
  variant: SymbolVariant;
  /** Bar/gap thickness as fraction of diameter (0–1). Default 0.14 */
  gapRatio?: number;
  /** Number of horizontal bars. Default 2 */
  barCount?: number;
  /** Inner hole radius as fraction of outer, for ring. Default 0.35 */
  holeRatio?: number;
  /** Vertical bar position as fraction from left (0–1), for grid-circle. Default 0.62 */
  verticalBarPos?: number;
  /** S-curve amount in px for bar curvature. Default 3 */
  curveAmount?: number;
}

export interface StageSymbolsProps {
  symbols?: SymbolConfig[];
  color?: string;
  opacity?: number;
  glowBlur?: number;
  pulseDuration?: number;
  /** Seconds subtracted from the pulse's animation-delay (i.e. a negative
   *  CSS delay), so scenes at different local clocks can share one absolute
   *  cycle phase — used to keep the 2.1-zoom → 2.2 cut seamless. */
  delayOffset?: number;
}

// ── Default symbol arrangement ─────────────────────────────────────

const DEFAULT_SYMBOLS: SymbolConfig[] = [
  {
    cx: 850,
    cy: 50,
    size: 38,
    variant: 'ring',
    holeRatio: 0.54,
  },
  {
    cx: 960,
    cy: 50,
    size: 38,
    variant: 'barred-circle',
    barCount: 2,
    gapRatio: 0.13,
    curveAmount: 5,
  },
  {
    cx: 1070,
    cy: 50,
    size: 38,
    variant: 'grid-circle',
    barCount: 2,
    gapRatio: 0.13,
    verticalBarPos: 0.50,
    curveAmount: 5,
  },
];

// ── Helpers ────────────────────────────────────────────────────────

/**
 * Generate an SVG path for a bar cutout with asymmetric edges.
 * curveTop/curveBot: 0 = straight edge, >0 = curved tippy.
 * curveSideTop/curveSideBot: which side gets the crescent ('left' or 'right').
 */
function barCutoutPath(
  left: number,
  right: number,
  barY: number,
  gapH: number,
  curveTop: number,
  curveBot: number,
  curveSideTop: 'left' | 'right' = 'right',
  curveSideBot: 'left' | 'right' = 'left',
): string {
  const w = right - left;
  const slopeFrac = 0.35; // wider transition for gentle slope
  const tL = left + w * slopeFrac;
  const tR = right - w * slopeFrac;

  const parts: string[] = [];

  // ── Top edge ──
  if (curveTop > 0) {
    if (curveSideTop === 'right') {
      // Right side slopes down gently, left stays straight
      const topR = barY + curveTop;
      parts.push(
        `M ${left} ${barY}`,
        `L ${tR} ${barY}`,
        `C ${tR + w * 0.15} ${barY}, ${right - w * 0.08} ${topR * 0.6 + barY * 0.4}, ${right} ${topR}`,
      );
    } else {
      // Left side slopes down gently, right stays straight
      const topL = barY + curveTop;
      parts.push(
        `M ${left} ${topL}`,
        `C ${left + w * 0.08} ${topL * 0.4 + barY * 0.6}, ${tL - w * 0.15} ${barY}, ${tL} ${barY}`,
        `L ${right} ${barY}`,
      );
    }
  } else {
    parts.push(`M ${left} ${barY}`, `L ${right} ${barY}`);
  }

  // ── Bottom edge (drawn right-to-left) ──
  if (curveBot > 0) {
    if (curveSideBot === 'left') {
      // Left side slopes up gently, right stays straight
      const botL = barY + gapH - curveBot;
      parts.push(
        `L ${right} ${barY + gapH}`,
        `L ${tL} ${barY + gapH}`,
        `C ${tL - w * 0.15} ${barY + gapH}, ${left + w * 0.08} ${botL * 0.6 + (barY + gapH) * 0.4}, ${left} ${botL}`,
      );
    } else {
      // Right side slopes up gently, left stays straight
      const botR = barY + gapH - curveBot;
      parts.push(
        `L ${right} ${botR}`,
        `C ${right - w * 0.08} ${botR * 0.4 + (barY + gapH) * 0.6}, ${tR + w * 0.15} ${barY + gapH}, ${tR} ${barY + gapH}`,
        `L ${left} ${barY + gapH}`,
      );
    }
  } else {
    parts.push(`L ${right} ${barY + gapH}`, `L ${left} ${barY + gapH}`);
  }

  parts.push('Z');
  return parts.join(' ');
}

/** Compute bar positions for a circle divided into (barCount+1) sections */
function barPositions(cy: number, size: number, barCount: number, gapRatio: number) {
  const gapH = size * 2 * gapRatio;
  const totalGapSpace = barCount * gapH;
  const sectionH = (size * 2 - totalGapSpace) / (barCount + 1);
  const bars: { y: number; h: number }[] = [];
  for (let i = 0; i < barCount; i++) {
    bars.push({
      y: cy - size + sectionH * (i + 1) + gapH * i,
      h: gapH,
    });
  }
  return { bars, sectionH, gapH };
}

// ── Shape renderers ────────────────────────────────────────────────

/** 아 — Circle with a centered circular hole (donut/ring for ㅇ) */
function renderRing(
  cfg: SymbolConfig,
  gradId: string,
  maskId: string,
) {
  const { cx, cy, size } = cfg;
  const innerR = size * (cfg.holeRatio ?? 0.35);

  return (
    <g key={maskId}>
      <mask id={maskId}>
        <circle cx={cx} cy={cy} r={size + 1} fill="white" />
        <circle cx={cx} cy={cy} r={innerR} fill="black" />
      </mask>
      <circle
        cx={cx}
        cy={cy}
        r={size}
        fill={`url(#${gradId})`}
        mask={`url(#${maskId})`}
      />
    </g>
  );
}

/** 리 — Circle with 2 horizontal bars: curved outer edges, straight inner edges */
function renderBarredCircle(
  cfg: SymbolConfig,
  gradId: string,
  maskId: string,
) {
  const { cx, cy, size } = cfg;
  const barCount = cfg.barCount ?? 2;
  const gapRatio = cfg.gapRatio ?? 0.13;
  const curve = cfg.curveAmount ?? 3;
  const { bars } = barPositions(cy, size, barCount, gapRatio);
  const left = cx - size - 2;
  const right = cx + size + 2;

  return (
    <g key={maskId}>
      <mask id={maskId}>
        <rect
          x={left}
          y={cy - size - 2}
          width={size * 2 + 4}
          height={size * 2 + 4}
          fill="white"
        />
        {bars.map((bar, i) => {
          // Bar 0 (top bar): curved top edge (tippy on top section), straight bottom
          // Bar 1 (bottom bar): straight top, curved bottom edge (tippy on bottom section)
          const cTop = i === 0 ? curve : 0;
          const cBot = i === barCount - 1 ? curve : 0;
          return (
            <path
              key={i}
              d={barCutoutPath(left, right, bar.y, bar.h, cTop, cBot)}
              fill="black"
            />
          );
        })}
      </mask>
      <circle
        cx={cx}
        cy={cy}
        r={size}
        fill={`url(#${gradId})`}
        mask={`url(#${maskId})`}
      />
    </g>
  );
}

/** 랑 — Circle with 2 curved horizontal bars + vertical bar in middle section only */
function renderGridCircle(
  cfg: SymbolConfig,
  gradId: string,
  maskId: string,
) {
  const { cx, cy, size } = cfg;
  const barCount = cfg.barCount ?? 2;
  const gapRatio = cfg.gapRatio ?? 0.13;
  const curve = cfg.curveAmount ?? 3;
  const { bars, gapH } = barPositions(cy, size, barCount, gapRatio);
  const left = cx - size - 2;
  const right = cx + size + 2;

  // Vertical bar dimensions — only spans the middle section
  const gapW = gapH;
  const vBarPos = cfg.verticalBarPos ?? 0.62;
  const vBarX = cx - size + size * 2 * vBarPos - gapW / 2;

  // Middle section Y range: from bottom of first bar to top of second bar
  // Account for the curve: use nominal positions (center of the S-curve)
  const middleTop = bars[0].y + bars[0].h;
  const middleBottom = bars.length > 1 ? bars[1].y : middleTop;

  return (
    <g key={maskId}>
      <mask id={maskId}>
        <rect
          x={left}
          y={cy - size - 2}
          width={size * 2 + 4}
          height={size * 2 + 4}
          fill="white"
        />
        {/* Horizontal bar cutouts — asymmetric edges */}
        {bars.map((bar, i) => {
          const cTop = i === 0 ? curve : 0;
          const cBot = i === barCount - 1 ? curve : 0;
          return (
            <path
              key={`h-${i}`}
              d={barCutoutPath(left, right, bar.y, bar.h, cTop, cBot)}
              fill="black"
            />
          );
        })}
        {/* Vertical bar — middle section only */}
        <rect
          x={vBarX}
          y={middleTop}
          width={gapW}
          height={middleBottom - middleTop}
          fill="black"
        />
      </mask>
      <circle
        cx={cx}
        cy={cy}
        r={size}
        fill={`url(#${gradId})`}
        mask={`url(#${maskId})`}
      />
    </g>
  );
}

// ── Main component ─────────────────────────────────────────────────

const StageSymbols: React.FC<StageSymbolsProps> = ({
  symbols = DEFAULT_SYMBOLS,
  color = ARIRANG_RED,
  opacity = 0.85,
  glowBlur = 8,
  pulseDuration = 3,
  delayOffset = 0,
}) => {
  const filterId = 'stage-symbol-glow';

  return (
    <svg
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 16,
        pointerEvents: 'none',
      }}
      viewBox="0 0 1920 1080"
      preserveAspectRatio="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Per-symbol radial gradient: bright center → transparent edges */}
        {symbols.map((cfg, i) => (
          <radialGradient
            key={`grad-${i}`}
            id={`symbol-radial-${i}`}
            cx={cfg.cx}
            cy={cfg.cy}
            r={cfg.size}
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor={color} stopOpacity={0.4} />
            <stop offset="70%" stopColor={color} stopOpacity={0.65} />
            <stop offset="90%" stopColor={color} stopOpacity={0.9} />
            <stop offset="100%" stopColor={color} stopOpacity={1} />
          </radialGradient>
        ))}

        {/* Glow filter */}
        {glowBlur > 0 && (
          <filter id={filterId} x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur in="SourceGraphic" stdDeviation={glowBlur} result="blur" />
            <feColorMatrix
              in="blur"
              type="matrix"
              values="1 0 0 0 0  0 0.12 0 0 0  0 0 0.08 0 0  0 0 0 0.4 0"
              result="redBlur"
            />
            <feMerge>
              <feMergeNode in="redBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        )}
      </defs>

      <g
        opacity={opacity}
        filter={glowBlur > 0 ? `url(#${filterId})` : undefined}
        style={
          pulseDuration > 0
            ? {
                animationName: 'led-panel-pulse',
                animationDuration: `${pulseDuration}s`,
                animationTimingFunction: 'ease-in-out',
                animationIterationCount: 'infinite',
                animationDelay: `${-delayOffset}s`,
              }
            : undefined
        }
      >
        {symbols.map((cfg, i) => {
          const maskId = `symbol-mask-${i}`;
          const gradId = `symbol-radial-${i}`;
          switch (cfg.variant) {
            case 'ring':
              return renderRing(cfg, gradId, maskId);
            case 'barred-circle':
              return renderBarredCircle(cfg, gradId, maskId);
            case 'grid-circle':
              return renderGridCircle(cfg, gradId, maskId);
          }
        })}
      </g>
    </svg>
  );
};

export default StageSymbols;
