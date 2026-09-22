# Prompt: Unify the scene pipeline — one scene definition, viewable live and renderable to video

Copy everything below into a fresh Claude Code session in this repo (or run
`claude "$(cat prompts/scene-pipeline-refactor.md)"`).

---

## Goal

Refactor this project so that **writing one scene file makes it automatically:
(1) appear in the live viewer, (2) scrub/freeze deterministically, and
(3) render to video through Remotion** — with no per-scene wiring in App.tsx
or Root.tsx. Creating a new scene or assembling a new video should be one file
+ one manifest entry, not edits scattered across the app.

Work in phases (below), verify each phase with the existing tooling before
moving on, and commit per phase.

## Context — what exists today (read these first)

- `CLAUDE.md` and `scripts/README.md` — tooling docs (screenshot CLI, eval,
  sweep, time control, camera moves). The tools work; do not regress them.
- `src/App.tsx` — the live viewer: a hand-maintained `acts` route map
  (~90+ keys → components) plus a duplicated `ACT_ROWS` nav list. Every new
  scene currently needs 3 manual edits here.
- `src/hooks/useAnimTime.tsx` — the global anim clock. Module-level store
  (`getAnimTime()`), URL control (`?t=` freeze, `&speed=`, `&play=1`),
  `window.__anim` API, CSS-animation sync. `?t=` also installs
  `src/utils/threeClockLock.ts`, which patches `THREE.Clock` so
  three.js-clock scenes freeze/scrub live.
- `src/scenes/DebugCamera.tsx` — debug orbit camera, `window.__camPose` /
  `window.__cam`, `<CameraMove a b t0 t1 ease>` (interpolates camera pose
  A→B along the anim clock), `CameraShotPanel` (capture A/B poses in-browser,
  copy as URL or JSX). Mounted per-scene inside each Canvas.
- `src/scenes/TimeScrubber.tsx` — play/pause/frame-step/scrub UI.
- `scripts/shot.mjs | eval.mjs | sweep.mjs` (+ `scripts/lib/`) — headless
  capture: deterministic frames at timestamps, camera-move passthrough,
  `--range/--fps/--mp4` sequences, JS evaluation in a live scene, all-scene
  smoke sweep. These consume the URL contract (`t`, `camA/camB/camT0/camT1/
  camplay`, `ui=0`, `lockclock`).
- `src/remotion/` — Remotion is wired for exactly ONE scene: `Root.tsx`
  registers `ZoomThrough` → `ZoomVideo.tsx`, which passes
  `effectiveTime = frame/fps` into `DepthScene` and wraps it in
  `@remotion/three`'s `ThreeCanvas` via a `renderCanvas` prop. No other scene
  is renderable to video. `remotion.config.ts` uses the angle GL renderer;
  package.json has `remotion:render*` scripts (angle + angle-egl GPU
  variants).
- `SCRIPT.md` — the narrative source of truth (acts, beats, timings);
  `body_to_body.lrc` + `src/hooks/useAudioTimeline.ts` / `useBeatSync.ts`
  exist for music sync. `SCENES.md` describes scenes.
- `src/scenes_fable/` — a parallel set of scene recreations another session
  is building; the new registry must accommodate extra scene directories
  without special-casing.

## The core problem to solve

Scenes read time three different ways: `useFrame(({clock}))` (three.js wall
clock), `useAnimTime()` (context; does NOT cross the R3F Canvas boundary), and
`getAnimTime()` (module store). Live scrubbing papers over this with the
THREE.Clock patch, but **Remotion rendering cannot** — a Remotion render must
drive time frame-by-frame. That's why only DepthScene (with its hand-made
`effectiveTime` prop) is renderable. There is also no single place declaring a
scene's key, title, duration, or default camera.

## Target architecture (decisions — implement these, don't re-litigate)

1. **One time source.** In live mode the anim-clock store is authoritative
   (as today). In Remotion mode, `useCurrentFrame()/fps` must WRITE the same
   store (a `<RemotionTimeDriver>` calling `seekAnimTime(frame/fps)` per
   frame, with the store frozen). Scenes then read time uniformly via
   `getAnimTime()` (inside Canvas) or `useAnimTime()` (DOM/SVG). The
   THREE.Clock lock must be installed in Remotion mode too, so legacy
   `useFrame(({clock}))` scenes render correctly without rewrites.
2. **Scene manifest instead of App.tsx wiring.** A single
   `src/scenes/manifest.ts` exporting typed entries:
   `{ key, title, group, sub?, duration (s), component: lazy import,
   canvas?: 'r3f' | 'dom', defaultCamera?, cameraMoves?, audioOffset? }`.
   Use `import.meta.glob` or explicit entries — but ONE list. `App.tsx`'s
   route map and nav, `shot.mjs --list`/`sweep.mjs` (via `scripts/lib/acts.mjs`)
   and Remotion's `Root.tsx` must all derive from it. Keep every existing key
   working (93+ keys — run `node scripts/shot.mjs --list` before and after;
   the sets must match).
