import { Composition } from 'remotion'
import { getAnimTime } from '../hooks/useAnimTime'
import { installThreeClockLock } from '../utils/threeClockLock'
import { DEFAULT_DURATION_SEC, FPS, SCENES, compositionId } from '../scenes/manifest'
import { makeSceneComposition } from './SceneComposition'
import FullVideo from './FullVideo'
import { TOTAL_DURATION_FRAMES, TOTAL_DURATION_SEC } from './timeline'
import ZoomVideo from './ZoomVideo'
import { makeFilmComponent } from './StoryFilm'
import { FILMS, filmById } from '../studio/films'
import { aspectById, draftSize } from '../studio/aspect'

/** The master's shape, declared once in films.ts (S5). */
const MASTER_ASPECT = aspectById(filmById('master').aspect)
const MASTER_DRAFT = draftSize(MASTER_ASPECT)

/**
 * Spotcheck hook: `--props='{"spotFps":12}'` re-times the whole master
 * composition to that frame rate. Time stays correct because everything
 * downstream reads useVideoConfig().fps (RemotionTimeDriver, FullVideo's
 * Sequence placement) — a 12fps render is the same film sampled 2.5× more
 * coarsely, not a slowed-down one. Ignored (fps stays 30) when absent.
 */
const spotMetadata = (durationSec: number) =>
  ({ props }: { props: { spotFps?: number } }) => {
    const fps = props.spotFps && props.spotFps > 0 ? props.spotFps : FPS
    return { fps, durationInFrames: Math.round(durationSec * fps) }
  }

const fullVideoMetadata = spotMetadata(TOTAL_DURATION_SEC)

// Remotion is the time authority here (RemotionTimeDriver seeks the shared
// anim clock every frame). Lock THREE.Clock to that clock so legacy scenes
// animating off useFrame(({clock})) render frame-accurately too.
installThreeClockLock(getAnimTime)

// One composition per manifest entry. Ids are the scene keys sanitised to
// Remotion's [a-zA-Z0-9-] charset ('3.2' → '3-2') — assert that stays unique.
{
  const seen = new Map<string, string>()
  for (const s of SCENES) {
    const id = compositionId(s.key)
    const clash = seen.get(id)
    if (clash) throw new Error(`composition id '${id}' collides: '${clash}' vs '${s.key}'`)
    seen.set(id, s.key)
  }
}

export default function RemotionRoot() {
  return (
    <>
      {SCENES.map(entry => (
        <Composition
          key={entry.key}
          id={compositionId(entry.key)}
          component={makeSceneComposition(entry)}
          durationInFrames={Math.round(FPS * (entry.durationSec ?? DEFAULT_DURATION_SEC))}
          fps={FPS}
          width={1920}
          height={1080}
        />
      ))}

      {/* Master video: every scene per SCRIPT.md timings + song audio
          (src/remotion/timeline.ts), at the shape the master film declares
          and a draft variant of the same shape. */}
      <Composition
        id="FullVideo"
        component={FullVideo}
        durationInFrames={TOTAL_DURATION_FRAMES}
        fps={FPS}
        width={MASTER_ASPECT.width}
        height={MASTER_ASPECT.height}
        calculateMetadata={fullVideoMetadata}
      />
      <Composition
        id="FullVideo720"
        component={FullVideo}
        durationInFrames={TOTAL_DURATION_FRAMES}
        fps={FPS}
        width={MASTER_DRAFT.width}
        height={MASTER_DRAFT.height}
        calculateMetadata={fullVideoMetadata}
      />

      {/* Studio films (FILMS registry): one delivery + one draft composition
          per non-master film — adding a film never touches this file
          (SPEC §12.3; the master keeps hand-written FullVideo for audio).

          The SIZE comes from the film's declared aspect (S5), which is what
          makes "this film is 9:16" a fact about the render rather than about
          the preview. Absent = 16:9, which is every film today, so these
          numbers are unchanged.

          They take the spotcheck hook too. The studio's own proxy render
          calls render-fast with `--fps 12`, and without this that flag would
          be silently ignored on every film except the master. */}
      {FILMS.filter(f => f.id !== 'master').flatMap(film => {
        const Film = makeFilmComponent(film.items, film.composition, film.audio, film.overlays)
        const frames = Math.round(film.durationSec * FPS)
        const meta = spotMetadata(film.durationSec)
        const a = aspectById(film.aspect)
        const draft = draftSize(a)
        return [
          <Composition key={film.composition} id={film.composition} component={Film}
            durationInFrames={frames} fps={FPS} width={a.width} height={a.height}
            calculateMetadata={meta} />,
          <Composition key={`${film.composition}720`} id={`${film.composition}720`} component={Film}
            durationInFrames={frames} fps={FPS} width={draft.width} height={draft.height}
            calculateMetadata={meta} />,
        ]
      })}

      {/* Legacy hand-wired zoom video (DepthScene with its own effectiveTime
          plumbing + audio) — kept until FullVideo supersedes it. */}
      <Composition
        id="ZoomThrough"
        component={ZoomVideo}
        durationInFrames={FPS * 190}
        fps={FPS}
        width={1920}
        height={1080}
      />
      <Composition
        id="ZoomThrough720p"
        component={ZoomVideo}
        durationInFrames={FPS * 190}
        fps={FPS}
        width={1280}
        height={720}
      />
    </>
  )
}
