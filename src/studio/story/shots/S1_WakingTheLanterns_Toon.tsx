/** story.1-B — "Waking the lanterns", anime grade (see AnimeLook). */
import { createScene } from '../../../scenes/createScene'
import { WorldMount } from '../../worlds/World'
import { LANTERN_VALLEY } from '../../worlds/LanternValley'
import { AnimeLook } from '../../materials/AnimeLook'
import { DistantKeeper, S1_SHELL } from './S1_WakingTheLanterns'

export default createScene(S1_SHELL, function S1_Toon() {
  return (
    <>
      <WorldMount world={LANTERN_VALLEY} shot={{ lighting: 'dusk', actors: <DistantKeeper /> }} />
      <AnimeLook bloom={0.9} />
    </>
  )
})
