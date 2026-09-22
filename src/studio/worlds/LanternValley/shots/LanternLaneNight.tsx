/* eslint-disable react-refresh/only-export-components -- scene file: local actors + createScene default export */
/**
 * world.night — Lantern Valley, village lane at night: low camera gliding
 * up the lane under the lantern line while the keeper and child walk
 * ahead. Region culling in action: only ground/village/road are mounted —
 * the mountains, river and shrine hill never enter the scene graph.
 */
import { createScene } from '../../../../scenes/createScene'
import { GoldFigure } from '../../../../scenes/characters/goldFigure'
import { Lantern } from '../../../ingredients/Lantern'
import { WorldMount } from '../../World'
import { LANTERN_VALLEY } from '../index'

function Actors() {
  return (
    <group position={[0.4, 0, -1]} rotation={[0, Math.PI, 0]}>
      <group position={[-0.5, 0, 0]}>
        <GoldFigure kind="adult" pose="walking" inPlace />
      </group>
      <group position={[0.55, 0, -0.2]}>
        <GoldFigure kind="child" pose="walking" inPlace phaseOffset={0.35} />
      </group>
      {/* The keeper carries a lantern */}
      <Lantern position={[-0.95, 1.05, 0.1]} scale={0.55} cordLength={0.25} light swayPhase={1.2} />
    </group>
  )
}

export default createScene({
  background: '#080E1F',
  three: {
    camera: { position: [-1.8, 1.8, 4.5], fov: 46 },
    debugTarget: [0, 1.8, -6],
  },
  cameraMoves: [{
    a: { pos: [-1.8, 1.8, 4.5], target: [0.4, 1.7, -5] },
    b: { pos: [1.4, 1.5, -1.5], target: [0.2, 2.0, -12] },
    t0: 0.5, t1: 9.5, ease: 'inout',
  }],
}, function LanternLaneNight() {
  return (
    <WorldMount
      world={LANTERN_VALLEY}
      shot={{
        lighting: 'night',
        visibleRegions: ['ground', 'village', 'road'],
        actors: <Actors />,
      }}
    />
  )
})
