import StageSymbols, { type SymbolConfig } from '../act2/stage/StageSymbols'

/**
 * ArirangAnimatedCalligraphy — Calligraphy reveal (서예) scene.
 *
 * A calligrapher draws the three Arirang symbols one stroke at a time.
 * WHITE on BLACK. Each symbol's outline draws on via stroke-dashoffset
 * animation, then the filled symbol fades in beneath. After all three
 * are visible there is a sustain period, then everything fades to black
 * and the cycle repeats.
 *
 * Timeline (15s loop):
 *   0-2s   S1 outline draws
 *   1.5-3s S1 fill fades in
 *   2-4s   S2 outline draws
 *   3.5-5s S2 fill fades in
 *   4-6s   S3 outline draws
 *   5.5-7s S3 fill fades in
 *   7-11s  All visible (sustain)
 *   11-13s Everything fades out
 *   13-15s Black pause, then loop
 *
 * Access via ?scene=arirang_calligraphy
 */

const SYMBOLS: SymbolConfig[] = [
  { cx: 360, cy: 540, size: 250, variant: 'ring', holeRatio: 0.54 },
  { cx: 960, cy: 540, size: 250, variant: 'barred-circle', barCount: 2, gapRatio: 0.13, curveAmount: 35 },
  { cx: 1560, cy: 540, size: 250, variant: 'grid-circle', barCount: 2, gapRatio: 0.13, verticalBarPos: 0.50, curveAmount: 35 },
]

// ── Geometry helpers ──────────────────────────────────────────────

const SIZE = 250
const CY = 540
const GAP_H = SIZE * 2 * 0.13           // 65
const SECTION_H = (SIZE * 2 - 2 * GAP_H) / 3 // 123.33
const BAR_0_Y = CY - SIZE + SECTION_H   // 413.33 (top of bar 0 gap)
const BAR_1_Y = BAR_0_Y + GAP_H + SECTION_H // 601.67 (top of bar 1 gap)
const BAR_0_MID = BAR_0_Y + GAP_H / 2   // 445.83 (center of bar 0 gap)
const BAR_1_MID = BAR_1_Y + GAP_H / 2   // 634.17 (center of bar 1 gap)

/** Circle as a path — pathLength works reliably on <path> */
function circlePath(cx: number, cy: number, r: number) {
  return `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx} ${cy + r} A ${r} ${r} 0 1 1 ${cx} ${cy - r}`
}

/** Half-chord length at a given y on a circle */
function halfChord(r: number, y: number, cy: number) {
  return Math.sqrt(r * r - (y - cy) * (y - cy))
}

/** Horizontal bar as an S-curve path matching StageSymbols curvature */
function barPath(cx: number, r: number, barMidY: number, curve: number) {
  const hc = halfChord(r, barMidY, CY)
  const x1 = cx - hc, x2 = cx + hc
  const t = hc * 0.6 // control point distance
  return `M ${x1} ${barMidY} C ${x1 + t} ${barMidY - curve * 0.3}, ${x2 - t} ${barMidY + curve * 0.3}, ${x2} ${barMidY}`
}

/** Vertical bar line as a path */
function vertPath(cx: number) {
  // Spans from bottom of bar 0 gap to top of bar 1 gap
  return `M ${cx} ${BAR_0_Y + GAP_H} L ${cx} ${BAR_1_Y}`
}

// ── Animation helpers ─────────────────────────────────────────────

const DUR = '15s'
const anim = (name: string): React.CSSProperties => ({
  animationName: name,
  animationDuration: DUR,
  animationTimingFunction: 'linear',
  animationIterationCount: 'infinite',
  animationFillMode: 'both',
})

// ── Clip regions (show one symbol per StageSymbols instance) ──────
// Each StageSymbols renders ALL 3 symbols (so SVG IDs don't clash),
// but the wrapper clips to reveal only the target symbol's area.
const CLIPS = [
  'inset(0 65% 0 0)',        // S1: left ~35%
  'inset(0 34% 0 34%)',      // S2: middle ~32%
  'inset(0 0 0 65%)',        // S3: right ~35%
]

