import React from 'react';
import {
  HEUK,
  CONCERT_PURPLE,
  CONCERT_BLUE,
  CONCERT_WHITE,
} from '../../../theme/colors';

/**
 * MemberSilhouettes — THE CENTERPIECE. 7 BTS member silhouettes arranged in
 * V-formation, each with a unique dynamic dance pose. Includes purple rim
 * light, blue counter-rim, and subtle inner detail lines.
 *
 * z-index 30.
 */

interface MemberDef {
  x: number;
  y: number;
  scale: number;
  duration: string;
  delay: string;
  path: string;        // main silhouette
  details: string[];   // inner detail lines (jacket lapel, belt, shoe)
}

// ─── Silhouette paths ───────────────────────────────────────────────────────
// Each path is drawn with the figure's centre of gravity near (0, 0),
// total height ~110-120px. Paths are filled closed shapes.

/** Member 0 — Centre-front, "wings" pose: arms wide, legs apart, chest out */
const PATH_0 =
  // Head (spiky hair)
  'M -2,-58 C -1,-63 -4,-66 -6,-67 C -3,-68 0,-70 2,-68 C 4,-67 7,-66 5,-64 ' +
  'C 8,-63 6,-60 4,-58 C 7,-57 8,-54 8,-51 C 8,-47 5,-44 0,-44 ' +
  'C -5,-44 -8,-47 -8,-51 C -8,-54 -7,-57 -2,-58 Z ' +
  // Neck
  'M -3,-44 L -3,-40 L 3,-40 L 3,-44 Z ' +
  // Torso — broad shoulders, tapered waist
  'M -22,-40 L -18,-38 L -14,-10 L -9,8 L 9,8 L 14,-10 L 18,-38 L 22,-40 ' +
  'L 22,-36 L 18,-34 L 14,-8 L 10,10 L -10,10 L -14,-8 L -18,-34 L -22,-36 Z ' +
  // Left arm extended wide
  'M -22,-38 L -35,-36 L -52,-38 L -58,-37 L -58,-34 L -52,-35 L -35,-33 L -22,-34 Z ' +
  // Right arm extended wide
  'M 22,-38 L 35,-36 L 52,-38 L 58,-37 L 58,-34 L 52,-35 L 35,-33 L 22,-34 Z ' +
  // Left leg
  'M -9,8 L -12,28 L -14,48 L -16,58 L -12,58 L -10,48 L -8,28 L -5,10 Z ' +
  // Right leg
  'M 9,8 L 12,28 L 14,48 L 16,58 L 12,58 L 10,48 L 8,28 L 5,10 Z';

/** Member 1 — Left-inner, pointing: right arm forward, left hand on hip */
const PATH_1 =
  // Head (hair swept left)
  'M -3,-56 C -7,-58 -9,-56 -10,-53 C -10,-60 -6,-63 0,-63 C 6,-63 9,-59 9,-53 ' +
  'C 9,-48 6,-45 0,-45 C -5,-45 -9,-48 -9,-52 L -3,-56 Z ' +
  // Neck
  'M -2,-45 L -2,-41 L 3,-41 L 3,-45 Z ' +
  // Torso — slight forward lean
  'M -16,-41 L -14,-38 L -10,-10 L -8,6 L 8,8 L 12,-8 L 16,-36 L 18,-39 ' +
  'L 18,-37 L 14,-10 L 10,10 L -10,8 L -12,-8 L -16,-37 Z ' +
  // Right arm — extended forward (pointing)
  'M 16,-36 L 22,-32 L 30,-28 L 38,-26 L 42,-25 L 42,-22 L 38,-23 L 28,-26 L 20,-30 L 16,-34 Z ' +
  // Left arm — hand on hip
  'M -16,-38 L -22,-30 L -18,-18 L -14,-12 L -12,-10 L -14,-14 L -18,-22 L -20,-30 L -16,-36 Z ' +
  // Left leg — back, weight on it
  'M -8,6 L -10,26 L -11,46 L -13,58 L -9,58 L -7,46 L -6,26 L -4,8 Z ' +
  // Right leg — front
  'M 8,8 L 12,28 L 13,46 L 14,58 L 10,58 L 9,46 L 8,28 L 6,10 Z';

