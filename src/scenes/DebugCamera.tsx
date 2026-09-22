/**
 * DebugCamera — drop-in OrbitControls activated via ?camera=1.
 *
 * Mouse: left-drag=orbit, right-drag=pan, scroll=dolly.
 * Keys (when enabled):
 *   ArrowUp/Down      — move up / down (world Y)
 *   ArrowLeft/Right   — strafe left / right (screen X)
 *   W / S             — dolly forward / back along view
 *   Q / E             — orbit yaw left / right (rotate around target horizontally)
 *   R / F             — orbit pitch down / up (rotate around target vertically)
 *   Shift             — 3× speed
 *
 * On enable the camera is HANDED OVER, not seized: the scene's own rig drives
 * for one more frame (see useCameraHandoff / cameraHandoff.ts) so you take
 * control of exactly the frame you were looking at, and OrbitControls is not
 * mounted until the orbit pivot is known. The pivot is the look-at the rig
 * published, falling back to the scene's `debugTarget` and then to a point
 * ~6 units ahead along the current view direction.
 *
 * Toggle from anywhere by calling `toggleDebugCamera()` or by using the
 * <DebugCameraToggleButton /> in App.tsx. No page reload — state is driven
 * by the URL (?camera=1) + a broadcast event so every scene reacts in place.
 *
 * ── Camera moves (start/end pose over time) ──────────────────────
 * The same file hosts the camera-keyframe tooling:
 *
 *   <CameraMove a={poseA} b={poseB} t0={2} t1={8} ease="inout" />
 *     Permanent, code-driven camera move for a scene. Poses are
 *     { pos: [x,y,z], target: [x,y,z], fov? }. Interpolates along the global
 *     anim clock (getAnimTime), so it scrubs/freezes with ?t= and the
 *     time scrubber. Bails out while the debug camera is being orbited.
 *
 *   URL preview (no code): ?camA=x,y,z,tx,ty,tz[,fov]&camB=...&camT0=2&camT1=8
 *     &camEase=linear|inout&camplay=1 — every scene that renders <DebugCamera />
 *     picks it up. The <CameraShotPanel /> in App.tsx builds these params for
 *     you: frame the shot with the debug camera, "Set A" at one timestamp,
 *     "Set B" at another, then Play / Copy URL / Copy code.
 *
 * Globals for tooling (screenshot CLI, console, CDP):
 *   window.__camPose — live { pos, target, fov } of the active scene camera
 *   window.__cam.set(x,y,z, tx,ty,tz, fov?) — jump the camera to a pose
 */

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { OrbitControls } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import * as THREE from 'three'
import { getAnimTime, seekAnimTime, setAnimPlaying, easeInOut } from '../hooks/useAnimTime'
import { getSceneLookAt, handoffGeneration, resyncCameraToShot } from './cameraHandoff'

// Explicit mouse bindings — defend against any third-party that may have
// mutated the shared OrbitControls prototype or remapped buttons.
const MOUSE_BINDINGS = {
  LEFT: THREE.MOUSE.ROTATE,
  MIDDLE: THREE.MOUSE.DOLLY,
  RIGHT: THREE.MOUSE.PAN,
}

const CHANGE_EVENT = 'camdbg-change'

/**
 * How far away the orbit pivot is allowed to be, as a fraction of the
 * camera's far plane (floored, for scenes whose whole world is small).
 *
 * ORBITING A POINT FIVE KILOMETRES AWAY IS NOT ORBITING, IT IS BEING
 * CATAPULTED. Every speed OrbitControls has — drag, dolly, pan — and our own
 * key speed below are scaled by the camera-to-pivot distance, and a rig that
 * aims at the sky publishes a look-at that is exactly that far away: at the
 * tail of 8.55 the pivot lands on the star river 5,130 units out, and a
 * measured 60-pixel flick moved the camera 410 units — clean out of a
 * village that is 200 across. The frame you were composing is gone before
 * you have finished the gesture.
 *
 * The published look-at is still the only thing that knows the DIRECTION you
 * are looking, and it stays authoritative for that. Only the distance is
 * capped: a subject beyond the cap is at infinity as far as the shot is
 * concerned, and what you want there is to tumble in place. `far` is the one
 * number every scene sets deliberately for its own scale (24,000 in Act B's
 * valley, a few hundred in a room), so it is what the cap is measured in.
 * The floor is what keeps the original bug fixed — the pivot must never fall
 * back INSIDE a subject that is legitimately a few dozen units away.
 */
