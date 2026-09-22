# Notes

## Debug camera vs per-frame camera drivers (2026-04-19)

### Problem
On `?act=3.2&camera=1`, both left- and right-drag only dollied the view — no orbit or pan. Same trap lurked in many other scenes.

### Cause
Scenes commonly have a `CameraDrift` / `CameraBreathing` / `CameraRig` helper that runs `useFrame` every tick and writes `camera.position` and/or `camera.lookAt(...)`. That fights OrbitControls: the user's drag nudges the camera, then the per-frame write immediately snaps it back. Only motion on axes the driver *doesn't* touch survives — which on 3.2 was z alone, so every drag looked like dolly.

### Fix
Gate each camera driver on `useDebugCameraEnabled()` (exported from `src/scenes/DebugCamera.tsx`). When the debug camera is active, the driver bails out and lets OrbitControls win.

```tsx
function CameraDrift() {
  const debug = useDebugCameraEnabled()
  useFrame(({ camera, clock }) => {
    if (debug) return
    // …normal cinematic motion…
  })
  return null
}
```

### Files patched
Act3_2, Act7, Act7_B, Act8, Act8_B, Act9, Act9_B, yourname/YourNameScene, yourname_cutouts, yourname_replicate, zoom/DepthCameraSync.

### Benign patterns (no fix needed)
- One-shot `if (!done.current) { …; done.current = true }` inside a useFrame — only fires once, OrbitControls wins after.
- `camera.lookAt(...)` inside `onCreated` — also one-shot on mount.
- `mesh.quaternion.copy(state.camera.quaternion)` — writes to meshes, not the camera.

### How to spot future regressions
Any new scene that writes `camera.position` / `camera.lookAt` / `camera.rotation` / `camera.quaternion` **inside `useFrame`** without a `debug` gate will re-introduce the bug. Quick audit:

```bash
grep -rln "useFrame" src/scenes --include="*.tsx" | \
  xargs -I{} sh -c 'awk "/useFrame\(/,/^\s*\}\)/" "{}" | grep -q "camera\." && echo "{}"'
```

Then check whether each hit has a `useDebugCameraEnabled` gate or a one-shot guard.
