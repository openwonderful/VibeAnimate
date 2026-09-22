/* eslint-disable react-refresh/only-export-components -- scene file: local actors + createScene default export */
/**
 * story.2 — "The follower" (0:10–0:20, night, village lane).
 * Low tracking shot up the lantern lane. The keeper walks ahead; the
 * child slips out from between the houses and hurries to catch up.
 */
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { createScene } from '../../../scenes/createScene'
import { getAnimTime } from '../../../hooks/useAnimTime'
import { kf } from '../kf'
import { GoldFigure } from '../../../scenes/characters/goldFigure'
import { Lantern } from '../../ingredients/Lantern'
import { WorldMount } from '../../worlds/World'
import { LANTERN_VALLEY } from '../../worlds/LanternValley'
import { StoryPost } from '../StoryPost'

function Keeper() {
  const ref = useRef<THREE.Group>(null)
  useFrame(() => {
    if (!ref.current) return
    const t = getAnimTime()
    ref.current.position.z = -1.5 - t * 0.5
  })
  return (
    <group ref={ref} position={[-0.5, 0, -1.5]} rotation={[0, Math.PI, 0]}>
      <GoldFigure kind="adult" pose="walking" inPlace />
      <Lantern position={[-0.45, 1.05, 0.1]} scale={0.55} cordLength={0.2} light swayPhase={1.2} />
    </group>
  )
}

/** The child: darts out from beside a hanok, then falls in behind. */
function Child() {
  const ref = useRef<THREE.Group>(null)
  useFrame(() => {
    if (!ref.current) return
    const t = getAnimTime()
    // Out from the housefront, then trailing the keeper — path kept ahead
    // of the tracking camera so the child never crosses the lens.
    ref.current.position.x = kf(t, [[0, 2.6], [2.5, 0.75], [10, 0.7]])
    ref.current.position.z = kf(t, [[0, 0.2], [2.5, -1.0], [10, -4.8]])
  })
  return (
    <group ref={ref} rotation={[0, Math.PI, 0]}>
      <GoldFigure kind="child" pose="walking" inPlace phaseOffset={0.4} />
    </group>
  )
}

/** Shared by the standard shot and the anime-toon variant (S2 _Toon). */
export function S2Actors() {
  return <><Keeper /><Child /></>
}
export const S2_SHELL = {
  background: '#080E1F',
  three: {
    camera: { position: [-2.2, 1.5, 3.5] as [number, number, number], fov: 46 },
    debugTarget: [0, 1.7, -6] as [number, number, number],
  },
  cameraMoves: [{
    a: { pos: [-2.2, 1.5, 3.5] as [number, number, number], target: [0.3, 1.6, -6] as [number, number, number] },
    b: { pos: [0.9, 1.6, -2.2] as [number, number, number], target: [0, 1.9, -12] as [number, number, number] },
    t0: 0.4, t1: 9.6, ease: 'inout' as const,
  }],
}

export default createScene(S2_SHELL, function S2_TheFollower() {
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
      <StoryPost />
    </>
  )
})
