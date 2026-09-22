/* eslint-disable react-refresh/only-export-components -- scene file: local actors + createScene default export */
/**
 * story.4 — "The climb" (0:30–0:40, night, shrine hill).
 * The hill against the mountain ring; two small glows ascend the stone
 * steps toward the shrine lanterns.
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

/** Path up the steps in world space (hill group sits at [15, 0, -15]). */
const PATH: [number, number][] = [[0, 0], [10, 1]] // t → progress
const START: [number, number, number] = [15 - 5.2, 0, -15 + 4.4]
const END: [number, number, number] = [15 - 0.8, 0, -15 + 0.8]
const HILL_CENTER = { x: 15, y: -4, z: -15, r: 8.5 }

/** Stand on the hill sphere's surface at (x, z); falls back to ground level. */
function hillY(x: number, z: number): number {
  const dx = x - HILL_CENTER.x
  const dz = z - HILL_CENTER.z
  const d2 = dx * dx + dz * dz
  const r2 = HILL_CENTER.r * HILL_CENTER.r
  if (d2 >= r2) return 0
  return Math.max(0, HILL_CENTER.y + Math.sqrt(r2 - d2))
}

export function Climbers() {
  const keeper = useRef<THREE.Group>(null)
  const child = useRef<THREE.Group>(null)
  useFrame(() => {
    const t = getAnimTime()
    const p = kf(t, PATH)
    const lag = Math.max(0, p - 0.12)
    if (keeper.current) {
      const x = START[0] + (END[0] - START[0]) * p
      const z = START[2] + (END[2] - START[2]) * p
      keeper.current.position.set(x, hillY(x, z), z)
    }
    if (child.current) {
      const x = START[0] + (END[0] - START[0]) * lag + 0.6
      const z = START[2] + (END[2] - START[2]) * lag + 0.4
      child.current.position.set(x, hillY(x, z), z)
    }
  })
  return (
    <>
      <group ref={keeper} rotation={[0, Math.PI * 0.78, 0]}>
        <GoldFigure kind="adult" pose="walking" inPlace />
        <Lantern position={[-0.45, 1.08, 0.1]} scale={0.55} cordLength={0.2} light swayPhase={0.7} />
      </group>
      <group ref={child} rotation={[0, Math.PI * 0.78, 0]}>
        <GoldFigure kind="child" pose="walking" inPlace phaseOffset={0.5} />
      </group>
    </>
  )
}

export const S4_SHELL = {
  background: '#080E1F',
  three: {
    camera: { position: [5, 2.2, -6] as [number, number, number], fov: 42 },
    debugTarget: [14, 4, -14] as [number, number, number],
  },
  cameraMoves: [{
    a: { pos: [5, 2.2, -6] as [number, number, number], target: [13.5, 3.5, -14] as [number, number, number] },
    b: { pos: [8.5, 3.6, -9.5] as [number, number, number], target: [14.5, 5, -14.5] as [number, number, number] },
    t0: 0.4, t1: 9.6, ease: 'inout' as const,
  }],
}

export default createScene(S4_SHELL, function S4_TheClimb() {
  return (
    <>
      <WorldMount
        world={LANTERN_VALLEY}
        shot={{
          lighting: 'night',
          visibleRegions: ['ground', 'hill', 'mountains'],
          actors: <Climbers />,
        }}
      />
      <StoryPost />
    </>
  )
})
