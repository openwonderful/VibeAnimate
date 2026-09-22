import React, { useMemo } from 'react';
import { CONCERT_DARK, CONCERT_CYAN, CONCERT_PURPLE, CONCERT_VIOLET, ARMY_BOMB_PURPLE, ARMY_BOMB_BLUE } from '../../../theme/colors';
import { seededRandom } from '../../../utils/svgHelpers';
import { useBeatSync } from '../../../hooks/useBeatSync';
import { beatBounce } from '../../../utils/animHelpers';

/**
 * StadiumStructure — Roof truss + perspective-correct stadium side walls.
 *
 * The side walls use angled/diagonal tier edges that converge toward the
 * stage (top of screen), creating a 3D bowl effect. Each tier is a
 * trapezoid — wider near the viewer (bottom), compressed near the stage (top).
 *
 * z-index 20
 */

// Railing line = boundary between tiers.
// outerY = y at the screen edge (x=0 for left, x=1920 for right)
// innerX, innerY = the point where this railing meets the bowl's inner edge
// The key to 3D: innerY ≠ outerY — railings slope upward toward center
interface RailingPt {
  outerY: number;
  innerX: number;
  innerY: number;
}

// Left wall railing points, top to bottom.
// Lower tiers extend FURTHER inward (they wrap closer to the field).
// Inner points converge toward the stage (smaller y = further up screen).
const LEFT_RAILS: RailingPt[] = [
  { outerY: 95,  innerX: 110, innerY: 95  },  // top of wall (meets roof)
  { outerY: 200, innerX: 150, innerY: 130 },  // bottom of upper deck (inner: 35px)
  { outerY: 340, innerX: 210, innerY: 180 },  // bottom of club level (inner: 42px)
  { outerY: 530, innerX: 290, innerY: 223 },  // bottom of lower bowl (inner: 50px)
  { outerY: 790, innerX: 380, innerY: 250 },  // bottom of wall (inner: 58px)
];

const RAIL_COLORS = [CONCERT_PURPLE, CONCERT_VIOLET, CONCERT_PURPLE, CONCERT_VIOLET];
const RAIL_OPACITIES = [0.85, 0.75, 0.7, 0.65];
const TIER_DOTS = [80, 100, 130, 160]; // dense crowd dots in all tiers