/** Member 2 — Right-inner, heart pose: arms up forming heart above head */
const PATH_2 =
  // Head (fluffy/voluminous hair)
  'M 0,-56 C -8,-60 -11,-58 -11,-54 C -12,-58 -10,-64 -5,-66 ' +
  'C 0,-68 5,-66 8,-64 C 11,-61 12,-57 11,-54 C 11,-58 8,-60 0,-56 Z ' +
  'M 0,-55 C 6,-55 9,-52 9,-48 C 9,-45 6,-42 0,-42 ' +
  'C -6,-42 -9,-45 -9,-48 C -9,-52 -6,-55 0,-55 Z ' +
  // Neck
  'M -2,-42 L -2,-38 L 3,-38 L 3,-42 Z ' +
  // Torso
  'M -15,-38 L -13,-10 L -8,10 L 8,10 L 13,-10 L 15,-38 ' +
  'L 16,-36 L 14,-8 L 9,12 L -9,12 L -14,-8 L -16,-36 Z ' +
  // Left arm — raised up, curving to form heart
  'M -15,-38 L -20,-44 L -22,-54 L -20,-62 L -16,-68 L -10,-72 L -6,-73 ' +
  'L -4,-70 L -8,-68 L -14,-64 L -18,-58 L -18,-48 L -15,-40 Z ' +
  // Right arm — raised up, mirror curve for heart
  'M 15,-38 L 20,-44 L 22,-54 L 20,-62 L 16,-68 L 10,-72 L 6,-73 ' +
  'L 4,-70 L 8,-68 L 14,-64 L 18,-58 L 18,-48 L 15,-40 Z ' +
  // Left leg
  'M -8,10 L -10,30 L -11,50 L -12,58 L -8,58 L -7,50 L -6,30 L -4,12 Z ' +
  // Right leg
  'M 8,10 L 10,30 L 11,50 L 12,58 L 8,58 L 7,50 L 6,30 L 4,12 Z';

/** Member 3 — Left-mid, deep crouch/lunge: one knee bent, arms thrust forward */
const PATH_3 =
  // Head (straight hair)
  'M 0,-42 C 5,-42 8,-39 8,-35 C 8,-31 5,-28 0,-28 ' +
  'C -5,-28 -8,-31 -8,-35 C -8,-39 -5,-42 0,-42 Z ' +
  'M -4,-42 L -5,-46 L -2,-47 L 2,-47 L 5,-46 L 4,-42 Z ' + // straight hair top
  // Neck
  'M -2,-28 L -2,-25 L 3,-25 L 3,-28 Z ' +
  // Torso — leaned forward and low
  'M -12,-25 L -10,-5 L -8,12 L 8,12 L 12,-3 L 14,-25 ' +
  'L 15,-23 L 13,-2 L 9,14 L -9,14 L -11,-3 L -13,-23 Z ' +
  // Both arms thrust forward parallel
  'M 14,-25 L 22,-22 L 32,-20 L 40,-19 L 40,-16 L 32,-17 L 22,-19 L 14,-22 Z ' +
  'M 14,-20 L 22,-17 L 32,-15 L 40,-14 L 40,-11 L 32,-12 L 22,-14 L 14,-17 Z ' +
  // Left leg — deep bend back
  'M -8,12 L -18,20 L -24,30 L -26,40 L -22,40 L -20,32 L -16,22 L -6,14 Z ' +
  // Right leg — front, knee bent low
  'M 8,12 L 14,22 L 20,34 L 22,44 L 18,44 L 16,36 L 12,24 L 6,14 Z';

