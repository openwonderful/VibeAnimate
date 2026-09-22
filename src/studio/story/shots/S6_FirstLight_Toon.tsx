/**
 * story.6-B — "First light", anime grade: S6's film (camera pull-back,
 * dawn world, the raised lantern) through AnimeLook, with the same DOM
 * title card on top.
 */
import { SceneCanvas } from '../../../scenes/SceneCanvas'
import { useSceneMode } from '../../../scenes/sceneMode'
import { useAnimTime } from '../../../hooks/useAnimTime'
import { AnimeLook } from '../../materials/AnimeLook'
import { S6Film } from './S6_FirstLight'

export default function S6_Toon() {
  const mode = useSceneMode()
  const time = useAnimTime()
  const size = mode.kind === 'render'
    ? { width: mode.width, height: mode.height }
    : { width: '100vw', height: '100vh' }
  const titleOpacity = Math.min(1, Math.max(0, (time - 6) / 2))

  return (
    <div style={{ ...size, position: 'relative', overflow: 'hidden', background: '#3A2438' }}>
      <SceneCanvas
        camera={{ position: [16.2, 5.6, -12.2], fov: 42, near: 0.1, far: 220 }}
        gl={{ antialias: true }}
        debugTarget={[15, 5, -15]}
      >
        <S6Film />
        <AnimeLook bloom={1.0} />
      </SceneCanvas>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', pointerEvents: 'none',
        opacity: titleOpacity,
      }}>
        <div style={{
          color: '#F2E3C8', fontFamily: "'Noto Serif KR', serif", fontSize: 'min(6.4vw, 78px)',
          fontWeight: 600, letterSpacing: '0.12em', textShadow: '0 2px 40px #000000AA',
        }}>
          등불지기
        </div>
        <div style={{
          color: '#D9C8A8', fontFamily: "'Playfair Display', serif", fontSize: 'min(2vw, 24px)',
          letterSpacing: '0.42em', textTransform: 'uppercase', marginTop: 14, opacity: 0.85,
        }}>
          The Lantern Keeper
        </div>
      </div>
    </div>
  )
}
