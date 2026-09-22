import React from 'react';
import StageFloor from './stage/StageFloor';
import LEDWall from './stage/LEDWall';
import StageSymbols from './stage/StageSymbols';
import MemberSpotlights from './stage/MemberSpotlights';
import {
  HEUK,
  CONCERT_PURPLE,
  CONCERT_CYAN,
} from '../../theme/colors';

/**
 * Scene3Afterimage — BTS member silhouettes rendered as AFTERIMAGE MOTION TRAILS.
 *
 * Like long-exposure photography of dancers: each member is 5 translucent copies
 * at slightly different positions/rotations, overlapping from ghostly (0.08) to
 * semi-opaque (0.6). Purple trailing ghosts with cyan rim on the sharpest copy.
 *
 * Uses existing stage components (StageFloor, LEDWall, StageSymbols, MemberSpotlights)
 * for the environment, then renders the afterimage members inline.
 */

// ─── Silhouette Pose Paths ─────────────────────────────────────────────────────
// Three distinct dynamic dance poses for visual variety.
// Each path is centered near (0, 0) with ~110-120px total height.

/** Pose A — Arms spread wide, legs apart (euphoric/flying pose) */
const POSE_A =
  // Head
  'M 0,-55 C -6,-55 -11,-50 -11,-44 C -11,-38 -6,-33 0,-33 ' +
  'C 6,-33 11,-38 11,-44 C 11,-50 6,-55 0,-55 Z ' +
  // Left arm reaching out
  'M -18,-28 L -36,-15 L -34,-12 L -16,-24 ' +
  'L -12,-24 L -12,0 L -8,0 L -8,-28 Z ' +
  // Right arm reaching out
  'M 18,-28 L 36,-15 L 34,-12 L 16,-24 ' +
  'L 12,-24 L 12,0 L 8,0 L 8,-28 Z ' +
  // Left leg
  'M -10,0 L -14,35 L -10,35 L -6,2 Z ' +
  // Right leg
  'M 10,0 L 14,35 L 10,35 L 6,2 Z';

/** Pose B — Both arms raised high, legs together (triumphant/encore pose) */
const POSE_B =
  // Head
  'M 0,-55 C -6,-55 -11,-50 -11,-44 C -11,-38 -6,-33 0,-33 ' +
  'C 6,-33 11,-38 11,-44 C 11,-50 6,-55 0,-55 Z ' +
  // Left arm raised up and out
  'M -14,-28 L -22,-40 L -26,-55 L -24,-65 ' +
  'L -20,-65 L -22,-55 L -18,-40 L -10,-28 Z ' +
  // Right arm raised up and out
  'M 14,-28 L 22,-40 L 26,-55 L 24,-65 ' +
  'L 20,-65 L 22,-55 L 18,-40 L 10,-28 Z ' +
  // Torso
  'M -10,-28 L -10,0 L -6,2 L 6,2 L 10,0 L 10,-28 Z ' +
  // Left leg
  'M -6,2 L -8,35 L -5,35 L -3,4 Z ' +
  // Right leg
  'M 6,2 L 8,35 L 5,35 L 3,4 Z';

/** Pose C — One arm up, one hip, staggered legs (swagger/groove pose) */
const POSE_C =
  // Head (tilted slightly)
  'M 2,-55 C -4,-56 -10,-51 -10,-44 C -10,-38 -5,-33 1,-33 ' +
  'C 7,-33 12,-38 12,-44 C 12,-50 8,-55 2,-55 Z ' +
  // Right arm punched up
  'M 14,-28 L 16,-38 L 14,-50 L 12,-62 ' +
  'L 8,-62 L 10,-50 L 12,-38 L 10,-28 Z ' +
  // Right fist
  'M 8,-62 L 8,-67 L 14,-67 L 14,-62 Z ' +
  // Left arm bent at hip
  'M -14,-28 L -22,-22 L -20,-14 L -16,-8 ' +
  'L -13,-10 L -17,-16 L -18,-22 L -12,-26 Z ' +
  // Torso
  'M -10,-28 L -10,0 L -6,4 L 8,4 L 12,0 L 12,-28 Z ' +
  // Left leg (back, wider stance)
  'M -6,4 L -12,20 L -14,35 L -10,35 L -8,20 L -4,6 Z ' +
  // Right leg (forward)
  'M 8,4 L 14,18 L 18,35 L 14,35 L 10,20 L 6,6 Z';

// The three pose paths assigned round-robin to 7 members
const POSE_PATHS = [POSE_A, POSE_B, POSE_C];

// ─── Member Formation (V-shape, 7 members) ─────────────────────────────────

interface MemberPosition {
  x: number;
  y: number;
  scale: number;
  poseIndex: number;   // 0, 1, or 2 — which pose path to use
  swayDuration: string;
  swayDelay: string;
}