/** Member 4 — Right-mid, fist punched up: one arm straight to sky */
const PATH_4 =
  // Head (medium hair)
  'M 0,-58 C 6,-58 9,-55 9,-50 C 9,-46 6,-43 0,-43 ' +
  'C -6,-43 -9,-46 -9,-50 C -9,-55 -6,-58 0,-58 Z ' +
  'M -5,-58 L -6,-62 L -3,-64 L 3,-64 L 6,-62 L 5,-58 Z ' + // hair
  // Neck
  'M -2,-43 L -2,-39 L 3,-39 L 3,-43 Z ' +
  // Torso — upright strong stance
  'M -16,-39 L -14,-12 L -9,8 L 9,8 L 14,-12 L 16,-39 ' +
  'L 17,-37 L 15,-10 L 10,10 L -10,10 L -15,-10 L -17,-37 Z ' +
  // Right arm — punched straight up
  'M 16,-39 L 18,-42 L 16,-52 L 14,-62 L 12,-72 L 10,-78 ' +
  'L 7,-78 L 9,-72 L 11,-62 L 13,-52 L 15,-42 L 14,-38 Z ' +
  // Right fist
  'M 7,-78 L 7,-82 L 13,-82 L 13,-78 Z ' +
  // Left arm — fist at chest
  'M -16,-39 L -22,-34 L -24,-28 L -22,-24 L -18,-26 L -20,-30 L -18,-34 L -16,-36 Z ' +
  // Left leg
  'M -9,8 L -11,28 L -12,48 L -13,58 L -9,58 L -8,48 L -7,28 L -5,10 Z ' +
  // Right leg
  'M 9,8 L 11,28 L 12,48 L 13,58 L 9,58 L 8,48 L 7,28 L 5,10 Z';

/** Member 5 — Left-outer, lean back: side profile, arms swept behind, one leg forward */
const PATH_5 =
  // Head (dynamic hair flip — hair flowing right)
  'M 0,-55 C 6,-55 8,-52 8,-48 C 8,-44 6,-41 0,-41 ' +
  'C -5,-41 -8,-44 -8,-48 C -8,-52 -5,-55 0,-55 Z ' +
  'M 3,-55 L 8,-58 L 14,-60 L 18,-58 L 14,-56 L 8,-55 Z ' + // hair flip
  // Neck
  'M -2,-41 L -1,-37 L 3,-37 L 4,-41 Z ' +
  // Torso — leaning back
  'M -14,-37 L -16,-12 L -14,8 L 6,10 L 12,-8 L 16,-35 ' +
  'L 17,-33 L 13,-6 L 8,12 L -16,10 L -18,-10 L -15,-35 Z ' +
  // Left arm — swept behind
  'M -14,-35 L -22,-32 L -30,-28 L -36,-22 L -38,-18 ' +
  'L -35,-17 L -34,-20 L -28,-26 L -20,-30 L -14,-33 Z ' +
  // Right arm — swept behind
  'M 16,-35 L 20,-28 L 22,-20 L 20,-14 ' +
  'L 18,-13 L 17,-18 L 18,-26 L 14,-33 Z ' +
  // Left leg — back
  'M -14,8 L -16,28 L -17,46 L -18,58 L -14,58 L -13,46 L -12,28 L -10,10 Z ' +
  // Right leg — forward
  'M 6,10 L 12,26 L 18,40 L 22,54 L 18,56 L 14,42 L 10,28 L 4,12 Z';

/** Member 6 — Right-outer, mid-step freeze: knee raised high, arms in dance position */
const PATH_6 =
  // Head
  'M 0,-56 C 6,-56 9,-53 9,-48 C 9,-44 6,-41 0,-41 ' +
  'C -5,-41 -8,-44 -8,-48 C -8,-53 -5,-56 0,-56 Z ' +
  'M -4,-56 L -5,-60 L -2,-62 L 3,-62 L 6,-60 L 5,-56 Z ' + // hair
  // Neck
  'M -2,-41 L -2,-37 L 3,-37 L 3,-41 Z ' +
  // Torso — athletic, slight twist
  'M -15,-37 L -13,-10 L -9,8 L 9,8 L 14,-10 L 16,-37 ' +
  'L 17,-35 L 15,-8 L 10,10 L -10,10 L -14,-8 L -16,-35 Z ' +
  // Left arm — back in running position
  'M -15,-35 L -22,-30 L -28,-22 L -30,-16 ' +
  'L -27,-15 L -26,-20 L -20,-28 L -15,-33 Z ' +
  // Right arm — forward in running position
  'M 16,-35 L 22,-28 L 26,-20 L 28,-14 ' +
  'L 25,-13 L 24,-18 L 20,-26 L 16,-33 Z ' +
  // Left leg — planted on ground
  'M -9,8 L -11,28 L -12,46 L -13,58 L -9,58 L -8,46 L -7,28 L -5,10 Z ' +
  // Right leg — knee raised high
  'M 9,8 L 14,14 L 18,18 L 20,14 L 18,8 L 14,6 L 9,6 Z ' +
  // Right lower leg hanging from raised knee
  'M 18,18 L 20,28 L 22,36 L 19,37 L 17,30 L 16,22 Z';

