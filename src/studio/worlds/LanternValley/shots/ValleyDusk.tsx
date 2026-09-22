/**
 * world.dusk — Lantern Valley, establishing wide: the whole valley at
 * dusk, camera drifting down from the ridge toward the village. All
 * regions mounted (it's the establishing shot — everything is visible).
 */
import { createScene } from '../../../../scenes/createScene'
import { WorldMount } from '../../World'
import { LANTERN_VALLEY } from '../index'

export default createScene({
  background: '#2A1E3A',
  three: {
    camera: { position: [24, 9, 22], fov: 44 },
    debugTarget: [0, 1.5, -4],
  },
  cameraMoves: [{
    a: { pos: [24, 9, 22], target: [0, 1, -4] },
    b: { pos: [13, 4.5, 11], target: [0, 1.8, -5] },
    t0: 0.5, t1: 9.5, ease: 'inout',
  }],
}, function ValleyDusk() {
  return (
    <WorldMount
      world={LANTERN_VALLEY}
      shot={{ lighting: 'dusk' }}
    />
  )
})