const PIVOT_MAX_FRAC = 0.005
const PIVOT_MAX_FLOOR = 60

/* ── Camera pose types + URL param helpers ───────────────────────── */

export type CamPose = {
  pos: [number, number, number]
  target: [number, number, number]
  fov?: number
}

export function parseCamPose(s: string | null): CamPose | null {
  if (!s) return null
  const n = s.split(',').map(Number)
  if (n.length < 6 || n.slice(0, 6).some(Number.isNaN)) return null
  return {
    pos: [n[0], n[1], n[2]],
    target: [n[3], n[4], n[5]],
    fov: n.length >= 7 && !Number.isNaN(n[6]) ? n[6] : undefined,
  }
}

export function camPoseToParam(p: CamPose): string {
  const nums: number[] = [...p.pos, ...p.target]
  if (p.fov != null) nums.push(p.fov)
  return nums.map(v => +v.toFixed(3)).join(',')
}

function readSearch(): string {
  if (typeof window === 'undefined') return ''
  return window.location.search
}

/** Patch URL query params in place (null deletes) and broadcast the change. */
export function setUrlParams(patch: Record<string, string | null>) {
  if (typeof window === 'undefined') return
  const url = new URL(window.location.href)
  for (const [k, v] of Object.entries(patch)) {
    if (v == null) url.searchParams.delete(k)
    else url.searchParams.set(k, v)
  }
  window.history.replaceState(null, '', url.toString())
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

/** Is the interactive orbit debug camera on? (?camera=1) */
function readOrbitEnabled(): boolean {
  if (typeof window === 'undefined') return false
  return new URLSearchParams(window.location.search).get('camera') != null
}

/** Is a URL-driven camera-move playback active? (?camplay=1 with A+B poses) */
function readCamPlayActive(): boolean {
  if (typeof window === 'undefined') return false
  const q = new URLSearchParams(window.location.search)
  return q.get('camplay') != null && q.get('camA') != null && q.get('camB') != null
}

/**
 * True when something external owns the camera — the orbit debug camera OR a
 * URL camera-move playback. Scenes gate their cinematic camera drivers
 * (CameraDrift/CameraRig/…) on this so they stop fighting for the camera.
 */
function readEnabled(): boolean {
  return readOrbitEnabled() || readCamPlayActive()
}

export function toggleDebugCamera() {
  if (typeof window === 'undefined') return
  const url = new URL(window.location.href)
  if (url.searchParams.has('camera')) url.searchParams.delete('camera')
  else url.searchParams.set('camera', '1')
  window.history.replaceState(null, '', url.toString())
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

function subscribe(cb: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, cb)
  window.addEventListener('popstate', cb)
  return () => {
    window.removeEventListener(CHANGE_EVENT, cb)
    window.removeEventListener('popstate', cb)
  }
}

export function useDebugCameraEnabled(): boolean {
  return useSyncExternalStore(subscribe, readEnabled, () => false)
}

/**
 * The contract every keyframed camera rig should use instead of
 * `if (useDebugCameraEnabled()) return`.
 *
 * Returns a predicate to call at the top of the rig's `useFrame`:
 *
 *     const yieldCamera = useCameraHandoff()
 *     useFrame(({ camera }) => {
 *       if (yieldCamera()) return
 *       …drive the camera, and publishSceneLookAt(x, y, z)…
 *     })
 *
 * It answers false — keep driving — on the FIRST frame after the debug camera
 * turns on, so the camera is left sitting on the live pose for OrbitControls
 * to adopt, and true on every frame after. See cameraHandoff.ts for why
 * "abort" was the wrong verb here.
 */
export function useCameraHandoff(): () => boolean {
  const debug = useDebugCameraEnabled()
  const handedOffAt = useRef(-1)
  return () => {
    if (!debug) {
      handedOffAt.current = -1
      return false
    }
    const gen = handoffGeneration()
    if (handedOffAt.current !== gen) {
      // One last frame on the shot's own camera: this is the handoff.
      handedOffAt.current = gen
      return false
    }
    return true
  }
}

function useOrbitEnabled(): boolean {
  return useSyncExternalStore(subscribe, readOrbitEnabled, () => false)
}

function useCamPlayActive(): boolean {
  return useSyncExternalStore(subscribe, readCamPlayActive, () => false)
}

function useSearch(): string {
  return useSyncExternalStore(subscribe, readSearch, () => '')
}

declare global {
  interface Window {
    __camPose?: CamPose
    __cam?: {
      get: () => CamPose | undefined
      set: (x: number, y: number, z: number, tx: number, ty: number, tz: number, fov?: number) => void
    }
  }
}

export function DebugCamera({
  /** Explicit orbit pivot. If unset, DebugCamera snaps to 6 units along the
   *  scene camera's current forward direction on enable. Pass a 3-tuple when
   *  the scene's lookAt is at a non-trivial location so orbit centres on it. */
  target,
}: { target?: [number, number, number] } = {}) {
  const orbit = useOrbitEnabled()
  const camPlay = useCamPlayActive()
  const { camera, gl } = useThree()
  const controlsRef = useRef<OrbitControlsImpl>(null)
  const keys = useRef<Record<string, boolean>>({})

  // One-shot: when the debug camera is first enabled, snap the orbit target
  // to either the passed-in point or 6 units ahead of the camera's forward
  // direction — so orbit pivots on the scene's focal point, not world origin.
  const targetInitialised = useRef(false)
  /** Frames since enable — see the adoption comment in useFrame. */
  const framesSinceEnable = useRef(0)
  /** Generation the pivot was adopted for, so a resync re-adopts. */
  const seededGeneration = useRef(-1)
  /** OrbitControls is withheld until the pivot is known — see adoption. */
  const [adopted, setAdopted] = useState(false)
  const pendingPivot = useRef<{ pivot: THREE.Vector3; pos: THREE.Vector3 } | null>(null)

  // Publish the live pose + a setter so tooling (CameraShotPanel, screenshot
  // CLI over CDP, the console) can read/jump the camera in any scene.
  useEffect(() => {
    window.__cam = {
      get: () => window.__camPose,
      set: (x, y, z, tx, ty, tz, fov) => {
        camera.position.set(x, y, z)
        const controls = controlsRef.current
        if (controls) {
          controls.target.set(tx, ty, tz)
          controls.update()
        } else {
          camera.lookAt(tx, ty, tz)
        }
        if (fov != null && 'fov' in camera) {
          (camera as THREE.PerspectiveCamera).fov = fov
          camera.updateProjectionMatrix()
        }
      },
    }
    return () => { delete window.__cam }
  }, [camera])

  useEffect(() => {
    if (!orbit) return
    const p = camera.position
    console.log('[DebugCamera] initial position:', [
      +p.x.toFixed(3), +p.y.toFixed(3), +p.z.toFixed(3),
    ])
    targetInitialised.current = false
    framesSinceEnable.current = 0

    const down = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return
      keys.current[e.code] = true
      if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault()
    }
    const up = (e: KeyboardEvent) => { keys.current[e.code] = false }
    const blur = () => { keys.current = {} }

    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', blur)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', blur)
    }
  }, [orbit, camera])

  /** The studio's stage wrapper for this canvas, if we are in the studio. */
  const onTopEl = useRef<Element | null>(null)
  const onTopLookedUp = useRef(false)

  const viewDir = useRef(new THREE.Vector3())
  const right = useRef(new THREE.Vector3())
  const move = useRef(new THREE.Vector3())
  const offset = useRef(new THREE.Vector3())
  const spherical = useRef(new THREE.Spherical())

  useFrame((_, delta) => {
    // Live pose readout — published every frame, even with the debug camera
    // off, so tools can always ask "where is the camera right now?".
    //
    // NOT published by a scene that is merely warming up. The studio's stage
    // double-buffers, so during a cut TWO scenes are mounted and both run
    // this — and whichever drew last won, which meant the pose readout (and
    // every A/B capture built on it) could silently describe the hidden
    // scene rather than the one on screen. ViewportPanel marks the visible
    // slot with data-on-top="1"; outside the studio there is no such
    // wrapper and `hidden` stays false, so the plain viewer is unaffected.
    {
      if (!onTopLookedUp.current) {
        onTopLookedUp.current = true
        onTopEl.current = gl.domElement.closest('[data-on-top]')
      }
      const hidden = onTopEl.current?.getAttribute('data-on-top') === '0'
      const controls = controlsRef.current
      const tgt = viewDir.current
      if (controls) {
        tgt.copy(controls.target)
      } else {
        tgt.set(0, 0, -1).applyQuaternion(camera.quaternion)
          .multiplyScalar(6).add(camera.position)
      }
      if (!hidden) window.__camPose = {
        pos: [+camera.position.x.toFixed(3), +camera.position.y.toFixed(3), +camera.position.z.toFixed(3)],
        target: [+tgt.x.toFixed(3), +tgt.y.toFixed(3), +tgt.z.toFixed(3)],
        fov: 'fov' in camera ? +(camera as THREE.PerspectiveCamera).fov.toFixed(2) : undefined,
      }
    }

    if (!orbit) return
    const k = keys.current

    // A resync re-runs the whole adoption: the rigs drive for one more frame
    // and the pivot is taken again from what they publish.
    const gen = handoffGeneration()
    if (seededGeneration.current !== gen) {
      seededGeneration.current = gen
      framesSinceEnable.current = 0
      setAdopted(false)
    }

    /* ADOPTION — decide the orbit pivot BEFORE OrbitControls exists.
     *
     * OrbitControls is deliberately not mounted until this completes, and
     * that is the whole trick. Its `update()` runs every frame and enforces
     * minDistance/maxDistance by moving the CAMERA; with its default pivot of
     * world origin and a 500-unit cap, a single frame of it is enough to yank
     * the camera onto a 500-radius sphere around (0,0,0) — measured, at
     * Act 1 t=8: the camera went from z=2095 to z=497 before anything of ours
     * ran. It cannot clobber a pose it was never handed.
     *
     * There IS such a frame to defend against, because SceneCanvas renders
     * <DebugCamera> ahead of {children}: this callback is registered first and
     * therefore runs BEFORE the scene's rig every frame, so on the first frame
     * after enable the rig has not published its look-at yet.
     *
     * Pivot preference, best first:
     *   1. the look-at the rig published on its handoff frame — the only
     *      source that knows the real DISTANCE to the subject;
     *   2. the scene's declared `debugTarget`, for scenes with no rig;
     *   3. six units along the current view direction.
     * (2) is a fallback rather than the default because on a moving camera it
     * is a fixed t=0 point: right for a static scene, kilometres wrong by the
     * middle of a flight — which is the bug this all exists to fix. */
    if (!adopted) {
      const published = getSceneLookAt()
      const waitedLongEnough = framesSinceEnable.current++ >= 1
      if (!published && !waitedLongEnough) return
      const p = new THREE.Vector3()
      if (published) p.set(published[0], published[1], published[2])
      else if (target) p.set(target[0], target[1], target[2])
      else p.set(0, 0, -1).applyQuaternion(camera.quaternion).multiplyScalar(6).add(camera.position)
      // Keep the direction, cap the distance — see PIVOT_MAX_FRAC.
      const cap = Math.max(PIVOT_MAX_FLOOR, camera.far * PIVOT_MAX_FRAC)
      const reach = p.distanceTo(camera.position)
      if (reach > cap) p.sub(camera.position).multiplyScalar(cap / reach).add(camera.position)
      // The camera pose is captured HERE, with the pivot, because it is the
      // pose the rig just handed over and it must survive the mount — see
      // the restore below.
      pendingPivot.current = { pivot: p, pos: camera.position.clone() }
      setAdopted(true)
      return
    }

    const controls = controlsRef.current
    if (!controls) return

    /* Hand the pivot over on OrbitControls' first frame. Ours runs before
     * its update(), so the target is right before it ever looks. The distance
     * cap is fitted to the shot for the same reason adoption is deferred:
     * update() would otherwise "enforce" it by dragging the camera back along
     * its own view axis. The default 500 suits a room; this world is laid out
     * across 24,000 units and Act 1 looks kilometres down a valley. */
    if (pendingPivot.current) {
      const { pivot, pos } = pendingPivot.current
      // RESTORE, don't just aim. OrbitControls runs its first update() on the
      // frame it mounts — before this callback can hand it anything — and
      // that update enforces maxDistance by moving the CAMERA. With its
      // default pivot of world origin, one frame of it is enough to drop the
      // camera onto a 500-radius sphere around (0,0,0): measured at Act 1
      // t=8, z went from 2095 to 497. Withholding the mount is what keeps
      // that to a single frame; putting the pose back is what makes it
      // invisible.
      camera.position.copy(pos)
      controls.target.copy(pivot)
      // The pivot is capped now, so it can no longer set this by itself —
      // measure the leash against the world instead, or dollying back to see
      // a whole valley would run into a cap fitted to a near pivot.
      controls.maxDistance = Math.max(500, pos.distanceTo(pivot) * 1.5, camera.far * 0.05)
      controls.update()
      pendingPivot.current = null
      targetInitialised.current = true
    }

    // First frame after enable (or when Space is pressed): snap the orbit
    // target to the passed-in point, or to 6 units ahead of the camera's
    // current forward direction. Gives orbit a sensible pivot instead of
    // world origin.
    /* Seed the orbit pivot — but only once the handoff has happened.
     *
     * ONE FRAME OF PATIENCE IS LOAD-BEARING. `useCameraHandoff` lets the
     * scene's rig drive for one more frame after enable, and R3F runs
     * useFrame callbacks in mount order, which does not reliably put this
     * component after the rig. Seeding on the very first frame therefore
     * risks reading the camera before the rig has written the live pose —
     * exactly the stale-pose bug, moved rather than fixed. Waiting a frame
     * costs nothing and is correct regardless of ordering.
     *
     * Pivot preference, best first:
     *   1. the look-at the rig published while driving — the only source that
     *      knows the real DISTANCE to the subject;
     *   2. the scene's declared `debugTarget`, for scenes with no rig;
     *   3. six units along the current view direction.
     * (2) is a fallback rather than the default because on a moving camera it
     * is a fixed t=0 point: correct for a static scene, kilometres wrong by
     * the middle of a flight. */
    // Space re-centres the pivot on whatever is in front of you now, by
    // re-running adoption from scratch.
    if (k['Space']) {
      keys.current['Space'] = false
      framesSinceEnable.current = 0
      setAdopted(false)
      return
    }

    const boost = k['ShiftLeft'] || k['ShiftRight'] ? 3 : 1
    const dist = camera.position.distanceTo(controls.target)
    const speed = Math.max(0.5, dist) * 0.8 * boost * delta

    viewDir.current.subVectors(controls.target, camera.position).normalize()
    right.current.crossVectors(viewDir.current, camera.up).normalize()

    // ── Translation (pan the camera + target together) ─────────────
    move.current.set(0, 0, 0)
    if (k['ArrowUp']) move.current.y += speed
    if (k['ArrowDown']) move.current.y -= speed
    if (k['ArrowRight']) move.current.addScaledVector(right.current, speed)
    if (k['ArrowLeft']) move.current.addScaledVector(right.current, -speed)
    if (k['KeyW']) move.current.addScaledVector(viewDir.current, speed)
    if (k['KeyS']) move.current.addScaledVector(viewDir.current, -speed)

    if (move.current.lengthSq() > 0) {
      camera.position.add(move.current)
      controls.target.add(move.current)
      controls.update()
    }

    // ── Rotation (orbit camera around target) ─────────────────────
    // Q/E yaw; R/F pitch. Drive via Spherical around the target so we stay
    // consistent with OrbitControls' internal coordinate system and avoid
    // fighting its damping state.
    const rotSpeed = 1.6 * boost * delta // radians per second
    let yaw = 0
    let pitch = 0
    if (k['KeyQ']) yaw -= rotSpeed
    if (k['KeyE']) yaw += rotSpeed
    if (k['KeyR']) pitch -= rotSpeed
    if (k['KeyF']) pitch += rotSpeed

    if (yaw !== 0 || pitch !== 0) {
      offset.current.subVectors(camera.position, controls.target)
      spherical.current.setFromVector3(offset.current)
      spherical.current.theta += yaw
      spherical.current.phi += pitch
      // Clamp polar angle to avoid flipping through the pole.
      spherical.current.phi = Math.max(0.05, Math.min(Math.PI - 0.05, spherical.current.phi))
      offset.current.setFromSpherical(spherical.current)
      camera.position.copy(controls.target).add(offset.current)
      controls.update()
    }
  })

  return (
    <>
      {camPlay && <UrlCameraMove controlsRef={controlsRef} />}
      {orbit && adopted && (
        <OrbitControls
          ref={controlsRef}
          makeDefault
          enabled={!camPlay}
          enableRotate
          enablePan
          enableZoom
          enableDamping
          dampingFactor={0.08}
          panSpeed={0.8}
          rotateSpeed={0.8}
          zoomSpeed={0.9}
          minDistance={0.05}
          maxDistance={500}
          mouseButtons={MOUSE_BINDINGS}
        />
      )}
    </>
  )
}

