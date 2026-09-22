import React from 'react';
import {
  JEOK,
  HWANG,
  CORAL_PINK,
  SOFT_PEACH,
  WARM_CREAM,
} from '../../../theme/colors';
import { useAnimTime, loopPhase, keyframeLerp } from '../../../hooks/useAnimTime';

/**
 * Ribbons — Flowing hanbok sash ribbons as filled shapes with silk-like sheen.
 * Each ribbon is a closed path (two parallel bezier edges) creating a true
 * ribbon surface with width variation, gradient fills, and highlight edges.
 */

interface RibbonDef {
  /** Top edge bezier path */
  topEdge: string;
  /** Bottom edge bezier path (drawn in reverse to close the shape) */
  bottomEdge: string;
  animation: string;
  duration: string;
  delay?: string;
  opacity: number;
  id: string;
}

const ribbons: RibbonDef[] = [
  {
    id: 'r1',
    // Gentle flowing S-curve from upper-left, swooping down-right
    // The top and bottom edges diverge and converge to create width variation
    topEdge: 'M 60 320 C 120 295, 200 280, 280 300 C 360 320, 330 370, 360 400 C 380 420, 400 445, 420 465',
    bottomEdge: 'L 425 458 C 405 438, 386 414, 368 394 C 340 365, 368 316, 288 296 C 210 276, 128 290, 68 314 Z',
    animation: 'ribbon-flow',
    duration: '7s',
    opacity: 0.35,
  },
  {
    id: 'r2',
    // Mirror ribbon from upper-right, swooping down-left
    topEdge: 'M 940 310 C 890 290, 830 285, 770 305 C 710 325, 730 365, 700 395 C 680 415, 660 440, 645 458',
    bottomEdge: 'L 652 452 C 667 434, 686 410, 706 390 C 736 360, 718 320, 778 300 C 838 280, 896 284, 946 304 Z',
    animation: 'ribbon-flow-alt',
    duration: '9s',
    opacity: 0.28,
  },
];

const Ribbons: React.FC = () => {
  const t = useAnimTime();

  // ribbon-flow:     Y 0→12→-6→0 and rot 0→1→-0.5→0 at 0,33,66,100 ease-in-out, 7s
  // ribbon-flow-alt: Y 0→-10→8→0 and rot 0→-0.8→0.6→0 at 0,40,70,100 ease-in-out, 9s
  const flowTransform = (name: string, durationSec: number, delaySec: number): string => {
    const p = loopPhase(t, durationSec, delaySec);
    const stops = name === 'ribbon-flow'
      ? {
          y:   [ { at: 0, value: 0 }, { at: 0.33, value: 12 }, { at: 0.66, value: -6 }, { at: 1, value: 0 } ],
          rot: [ { at: 0, value: 0 }, { at: 0.33, value: 1 },  { at: 0.66, value: -0.5 }, { at: 1, value: 0 } ],
        }
      : {
          y:   [ { at: 0, value: 0 }, { at: 0.40, value: -10 }, { at: 0.70, value: 8 }, { at: 1, value: 0 } ],
          rot: [ { at: 0, value: 0 }, { at: 0.40, value: -0.8 }, { at: 0.70, value: 0.6 }, { at: 1, value: 0 } ],
        };
    const y = keyframeLerp(p, stops.y);
    const rot = keyframeLerp(p, stops.rot);
    return `translateY(${y}px) rotate(${rot}deg)`;
  };

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 70,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
      aria-hidden="true"
    >
      {ribbons.map((ribbon) => {
        const fullPath = `${ribbon.topEdge} ${ribbon.bottomEdge}`;
        // A center-line path for the highlight thread (average of the two edges)
        return (
          <svg
            key={ribbon.id}
            viewBox="0 0 1000 1000"
            width="100%"
            height="100%"
            preserveAspectRatio="xMidYMid meet"
            style={{
              position: 'absolute',
              inset: 0,
              transform: flowTransform(
                ribbon.animation,
                parseFloat(ribbon.duration),
                parseFloat(ribbon.delay ?? '0'),
              ),
              opacity: ribbon.opacity,
            }}
          >
            <defs>
              {/* Silk sheen gradient across the ribbon width */}
              <linearGradient
                id={`ribbon-silk-${ribbon.id}`}
                x1="0%"
                y1="0%"
                x2="100%"
                y2="100%"
              >
                <stop offset="0%" stopColor={JEOK} stopOpacity={0.9} />
                <stop offset="30%" stopColor={CORAL_PINK} stopOpacity={1} />
                <stop offset="55%" stopColor={SOFT_PEACH} stopOpacity={0.95} />
                <stop offset="80%" stopColor={CORAL_PINK} stopOpacity={0.9} />
                <stop offset="100%" stopColor={JEOK} stopOpacity={0.85} />
              </linearGradient>

              {/* Soft glow filter for silk sheen */}
              <filter id={`ribbon-glow-${ribbon.id}`}>
                <feGaussianBlur stdDeviation="1.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Layer 1: Soft shadow underneath */}
            <path
              d={fullPath}
              fill="rgba(0,0,0,0.15)"
              transform="translate(2, 3)"
              filter={`url(#ribbon-glow-${ribbon.id})`}
            />

            {/* Layer 2: Main ribbon surface */}
            <path
              d={fullPath}
              fill={`url(#ribbon-silk-${ribbon.id})`}
            />

            {/* Layer 3: Silk highlight along center */}
            <path
              d={ribbon.topEdge}
              fill="none"
              stroke={WARM_CREAM}
              strokeWidth={0.8}
              opacity={0.35}
              strokeLinecap="round"
            />

            {/* Layer 4: Gold embroidery thread along center */}
            <path
              d={ribbon.topEdge}
              fill="none"
              stroke={HWANG}
              strokeWidth={0.4}
              opacity={0.3}
              strokeLinecap="round"
              strokeDasharray="8 12"
            />
          </svg>
        );
      })}
    </div>
  );
};

export default Ribbons;
