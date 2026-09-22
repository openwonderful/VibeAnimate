/**
 * world.dawn — Lantern Valley, shrine hill at dawn: slow reverent push-in
 * on the hilltop shrine and the old persimmon tree. Only ground/hill/
 * mountains are mounted; the village below is culled out of existence.
 */
import { createScene } from '../../../../scenes/createScene'
import { WorldMount } from '../../World'
import { LANTERN_VALLEY } from '../index'

export default createScene({
  background: '#3A2438',
  three: {
    camera: { position: [22, 8, -6], fov: 42 },
    debugTarget: [15, 4.8, -15],
  },
  cameraMoves: [{
    a: { pos: [22, 8, -6], target: [15, 4.5, -15] },
    b: { pos: [18, 6.2, -10.5], target: [15, 5.2, -15] },
    t0: 0.5, t1: 9.5, ease: 'inout',
  }],
}, function ShrineDawn() {
  return (
    <WorldMount
      world={LANTERN_VALLEY}
      shot={{ lighting: 'dawn', visibleRegions: ['ground', 'hill', 'mountains'] }}
    />
  )
})
