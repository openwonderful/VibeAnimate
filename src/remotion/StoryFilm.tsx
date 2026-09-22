/* eslint-disable react-refresh/only-export-components -- composition-factory module, no fast-refresh boundary needed */
/**
 * Film composition factory — turns any FILMS-registry timeline into a
 * Remotion composition component (same mechanics as FullVideo; no audio
 * track yet — see SPEC §12.5). Root.tsx auto-registers one 1080p + one
 * 720p composition per non-master film, so adding a film never touches
 * Root (SPEC §12.3).
 */
import { Audio, Sequence, staticFile, useVideoConfig } from 'remotion'
import { useMemo } from 'react'
import type { ComponentType } from 'react'
import { sceneByKey } from '../scenes/manifest'
import { makeSceneComposition } from './SceneComposition'
import type { TimelineItem } from './timeline'
import { FILMS } from '../studio/films'

// Validate every registered film's keys at module load so a manifest
// rename fails the render loudly, not per-frame.
for (const film of FILMS) {
  for (const item of [...film.items, ...(film.overlays ?? [])]) {
    if (!sceneByKey(item.key)) {
      throw new Error(`film '${film.id}' references unknown scene key '${item.key}'`)
    }
  }
}

export function makeFilmComponent(timeline: TimelineItem[], displayName: string, audio?: string, overlays?: TimelineItem[]): ComponentType {
  function Film() {
    /*
     * The COMPOSITION's rate, never the manifest's constant.
     *
     * Root.tsx gives every film `calculateMetadata={spotMetadata(...)}`, so
     * `--props={"spotFps":12}` genuinely re-times the composition — and a
     * Sequence placed with a hardcoded 30 then lands 2.5x too far in. A clip
     * at 25s would start on frame 750 of a 12fps composition, which is 62.5
     * SECONDS in, past the end of a 60s film. FullVideo.tsx carries the same
     * rule and the same comment; this file is the other half of it, and was
     * the half the merge missed.
     */
    const { fps } = useVideoConfig()
    const items = useMemo(
      () => timeline.map(item => ({
        ...item,
        Scene: makeSceneComposition(sceneByKey(item.key)!, item.props),
      })),
      [],
    )
    const overlayItems = useMemo(
      // `{ overlay: true }` — a transparent wrapper. Without it this track
      // paints the scene factory's opaque background over the whole film.
      () => (overlays ?? []).map(item => ({
        ...item,
        Scene: makeSceneComposition(sceneByKey(item.key)!, item.props, { overlay: true }),
      })),
      [],
    )
    return (
      <>
        {audio && <Audio src={staticFile(audio)} />}
        {items.map(({ key, from, duration, offsetSec, Scene }, i) => (
          <Sequence
            key={`${key}@${i}`}
            name={key}
            from={Math.round(from * fps)}
            durationInFrames={Math.round(duration * fps)}
          >
            {/* In-point: shift the scene's local clock forward (blade support) */}
            {offsetSec
              ? <Sequence from={-Math.round(offsetSec * fps)}><Scene /></Sequence>
              : <Scene />}
          </Sequence>
        ))}
        {/* Overlay track — later in JSX = stacked above the base track */}
        {overlayItems.map(({ key, from, duration, Scene }) => (
          <Sequence
            key={`ov-${key}`}
            name={`overlay:${key}`}
            from={Math.round(from * fps)}
            durationInFrames={Math.round(duration * fps)}
          >
            <Scene />
          </Sequence>
        ))}
      </>
    )
  }
  Film.displayName = displayName
  return Film
}
