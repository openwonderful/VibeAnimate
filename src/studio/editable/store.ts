/**
 * Editable object store — the scene-graph side of Blender mode.
 *
 * Scenes wrap actors in <Editable id …> (see Editable.tsx); each wrapper
 * registers its THREE.Object3D here. The viewport ManipulatorLayer, the
 * Blender-style overlays (ObjectToolbar / TransformSidebar / Outliner)
 * and the console's @entity commands all talk to this one module store —
 * the same singleton pattern as the anim clock, because React context
 * does not cross the R3F reconciler boundary.
 *
 * Transform edits write straight to the live Object3D (no React re-render)
 * and persist per scene into sessionStorage, but ONLY while the studio has
 * set a scene context (setEditableSceneContext). Plain ?act= pages never
 * apply overrides, so shot.mjs captures stay deterministic.
 */
import * as THREE from 'three'

export type EditableKind = 'character' | 'prop' | 'environment' | 'light' | 'fx' | 'object'
export type Vec3 = [number, number, number]
export type EditableTransform = { position: Vec3; rotation: Vec3; scale: Vec3 }
export type GizmoMode = 'translate' | 'rotate' | 'scale'
export type AxisFilter = 'x' | 'y' | 'z' | null
export type GizmoSpace = 'world' | 'local'

export type EditableEntry = {
  id: string
  name: string
  kind: EditableKind
  object: THREE.Object3D
  /** Transform as authored in code, captured at mount — reset target. */
  base: EditableTransform
  /** Where the wrapper lives, for "go edit the code" affordances. */
  sourcePath?: string
}

/* ── State ─────────────────────────────────────────────────────────── */

const entries = new Map<string, EditableEntry>()
let listCache: EditableEntry[] | null = null
let selectedId: string | null = null
let gizmoMode: GizmoMode = 'translate'
let axisFilter: AxisFilter = null
let gizmoSpace: GizmoSpace = 'world'
let snapping = false
let gizmoDragging = false
let sceneContext = '' // '' = overrides disabled (non-studio pages)

const structureListeners = new Set<() => void>()
const transformListeners = new Set<() => void>()

function notifyStructure() {
  structureListeners.forEach(cb => cb())
}
/** High-frequency channel: fired on every gizmo drag step / command edit. */
function notifyTransform() {
  transformListeners.forEach(cb => cb())
}

export function subscribeEditables(cb: () => void): () => void {
  structureListeners.add(cb)
  return () => { structureListeners.delete(cb) }
}
export function subscribeEditableTransforms(cb: () => void): () => void {
  transformListeners.add(cb)
  return () => { transformListeners.delete(cb) }
}

/* ── Registry ──────────────────────────────────────────────────────── */

function captureTransform(obj: THREE.Object3D): EditableTransform {
  return {
    position: obj.position.toArray() as Vec3,
    rotation: [obj.rotation.x, obj.rotation.y, obj.rotation.z],
    scale: obj.scale.toArray() as Vec3,
  }
}

export function registerEditable(
  id: string, name: string, kind: EditableKind, object: THREE.Object3D, sourcePath?: string,
) {
  object.userData.__editableId = id
  entries.set(id, { id, name, kind, object, base: captureTransform(object), sourcePath })
  listCache = null
  const o = overrides()[id]
  if (o) applyToObject(object, o)
  installWindowApi()
  notifyStructure()
}

export function unregisterEditable(id: string, object: THREE.Object3D) {
  // HMR can remount the same id before the old cleanup runs — only drop
  // the entry if it still points at the unmounting object.
  const cur = entries.get(id)
  if (cur && cur.object !== object) return
  entries.delete(id)
  listCache = null
  if (selectedId === id) selectedId = null
  notifyStructure()
}

export function listEditables(): EditableEntry[] {
  if (!listCache) listCache = [...entries.values()]
  return listCache
}
export function getEditable(id: string): EditableEntry | undefined {
  return entries.get(id)
}

/* ── Selection / gizmo state ───────────────────────────────────────── */

export function selectEditable(id: string | null) {
  if (id !== null && !entries.has(id)) return
  if (selectedId === id) return
  selectedId = id
  axisFilter = null
  notifyStructure()
}
export function getSelectedId(): string | null { return selectedId }
export function getSelectedEntry(): EditableEntry | null {
  return selectedId ? entries.get(selectedId) ?? null : null
}