/* ── Camera move: interpolate pose A → pose B over t0..t1 ────────── */

export type CameraMoveProps = {
  a: CamPose
  b: CamPose
  /** anim-clock time (seconds) where the move starts / ends */
  t0?: number
  t1?: number
  ease?: 'linear' | 'inout'
  /** keep driving even while the orbit debug camera is on (URL preview uses this) */
  force?: boolean
  controlsRef?: React.RefObject<OrbitControlsImpl | null>
}

/**
 * Drives the scene camera from pose `a` at t0 to pose `b` at t1 along the
 * global anim clock. Before t0 it holds `a`, after t1 it holds `b`. Scrubs
 * and freezes with ?t= / the time scrubber, so any frame of the move can be
 * screenshotted deterministically.
 */
export function CameraMove({ a, b, t0 = 0, t1 = 5, ease = 'inout', force, controlsRef }: CameraMoveProps) {
  const orbit = useOrbitEnabled()
  const { camera } = useThree()
  const pos = useRef(new THREE.Vector3())
  const tgt = useRef(new THREE.Vector3())

  useFrame(() => {
    if (orbit && !force) return // user is hand-orbiting — let them
    const dur = Math.max(t1 - t0, 1e-6)
    const u = Math.min(1, Math.max(0, (getAnimTime() - t0) / dur))
    const k = ease === 'linear' ? u : easeInOut(u)

    pos.current.set(
      a.pos[0] + (b.pos[0] - a.pos[0]) * k,
      a.pos[1] + (b.pos[1] - a.pos[1]) * k,
      a.pos[2] + (b.pos[2] - a.pos[2]) * k,
    )
    tgt.current.set(
      a.target[0] + (b.target[0] - a.target[0]) * k,
      a.target[1] + (b.target[1] - a.target[1]) * k,
      a.target[2] + (b.target[2] - a.target[2]) * k,
    )
    camera.position.copy(pos.current)
    camera.lookAt(tgt.current)
    if (a.fov != null && b.fov != null && 'fov' in camera) {
      // eslint-disable-next-line react-hooks/immutability -- driving the R3F camera imperatively is the whole point
      (camera as THREE.PerspectiveCamera).fov = a.fov + (b.fov - a.fov) * k
      camera.updateProjectionMatrix()
    }
    // Keep OrbitControls' pivot in sync so stopping playback hands the
    // camera over smoothly instead of snapping.
    const controls = controlsRef?.current
    if (controls) controls.target.copy(tgt.current)
  })

  return null
}

