/**
 * fx.letterbox — transparent full-frame overlay: cinema bars, soft
 * vignette, and slowly drifting film grain. The first user of the
 * overlay track (SPEC §12.5 #4): stacked above a film's base track by
 * the film factory, previewable standalone at ?act=fx.letterbox.
 */
import { useAnimTime } from '../../hooks/useAnimTime'
import { useSceneMode } from '../../scenes/sceneMode'

const GRAIN =
  'radial-gradient(circle at 20% 35%, rgba(255,255,255,0.5) 0 1px, transparent 1.5px), ' +
  'radial-gradient(circle at 70% 12%, rgba(255,255,255,0.35) 0 1px, transparent 1.5px), ' +
  'radial-gradient(circle at 45% 80%, rgba(255,255,255,0.4) 0 1px, transparent 1.5px), ' +
  'radial-gradient(circle at 88% 60%, rgba(255,255,255,0.3) 0 1px, transparent 1.5px)'

export default function Letterbox() {
  const t = useAnimTime()
  const mode = useSceneMode()
  const size = mode.kind === 'render'
    ? { width: mode.width, height: mode.height }
    : { width: '100vw', height: '100vh' }

  // Grain jumps position a few times a second (classic projector shimmer).
  const step = Math.floor(t * 8)
  const gx = (step * 17) % 48
  const gy = (step * 29) % 48

  return (
    <div style={{ ...size, position: 'relative', overflow: 'hidden', pointerEvents: 'none', background: 'transparent' }}>
      {/* Cinema bars */}
      <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: '9%', background: '#000' }} />
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '9%', background: '#000' }} />
      {/* Soft vignette */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse at center, transparent 58%, rgba(0,0,0,0.28) 100%)',
      }} />
      {/* Drifting grain */}
      <div style={{
        position: 'absolute', inset: '9% 0',
        backgroundImage: GRAIN,
        backgroundSize: '48px 48px',
        backgroundPosition: `${gx}px ${gy}px`,
        opacity: 0.16,
        mixBlendMode: 'overlay',
      }} />
    </div>
  )
}
