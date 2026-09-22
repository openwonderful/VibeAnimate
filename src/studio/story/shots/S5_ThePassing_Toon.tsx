/** story.5-B — "The passing", anime grade (see AnimeLook). */
import { createScene } from '../../../scenes/createScene'
import { WorldMount } from '../../worlds/World'
import { LANTERN_VALLEY } from '../../worlds/LanternValley'
import { AnimeLook } from '../../materials/AnimeLook'
import { ThePass, S5_SHELL } from './S5_ThePassing'

export default createScene(S5_SHELL, function S5_Toon() {
  return (
    <>
      <WorldMount
        world={LANTERN_VALLEY}
        shot={{ lighting: 'night', visibleRegions: ['ground', 'hill', 'mountains'], actors: <ThePass /> }}
      />
      <AnimeLook bloom={1.1} />
    </>
  )
})
