import StageFloor from './stage/StageFloor';
import LEDWall from './stage/LEDWall';
import StageSymbols from './stage/StageSymbols';
import MemberSpotlights from './stage/MemberSpotlights';
import {
  HEUK,
  CONCERT_PURPLE,
} from '../../theme/colors';

/**
 * Scene3Brush — BTS members as Korean calligraphy brush strokes (서예).
 *
 * Each of the 7 members is represented by a bold, flowing ink stroke arranged
 * in V-formation. The strokes are filled paths that taper like real brush work,
 * with purple rim glow, wet-ink spots, and ink splatter accents.
 *
 * Built on top of Scene 3's stage (StageFloor, LEDWall, StageSymbols,
 * MemberSpotlights).
 */

// ─── Member positions (V-formation) ──────────────────────────────────────────

interface BrushMember {
  x: number;
  y: number;
  scale: number;
  /** Filled path for the calligraphy stroke shape */
  path: string;
  /** Outline path for stroke-dasharray draw animation (centerline) */
  drawPath: string;
  /** Total length estimate for drawPath (for dasharray) */
  drawLen: number;
  /** Delay before draw animation starts */
  delay: string;
  /** Wet-ink spot positions relative to member origin */
  inkSpots: { cx: number; cy: number; r: number }[];
  /** Ink splatter positions */
  splatters: { cx: number; cy: number; r: number; opacity: number }[];
}

// ─── 7 Unique Brush Stroke Paths ─────────────────────────────────────────────
// Each is a filled closed shape that tapers thin→thick→thin, roughly the
// height of a person (~140px tall). Origin near center of stroke.

/**
 * Member 0 — Center (leader): Tall bold vertical with dramatic hook at bottom.
 * Evokes the stroke in 나 — strong downward energy, hook curves left.
 */
const STROKE_0_FILL =
  'M -2,-70 C -4,-68 -7,-55 -9,-40 C -11,-25 -13,-10 -14,5 ' +
  'C -15,20 -14,35 -12,48 C -10,55 -8,60 -10,65 ' +
  'C -14,72 -22,74 -28,72 L -26,68 C -20,70 -14,68 -10,62 ' +
  'C -6,56 -8,48 -8,35 C -8,20 -7,5 -6,-10 ' +
  'C -5,-25 -3,-40 -1,-55 C 0,-62 1,-68 2,-70 Z';

const STROKE_0_DRAW =
  'M 0,-70 C -1,-55 -5,-30 -8,-10 C -11,10 -12,35 -11,50 C -10,60 -12,68 -20,72';

/**
 * Member 1 — Inner left: Diagonal sweep left-to-right with dot accent.
 * Evokes the first stroke of 가 — sharp diagonal energy.
 */
const STROKE_1_FILL =
  'M -20,-65 C -18,-63 -14,-56 -8,-44 C -2,-32 4,-18 9,-4 ' +
  'C 14,10 17,24 18,36 C 19,42 18,46 16,48 ' +
  'L 12,46 C 14,44 14,40 13,34 C 12,22 8,8 3,-6 ' +
  'C -2,-20 -8,-34 -14,-46 C -18,-54 -20,-60 -22,-65 Z ' +
  // dot accent upper right
  'M 22,-55 C 26,-53 28,-49 26,-45 C 24,-41 20,-40 16,-42 ' +
  'C 12,-44 11,-48 13,-52 C 15,-56 19,-57 22,-55 Z';

const STROKE_1_DRAW =
  'M -21,-65 C -14,-50 -2,-28 8,-6 C 14,10 17,30 16,46';

/**
 * Member 2 — Inner right: Curved arc with a flick at the end.
 * Flowing rightward energy like a crane's wing.
 */
const STROKE_2_FILL =
  'M 18,-60 C 14,-58 6,-48 0,-36 C -6,-24 -10,-10 -12,4 ' +
  'C -14,18 -12,32 -8,42 C -5,48 -2,52 2,56 ' +
  'C 6,60 12,62 18,60 L 16,56 C 12,58 6,56 2,52 ' +
  'C -2,48 -4,44 -6,38 C -8,28 -8,16 -6,2 ' +
  'C -4,-12 0,-26 6,-38 C 10,-46 14,-54 18,-58 Z';