export function getGizmoMode(): GizmoMode { return gizmoMode }
export function setGizmoMode(m: GizmoMode) {
  if (gizmoMode === m) return
  gizmoMode = m
  notifyStructure()
}
export function getAxisFilter(): AxisFilter { return axisFilter }
export function setAxisFilter(a: AxisFilter) {
  axisFilter = axisFilter === a ? null : a
  notifyStructure()
}
export function getGizmoSpace(): GizmoSpace { return gizmoSpace }
export function toggleGizmoSpace() {
  gizmoSpace = gizmoSpace === 'world' ? 'local' : 'world'
  notifyStructure()
}
export function getSnapping(): boolean { return snapping }
export function toggleSnapping() {
  snapping = !snapping
  notifyStructure()
}
export function setGizmoDragging(d: boolean) {
  if (gizmoDragging === d) return
  gizmoDragging = d
  notifyStructure()
}
export function isGizmoDragging(): boolean { return gizmoDragging }

/* ── Transforms ────────────────────────────────────────────────────── */

function applyToObject(obj: THREE.Object3D, t: Partial<EditableTransform>) {
  if (t.position) obj.position.set(...t.position)
  if (t.rotation) obj.rotation.set(...t.rotation)
  if (t.scale) obj.scale.set(...t.scale)
}

export function getEditableTransform(id: string): EditableTransform | null {
  const e = entries.get(id)
  return e ? captureTransform(e.object) : null
}

export type TransformPatch = {
  position?: Vec3
  rotation?: Vec3
  scale?: Vec3
  /** true = add position/rotation to (and multiply scale by) current values. */
  relative?: boolean
}

export function setEditableTransform(id: string, patch: TransformPatch): boolean {
  const e = entries.get(id)
  if (!e) return false
  const obj = e.object
  if (patch.relative) {
    if (patch.position) obj.position.add(new THREE.Vector3(...patch.position))
    if (patch.rotation) obj.rotation.set(
      obj.rotation.x + patch.rotation[0],
      obj.rotation.y + patch.rotation[1],
      obj.rotation.z + patch.rotation[2])
    if (patch.scale) obj.scale.multiply(new THREE.Vector3(...patch.scale))
  } else {
    applyToObject(obj, patch)
  }
  commitEditableTransform(id)
  return true
}

export function resetEditableTransform(id: string, part?: 'position' | 'rotation' | 'scale'): boolean {
  const e = entries.get(id)
  if (!e) return false
  applyToObject(e.object, part ? { [part]: e.base[part] } : e.base)
  commitEditableTransform(id)
  return true
}

export function setEditableVisible(id: string, visible: boolean): boolean {
  const e = entries.get(id)
  if (!e) return false
  e.object.visible = visible
  notifyTransform()
  notifyStructure()
  return true
}

/** Persist the object's CURRENT transform as this scene's override and
 *  notify — the gizmo calls this on every objectChange. */
export function commitEditableTransform(id: string) {
  const e = entries.get(id)
  if (!e) return
  if (sceneContext) {
    const all = readStore()
    const t = captureTransform(e.object)
    // Identical to base → drop the override instead of storing a no-op.
    const same = (['position', 'rotation', 'scale'] as const).every(k =>
      t[k].every((v, i) => Math.abs(v - e.base[k][i]) < 1e-6))
    const scene = all[sceneContext] ?? {}
    if (same) delete scene[id]
    else scene[id] = t
    all[sceneContext] = scene
    writeStore(all)
  }
  notifyTransform()
}

/** Paste-ready JSX props for the current transform (non-default parts). */
export function editableCodeSnippet(id: string): string {
  const t = getEditableTransform(id)
  if (!t) return ''
  const f = (n: number) => n.toFixed(3)
  const parts: string[] = [`position={[${t.position.map(f).join(', ')}]}`]
  if (t.rotation.some(r => Math.abs(r) > 1e-6))
    parts.push(`rotation={[${t.rotation.map(f).join(', ')}]}`)
  if (t.scale.some(s => Math.abs(s - 1) > 1e-6))
    parts.push(`scale={[${t.scale.map(f).join(', ')}]}`)
  return parts.join(' ')
}

/* ── Scene-scoped persistence (studio only) ────────────────────────── */