export default function ArirangAnimatedCalligraphy() {
  return (
    <div style={{
      position: 'relative',
      width: '100vw',
      height: '100vh',
      overflow: 'hidden',
      background: '#000000',
      animation: 'arirang-emerge-scene 2.5s cubic-bezier(0.23, 1, 0.32, 1) both',
    }}>

      {/* ═══ Fill layers (z:3) — each clips to one symbol region ═══ */}
      {(['seoye-fill-s1', 'seoye-fill-s2', 'seoye-fill-s3'] as const).map((kf, i) => (
        <div key={kf} style={{
          position: 'absolute', inset: 0, zIndex: 3,
          clipPath: CLIPS[i],
          ...anim(kf),
        }}>
          <StageSymbols
            symbols={SYMBOLS}
            color="#ffffff"
            opacity={0.85}
            glowBlur={5}
            pulseDuration={0}
          />
        </div>
      ))}

      {/* ═══ Stroke outlines (z:5) — <path> elements for reliable draw ═══ */}
      <svg
        style={{
          position: 'absolute', inset: 0,
          width: '100%', height: '100%',
          zIndex: 5, pointerEvents: 'none',
        }}
        viewBox="0 0 1920 1080"
        preserveAspectRatio="none"
      >
        {/* ── Symbol 1: 아 (ring) ── */}
        {/* Outer circle */}
        <path
          d={circlePath(360, CY, 250)}
          pathLength={1} strokeDasharray="1"
          stroke="#ffffff" strokeWidth={3} fill="none"
          style={anim('seoye-stroke-s1a')}
        />
        {/* Inner circle */}
        <path
          d={circlePath(360, CY, 135)}
          pathLength={1} strokeDasharray="1"
          stroke="#ffffff" strokeWidth={3} fill="none"
          style={anim('seoye-stroke-s1b')}
        />

        {/* ── Symbol 2: 리 (barred-circle) ── */}
        {/* Outer circle */}
        <path
          d={circlePath(960, CY, 250)}
          pathLength={1} strokeDasharray="1"
          stroke="#ffffff" strokeWidth={3} fill="none"
          style={anim('seoye-stroke-s2a')}
        />
        {/* Top bar — S-curve */}
        <path
          d={barPath(960, 250, BAR_0_MID, 35)}
          pathLength={1} strokeDasharray="1"
          stroke="#ffffff" strokeWidth={3} fill="none"
          style={anim('seoye-stroke-s2b')}
        />
        {/* Bottom bar — S-curve */}
        <path
          d={barPath(960, 250, BAR_1_MID, 35)}
          pathLength={1} strokeDasharray="1"
          stroke="#ffffff" strokeWidth={3} fill="none"
          style={anim('seoye-stroke-s2b')}
        />

        {/* ── Symbol 3: 랑 (grid-circle) ── */}
        {/* Outer circle */}
        <path
          d={circlePath(1560, CY, 250)}
          pathLength={1} strokeDasharray="1"
          stroke="#ffffff" strokeWidth={3} fill="none"
          style={anim('seoye-stroke-s3a')}
        />
        {/* Top bar — S-curve */}
        <path
          d={barPath(1560, 250, BAR_0_MID, 35)}
          pathLength={1} strokeDasharray="1"
          stroke="#ffffff" strokeWidth={3} fill="none"
          style={anim('seoye-stroke-s3b')}
        />
        {/* Bottom bar — S-curve */}
        <path
          d={barPath(1560, 250, BAR_1_MID, 35)}
          pathLength={1} strokeDasharray="1"
          stroke="#ffffff" strokeWidth={3} fill="none"
          style={anim('seoye-stroke-s3b')}
        />
        {/* Vertical bar */}
        <path
          d={vertPath(1560)}
          pathLength={1} strokeDasharray="1"
          stroke="#ffffff" strokeWidth={3} fill="none"
          style={anim('seoye-stroke-s3b')}
        />
      </svg>
    </div>
  )
}
