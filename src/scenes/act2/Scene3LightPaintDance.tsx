import React from 'react';
import StageFloor from './stage/StageFloor';
import LEDWall from './stage/LEDWall';
import StageSymbols from './stage/StageSymbols';
import MemberSpotlights from './stage/MemberSpotlights';
import {
  CONCERT_CYAN,
  CONCERT_PURPLE,
  CONCERT_MAGENTA,
  CONCERT_WHITE,
} from '../../theme/colors';

/**
 * Scene3LightPaintDance — Light painting curves that CONTINUOUSLY DANCE.
 *
 * Each member has 5-6 curves. The curves stream/flow endlessly along their
 * paths (like ribbons of light being drawn in real-time) while the groups
 * sway and rotate, creating a living, dancing light show.
 */

const COLORS = [CONCERT_CYAN, CONCERT_PURPLE, CONCERT_MAGENTA, CONCERT_WHITE];

interface MemberPos {
  x: number;
  y: number;
  scale: number;
}

const MEMBERS: MemberPos[] = [
  { x: 960,  y: 640, scale: 1.0  },
  { x: 760,  y: 600, scale: 0.95 },
  { x: 1160, y: 600, scale: 0.95 },
  { x: 580,  y: 560, scale: 0.9  },
  { x: 1340, y: 560, scale: 0.9  },
  { x: 420,  y: 530, scale: 0.85 },
  { x: 1500, y: 530, scale: 0.85 },
];

interface CurveDef {
  d: string;
  color: string;
  segLen: number;   // visible segment length
  gapLen: number;   // gap between segments
  totalLen: number;  // total path length estimate
  streamDur: number; // seconds for one full stream cycle
  delay: number;     // animation delay
}

