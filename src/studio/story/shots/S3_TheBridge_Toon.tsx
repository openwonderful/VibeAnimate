/** story.3-B — "The bridge", anime grade (see AnimeLook). */
import { createScene } from '../../../scenes/createScene'
import { WorldMount } from '../../worlds/World'
import { LANTERN_VALLEY } from '../../worlds/LanternValley'
import { AnimeLook } from '../../materials/AnimeLook'
import { Crossers, S3_SHELL } from './S3_TheBridge'

export default createScene(S3_SHELL, function S3_Toon() {
  return (
    <>
      <WorldMount
        world={LANTERN_VALLEY}
        shot={{ lighting: 'night', visibleRegions: ['ground', 'river', 'road', 'mountains'], actors: <Crossers /> }}
      />
      <AnimeLook bloom={1.05} />
    </>
  )
})
