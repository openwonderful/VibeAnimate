/* eslint-disable react-refresh/only-export-components -- scene file: local actors + createScene default export */
/**
 * story.3 — "The bridge" (0:20–0:30, night, river crossing).
 * Side-on: the pair crosses the wooden bridge; the river carries the
 * lantern's reflection; the child reaches up toward the light.
 */
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { createScene } from '../../../scenes/createScene'
import { getAnimTime } from '../../../hooks/useAnimTime'
import { kf } from '../kf'
import { GoldFigure } from '../../../scenes/characters/goldFigure'
import { Lantern } from '../../ingredients/Lantern'
import { Fireflies } from '../../ingredients/Fireflies'
import { WorldMount } from '../../worlds/World'
import { LANTERN_VALLEY } from '../../worlds/LanternValley'
import { StoryPost } from '../StoryPost'

const BRIDGE_Z = 9.5
const DECK_Y = 0.5

export function Crossers() {
  const keeper = useRef<THREE.Group>(null)
  const child = useRef<THREE.Group>(null)
  useFrame(() => {
    const t = getAnimTime()
    // Walking +z→−z across the bridge deck (toward the village).
    if (keeper.current) keeper.current.position.z = kf(t, [[0, 12.4], [10, 6.8]])
    if (child.current) child.current.position.z = kf(t, [[0, 13.6], [10, 7.7]])
  })
  return (
    <>
      <group ref={keeper} position={[-0.45, DECK_Y, 12.4]} rotation={[0, Math.PI, 0]}>
        <GoldFigure kind="adult" pose="walking" inPlace />
        <Lantern position={[-0.45, 1.08, 0.1]} scale={0.55} cordLength={0.2} light swayPhase={0.5} />
      </group>
      <group ref={child} position={[0.5, DECK_Y, 13.6]} rotation={[0, Math.PI, 0]}>
        {/* Right hand reaching up toward the keeper's lantern */}
        <GoldFigure kind="child" pose="walking" inPlace phaseOffset={0.55} rightHandAt={[0.28, 1.15, -0.35]} />
      </group>
      {/* Fireflies over the river around the bridge */}
      <Fireflies position={[1, 0.4, BRIDGE_Z]} bounds={[10, 2.2, 5]} count={36} seed={9} />
    </>
  )
}

export const S3_SHELL = {
  background: '#080E1F',
  three: {
    camera: { position: [8, 1.3, 13.5] as [number, number, number], fov: 44 },
    debugTarget: [0, 1.2, BRIDGE_Z] as [number, number, number],
  },
  cameraMoves: [{
    a: { pos: [8, 1.3, 13.5] as [number, number, number], target: [-0.5, 1.2, 9.8] as [number, number, number] },
    b: { pos: [5.2, 1.9, 12.6] as [number, number, number], target: [-0.8, 1.3, 9.2] as [number, number, number] },
    t0: 0.4, t1: 9.6, ease: 'inout' as const,
  }],
}

export default createScene(S3_SHELL, function S3_TheBridge() {
  return (
    <>
      <WorldMount
        world={LANTERN_VALLEY}
        shot={{
          lighting: 'night',
          visibleRegions: ['ground', 'river', 'road', 'mountains'],
          actors: <Crossers />,
        }}
      />
      <StoryPost bloom={1.05} />
    </>
  )
})
