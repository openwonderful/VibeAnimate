/**
 * <Editable> — wrap any actor/prop/light to make it a first-class object
 * in Blender mode: click-selectable in the studio viewport, movable with
 * the transform gizmo, addressable as @id in the studio console.
 *
 *   <Editable id="keeper" name="Lantern Keeper" kind="character">
 *     <GLBModel src="/models/human_a.glb" />
 *   </Editable>
 *
 * The wrapper is a plain <group>; position/rotation/scale props become the
 * object's BASE transform (what reset returns to, and what the exported
 * JSX snippet is diffed against). Outside the studio the wrapper is inert
 * — no listeners, no overrides, so renders stay deterministic.
 */
import { useEffect, useRef } from 'react'
import type { ThreeElements } from '@react-three/fiber'
import * as THREE from 'three'
import { registerEditable, unregisterEditable, type EditableKind } from './store'

// Object3D.id is a number, so the group props' `id` is omitted before the
// intersection — ours is the string handle used by @mentions and the store.
export type EditableProps = Omit<ThreeElements['group'], 'id'> & {
  id: string
  /** Display name for overlays + console cards (defaults to id). */
  name?: string
  kind?: EditableKind
  /** File the wrapper lives in, surfaced in the console entity card. */
  sourcePath?: string
}

export function Editable({ id, name, kind = 'prop', sourcePath, children, ...groupProps }: EditableProps) {
  const ref = useRef<THREE.Group>(null)

  useEffect(() => {
    const obj = ref.current
    if (!obj) return
    registerEditable(id, name ?? id, kind, obj, sourcePath)
    return () => unregisterEditable(id, obj)
  }, [id, name, kind, sourcePath])

  return <group ref={ref} {...groupProps}>{children}</group>
}