type OverrideStore = Record<string, Record<string, EditableTransform>>
const STORAGE_KEY = 'flowStudioObjectEdits'

function readStore(): OverrideStore {
  if (typeof sessionStorage === 'undefined') return {}
  try { return JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? '{}') } catch { return {} }
}
function writeStore(s: OverrideStore) {
  if (typeof sessionStorage === 'undefined') return
  try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(s)) } catch { /* quota */ }
}
function overrides(): Record<string, EditableTransform> {
  return sceneContext ? readStore()[sceneContext] ?? {} : {}
}

/** The studio viewport names the scene it is showing; '' disables
 *  override persistence (the default outside the studio). */
export function setEditableSceneContext(key: string) {
  if (sceneContext === key) return
  sceneContext = key
  selectedId = null
  axisFilter = null
  notifyStructure()
}

export function clearSceneOverrides() {
  if (!sceneContext) return
  const all = readStore()
  delete all[sceneContext]
  writeStore(all)
  for (const e of entries.values()) applyToObject(e.object, e.base)
  notifyTransform()
  notifyStructure()
}
export function hasSceneOverrides(): boolean {
  return Object.keys(overrides()).length > 0
}

/**
 * How many objects have been posed, ACROSS ALL SCENES.
 *
 * The viewport's reset button can only see the scene it is standing in, so
 * edits made in a shot you have since navigated away from are invisible and
 * unrevokable from there — you would have to visit each one to find out.
 * The settings panel asks this instead.
 */
export function countObjectEdits(): number {
  return Object.values(readStore()).reduce((n, scene) => n + Object.keys(scene).length, 0)
}

/** Forget every scene's poses. The mounted scene's objects are restored to
 *  their authored transforms in place; the rest have nothing to restore
 *  because nothing is applying them. */
export function clearAllObjectEdits() {
  writeStore({})
  for (const e of entries.values()) applyToObject(e.object, e.base)
  notifyTransform()
  notifyStructure()
}

/* ── Screen projection (set by ManipulatorLayer, used by tooling) ──── */

/** Where an object currently sits on screen, in client coordinates.
 *  Registered from inside the canvas (only there are camera + canvas
 *  rect known); lets CDP tooling click an object by name instead of
 *  guessing pixels. */
let projector: ((id: string) => { x: number; y: number } | null) | null = null
export function setEditableProjector(fn: typeof projector) { projector = fn }
export function editableScreenPos(id: string): { x: number; y: number } | null {
  return projector ? projector(id) : null
}

/* ── Perf substore (fed by FrameGovernor, read by PerfChip) ────────── */

export type PerfSample = { fps: number; dpr: number; calls: number; triangles: number; frameloop: string }
let perf: PerfSample = { fps: 0, dpr: 1, calls: 0, triangles: 0, frameloop: 'always' }
const perfListeners = new Set<() => void>()
export function reportPerf(p: PerfSample) {
  perf = p
  perfListeners.forEach(cb => cb())
}
export function getPerf(): PerfSample { return perf }
export function subscribePerf(cb: () => void): () => void {
  perfListeners.add(cb)
  return () => { perfListeners.delete(cb) }
}

/* ── window.__editables — CDP/agent tooling API ────────────────────── */

declare global {
  interface Window {
    __editables?: {
      list: () => { id: string; name: string; kind: EditableKind; transform: EditableTransform | null }[]
      select: (id: string | null) => void
      get: (id: string) => EditableTransform | null
      set: (id: string, patch: TransformPatch) => boolean
      reset: (id: string) => boolean
      mode: (m: GizmoMode) => void
      code: (id: string) => string
      /** Client-space centre of the object, for scripted clicks. */
      screen: (id: string) => { x: number; y: number } | null
    }
  }
}

let apiInstalled = false
function installWindowApi() {
  if (apiInstalled || typeof window === 'undefined') return
  apiInstalled = true
  window.__editables = {
    list: () => listEditables().map(e => ({
      id: e.id, name: e.name, kind: e.kind, transform: getEditableTransform(e.id),
    })),
    select: selectEditable,
    get: getEditableTransform,
    set: setEditableTransform,
    reset: (id: string) => resetEditableTransform(id),
    mode: setGizmoMode,
    code: editableCodeSnippet,
    screen: editableScreenPos,
  }
}
