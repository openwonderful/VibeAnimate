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
 * Scene3LightPaintDance2 — Full curves always visible, dancing via CSS transforms.
 *
 * Each member has 4-5 flowing neon curves that are permanently drawn.
 * The curves themselves dance — swaying, rotating, shifting, and breathing
 * via CSS transform animations, creating a fluid living light show.
 */

const COLORS = [CONCERT_CYAN, CONCERT_PURPLE, CONCERT_MAGENTA, CONCERT_WHITE];

interface MemberPos {
  x: number;
  y: number;
  scale: number;
}

const MEMBERS: MemberPos[] = [
  { x: 960,  y: 640, scale: 1.0  },  // Center
  { x: 760,  y: 600, scale: 0.95 },  // Inner left
  { x: 1160, y: 600, scale: 0.95 },  // Inner right
  { x: 580,  y: 560, scale: 0.9  },  // Mid left
  { x: 1340, y: 560, scale: 0.9  },  // Mid right
  { x: 420,  y: 530, scale: 0.85 },  // Outer left
  { x: 1500, y: 530, scale: 0.85 },  // Outer right
];

const DANCE_ANIMS = ['lp2-dance-a', 'lp2-dance-b', 'lp2-dance-c', 'lp2-dance-d', 'lp2-dance-e'];

interface CurveDef {
  d: string;
  color: string;
  opacity: number;
  anim: string;
  dur: number;
  delay: number;
}

