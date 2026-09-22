import React from 'react';
import { JEOK, HEUK } from '../../../theme/colors';
import { useAnimTime, loopPhase, cosWave, lerp } from '../../../hooks/useAnimTime';

/**
 * CraneLayer -- Four red-crowned cranes (두루미 / 학) gliding across the scene
 * in the traditional Korean painting style.
 *
 * Each crane is a hand-crafted SVG group: elongated body, curved neck,
 * red crown, black-tipped wings with serrated trailing feathers, trailing
 * legs, and a subtle ground shadow. Wings animate with `crane-wing-flap`;
 * the whole bird traverses the viewport via `crane-glide`.
 *
 * z-index 50 -- between mountains (40) and blossoms (55).
 */

/* ── Single crane SVG component ─────────────────────────────────── */
interface CraneProps {
  /** uniform scale factor */
  scale: number;
  /** vertical position as a percentage of viewport height */
  topPercent: number;
  /** crane-glide animation duration in seconds */
  glideDuration: number;
  /** animation start delay in seconds */
  delay: number;
  /** flip horizontally when true */
  flip?: boolean;
}

const Crane: React.FC<CraneProps> = ({
  scale,
  topPercent,
  glideDuration,
  delay,
  flip = false,
}) => {
  const t = useAnimTime();
  const size = 100 * scale; // base crane occupies ~100px
  // SVG head faces left; glide moves left→right, so flip by default
  const flipTransform = flip ? '' : 'scaleX(-1)';

  // crane-glide: translateX(-250px → calc(100vw + 250px)) linear
  const glidePhase = loopPhase(t, glideDuration, delay);
  const glideTransform = `translateX(calc(${-250 + glidePhase * 500}px + ${glidePhase} * 100vw))`;

  return (
    <div
      style={{
        position: 'absolute',
        top: `${topPercent}%`,
        left: 0,
        width: size,
        height: size * 0.6,
        transform: glideTransform,
        willChange: 'transform',
      }}
    >
      <svg
        viewBox="0 0 120 72"
        width={size}
        height={size * 0.6}
        xmlns="http://www.w3.org/2000/svg"
        style={{ overflow: 'visible', transform: flipTransform }}
      >
        {/* Shadow on the "ground" plane */}
        <ellipse
          cx={55}
          cy={68}
          rx={22}
          ry={4}
          fill={HEUK}
          opacity={0.06}
          filter="url(#crane-shadow-blur)"
        />
        <defs>
          <filter id="crane-shadow-blur">
            <feGaussianBlur stdDeviation="3" />
          </filter>
        </defs>

        {/* ── Legs (trailing behind) ── */}
        <line
          x1={52}
          y1={42}
          x2={62}
          y2={60}
          stroke="#888"
          strokeWidth={0.5}
          strokeLinecap="round"
        />
        <line
          x1={48}
          y1={43}
          x2={58}
          y2={62}
          stroke="#888"
          strokeWidth={0.5}
          strokeLinecap="round"
        />

        {/* ── Tail feathers ── */}
        <path
          d="M 64 38 Q 72 34 78 36"
          fill="none"
          stroke={HEUK}
          strokeWidth={1}
          strokeLinecap="round"
        />
        <path
          d="M 64 40 Q 74 38 80 39"
          fill="none"
          stroke={HEUK}
          strokeWidth={0.8}
          strokeLinecap="round"
        />
        <path
          d="M 63 42 Q 71 42 76 43"
          fill="none"
          stroke={HEUK}
          strokeWidth={0.8}
          strokeLinecap="round"
        />

        {/* ── Body (elongated teardrop) ── */}
        <path
          d="M 30 38 C 36 30 56 28 64 36 C 68 40 66 46 60 46 C 50 48 36 46 30 38 Z"
          fill="white"
          stroke="white"
          strokeWidth={0.3}
        />

        {/* ── Upper wing (right, with serrated feather tips) ──
            The wing paths are drawn sweeping toward the head (−x); `scaleX(-1)`
            about the shoulder rakes them BACK toward the tail instead, which is
            how a gliding bird's wings actually sit. Without it the crane reads
            as flying backwards — wings crossing over its own beak. */}
        <g
          style={{
            transformOrigin: '48px 34px',
            transform: `scaleX(-1) scaleY(${lerp(-0.85, 1, (cosWave(loopPhase(t, 1.2)) + 1) / 2)})`,
          }}
        >
          <path
            d={[
              'M 48 34',
              'C 44 20 36 10 20 6', // leading edge sweeping up and forward
              'C 24 10 28 14 30 18', // first feather notch
              'C 28 14 26 18 28 22', // second notch
              'C 26 20 24 24 27 26', // third notch
              'C 24 26 22 30 26 30', // fourth notch
              'C 30 30 40 32 48 34', // trailing edge back to body
              'Z',
            ].join(' ')}
            fill="white"
          />
          {/* Black wing tips */}
          <path
            d="M 20 6 C 22 8 26 10 30 18 C 28 14 24 10 20 6 Z"
            fill={HEUK}
            opacity={0.85}
          />
          <path
            d="M 20 6 C 18 8 20 14 28 22 L 30 18 C 28 14 24 10 20 6 Z"
            fill={HEUK}
            opacity={0.65}
          />
        </g>

        {/* ── Lower wing (mirror, slightly offset phase) ── */}
        <g
          style={{
            transformOrigin: '48px 42px',
            transform: `scaleX(-1) scaleY(${lerp(-0.85, 1, (cosWave(loopPhase(t, 1.2, -0.15)) + 1) / 2)})`,
          }}
        >
          <path
            d={[
              'M 48 42',
              'C 44 54 36 62 22 64',
              'C 24 60 28 56 30 52',
              'C 28 56 26 52 28 48',
              'C 26 50 24 46 27 44',
              'C 30 44 40 42 48 42',
              'Z',
            ].join(' ')}
            fill="white"
          />
          {/* Black wing tips */}
          <path
            d="M 22 64 C 24 60 28 56 30 52 C 28 56 24 60 22 64 Z"
            fill={HEUK}
            opacity={0.85}
          />
          <path
            d="M 22 64 C 20 60 22 54 28 48 L 30 52 C 28 56 24 60 22 64 Z"
            fill={HEUK}
            opacity={0.65}
          />
        </g>

        {/* ── Neck (curved line) ── */}
        <path
          d="M 32 36 C 26 32 18 28 14 22"
          fill="none"
          stroke="white"
          strokeWidth={2.2}
          strokeLinecap="round"
        />

        {/* ── Head ── */}
        <circle cx={14} cy={22} r={3} fill="white" />

        {/* ── Red crown (단정학 marking) ── */}
        <circle cx={14} cy={19.5} r={2} fill={JEOK} />

        {/* ── Beak ── */}
        <line
          x1={14}
          y1={22}
          x2={8}
          y2={20}
          stroke={HEUK}
          strokeWidth={1.2}
          strokeLinecap="round"
        />

        {/* ── Eye (tiny dot) ── */}
        <circle cx={13} cy={21.5} r={0.6} fill={HEUK} />
      </svg>
    </div>
  );
};

/* ── Crane configuration data ───────────────────────────────────── */
const cranes: CraneProps[] = [
  { scale: 0.6, topPercent: 28, glideDuration: 42, delay: -10 },
  { scale: 1.0, topPercent: 35, glideDuration: 35, delay: -12 },
  { scale: 0.8, topPercent: 42, glideDuration: 50, delay: -25 },
  { scale: 1.2, topPercent: 20, glideDuration: 28, delay: -11 },
];

const CraneLayer: React.FC = () => {
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 50,
        pointerEvents: 'none',
      }}
    >
      {cranes.map((c, i) => (
        <Crane key={i} {...c} />
      ))}
    </div>
  );
};

export default CraneLayer;