function getCurves(m: MemberPos, idx: number): CurveDef[] {
  const { x, y } = m;
  const s = m.scale;

  // Scale helper
  const sx = (dx: number) => x + dx * s;
  const sy = (dy: number) => y + dy * s;

  const curveSets: CurveDef[][] = [
    // ─── Member 0 (Center) — dramatic wings + rising spiral ──────
    [
      { d: `M ${sx(-60)},${sy(30)} C ${sx(-45)},${sy(-50)} ${sx(20)},${sy(-90)} ${sx(40)},${sy(-45)} S ${sx(25)},${sy(20)} ${sx(-15)},${sy(35)}`,
        color: COLORS[0], segLen: 120, gapLen: 280, totalLen: 500, streamDur: 3.5, delay: 0 },
      { d: `M ${sx(60)},${sy(30)} C ${sx(45)},${sy(-50)} ${sx(-20)},${sy(-90)} ${sx(-40)},${sy(-45)} S ${sx(-25)},${sy(20)} ${sx(15)},${sy(35)}`,
        color: COLORS[1], segLen: 120, gapLen: 280, totalLen: 500, streamDur: 4.0, delay: 0.5 },
      { d: `M ${sx(-30)},${sy(25)} Q ${sx(0)},${sy(-100)} ${sx(30)},${sy(25)}`,
        color: COLORS[2], segLen: 100, gapLen: 200, totalLen: 380, streamDur: 3.0, delay: 1.0 },
      { d: `M ${sx(0)},${sy(40)} C ${sx(-35)},${sy(-10)} ${sx(35)},${sy(-60)} ${sx(0)},${sy(-85)} C ${sx(-35)},${sy(-60)} ${sx(35)},${sy(-10)} ${sx(0)},${sy(40)}`,
        color: COLORS[3], segLen: 140, gapLen: 300, totalLen: 550, streamDur: 5.0, delay: 0.3 },
      { d: `M ${sx(-20)},${sy(10)} C ${sx(-50)},${sy(-30)} ${sx(-10)},${sy(-70)} ${sx(10)},${sy(-70)} C ${sx(30)},${sy(-70)} ${sx(50)},${sy(-30)} ${sx(20)},${sy(10)}`,
        color: COLORS[0], segLen: 90, gapLen: 250, totalLen: 420, streamDur: 3.8, delay: 1.5 },
    ],

    // ─── Member 1 (Inner left) — cascading ribbons ──────
    [
      { d: `M ${sx(-35)},${sy(25)} C ${sx(-25)},${sy(-40)} ${sx(15)},${sy(-65)} ${sx(30)},${sy(-30)} S ${sx(18)},${sy(15)} ${sx(-8)},${sy(28)}`,
        color: COLORS[1], segLen: 100, gapLen: 250, totalLen: 420, streamDur: 3.2, delay: 0.2 },
      { d: `M ${sx(-18)},${sy(18)} Q ${sx(-30)},${sy(-25)} ${sx(0)},${sy(-55)} Q ${sx(30)},${sy(-25)} ${sx(18)},${sy(18)}`,
        color: COLORS[0], segLen: 90, gapLen: 220, totalLen: 360, streamDur: 2.8, delay: 0.8 },
      { d: `M ${sx(-25)},${sy(5)} Q ${sx(5)},${sy(-50)} ${sx(25)},${sy(5)}`,
        color: COLORS[2], segLen: 80, gapLen: 180, totalLen: 280, streamDur: 2.5, delay: 1.3 },
      { d: `M ${sx(10)},${sy(30)} C ${sx(25)},${sy(0)} ${sx(-15)},${sy(-45)} ${sx(-25)},${sy(-65)}`,
        color: COLORS[3], segLen: 70, gapLen: 200, totalLen: 300, streamDur: 3.5, delay: 0.5 },
    ],

    // ─── Member 2 (Inner right) — ascending spirals ──────
    [
      { d: `M ${sx(25)},${sy(28)} C ${sx(35)},${sy(-15)} ${sx(-12)},${sy(-60)} ${sx(-25)},${sy(-75)} S ${sx(-35)},${sy(-42)} ${sx(-18)},${sy(-22)}`,
        color: COLORS[2], segLen: 110, gapLen: 260, totalLen: 460, streamDur: 3.6, delay: 0.4 },
      { d: `M ${sx(-20)},${sy(20)} Q ${sx(25)},${sy(-35)} ${sx(8)},${sy(-60)} Q ${sx(-18)},${sy(-40)} ${sx(12)},${sy(12)}`,
        color: COLORS[0], segLen: 95, gapLen: 230, totalLen: 390, streamDur: 3.0, delay: 1.0 },
      { d: `M ${sx(18)},${sy(12)} Q ${sx(-8)},${sy(-45)} ${sx(-18)},${sy(12)}`,
        color: COLORS[1], segLen: 80, gapLen: 170, totalLen: 260, streamDur: 2.4, delay: 1.6 },
      { d: `M ${sx(-10)},${sy(30)} C ${sx(-28)},${sy(0)} ${sx(12)},${sy(-45)} ${sx(22)},${sy(-65)}`,
        color: COLORS[3], segLen: 70, gapLen: 200, totalLen: 300, streamDur: 3.2, delay: 0.7 },
    ],

    // ─── Member 3 (Mid left) — angular slashes ──────
    [
      { d: `M ${sx(-28)},${sy(18)} C ${sx(-35)},${sy(-25)} ${sx(8)},${sy(-58)} ${sx(24)},${sy(-38)} S ${sx(12)},${sy(8)} ${sx(-12)},${sy(22)}`,
        color: COLORS[0], segLen: 100, gapLen: 240, totalLen: 400, streamDur: 3.0, delay: 0.3 },
      { d: `M ${sx(25)},${sy(12)} C ${sx(18)},${sy(-18)} ${sx(-22)},${sy(-55)} ${sx(-28)},${sy(-32)}`,
        color: COLORS[2], segLen: 85, gapLen: 200, totalLen: 330, streamDur: 2.6, delay: 0.9 },
      { d: `M ${sx(-15)},${sy(5)} C ${sx(-25)},${sy(-20)} ${sx(10)},${sy(-50)} ${sx(20)},${sy(-30)} S ${sx(5)},${sy(10)} ${sx(-15)},${sy(5)}`,
        color: COLORS[1], segLen: 100, gapLen: 220, totalLen: 380, streamDur: 3.4, delay: 1.4 },
    ],

    // ─── Member 4 (Mid right) — double helix ──────
    [
      { d: `M ${sx(-20)},${sy(22)} C ${sx(18)},${sy(-8)} ${sx(-18)},${sy(-35)} ${sx(18)},${sy(-58)} C ${sx(28)},${sy(-68)} ${sx(12)},${sy(-78)} ${sx(0)},${sy(-68)}`,
        color: COLORS[1], segLen: 110, gapLen: 260, totalLen: 440, streamDur: 3.5, delay: 0.2 },
      { d: `M ${sx(20)},${sy(22)} C ${sx(-18)},${sy(-8)} ${sx(18)},${sy(-35)} ${sx(-18)},${sy(-58)} C ${sx(-28)},${sy(-68)} ${sx(-12)},${sy(-78)} ${sx(0)},${sy(-68)}`,
        color: COLORS[0], segLen: 110, gapLen: 260, totalLen: 440, streamDur: 3.8, delay: 0.8 },
      { d: `M ${sx(0)},${sy(25)} Q ${sx(-22)},${sy(-20)} ${sx(0)},${sy(-65)} Q ${sx(22)},${sy(-20)} ${sx(0)},${sy(25)}`,
        color: COLORS[2], segLen: 90, gapLen: 240, totalLen: 400, streamDur: 4.2, delay: 1.2 },
    ],

    // ─── Member 5 (Outer left) — comet arcs ──────
    [
      { d: `M ${sx(-22)},${sy(18)} C ${sx(-12)},${sy(-28)} ${sx(18)},${sy(-55)} ${sx(25)},${sy(-28)} S ${sx(8)},${sy(18)} ${sx(-12)},${sy(22)}`,
        color: COLORS[2], segLen: 95, gapLen: 230, totalLen: 370, streamDur: 3.0, delay: 0.5 },
      { d: `M ${sx(18)},${sy(15)} Q ${sx(-12)},${sy(-38)} ${sx(-20)},${sy(-58)}`,
        color: COLORS[1], segLen: 70, gapLen: 180, totalLen: 280, streamDur: 2.5, delay: 1.1 },
      { d: `M ${sx(-15)},${sy(10)} Q ${sx(10)},${sy(-25)} ${sx(-8)},${sy(-50)}`,
        color: COLORS[0], segLen: 70, gapLen: 180, totalLen: 280, streamDur: 2.8, delay: 1.7 },
      { d: `M ${sx(5)},${sy(28)} C ${sx(20)},${sy(5)} ${sx(-10)},${sy(-35)} ${sx(-22)},${sy(-55)}`,
        color: COLORS[3], segLen: 65, gapLen: 200, totalLen: 300, streamDur: 3.3, delay: 0.3 },
    ],

    // ─── Member 6 (Outer right) — whip lash strokes ──────
    [
      { d: `M ${sx(22)},${sy(18)} C ${sx(12)},${sy(-28)} ${sx(-18)},${sy(-55)} ${sx(-25)},${sy(-28)} S ${sx(-8)},${sy(18)} ${sx(12)},${sy(22)}`,
        color: COLORS[0], segLen: 95, gapLen: 230, totalLen: 370, streamDur: 2.8, delay: 0.4 },
      { d: `M ${sx(-20)},${sy(12)} Q ${sx(15)},${sy(-32)} ${sx(22)},${sy(-55)}`,
        color: COLORS[2], segLen: 70, gapLen: 180, totalLen: 280, streamDur: 2.5, delay: 1.0 },
      { d: `M ${sx(12)},${sy(8)} Q ${sx(-12)},${sy(-28)} ${sx(8)},${sy(-55)}`,
        color: COLORS[1], segLen: 70, gapLen: 180, totalLen: 280, streamDur: 3.0, delay: 1.5 },
      { d: `M ${sx(-5)},${sy(28)} C ${sx(-20)},${sy(5)} ${sx(10)},${sy(-35)} ${sx(22)},${sy(-55)}`,
        color: COLORS[3], segLen: 65, gapLen: 200, totalLen: 300, streamDur: 3.5, delay: 0.7 },
    ],
  ];

  return curveSets[idx];
}