const STROKE_2_DRAW =
  'M 18,-60 C 6,-44 -6,-20 -10,4 C -12,24 -8,42 0,52 C 8,58 16,58 18,56';

/**
 * Member 3 — Mid left: Sharp angular stroke with energy.
 * Like a sword slash / — dramatic diagonal with sharp terminus.
 */
const STROKE_3_FILL =
  'M -6,-55 C -4,-53 -1,-46 3,-36 C 7,-26 10,-14 12,-2 ' +
  'C 14,10 14,22 12,32 C 10,38 8,42 6,44 ' +
  'L 2,42 C 4,40 6,36 7,30 C 8,20 8,8 6,-4 ' +
  'C 4,-16 1,-28 -3,-38 C -6,-44 -8,-50 -10,-55 Z';

const STROKE_3_DRAW =
  'M -8,-55 C -2,-40 6,-18 10,0 C 14,18 12,34 6,44';

/**
 * Member 4 — Mid right: Flowing S-curve like 을.
 * Double curve — upper right, lower left — sinuous calligraphic energy.
 */
const STROKE_4_FILL =
  'M -8,-58 C -6,-56 0,-48 6,-38 C 12,-28 14,-18 12,-10 ' +
  'C 10,-2 4,4 -4,10 C -10,16 -14,24 -12,34 ' +
  'C -10,44 -4,50 4,52 L 2,56 C -6,54 -14,46 -16,36 ' +
  'C -18,24 -14,14 -6,8 C 0,2 6,-2 8,-8 ' +
  'C 10,-14 8,-24 4,-34 C 0,-42 -4,-50 -10,-58 Z';

const STROKE_4_DRAW =
  'M -9,-58 C 0,-44 12,-26 12,-10 C 12,0 2,8 -8,14 C -16,22 -14,38 -2,52';

/**
 * Member 5 — Outer left: Short powerful horizontal-to-vertical like ㄱ.
 * Starts horizontal, breaks sharply downward — compact power.
 */
const STROKE_5_FILL =
  // Horizontal stroke
  'M -24,-40 C -22,-38 -14,-36 -4,-35 C 6,-34 14,-34 20,-36 ' +
  'L 20,-32 C 14,-30 6,-30 -4,-31 C -14,-32 -22,-34 -24,-36 Z ' +
  // Vertical stroke descending from the right end
  'M 17,-36 C 19,-34 20,-28 20,-18 C 20,-8 19,4 18,16 ' +
  'C 17,28 16,38 14,46 L 10,44 C 12,36 13,26 14,14 ' +
  'C 15,2 16,-10 16,-20 C 16,-28 15,-34 13,-36 Z';

const STROKE_5_DRAW =
  'M -24,-38 C -10,-34 8,-34 20,-34 C 20,-34 18,-14 16,10 C 15,28 14,40 12,46';

/**
 * Member 6 — Outer right: Gentle flowing curve like a crane's neck.
 * Elongated S with grace — thin at top, flowing thickness, tapered end.
 */
const STROKE_6_FILL =
  'M 4,-62 C 2,-60 -2,-52 -6,-42 C -10,-32 -12,-22 -12,-12 ' +
  'C -12,-2 -10,8 -6,18 C -2,28 2,36 6,42 ' +
  'C 10,48 12,52 12,54 L 8,52 C 8,50 6,46 2,40 ' +
  'C -2,34 -6,26 -8,16 C -10,6 -10,-4 -8,-14 ' +
  'C -6,-24 -4,-34 0,-44 C 2,-50 4,-56 6,-62 Z';

const STROKE_6_DRAW =
  'M 5,-62 C 0,-46 -8,-26 -10,-8 C -12,8 -6,28 4,42 C 10,50 12,54 12,54';


