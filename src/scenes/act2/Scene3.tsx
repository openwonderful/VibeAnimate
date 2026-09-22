import React from 'react';
import StageFloor from './stage/StageFloor';
import LEDWall from './stage/LEDWall';
import StageSymbols from './stage/StageSymbols';
import { useAnimTime } from '../../hooks/useAnimTime';
import {
  CONCERT_CYAN,
  CONCERT_PURPLE,
  CONCERT_MAGENTA,
  CONCERT_WHITE,
} from '../../theme/colors';

/**
 * Scene3 — Neon stick figures in V-formation under volumetric spotlights.
 *
 * Members + spotlights fade in on a staggered 0.5s curve anchored to
 * `revealElapsed` (seconds since reveal began). When omitted, Scene 3 falls
 * back to `useAnimTime()` so standalone mounts reveal on page-load.
 *
 * Passed from Act2Zoom as `Math.max(0, time - hold - zoom)` so the reveal
 * begins precisely at zoom-landing rather than Scene 3 mount time.
 */

interface Scene3Props {
  /** Seconds since reveal began. Omit for standalone mount-time reveal. */
  revealElapsed?: number;
}

interface MemberPos {
  x: number;
  y: number;
  scale: number;
  color: string;
}

const MEMBERS: MemberPos[] = [
  { x: 960,  y: 720, scale: 2.2,  color: CONCERT_CYAN },
  { x: 740,  y: 700, scale: 2.0,  color: CONCERT_PURPLE },
  { x: 1180, y: 700, scale: 2.0,  color: CONCERT_MAGENTA },
  { x: 540,  y: 680, scale: 1.8,  color: CONCERT_CYAN },
  { x: 1380, y: 680, scale: 1.8,  color: CONCERT_PURPLE },
  { x: 370,  y: 660, scale: 1.6,  color: CONCERT_MAGENTA },
  { x: 1550, y: 660, scale: 1.6,  color: CONCERT_CYAN },
];

// Staggered reveal delays (seconds) — center first, then pairs outward
const REVEAL_DELAYS = [0, 0.6, 0.6, 1.2, 1.2, 1.8, 1.8];
const REVEAL_FADE = 0.5;

function revealOpacity(elapsed: number, idx: number): number {
  return Math.min(1, Math.max(0, (elapsed - REVEAL_DELAYS[idx]) / REVEAL_FADE));
}

/** Per-member pose: arm paths and leg paths (relative to center) */
interface Pose {
  leftArm: string;
  rightArm: string;
  leftLeg: string;
  rightLeg: string;
  headOffsetX?: number; // slight head tilt
}

const POSES: Pose[] = [
  // 0 — Center: Arms up wide V, legs apart — triumphant leader
  {
    leftArm:  'M 0,-35 C -10,-42 -22,-52 -34,-62',
    rightArm: 'M 0,-35 C 10,-42 22,-52 34,-62',
    leftLeg:  'M 0,8 C -8,22 -16,40 -20,55',
    rightLeg: 'M 0,8 C 8,22 16,40 20,55',
  },
  // 1 — Inner left: Right arm up pointing, left arm down relaxed, weight on right leg
  {
    leftArm:  'M 0,-35 C -10,-28 -16,-18 -18,-6',
    rightArm: 'M 0,-35 C 10,-48 16,-58 14,-68',
    leftLeg:  'M 0,8 C -3,22 -6,40 -8,55',
    rightLeg: 'M 0,8 C 8,22 14,38 18,55',
  },
  // 2 — Inner right: Left arm holding mic to face, right arm swept out, lunge stance
  {
    leftArm:  'M 0,-35 C -8,-38 -10,-42 -6,-46',
    rightArm: 'M 0,-35 C 14,-30 28,-22 36,-12',
    leftLeg:  'M 0,8 C -10,20 -18,38 -22,55',
    rightLeg: 'M 0,8 C 3,22 5,40 6,55',
  },
  // 3 — Mid left: Arms out horizontal, wide power stance
  {
    leftArm:  'M 0,-35 C -12,-34 -24,-33 -36,-32',
    rightArm: 'M 0,-35 C 12,-34 24,-33 36,-32',
    leftLeg:  'M 0,8 C -10,22 -18,40 -22,55',
    rightLeg: 'M 0,8 C 10,22 18,40 22,55',
  },
  // 4 — Mid right: Hand on chest, fist raised, knee bent
  {
    leftArm:  'M 0,-35 C -6,-30 -4,-26 4,-28',
    rightArm: 'M 0,-35 C 10,-46 16,-56 14,-66',
    leftLeg:  'M 0,8 C -6,22 -12,40 -14,55',
    rightLeg: 'M 0,8 C 10,18 14,28 12,42',
  },
  // 5 — Outer left: Leaning back, arm waving up, wide stance
  {
    leftArm:  'M 0,-35 C -12,-28 -18,-16 -16,-4',
    rightArm: 'M 0,-35 C 12,-48 20,-58 26,-66',
    leftLeg:  'M 0,8 C -12,20 -20,38 -26,55',
    rightLeg: 'M 0,8 C 6,22 10,40 12,55',
    headOffsetX: 2,
  },
  // 6 — Outer right: Reaching forward toward audience, stepped stance
  {
    leftArm:  'M 0,-35 C -12,-30 -20,-22 -24,-10',
    rightArm: 'M 0,-35 C 16,-32 30,-26 38,-18',
    leftLeg:  'M 0,8 C -4,22 -8,40 -10,55',
    rightLeg: 'M 0,8 C 12,18 20,34 26,50',
  },
];

