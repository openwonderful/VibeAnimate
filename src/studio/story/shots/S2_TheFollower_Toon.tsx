/**
 * story.2-B — "The Follower" in the anime look: the same Lantern Lane
 * night shot (same world, same actors, same camera move) run through the
 * Flow Studio toon stack. Per the NPR research notes (PRD wake 3):
 * warm-shifted shadow ramp instead of plain darkening, soft-ish band
 * transition, cool rim to separate figures from the night, ink outlines.
 */
import { createScene } from '../../../scenes/createScene'
import { WorldMount } from '../../worlds/World'
import { LANTERN_VALLEY } from '../../worlds/LanternValley'
import { AnimeLook } from '../../materials/AnimeLook'
import { S2Actors, S2_SHELL } from './S2_TheFollower'

export default createScene(S2_SHELL, function S2_TheFollower_Toon() {
  return (
    <>
      <WorldMount
        world={LANTERN_VALLEY}
        shot={{
          lighting: 'night',
          visibleRegions: ['ground', 'village', 'road'],
          actors: <S2Actors />,
        }}
      />
      <AnimeLook />
    </>
  )
})
