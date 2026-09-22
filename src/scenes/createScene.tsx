/**
 * createScene — the SceneShell. Wraps a scene body with everything every
 * scene used to hand-roll, so one component works identically in the live
 * viewer AND inside a Remotion render:
 *
 *   - full-viewport container (live) / composition-sized container (render)
 *   - R3F <Canvas> (live) vs @remotion/three <ThreeCanvas> (render), with the
 *     same camera/gl/shadows/onCreated config
 *   - <DebugCamera> mounted automatically in live mode (orbit, __camPose,
 *     URL camera-move preview)
 *   - declared `cameraMoves` rendered as <CameraMove> components in both modes
 *
 * Usage:
 *   export default createScene({
 *     three: {
 *       camera: { position: [0, 2, 8], fov: 45 },
 *       gl: { antialias: true },
 *       debugTarget: [0, 2, 0],
 *     },
 *     background: '#000',
 *     cameraMoves: [{ a: {...}, b: {...}, t0: 1, t1: 7 }],
 *   }, function MyScene() { return <>...meshes...</> })
 *
 * DOM/SVG scenes omit `three`; the body renders as-is in live mode and inside
 * a sized clipping container in render mode. Read time via useAnimTime()
 * (DOM) or getAnimTime() (inside the canvas) — both work in either mode.
 */
import type { ComponentType } from 'react'
import type { CanvasProps } from '@react-three/fiber'
import { useSceneMode } from './sceneMode'
import { SceneCanvas } from './SceneCanvas'
import { IS_STUDIO_APP } from '../studio/editable/env'
import { CameraMove, type CameraMoveProps } from './DebugCamera'

export type SceneShellMeta = {
  /** Present = three.js scene (body renders inside a canvas). Absent = DOM/SVG. */
  three?: {
    camera?: CanvasProps['camera']
    gl?: CanvasProps['gl']
    shadows?: CanvasProps['shadows']
    onCreated?: CanvasProps['onCreated']
    /** Orbit pivot for the live <DebugCamera> (see DebugCamera target prop). */
    debugTarget?: [number, number, number]
  }
  /** Container background (default transparent for DOM, '#050A14' for three). */
  background?: string
  /** Declarative camera moves, driven by the anim clock in both modes. */
  cameraMoves?: CameraMoveProps[]
}

export function createScene(meta: SceneShellMeta, Body: ComponentType): ComponentType {
  const moves = meta.cameraMoves?.map((m, i) => <CameraMove key={i} {...m} />)

  function SceneShell() {
    const mode = useSceneMode()

    if (!meta.three) {
      /*
       * DOM/SVG scene, live. The body owns its own container — but "its own
       * container" used to mean `width: 100vw; height: 100vh`, and inside the
       * studio that is the WINDOW, not the stage.
       *
       * The consequence was not subtle and took a while to see: the scene
       * rendered at window size inside a 446×251 stage slot, `overflow:
       * hidden` clipped it, and what you were looking at was the TOP-LEFT
       * CORNER of a much wider frame. Every subject sat up and to the left
       * with most of the frame empty, which reads as a camera problem —
       * three acts' worth of "the angle is wrong" was this. In the film it
       * hit exactly 5.2, 7.4 and 8.55, the three DOM-branch scenes that
       * mount their own canvas.
       *
       * So the body gets a box to be 100% OF. Sized the same way the 3D
       * branch below sizes its own container, for the same reason: the
       * window when the scene is the page, the stage when it is not. The
       * bodies ask for `100%`; this is what answers them.
       */
      if (mode.kind === 'live') return (
        <div style={{
          ...(IS_STUDIO_APP
            ? { width: '100%', height: '100%' }
            : { width: '100vw', height: '100vh' }),
          position: 'relative', overflow: 'hidden',
        }}><Body /></div>
      )

      /*
       * S5's trap, and the decision taken about it.
       *
       * A 3D act only needs the camera's aspect and three.js handles that —
       * reshaping the composition genuinely REFRAMES it, which is what the
       * 9:16 stage shot shows. The DOM/SVG acts are a different animal:
       * every one is authored against a 1920×1080 viewBox with
       * `preserveAspectRatio="none"`, so a composition of any other shape
       * does not reframe them, it STRETCHES them. A face in Act 4 rendered
       * at 1080×1920 would be twice as tall as it is wide.
       *
       * So: LETTERBOX rather than distort. The scene is laid out at 16:9,
       * scaled to fit inside whatever shape the film is, and centred on the
       * film's background. A pillarboxed shot is a compromise you can see
       * and reject; a stretched face is a bug that ships.
       *
       * Relaying these acts out for a vertical frame is the real answer and
       * it is per-scene design work, not plumbing — this is the floor under
       * it, not a substitute for it.
       */
      const target = mode.width / mode.height
      const authored = 16 / 9
      const distorts = Math.abs(target - authored) > 0.01
      const scale = distorts ? Math.min(mode.width / 1920, mode.height / 1080) : 1

      return (
        <div style={{
          width: mode.width, height: mode.height,
          position: 'relative', overflow: 'hidden',
          background: meta.background,
          ...(distorts ? { display: 'flex', alignItems: 'center', justifyContent: 'center' } : {}),
        }}>
          {distorts ? (
            <div style={{
              width: 1920, height: 1080, flexShrink: 0,
              transform: `scale(${scale})`,
              position: 'relative', overflow: 'hidden',
            }}>
              <Body />
            </div>
          ) : <Body />}
        </div>
      )
    }

    const { camera, gl, shadows, onCreated, debugTarget } = meta.three
    const background = meta.background ?? '#050A14'
    // Live scenes size to the window; inside the studio they size to the
    // 16:9 stage cage instead (its inner wrapper is absolute inset:0), so
    // the viewport shows the real framing rather than a top-left crop of a
    // window-sized render.
    const size = mode.kind === 'render'
      ? { width: mode.width, height: mode.height }
      : IS_STUDIO_APP
        ? { width: '100%', height: '100%' }
        : { width: '100vw', height: '100vh' }

    return (
      <div style={{ ...size, position: 'relative', overflow: 'hidden', background }}>
        <SceneCanvas camera={camera} gl={gl} shadows={shadows}
          onCreated={onCreated} debugTarget={debugTarget}>
          {moves}
          <Body />
        </SceneCanvas>
      </div>
    )
  }

  SceneShell.displayName = `SceneShell(${Body.displayName || Body.name || 'Scene'})`
  return SceneShell
}
