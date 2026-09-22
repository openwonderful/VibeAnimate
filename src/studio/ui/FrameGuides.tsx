/**
 * FrameGuides — thirds, safe areas and centre, drawn over the picture.
 *
 * Studio-only: these live in the viewport overlay, never in a scene, so they
 * cannot leak into a render or a `?act=` screenshot.
 *
 * The safe-area numbers are the broadcast ones (SMPTE ST 2046 / EBU R95):
 * action-safe at 93% and title-safe at 90% of frame width and height,
 * centred. They matter here for a reason that is not broadcast at all — the
 * film has to survive a 9:16 crop for a phone, and the safe rectangles are
 * the cheapest way to see whether a face is about to be cut in half by one.
 */
import type { Guides } from '../state/prefs'

const STROKE = '#ffffff40'
const STROKE_STRONG = '#ffffff66'

export function FrameGuides({ mode }: { mode: Guides }) {
  if (mode === 'off') return null
  const thirds = mode === 'thirds' || mode === 'both'
  const safe = mode === 'safe' || mode === 'both'

  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      style={{
        position: 'absolute', inset: 0, width: '100%', height: '100%',
        pointerEvents: 'none', zIndex: 4,
      }}
    >
      {thirds && (
        <g stroke={STROKE} strokeWidth={0.15} vectorEffect="non-scaling-stroke">
          <line x1="33.333" y1="0" x2="33.333" y2="100" />
          <line x1="66.667" y1="0" x2="66.667" y2="100" />
          <line x1="0" y1="33.333" x2="100" y2="33.333" />
          <line x1="0" y1="66.667" x2="100" y2="66.667" />
        </g>
      )}
      {safe && (
        <g fill="none" stroke={STROKE} strokeWidth={0.15} vectorEffect="non-scaling-stroke">
          {/* action-safe 93%, title-safe 90% */}
          <rect x="3.5" y="3.5" width="93" height="93" />
          <rect x="5" y="5" width="90" height="90" strokeDasharray="2 2" />
        </g>
      )}
      {/* Centre cross, always when anything is on — it is the one mark you
          want when judging whether a subject is deliberately off-centre. */}
      <g stroke={STROKE_STRONG} strokeWidth={0.15} vectorEffect="non-scaling-stroke">
        <line x1="47" y1="50" x2="53" y2="50" />
        <line x1="50" y1="47" x2="50" y2="53" />
      </g>
    </svg>
  )
}