/** URL-param-driven CameraMove (?camA=&camB=&camT0=&camT1=&camEase=&camplay=1). */
function UrlCameraMove({ controlsRef }: { controlsRef: React.RefObject<OrbitControlsImpl | null> }) {
  const search = useSearch()
  const q = new URLSearchParams(search)
  const a = parseCamPose(q.get('camA'))
  const b = parseCamPose(q.get('camB'))
  if (!a || !b) return null
  const t0 = parseFloat(q.get('camT0') ?? '0') || 0
  const t1 = parseFloat(q.get('camT1') ?? '') || t0 + 5
  const ease = q.get('camEase') === 'linear' ? 'linear' : 'inout'
  return <CameraMove a={a} b={b} t0={t0} t1={t1} ease={ease} force controlsRef={controlsRef} />
}

/* ── UI toggle button (lives outside Canvas) ─────────────────────── */
export function DebugCameraToggleButton({ style }: { style?: React.CSSProperties }) {
  const enabled = useOrbitEnabled()
  return (
    <>
      {/* Only useful once you have flown somewhere: puts you back on the
          shot's own camera at the current time, without leaving debug mode. */}
      {enabled && (
        <button
          onClick={resyncCameraToShot}
          title="Snap back to the shot's own camera at this moment"
          style={{
            position: 'fixed', zIndex: 99999, padding: '6px 10px',
            background: '#0A1628cc', border: '1px solid #D4A84340', borderRadius: 6,
            color: '#D4A843', fontSize: 13, fontFamily: 'system-ui, sans-serif',
            cursor: 'pointer', backdropFilter: 'blur(8px)',
            ...style,
            // Sit immediately left of the toggle, whatever the toggle's offset.
            right: `calc(${typeof style?.right === 'number' ? `${style.right}px` : String(style?.right ?? '96px')} + 92px)`,
          }}
        >⟲ shot</button>
      )}
      <ToggleButton enabled={enabled} style={style} />
    </>
  )
}

