/**
 * Camera handoff — the state behind `useCameraHandoff()` in DebugCamera.tsx.
 *
 * THE PROBLEM THIS SOLVES. Every scene with a keyframed camera used to stand
 * down the instant the debug camera was enabled:
 *
 *     const debug = useDebugCameraEnabled()
 *     useFrame(({ camera }) => { if (debug) return; …drive the camera… })
 *
 * which reads as "get out of the way" but actually means "abandon the camera
 * wherever it happens to be". And where it happens to be, if the rig has not
 * run yet, is the pose R3F declared at mount — the scene's t=0 pose. So
 * turning on the camera at 0:08 of Act 1 did not hand you the city you were
 * looking at; it dropped you in the mountain range, eight seconds earlier in
 * the flight, with no indication that anything had moved.
 *
 * THE FIX. Yielding is a handoff, not an abort: the rig keeps driving for one
 * more frame after the debug camera turns on, so the camera is sitting on the
 * live pose at the moment OrbitControls adopts it.
 *
 * A rig also knows something the camera's transform cannot express — WHERE IT
 * IS LOOKING, and how far away that is. `lookAt` is only a direction once it
 * has been baked into a quaternion, so a rig publishes its look-at point here
 * while it drives and the debug camera uses the last one as its orbit pivot.
 * Without it the pivot falls back to a fixed distance ahead of the camera,
 * which orbits around thin air when the subject is 24 units away.
 *
 * Deliberately module-level rather than React state: this is read inside
 * `useFrame`, which does not cross the R3F reconciler boundary, and it is
 * per-page-session by nature (there is one camera).
 */

/** Bumped to make every live rig re-take the camera for one frame. */
let generation = 0

/** Last look-at point published by a driving rig, and when. */
let lookAt: [number, number, number] | null = null
let lookAtGeneration = -1

/**
 * Called by a rig on every frame it drives the camera. Cheap by design —
 * three number writes, no allocation — because it runs at 60fps.
 */
export function publishSceneLookAt(x: number, y: number, z: number) {
  if (lookAt) {
    lookAt[0] = x; lookAt[1] = y; lookAt[2] = z
  } else {
    lookAt = [x, y, z]
  }
  lookAtGeneration = generation
}

/**
 * The pivot the debug camera should orbit, or null if no rig ever published
 * one (a static scene, or a rig that has not been taught to). Only valid for
 * the current generation — a resync bumps it so a stale point from a previous
 * handoff cannot be reused.
 */
export function getSceneLookAt(): [number, number, number] | null {
  return lookAtGeneration === generation ? lookAt : null
}

/** Rigs clear this when they stop driving so nothing reads a stale point. */
export function forgetSceneLookAt() {
  lookAtGeneration = -1
}

export function handoffGeneration(): number {
  return generation
}

/**
 * Re-adopt the shot's own camera: every rig drives for one more frame and the
 * debug camera re-seeds from the result. This is "put me back where the shot
 * is" — the escape hatch for having flown somewhere and lost the frame.
 */
export function resyncCameraToShot() {
  generation++
}
