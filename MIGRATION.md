# SceneShell migration checklist

The scene pipeline (manifest → viewer → Remotion) works for **every** scene
already: each manifest entry is routed in the viewer and registered as a
Remotion composition. What migration to `createScene` adds per scene:

- **Correct Remotion rendering.** Unmigrated three.js scenes mount their own
  R3F `<Canvas>`, whose rAF loop Remotion does not drive — renders may come
  out blank or mistimed. Migrated scenes get `@remotion/three`'s
  `ThreeCanvas` in render mode, which advances the frame loop per video
  frame. (DOM/SVG scenes usually render fine unmigrated, since CSS keyframes
  and `useAnimTime()` are synced by `RemotionTimeDriver` either way — migrate
  them for the sized/clipped render container.)
- Automatic `<DebugCamera>` and declarative `cameraMoves` from one place.

## How to migrate a scene (mechanical)

Pattern 0 — **the tag swap** (preferred for existing scenes; see any act4/5/7/8/9 scene):

1. `import { SceneCanvas } from '../SceneCanvas'` (adjust depth).
2. Replace `<Canvas …>` with `<SceneCanvas …>` — keep every prop verbatim
   (shadows, style, gl, camera, onCreated, dpr, …).
3. Delete the inner `<DebugCamera />`; if it had `target={[x,y,z]}`, pass
   `debugTarget={[x,y,z]}` on `<SceneCanvas>` instead.
4. Drop the now-unused `Canvas` / `DebugCamera` imports (keep
   `useDebugCameraEnabled` etc. if used).

That's the whole migration: SceneCanvas renders a normal R3F Canvas (+
DebugCamera) live, and the @remotion/three canvas in render mode. It works
for hybrid scenes (DOM layers + transparent Canvas overlay, e.g. `Act3_1`)
and scenes embedded by other scenes, because the component structure and
props don't change.

Pattern A — full SceneShell via createScene (preferred for NEW three.js
scenes; see `src/scenes/act3/Act3_2.tsx`):

1. Find the default export that renders `<div …><Canvas …>…</Canvas></div>`.
2. Move the Canvas props into `createScene` meta:
   ```tsx
   import { createScene } from '../createScene'   // adjust depth

   export default createScene({
     background: '#000',                          // the wrapper div background
     three: {
       camera: { position: [...], fov: ..., near: ..., far: ... },
       gl: { ... },                               // verbatim from <Canvas gl>
       shadows: true,                             // if <Canvas shadows>
       onCreated: (state) => ...,                 // verbatim
       debugTarget: [x, y, z],                    // <DebugCamera target> if it had one
     },
   }, function MySceneBody() {
     return <>{/* everything that was INSIDE <Canvas>, minus <DebugCamera> */}</>
   })
   ```
3. Delete the scene's own `<DebugCamera />` (the shell mounts it in live
   mode) and the now-unused `Canvas` / `DebugCamera` imports.
4. If the scene has a hard-coded `<CameraMove …/>`, move it to
   `cameraMoves: [{ a, b, t0, t1, ease }]` in the meta.

Pattern B — DOM/SVG scene (see `src/scenes/act1/Scene1.tsx`):

1. Keep the component as-is; export it named if something else imports it.
2. `export default createScene({}, MyScene)` — no `three` config.

Verify (both patterns):

```bash
node scripts/shot.mjs --act <key> --t 0,3,6      # frames must match pre-migration
npm run render:act -- <key> --frames 0-30        # extract a frame, compare vs live ?t=
```

Gotchas:

- Scenes animating off `useFrame(({clock}))` need **no** code change — the
  THREE.Clock lock covers them in both live (`?t=`) and render mode.
- Time inside the canvas: `getAnimTime()`; DOM: `useAnimTime()`. Never
  `performance.now()` / `Date.now()` for animation.
- Scene camera drivers (`CameraDrift` etc.) should stay gated on
  `useDebugCameraEnabled()` so the debug camera / URL moves can take over.
- Per-page-load `Math.random` layouts (drei `Stars`, `Sparkles`) make
  pixel-diffs noisy across sessions; compare against a same-session control
  or eyeball structure.

## Unmigrated scenes (still mounting their own `<Canvas>`)

Variants and side galleries — the canonical FullVideo-timeline scenes are done:

- [ ] act1/Scene1_B, Scene1_D, Scene1_StarsToCity
- [ ] act2/Act2_2 (2.2-B), Act2_3_Old (2.3-old, archived)
- [ ] act3/Act3_1 variants (_Arcane, _SpiderVerse, _Kuwahara, _Painterly, _Linocut), Act3_3_B
- [ ] act4/Act4_1 style variants (9 files)
- [ ] act5/Act5, Act5_B (legacy), Act5_2_B
- [ ] act6/Act6, Act6_B (not in SCRIPT.md V2 timeline)
- [ ] act7/Act7_B, act8/Act8_B, act9/Act9_B
- [ ] zoom/ZoomComposition (legacy sibling of DepthComposition)
- [ ] characters/* (16 files — gallery/testing scenes, low priority)
- [ ] yourname*/ (3 homage scenes, low priority)
- ~~scenes_fable/*~~ — deleted 2026-07-26; every scene was a placeholder stub.

Migrated:

- [x] act1/Scene1 (1.1) — DOM/SVG createScene pattern
- [x] act3/Act3_2 (3.2) — three.js createScene pattern
- [x] All remaining FullVideo-timeline scenes, via the SceneCanvas tag swap:
      2.2 (Act2_2_B), 2.3 (Act2_3, the reverse transition), 3.1, 3.3,
      4.1–4.10, 5.1–5.4, 7, 8, 9.
- [x] zoom/DepthComposition (1.2) — now drives DepthScene off the shared anim
      clock (`timeOffset` places it in the 18.65s chain) and mounts a
      SceneCanvas, so it renders in the FullVideo instead of freezing at t=0.
      (2.1/Scene2 is DOM/SVG — works unmigrated; verified live-invariant.)
