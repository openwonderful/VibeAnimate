import React from 'react';
import { HWANG, WARM_CREAM } from '../../../theme/colors';
import { useAnimTime, loopPhase, cosWave, lerp } from '../../../hooks/useAnimTime';

/**
 * MoonOrb — A luminous, gently floating moon rendered entirely in SVG.
 *
 * Positioned in the upper-right quadrant of the viewport (~72 % left,
 * ~12 % top).  Multiple concentric glow layers, a radial-gradient body,
 * faint crater details, and a specular highlight combine to produce a
 * painterly full moon reminiscent of Joseon-era ink-wash landscapes.
 *
 * z-index 20.
 */

/** Small crater-like surface markings. */
const CRATERS: { cx: number; cy: number; r: number; opacity: number }[] = [
  { cx: -14, cy: -12, r: 9,  opacity: 0.08 },
  { cx: 18,  cy: 6,   r: 12, opacity: 0.1  },
  { cx: -6,  cy: 22,  r: 7,  opacity: 0.09 },
  { cx: 26,  cy: -18, r: 6,  opacity: 0.12 },
];

const MoonOrb: React.FC = () => {
  const t = useAnimTime();
  /* Centre of the moon within the local SVG coordinate system.
     The SVG itself is placed via CSS at ~72 % left / ~12 % top. */
  const cx = 140;
  const cy = 140;

  // float-gentle: translateY(0 → -8 → 0) over 8s ease-in-out
  const floatY = lerp(0, -8, (1 - cosWave(loopPhase(t, 8))) / 2);
  // pulse-glow:     scale(1 → 1.15 → 1) + opacity(0.3 → 0.5 → 0.3) over 6s
  const glowP = (1 - cosWave(loopPhase(t, 6))) / 2;
  const glowScale = lerp(1, 1.15, glowP);
  const glowOpacity = lerp(0.3, 0.5, glowP);
  // pulse-glow-alt: scale(1.05 → 1.2 → 1.05) + opacity(0.25 → 0.45 → 0.25) over 8s
  const altP = (1 - cosWave(loopPhase(t, 8))) / 2;
  const altScale = lerp(1.05, 1.2, altP);
  const altOpacity = lerp(0.25, 0.45, altP);

  return (
    <svg
      width={280}
      height={280}
      viewBox="0 0 280 280"
      style={{
        position: 'absolute',
        left: 'calc(72% - 140px)',
        top: 'calc(12% - 140px)',
        zIndex: 20,
        pointerEvents: 'none',
        overflow: 'visible',
      }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* ── Outermost glow gradient ──────────────────────────── */}
        <radialGradient id="moon-outer-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor={HWANG} stopOpacity={0.15} />
          <stop offset="50%"  stopColor={HWANG} stopOpacity={0.07} />
          <stop offset="100%" stopColor={HWANG} stopOpacity={0} />
        </radialGradient>

        {/* ── Secondary glow gradient ─────────────────────────── */}
        <radialGradient id="moon-secondary-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor={HWANG} stopOpacity={0.2} />
          <stop offset="60%"  stopColor={HWANG} stopOpacity={0.08} />
          <stop offset="100%" stopColor={HWANG} stopOpacity={0} />
        </radialGradient>

        {/* ── Moon body gradient ──────────────────────────────── */}
        <radialGradient id="moon-body" cx="42%" cy="38%" r="55%">
          <stop offset="0%"   stopColor={WARM_CREAM} stopOpacity={1} />
          <stop offset="55%"  stopColor={WARM_CREAM} stopOpacity={0.95} />
          <stop offset="85%"  stopColor={HWANG}      stopOpacity={0.85} />
          <stop offset="100%" stopColor={HWANG}      stopOpacity={0.7} />
        </radialGradient>

        {/* ── Highlight (specular) gradient ───────────────────── */}
        <radialGradient id="moon-highlight" cx="35%" cy="30%" r="45%">
          <stop offset="0%"  stopColor="#FFFFFF" stopOpacity={0.3} />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity={0} />
        </radialGradient>

        {/* ── Crater shading gradient ────────────────────────── */}
        <radialGradient id="crater-shade" cx="40%" cy="40%" r="55%">
          <stop offset="0%"  stopColor="#B8944A" stopOpacity={0.5} />
          <stop offset="100%" stopColor="#B8944A" stopOpacity={0} />
        </radialGradient>
      </defs>

      {/* Entire moon group floats gently */}
      <g style={{ transform: `translateY(${floatY}px)` }}>
        {/* ── 1. Outermost glow ────────────────────────────────── */}
        <circle
          cx={cx}
          cy={cy}
          r={120}
          fill="url(#moon-outer-glow)"
          style={{
            transform: `scale(${glowScale})`,
            transformOrigin: `${cx}px ${cy}px`,
            opacity: glowOpacity,
          }}
        />

        {/* ── 2. Secondary glow ────────────────────────────────── */}
        <circle
          cx={cx}
          cy={cy}
          r={90}
          fill="url(#moon-secondary-glow)"
          style={{
            transform: `scale(${altScale})`,
            transformOrigin: `${cx}px ${cy}px`,
            opacity: altOpacity,
          }}
        />

        {/* ── 3. Halo ring ─────────────────────────────────────── */}
        <circle
          cx={cx}
          cy={cy}
          r={72}
          fill="none"
          stroke={HWANG}
          strokeWidth={1}
          opacity={0.25}
        />
        {/* Secondary thinner halo for depth */}
        <circle
          cx={cx}
          cy={cy}
          r={65}
          fill="none"
          stroke={HWANG}
          strokeWidth={0.4}
          opacity={0.12}
        />

        {/* ── 4. Moon body ─────────────────────────────────────── */}
        <circle
          cx={cx}
          cy={cy}
          r={55}
          fill="url(#moon-body)"
        />

        {/* ── 5. Surface details (craters) ─────────────────────── */}
        {CRATERS.map((c, i) => (
          <circle
            key={`crater-${i}`}
            cx={cx + c.cx}
            cy={cy + c.cy}
            r={c.r}
            fill="url(#crater-shade)"
            opacity={c.opacity}
          />
        ))}

        {/* Extra subtle mare (dark sea) patch */}
        <ellipse
          cx={cx + 8}
          cy={cy + 4}
          rx={22}
          ry={16}
          fill="#B8944A"
          opacity={0.04}
          transform={`rotate(-15 ${cx + 8} ${cy + 4})`}
        />

        {/* ── 6. Bright specular highlight ─────────────────────── */}
        <circle
          cx={cx - 18}
          cy={cy - 18}
          r={8}
          fill="#FFFFFF"
          opacity={0.3}
        />
        {/* Smaller secondary highlight */}
        <circle
          cx={cx - 24}
          cy={cy - 10}
          r={4}
          fill="#FFFFFF"
          opacity={0.15}
        />

        {/* Full-disc highlight gradient overlay */}
        <circle
          cx={cx}
          cy={cy}
          r={55}
          fill="url(#moon-highlight)"
        />
      </g>
    </svg>
  );
};

export default MoonOrb;
