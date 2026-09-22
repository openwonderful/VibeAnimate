import { useMemo, type ReactNode } from 'react'
import { AnimTimeContext } from '../../hooks/useAnimTime'
import { DepthCameraContext, DomDepthLayer, FADE_END_INV, type DepthCameraState } from './DepthCamera'
import CityBuildings3D from './CityBuildings3D'
import StadiumFrame3D from './StadiumFrame3D'
import DepthCameraSync from './DepthCameraSync'
import StarVeil from './StarVeil'

// Scene 1 layers
import StarField from '../act1/components/StarField'
import MoonOrb from '../act1/components/MoonOrb'
import CloudLayer from '../act1/components/CloudLayer'
import MountainLayer from '../act1/components/MountainLayer'
import CraneLayer from '../act1/components/CraneLayer'
import BlossomLayer from '../act1/components/BlossomLayer'
import WaveLayer from '../act1/components/WaveLayer'
import SkyLayer from '../act1/components/SkyLayer'
import IrworobongdoScreen from '../act1/components/IrworobongdoScreen'
import Ribbons from '../act1/components/Ribbons'
import LatticePattern from '../act1/components/LatticePattern'
import TitleTreatment from '../act1/components/TitleTreatment'
import HangeulAccents from '../act1/components/HangeulAccents'
import MinhwaBorder from '../act1/components/MinhwaBorder'

// Scene 2
import Scene2 from '../act2/Scene2'

export const MAX_CAMERA_Z = 69.9
/** Seconds the whole flight takes: at this point the camera has reached
 *  MAX_CAMERA_Z, the far end of the corridor, and the arena has just finished
 *  bursting open on top of it. "Put your phone down" is at 0:20.31. */
export const SONG_DURATION = 20.2

/* ══ The flight, and the three beats it is built around ═══════════
 *
 * The song's opening line lands at 0:07.24 ("I need"), and the shot is timed
 * so the camera punches out through the back of the night sky exactly on it.
 * Everything before that is a cascade of Scene 1 layers streaking past —
 * title, ridges, cloud band, moon, sky, stars — each one a thing we travelled
 * through rather than a thing that dissolved.
 *
 * Depths are packed tighter than they used to be (the sky used to sit at 20+,
 * where it barely grew at all and simply hung there while the near layers
 * evaporated). Packing them means the whole landscape empties out over ~2
 * seconds — one continuous punch, not six unrelated fades.
 */
/** "I need" — body_to_body.lrc 00:07.24. The starfield clears exactly here. */
const T_PUNCH = 7.24
/** The farthest Scene 1 layer (starfield / Irworobongdo screen). Everything
 *  else is nearer, so the cascade runs bottom-up and ends on the stars. */
export const SCENE1_FAR_DEPTH = 3.8
/** Camera depth at which SCENE1_FAR_DEPTH has completely faded out. */
const Z_PUNCH = SCENE1_FAR_DEPTH * (1 - FADE_END_INV)

/* Phase A (0 → T_PUNCH): cubic. A quadratic (what this was) is already moving
 * at t=0 and has the title filling the frame by t=3 — the opening read as
 * "cut off", with no time to take in the moon, the cloud band or the cranes
 * before they were gone. Cubic creeps for the first two seconds and then
 * rushes, which is both calmer at the top and punchier at the bottom. */
const A_PUNCH = Z_PUNCH / (T_PUNCH * T_PUNCH * T_PUNCH)
const V_PUNCH = 3 * A_PUNCH * T_PUNCH * T_PUNCH

/* Phase B (T_PUNCH → T_CORRIDOR): the city. Gentle constant acceleration,
 * placed so the camera is still ~3 units short of the pixel "I need" sign
 * (z=17) when it lights at 0:13.05 and flies through it just before the flash
 * ends at 0:15.05. */
const CORRIDOR_Z = 19.9         // where the corridor walls begin
const T_CORRIDOR = 15.6
const DT_CITY = T_CORRIDOR - T_PUNCH
const A_CITY = 2 * (CORRIDOR_Z - Z_PUNCH - V_PUNCH * DT_CITY) / (DT_CITY * DT_CITY)
const V_CORRIDOR = V_PUNCH + A_CITY * DT_CITY

/* Phase C (T_CORRIDOR → end): the blast down the corridor to the arena.
 * 50 units in the last 4.6s, accelerating the whole way. */