const MEMBERS: MemberPosition[] = [
  // Center
  { x: 960,  y: 640, scale: 1.0,  poseIndex: 0, swayDuration: '6s',   swayDelay: '0s'   },
  // Inner left / right
  { x: 760,  y: 600, scale: 0.95, poseIndex: 1, swayDuration: '7s',   swayDelay: '0.4s' },
  { x: 1160, y: 600, scale: 0.95, poseIndex: 2, swayDuration: '6.5s', swayDelay: '0.8s' },
  // Mid left / right
  { x: 580,  y: 560, scale: 0.9,  poseIndex: 2, swayDuration: '5.5s', swayDelay: '1.2s' },
  { x: 1340, y: 560, scale: 0.9,  poseIndex: 0, swayDuration: '7.5s', swayDelay: '1.6s' },
  // Outer left / right
  { x: 420,  y: 530, scale: 0.85, poseIndex: 1, swayDuration: '6s',   swayDelay: '2.0s' },
  { x: 1500, y: 530, scale: 0.85, poseIndex: 0, swayDuration: '5s',   swayDelay: '2.4s' },
];

// ─── Afterimage Copy Offsets ────────────────────────────────────────────────
// Each member gets 5 copies. Oldest (most transparent) to newest (most opaque).

interface AfterimageOffset {
  dx: number;
  dy: number;
  rotation: number;
  opacity: number;
  isGhost: boolean; // true = purple ghost, false = dark final copy
}

const AFTERIMAGE_OFFSETS: AfterimageOffset[] = [
  { dx: -12, dy: -4, rotation: -3, opacity: 0.08, isGhost: true  },
  { dx:  -6, dy: -2, rotation: -1, opacity: 0.15, isGhost: true  },
  { dx:   0, dy:  0, rotation:  0, opacity: 0.25, isGhost: true  },
  { dx:   6, dy:  2, rotation:  1, opacity: 0.40, isGhost: true  },
  { dx:  10, dy:  5, rotation:  2, opacity: 0.60, isGhost: false }, // final = dark fill + cyan rim
];

// ─── Component ──────────────────────────────────────────────────────────────

const Scene3Afterimage: React.FC = () => (
  <div
    style={{
      position: 'relative',
      width: '100vw',
      height: '100vh',
      overflow: 'hidden',
      background: 'linear-gradient(180deg, #050510 0%, #0A0515 40%, #1A1025 100%)',
    }}
  >
    {/* Existing stage layers */}
    <StageFloor />
    <LEDWall />
    <StageSymbols />

    {/* ── Afterimage Member Silhouettes ── */}
    <svg
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 30,
        pointerEvents: 'none',
      }}
      viewBox="0 0 1920 1080"
      preserveAspectRatio="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Blur filter for the oldest ghost copies — gives them a smeared look */}
        <filter id="afterimage-blur-heavy">
          <feGaussianBlur stdDeviation="2.5" />
        </filter>
        <filter id="afterimage-blur-medium">
          <feGaussianBlur stdDeviation="1.5" />
        </filter>
        <filter id="afterimage-blur-light">
          <feGaussianBlur stdDeviation="0.8" />
        </filter>

        {/* Glow filter for the cyan rim on the final copy */}
        <filter id="cyan-rim-glow">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {MEMBERS.map((member, mIdx) => {
        const posePath = POSE_PATHS[member.poseIndex];

        return (
          <g
            key={`afterimage-member-${mIdx}`}
            transform={`translate(${member.x}, ${member.y}) scale(${member.scale})`}
            style={{
              animationName: 'member-sway',
              animationDuration: member.swayDuration,
              animationDelay: member.swayDelay,
              animationTimingFunction: 'ease-in-out',
              animationIterationCount: 'infinite',
            }}
          >
            {AFTERIMAGE_OFFSETS.map((offset, oIdx) => {
              // Determine blur filter for older copies
              let blurFilter: string | undefined;
              if (oIdx === 0) blurFilter = 'url(#afterimage-blur-heavy)';
              else if (oIdx === 1) blurFilter = 'url(#afterimage-blur-medium)';
              else if (oIdx === 2) blurFilter = 'url(#afterimage-blur-light)';

              const fillColor = offset.isGhost ? CONCERT_PURPLE : HEUK;

              return (
                <g
                  key={`ghost-${mIdx}-${oIdx}`}
                  transform={`translate(${offset.dx}, ${offset.dy}) rotate(${offset.rotation})`}
                  opacity={offset.opacity}
                  filter={blurFilter}
                >
                  {/* Silhouette fill */}
                  <path
                    d={posePath}
                    fill={fillColor}
                  />

                  {/* Cyan rim stroke on the final (most opaque) copy */}
                  {!offset.isGhost && (
                    <path
                      d={posePath}
                      fill="none"
                      stroke={CONCERT_CYAN}
                      strokeWidth={1.5}
                      opacity={0.3}
                      filter="url(#cyan-rim-glow)"
                    />
                  )}

                  {/* Purple rim on the final copy for color pop */}
                  {!offset.isGhost && (
                    <path
                      d={posePath}
                      fill="none"
                      stroke={CONCERT_PURPLE}
                      strokeWidth={2}
                      opacity={0.5}
                      transform="translate(1.5, 0)"
                    />
                  )}
                </g>
              );
            })}
          </g>
        );
      })}
    </svg>

    {/* Spotlights on top */}
    <MemberSpotlights />
  </div>
);

export default Scene3Afterimage;
