import React, { useMemo } from 'react';
import { seededRandom } from '../../../utils/svgHelpers';
import {
  ARMY_BOMB_PURPLE,
  ARMY_BOMB_BLUE,
  CONCERT_WHITE,
} from '../../../theme/colors';
import { oscillate, waveSweep } from '../../../utils/animHelpers';
import { useBeatSync } from '../../../hooks/useBeatSync';

/**
 * ArmyBombField — 500 glowing purple / blue / white dots simulating
 * the iconic ARMY bomb lightstick ocean across the full crowd area
 * (y=200-800).
 *
 * Color zoning: left side (x<640) is 80% purple, right side (x>1280) is
 * 80% blue, center is evenly mixed. Dot radius scales with y-position
 * for perspective depth.
 *
 * Three radial gradient variants (purple, blue, white) give each bomb
 * a soft halo + bright core.
 *
 * z-index 35 — in front of the crowd silhouettes (30).
 */

const ANIM_PERIODS: Record<string, number> = {
  'army-bomb-glow': 2,
  'army-bomb-glow-fast': 1.2,
  'army-bomb-glow-slow': 3,
};

const ANIM_CLASSES = ['army-bomb-glow', 'army-bomb-glow-fast', 'army-bomb-glow-slow'];

interface BombDot {
  cx: number;
  cy: number;
  r: number;
  color: string;
  animClass: string;
  delay: number;
}

const gradientId = (color: string): string => {
  if (color === ARMY_BOMB_PURPLE) return 'ab-grad-purple';
  if (color === ARMY_BOMB_BLUE) return 'ab-grad-blue';
  return 'ab-grad-white';
};

const ArmyBombField: React.FC = () => {
  const { time, songTime, intensity, arirangFactor, waveSpeed } = useBeatSync();
  const bombs = useMemo(() => {
    const rand = seededRandom(404);
    const dots: BombDot[] = [];

    for (let i = 0; i < 800; i++) {
      const cx = 50 + rand() * 1820;
      const cy = 200 + rand() * 600;

      // Skip area flanking the stage (equipment/backstage zone)
      if (cy < 280 && cx > 250 && cx < 1670) continue;

      // Color zoning
      let color: string;
      const colorRoll = rand();
      if (cx < 640) {
        // Left side: 80% purple
        color = colorRoll < 0.80 ? ARMY_BOMB_PURPLE
             : colorRoll < 0.90 ? ARMY_BOMB_BLUE
             : CONCERT_WHITE;
      } else if (cx > 1280) {
        // Right side: 80% blue
        color = colorRoll < 0.80 ? ARMY_BOMB_BLUE
             : colorRoll < 0.90 ? ARMY_BOMB_PURPLE
             : CONCERT_WHITE;
      } else {
        // Center: mixed
        color = colorRoll < 0.40 ? ARMY_BOMB_PURPLE
             : colorRoll < 0.80 ? ARMY_BOMB_BLUE
             : CONCERT_WHITE;
      }

      // Scale radius by y-position for perspective
      let r: number;
      if (cy < 400) {
        // Near stage
        r = 1 + rand() * 1;
      } else if (cy < 600) {
        // Mid distance
        r = 1.5 + rand() * 2;
      } else {
        // Near viewer
        r = 2.5 + rand() * 2.5;
      }

      dots.push({
        cx,
        cy,
        r,
        color,
        animClass: ANIM_CLASSES[Math.floor(rand() * 3)],
        delay: rand() * 4,
      });
    }

    return dots;
  }, []);

  return (
    <svg
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 35,
        pointerEvents: 'none',
      }}
      viewBox="0 0 1920 1080"
      preserveAspectRatio="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Purple gradient */}
        <radialGradient id="ab-grad-purple" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#E9D5FF" />
          <stop offset="40%" stopColor="#A855F7" />
          <stop offset="100%" stopColor="#A855F7" stopOpacity={0} />
        </radialGradient>

        {/* Blue gradient */}
        <radialGradient id="ab-grad-blue" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#C7D2FE" />
          <stop offset="40%" stopColor="#818CF8" />
          <stop offset="100%" stopColor="#818CF8" stopOpacity={0} />
        </radialGradient>

        {/* White gradient */}
        <radialGradient id="ab-grad-white" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="40%" stopColor="#F0F0FF" />
          <stop offset="100%" stopColor="#F0F0FF" stopOpacity={0} />
        </radialGradient>

        {/* Gold gradient — used during Arirang bridge */}
        <radialGradient id="ab-grad-gold" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFF5E1" />
          <stop offset="40%" stopColor="#D4A843" />
          <stop offset="100%" stopColor="#D4A843" stopOpacity={0} />
        </radialGradient>
      </defs>

      {(() => {
        // Wave front sweeps across stadium — speed varies by section
        const wavePosition = (songTime * waveSpeed) % 2200 - 140;

        return bombs.map((bomb, i) => {
          const gId = gradientId(bomb.color);
          const period = ANIM_PERIODS[bomb.animClass] || 2;
          const baseOpacity = oscillate(time, period, 0.3, 1.0, bomb.delay);
          const waveBoost = waveSweep(wavePosition, bomb.cx, 200);
          const glowOpacity = Math.min(1.0, baseOpacity + waveBoost * 0.5 * intensity);

          // Physical wave: bounce dots up as the wave front passes
          // Scale amplitude by y-position (perspective: small near stage, bigger near viewer)
          const perspectiveScale = (bomb.cy - 200) / 600; // 0 at stage, 1 near viewer
          const waveJumpY = -waveBoost * (3 + perspectiveScale * 5) * intensity;

          return (
            <g key={`bomb-${i}`} transform={waveJumpY ? `translate(0,${waveJumpY.toFixed(1)})` : undefined}>
              {/* Normal color layer */}
              <g opacity={glowOpacity * (1 - arirangFactor * 0.7)}>
                <circle cx={bomb.cx} cy={bomb.cy} r={bomb.r * 3}
                  fill={`url(#${gId})`} opacity={0.18} />
                <circle cx={bomb.cx} cy={bomb.cy} r={bomb.r}
                  fill={`url(#${gId})`} />
              </g>
              {/* Gold overlay during Arirang bridge */}
              {arirangFactor > 0 && (
                <g opacity={glowOpacity * arirangFactor * 0.8}>
                  <circle cx={bomb.cx} cy={bomb.cy} r={bomb.r * 3}
                    fill="url(#ab-grad-gold)" opacity={0.18} />
                  <circle cx={bomb.cx} cy={bomb.cy} r={bomb.r}
                    fill="url(#ab-grad-gold)" />
                </g>
              )}
            </g>
          );
        });
      })()}
    </svg>
  );
};

export default ArmyBombField;
