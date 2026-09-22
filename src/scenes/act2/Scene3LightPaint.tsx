import React from 'react';
import StageFloor from './stage/StageFloor';
import LEDWall from './stage/LEDWall';
import StageSymbols from './stage/StageSymbols';
import MemberSpotlights from './stage/MemberSpotlights';
import {
  CONCERT_CYAN,
  CONCERT_PURPLE,
  CONCERT_MAGENTA,
} from '../../theme/colors';

/**
 * Scene3LightPaint — BTS members as LIGHT PAINTING CURVES.
 *
 * No human shapes. Each member position has flowing neon bezier curves
 * that suggest energy, movement, and dance — like long-exposure photography
 * of someone dancing with sparklers or glow sticks.
 *
 * z-index 35 for the light-paint layer.
 */

const COLORS = [CONCERT_CYAN, CONCERT_PURPLE, CONCERT_MAGENTA];

interface MemberPos {
  x: number;
  y: number;
  scale: number;
}

const MEMBERS: MemberPos[] = [
  { x: 960,  y: 640, scale: 1.0  },  // center
  { x: 760,  y: 600, scale: 0.95 },  // inner left
  { x: 1160, y: 600, scale: 0.95 },  // inner right
  { x: 580,  y: 560, scale: 0.9  },  // mid left
  { x: 1340, y: 560, scale: 0.9  },  // mid right
  { x: 420,  y: 530, scale: 0.85 },  // outer left
  { x: 1500, y: 530, scale: 0.85 },  // outer right
];

/**
 * Each member gets a unique set of light-painting curves.
 * Curves are defined relative to the member's (x, y) position.
 * Returns an array of { d, color, dashLen } objects.
 */
function getCurves(m: MemberPos, index: number) {
  const { x, y } = m;

  const curveSets: Array<Array<{ d: string; color: string; dashLen: number }>> = [
    // ─── Member 0 (Center) — dramatic wings / butterfly figure-eight ──────
    [
      {
        d: `M ${x - 50},${y + 30} C ${x - 40},${y - 50} ${x + 15},${y - 80} ${x + 35},${y - 40} S ${x + 20},${y + 20} ${x - 10},${y + 35}`,
        color: COLORS[0],
        dashLen: 500,
      },
      {
        d: `M ${x + 50},${y + 30} C ${x + 40},${y - 50} ${x - 15},${y - 80} ${x - 35},${y - 40} S ${x - 20},${y + 20} ${x + 10},${y + 35}`,
        color: COLORS[1],
        dashLen: 500,
      },
      {
        d: `M ${x - 25},${y + 20} Q ${x},${y - 90} ${x + 25},${y + 20}`,
        color: COLORS[2],
        dashLen: 350,
      },
    ],

    // ─── Member 1 (Inner left) — flowing ribbon cascade ──────
    [
      {
        d: `M ${x - 30},${y + 20} C ${x - 20},${y - 40} ${x + 10},${y - 60} ${x + 25},${y - 30} S ${x + 15},${y + 10} ${x - 5},${y + 25}`,
        color: COLORS[1],
        dashLen: 400,
      },
      {
        d: `M ${x - 15},${y + 15} Q ${x - 25},${y - 20} ${x},${y - 50} Q ${x + 25},${y - 20} ${x + 15},${y + 15}`,
        color: COLORS[0],
        dashLen: 350,
      },
      {
        d: `M ${x - 20},${y} Q ${x},${y - 45} ${x + 20},${y}`,
        color: COLORS[2],
        dashLen: 250,
      },
    ],

    // ─── Member 2 (Inner right) — ascending spiral arcs ──────
    [
      {
        d: `M ${x + 20},${y + 25} C ${x + 30},${y - 10} ${x - 10},${y - 55} ${x - 20},${y - 70} S ${x - 30},${y - 40} ${x - 15},${y - 20}`,
        color: COLORS[2],
        dashLen: 450,
      },
      {
        d: `M ${x - 18},${y + 18} Q ${x + 20},${y - 30} ${x + 5},${y - 55} Q ${x - 15},${y - 35} ${x + 10},${y + 10}`,
        color: COLORS[0],
        dashLen: 380,
      },
      {
        d: `M ${x + 15},${y + 10} Q ${x - 5},${y - 40} ${x - 15},${y + 10}`,
        color: COLORS[1],
        dashLen: 250,
      },
    ],

    // ─── Member 3 (Mid left) — angular slash strokes ──────
    [
      {
        d: `M ${x - 25},${y + 15} C ${x - 30},${y - 20} ${x + 5},${y - 55} ${x + 20},${y - 35} S ${x + 10},${y + 5} ${x - 10},${y + 20}`,
        color: COLORS[0],
        dashLen: 380,
      },
      {
        d: `M ${x + 22},${y + 10} C ${x + 15},${y - 15} ${x - 20},${y - 50} ${x - 25},${y - 30}`,
        color: COLORS[2],
        dashLen: 320,
      },
    ],

    // ─── Member 4 (Mid right) — double helix / DNA twist ──────
    [
      {
        d: `M ${x - 18},${y + 20} C ${x + 15},${y - 5} ${x - 15},${y - 30} ${x + 15},${y - 55} C ${x + 25},${y - 65} ${x + 10},${y - 75} ${x},${y - 65}`,
        color: COLORS[1],
        dashLen: 420,
      },
      {
        d: `M ${x + 18},${y + 20} C ${x - 15},${y - 5} ${x + 15},${y - 30} ${x - 15},${y - 55} C ${x - 25},${y - 65} ${x - 10},${y - 75} ${x},${y - 65}`,
        color: COLORS[0],
        dashLen: 420,
      },
    ],

    // ─── Member 5 (Outer left) — sweeping comet arcs ──────
    [
      {
        d: `M ${x - 20},${y + 15} C ${x - 10},${y - 25} ${x + 15},${y - 50} ${x + 22},${y - 25} S ${x + 5},${y + 15} ${x - 10},${y + 20}`,
        color: COLORS[2],
        dashLen: 360,
      },
      {
        d: `M ${x + 15},${y + 12} Q ${x - 10},${y - 35} ${x - 18},${y - 55}`,
        color: COLORS[1],
        dashLen: 280,
      },
      {
        d: `M ${x - 12},${y + 8} Q ${x + 8},${y - 20} ${x - 5},${y - 45}`,
        color: COLORS[0],
        dashLen: 280,
      },
    ],

    // ─── Member 6 (Outer right) — quick whip / lash strokes ──────
    [
      {
        d: `M ${x + 20},${y + 15} C ${x + 10},${y - 25} ${x - 15},${y - 50} ${x - 22},${y - 25} S ${x - 5},${y + 15} ${x + 10},${y + 20}`,
        color: COLORS[0],
        dashLen: 360,
      },
      {
        d: `M ${x - 18},${y + 10} Q ${x + 12},${y - 30} ${x + 20},${y - 50}`,
        color: COLORS[2],
        dashLen: 280,
      },
      {
        d: `M ${x + 10},${y + 5} Q ${x - 10},${y - 25} ${x + 5},${y - 50}`,
        color: COLORS[1],
        dashLen: 280,
      },
    ],
  ];

  return curveSets[index];
}