const MEMBERS: BrushMember[] = [
  {
    x: 960, y: 640, scale: 1.0,
    path: STROKE_0_FILL, drawPath: STROKE_0_DRAW, drawLen: 320,
    delay: '0s',
    inkSpots: [
      { cx: -12, cy: 10, r: 4 },
      { cx: -8, cy: -20, r: 3 },
      { cx: -18, cy: 68, r: 5 },
    ],
    splatters: [
      { cx: -16, cy: 15, r: 2, opacity: 0.25 },
      { cx: 6, cy: -30, r: 1.5, opacity: 0.2 },
      { cx: -24, cy: 60, r: 1, opacity: 0.15 },
      { cx: -5, cy: 40, r: 2.5, opacity: 0.1 },
      { cx: 4, cy: -50, r: 1, opacity: 0.3 },
      { cx: -20, cy: 30, r: 1.5, opacity: 0.12 },
      { cx: -30, cy: 74, r: 2, opacity: 0.18 },
      { cx: -6, cy: -60, r: 1, opacity: 0.2 },
      { cx: -14, cy: 55, r: 1.5, opacity: 0.15 },
      { cx: 3, cy: 20, r: 1, opacity: 0.22 },
      { cx: -10, cy: -5, r: 2, opacity: 0.1 },
      { cx: -22, cy: 50, r: 1.5, opacity: 0.14 },
    ],
  },
  {
    x: 760, y: 600, scale: 0.95,
    path: STROKE_1_FILL, drawPath: STROKE_1_DRAW, drawLen: 280,
    delay: '0.2s',
    inkSpots: [
      { cx: 4, cy: -10, r: 4 },
      { cx: -8, cy: -40, r: 3 },
      { cx: 22, cy: -50, r: 3.5 },
    ],
    splatters: [
      { cx: -14, cy: -50, r: 2, opacity: 0.2 },
      { cx: 12, cy: 10, r: 1.5, opacity: 0.25 },
      { cx: -4, cy: -25, r: 1, opacity: 0.15 },
      { cx: 16, cy: 30, r: 2, opacity: 0.12 },
      { cx: 8, cy: -55, r: 1.5, opacity: 0.18 },
      { cx: -10, cy: -35, r: 1, opacity: 0.22 },
      { cx: 20, cy: 40, r: 2.5, opacity: 0.1 },
      { cx: -18, cy: -60, r: 1, opacity: 0.2 },
      { cx: 6, cy: 20, r: 1.5, opacity: 0.15 },
      { cx: 26, cy: -48, r: 1, opacity: 0.3 },
    ],
  },
  {
    x: 1160, y: 600, scale: 0.95,
    path: STROKE_2_FILL, drawPath: STROKE_2_DRAW, drawLen: 300,
    delay: '0.4s',
    inkSpots: [
      { cx: -10, cy: 8, r: 4 },
      { cx: 0, cy: -30, r: 3 },
      { cx: 10, cy: 50, r: 3.5 },
    ],
    splatters: [
      { cx: 20, cy: -55, r: 2, opacity: 0.2 },
      { cx: -8, cy: 20, r: 1.5, opacity: 0.25 },
      { cx: 14, cy: -40, r: 1, opacity: 0.15 },
      { cx: -14, cy: 30, r: 2, opacity: 0.12 },
      { cx: 6, cy: -10, r: 1.5, opacity: 0.18 },
      { cx: -2, cy: 45, r: 1, opacity: 0.22 },
      { cx: 22, cy: -30, r: 2.5, opacity: 0.1 },
      { cx: -12, cy: 10, r: 1, opacity: 0.2 },
      { cx: 8, cy: 55, r: 1.5, opacity: 0.15 },
      { cx: 18, cy: -48, r: 1, opacity: 0.14 },
      { cx: -6, cy: 38, r: 2, opacity: 0.18 },
    ],
  },
  {
    x: 580, y: 560, scale: 0.9,
    path: STROKE_3_FILL, drawPath: STROKE_3_DRAW, drawLen: 240,
    delay: '0.6s',
    inkSpots: [
      { cx: 8, cy: -5, r: 3.5 },
      { cx: -4, cy: -38, r: 3 },
    ],
    splatters: [
      { cx: -10, cy: -50, r: 1.5, opacity: 0.2 },
      { cx: 14, cy: 10, r: 2, opacity: 0.25 },
      { cx: 2, cy: -20, r: 1, opacity: 0.15 },
      { cx: 10, cy: 30, r: 1.5, opacity: 0.12 },
      { cx: -6, cy: -30, r: 2, opacity: 0.18 },
      { cx: 8, cy: 38, r: 1, opacity: 0.22 },
      { cx: -2, cy: 15, r: 2.5, opacity: 0.1 },
      { cx: 12, cy: -45, r: 1, opacity: 0.2 },
      { cx: 6, cy: 25, r: 1.5, opacity: 0.15 },
      { cx: -8, cy: -10, r: 1, opacity: 0.14 },
    ],
  },
  {
    x: 1340, y: 560, scale: 0.9,
    path: STROKE_4_FILL, drawPath: STROKE_4_DRAW, drawLen: 300,
    delay: '0.8s',
    inkSpots: [
      { cx: -8, cy: 20, r: 4 },
      { cx: 8, cy: -18, r: 3 },
      { cx: -2, cy: 48, r: 3.5 },
    ],
    splatters: [
      { cx: -12, cy: -50, r: 2, opacity: 0.2 },
      { cx: 10, cy: 5, r: 1.5, opacity: 0.25 },
      { cx: -6, cy: 30, r: 1, opacity: 0.15 },
      { cx: 14, cy: -30, r: 2, opacity: 0.12 },
      { cx: 0, cy: 42, r: 1.5, opacity: 0.18 },
      { cx: -10, cy: -15, r: 1, opacity: 0.22 },
      { cx: 6, cy: 50, r: 2.5, opacity: 0.1 },
      { cx: -4, cy: -40, r: 1, opacity: 0.2 },
      { cx: 12, cy: 15, r: 1.5, opacity: 0.15 },
      { cx: -14, cy: 35, r: 1, opacity: 0.14 },
      { cx: 4, cy: -5, r: 2, opacity: 0.18 },
    ],
  },
  {
    x: 420, y: 530, scale: 0.85,
    path: STROKE_5_FILL, drawPath: STROKE_5_DRAW, drawLen: 260,
    delay: '1.0s',
    inkSpots: [
      { cx: 0, cy: -34, r: 3.5 },
      { cx: 16, cy: 10, r: 4 },
    ],
    splatters: [
      { cx: -20, cy: -42, r: 2, opacity: 0.2 },
      { cx: 10, cy: -32, r: 1.5, opacity: 0.25 },
      { cx: 22, cy: -30, r: 1, opacity: 0.15 },
      { cx: 18, cy: 25, r: 2, opacity: 0.12 },
      { cx: -10, cy: -36, r: 1.5, opacity: 0.18 },
      { cx: 12, cy: 40, r: 1, opacity: 0.22 },
      { cx: -16, cy: -38, r: 2.5, opacity: 0.1 },
      { cx: 20, cy: 5, r: 1, opacity: 0.2 },
      { cx: 14, cy: 30, r: 1.5, opacity: 0.15 },
      { cx: -8, cy: -33, r: 1, opacity: 0.14 },
    ],
  },
  {
    x: 1500, y: 530, scale: 0.85,
    path: STROKE_6_FILL, drawPath: STROKE_6_DRAW, drawLen: 280,
    delay: '1.2s',
    inkSpots: [
      { cx: -8, cy: -10, r: 4 },
      { cx: 6, cy: 35, r: 3 },
      { cx: 0, cy: -45, r: 3.5 },
    ],
    splatters: [
      { cx: 8, cy: -58, r: 2, opacity: 0.2 },
      { cx: -14, cy: 0, r: 1.5, opacity: 0.25 },
      { cx: 2, cy: -30, r: 1, opacity: 0.15 },
      { cx: -6, cy: 25, r: 2, opacity: 0.12 },
      { cx: 10, cy: -45, r: 1.5, opacity: 0.18 },
      { cx: 14, cy: 48, r: 1, opacity: 0.22 },
      { cx: -10, cy: -20, r: 2.5, opacity: 0.1 },
      { cx: 4, cy: 42, r: 1, opacity: 0.2 },
      { cx: -4, cy: 10, r: 1.5, opacity: 0.15 },
      { cx: 12, cy: -35, r: 1, opacity: 0.14 },
      { cx: 0, cy: 50, r: 2, opacity: 0.18 },
    ],
  },
];


