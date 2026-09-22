/**
 * Instancing helper for world geometry — one draw call per shape family.
 * Use for ≥12-copy groups only (PRD wake-1 research: instancing many
 * small-count groups is a net loss).
 */
import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'

export type InstanceSpec = {
  position: [number, number, number]
  /** Uniform or per-axis scale. Default 1. */
  scale?: number | [number, number, number]
  rotationY?: number
}

export function Instances({ specs, geometry, color, roughness = 1, flatShading = false }: {
  specs: InstanceSpec[]
  geometry: THREE.BufferGeometry
  color: string
  roughness?: number
  flatShading?: boolean
}) {
  const ref = useRef<THREE.InstancedMesh>(null)
  const material = useMemo(
    () => new THREE.MeshStandardMaterial({ color, roughness, flatShading }),
    [color, roughness, flatShading],
  )

  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const m = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    const e = new THREE.Euler()
    const s = new THREE.Vector3()
    const p = new THREE.Vector3()
    specs.forEach((spec, i) => {
      p.set(...spec.position)
      e.set(0, spec.rotationY ?? 0, 0)
      q.setFromEuler(e)
      const sc = spec.scale ?? 1
      if (typeof sc === 'number') s.set(sc, sc, sc)
      else s.set(...sc)
      m.compose(p, q, s)
      mesh.setMatrixAt(i, m)
    })
    mesh.instanceMatrix.needsUpdate = true
    mesh.computeBoundingSphere()
  }, [specs])

  return <instancedMesh ref={ref} args={[geometry, material, specs.length]} />
}
