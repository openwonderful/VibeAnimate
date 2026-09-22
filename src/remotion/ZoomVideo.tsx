import { Audio, staticFile, useCurrentFrame, useVideoConfig } from 'remotion'
import { ThreeCanvas } from '@remotion/three'
import DepthScene from '../scenes/zoom/DepthScene'

/**
 * Remotion composition — renders the depth zoom as a video.
 * useCurrentFrame() drives the timeline deterministically.
 */
export default function ZoomVideo() {
  const frame = useCurrentFrame()
  const { fps, width, height } = useVideoConfig()

  const effectiveTime = frame / fps

  return (
    <div style={{ width: `${width}px`, height: `${height}px`, overflow: 'hidden', background: '#050A14' }}>
      <Audio src={staticFile('audio/body-to-body.mp3')} />
      <DepthScene
        effectiveTime={effectiveTime}
        fov={75}
        renderCanvas={(children) => (
          <ThreeCanvas
            width={width}
            height={height}
            style={{ background: 'transparent' }}
            gl={{ alpha: true, antialias: true }}
            camera={{ fov: 75, position: [0, 0, 5], near: 0.1, far: 100 }}
          >
            {children}
          </ThreeCanvas>
        )}
      />
    </div>
  )
}
