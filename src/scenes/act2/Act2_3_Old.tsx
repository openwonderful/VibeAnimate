import { useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { useAnimTime } from '../../hooks/useAnimTime'
import DepthScene from '../zoom/DepthScene'
import Scene3 from './Scene3'

/**
 * Act2_3 — Exact reverse of the full forward chain (1.1 → 1.2 → 2.1 → 2.2).
 *
 * Single parabolic (t^exp) curve that accelerates toward the end:
 *   progress 0 → STAGE_SPLIT : Scene 3 (stage) pulls back to reveal Scene 2
 *                              at its natural scale (stadium fills frame).
 *   progress STAGE_SPLIT → 1 : DepthScene driven in reverse — Scene 2 portal
 *                              closes, camera pulls backward through the city
 *                              corridor, ending on Scene 1 mountains.
 *
 * URL: ?act=2.3                       (defaults: 3s, exp=2)
 *      ?act=2.3&duration=4&exp=1.6    (softer easing, longer pull)
 *      ?act=2.3&t=2.4                 (scrub to a specific time)
 */

// ── Timing ─────────────────────────────────────────────────────
const DEFAULT_DURATION = 3
const DEFAULT_HOLD = 0
const DEFAULT_EXP = 2        // parabolic ease-in (slow → fast)
const STAGE_SPLIT = 0.25     // progress point where stage→stadium completes

// DepthScene time range that contains "Scene 2 full → mountains".
// Scene 2 finishes its zoom-out reveal at ~20.2 in DepthScene time.
const DEPTH_START_TIME = 20.5
const DEPTH_END_TIME = 0

// ── Stage geometry (matches Act2Zoom) ──────────────────────────
const STAGE_CX = 960
const STAGE_CY = 220
const STAGE_W = 280
const STAGE_H = STAGE_W * (1080 / 1920)
const STAGE_LEFT_PCT = ((STAGE_CX - STAGE_W / 2) / 1920) * 100
const STAGE_TOP_PCT = ((STAGE_CY - STAGE_H / 2) / 1080) * 100
const STAGE_W_PCT = (STAGE_W / 1920) * 100
const STAGE_H_PCT = (STAGE_H / 1080) * 100
const ORIGIN_X_PCT = (STAGE_CX / 1920) * 100
const ORIGIN_Y_PCT = (STAGE_CY / 1080) * 100
const ZOOM_ORIGIN = `${ORIGIN_X_PCT}% ${ORIGIN_Y_PCT}%`
const MAX_SCALE = 1920 / STAGE_W
const PAN_Y_PCT = 50 - ORIGIN_Y_PCT

function getParams() {
  const p = new URLSearchParams(window.location.search)
  return {
    hold: parseFloat(p.get('hold') ?? String(DEFAULT_HOLD)),
    duration: parseFloat(p.get('duration') ?? String(DEFAULT_DURATION)),
    exp: parseFloat(p.get('exp') ?? String(DEFAULT_EXP)),
  }
}

export default function Act2_3() {
  const animTime = useAnimTime()
  const params = useMemo(() => new URLSearchParams(window.location.search), [])
  const debugTime = params.get('t')
  const time = debugTime !== null ? parseFloat(debugTime) : animTime
  const { hold, duration, exp } = getParams()

  // Parabolic ease-in: slow near the stage, accelerates into the mountains.
  const raw = Math.max(0, Math.min(1, (time - hold) / duration))
  const progress = Math.pow(raw, exp)

  // ── Stage phase (Scene 3 pull-back) ──────────────────────────
  const stagePhase = Math.min(1, progress / STAGE_SPLIT)
  const stageInv = 1 - stagePhase
  const stageScale = 1 + (MAX_SCALE - 1) * stageInv
  const stagePanY = PAN_Y_PCT * stageInv
  // Fade Scene 3 after 30% of the stage phase so Scene 2 dominates by the time
  // the city reverse kicks in.
  const scene3Opacity = 1 - Math.max(0, Math.min(1, (stagePhase - 0.3) / 0.7))

  // ── City reverse phase (DepthScene time flows backward) ──────
  const depthPhase = progress <= STAGE_SPLIT
    ? 0
    : (progress - STAGE_SPLIT) / (1 - STAGE_SPLIT)
  const depthTime = DEPTH_START_TIME + (DEPTH_END_TIME - DEPTH_START_TIME) * depthPhase

  return (
    <div
      style={{
        position: 'relative',
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        background: '#050A14',
      }}
    >
      {/* Bottom: reversed city zoom. During the stage phase this is parked at
          DEPTH_START_TIME so Scene 2 is already full-frame behind the stage. */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 10 }}>
        <DepthScene
          effectiveTime={depthTime}
          renderCanvas={(children) => (
            <Canvas
              style={{ background: 'transparent' }}
              gl={{ alpha: true, antialias: true }}
              camera={{ fov: 75, position: [0, 0, 5], near: 0.1, far: 100 }}
            >
              {children}
            </Canvas>
          )}
        />
      </div>

      {/* Top: Scene 3 stage, scales from MAX → 1 at stage coords while fading. */}
      {scene3Opacity > 0.01 && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 30,
            pointerEvents: 'none',
            transform: `translate(0%, ${stagePanY.toFixed(3)}%) scale(${stageScale.toFixed(4)})`,
            transformOrigin: ZOOM_ORIGIN,
            willChange: 'transform',
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: `${STAGE_LEFT_PCT}%`,
              top: `${STAGE_TOP_PCT}%`,
              width: `${STAGE_W_PCT}%`,
              height: `${STAGE_H_PCT}%`,
              opacity: scene3Opacity,
              willChange: 'opacity',
            }}
          >
            <Scene3 revealElapsed={999} />
          </div>
        </div>
      )}
    </div>
  )
}
