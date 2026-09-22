import React from 'react';
import { HWANG, WARM_CREAM } from '../../../theme/colors';
import { useAnimTime, loopPhase, cosWave, lerp } from '../../../hooks/useAnimTime';

/**
 * TitleTreatment - The main "Body to Body" title with shimmer gradient,
 * glowing drop-shadow animation, and decorative divider.
 *
 * Uses Playfair Display serif font, rendered as HTML text with
 * gradient background-clip for a gold shimmer effect.
 */

const TitleTreatment: React.FC = () => {
  const t = useAnimTime();

  // title-shimmer: background-position -200% → 200% over 5s linear
  const shimmerP = loopPhase(t, 5);
  const shimmerPos = lerp(-200, 200, shimmerP);

  // title-glow: drop-shadow 8px 0.3 → 20px 0.6 → 8px 0.3 over 4s ease-in-out
  const glowP = loopPhase(t, 4);
  const glowMix = (cosWave(glowP) + 1) / 2; // 1 → 0 → 1 ease-like
  const blur = lerp(20, 8, glowMix);
  const alpha = lerp(0.6, 0.3, glowMix);

  const titleStyle: React.CSSProperties = {
    fontFamily: "'Playfair Display', serif",
    fontWeight: 900,
    fontSize: '5.5vw',
    lineHeight: 1.1,
    background: `linear-gradient(135deg, ${HWANG}, ${WARM_CREAM}, ${HWANG}, ${WARM_CREAM})`,
    backgroundSize: '400% 100%',
    WebkitBackgroundClip: 'text',
    backgroundClip: 'text',
    color: 'transparent',
    backgroundPosition: `${shimmerPos}% center`,
    textShadow: `0 2px 20px rgba(212,168,67,0.4)`,
    letterSpacing: '0.04em',
    margin: 0,
    padding: 0,
    position: 'relative',
    userSelect: 'none',
  };

  const shadowStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    fontFamily: "'Playfair Display', serif",
    fontWeight: 900,
    fontSize: '5.5vw',
    lineHeight: 1.1,
    letterSpacing: '0.04em',
    color: `rgba(26,26,26,0.3)`,
    transform: 'translate(2px, 3px)',
    filter: 'blur(2px)',
    pointerEvents: 'none',
    userSelect: 'none',
    whiteSpace: 'nowrap',
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: '16%',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 80,
        pointerEvents: 'none',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        filter: `drop-shadow(0 0 ${blur}px rgba(212, 168, 67, ${alpha}))`,
      }}
      aria-hidden="true"
    >
      {/* Shadow layer */}
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <span style={shadowStyle}>Body to Body</span>
        <span style={titleStyle}>Body to Body</span>
      </div>

      {/* Decorative divider */}
      <svg
        width="200"
        height="14"
        viewBox="0 0 200 14"
        style={{ marginTop: '0.8vw' }}
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Left line */}
        <line
          x1={10}
          y1={7}
          x2={90}
          y2={7}
          stroke={HWANG}
          strokeWidth={1}
          opacity={0.5}
        />
        {/* Right line */}
        <line
          x1={110}
          y1={7}
          x2={190}
          y2={7}
          stroke={HWANG}
          strokeWidth={1}
          opacity={0.5}
        />

        {/* Center diamond */}
        <rect
          x={96}
          y={3}
          width={8}
          height={8}
          fill={HWANG}
          transform="rotate(45, 100, 7)"
        />

        {/* Left end dot */}
        <circle cx={10} cy={7} r={1.5} fill={HWANG} opacity={0.6} />
        {/* Right end dot */}
        <circle cx={190} cy={7} r={1.5} fill={HWANG} opacity={0.6} />

        {/* Additional small dots for extra detail */}
        <circle cx={30} cy={7} r={0.8} fill={HWANG} opacity={0.3} />
        <circle cx={170} cy={7} r={0.8} fill={HWANG} opacity={0.3} />
      </svg>
    </div>
  );
};

export default TitleTreatment;