3. **SceneShell.** A `createScene(meta, SceneBody)` (or `<SceneShell>`)
   wrapper that owns what every scene now hand-rolls: full-viewport container,
   `<Canvas>` in live mode vs `@remotion/three` `ThreeCanvas` in render mode,
   `<DebugCamera>` mounted automatically, declared `cameraMoves` rendered as
   `<CameraMove>` components. Migrate 2–3 representative scenes (one SVG/DOM,
   one plain 3D, one with camera moves — e.g. `3.2`) as proof; do NOT
   mass-migrate all 90 in this pass, but leave a `MIGRATION.md` checklist.
4. **Auto-generated Remotion compositions.** `Root.tsx` maps over the
   manifest: one `<Composition id={key}>` per scene (duration from manifest,
   1920×1080@30 + a 720p master variant), plus one `FullVideo` composition
   sequencing scenes per `SCRIPT.md` timings (a `timeline.ts` of
   `{ key, from, duration }` entries + `<Series>`/`<Sequence>`, audio from
   `public/audio/`). Rendering any single act must be:
   `npx remotion render src/remotion/index.ts <key> out/<key>.mp4`.
5. **Tooling stays the single verification loop.** Add npm scripts:
   `render:act` (parameterized single-act render) and keep `shot`/`sweep`
   working unchanged. Extend `sweep.mjs` with `--stills` mode only if trivial;
   otherwise skip.

## Constraints

- Do not break the URL contract (`?act=`, `?t=`, `camA/camB/...`, `ui=0`,
  `lockclock`) — scripts and muscle memory depend on it.
- Do not touch `src/scenes_fable/` contents (another session's work); just
  make the manifest able to include such directories.
- Remotion renders must not depend on `window.location` hacks — render mode
  should be detected via Remotion context (or an explicit prop), not URL.
- Keep `npx tsc --noEmit` clean. ESLint has ~900 pre-existing errors; don't
  add new NON-react-refresh errors in files you touch.
- Chrome/SwiftShader quirks: heavy scenes need warm-up (the tools already
  retry blank frames); Remotion uses `--gl=angle`(`-egl` for GPU) — reuse
  those flags, `--concurrency=1`, long timeout.

## Phase plan (verify + commit after each)

- **Phase 0 — recon.** Read the files above. Write down (in the PR/commit
  message, not a new doc) the 3 time-consumption patterns with one example
  scene each.
- **Phase 1 — manifest + viewer.** Create `manifest.ts`; rewrite `App.tsx`
  route map + nav and `scripts/lib/acts.mjs` to consume it.
  ✅ Verify: `node scripts/shot.mjs --list` output is unchanged (diff it);
  `node scripts/sweep.mjs --filter 3. --t 3` all clean; nav page renders
  (screenshot it).
- **Phase 2 — unified time + SceneShell.** RemotionTimeDriver, render-mode
  ThreeCanvas swap, clock lock in render mode; migrate the 2–3 pilot scenes.
  ✅ Verify: pilots still work live (shot.mjs frames at t=0/3/6 unchanged
  vs pre-migration captures), and `npx remotion render ... <pilot> --frames
  0-30` produces a correct clip (extract a frame with ffmpeg and compare
  against the live `?t=` capture — should match near-pixel).
- **Phase 3 — compositions + master timeline.** Auto-register compositions;
  build `timeline.ts` from `SCRIPT.md` (put the beat table in code with
  comments citing SCRIPT.md sections); `FullVideo` with audio.
  ✅ Verify: `remotion render FullVideo --frames 0-90` works; single-act
  render script works; `npm run build` and tsc clean.
- **Phase 4 — docs.** Update `CLAUDE.md` ("adding a new scene" = create file
  with `createScene`, add manifest entry, done — include a 20-line example)
  and `scripts/README.md`. Add `MIGRATION.md` listing unmigrated scenes and
  the mechanical steps to port one.

## Definition of done

A new scene added by: (1) creating `src/scenes/actN/MyScene.tsx` using
`createScene`, (2) adding one manifest entry — then WITHOUT further edits:
it appears in the nav, `?act=` serves it, `?t=`/scrubber/camera panel work,
`shot.mjs`/`sweep.mjs` see it, and `remotion render <key>` produces an mp4.
Demonstrate this end-to-end with one new throwaway demo scene, capture the
proof (nav screenshot, frozen frame, rendered mp4), then delete the demo
scene before the final commit.
