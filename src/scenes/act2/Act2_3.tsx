import { useAnimTime } from '../../hooks/useAnimTime'
import { getDropShake, getSongTime } from '../../utils/beatMap'
import { SceneCanvas } from '../SceneCanvas'
import DepthScene, { SONG_DURATION as DEPTH_CHAIN_END } from '../zoom/DepthScene'
import Act2_2_B from './Act2_2_B'
import Scene2 from './Scene2'

/**
 * Act 2.3 — "Stage → Mountains": the whole forward journey run backwards.
 *
 * Act 1 + Act 2 push the camera mountains → city → stadium → stage over 26
 * seconds. This scene rewinds that in seven: the concert falls away, the
 * arena shrinks back to the speck it was, the city corridor flies past in
 * reverse, and the camera comes to rest on the Baekdu peaks it started from.
 * Act 3 opens on the same range, small on the horizon behind the farmhouse.
 *
 * Two phases, both on the shared anim clock:
 *
 *   PULL   (0 → pull)  Exact reverse of Act2Zoom's push-in. The stage canvas
 *                      shrinks from viewport-fill back into the mini-stage
 *                      rect while the stadium dressing scales down around it
 *                      and fades back in — the members keep dancing the whole
 *                      way out (camera mode 'flyout' dollies stage→stadium).
 *   REWIND (pull → …)  DepthScene driven backwards from its stadium end-state
 *                      (t=20.4) to the opening frame (t=0): the arena portal
 *                      closes, the camera reverses out through the city, and
 *                      the Scene 1 layers settle back into the landscape.
 *
 * The two phases meet on the same picture — a full-frame stadium — so the
 * hand-over is a short crossfade rather than a cut.
 *
 * URL: ?act=2.3                                 (defaults below)
 *      ?act=2.3&pull=3&rewind=4&hold=1&t=5      (retime / scrub)
 */

/* ── Timing (seconds) ─────────────────────────────────────────── */
const DEFAULT_PULL = 4.5      // stage → stadium
const DEFAULT_REWIND = 9      // stadium → mountains
// The remaining 0.5s of the 14s slot is the rest on the mountains: the scene
// just holds its final state, so it needs no code of its own.
/** Where this scene sits in the song, for the beat-shake grid. */
const DEFAULT_SONG_OFFSET = 30
/** How far into 2.2's reveal schedule this scene opens — the reveal clock is
 *  pushed this far into the past so the members are landed and already
 *  crossing into the unison routine from this scene's frame 0. */
const DEFAULT_DANCE_ELAPSED = 5.7

/* ── Where the rewind runs in DepthScene's clock ──────────────────
 * The chain's own arena reveal is off here (`arena={false}`): the stadium on
 * screen is the live one this scene just pulled out of, with the members
 * still dancing on it, so the portal is closed around THAT rather than
 * crossfading to a second copy. The chain is used only for the flight home,
 * run from its end state back down to the opening frame.
 */
/** Camera at the far end of the corridor, where the flight home starts. */
const DEPTH_CORRIDOR_END = DEPTH_CHAIN_END
/** The opening frame: mountains filling the screen. */
const DEPTH_MOUNTAINS = 0
/** Seconds of the rewind spent closing the portal (mirrors the forward
 *  reveal's 0.9s), the rest is the flight back through the city. */
const PORTAL_CLOSE = 0.9

/* ── Geometry — mirrors Act2Zoom (keep in sync) ───────────────── */
const RECT_W_PCT = 14.58
const RECT_CENTER_Y_PCT = 23.15
const EMBED_OVERSIZE = 1.4
const CANVAS_START_SCALE = (RECT_W_PCT / 100) * EMBED_OVERSIZE
const ZOOM_TOTAL = 1 / CANVAS_START_SCALE
const MASK_RADIUS_START_PCT = 50.5
const MASK_RADIUS_END_PCT = 170

// Fade windows in *push-in* progress p (1 = on the stage, 0 = full stadium),
// same numbers as Act2Zoom so the two transitions are mirror images.
const OVER_FADE = [0.5, 0.88] as const
const UNDER_FADE = [0.75, 0.93] as const
const MASK_OPEN = [0.45, 0.95] as const

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

function easeOutQuad(t: number): number {
  return 1 - (1 - t) * (1 - t)
}

/** Mirror of the arena reveal's `progress³` shaping in DepthScene. */
function easeInCubic(t: number): number {
  return t * t * t
}

function clamp01(t: number): number {
  return Math.max(0, Math.min(1, t))
}

/** 0 before w[0], 1 after w[1], smoothstep-eased inside. */
function windowT(p: number, w: readonly [number, number]): number {
  const t = clamp01((p - w[0]) / (w[1] - w[0]))
  return t * t * (3 - 2 * t)
}

function urlParam(name: string): number | undefined {
  const v = new URLSearchParams(window.location.search).get(name)
  return v === null ? undefined : parseFloat(v)
}

export interface Act2_3Props {
  /** Stage → stadium pull-back length. */
  pull?: number
  /** Stadium → mountains rewind length. */
  rewind?: number
  /** Where this scene starts in the song (drives the beat-shake grid). */
  songOffset?: number
  /** How long the members have already been dancing when this scene opens. */
  danceElapsed?: number
}

