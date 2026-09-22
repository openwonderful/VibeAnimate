import React from 'react';
import { useAnimTime, loopPhase } from '../../../hooks/useAnimTime';

/**
 * CloudLayer — Seven traditional Korean cloud formations (구름문) drifting
 * across the scene, accompanied by a few tiny "baby" clouds.
 *
 * Each cloud is an inline SVG group composed of:
 *   - A horizontal base ellipse
 *   - 3-4 stacked rounded bumps (overlapping ellipses)
 *   - Curling wisp tails (cubic Bezier paths)
 *   - Internal contour lines for depth
 *   - A linear gradient fill from translucent white
 *
 * z-index 30 — above stars and moon, below foreground elements.
 */

/* ------------------------------------------------------------------ */
/*  Cloud instance descriptors                                        */
/* ------------------------------------------------------------------ */

interface CloudInstance {
  /** Horizontal position (CSS %, used as the animation starting point) */
  x: number;
  /** Vertical position (CSS %) */
  y: number;
  /** Uniform scale */
  scale: number;
  /** 'ltr' or 'rtl' drift direction */
  direction: 'ltr' | 'rtl';
  /** Animation duration in seconds */
  duration: number;
  /** Negative animation-delay so clouds start distributed */
  delay: number;
}

const CLOUDS: CloudInstance[] = [
  { x: 5,   y: 8,  scale: 0.85, direction: 'ltr', duration: 78,  delay: -12 },
  { x: 25,  y: 18, scale: 1.3,  direction: 'rtl', duration: 92,  delay: -40 },
  { x: 50,  y: 12, scale: 0.7,  direction: 'ltr', duration: 65,  delay: -28 },
  { x: 72,  y: 30, scale: 1.1,  direction: 'rtl', duration: 85,  delay: -55 },
  { x: 15,  y: 40, scale: 0.5,  direction: 'ltr', duration: 95,  delay: -70 },
  { x: 60,  y: 45, scale: 0.65, direction: 'rtl', duration: 50,  delay: -5  },
  { x: 88,  y: 22, scale: 0.9,  direction: 'ltr', duration: 72,  delay: -35 },
];

/** Tiny companion clouds near some main clouds. */
interface BabyCloud {
  x: number;
  y: number;
  scale: number;
  direction: 'ltr' | 'rtl';
  duration: number;
  delay: number;
}

const BABY_CLOUDS: BabyCloud[] = [
  { x: 30,  y: 15, scale: 0.25, direction: 'ltr', duration: 80,  delay: -18 },
  { x: 68,  y: 34, scale: 0.3,  direction: 'rtl', duration: 70,  delay: -50 },
  { x: 48,  y: 42, scale: 0.35, direction: 'ltr', duration: 60,  delay: -30 },
];

/* ------------------------------------------------------------------ */
/*  Cloud shape component                                             */
/* ------------------------------------------------------------------ */

/**
 * A single 구름문 cloud shape rendered as an SVG `<g>`.
 * All coordinates are relative to the group origin (0, 0);
 * the parent applies translation and scaling.
 */
