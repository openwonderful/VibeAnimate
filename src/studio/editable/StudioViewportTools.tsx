/**
 * StudioViewportTools — everything Blender mode mounts INSIDE the scene's
 * canvas: the manipulation layer (select/gizmo/highlight) and the frame
 * governor (demand rendering, adaptive DPR, stats). Loaded lazily by
 * SceneCanvas only when the page is the studio, so viewer/render bundles
 * never pay for it.
 */
import { ManipulatorLayer } from './ManipulatorLayer'
import { FrameGovernor } from './FrameGovernor'
import { LiveCapture } from '../live/LiveCapture'

export default function StudioViewportTools() {
  return (
    <>
      <ManipulatorLayer />
      <FrameGovernor />
      {/* Live AI render capture — allocates nothing until the pref is on. */}
      <LiveCapture />
    </>
  )
}