const MEMBERS: MemberDef[] = [
  {
    x: 960, y: 640, scale: 1.0,
    duration: '4s', delay: '0s',
    path: PATH_0,
    details: [
      'M -8,-6 L -4,-10',    // jacket lapel left
      'M 8,-6 L 4,-10',      // jacket lapel right
      'M -8,4 L 8,4',        // belt line
    ],
  },
  {
    x: 760, y: 600, scale: 0.95,
    duration: '4.5s', delay: '0.3s',
    path: PATH_1,
    details: [
      'M -6,-10 L -2,-14',   // lapel
      'M -6,2 L 6,4',        // belt
      'M -11,54 L -9,58',    // shoe sole
    ],
  },
  {
    x: 1160, y: 600, scale: 0.95,
    duration: '3.8s', delay: '0.6s',
    path: PATH_2,
    details: [
      'M -5,-8 L -1,-12',    // lapel left
      'M 5,-8 L 1,-12',      // lapel right
      'M -7,6 L 7,6',        // belt
    ],
  },
  {
    x: 580, y: 560, scale: 0.9,
    duration: '3.5s', delay: '0.9s',
    path: PATH_3,
    details: [
      'M -4,-4 L 0,-8',      // lapel
      'M -6,8 L 6,8',        // belt
      'M -24,38 L -22,40',   // shoe
    ],
  },
  {
    x: 1340, y: 560, scale: 0.9,
    duration: '4.2s', delay: '1.2s',
    path: PATH_4,
    details: [
      'M -6,-10 L -2,-14',   // lapel
      'M 6,-10 L 2,-14',     // lapel right
      'M -8,4 L 8,4',        // belt
    ],
  },
  {
    x: 420, y: 530, scale: 0.85,
    duration: '5s', delay: '1.5s',
    path: PATH_5,
    details: [
      'M -6,-8 L -2,-12',    // lapel
      'M -12,4 L 4,6',       // belt
      'M -16,54 L -14,58',   // shoe
    ],
  },
  {
    x: 1500, y: 530, scale: 0.85,
    duration: '3.2s', delay: '1.8s',
    path: PATH_6,
    details: [
      'M -5,-8 L -1,-12',    // lapel
      'M 5,-8 L 1,-12',      // lapel right
      'M -8,4 L 8,4',        // belt
    ],
  },
];

const MemberSilhouettes: React.FC = () => (
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
    {/* Parent group with pulse animation */}
    <g
      style={{
        animationName: 'member-pulse',
        animationDuration: '2s',
        animationTimingFunction: 'ease-in-out',
        animationIterationCount: 'infinite',
      }}
    >
      {MEMBERS.map((m, i) => (
        <g
          key={`member-${i}`}
          transform={`translate(${m.x}, ${m.y}) scale(${m.scale})`}
          style={{
            animationName: 'member-sway',
            animationDuration: m.duration,
            animationDelay: m.delay,
            animationTimingFunction: 'ease-in-out',
            animationIterationCount: 'infinite',
          }}
        >
          {/* 1. Base silhouette */}
          <path d={m.path} fill={HEUK} />

          {/* 2. Purple rim light (offset right) */}
          <path
            d={m.path}
            fill="none"
            stroke={CONCERT_PURPLE}
            strokeWidth={2}
            opacity={0.6}
            transform="translate(1.5, 0)"
          />

          {/* 3. Blue counter-rim (offset left) */}
          <path
            d={m.path}
            fill="none"
            stroke={CONCERT_BLUE}
            strokeWidth={1}
            opacity={0.3}
            transform="translate(-1, 0)"
          />

          {/* 4. Inner detail lines */}
          {m.details.map((d, j) => (
            <path
              key={`detail-${i}-${j}`}
              d={d}
              fill="none"
              stroke={CONCERT_WHITE}
              strokeWidth={0.5}
              opacity={0.1}
              strokeLinecap="round"
            />
          ))}
        </g>
      ))}
    </g>
  </svg>
);

export default MemberSilhouettes;