const NeonFigure: React.FC<{ member: MemberPos; idx: number; opacity: number }> = ({ member, idx, opacity }) => {
  const { x, y, scale: s, color } = member;
  const filterId = `neon-glow-${idx}`;
  const haloFilterId = `neon-halo-${idx}`;
  const pose = POSES[idx];

  const limbStyle: React.CSSProperties = {
    stroke: color,
    strokeWidth: 3,
    strokeLinecap: 'round',
    fill: 'none',
    opacity: 0.75,
    filter: `url(#${filterId})`,
  };

  const headStyle: React.CSSProperties = {
    stroke: color,
    strokeWidth: 2.5,
    fill: 'none',
    opacity: 0.75,
    filter: `url(#${filterId})`,
  };

  const haloStyle: React.CSSProperties = {
    stroke: color,
    strokeWidth: 12,
    strokeLinecap: 'round',
    fill: 'none',
    opacity: 0.15,
    filter: `url(#${haloFilterId})`,
  };

  const headX = pose.headOffsetX ?? 0;

  return (
    <g transform={`translate(${x}, ${y}) scale(${s})`}>
    <g opacity={opacity}>
      {/* Spine halo */}
      <rect x={-6} y={-38} width={12} height={46} fill={color} opacity={0.1} filter={`url(#${haloFilterId})`} />
      {/* Spine */}
      <rect x={-1.5} y={-38} width={3} height={46} fill={color} opacity={0.85} filter={`url(#${filterId})`} />
      {/* Shoulder line */}
      <line x1={-14} y1={-35} x2={14} y2={-35} style={haloStyle} />
      <line x1={-14} y1={-35} x2={14} y2={-35} style={limbStyle} />
      {/* Hip line */}
      <line x1={-7} y1={8} x2={7} y2={8} style={haloStyle} />
      <line x1={-7} y1={8} x2={7} y2={8} style={limbStyle} />

      {/* Head */}
      <circle cx={headX} cy={-48} r={9} style={{ ...haloStyle, strokeWidth: 12 }} />
      <circle cx={headX} cy={-48} r={9} style={headStyle} />

      {/* Left arm */}
      <path d={pose.leftArm} style={haloStyle} />
      <path d={pose.leftArm} style={limbStyle} />

      {/* Right arm */}
      <path d={pose.rightArm} style={haloStyle} />
      <path d={pose.rightArm} style={limbStyle} />

      {/* Left leg */}
      <path d={pose.leftLeg} style={haloStyle} />
      <path d={pose.leftLeg} style={limbStyle} />

      {/* Right leg */}
      <path d={pose.rightLeg} style={haloStyle} />
      <path d={pose.rightLeg} style={limbStyle} />
    </g>
    </g>
  );
};

const Scene3: React.FC<Scene3Props> = ({ revealElapsed }) => {
  const t = useAnimTime();
  const elapsed = revealElapsed ?? t;

  return (
  <div
    style={{
      position: 'relative',
      width: '100%',
      height: '100%',
      overflow: 'hidden',
      background: 'linear-gradient(180deg, #050510 0%, #0A0515 40%, #1A1025 100%)',
    }}
  >
    <StageFloor />
    <LEDWall />
    <StageSymbols />

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
        {MEMBERS.map((_, idx) => (
          <React.Fragment key={`filters-${idx}`}>
            <filter id={`neon-glow-${idx}`} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id={`neon-halo-${idx}`} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="8" />
            </filter>
          </React.Fragment>
        ))}
      </defs>

      {MEMBERS.map((m, idx) => (
        <NeonFigure key={`neon-fig-${idx}`} member={m} idx={idx} opacity={revealOpacity(elapsed, idx)} />
      ))}
    </svg>

    {/* Spotlights — wider cones, bigger pools */}
    <svg
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 45,
        pointerEvents: 'none',
      }}
      viewBox="0 0 1920 1080"
      preserveAspectRatio="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {MEMBERS.map((_, i) => (
          <linearGradient key={`sg-${i}`} id={`spot-g-${i}`} x1="0.5" y1="0" x2="0.5" y2="1">
            <stop offset="0%" stopColor={CONCERT_WHITE} stopOpacity={0.04} />
            <stop offset="30%" stopColor={CONCERT_WHITE} stopOpacity={0.10} />
            <stop offset="100%" stopColor={CONCERT_WHITE} stopOpacity={0.20} />
          </linearGradient>
        ))}
        <radialGradient id="spot-pool-d3" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={CONCERT_WHITE} stopOpacity={0.25} />
          <stop offset="100%" stopColor={CONCERT_WHITE} stopOpacity={0} />
        </radialGradient>
      </defs>
      {MEMBERS.map((m, i) => {
        const baseHalf = [75, 70, 70, 65, 65, 60, 60][i];
        const feetY = m.y + 55 * m.scale;
        const points = `${m.x - 6},0 ${m.x + 6},0 ${m.x + baseHalf},${feetY} ${m.x - baseHalf},${feetY}`;
        return (
          <g key={`spot-d3-${i}`} opacity={revealOpacity(elapsed, i)}>
            <circle cx={m.x} cy={0} r={4} fill={CONCERT_WHITE} opacity={0.5} />
            <polygon points={points} fill={`url(#spot-g-${i})`} />
            <ellipse cx={m.x} cy={feetY} rx={70} ry={14} fill="url(#spot-pool-d3)" />
          </g>
        );
      })}
    </svg>
  </div>
  );
};

export default Scene3;
