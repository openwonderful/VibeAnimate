import { useBeatSync } from '../../hooks/useBeatSync'
import Act2_2_B, { type Act2_2_BProps } from './Act2_2_B'
import StadiumBackground from './stadium/StadiumBackground'
import StadiumStructure from './stadium/StadiumStructure'
import CrowdLayer from './stadium/CrowdLayer'
import ArmyBombField from './stadium/ArmyBombField'
import StadiumStage from './stadium/StadiumStage'
import SoundRig from './stadium/SoundRig'
import SpotlightBeams from './stadium/SpotlightBeams'
import StadiumLighting from './stadium/StadiumLighting'
import CameraFlashes from './stadium/CameraFlashes'
import ForegroundCrowd from './stadium/ForegroundCrowd'
import CrowdBeams from './stadium/CrowdBeams'
import ConfettiLayer from './stadium/ConfettiLayer'

interface Scene2Props {
  /** Pass-through overrides for the embedded `<Act2_2_B />` canvas.
   *  Defaults preserve standalone Scene 2 behavior (distant stadium camera,
   *  no member figures). Act2Zoom uses this to swap in flyover camera + a
   *  high `dpr` so the small canvas stays crisp when CSS-scaled up. */
  embeddedStageProps?: Partial<Act2_2_BProps>
  /** Opacity applied to the stadium dressing (everything except the embedded
   *  stage canvas and the radial background gradient). Lets Act2Zoom
   *  dissolve the dressing while keeping the stage canvas visible. */
  dressingOpacity?: number
  /** Percentage by which the embedded canvas is sized past the mini-stage
   *  rect's box, for the "3D objects extending past the rect" feather effect.
   *  Default 40 = canvas container is 140% of the rect. Act2Zoom tweens this
   *  to 0 as the zoom completes so the final viewport-fill frame matches
   *  Act 2.2 standalone exactly (no overflow past viewport edges). */
  embeddedStageOversizePct?: number
  /** Radial mask inner-opaque radius (0..1). 0.55 = the default soft feather
   *  for blending the small rect into the stadium dressing. */
  maskInner?: number
  /** When true, skip rendering the embedded mini-stage canvas entirely so
   *  only the surrounding stadium dressing draws. Act2Zoom uses this to
   *  layer its own full-viewport <Act2_2_B /> behind a dressing-only Scene2
   *  for the 2.1 → 2.2 transition (the camera lerp does the zoom, not CSS). */
  omitEmbeddedCanvas?: boolean
  /** Which dressing layers to render. 'under' = background + layers that sit
   *  below the stage canvas; 'over' = the veil layers above it (transparent
   *  background). Act2Zoom renders one Scene2 of each flavor and sandwiches
   *  its own canvas between them so the stage is never hidden behind the
   *  opaque stadium background. Default 'all' = standalone behavior. */
  layers?: 'all' | 'under' | 'over'
  /** Apply the beat-sync camera shake on the container (default true).
   *  Act2Zoom passes false and applies shake itself, on the whole composite,
   *  so both Scene2 instances and the canvas shake as one. */
  shake?: boolean
  /** Draw falling confetti. False while the arena is still a preview inside
   *  the depth chain's portal: that copy is scaled 2.5× behind a clip, so the
   *  confetti reads as huge flakes over the whole screen and then snaps to
   *  normal size the instant the portal hands over. The confetti belongs to
   *  the moment we're inside the arena, not to the approach. */
  showConfetti?: boolean
}

// Mini-stage rect — defines where the rect "is" in viewport space.
const STAGE_LEFT = '42.71%'  // (960 - 140) / 1920
const STAGE_TOP = '15.86%'   // (250 - 78.75) / 1080
const STAGE_W = '14.58%'     // 280 / 1920, 157.5 / 1080 (viewport is 16:9 so same %)

// Default oversize past the rect for the "3D extends past the box" feather.
// Act2Zoom tweens this toward 0 as the zoom completes.
const DEFAULT_OVERSIZE_PCT = 40