const CloudShape: React.FC<{ id: string }> = ({ id }) => (
  <g>
    <defs>
      <linearGradient id={`cloud-fill-${id}`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%"   stopColor="#FFFFFF" stopOpacity={0.7} />
        <stop offset="100%" stopColor="#FFFFFF" stopOpacity={0.3} />
      </linearGradient>
    </defs>

    {/* ── Curling wisp tails ──────────────────────────────────── */}
    {/* Left wisp */}
    <path
      d="M -55 0 C -72 -6, -80 8, -90 2 C -96 -2, -88 -12, -78 -8"
      fill="none"
      stroke="#FFFFFF"
      strokeWidth={1.2}
      opacity={0.3}
      strokeLinecap="round"
    />
    {/* Right wisp */}
    <path
      d="M 55 0 C 72 -4, 82 10, 92 4 C 100 -1, 90 -10, 80 -6"
      fill="none"
      stroke="#FFFFFF"
      strokeWidth={1.2}
      opacity={0.3}
      strokeLinecap="round"
    />

    {/* ── Base ellipse ────────────────────────────────────────── */}
    <ellipse
      cx={0}
      cy={0}
      rx={55}
      ry={12}
      fill={`url(#cloud-fill-${id})`}
    />

    {/* ── Stacked bumps (top) ─────────────────────────────────── */}
    <ellipse cx={-20} cy={-10} rx={22} ry={16} fill={`url(#cloud-fill-${id})`} />
    <ellipse cx={8}   cy={-16} rx={26} ry={20} fill={`url(#cloud-fill-${id})`} />
    <ellipse cx={30}  cy={-8}  rx={18} ry={14} fill={`url(#cloud-fill-${id})`} />
    <ellipse cx={-8}  cy={-22} rx={16} ry={11} fill={`url(#cloud-fill-${id})`} />

    {/* ── Internal contour lines ──────────────────────────────── */}
    {/* These thin white strokes suggest volume, following the bump
        outlines at slightly reduced radii. */}
    <ellipse
      cx={-20} cy={-10} rx={18} ry={12}
      fill="none" stroke="#FFFFFF" strokeWidth={0.5} opacity={0.15}
    />
    <ellipse
      cx={8} cy={-16} rx={21} ry={15}
      fill="none" stroke="#FFFFFF" strokeWidth={0.5} opacity={0.12}
    />
    <ellipse
      cx={30} cy={-8} rx={14} ry={10}
      fill="none" stroke="#FFFFFF" strokeWidth={0.5} opacity={0.15}
    />
    {/* Horizontal base contour */}
    <ellipse
      cx={0} cy={0} rx={48} ry={8}
      fill="none" stroke="#FFFFFF" strokeWidth={0.4} opacity={0.1}
    />

    {/* ── Decorative inner curls (구름문 motif) ────────────────── */}
    <path
      d="M -12 -6 C -16 -14, -4 -18, -2 -12"
      fill="none"
      stroke="#FFFFFF"
      strokeWidth={0.6}
      opacity={0.12}
      strokeLinecap="round"
    />
    <path
      d="M 16 -10 C 12 -20, 24 -22, 24 -14"
      fill="none"
      stroke="#FFFFFF"
      strokeWidth={0.6}
      opacity={0.1}
      strokeLinecap="round"
    />
  </g>
);

/* ------------------------------------------------------------------ */
/*  Simplified baby-cloud shape                                       */
/* ------------------------------------------------------------------ */

const BabyCloudShape: React.FC<{ id: string }> = ({ id }) => (
  <g>
    <defs>
      <linearGradient id={`baby-cloud-fill-${id}`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%"   stopColor="#FFFFFF" stopOpacity={0.5} />
        <stop offset="100%" stopColor="#FFFFFF" stopOpacity={0.2} />
      </linearGradient>
    </defs>

    <ellipse cx={0} cy={0} rx={36} ry={8} fill={`url(#baby-cloud-fill-${id})`} />
    <ellipse cx={-8} cy={-7} rx={14} ry={10} fill={`url(#baby-cloud-fill-${id})`} />
    <ellipse cx={10} cy={-9} rx={16} ry={12} fill={`url(#baby-cloud-fill-${id})`} />
  </g>
);

/* ------------------------------------------------------------------ */
/*  CloudLayer (main export)                                          */
/* ------------------------------------------------------------------ */

const CloudLayer: React.FC = () => {
  const t = useAnimTime();

  // float-cloud-ltr: translateX(-350px → calc(100vw + 350px)) linear
  // float-cloud-rtl: translateX(calc(100vw + 350px) → -350px) linear
  const driftTransform = (dir: 'ltr' | 'rtl', duration: number, delay: number): string => {
    const p = loopPhase(t, duration, delay);
    if (dir === 'ltr') {
      return `translateX(calc(${-350 + 700 * p}px + ${100 * p}vw))`;
    }
    return `translateX(calc(${350 - 700 * p}px + ${100 * (1 - p)}vw))`;
  };

  return (
    <svg
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 30,
        pointerEvents: 'none',
        willChange: 'transform',
      }}
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid slice"
    >
      {/* ── Main clouds ─────────────────────────────────────────── */}
      {CLOUDS.map((cloud, i) => (
        <g
          key={`cloud-${i}`}
          style={{
            transform: driftTransform(cloud.direction, cloud.duration, cloud.delay),
            willChange: 'transform',
          }}
        >
          <g
            transform={`translate(${(cloud.x / 100) * 1920}, ${(cloud.y / 100) * 1080}) scale(${cloud.scale})`}
          >
            <CloudShape id={`main-${i}`} />
          </g>
        </g>
      ))}

      {/* ── Baby clouds ─────────────────────────────────────────── */}
      {BABY_CLOUDS.map((bc, i) => (
        <g
          key={`baby-${i}`}
          style={{
            transform: driftTransform(bc.direction, bc.duration, bc.delay),
            willChange: 'transform',
          }}
        >
          <g
            transform={`translate(${(bc.x / 100) * 1920}, ${(bc.y / 100) * 1080}) scale(${bc.scale})`}
          >
            <BabyCloudShape id={`baby-${i}`} />
          </g>
        </g>
      ))}
    </svg>
  );
};

export default CloudLayer;
