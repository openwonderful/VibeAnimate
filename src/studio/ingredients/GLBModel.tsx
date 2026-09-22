/**
 * GLBModel — authored-asset ingredient kind (SPEC §12.5 #6): mounts a
 * GLB from public/models with cloned scene graph (safe to instance the
 * same file in several places). Editor/live use; Remotion renders of
 * GLB scenes should add delayRender handling before relying on it.
 */
import { Suspense, useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { SkeletonUtils } from 'three-stdlib'

export type GLBModelProps = {
  src: string
  position?: [number, number, number]
  rotationY?: number
  scale?: number
  /** Optional flat tint applied over the asset's own materials. */
  tint?: string
}

function Model({ src, position = [0, 0, 0], rotationY = 0, scale = 1, tint }: GLBModelProps) {
  const { scene } = useGLTF(src)
  const cloned = useMemo(() => {
    const c = SkeletonUtils.clone(scene)
    const mat = tint ? new THREE.MeshStandardMaterial({ color: tint, roughness: 0.85 }) : null
    c.traverse(obj => {
      if (obj instanceof THREE.Mesh) {
        if (mat) obj.material = mat
        // Skinned meshes pose in world space but keep their bind-pose
        // bounding sphere (often centimeters) — the culler wrongly hides
        // them. Draw unconditionally; scenes cull at the region level.
        obj.frustumCulled = false
      }
    })
    return c
  }, [scene, tint])
  return <primitive object={cloned} position={position} rotation={[0, rotationY, 0]} scale={scale} />
}

export function GLBModel(props: GLBModelProps) {
  return (
    <Suspense fallback={null}>
      <Model {...props} />
    </Suspense>
  )
}

export function GLBHumanPreview() {
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[2, 3, 3]} intensity={1.1} />
      <group position={[0, -0.95, 0]}>
        <GLBModel src="/models/human_a.glb" scale={0.58} tint="#B8A184" />
      </group>
    </>
  )
}