const StadiumStructure: React.FC = () => {
  const outerArch = 'M 0,90 Q 480,15 960,15 Q 1440,15 1920,90';
  const innerArch = 'M 0,102 Q 480,27 960,27 Q 1440,27 1920,102';
  const braceXPositions = [192, 384, 576, 768, 960, 1152, 1344, 1536, 1728];

  const archY = (x: number, baseY: number, peakY: number): number => {
    const t = x / 1920;
    return (1 - t) * (1 - t) * baseY + 2 * (1 - t) * t * peakY + t * t * baseY;
  };

  // Mirror a left railing point to the right side
  const mirrorRail = (r: RailingPt): RailingPt => ({
    outerY: r.outerY,
    innerX: 1920 - r.innerX,
    innerY: r.innerY,
  });

  const RIGHT_RAILS = LEFT_RAILS.map(mirrorRail);

  const { time, intensity } = useBeatSync();

  // Generate crowd dots within the perspective-correct tier quads (memoized for perf)
  const crowdDots = useMemo(() => {
    const rand = seededRandom(777);
    const dots: { cx: number; cy: number; r: number; opacity: number; color: string; jumpDelay: number }[] = [];

    for (let ti = 0; ti < 4; ti++) {
      const top = LEFT_RAILS[ti];
      const bot = LEFT_RAILS[ti + 1];
      const count = TIER_DOTS[ti];

      // Left side
      for (let d = 0; d < count; d++) {
        const ty = rand();
        const tx = rand();

        const outerY = top.outerY + ty * (bot.outerY - top.outerY);
        const innerY = top.innerY + ty * (bot.innerY - top.innerY);
        const innerX = top.innerX + ty * (bot.innerX - top.innerX);

        const cy = outerY + tx * (innerY - outerY);
        const cx = tx * innerX;

        if (cy < 170 && cx > 120 && cx < 1800) continue;

        const isArmyBomb = rand() < 0.6;
        const color = isArmyBomb ? (rand() < 0.5 ? ARMY_BOMB_PURPLE : ARMY_BOMB_BLUE) : '#8888CC';
        const opacity = isArmyBomb ? 0.6 + rand() * 0.35 : 0.3 + rand() * 0.35;
        const dist = Math.sqrt((cx - 960) ** 2 + (cy - 200) ** 2);
        dots.push({ cx, cy, r: 1.5 + rand() * 2.5, opacity, color, jumpDelay: (dist / 1000) * 0.5 });
      }

      // Right side
      const rTop = RIGHT_RAILS[ti];
      const rBot = RIGHT_RAILS[ti + 1];
      for (let d = 0; d < count; d++) {
        const ty = rand();
        const tx = rand();

        const outerY = rTop.outerY + ty * (rBot.outerY - rTop.outerY);
        const innerY = rTop.innerY + ty * (rBot.innerY - rTop.innerY);
        const innerX = rTop.innerX + ty * (rBot.innerX - rTop.innerX);

        const cy = outerY + tx * (innerY - outerY);
        const cx = 1920 - tx * (1920 - innerX);

        if (cy < 170 && cx > 120 && cx < 1800) continue;

        const isArmyBomb = rand() < 0.6;
        const color = isArmyBomb ? (rand() < 0.5 ? ARMY_BOMB_PURPLE : ARMY_BOMB_BLUE) : '#8888CC';
        const opacity = isArmyBomb ? 0.6 + rand() * 0.35 : 0.3 + rand() * 0.35;
        const dist = Math.sqrt((cx - 960) ** 2 + (cy - 200) ** 2);
        dots.push({ cx, cy, r: 1.5 + rand() * 2.5, opacity, color, jumpDelay: (dist / 1000) * 0.5 });
      }
    }
    return dots;
  }, []);

  // Build tier quad path for one side
  const tierPath = (topR: RailingPt, botR: RailingPt, side: 'left' | 'right') => {
    if (side === 'left') {
      return `M 0,${topR.outerY} L ${topR.innerX},${topR.innerY}
              L ${botR.innerX},${botR.innerY} L 0,${botR.outerY} Z`;
    }
    return `M 1920,${topR.outerY} L ${topR.innerX},${topR.innerY}
            L ${botR.innerX},${botR.innerY} L 1920,${botR.outerY} Z`;
  };

  return (
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
      <defs>
        <linearGradient id="under-roof-glow" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={CONCERT_CYAN} stopOpacity={0} />
          <stop offset="30%" stopColor={CONCERT_CYAN} stopOpacity={0.08} />
          <stop offset="50%" stopColor={CONCERT_CYAN} stopOpacity={0.1} />
          <stop offset="70%" stopColor={CONCERT_CYAN} stopOpacity={0.08} />
          <stop offset="100%" stopColor={CONCERT_CYAN} stopOpacity={0} />
        </linearGradient>

        <filter id="railing-glow">
          <feGaussianBlur stdDeviation="4" />
        </filter>

        {/* Tier fills — lighter near inner (bowl) edge */}
        <linearGradient id="tier-fill-left" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#1E1E40" stopOpacity={0.95} />
          <stop offset="60%" stopColor="#282858" stopOpacity={1} />
          <stop offset="100%" stopColor="#353568" stopOpacity={0.6} />
        </linearGradient>
        <linearGradient id="tier-fill-right" x1="1" y1="0" x2="0" y2="0">
          <stop offset="0%" stopColor="#1E1E40" stopOpacity={0.95} />
          <stop offset="60%" stopColor="#282858" stopOpacity={1} />
          <stop offset="100%" stopColor="#353568" stopOpacity={0.6} />
        </linearGradient>

        {/* Purple wash */}
        <linearGradient id="tier-wash-left" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={CONCERT_PURPLE} stopOpacity={0.08} />
          <stop offset="100%" stopColor={CONCERT_PURPLE} stopOpacity={0.2} />
        </linearGradient>
        <linearGradient id="tier-wash-right" x1="1" y1="0" x2="0" y2="0">
          <stop offset="0%" stopColor={CONCERT_PURPLE} stopOpacity={0.08} />
          <stop offset="100%" stopColor={CONCERT_PURPLE} stopOpacity={0.2} />
        </linearGradient>
      </defs>

      {/* Sky/roof fill */}
      <path d={`${outerArch} L 1920,0 L 0,0 Z`} fill={CONCERT_DARK} />

      {/* Roof truss */}
      <path d={outerArch} fill="none" stroke="#2A3040" strokeWidth={2} opacity={0.7} />
      <path d={innerArch} fill="none" stroke="#2A3040" strokeWidth={1.5} opacity={0.5} />

      {/* Cross-braces */}
      {braceXPositions.map((x, i) => {
        const oy = archY(x, 90, 15);
        const iy = archY(x, 102, 27);
        const nx = braceXPositions[i + 1] ?? x + 192;
        const noy = archY(nx, 90, 15);
        const niy = archY(nx, 102, 27);
        return (
          <g key={`brace-${i}`}>
            <line x1={x} y1={oy} x2={nx} y2={niy} stroke="#2A3040" strokeWidth={1} opacity={0.5} />
            {i < braceXPositions.length - 1 && (
              <line x1={x} y1={iy} x2={nx} y2={noy} stroke="#2A3040" strokeWidth={1} opacity={0.5} />
            )}
          </g>
        );
      })}

      <rect x={0} y={85} width={1920} height={20} fill="url(#under-roof-glow)" />

      {/* ══════════ Perspective stadium side walls ══════════ */}
      {[0, 1, 2, 3].map((ti) => {
        const lTop = LEFT_RAILS[ti];
        const lBot = LEFT_RAILS[ti + 1];
        const rTop = RIGHT_RAILS[ti];
        const rBot = RIGHT_RAILS[ti + 1];

        const railColor = RAIL_COLORS[ti];
        const railOpacity = RAIL_OPACITIES[ti];

        return (
          <g key={`tier-${ti}`}>
            {/* ── Left tier ── */}
            <path d={tierPath(lTop, lBot, 'left')} fill="url(#tier-fill-left)" />
            <path d={tierPath(lTop, lBot, 'left')} fill="url(#tier-wash-left)" />

            {/* Left railing (bottom edge of this tier) — ANGLED line */}
            <line
              x1={0} y1={lBot.outerY}
              x2={lBot.innerX} y2={lBot.innerY}
              stroke={railColor} strokeWidth={3} opacity={railOpacity}
            />
            <line
              x1={0} y1={lBot.outerY}
              x2={lBot.innerX} y2={lBot.innerY}
              stroke={railColor} strokeWidth={10} opacity={railOpacity * 0.4}
              filter="url(#railing-glow)"
            />

            {/* Left top edge */}
            <line
              x1={0} y1={lTop.outerY}
              x2={lTop.innerX} y2={lTop.innerY}
              stroke="#4A4A6A" strokeWidth={1} opacity={0.35}
            />

            {/* Left section dividers (vertical-ish lines within tier) */}
            {[0.3, 0.6].map((frac, si) => {
              const topY = lTop.outerY + frac * (lTop.innerY - lTop.outerY);
              const topX = frac * lTop.innerX;
              const botY = lBot.outerY + frac * (lBot.innerY - lBot.outerY);
              const botX = frac * lBot.innerX;
              return (
                <line
                  key={`lsec-${ti}-${si}`}
                  x1={topX} y1={topY}
                  x2={botX} y2={botY}
                  stroke="#3A3A55" strokeWidth={0.8} opacity={0.3}
                />
              );
            })}

            {/* ── Right tier ── */}
            <path d={tierPath(rTop, rBot, 'right')} fill="url(#tier-fill-right)" />
            <path d={tierPath(rTop, rBot, 'right')} fill="url(#tier-wash-right)" />

            {/* Right railing — ANGLED line */}
            <line
              x1={1920} y1={rBot.outerY}
              x2={rBot.innerX} y2={rBot.innerY}
              stroke={railColor} strokeWidth={3} opacity={railOpacity}
            />
            <line
              x1={1920} y1={rBot.outerY}
              x2={rBot.innerX} y2={rBot.innerY}
              stroke={railColor} strokeWidth={10} opacity={railOpacity * 0.4}
              filter="url(#railing-glow)"
            />

            {/* Right top edge */}
            <line
              x1={1920} y1={rTop.outerY}
              x2={rTop.innerX} y2={rTop.innerY}
              stroke="#4A4A6A" strokeWidth={1} opacity={0.35}
            />

            {/* Right section dividers */}
            {[0.3, 0.6].map((frac, si) => {
              const topY = rTop.outerY + frac * (rTop.innerY - rTop.outerY);
              const topX = 1920 - frac * (1920 - rTop.innerX);
              const botY = rBot.outerY + frac * (rBot.innerY - rBot.outerY);
              const botX = 1920 - frac * (1920 - rBot.innerX);
              return (
                <line
                  key={`rsec-${ti}-${si}`}
                  x1={topX} y1={topY}
                  x2={botX} y2={botY}
                  stroke="#3A3A55" strokeWidth={0.8} opacity={0.3}
                />
              );
            })}
          </g>
        );
      })}

      {/* Concourse lights between tiers */}
      {[1, 2, 3].map((ri) => {
        const lr = LEFT_RAILS[ri];
        const rr = RIGHT_RAILS[ri];
        return (
          <g key={`concourse-${ri}`}>
            <line x1={0} y1={lr.outerY + 4} x2={lr.innerX} y2={lr.innerY + 4}
              stroke={CONCERT_CYAN} strokeWidth={1.2} opacity={0.15} />
            <line x1={1920} y1={rr.outerY + 4} x2={rr.innerX} y2={rr.innerY + 4}
              stroke={CONCERT_CYAN} strokeWidth={1.2} opacity={0.15} />
          </g>
        );
      })}

      {/* Crowd + ARMY bomb dots — bounce at 120 BPM, amplitude scales with intensity */}
      {crowdDots.map((dot, i) => {
        const bounceY = beatBounce(time, 120, 4 * intensity, dot.jumpDelay);
        return (
          <circle
            key={`cdot-${i}`}
            cx={dot.cx} cy={dot.cy + bounceY} r={dot.r}
            fill={dot.color} opacity={dot.opacity}
          />
        );
      })}

      {/* Inner bowl edge highlight (continuous diagonal line) */}
      <path
        d={`M ${LEFT_RAILS[0].innerX},${LEFT_RAILS[0].innerY}
            L ${LEFT_RAILS[1].innerX},${LEFT_RAILS[1].innerY}
            L ${LEFT_RAILS[2].innerX},${LEFT_RAILS[2].innerY}
            L ${LEFT_RAILS[3].innerX},${LEFT_RAILS[3].innerY}
            L ${LEFT_RAILS[4].innerX},${LEFT_RAILS[4].innerY}`}
        fill="none" stroke={CONCERT_PURPLE} strokeWidth={2} opacity={0.25}
      />
      <path
        d={`M ${RIGHT_RAILS[0].innerX},${RIGHT_RAILS[0].innerY}
            L ${RIGHT_RAILS[1].innerX},${RIGHT_RAILS[1].innerY}
            L ${RIGHT_RAILS[2].innerX},${RIGHT_RAILS[2].innerY}
            L ${RIGHT_RAILS[3].innerX},${RIGHT_RAILS[3].innerY}
            L ${RIGHT_RAILS[4].innerX},${RIGHT_RAILS[4].innerY}`}
        fill="none" stroke={CONCERT_PURPLE} strokeWidth={2} opacity={0.25}
      />
    </svg>
  );
};

export default StadiumStructure;