function getCurves(m: MemberPos, idx: number): CurveDef[] {
  const { x, y } = m;
  const s = m.scale;

  const sx = (dx: number) => x + dx * s;
  const sy = (dy: number) => y + dy * s;

  const curveSets: CurveDef[][] = [
    // Member 0 (Center) — dramatic, largest curves: wings + spiral + figure-eight
    [
      { d: `M ${sx(-80)},${sy(35)} C ${sx(-60)},${sy(-60)} ${sx(25)},${sy(-110)} ${sx(55)},${sy(-50)} S ${sx(35)},${sy(25)} ${sx(-20)},${sy(40)}`,
        color: COLORS[0], opacity: 0.65, anim: DANCE_ANIMS[0], dur: 5.5, delay: 0 },
      { d: `M ${sx(80)},${sy(35)} C ${sx(60)},${sy(-60)} ${sx(-25)},${sy(-110)} ${sx(-55)},${sy(-50)} S ${sx(-35)},${sy(25)} ${sx(20)},${sy(40)}`,
        color: COLORS[1], opacity: 0.6, anim: DANCE_ANIMS[1], dur: 6.2, delay: 0.4 },
      { d: `M ${sx(0)},${sy(45)} C ${sx(-45)},${sy(-15)} ${sx(45)},${sy(-80)} ${sx(0)},${sy(-100)} C ${sx(-45)},${sy(-80)} ${sx(45)},${sy(-15)} ${sx(0)},${sy(45)}`,
        color: COLORS[2], opacity: 0.55, anim: DANCE_ANIMS[4], dur: 7.0, delay: 0.8 },
      { d: `M ${sx(-40)},${sy(10)} C ${sx(-65)},${sy(-35)} ${sx(-15)},${sy(-90)} ${sx(15)},${sy(-90)} C ${sx(45)},${sy(-90)} ${sx(65)},${sy(-35)} ${sx(40)},${sy(10)}`,
        color: COLORS[3], opacity: 0.5, anim: DANCE_ANIMS[2], dur: 4.8, delay: 1.2 },
      { d: `M ${sx(-25)},${sy(20)} Q ${sx(-55)},${sy(-50)} ${sx(0)},${sy(-75)} Q ${sx(55)},${sy(-50)} ${sx(25)},${sy(20)}`,
        color: COLORS[0], opacity: 0.55, anim: DANCE_ANIMS[3], dur: 5.0, delay: 1.6 },
    ],

    // Member 1 (Inner left) — cascading ribbons + upward arc
    [
      { d: `M ${sx(-40)},${sy(28)} C ${sx(-30)},${sy(-45)} ${sx(18)},${sy(-70)} ${sx(35)},${sy(-35)} S ${sx(20)},${sy(18)} ${sx(-10)},${sy(30)}`,
        color: COLORS[1], opacity: 0.6, anim: DANCE_ANIMS[2], dur: 4.5, delay: 0.3 },
      { d: `M ${sx(-20)},${sy(20)} Q ${sx(-35)},${sy(-30)} ${sx(0)},${sy(-60)} Q ${sx(35)},${sy(-30)} ${sx(20)},${sy(20)}`,
        color: COLORS[0], opacity: 0.55, anim: DANCE_ANIMS[0], dur: 5.2, delay: 0.7 },
      { d: `M ${sx(-30)},${sy(8)} Q ${sx(8)},${sy(-55)} ${sx(30)},${sy(8)}`,
        color: COLORS[2], opacity: 0.65, anim: DANCE_ANIMS[4], dur: 3.8, delay: 1.1 },
      { d: `M ${sx(12)},${sy(32)} C ${sx(28)},${sy(5)} ${sx(-18)},${sy(-50)} ${sx(-30)},${sy(-70)}`,
        color: COLORS[3], opacity: 0.5, anim: DANCE_ANIMS[1], dur: 6.0, delay: 1.5 },
    ],

    // Member 2 (Inner right) — ascending spirals + sweep
    [
      { d: `M ${sx(30)},${sy(30)} C ${sx(40)},${sy(-18)} ${sx(-15)},${sy(-65)} ${sx(-30)},${sy(-80)} S ${sx(-40)},${sy(-48)} ${sx(-22)},${sy(-25)}`,
        color: COLORS[2], opacity: 0.6, anim: DANCE_ANIMS[3], dur: 5.0, delay: 0.2 },
      { d: `M ${sx(-22)},${sy(22)} Q ${sx(28)},${sy(-38)} ${sx(10)},${sy(-65)} Q ${sx(-20)},${sy(-45)} ${sx(15)},${sy(15)}`,
        color: COLORS[0], opacity: 0.55, anim: DANCE_ANIMS[1], dur: 4.2, delay: 0.6 },
      { d: `M ${sx(20)},${sy(15)} Q ${sx(-10)},${sy(-50)} ${sx(-22)},${sy(15)}`,
        color: COLORS[1], opacity: 0.65, anim: DANCE_ANIMS[0], dur: 3.5, delay: 1.0 },
      { d: `M ${sx(-12)},${sy(32)} C ${sx(-30)},${sy(2)} ${sx(15)},${sy(-48)} ${sx(28)},${sy(-70)}`,
        color: COLORS[3], opacity: 0.5, anim: DANCE_ANIMS[4], dur: 5.8, delay: 1.4 },
      { d: `M ${sx(5)},${sy(25)} C ${sx(35)},${sy(-10)} ${sx(-25)},${sy(-55)} ${sx(-5)},${sy(-75)} C ${sx(15)},${sy(-55)} ${sx(-35)},${sy(-10)} ${sx(-5)},${sy(25)}`,
        color: COLORS[2], opacity: 0.5, anim: DANCE_ANIMS[2], dur: 6.5, delay: 1.8 },
    ],

    // Member 3 (Mid left) — angular slashes + wide wing
    [
      { d: `M ${sx(-32)},${sy(20)} C ${sx(-40)},${sy(-28)} ${sx(10)},${sy(-62)} ${sx(28)},${sy(-42)} S ${sx(15)},${sy(10)} ${sx(-15)},${sy(24)}`,
        color: COLORS[0], opacity: 0.6, anim: DANCE_ANIMS[4], dur: 4.0, delay: 0.4 },
      { d: `M ${sx(28)},${sy(15)} C ${sx(20)},${sy(-20)} ${sx(-25)},${sy(-58)} ${sx(-32)},${sy(-35)}`,
        color: COLORS[2], opacity: 0.55, anim: DANCE_ANIMS[2], dur: 3.5, delay: 0.8 },
      { d: `M ${sx(-18)},${sy(8)} C ${sx(-28)},${sy(-22)} ${sx(12)},${sy(-55)} ${sx(22)},${sy(-35)} S ${sx(8)},${sy(12)} ${sx(-18)},${sy(8)}`,
        color: COLORS[1], opacity: 0.65, anim: DANCE_ANIMS[0], dur: 5.5, delay: 1.2 },
      { d: `M ${sx(0)},${sy(28)} Q ${sx(-20)},${sy(-15)} ${sx(0)},${sy(-55)} Q ${sx(20)},${sy(-15)} ${sx(0)},${sy(28)}`,
        color: COLORS[3], opacity: 0.5, anim: DANCE_ANIMS[3], dur: 6.8, delay: 1.6 },
    ],

    // Member 4 (Mid right) — double helix + flourish
    [
      { d: `M ${sx(-22)},${sy(25)} C ${sx(20)},${sy(-10)} ${sx(-20)},${sy(-38)} ${sx(20)},${sy(-62)} C ${sx(30)},${sy(-72)} ${sx(15)},${sy(-82)} ${sx(0)},${sy(-72)}`,
        color: COLORS[1], opacity: 0.6, anim: DANCE_ANIMS[1], dur: 4.8, delay: 0.3 },
      { d: `M ${sx(22)},${sy(25)} C ${sx(-20)},${sy(-10)} ${sx(20)},${sy(-38)} ${sx(-20)},${sy(-62)} C ${sx(-30)},${sy(-72)} ${sx(-15)},${sy(-82)} ${sx(0)},${sy(-72)}`,
        color: COLORS[0], opacity: 0.55, anim: DANCE_ANIMS[3], dur: 5.5, delay: 0.7 },
      { d: `M ${sx(0)},${sy(28)} Q ${sx(-25)},${sy(-22)} ${sx(0)},${sy(-68)} Q ${sx(25)},${sy(-22)} ${sx(0)},${sy(28)}`,
        color: COLORS[2], opacity: 0.65, anim: DANCE_ANIMS[0], dur: 3.8, delay: 1.1 },
      { d: `M ${sx(-15)},${sy(15)} C ${sx(-30)},${sy(-5)} ${sx(0)},${sy(-50)} ${sx(15)},${sy(-65)} C ${sx(30)},${sy(-50)} ${sx(0)},${sy(-5)} ${sx(15)},${sy(15)}`,
        color: COLORS[3], opacity: 0.5, anim: DANCE_ANIMS[4], dur: 7.0, delay: 1.5 },
    ],

    // Member 5 (Outer left) — comet arcs + spiral flourish
    [
      { d: `M ${sx(-25)},${sy(20)} C ${sx(-15)},${sy(-30)} ${sx(20)},${sy(-58)} ${sx(28)},${sy(-32)} S ${sx(10)},${sy(20)} ${sx(-15)},${sy(24)}`,
        color: COLORS[2], opacity: 0.6, anim: DANCE_ANIMS[3], dur: 4.2, delay: 0.5 },
      { d: `M ${sx(20)},${sy(18)} Q ${sx(-15)},${sy(-42)} ${sx(-22)},${sy(-62)}`,
        color: COLORS[1], opacity: 0.55, anim: DANCE_ANIMS[0], dur: 3.3, delay: 0.9 },
      { d: `M ${sx(-18)},${sy(12)} Q ${sx(12)},${sy(-28)} ${sx(-10)},${sy(-55)}`,
        color: COLORS[0], opacity: 0.65, anim: DANCE_ANIMS[2], dur: 5.0, delay: 1.3 },
      { d: `M ${sx(8)},${sy(30)} C ${sx(22)},${sy(8)} ${sx(-12)},${sy(-38)} ${sx(-25)},${sy(-58)}`,
        color: COLORS[3], opacity: 0.5, anim: DANCE_ANIMS[4], dur: 6.2, delay: 1.7 },
    ],

    // Member 6 (Outer right) — whip lash + wing arc
    [
      { d: `M ${sx(25)},${sy(20)} C ${sx(15)},${sy(-30)} ${sx(-20)},${sy(-58)} ${sx(-28)},${sy(-32)} S ${sx(-10)},${sy(20)} ${sx(15)},${sy(24)}`,
        color: COLORS[0], opacity: 0.6, anim: DANCE_ANIMS[1], dur: 3.8, delay: 0.4 },
      { d: `M ${sx(-22)},${sy(15)} Q ${sx(18)},${sy(-35)} ${sx(25)},${sy(-60)}`,
        color: COLORS[2], opacity: 0.55, anim: DANCE_ANIMS[4], dur: 4.5, delay: 0.8 },
      { d: `M ${sx(15)},${sy(10)} Q ${sx(-15)},${sy(-32)} ${sx(10)},${sy(-58)}`,
        color: COLORS[1], opacity: 0.65, anim: DANCE_ANIMS[0], dur: 5.2, delay: 1.2 },
      { d: `M ${sx(-8)},${sy(30)} C ${sx(-22)},${sy(8)} ${sx(12)},${sy(-38)} ${sx(25)},${sy(-58)}`,
        color: COLORS[3], opacity: 0.5, anim: DANCE_ANIMS[2], dur: 6.0, delay: 1.6 },
    ],
  ];

  return curveSets[idx];
}