const Scene3LightPaint: React.FC = () => (
  <div
    style={{
      position: 'relative',
      width: '100vw',
      height: '100vh',
      overflow: 'hidden',
      background: 'linear-gradient(180deg, #050510 0%, #0A0515 40%, #1A1025 100%)',
    }}
  >
    {/* Stage base layers */}
    <StageFloor />
    <LEDWall />
    <StageSymbols />

    {/* Light-painting curves */}
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
        {/* Glow filter for the neon light-painting effect */}
        <filter id="lp-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Inline keyframe for the draw-on animation */}
      <style>{`
        @keyframes light-draw {
          to { stroke-dashoffset: 0; }
        }
      `}</style>

      {MEMBERS.map((m, memberIdx) => {
        const curves = getCurves(m, memberIdx);

        return (
          <g
            key={`lp-member-${memberIdx}`}
            style={{
              animationName: 'member-sway',
              animationDuration: `${3.5 + memberIdx * 0.3}s`,
              animationDelay: `${memberIdx * 0.2}s`,
              animationTimingFunction: 'ease-in-out',
              animationIterationCount: 'infinite',
            }}
          >
            {curves.map((curve, curveIdx) => {
              const globalIdx = memberIdx * 3 + curveIdx;

              return (
                <g key={`lp-curve-${memberIdx}-${curveIdx}`}>
                  {/* Outer glow halo — wider, fainter */}
                  <path
                    d={curve.d}
                    fill="none"
                    stroke={curve.color}
                    strokeWidth={8}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity={0.15}
                    style={{
                      strokeDasharray: `${curve.dashLen}`,
                      strokeDashoffset: `${curve.dashLen}`,
                      animationName: 'light-draw',
                      animationDuration: '3s',
                      animationTimingFunction: 'ease-out',
                      animationFillMode: 'forwards',
                      animationDelay: `${globalIdx * 0.3}s`,
                    }}
                  />

                  {/* Core bright stroke with glow filter */}
                  <path
                    d={curve.d}
                    fill="none"
                    stroke={curve.color}
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity={0.6}
                    filter="url(#lp-glow)"
                    style={{
                      strokeDasharray: `${curve.dashLen}`,
                      strokeDashoffset: `${curve.dashLen}`,
                      animationName: 'light-draw',
                      animationDuration: '3s',
                      animationTimingFunction: 'ease-out',
                      animationFillMode: 'forwards',
                      animationDelay: `${globalIdx * 0.3}s`,
                    }}
                  />
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

export default Scene3LightPaint;
