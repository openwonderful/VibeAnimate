/* eslint-disable react-refresh/only-export-components -- scene file: local actors + createScene default export */
/**
 * story.5 — "The passing" (0:40–0:50, night, the shrine).
 * Under the old persimmon tree the keeper lowers the lantern into the
 * child's hands: the film's central image. The lantern eases down from
 * the keeper's grip to the child's and brightens as it changes hands.
 */
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { createScene } from '../../../scenes/createScene'
import { getAnimTime, easeInOut } from '../../../hooks/useAnimTime'
import { kf } from '../kf'
import { GoldFigure } from '../../../scenes/characters/goldFigure'
import { Lantern } from '../../ingredients/Lantern'
import { WorldMount } from '../../worlds/World'
import { LANTERN_VALLEY } from '../../worlds/LanternValley'
import { StoryPost } from '../StoryPost'

// The shrine crown (hill group at [15,0,-15], crown y≈4.45).
const CROWN: [number, number, number] = [15, 4.45, -15]

export function ThePass() {
  const lantern = useRef<THREE.Group>(null)
  useFrame(() => {
    if (!lantern.current) return
    const t = getAnimTime()
    // Hold in the keeper's hand (y≈1.1), pass between t=3.5..6.5 into the
    // child's raised hands (y≈0.78), with a slight drift toward the child.
    const p = easeInOut(Math.min(1, Math.max(0, (t - 3.5) / 3)))
    lantern.current.position.set(
      CROWN[0] - 0.62 + p * 0.85,
      CROWN[1] + 1.12 - p * 0.34,
      CROWN[2] + 2.42 + p * 0.16,
    )
    // Glow swells as the child receives it (imperative — React doesn't
    // re-render per frame inside the canvas).
    const glow = kf(t, [[0, 2.2], [3.5, 2.2], [6.5, 3.6], [10, 3.2]])
    lantern.current.traverse(obj => {
      if (obj instanceof THREE.Mesh) {
        const m = obj.material as THREE.MeshStandardMaterial
        if (m.emissiveIntensity !== undefined && m.emissiveIntensity > 1) m.emissiveIntensity = glow
      } else if (obj instanceof THREE.PointLight) {
        obj.intensity = glow * 1.2
      }
    })
  })
  return (
    <>
      {/* Keeper stands facing the child, lowering the lantern — the pair
          on the open crown, the shrine and tree behind them. */}
      <group position={[CROWN[0] - 1.15, CROWN[1], CROWN[2] + 2.3]} rotation={[0, Math.PI * 0.42, 0]}>
        <GoldFigure kind="adult" pose="standing" rightHandAt={[0.33, 1.12, 0.18]} />
      </group>
      {/* Child, hands up to receive. */}
      <group position={[CROWN[0] + 0.35, CROWN[1] - 0.02, CROWN[2] + 2.75]} rotation={[0, -Math.PI * 0.55, 0]}>
        <GoldFigure kind="child" pose="standing" rightHandAt={[0.2, 0.82, 0.3]} leftHandAt={[-0.2, 0.82, 0.3]} />
      </group>
      <group ref={lantern}>
        <Lantern scale={0.55} cordLength={0.12} light intensity={2.2} swayPhase={0.3} />
      </group>
    </>
  )
}

export const S5_SHELL = {
  background: '#080E1F',
  three: {
    camera: { position: [19.6, 6.4, -8.6] as [number, number, number], fov: 40 },
    debugTarget: [14.8, 5.2, -13.5] as [number, number, number],
  },
  cameraMoves: [{
    a: { pos: [19.6, 6.4, -8.6] as [number, number, number], target: [14.6, 5.2, -13.3] as [number, number, number] },
    b: { pos: [16.8, 5.9, -9.4] as [number, number, number], target: [14.7, 5.3, -13.6] as [number, number, number] },
    t0: 0.4, t1: 9.6, ease: 'inout' as const,
  }],
}

export default createScene(S5_SHELL, function S5_ThePassing() {
  return (
    <>
      <WorldMount
        world={LANTERN_VALLEY}
        shot={{
          lighting: 'night',
          visibleRegions: ['ground', 'hill', 'mountains'],
          actors: <ThePass />,
        }}
      />
      <StoryPost bloom={1.1} />
    </>
  )
})
