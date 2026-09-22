/**
 * RemotionTimeDriver — makes Remotion the time authority for the shared anim
 * clock. In live mode AnimTimeProvider advances the module store off rAF; in
 * a Remotion render this driver instead writes useCurrentFrame()/fps into the
 * SAME store, frozen, once per frame. Everything downstream — getAnimTime()
 * inside canvases, useAnimTime() in DOM scenes, CSS keyframes (synced by
 * seekAnimTime → syncCssAnimations), THREE.Clock (locked in Root.tsx) —
 * then reads frame-accurate time with no per-scene plumbing.
 */
import { useEffect } from 'react'
import { useCurrentFrame, useVideoConfig } from 'remotion'
import {
  AnimTimeContext,
  isAnimPlaying,
  seekAnimTime,
  setAnimPlaying,
} from '../hooks/useAnimTime'

export function RemotionTimeDriver({ children }: { children: React.ReactNode }) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const t = frame / fps

  // Write the store during render, before children render/draw: R3F useFrame
  // callbacks (driven by ThreeCanvas's per-frame advance) and locked
  // THREE.Clock reads must already see this frame's time. Deterministic and
  // idempotent, so safe despite running in the render phase.
  if (isAnimPlaying()) setAnimPlaying(false)
  seekAnimTime(t)

  // Re-seek after commit so CSS keyframe animations on elements that mounted
  // this frame get pinned to t as well (seek → syncCssAnimations).
  useEffect(() => {
    seekAnimTime(t)
  }, [t])

  return <AnimTimeContext.Provider value={t}>{children}</AnimTimeContext.Provider>
}