const DT_CORRIDOR = SONG_DURATION - T_CORRIDOR
const DZ_CORRIDOR = MAX_CAMERA_Z - CORRIDOR_Z
const A_CORRIDOR = 2 * (DZ_CORRIDOR - V_CORRIDOR * DT_CORRIDOR) / (DT_CORRIDOR * DT_CORRIDOR)

export function easeCamera(time: number): number {
  const t = Math.min(SONG_DURATION, Math.max(0, time))
  if (t <= T_PUNCH) return A_PUNCH * t * t * t
  if (t <= T_CORRIDOR) {
    const dt = t - T_PUNCH
    return Z_PUNCH + V_PUNCH * dt + 0.5 * A_CITY * dt * dt
  }
  const dt = t - T_CORRIDOR
  return CORRIDOR_Z + V_CORRIDOR * dt + 0.5 * A_CORRIDOR * dt * dt
}

interface DepthSceneProps {
  effectiveTime: number
  fov?: number
  /** Render prop for the 3D canvas — lets caller swap Canvas vs ThreeCanvas */
  renderCanvas: (children: ReactNode) => ReactNode
  /** Optional overlay (e.g. AudioControls) */
  overlay?: ReactNode
  /** Draw the "Body to Body" title card on the Scene 1 layers. True for the
   *  opening (1.1/1.2); the 2.3 reverse lands on the same mountains later in
   *  the video, where an opening title would read as a mistake. */
  showTitle?: boolean
  /** Render the arena (Scene 2) and its portal reveal at all. The 2.3 reverse
   *  brings its own stadium — the one it just pulled back from, with the
   *  members still on it — and closes the portal around that, so it turns
   *  this copy off rather than crossfading between two stadiums. */
  arena?: boolean
}

/**
 * Shared depth scene — the actual visual content.
 * Used by both DepthComposition (live playback) and Remotion composition.
 */