// Group sway durations and delays per member
const GROUP_SWAY_DURS = [6.0, 5.5, 7.0, 5.0, 6.5, 7.5, 5.8];
const GROUP_SWAY_DELAYS = [0, 0.5, 1.0, 1.5, 0.8, 2.0, 1.2];

const Scene3LightPaintDance2: React.FC = () => (
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
        <filter id="lp2-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="lp2-glow-wide" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="8" />
        </filter>
      </defs>

      <style>{`
        @keyframes lp2-dance-a {
          0%, 100% { transform: rotate(0deg) translateX(0) translateY(0); }
          25% { transform: rotate(5deg) translateX(8px) translateY(-5px); }
          50% { transform: rotate(-3deg) translateX(-4px) translateY(3px); }
          75% { transform: rotate(4deg) translateX(6px) translateY(-2px); }
        }
        @keyframes lp2-dance-b {
          0%, 100% { transform: rotate(0deg) translateX(0) scaleX(1); }
          30% { transform: rotate(-6deg) translateX(-10px) scaleX(0.95); }
          60% { transform: rotate(4deg) translateX(5px) scaleX(1.05); }
        }
        @keyframes lp2-dance-c {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          20% { transform: translateY(-12px) rotate(3deg); }
          50% { transform: translateY(6px) rotate(-4deg); }
          80% { transform: translateY(-4px) rotate(2deg); }
        }
        @keyframes lp2-dance-d {
          0%, 100% { transform: rotate(0deg) scale(1); }
          33% { transform: rotate(-8deg) scale(1.05); }
          66% { transform: rotate(6deg) scale(0.95); }
        }
        @keyframes lp2-dance-e {
          0%, 100% { transform: translateX(0) translateY(0) rotate(0deg); }
          15% { transform: translateX(10px) translateY(-8px) rotate(4deg); }
          40% { transform: translateX(-6px) translateY(4px) rotate(-3deg); }
          65% { transform: translateX(4px) translateY(-6px) rotate(2deg); }
          85% { transform: translateX(-8px) translateY(2px) rotate(-5deg); }
        }
        @keyframes lp2-group-sway {
          0%, 100% { transform: translateX(0) translateY(0); }
          30% { transform: translateX(-5px) translateY(-4px); }
          70% { transform: translateX(4px) translateY(3px); }
        }
      `}</style>

      {MEMBERS.map((m, memberIdx) => {
        const curves = getCurves(m, memberIdx);

        return (
          <g
            key={`lp2-member-${memberIdx}`}
            style={{
              animationName: 'lp2-group-sway',
              animationDuration: `${GROUP_SWAY_DURS[memberIdx]}s`,
              animationDelay: `${GROUP_SWAY_DELAYS[memberIdx]}s`,
              animationTimingFunction: 'ease-in-out',
              animationIterationCount: 'infinite',
              transformOrigin: `${m.x}px ${m.y}px`,
            }}
          >
            {curves.map((curve, ci) => (
              <g
                key={`lp2-c-${memberIdx}-${ci}`}
                style={{
                  animationName: curve.anim,
                  animationDuration: `${curve.dur}s`,
                  animationDelay: `${curve.delay}s`,
                  animationTimingFunction: 'ease-in-out',
                  animationIterationCount: 'infinite',
                  transformOrigin: `${m.x}px ${m.y}px`,
                }}
              >
                {/* Wide glow halo behind */}
                <path
                  d={curve.d}
                  fill="none"
                  stroke={curve.color}
                  strokeWidth={10}
                  strokeLinecap="round"
                  opacity={0.1}
                  filter="url(#lp2-glow-wide)"
                />

                {/* Core bright curve */}
                <path
                  d={curve.d}
                  fill="none"
                  stroke={curve.color}
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  opacity={curve.opacity}
                  filter="url(#lp2-glow)"
                />
              </g>
            ))}
          </g>
        );
      })}
    </svg>

    <MemberSpotlights />
  </div>
);

export default Scene3LightPaintDance2;
