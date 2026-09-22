/**
 * <AnimeLook> — the film's anime grade in one drop-in: warm-shifted
 * soft-band toon ramp (amber shadows), cool fresnel rim, bloom+vignette,
 * ink outlines composed over the composer. Wrap any scene body:
 *
 *   <WorldMount … />
 *   <AnimeLook />
 *
 * Replaces <StoryPost> (it owns the EffectComposer).
 */
import { useMemo } from 'react'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import { ToonSwap, makeToonRamp } from './toon'
import { ToonOutlineRenderer } from './ToonOutline'

const INK = '#050810'

export function AnimeLook({ bloom = 1.0, rimIntensity = 0.8 }: {
  bloom?: number
  rimIntensity?: number
}) {
  const ramp = useMemo(
    () => makeToonRamp(['#241407', '#5A3A1E', '#B08050', '#FFF2DC'], 0.1),
    [],
  )
  return (
    <>
      <ToonSwap ramp={ramp} rim={{ color: '#9AC8FF', power: 2.4, intensity: rimIntensity }} />
      <EffectComposer>
        <Bloom mipmapBlur intensity={bloom} luminanceThreshold={0.55} luminanceSmoothing={0.3} />
        <Vignette eskil={false} offset={0.18} darkness={0.85} />
      </EffectComposer>
      <ToonOutlineRenderer overlay thickness={0.003} color={INK} />
    </>
  )
}
