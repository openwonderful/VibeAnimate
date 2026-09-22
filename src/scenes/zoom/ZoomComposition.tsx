import { useAudioTimeline } from '../../hooks/useAudioTimeline'
import { useZoomProgress } from '../../hooks/useZoomProgress'
import { Scene1 } from '../act1/Scene1'
import Scene2 from '../act2/Scene2'
import ZoomLayer from './ZoomLayer'
import CityFlythrough from './CityFlythrough'
import AudioControls from './AudioControls'

// Scene 1: zoom just below the "Body to Body" title, into the sky
const SCENE1_ORIGIN = '50% 24%'
// Scene 2: sits behind everything
const SCENE2_ORIGIN = '50% 50%'

export default function ZoomComposition() {
  const audio = useAudioTimeline('/audio/body-to-body.mp3')

  // Debug: ?t=12 overrides time for screenshot testing
  const debugTime = new URLSearchParams(window.location.search).get('t')
  const effectiveTime = debugTime !== null ? parseFloat(debugTime) : audio.currentTime

  const zoom = useZoomProgress(effectiveTime)

  // City flythrough progress:
  //   t=8:  city starts appearing (mountains clearing)
  //   t=18: stadium fills screen, Scene 2 takes over
  const cityProgress = Math.max(0, Math.min(1, (effectiveTime - 8) / 10))
  const cityVisible = effectiveTime > 7.5 && effectiveTime < 19

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
      {/* Scene 2 — at the bottom, revealed when city flythrough ends */}
      <ZoomLayer
        state={zoom.scene2}
        zIndex={10}
        transformOrigin={SCENE2_ORIGIN}
      >
        <Scene2 />
      </ZoomLayer>

      {/* City flythrough — Scene 1.5, zoom through city to stadium */}
      <CityFlythrough
        progress={cityProgress}
        visible={cityVisible}
      />

      {/* Scene 1 — on top, mountains fly past via parallax */}
      <ZoomLayer
        state={zoom.scene1}
        zIndex={30}
        transformOrigin={SCENE1_ORIGIN}
      >
        <Scene1 zoomScale={zoom.scene1.scale} />
      </ZoomLayer>

      {/* Audio controls */}
      <AudioControls audio={audio} />
    </div>
  )
}
