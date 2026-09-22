import type { Ref } from 'react'
import * as THREE from 'three'
import type { PointCloud } from './points'

/** Renders a PointCloud with a shared glow material. One draw call. */
export function GlowPoints({
  cloud, material, position, frustumCulled = true, renderOrder, pointsRef,
}: {
  cloud: PointCloud
  material: THREE.ShaderMaterial
  position?: [number, number, number]
  frustumCulled?: boolean
  renderOrder?: number
  /** For clouds whose positions are animated on the CPU — the two orbs that
   *  lift off the house are the only ones. */
  pointsRef?: Ref<THREE.Points>
}) {
  return (
    <points ref={pointsRef} material={material} position={position}
      frustumCulled={frustumCulled} renderOrder={renderOrder}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[cloud.positions, 3]} />
        <bufferAttribute attach="attributes-aColor" args={[cloud.colors, 3]} />
        <bufferAttribute attach="attributes-aSize" args={[cloud.sizes, 1]} />
        <bufferAttribute attach="attributes-aAlpha" args={[cloud.alphas, 1]} />
        <bufferAttribute attach="attributes-aPhase" args={[cloud.phases, 1]} />
      </bufferGeometry>
    </points>
  )
}