export default function Scene3Brush() {
  return (
    <div
      style={{
        position: 'relative',
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        background: 'linear-gradient(180deg, #050510 0%, #0A0515 40%, #1A1025 100%)',
      }}
    >
      {/* Stage infrastructure layers */}
      <StageFloor />
      <LEDWall />
      <StageSymbols />

      {/* ── Brush Stroke Members ─────────────────────────────────────────── */}
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
          {/* Blur filter for purple glow behind strokes */}
          <filter id="brush-glow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="3" />
          </filter>

          {/* Blur filter for wet ink spots */}
          <filter id="ink-spot-blur" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1.5" />
          </filter>

          {/* Per-member radial gradients: purple ink sheen overlay */}
          {MEMBERS.map((_, i) => (
            <radialGradient
              key={`ink-sheen-${i}`}
              id={`ink-sheen-${i}`}
              cx="50%"
              cy="50%"
              r="60%"
            >
              <stop offset="0%" stopColor={CONCERT_PURPLE} stopOpacity={0.15} />
              <stop offset="100%" stopColor={CONCERT_PURPLE} stopOpacity={0} />
            </radialGradient>
          ))}
        </defs>

        {MEMBERS.map((m, i) => {
          const swayDurations = ['4s', '4.5s', '3.8s', '3.5s', '4.2s', '5s', '3.2s'];
          return (
            <g
              key={`brush-member-${i}`}
              transform={`translate(${m.x}, ${m.y}) scale(${m.scale})`}
              style={{
                animationName: 'member-sway',
                animationDuration: swayDurations[i],
                animationDelay: m.delay,
                animationTimingFunction: 'ease-in-out',
                animationIterationCount: 'infinite',
              }}
            >
              {/* 1. Purple glow aura behind the stroke */}
              <path
                d={m.path}
                fill="none"
                stroke={CONCERT_PURPLE}
                strokeWidth={3}
                opacity={0.2}
                filter="url(#brush-glow)"
                style={{
                  animationName: 'backlight-pulse',
                  animationDuration: '3s',
                  animationDelay: m.delay,
                  animationTimingFunction: 'ease-in-out',
                  animationIterationCount: 'infinite',
                }}
              />

              {/* 2. Main ink fill — the calligraphy stroke */}
              <path
                d={m.path}
                fill={HEUK}
                opacity={0.85}
              />

              {/* 3. Purple sheen gradient overlay */}
              <path
                d={m.path}
                fill={`url(#ink-sheen-${i})`}
              />

              {/* 4. Draw animation — centerline that "paints" itself on */}
              <path
                d={m.drawPath}
                fill="none"
                stroke={CONCERT_PURPLE}
                strokeWidth={2}
                strokeLinecap="round"
                opacity={0.4}
                strokeDasharray={m.drawLen}
                strokeDashoffset={m.drawLen}
                style={{
                  animationName: 'brush-draw',
                  animationDuration: '1.5s',
                  animationDelay: m.delay,
                  animationTimingFunction: 'ease-out',
                  animationFillMode: 'forwards',
                  animationIterationCount: 1,
                }}
              />

              {/* 5. Wet-ink spots — circles near thick parts */}
              {m.inkSpots.map((spot, j) => (
                <circle
                  key={`ink-${i}-${j}`}
                  cx={spot.cx}
                  cy={spot.cy}
                  r={spot.r}
                  fill={HEUK}
                  opacity={0.5}
                  filter="url(#ink-spot-blur)"
                />
              ))}

              {/* 6. Ink splatter accents — tiny scattered circles */}
              {m.splatters.map((sp, j) => (
                <circle
                  key={`splat-${i}-${j}`}
                  cx={sp.cx}
                  cy={sp.cy}
                  r={sp.r}
                  fill={HEUK}
                  opacity={sp.opacity}
                />
              ))}
            </g>
          );
        })}
      </svg>

      {/* Spotlights on top */}
      <MemberSpotlights />
    </div>
  );
}
