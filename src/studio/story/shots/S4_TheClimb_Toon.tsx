/** story.4-B — "The climb", anime grade (see AnimeLook). */
import { createScene } from '../../../scenes/createScene'
import { WorldMount } from '../../worlds/World'
import { LANTERN_VALLEY } from '../../worlds/LanternValley'
import { AnimeLook } from '../../materials/AnimeLook'
import { Climbers, S4_SHELL } from './S4_TheClimb'

export default createScene(S4_SHELL, function S4_Toon() {
  return (
    <>
      <WorldMount
        world={LANTERN_VALLEY}
        shot={{ lighting: 'night', visibleRegions: ['ground', 'hill', 'mountains'], actors: <Climbers /> }}
      />
      <AnimeLook />
    </>
  )
})