export default function DepthScene({
  effectiveTime,
  fov = 75,
  renderCanvas,
  overlay,
  showTitle = true,
  arena = true,
}: DepthSceneProps) {
  const cameraZ = easeCamera(effectiveTime)

  const cameraState: DepthCameraState = useMemo(
    () => ({
      cameraZ,
      fov,
      vanishX: 50,
      vanishY: 24,
      maxCameraZ: MAX_CAMERA_Z,
    }),
    [cameraZ, fov],
  )

  return (
    <AnimTimeContext.Provider value={effectiveTime}>
    <DepthCameraContext.Provider value={cameraState}>
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          overflow: 'hidden',
          background: '#050A14',
        }}
      >
        {/* ═══ Scene 2 — tiny dot from t=18, zoom-out reveal 19.3→20.1 ═══ */}
        {(() => {
          // "I need the whole stadium to jump" is at 0:18.65 — the speck is
          // already sitting at the end of the corridor when the line lands,
          // and the arena bursts open to fill the frame on the beat after it,
          // at 0:20.2, which is also where the corridor blast ends and where
          // the drop shakes the whole picture. Opening it early (this was
          // 17.9 → 18.6) put the reveal a beat and a half ahead of its cue.
          const dotAppearTime = 18.0  // static tiny dot visible from here
          const clipStartTime = 19.3  // zoom-out begins
          const clipEndTime = 20.2    // full stadium revealed
          if (!arena || effectiveTime < dotAppearTime) return null

          // Before clipStartTime: hold as a static tiny dot (progress=0)
          // After clipStartTime: animate the zoom-out
          const progress = effectiveTime < clipStartTime
            ? 0
            : Math.min(1, (effectiveTime - clipStartTime) / (clipEndTime - clipStartTime))

          // Ease-in cubic: slow buildup, then rapid burst at the end
          const eased = progress * progress * progress

          // Clip-path inset: 49% (tiny 2% viewport speck) → 0% (full screen)
          const inset = 49 * (1 - eased)
          // Rounded corners: organic portal feel, shrinks to 0
          const borderRadius = Math.round(30 * (1 - eased))

          // Scale: a light push (1.35× → 1.0), not the 2.5× this used to be.
          // At 2.5 the window showed only the middle of the arena — the dark,
          // blue-lit centre — with the purple side stands and the lit crowd
          // cropped away outside it. The frame then snapped to the full
          // framing at handover and all the purple arrived at once, which
          // read as a colour filter being switched on rather than as one
          // continuous shot. Keeping the crop shallow means the arena is the
          // same colour opening as it is open.
          const scale = 1 + 0.35 * (1 - eased)

          // Blur: 12px → 0px (clears quickly so most of the reveal is sharp)
          const blurProgress = Math.min(1, progress / 0.5)
          const blur = 12 * (1 - blurProgress * blurProgress)

          // No brightness lift — it was the other half of the mismatch, since
          // 2.1-zoom takes over with no filter at all.
          const filterStr = blur > 0.1 ? `blur(${blur.toFixed(2)}px)` : undefined

          return (
            <div style={{
              position: 'absolute', inset: 0,
              zIndex: 20,
              overflow: 'hidden',
              clipPath: inset > 0.05
                ? `inset(${inset}% round ${borderRadius}px)`
                : undefined,
              filter: filterStr,
              willChange: 'clip-path, filter',
            }}>
              <div style={{
                width: '100%', height: '100%',
                transform: scale > 1.001 ? `scale(${scale.toFixed(3)})` : undefined,
                transformOrigin: '50% 25%',
                willChange: 'transform',
              }}>
                <Scene2 showConfetti={false} />
              </div>
            </div>
          )
        })()}

        {/* ═══ 3D Canvas ═══
            Faded up early (z 1.0 → 2.2, ≈t 4.7 → 6.1) so the city is already
            materialising out of the haze while the ridges and the sky are
            still streaking past above it — the "buildings coming out of the
            mist" beat, and the thing that makes the punch at 0:07 reveal
            something rather than open onto black. The Scene 1 DOM layers sit
            above this canvas (their auto z-index is far higher), so an early
            reveal cannot paint over them. */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 15, pointerEvents: 'none',
          opacity: Math.max(0, Math.min(1, (cameraZ - 1.0) / 1.2)),
          visibility: cameraZ > 1.0 ? 'visible' : 'hidden',
        }}>
          {renderCanvas(
            <>
              <DepthCameraSync />
              <ambientLight intensity={0.3} />
              <fog attach="fog" args={['#050A14', 3, 18]} />
              <CityBuildings3D />
              <StadiumFrame3D />
            </>,
          )}
        </div>

        {/* ═══ Scene 1 DOM layers ═══
            The cascade the opening is built on. Read bottom-up, these clear
            the frame in order — border and title (≈4.3–4.6s), blossoms and
            ribbons, the ridges (≈6.3s), the cloud band, the moon, and finally
            the starfield, which is gone at 0:07.24 exactly as the vocal says
            "I need". That last one is the punch: the camera goes out through
            the back of the night sky and the city is already there.

            The sky group used to sit at depth 20–30, where it barely grew and
            simply hung in place while everything near it evaporated; nothing
            read as travelled-through. Packed in at 3.0–3.8 the whole
            landscape empties in one continuous move instead. */}
        {/* Three shells of stars, each projected per-star onto one canvas
            rather than sitting in a DomDepthLayer — see StarVeil. That is
            what makes this a punch rather than a dissolve: every star holds
            full brightness right up to the moment it crosses the edge of
            frame. The far shell's depth is set so its last stars clear on
            0:07.24, the vocal. */}
        <StarVeil zIndex={162} />
        <DomDepthLayer depth={SCENE1_FAR_DEPTH}><StarField /></DomDepthLayer>
        {/* The painted screen goes with the ridges rather than with the sky:
            left further out it hangs as a flat teal wash across the city for
            a second after the mountains have gone. */}
        <DomDepthLayer depth={3.1}><IrworobongdoScreen /></DomDepthLayer>
        <DomDepthLayer depth={3.6}><SkyLayer /></DomDepthLayer>
        <DomDepthLayer depth={3.4}><MoonOrb /></DomDepthLayer>
        <DomDepthLayer depth={3.0}><CloudLayer /></DomDepthLayer>
        <DomDepthLayer depth={2.5}><MountainLayer /></DomDepthLayer>
        <DomDepthLayer depth={2.5}><CraneLayer /></DomDepthLayer>
        <DomDepthLayer depth={1.5}><BlossomLayer /></DomDepthLayer>
        <DomDepthLayer depth={1.3}><WaveLayer /></DomDepthLayer>
        <DomDepthLayer depth={1.5}><Ribbons /></DomDepthLayer>
        <DomDepthLayer depth={1.0}><LatticePattern /></DomDepthLayer>
        {showTitle && <DomDepthLayer depth={1.0}><TitleTreatment /></DomDepthLayer>}
        <DomDepthLayer depth={1.0}><HangeulAccents showTitleText={showTitle} /></DomDepthLayer>
        <DomDepthLayer depth={1.0}><MinhwaBorder /></DomDepthLayer>

        {overlay}
      </div>
    </DepthCameraContext.Provider>
    </AnimTimeContext.Provider>
  )
}
