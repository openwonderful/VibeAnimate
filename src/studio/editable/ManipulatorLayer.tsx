/**
 * ManipulatorLayer — the in-canvas half of Blender mode. Mounted by
 * SceneCanvas inside the studio viewport only:
 *
 *  - click-select: raycasts registered <Editable> objects on clean clicks
 *    (< 6px pointer travel, not a gizmo interaction)
 *  - transform gizmo: drei <TransformControls> on the selected object,
 *    driven by the store's mode/axis/snap/space (G/R/S · X/Y/Z keys live
 *    in the DOM overlay; this layer just reflects store state)
 *  - selection highlight: Blender-orange bounding box that tracks the
 *    object as it animates
 *
 * The gizmo auto-disables the scene's default OrbitControls while
 * dragging (drei behaviour), so it composes with DebugCamera.
 */
import { useEffect, useMemo, useRef, useSyncExternalStore } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { TransformControls } from '@react-three/drei'
import * as THREE from 'three'
import {
  subscribeEditables, listEditables, getSelectedEntry, selectEditable, getEditable,
  getGizmoMode, getAxisFilter, getGizmoSpace, getSnapping,
  setGizmoDragging, isGizmoDragging, commitEditableTransform, setEditableProjector,
} from './store'

export const SELECT_ORANGE = '#f5a623'

/** Set when a gizmo interaction ends — clicks that land within this
 *  window are gizmo releases, not viewport selection clicks. */
let lastGizmoUseAt = 0

function ancestorEditableId(obj: THREE.Object3D): string | null {
  let cur: THREE.Object3D | null = obj
  while (cur) {
    if (typeof cur.userData.__editableId === 'string') return cur.userData.__editableId
    cur = cur.parent
  }
  return null
}

function chainVisible(obj: THREE.Object3D): boolean {
  let cur: THREE.Object3D | null = obj
  while (cur) {
    if (!cur.visible) return false
    cur = cur.parent
  }
  return true
}

function ClickSelect() {
  const gl = useThree(s => s.gl)
  const camera = useThree(s => s.camera)
  const down = useRef<{ x: number; y: number } | null>(null)
  const raycaster = useRef(new THREE.Raycaster())

  useEffect(() => {
    const el = gl.domElement
    const onDown = (e: PointerEvent) => {
      if (e.button === 0) down.current = { x: e.clientX, y: e.clientY }
    }
    const onUp = (e: PointerEvent) => {
      const d = down.current
      down.current = null
      if (!d || e.button !== 0) return
      if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > 6) return // drag = camera
      if (isGizmoDragging() || performance.now() - lastGizmoUseAt < 200) return
      const rect = el.getBoundingClientRect()
      const ndc = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1,
      )
      raycaster.current.setFromCamera(ndc, camera)
      const objects = listEditables().filter(en => chainVisible(en.object)).map(en => en.object)
      const hit = raycaster.current.intersectObjects(objects, true)
        .find(h => chainVisible(h.object))
      selectEditable(hit ? ancestorEditableId(hit.object) : null)
    }
    el.addEventListener('pointerdown', onDown)
    el.addEventListener('pointerup', onUp)
    return () => {
      el.removeEventListener('pointerdown', onDown)
      el.removeEventListener('pointerup', onUp)
    }
  }, [gl, camera])

  return null
}

function SelectionBox({ object }: { object: THREE.Object3D }) {
  // useMemo (not a ref) so the helper is created during render without
  // touching ref state, and re-created when the selection changes.
  const helper = useMemo(() => new THREE.BoxHelper(object, SELECT_ORANGE), [object])
  useEffect(() => {
    helper.setFromObject(object)
    return () => { helper.dispose() }
  }, [helper, object])
  // Track the object as it animates / gets dragged.
  useFrame(() => helper.setFromObject(object))
  return <primitive object={helper} />
}

/** Publishes "where is @id on screen" so CDP tooling can click an object
 *  by name (the camera and the canvas rect only exist in here). */
function ProjectorBridge() {
  const gl = useThree(s => s.gl)
  const camera = useThree(s => s.camera)
  useEffect(() => {
    const v = new THREE.Vector3()
    setEditableProjector(id => {
      const e = getEditable(id)
      if (!e) return null
      // Bounding-box centre, not the origin: an actor's origin is usually
      // at its feet, which is not where you'd aim a click.
      const box = new THREE.Box3().setFromObject(e.object)
      if (box.isEmpty()) e.object.getWorldPosition(v)
      else box.getCenter(v)
      v.project(camera)
      const r = gl.domElement.getBoundingClientRect()
      return {
        x: Math.round(r.left + ((v.x + 1) / 2) * r.width),
        y: Math.round(r.top + ((1 - v.y) / 2) * r.height),
      }
    })
    return () => setEditableProjector(null)
  }, [gl, camera])
  return null
}

export function ManipulatorLayer() {
  const entry = useSyncExternalStore(subscribeEditables, getSelectedEntry, () => null)
  const mode = useSyncExternalStore(subscribeEditables, getGizmoMode, () => 'translate' as const)
  const axis = useSyncExternalStore(subscribeEditables, getAxisFilter, () => null)
  const space = useSyncExternalStore(subscribeEditables, getGizmoSpace, () => 'world' as const)
  const snap = useSyncExternalStore(subscribeEditables, getSnapping, () => false)

  return (
    <>
      <ClickSelect />
      <ProjectorBridge />
      {entry && (
        <TransformControls
          key={entry.id}
          object={entry.object}
          mode={mode}
          space={space}
          size={0.85}
          showX={!axis || axis === 'x'}
          showY={!axis || axis === 'y'}
          showZ={!axis || axis === 'z'}
          translationSnap={snap ? 0.25 : undefined}
          rotationSnap={snap ? Math.PI / 12 : undefined}
          scaleSnap={snap ? 0.1 : undefined}
          onMouseDown={() => setGizmoDragging(true)}
          onMouseUp={() => { setGizmoDragging(false); lastGizmoUseAt = performance.now() }}
          onObjectChange={() => commitEditableTransform(entry.id)}
        />
      )}
      {entry && <SelectionBox object={entry.object} />}
    </>
  )
}