function ToggleButton({ enabled, style }: { enabled: boolean; style?: React.CSSProperties }) {
  return (
    <button
      onClick={toggleDebugCamera}
      title={enabled ? 'Disable debug camera' : 'Enable debug camera (drag/WASD/arrows)'}
      style={{
        position: 'fixed',
        top: 16,
        right: 96,
        zIndex: 99999,
        padding: '6px 14px',
        background: enabled ? '#D4A843' : '#0A1628cc',
        border: `1px solid ${enabled ? '#D4A843' : '#D4A84340'}`,
        borderRadius: 6,
        color: enabled ? '#0A1628' : '#D4A843',
        fontSize: 13,
        fontFamily: 'system-ui, sans-serif',
        fontWeight: enabled ? 600 : 400,
        cursor: 'pointer',
        backdropFilter: 'blur(8px)',
        transition: 'all 0.15s',
        ...style,
      }}
    >
      {enabled ? '● Camera' : '○ Camera'}
    </button>
  )
}

/* ── Camera shot panel (lives outside Canvas, mounted in App.tsx) ──
 * Frame a shot with the debug camera, capture it as pose A at one timestamp
 * and pose B at another, preview the interpolated move, then copy it as a
 * URL (for screenshots) or as <CameraMove /> code (to paste into the scene).
 */

