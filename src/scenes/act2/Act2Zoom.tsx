import { useAnimTime } from '../../hooks/useAnimTime'
import { getDropShake, getSongTime } from '../../utils/beatMap'
import Act2_2_B from './Act2_2_B'
import Scene2 from './Scene2'

/**
 * Act2Zoom — 2.1 → 2.2 transition: a true camera push-in.
 *
 * The stadium dressing and the stage canvas scale in LOCKSTEP around the
 * mini-stage point, so the whole frame — crowd, LED walls, light towers —
 * flies out past the edges exactly as if a camera were diving toward the
 * stage. (The previous version kept the dressing static and only faded its
 * opacity, which read as a crossfade, not a zoom.)
 *
 * Layering (all children are full-viewport):
 *   z0  <Scene2 layers="under" />  — background gradient, stadium structure,
 *       crowd, ARMY bombs. Scaled by Z(p) around the mini-stage center.
 *   z1  canvas wrapper — full-viewport <Act2_2_B /> (flyover camera),
 *       CSS-scaled so its visible footprint starts at the embed size of the
 *       standalone 2.1 (rect × 1.4 oversize, radial-feathered) and grows to
 *       viewport-fill. Because the DOM canvas is always viewport-sized, the
 *       WebGL buffer never resizes and the pixels are oversampled throughout.
 *   z2  <Scene2 layers="over" />   — the veil (stage bloom, spotlights,
 *       confetti, foreground crowd). Same Z(p) transform; dissolves late in
 *       the zoom, once most of it has already left the frame.
 *
 * Zoom curve: exponential — Z(p) = ZOOM_TOTAL^eased(p) — so the perceived
 * (multiplicative) zoom rate ramps up and brakes smoothly; a linear scale
 * lerp reads as "nothing… nothing… lurch". Inside the canvas the flyover
 * camera dollies STADIUM_POS → STAGE_POS over the same window, adding real
 * 3D parallax on top of the CSS growth.
 *
 * Beat shake is applied here on the root (Scene2 shake={false}) so dressing
 * and canvas shake as one rigid frame. Because scene-local time restarts at
 * 0 in the FullVideo, the beat map is read at `local time + songOffset`
 * (default 18 = this scene's SCRIPT.md position) so the 20.2s bass-drop
 * shake actually lands mid-hold in the master video.
 *
 * In the FullVideo timeline the slot is 11s with props {hold: 7, zoom: 4} —
 * stadium holds through the drop-shake, then the push-in lands on the stage
 * at exactly the frame 2.2 begins.
 *
 * URL: ?act=2.1-zoom  or  ?act=2.1-zoom&hold=2&zoom=4&t=6
 */

const DEFAULT_HOLD = 1.6
const DEFAULT_ZOOM = 4
const DEFAULT_SONG_OFFSET = 20.4
// Members start arriving half a second BEFORE the camera lands, so the stage
// is already filling as it reaches frame, and keep arriving for 2.5s after —
// the seventh (centre stage) touches down on 0:28.
const DEFAULT_REVEAL_PREROLL = -0.5
const DEFAULT_REVEAL_STAGGER = 0.417

// Mirror of the mini-stage rect in Scene2.tsx / StadiumStage.tsx — these
// MUST stay in sync. Rect: 280×157.5 in 1920×1080 space, centered (960, 250).
const RECT_W_PCT = 14.58                  // rect side as % of viewport
const RECT_CENTER_Y_PCT = 23.15           // rect center y as % of viewport

// Standalone 2.1 renders the embedded canvas 140% of the rect (feathered
// overflow). Matching that footprint here makes the zoom's first frame
// pixel-equivalent to standalone 2.1.
const EMBED_OVERSIZE = 1.4
const CANVAS_START_SCALE = (RECT_W_PCT / 100) * EMBED_OVERSIZE   // 0.2041
const ZOOM_TOTAL = 1 / CANVAS_START_SCALE                        // ≈4.9×

// Start-frame feather mask, expressed in canvas-element coordinates.
// Standalone 2.1 masks the rect container with
//   radial-gradient(ellipse at center, black 55%, transparent 100%)
// whose farthest-corner ellipse radii are (w/2·√2, h/2·√2). Mapped through
// the 1.4 oversize onto the full canvas frame, the same ellipse is ≈50.5%
// of the element in both axes.
const MASK_RADIUS_START_PCT = 50.5
// Fully-open radius: corners sit at normalized distance √2·(50/170) ≈ 0.42,
// inside the 55% black stop → mask is completely opaque, i.e. no feather.
const MASK_RADIUS_END_PCT = 170

// Fade windows in zoom progress p (0..1).
const OVER_FADE = [0.5, 0.88] as const     // veil layers dissolve
const UNDER_FADE = [0.75, 0.93] as const   // structure/crowd, mops up edges
const MASK_OPEN = [0.45, 0.95] as const    // feather → fully open