// Default radial feather inner-opaque radius. Anything inside this fraction
// of the ellipse is fully opaque; from here to 100% the canvas fades into the
// surrounding dressing.
const DEFAULT_MASK_INNER = 0.55

export default function Scene2({
  embeddedStageProps,
  dressingOpacity = 1,
  embeddedStageOversizePct = DEFAULT_OVERSIZE_PCT,
  maskInner = DEFAULT_MASK_INNER,
  omitEmbeddedCanvas = false,
  layers = 'all',
  shake = true,
  showConfetti = true,
}: Scene2Props = {}) {
  const { shakeX, shakeY } = useBeatSync();
  const stageMask = `radial-gradient(ellipse at center, black ${(maskInner * 100).toFixed(2)}%, transparent 100%)`

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        background: layers === 'over'
          ? 'none'
          : 'radial-gradient(ellipse at 50% 80%, #0A0515 0%, #050510 50%, #020208 100%)',
        transform: shake && (shakeX || shakeY) ? `translate(${shakeX}px, ${shakeY}px)` : undefined,
      }}
    >
      {/* Dressing layers BELOW the embedded stage canvas (z 10..35 in their
          original definitions). `isolation: isolate` creates a stacking
          context so the inner z-indices don't bubble up and paint over the
          canvas; the wrapper itself sits at zIndex 1, beneath the canvas. */}
      {layers !== 'over' && (
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 1,
          isolation: 'isolate',
          opacity: dressingOpacity,
          pointerEvents: 'none',
        }}
      >
        <StadiumBackground />
        <StadiumStructure />
        <CrowdLayer />
        <ArmyBombField />
      </div>
      )}

      {/* Embedded 3D stage. Outer div = the logical mini-stage rect; inner
          div oversizes the canvas so geometry extends past the rect, with a
          radial mask feathering the overflow into the surrounding dressing.
          zIndex 2 puts it between the two dressing wrappers (1 and 3).
          Omitted by Act2Zoom, which renders its own full-viewport canvas. */}
      {layers === 'all' && !omitEmbeddedCanvas && (
        <div
          style={{
            position: 'absolute',
            left: STAGE_LEFT,
            top: STAGE_TOP,
            width: STAGE_W,
            height: STAGE_W,
            zIndex: 2,
            pointerEvents: 'none',
            overflow: 'visible',
            maskImage: stageMask,
            WebkitMaskImage: stageMask,
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: `-${embeddedStageOversizePct / 2}%`,
              top: `-${embeddedStageOversizePct / 2}%`,
              width: `${100 + embeddedStageOversizePct}%`,
              height: `${100 + embeddedStageOversizePct}%`,
            }}
          >
            <Act2_2_B
              cameraMode="stadium"
              showMembers={false}
              {...embeddedStageProps}
              embedded
            />
          </div>
        </div>
      )}

      {/* Dressing layers ABOVE the embedded stage canvas (z 40..75 in their
          original definitions — CrowdBeams, StadiumStage bloom/haze/towers,
          spotlight beams, stadium lighting, confetti, camera flashes,
          foreground crowd). These veil the stage; they're what gives the
          "Arirang behind the stage lights" look at t=0. zIndex 3 sits this
          wrapper above the canvas; isolation: isolate keeps inner z-indices
          contained. */}
      {layers !== 'under' && (
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 3,
          isolation: 'isolate',
          opacity: dressingOpacity,
          pointerEvents: 'none',
          willChange: dressingOpacity < 1 ? 'opacity' : undefined,
        }}
      >
        <CrowdBeams />
        <StadiumStage />
        <SoundRig />
        <SpotlightBeams />
        <StadiumLighting />
        {showConfetti && <ConfettiLayer />}
        <CameraFlashes />
        <ForegroundCrowd />
      </div>
      )}
    </div>
  )
}
