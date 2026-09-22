/**
 * FullVideo — the master composition: every scene from timeline.ts in
 * sequence, with the song underneath. Each scene runs through the same
 * SceneComposition wrapper as its standalone composition, so its local time
 * starts at 0 when its sequence begins (scenes are authored from t=0).
 */
import { Audio, Sequence, staticFile, useVideoConfig } from 'remotion'
import { useMemo } from 'react'
import { SCENES, sceneByKey } from '../scenes/manifest'
import { makeSceneComposition } from './SceneComposition'
import { TIMELINE } from './timeline'

// Validate keys at module load so a manifest rename fails the render loudly.
for (const item of TIMELINE) {
  if (!sceneByKey(item.key)) {
    throw new Error(`timeline references unknown scene key '${item.key}' — keys: ${SCENES.map(s => s.key).join(', ')}`)
  }
}

/**
 * `spotFps` arrives via `--props` when render-fast is asked for a low-fps
 * spotcheck; the composition's calculateMetadata (Root.tsx) turns it into
 * the real fps, so here it only matters that Sequence placement follows
 * useVideoConfig() rather than the manifest constant — at 12fps a scene
 * starting at 90s starts on frame 1080, not 2700.
 */
export default function FullVideo(_props: { spotFps?: number }) {
  const { fps } = useVideoConfig()
  const items = useMemo(
    () => TIMELINE.map(item => ({
      ...item,
      Scene: makeSceneComposition(sceneByKey(item.key)!, item.props),
    })),
    [],
  )

  return (
    <>
      {/* The UNTOUCHED recording — 189.768s under a 190s film, so the last
          0.232s (seven frames of 8.55's fade) plays out silent, which is
          correct and deliberate; see the note in scripts/render-fast.mjs
          about why `-shortest` was removed rather than the film trimmed.
          body-to-body.mp3 used to be a spliced cut of the song (8s of silence
          at the death, one phrase replayed); the splice is gone and this file
          IS the original. The old cut is kept as body-to-body-spliced.mp3 and
          is referenced by nothing. */}
      <Audio src={staticFile('audio/body-to-body.mp3')} />
      {items.map(({ key, from, duration, offsetSec, Scene }, i) => (
        <Sequence
          key={`${key}@${i}`}
          name={key}
          from={Math.round(from * fps)}
          durationInFrames={Math.round(duration * fps)}
        >
          {offsetSec
            // `fps`, not the manifest's FPS: a spotcheck renders the whole
            // composition at 12, and an in-point measured at 30 would put
            // every bladed clip 2.5x too far into its scene.
            ? <Sequence from={-Math.round(offsetSec * fps)}><Scene /></Sequence>
            : <Scene />}
        </Sequence>
      ))}
    </>
  )
}