export default function Act2_3({
  pull = urlParam('pull') ?? DEFAULT_PULL,
  rewind = urlParam('rewind') ?? DEFAULT_REWIND,
  songOffset = DEFAULT_SONG_OFFSET,
  danceElapsed = DEFAULT_DANCE_ELAPSED,
}: Act2_3Props = {}) {
  const time = useAnimTime()

  // ── Phase 1: the push-in, run backwards ──────────────────────
  // p is Act2Zoom's progress: 1 = landed on the stage, 0 = full stadium.
  const pullT = clamp01(time / pull)
  const p = 1 - easeInOutCubic(pullT)

  const Z = Math.pow(ZOOM_TOTAL, p)
  const canvasScale = CANVAS_START_SCALE * Z
  const centerY = RECT_CENTER_Y_PCT + (50 - RECT_CENTER_Y_PCT) * p

  const dressingTransform =
    `translate(0, ${(centerY - RECT_CENTER_Y_PCT).toFixed(3)}%) scale(${Z.toFixed(5)})`
  const dressingOrigin = `50% ${RECT_CENTER_Y_PCT}%`
  const canvasTransform =
    `translate(0, ${(centerY - 50).toFixed(3)}%) scale(${canvasScale.toFixed(5)})`

  const overOpacity = 1 - windowT(p, OVER_FADE)
  const underOpacity = 1 - windowT(p, UNDER_FADE)

  const maskR = MASK_RADIUS_START_PCT +
    (MASK_RADIUS_END_PCT - MASK_RADIUS_START_PCT) * windowT(p, MASK_OPEN)
  const canvasMask =
    `radial-gradient(ellipse ${maskR.toFixed(2)}% ${maskR.toFixed(2)}% at center, black 55%, transparent 100%)`

  // The concert's beat shake rides the pull-back and dies with it, so the
  // arena stops shaking as we leave it.
  const shake = getDropShake(getSongTime(time + songOffset))
  const shakeFade = 1 - pullT
  const shakeX = shake.x * shakeFade
  const shakeY = shake.y * shakeFade

  // ── Phase 2: the depth chain, run backwards ──────────────────
  // The chain's own arena is off (`arena={false}`); the stadium on screen is
  // still the one we pulled out of, so the depth clock only has to cover the
  // flight home. It stays parked at the corridor end until the portal shuts.
  const sinceRewind = time - pull
  const flightLength = Math.max(0.001, rewind - PORTAL_CLOSE)
  const depthTime = DEPTH_CORRIDOR_END +
    (DEPTH_MOUNTAINS - DEPTH_CORRIDOR_END) *
      easeOutQuad(clamp01((sinceRewind - PORTAL_CLOSE) / flightLength))

  // ── The portal, closing ──────────────────────────────────────
  // Exact reverse of DepthScene's arena reveal (clip 49%→0, scale 2.5→1,
  // blur, brightness), applied to the live stadium so the stage keeps playing
  // inside the shrinking window instead of cutting to a dark copy of itself.
  const portalT = 1 - easeInCubic(clamp01(sinceRewind / PORTAL_CLOSE))  // 1 → 0
  const portalInset = 49 * (1 - portalT)
  const portalRadius = Math.round(30 * (1 - portalT))
  // Push and filter mirror DepthScene's reveal — keep the two in step.
  const portalScale = 1 + 0.35 * (1 - portalT)
  const portalBlur = 12 * (1 - Math.min(1, portalT / 0.5) ** 2)
  const portalFilter = portalBlur > 0.1 ? `blur(${portalBlur.toFixed(2)}px)` : undefined

  // Once shut, the speck fades out over the next stretch of the flight, the
  // way the forward chain's dot simply isn't there before t=18.
  const stageOpacity = 1 - windowT(sinceRewind, [PORTAL_CLOSE, PORTAL_CLOSE + 0.4])

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        background: '#050510',
        transform: shakeX || shakeY ? `translate(${shakeX}px, ${shakeY}px)` : undefined,
      }}
    >
      {/* Underneath the whole scene: the depth chain, parked at the corridor
          end until the portal shuts, then flying home. */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
        <DepthScene
          effectiveTime={depthTime}
          showTitle={false}
          arena={false}
          renderCanvas={(children) => (
            <SceneCanvas
              style={{ background: 'transparent' }}
              gl={{ alpha: true, antialias: true }}
              camera={{ fov: 75, position: [0, 0, 5], near: 0.1, far: 100 }}
            >
              {children}
            </SceneCanvas>
          )}
        />
      </div>

      {/* The pull-back composite: stadium dressing scaling down around the
          stage canvas, exactly Act2Zoom's sandwich in reverse — then the
          portal closes around the whole thing. It stays mounted (hidden)
          after that on purpose: tearing down a WebGL canvas mid-scene costs a
          context, and enough of those drop the page to software rendering for
          the rest of the render. */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 1,
          overflow: 'hidden',
          opacity: stageOpacity,
          visibility: stageOpacity < 0.01 ? 'hidden' : 'visible',
          clipPath: portalInset > 0.05
            ? `inset(${portalInset.toFixed(3)}% round ${portalRadius}px)`
            : undefined,
          filter: portalFilter,
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            transform: portalScale > 1.001 ? `scale(${portalScale.toFixed(4)})` : undefined,
            transformOrigin: '50% 25%',
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
              cameraMode="flyout"
              flyoverStart={0}
              flyoverDuration={pull}
              showMembers
              // Reveal clock pushed into the past: the seven are long since
              // landed and dancing in unison as the camera leaves them.
              startOffset={-danceElapsed}
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
      </div>
    </div>
  )
}