const panelBtn: React.CSSProperties = {
  padding: '4px 8px',
  background: '#0A1628cc',
  border: '1px solid #D4A84340',
  borderRadius: 4,
  color: '#D4A843',
  fontSize: 11,
  fontFamily: 'system-ui, sans-serif',
  cursor: 'pointer',
}

function fmtPose(p: CamPose | null): string {
  if (!p) return '— not set —'
  const f = (n: number) => (Math.abs(n) >= 100 ? n.toFixed(0) : n.toFixed(2))
  return `[${p.pos.map(f).join(', ')}] → [${p.target.map(f).join(', ')}]${p.fov != null ? ` fov ${p.fov}` : ''}`
}

export function CameraShotPanel({ extra }: {
  /** Host-supplied controls for the button row. The studio puts its shot-ref
   *  chips here: this panel is where you go looking after framing a shot, and
   *  "copy URL" (the whole page URL, no scene, no time) and "copy code"
   *  (silently dead until both A and B are set) are not what you wanted. */
  extra?: React.ReactNode
} = {}) {
  const search = useSearch()
  const orbit = useOrbitEnabled()
  const q = new URLSearchParams(search)
  const a = parseCamPose(q.get('camA'))
  const b = parseCamPose(q.get('camB'))
  const t0 = q.get('camT0') ?? ''
  const t1 = q.get('camT1') ?? ''
  const ease = q.get('camEase') === 'linear' ? 'linear' : 'inout'
  const playing = q.get('camplay') != null

  if (!orbit && !a && !b) return null

  const capture = (which: 'A' | 'B') => {
    const pose = window.__camPose
    if (!pose) {
      alert('No camera pose available — this scene has no <DebugCamera /> inside its Canvas.')
      return
    }
    const t = +getAnimTime().toFixed(2)
    setUrlParams(
      which === 'A'
        ? { camA: camPoseToParam(pose), camT0: String(t) }
        : { camB: camPoseToParam(pose), camT1: String(t) },
    )
  }

  const jump = (pose: CamPose | null) => {
    if (!pose || !window.__cam) return
    window.__cam.set(...pose.pos, ...pose.target, pose.fov)
  }

  const play = () => {
    if (!a || !b) return
    seekAnimTime(parseFloat(t0) || 0)
    setAnimPlaying(true)
    setUrlParams({ camplay: '1' })
  }

  const stop = () => setUrlParams({ camplay: null })

  const copyUrl = () => navigator.clipboard.writeText(window.location.href)

  const copyCode = () => {
    if (!a || !b) return
    const p = (pose: CamPose) =>
      `{ pos: [${pose.pos.join(', ')}], target: [${pose.target.join(', ')}]${pose.fov != null ? `, fov: ${pose.fov}` : ''} }`
    navigator.clipboard.writeText(
      `<CameraMove\n  a={${p(a)}}\n  b={${p(b)}}\n  t0={${parseFloat(t0) || 0}} t1={${parseFloat(t1) || (parseFloat(t0) || 0) + 5}} ease="${ease}"\n/>`,
    )
  }

  const clear = () =>
    setUrlParams({ camA: null, camB: null, camT0: null, camT1: null, camEase: null, camplay: null })

  const row: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 6 }

  return (
    <div style={{
      position: 'fixed',
      top: 56,
      right: 16,
      zIndex: 99999,
      width: 340,
      padding: '10px 12px',
      background: '#0A1628ee',
      border: '1px solid #D4A84340',
      borderRadius: 8,
      color: '#E8D5B5',
      fontSize: 11,
      fontFamily: 'ui-monospace, monospace',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
    }}>
      <div style={{ ...row, fontFamily: 'system-ui, sans-serif', color: '#D4A843', fontWeight: 600, fontSize: 12 }}>
        Camera move
        <span style={{ flex: 1 }} />
        <button style={panelBtn} onClick={clear} title="Clear A/B poses">✕ clear</button>
      </div>

      {(['A', 'B'] as const).map(which => {
        const pose = which === 'A' ? a : b
        const t = which === 'A' ? t0 : t1
        return (
          <div key={which} style={row}>
            <button style={{ ...panelBtn, fontWeight: 600 }} onClick={() => capture(which)}
              title={`Capture current view + time as pose ${which}`}>
              Set {which}
            </button>
            <button style={panelBtn} onClick={() => jump(pose)} disabled={!pose}
              title={`Jump camera to pose ${which}`}>
              go
            </button>
            <span style={{ opacity: 0.85, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {fmtPose(pose)}
            </span>
            <span style={{ opacity: 0.6 }}>t=</span>
            <input
              value={t}
              onChange={e => setUrlParams({ [which === 'A' ? 'camT0' : 'camT1']: e.target.value || null })}
              style={{
                width: 44, background: '#050A14', border: '1px solid #D4A84330',
                borderRadius: 3, color: '#E8D5B5', fontSize: 11, padding: '2px 4px',
              }}
            />
          </div>
        )
      })}

      <div style={row}>
        <button
          style={{ ...panelBtn, ...(playing ? { background: '#D4A843', color: '#0A1628', fontWeight: 600 } : {}) }}
          onClick={playing ? stop : play}
          disabled={!a || !b}
          title="Seek to t0 and play the move (also stops scene camera drivers)"
        >
          {playing ? '■ stop move' : '▶ play move'}
        </button>
        <button
          style={panelBtn}
          onClick={() => setUrlParams({ camEase: ease === 'inout' ? 'linear' : null })}
          title="Toggle easing"
        >
          ease: {ease}
        </button>
        <span style={{ flex: 1 }} />
        {extra}
        <button style={panelBtn} onClick={copyUrl} title="Copy shareable URL with cam params">copy URL</button>
        <button style={panelBtn} onClick={copyCode} disabled={!a || !b}
          title="Copy <CameraMove /> JSX to paste into the scene">
          copy code
        </button>
      </div>
    </div>
  )
}
