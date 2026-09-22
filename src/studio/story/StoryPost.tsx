/**
 * StoryPost — the film's shared post stack: soft bloom that catches the
 * lantern gold + a gentle vignette. Kept identical across all six shots
 * so the film grades as one piece.
 */
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'

export function StoryPost({ bloom = 0.9 }: { bloom?: number }) {
  return (
    <EffectComposer>
      <Bloom mipmapBlur intensity={bloom} luminanceThreshold={0.55} luminanceSmoothing={0.3} />
      <Vignette eskil={false} offset={0.18} darkness={0.85} />
    </EffectComposer>
  )
}
