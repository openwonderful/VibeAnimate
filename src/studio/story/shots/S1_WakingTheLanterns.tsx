/* eslint-disable react-refresh/only-export-components -- scene file: local actors + createScene default export */
/**
 * story.1 — "Waking the lanterns" (0:00–0:10, dusk, valley wide).
 * Crane down from the ridge; the lantern road is a vein of gold through
 * the dimming valley; the keeper is a small walking glow on the road.
 */
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { createScene } from '../../../scenes/createScene'
import { getAnimTime } from '../../../hooks/useAnimTime'
import { GoldFigure } from '../../../scenes/characters/goldFigure'
import { Lantern } from '../../ingredients/Lantern'
import { Editable } from '../../editable/Editable'
import { WorldMount } from '../../worlds/World'
import { LANTERN_VALLEY } from '../../worlds/LanternValley'
import { StoryPost } from '../StoryPost'

/**
 * The keeper, far away, walking the road toward the village.
 *
 * The walk is animated on an inner group so the <Editable> wrapper stays
 * free for manual placement — in the studio you can select the keeper,
 * drag him off the road with the gizmo or `@keeper move x 0.4` in the
 * console, and the walk cycle keeps playing underneath.
 */
export function DistantKeeper() {
  const ref = useRef<THREE.Group>(null)
  useFrame(() => {
    if (!ref.current) return
    const t = getAnimTime()
    ref.current.position.z = 14 - t * 0.55 // gate-ward drift along the road
  })
  return (
    <Editable
      id="keeper"
      name="The Keeper"
      kind="character"
      sourcePath="src/studio/story/shots/S1_WakingTheLanterns.tsx"
    >
      <group ref={ref} position={[0.6, 0, 14]} rotation={[0, Math.PI, 0]}>
        <GoldFigure kind="adult" pose="walking" inPlace />
        <Lantern position={[-0.45, 1.05, 0.1]} scale={0.55} cordLength={0.2} light swayPhase={0.8} />
      </group>
    </Editable>
  )
}

export const S1_SHELL = {
  background: '#2A1E3A',
  three: {
    camera: { position: [26, 10, 24] as [number, number, number], fov: 44 },
    debugTarget: [0, 1.5, 0] as [number, number, number],
  },
  cameraMoves: [{
    a: { pos: [26, 10, 24] as [number, number, number], target: [0, 1, 0] as [number, number, number] },
    b: { pos: [11, 3.8, 9] as [number, number, number], target: [0, 1.8, -2] as [number, number, number] },
    t0: 0.4, t1: 9.6, ease: 'inout' as const,
  }],
}

export default createScene(S1_SHELL, function S1_WakingTheLanterns() {
  return (
    <>
      <WorldMount
        world={LANTERN_VALLEY}
        shot={{ lighting: 'dusk', actors: <DistantKeeper /> }}
      />
      <StoryPost />
    </>
  )
})