function easeInOutCubic(t: number): number {
  return t < 0.5
    ? 4 * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 2
}

/** 0 before w[0], 1 after w[1], smoothstep-eased inside. */
function windowT(p: number, w: readonly [number, number]): number {
  const t = Math.max(0, Math.min(1, (p - w[0]) / (w[1] - w[0])))
  return t * t * (3 - 2 * t)
}

function urlParam(name: string): number | undefined {
  const v = new URLSearchParams(window.location.search).get(name)
  return v === null ? undefined : parseFloat(v)
}

export interface Act2ZoomProps {
  /** Seconds to hold the full stadium view before the push-in starts. */
  hold?: number
  /** Push-in length in seconds; landing = hold + zoom. */
  zoom?: number
  /** Where this scene sits in the song — local time + offset is fed to the
   *  beat map so drop-shakes land on the real song beats. */
  songOffset?: number
  /** When the first member appears, relative to the landing. Negative starts
   *  the entrance before the camera arrives, so the stage is already coming
   *  alive as it fills the frame instead of sitting empty on arrival. */
  revealPreroll?: number
  /** Seconds between successive members entering. */
  revealStagger?: number
}

export default function Act2Zoom({
  hold = urlParam('hold') ?? DEFAULT_HOLD,
  zoom = urlParam('zoom') ?? DEFAULT_ZOOM,
  songOffset = DEFAULT_SONG_OFFSET,
  revealPreroll = DEFAULT_REVEAL_PREROLL,
  revealStagger = DEFAULT_REVEAL_STAGGER,
}: Act2ZoomProps = {}) {
  const time = useAnimTime()
  const { x: shakeX, y: shakeY } = getDropShake(getSongTime(time + songOffset))

  const rawProgress = Math.max(0, Math.min(1, (time - hold) / zoom))
  const eased = easeInOutCubic(rawProgress)

  // Lockstep zoom: dressing scales by Z, canvas footprint = start × Z.
  const Z = Math.pow(ZOOM_TOTAL, eased)
  const canvasScale = CANVAS_START_SCALE * Z

  // The stage point glides from the rect center to the viewport center as
  // the zoom runs, so the shot lands dead-center (= Act 2.2 framing).
  const centerY = RECT_CENTER_Y_PCT + (50 - RECT_CENTER_Y_PCT) * eased

  // Dressing: scale about the rect center, then translate the rect center to
  // its glide position. translate % is relative to the (viewport-sized)
  // element, so these are viewport percentages.
  const dressingTransform =
    `translate(0, ${(centerY - RECT_CENTER_Y_PCT).toFixed(3)}%) scale(${Z.toFixed(5)})`
  const dressingOrigin = `50% ${RECT_CENTER_Y_PCT}%`

  // Canvas: viewport-sized element scaled about its own center, translated so
  // that center rides the same glide point.
  const canvasTransform =
    `translate(0, ${(centerY - 50).toFixed(3)}%) scale(${canvasScale.toFixed(5)})`

  const overOpacity = 1 - windowT(rawProgress, OVER_FADE)
  const underOpacity = 1 - windowT(rawProgress, UNDER_FADE)

  const maskR = MASK_RADIUS_START_PCT +
    (MASK_RADIUS_END_PCT - MASK_RADIUS_START_PCT) * windowT(rawProgress, MASK_OPEN)
  const canvasMask =
    `radial-gradient(ellipse ${maskR.toFixed(2)}% ${maskR.toFixed(2)}% at center, black 55%, transparent 100%)`

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        overflow: 'hidden',
        background: '#050510',
        transform: shakeX || shakeY ? `translate(${shakeX}px, ${shakeY}px)` : undefined,
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 0,
          opacity: underOpacity,
          transform: dressingTransform,
          transformOrigin: dressingOrigin,
          willChange: 'transform',
          pointerEvents: 'none',
        }}
      >
        <Scene2 layers="under" shake={false} />
      </div>

      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 1,
          transform: canvasTransform,
          transformOrigin: 'center center',
          maskImage: canvasMask,
          WebkitMaskImage: canvasMask,
          willChange: 'transform',
        }}
      >
        <Act2_2_B
          cameraMode="flyover"
          flyoverStart={hold}
          flyoverDuration={zoom}
          showMembers={true}
          // Entrance clock hangs off the landing: member i appears at
          // hold + zoom + revealPreroll + i·revealStagger. 2.2 continues the
          // same schedule from its own start, so the arrivals run straight
          // through the cut.
          startOffset={hold + zoom}
          revealPreroll={revealPreroll}
          revealStagger={revealStagger}
          songOffset={songOffset}
          embedded
        />
      </div>

      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 2,
          opacity: overOpacity,
          transform: dressingTransform,
          transformOrigin: dressingOrigin,
          willChange: 'transform',
          pointerEvents: 'none',
        }}
      >
        <Scene2 layers="over" shake={false} />
      </div>
    </div>
  )
}
