import { createContext, useContext, type ReactNode } from 'react'

// --- Camera state shared between DOM layers and R3F Canvas ---

export interface DepthCameraState {
  cameraZ: number     // camera position along depth axis (0 → maxCameraZ)
  fov: number         // field of view — controls perspective intensity
  vanishX: number     // vanishing point x in viewport % (50 = center)
  vanishY: number     // vanishing point y in viewport % (24 = below title)
  maxCameraZ: number  // max camera travel
}

const defaultState: DepthCameraState = {
  cameraZ: 0,
  fov: 75,
  vanishX: 50,
  vanishY: 24,
  maxCameraZ: 16.5,
}

export const DepthCameraContext = createContext<DepthCameraState>(defaultState)

export function useDepthCamera(): DepthCameraState {
  return useContext(DepthCameraContext)
}

// --- DOM depth layer — CSS transform driven by camera state ---

/** Scale past which a layer is dropped. High on purpose: the layer has to
 *  grow past the edges of frame and streak out of view for the camera to read
 *  as punching THROUGH it. Culling early (this was 4) makes the title and the
 *  ridges quietly evaporate instead. */
const CULL_SCALE = 28

/* The pass-through fade is expressed in REMAINING DISTANCE, not scale.
 *
 * `scale` is 1/(1 − cameraZ/depth), so it runs away hyperbolically in the last
 * fraction of the approach: fading between two scale values (this used to be
 * 14 → 22) compresses the whole fade into one or two frames, and the layer
 * pops off instead of streaking out. Fading on relD/depth — the fraction of
 * the original distance still to go — is linear in space, so the layer dims
 * evenly as it blows past whatever the camera's speed is.
 *
 * Keep this window LATE and SHORT. A layer that starts dimming at 4½× reads
 * as going transparent while you watch it — which is the one thing a
 * punch-through must not do. At 10× the layer is a blown-up patch with almost
 * nothing recognisable left in frame, so holding full opacity until then and
 * then dropping it over ~0.15s reads as the camera going past the thing
 * rather than the thing fading away.
 *
 * 0.10 ≈ scale 10; 0.035 ≈ scale 28.6, which is where CULL_SCALE drops it. */
const FADE_START_INV = 0.10
export const FADE_END_INV = 0.035
/* NOTE: these layers deliberately carry NO `will-change: transform`.
 * The hint promotes every layer to its own compositor texture at full scaled
 * size, and a scene like DepthScene stacks fourteen viewport-sized layers of
 * dense SVG. Remotion invalidates them all on every frame (it seeks CSS
 * animations per frame), so Chrome re-rasterized fourteen full-screen
 * textures per frame: ~30s per rendered frame with the mountains on screen,
 * versus well under 1s without the hint. Live playback is no worse either. */

interface DomDepthLayerProps {
  depth: number        // z-position (positive = further from start)
  worldX?: number      // % offset from vanishing point horizontally
  worldY?: number      // % offset from vanishing point vertically
  zIndex?: number      // explicit z-index override
  /** Drop the layer earlier than CULL_SCALE, with the fade compressed to
   *  match so it still reaches 0 before it goes.
   *
   *  Raster cost grows with the square of the scale: a viewport-sized layer
   *  at 28× is a 36k × 20k surface, and enough of those in one frame can push
   *  Chrome's GPU process into dropping compositing altogether — after which
   *  every one of them is rasterized in software and the render goes from
   *  minutes to hours. Layers that are only there to streak past (the star
   *  veil) have done their job by ~10× and should say so. */
  maxScale?: number
  /** Scale at which the fade to `maxScale` begins. Only meaningful together
   *  with maxScale; defaults to the shared distance-based window. */
  fadeFromScale?: number
  children: ReactNode
}

/**
 * Wraps a DOM element and positions it in the depth system using CSS transforms.
 *
 * Scale formula: scale = depth / (depth - cameraZ)
 *   - At cameraZ=0: all elements at scale 1.0 (normalized)
 *   - Closer elements (smaller depth) grow faster
 *   - When depth <= cameraZ: element is behind camera → returns null
 *
 * Off-center elements (worldX/worldY ≠ 0) drift to screen edges as they scale.
 */
export function DomDepthLayer({
  depth,
  worldX = 0,
  worldY = 0,
  zIndex,
  maxScale,
  fadeFromScale,
  children,
}: DomDepthLayerProps) {
  const cam = useContext(DepthCameraContext)
  const relD = depth - cam.cameraZ

  // Behind camera — gone (not faded)
  if (relD <= 0.001) return null

  const scale = depth / relD

  // Don't render if way too far away (invisible anyway)
  if (scale < 0.01) return null

  // …or so close that the layer is a blown-up patch filling the frame. Left
  // uncapped, `scale` runs to ~4500× as the camera reaches a layer, and a
  // viewport-sized element scaled that far makes Chrome try to rasterize a
  // multi-gigabyte layer — it survives that live (frames get dropped) but
  // wedges a Remotion render, which waits for the paint. The forward chain
  // never hit it (the camera starts past these layers at 1.2's slot); the
  // 2.3 reverse flies back through them. Fading out over the last stretch
  // keeps the pass-through soft instead of popping.
  const cull = maxScale ?? CULL_SCALE
  if (scale > cull) return null
  // Fade window, in remaining-distance terms. A layer with its own (lower)
  // cull needs its window moved with it so it still reaches zero exactly as
  // it is dropped, rather than popping off at partial opacity.
  const fadeEnd = maxScale ? 1 / maxScale : FADE_END_INV
  const fadeStart = fadeFromScale ? 1 / fadeFromScale : FADE_START_INV
  const inv = relD / depth
  const fadeT = Math.max(0, Math.min(1, (inv - fadeEnd) / (fadeStart - fadeEnd)))
  const proximityFade = fadeT * fadeT * (3 - 2 * fadeT)

  // Off-center drift: elements not at vanishing point rush to edges
  const driftX = worldX * scale
  const driftY = worldY * scale

  // Auto z-index: closer elements (smaller depth) get higher z-index
  const autoZ = zIndex ?? Math.round(200 - depth * 10)

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        transform: `translate(${driftX}%, ${driftY}%) scale(${scale})`,
        transformOrigin: `${cam.vanishX}% ${cam.vanishY}%`,
        zIndex: autoZ,
        opacity: proximityFade < 1 ? proximityFade : undefined,
        pointerEvents: 'none',
        // willChange deliberately omitted — see WILL_CHANGE_MAX_SCALE note.
      }}
    >
      {children}
    </div>
  )
}