// Sway durations and rotation ranges per member for dance feel
const SWAY_DURS = [4.0, 3.5, 3.8, 3.2, 4.2, 3.6, 3.0];
const SWAY_DELAYS = [0, 0.4, 0.8, 1.2, 0.6, 1.6, 1.0];

const Scene3LightPaintDance: React.FC = () => (
  <div
    style={{
      position: 'relative',
      width: '100vw',
      height: '100vh',
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
        <filter id="lpd-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="lpd-glow-wide" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="8" />
        </filter>
      </defs>

      {/* Streaming light animation — segments flow along paths endlessly */}
      <style>{`
        @keyframes light-stream {
          from { stroke-dashoffset: var(--stream-total); }
          to   { stroke-dashoffset: calc(var(--stream-total) * -1); }
        }
        @keyframes lp-dance-sway {
          0%, 100% { transform: translateX(0) rotate(0deg); }
          25% { transform: translateX(-6px) rotate(-2deg); }
          50% { transform: translateX(2px) rotate(1deg); }
          75% { transform: translateX(5px) rotate(-1deg); }
        }
        @keyframes lp-dance-bob {
          0%, 100% { transform: translateY(0); }
          30% { transform: translateY(-8px); }
          70% { transform: translateY(4px); }
        }
      `}</style>

      {MEMBERS.map((m, memberIdx) => {
        const curves = getCurves(m, memberIdx);

        return (
          <g
            key={`lpd-member-${memberIdx}`}
            style={{
              animationName: 'lp-dance-sway, lp-dance-bob',
              animationDuration: `${SWAY_DURS[memberIdx]}s, ${SWAY_DURS[memberIdx] * 0.7}s`,
              animationDelay: `${SWAY_DELAYS[memberIdx]}s, ${SWAY_DELAYS[memberIdx] + 0.3}s`,
              animationTimingFunction: 'ease-in-out',
              animationIterationCount: 'infinite',
              transformOrigin: `${m.x}px ${m.y}px`,
            }}
          >
            {curves.map((curve, ci) => {
              const dashArray = `${curve.segLen} ${curve.gapLen}`;
              const streamTotal = curve.totalLen + curve.segLen + curve.gapLen;

              return (
                <g key={`lpd-c-${memberIdx}-${ci}`}>
                  {/* Wide glow halo — streams along the path */}
                  <path
                    d={curve.d}
                    fill="none"
                    stroke={curve.color}
                    strokeWidth={10}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity={0.12}
                    filter="url(#lpd-glow-wide)"
                    style={{
                      strokeDasharray: dashArray,
                      ['--stream-total' as string]: `${streamTotal}`,
                      animationName: 'light-stream',
                      animationDuration: `${curve.streamDur}s`,
                      animationDelay: `${curve.delay}s`,
                      animationTimingFunction: 'linear',
                      animationIterationCount: 'infinite',
                    }}
                  />

                  {/* Core bright stroke — streams along the path */}
                  <path
                    d={curve.d}
                    fill="none"
                    stroke={curve.color}
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity={0.7}
                    filter="url(#lpd-glow)"
                    style={{
                      strokeDasharray: dashArray,
                      ['--stream-total' as string]: `${streamTotal}`,
                      animationName: 'light-stream',
                      animationDuration: `${curve.streamDur}s`,
                      animationDelay: `${curve.delay}s`,
                      animationTimingFunction: 'linear',
                      animationIterationCount: 'infinite',
                    }}
                  />
                </g>
              );
            })}
          </g>
        );
      })}
    </svg>

    <MemberSpotlights />
  </div>
);

export default Scene3LightPaintDance;
