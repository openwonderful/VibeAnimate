import React from 'react';
import {
  CONCERT_PURPLE,
  CONCERT_MAGENTA,
  CONCERT_BLUE,
  CONCERT_WHITE,
} from '../../../theme/colors';
import { useAnimTime } from '../../../hooks/useAnimTime';
import { linearLoop } from '../../../utils/animHelpers';

/**
 * StadiumLighting — Atmospheric colour-wash, stage glow, lens flares,
 * and haze bands. The purple/blue wash creates the signature BTS
 * concert atmosphere.
 *
 * z-index 65.
 */

const StadiumLighting: React.FC = () => {
  const time = useAnimTime();

  // Map linearLoop 0→1 to background-position: 0%→100%→0% (triangle wave)
  const t = linearLoop(time, 12);
  const bgPos = t < 0.5 ? t * 2 * 100 : (1 - (t - 0.5) * 2) * 100;

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 65,
        pointerEvents: 'none',
      }}
    >
      {/* ── Strong purple/blue colour wash ───────────────────────── */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: `linear-gradient(90deg, ${CONCERT_PURPLE}, ${CONCERT_MAGENTA}, ${CONCERT_BLUE}, ${CONCERT_PURPLE})`,
          backgroundSize: '400% 100%',
          backgroundPosition: `${bgPos}% 50%`,
          opacity: 0.15,
          mixBlendMode: 'screen',
          pointerEvents: 'none',
        }}
      />

      {/* ── SVG effects layer ────────────────────────────────────── */}
      <svg
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
        viewBox="0 0 1920 1080"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <radialGradient id="lens-flare-grad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={CONCERT_WHITE} stopOpacity={0.15} />
            <stop offset="100%" stopColor={CONCERT_WHITE} stopOpacity={0} />
          </radialGradient>

          {/* Large purple atmospheric glow over crowd */}
          <radialGradient id="crowd-purple-wash" cx="50%" cy="35%" r="60%">
            <stop offset="0%" stopColor={CONCERT_PURPLE} stopOpacity={0.2} />
            <stop offset="50%" stopColor={CONCERT_BLUE} stopOpacity={0.1} />
            <stop offset="100%" stopColor={CONCERT_PURPLE} stopOpacity={0} />
          </radialGradient>

          <filter id="haze-blur-lg">
            <feGaussianBlur stdDeviation={12} />
          </filter>
        </defs>

        {/* Purple atmospheric glow across entire crowd area */}
        <rect
          x={0} y={100} width={1920} height={800}
          fill="url(#crowd-purple-wash)"
        />

        {/* Lens flare 1 */}
        <circle cx={800} cy={940} r={80} fill="url(#lens-flare-grad)" />
        <circle cx={800} cy={940} r={20} fill={CONCERT_WHITE} opacity={0.25} />

        {/* Lens flare 2 */}
        <circle cx={1120} cy={940} r={80} fill="url(#lens-flare-grad)" />
        <circle cx={1120} cy={940} r={20} fill={CONCERT_WHITE} opacity={0.25} />

        {/* Haze bands — stronger for atmosphere */}
        <rect
          x={0} y={350} width={1920} height={40}
          fill={CONCERT_PURPLE} opacity={0.06}
          filter="url(#haze-blur-lg)"
        />
        <rect
          x={0} y={600} width={1920} height={40}
          fill={CONCERT_PURPLE} opacity={0.08}
          filter="url(#haze-blur-lg)"
        />
        <rect
          x={0} y={850} width={1920} height={30}
          fill={CONCERT_PURPLE} opacity={0.1}
          filter="url(#haze-blur-lg)"
        />
      </svg>
    </div>
  );
};

export default StadiumLighting;
