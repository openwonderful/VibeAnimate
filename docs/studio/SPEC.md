# Flow Studio — Technical Specification

> Living document; consult before every iteration. Companion to `GOAL.md`
> (what winning looks like) and `PRD.md` (requirements + research).
> Last update: 2026-08-06 (initial).

## 0. Hard constraints (do not break)

1. `src/scenes/manifest.ts` `SCENES` array is **regex-parsed** by
   `scripts/lib/acts.mjs` (`/^\s*\{ key: '([^']+)'/gm`): entries stay
   one-per-line object literals with `key:` first.
2. `src/remotion/timeline.ts` `TIMELINE` is regex-parsed by
   `scripts/render-fast.mjs`: same one-line-literal rule.
3. One global clock: `src/hooks/useAnimTime.tsx` module store. Studio
   drives it via `seekAnimTime`/`setAnimPlaying`/`setAnimSpeed` and
   subscribes via `subscribeAnimControl` + `useSyncExternalStore`.
   **Never add a second clock.**
4. `syncCssAnimations()` pins ALL CSS animations when the clock pauses →
   Studio chrome must not rely on CSS keyframe animations.
5. `shot.mjs` contract: `?act=KEY`, appends `ui=0`, `?t=` freezes,
   `window.__anim.seek`. New URL params must not collide.
6. `src/scenes_fable/` is owned by another session — do not touch.
7. Keep `npm run build` (tsc -b + vite) and `npm run lint` green.

## 1. Directory layout (new code)

```
src/studio/
├── FlowStudio.tsx        # editor shell: panels, layout, keyboard map
├── panels/
│   ├── TimelinePanel.tsx # Scenebuilder: tracks, clips, playhead, zoom
│   ├── AssetBrowser.tsx  # Ingredients grid w/ live R3F previews
│   ├── ShotList.tsx      # manifest-derived shot cards, groups
│   ├── Inspector.tsx     # selection details (clip/ingredient/shot)
│   └── ViewportPanel.tsx # live scene preview (iframe or direct mount)
├── ui/theme.ts           # shared style tokens (gold/navy editor look)
├── ingredients/
│   ├── registry.ts       # INGREDIENTS manifest: id, name, category,
│   │                     # tags, Preview component, default props
│   └── <Ingredient>.tsx  # one file per ingredient (characters, props,
│                         # environment pieces, style presets)
├── worlds/
│   ├── types.ts          # WorldDef, Anchor, ShotConfig, LightingPreset
│   ├── World.tsx         # <WorldShot world=... shot=...> mount helper
│   │                     # + region culling (visibleRegions)
│   └── <WorldName>/      # world component + anchors + regions
└── materials/
    ├── toon.ts           # makeToonMaterial (banded ramp), ToonSwap,
    │                     # outline (inverted hull / OutlineEffect), rim
    └── ToonEffects.tsx   # optional posterize/halftone post pass

blender/                   # Backend B (Blender 4.0.2 apt / bpy 5.0.1 pip — INSTALLED, verified)
├── README.md
├── lib/flow.py           # world/shot/ingredient helpers in bpy
├── scenes/<name>.py      # one scene per file
└── render.mjs            # CLI: npm run render:blender -- <scene>

docs/studio/              # GOAL.md, PRD.md, SPEC.md, STORY.md (story bible)
```

## 2. Routing

`src/App.tsx`: add at top of `App()`:
`if (params.get('app') === 'studio') return <FlowStudio />`.
Studio mounts its own `AnimTimeProvider`. Scene chrome (`AppChrome`)
stays out of the studio path; studio owns its full-viewport layout.

## 3. Studio shell (F1)

- Dark professional editor: top bar (project title, transport controls,
  time readout), left = ShotList, center = Viewport, right = Inspector,
  bottom = TimelinePanel. Resizable-ish via fixed proportions first.
- Style: `src/studio/ui/theme.ts` tokens lifted from existing chrome
  (`#0A1628`/`#050A14` surfaces, `#D4A843` gold accent, `#E8D5B5` text,
  monospace values) so the whole app reads as one product. Inline styles
  (repo convention; Tailwind stays unused).
- Viewport strategy: **iframe** to `/?act=<key>&ui=0` for full fidelity
  with zero coupling; postMessage/`__anim` bridge for scrubbing — the
  iframe's clock is driven by seeking on load via `?t=` and by
  re-navigation on clip change; later upgrade to direct mount via
  `sceneByKey(key).load()` + Suspense for same-tab time sync
  (chosen: **direct mount**, it reuses the singleton clock natively —
  iframe would fork the clock).
- Keyboard: Space play/pause, ←/→ frame step (Shift ×10), Home/End,
  J/K/L shuttle. Guard against INPUT targets; don't collide with
  DebugCamera (WASD/QERF) or TimeScrubber (`,`/`.`/P).
- Continuous playback (`FlowStudio.tsx`): the viewport mounts ONE scene at
  a time, so playing past a clip's out-point must CUT to the next clip
  rather than run the scene past its end. While attached to the timeline
  (`view.masterFrom != null`), a rAF watcher resolves the clip owning the
  current master time, selects it, and seeks its scene-local equivalent —
  master time is continuous across the cut. It warms the next clip's lazy
  chunk 1s ahead, and parks paused on the film's last frame at the end.
  Detached shots (opened from the Shots panel) just keep playing.

## 4. Scenebuilder timeline (F2)

Data: import `TIMELINE`, `TOTAL_DURATION_SEC` from `src/remotion/timeline.ts`
(absolute seconds, `{key, from, duration, props}`), plus `sceneByKey` for
titles/groups. Group→color mapping per act.
- Render: virtualized-enough plain divs; px-per-second zoom state
  (fit / 2× / 4× / 8×); ruler with second ticks; clip blocks show
  key + title, tooltip with props.
- Playhead bound to global clock (`useAnimTime`), master-time mode:
  clicking timeline at time T = select clip under T, mount its scene in
  viewport, `seekAnimTime(T - clip.from)` (scene-local time), store
  master offset so transport shows both local + master time.
- Editing v1: select clip → Inspector shows editable from/duration →
  "copy timeline.ts line" (one-line literal, regex-safe) for the agent
  to apply. No direct file writes from the browser.

## 5. Ingredients (F3)

```ts
export type Ingredient = {
  id: string              // 'char.goldFigure', 'env.hanok', 'style.toon'
  name: string
  category: 'character' | 'prop' | 'environment' | 'style' | 'fx'
  tags: string[]
  description: string
  Preview: ComponentType  // self-lit small R3F scene fragment
  sourcePath: string      // where the real component lives
}
```
- Wrap existing shared modules first: GoldFigure (adult/child, material
  presets), mountainShapes, StoneWall, CityBuildings3D, new extractions
  (below). AssetBrowser renders a grid of small `<Canvas frameloop="demand">`
  previews (cap simultaneous canvases ~12, IntersectionObserver-gated).
- **Extraction targets** (dedup found in survey): `DirtRoad` (12 copies),
  `HanokInterior` (6), Act4 village kit — `AnimatedHanok`, `ShrinkingPaddy`,
  `PowerPole`, `FadingMountains`, etc. (10 copies each). Extract to
  ingredients incrementally; leave existing scenes untouched until a
  dedicated migration iteration (visual-diff with shot.mjs before/after).

## 6. Worlds (F4)

```ts
export type WorldAnchor = { id: string; pos: [number,number,number]; look?: [number,number,number] }
export type WorldRegion = { id: string; children: ReactNode }   // culling unit
export type WorldDef = {
  id: string; name: string
  Component: ComponentType<{ shot: ShotConfig }>
  anchors: Record<string, WorldAnchor>
  regions: string[]
  lighting: Record<string, LightingPreset>   // 'day' | 'dusk' | 'night' | ...
}
export type ShotConfig = {
  world: string
  cameraMove?: { a: CamPose; b: CamPose; t0: number; t1: number; ease?: string }
  anchor?: string          // convenience: camera framed on anchor
  lighting: string
  visibleRegions?: string[] // undefined = all; else <Region> renders only these
  actors?: ReactNode        // per-shot ingredient instances
}
```
- `<WorldShot def={world} shot={...}>` = camera + lighting + region
  gating; `<Region id>` wraps world chunks; gating = simple mount/unmount
  (declarative culling — cheaper than per-frame frustum tests and works
  with SwiftShader renders). Optional `frustumCulled` stays on for
  three's per-object culling within regions.
- Pilot world: extract the Act4 village (10 duplicate copies today) into
  `worlds/Village/`; second world for the new story (F7).
- Each shot is still a normal manifest scene (one file: define
  `ShotConfig`, render `<WorldShot>`), so all tooling works unchanged.

## 7. Toon materials (F5)

- `makeToonRamp(stops)` → DataTexture gradient map; `toonMaterial({color, bands, rim})`.
- `<ToonSwap>` lifted from `Act4_1_C.tsx`: traverse, pair
  MeshStandardMaterial→MeshToonMaterial, per-frame sync color/opacity;
  plus `OutlineEffect` (three-stdlib) wrapper `<ToonOutlineRenderer>`.
- Optional `PosterizeEffect`/halftone via `postprocessing` `Effect`
  subclass in `src/shaders/` (pattern already established by
  KuwaharaEffect/LinocutEffect).
- Demo scene key `lab.toon` (group: Studio) showing ramp bands, outline
  width, rim on GoldFigure + village ingredients. Must render in
  Remotion mode too.

## 8. Blender backend (F6) — INSTALLED ✅

- Blender 4.0.2 (`/usr/bin/blender`), bpy 5.0.1 (python module).
- `blender/lib/flow.py`: mirrors studio concepts — `make_world()`,
  `add_shot(camera_from, camera_to, t0, t1)`, ingredient builders
  (procedural hanok, figure, tree), toon = Freestyle outlines (BSDF
  ramp via ColorRamp node → EEVEE may need GPU; default **Cycles CPU**
  with low samples for headless reliability).
- `blender/render.mjs`: `blender -b -P scenes/<name>.py -- --out ... --frames A:B`,
  then ffmpeg to mp4 into `out/renders/blender/`.
- Acceptance: one story shot rendered by BOTH backends for comparison.

## 9. Story film (F7) — "The Lantern Keeper" (working title)

Original story, Korean-folk-meets-anime look (leverages toon shaders +
existing palette DNA). Story bible in `docs/studio/STORY.md`: logline,
3-act beat sheet, characters (→ ingredients), locations (→ worlds),
shot list (→ manifest keys `story.1`..`story.N`), master timeline
`src/studio/story/timeline.ts` + Remotion comp `StoryFilm`.

## 10. Testing per iteration

- `npm run build` + `npm run lint`.
- Dev server + `node scripts/shot.mjs --act <new keys> --t ...`; visual
  check of PNGs (Read them).
- `node scripts/sweep.mjs --filter <prefix>` for new scene groups.
- Sample renders via `render:act` for story scenes; Blender smoke render.

## 10.5 Films registry (added round 2)

`src/studio/films.ts` — `FILMS: Film[]` (id, name, items, durationSec,
composition, sourcePath). The Scenebuilder edits whichever film is
active; `?film=<id>` deep-links. Style cuts are first-class films: the
anime cut maps `story.N-B` keys over the same beat timings
(`STORY_ANIME_TIMELINE`). Adding a film = one timeline array + one
FILMS entry + (optionally) a Remotion composition in Root.tsx.
`<AnimeLook>` (src/studio/materials/AnimeLook.tsx) is the reference
pattern for a packaged grade; shots export `SHELL` + actor components
so a style variant stays a ~20-line file.

## 12. Performance & ergonomics review (round 3) — the honest audit

### 12.1 Performance: where it stands

**Scene runtime (good).** Worlds cull by region at mount level; the
≥12-copy scatter groups are instanced (3 draw calls for mountains +
road); ingredient previews render on `frameloop="demand"`; per-object
frustum culling stays on. The real ceiling on this box is software GL —
mitigated by the Mesa path (`SHOT_GL=gl-egl`, ~30% faster) and the
`preview:film` pipeline; full-quality renders belong on a GPU box.

**Editor runtime (fixed this round).** The shared clock is React
context updated 60×/s, so every consumer re-renders per frame. The
audit found three over-broad consumers: TimelinePanel (re-mapped every
clip each frame just to move the playhead), TopBar, and ViewportPanel's
header. Rule now enforced: **only leaf components may consume
`useAnimTime()`** — `<PlayheadLayer>`, `<ClockChip>`; everything else
reads the clock imperatively (`getAnimTime()`) inside handlers.
Per-frame React work is now three chip-sized components.

**Known scaling limits (accepted, documented):**
- AssetBrowser mounts one WebGL context per preview card — fine ≤ ~16
  ingredients; beyond that, gate mounting with an IntersectionObserver.
- 135 manifest entries → 135 lazy chunks (fine) but one 700KB shared
  chunk (three.js + anim core); code-splitting three from the DOM-only
  scenes is the next build-size lever.
- Lights are the forward-rendering cost driver: keep real
  `<pointLight>`s to a few per shot (Lantern's `light` prop exists for
  exactly this reason — most lanterns are emissive-only).

### 12.2 Ergonomics: adding & reorganizing

| Task | Cost today |
|------|-----------|
| New scene/shot | one file + one manifest line — or `node scripts/new-shot.mjs --key … --register` (one command) |
| New act/group | one `SCENE_GROUPS` line + its scenes |
| New style variant of a shot | ~20 lines (shots export `SHELL` + actors; grades are drop-ins like `<AnimeLook>`) |
| New film | **two touchpoints** (was three): timeline array + `FILMS` entry — Remotion comps auto-register from `FILMS` (§12.3) |
| Reorder/trim a film | drag in the Scenebuilder → Inspector exports the array → paste (or hand to the agent) |
| Rename/move scenes | edit manifest + run `npm run doctor` (§12.4) to catch every dangling reference before runtime |

### 12.3 FILMS-driven compositions

`src/remotion/Root.tsx` registers story-film compositions **from the
FILMS registry** (1080p + 720p variants per film, id from
`film.composition`). FullVideo stays hand-written (it owns the audio
track). Adding a film no longer touches Root.

### 12.4 The doctor (`npm run doctor`)

`scripts/doctor.mjs` statically validates the whole reference graph the
runtime would otherwise only check at load/render time: duplicate keys
and colliding sanitized composition ids, scene files that don't exist,
undeclared groups, timeline keys missing from the manifest, clips
longer than their scene's `durationSec`, overlaps and gaps, and FILMS
entries whose timelines drifted. Run it after any reorganization; CI
would run manifest-regex compliance + doctor + `tsc` + `eslint`.

### 12.5 What else to consider (the roadmap the audit surfaced)

1. **Audio** — story comps are silent; a per-film `audio?: string`
   field in FILMS + `<Audio>` in the film factory is the shape.
2. **Persistence of editor state** — timeline edits are session-only
   by design (code is the source of truth); if the studio ever writes
   files, it should go through a local dev-server endpoint that formats
   manifest/timeline lines, never freehand file IO from the browser.

   **Amended by K2 (the agent console).** The rule above — and PRD §2.3's
   "no server/backend" and "no in-browser editing that writes files
   directly to disk", and GOAL.md's positioning of Claude Code as
   *external* to the app — were all written before the console could ask
   an agent to change the repo. `? …` in the console now runs Claude Code
   headless via `/__studio/agent`, with `--permission-mode acceptEdits`,
   so it CAN write files. That is a deliberate reversal, not an oversight,
   and the reasons the original rule existed are still honoured:

   - The browser still never writes a file. It posts a *prompt*; the dev
     server spawns the agent with argv (never a shell, because quotes and
     `$(…)` are ordinary characters in a sentence), and the agent's edits
     go through the same tools and the same git history as any other work
     in this repo.
   - `/__studio/agent` is `apply: 'serve'` and behind the same three
     gates as `/__studio/exec` — content-type, same-origin, per-start
     token. It cannot exist in a production bundle.
   - The master timeline is still paste-only. `/__studio/apply-timeline`
     refuses it by design, and nothing about the agent changes that.
   - Each console tab is one conversation (`--session-id` on the first
     turn, `--resume` after), so two tabs are two conversations rather
     than one interleaved mess. `--continue` is per-directory and would
     have merged them.

   The system prompt states the DEGREES convention explicitly, because
   `editable/commands.ts` converts degrees to radians and an agent that
   emits radians produces a 1.6° nudge that reads as a silent failure.

   **Amended a third time: the panel IS Claude Code (K3).** Everything below
   about routing prose to `--print` is history. `/__studio/pty` is a
   WebSocket carrying a real pty (`node-pty`) running the interactive
   `claude` TUI, drawn by xterm.js in the rail — so the panel has permission
   prompts, plan mode, slash commands, `/clear`, and a stop key, because it
   is the program rather than an imitation of it.

   Two things had to be rebuilt around that:

   - **The upgrade guard is not the HTTP guard.** An upgrade has no
     content-type and `new WebSocket()` cannot set headers, so gates 1 and 3
     are simply unavailable. What replaces them: Origin is required and must
     match (a browser always sends it, so a *missing* Origin is refused here
     rather than tolerated — that is curl), and the token moves into the
     SUBPROTOCOL, `['studio.pty', token]`, which is the one client-set header
     a browser will send and keeps the secret out of anything that logs paths.
   - **The selection needs a route the pty does not have.** A terminal is
     bytes and knows nothing about a 3D scene. `@keeper move y 0.5` therefore
     stays entirely in the browser, on its own one-line strip under the
     terminal — intercepting `@` inside xterm would put characters into a
     full-screen TUI's frame buffer and desynchronise its input line. What
     the agent gets instead is `.studio/selection.json`, republished over the
     same socket on every selection change and named in the system prompt, so
     "make him taller" still knows who "him" is.

   Sessions belong to the server, on the R3 pattern: the pty outlives its
   socket, output is replayed on reattach, and a reload resumes the same
   conversation. `/__studio/agent` survives for scripted one-shots.

   **Amended again: the console is Claude-first (`consoleRoute.ts`).** K2
   left the agent behind a `?` sigil on a panel that was otherwise a
   terminal, and the observable behaviour of typing a sentence into it was
   a shell error — so the panel read as "not connected to Claude" while the
   endpoint answered a fresh session in 3.9 s. The default is inverted now:

   | you type | it goes to |
   |---|---|
   | anything | Claude |
   | `$ …` / `! …` | the dev server's shell, streamed and killable |
   | `@id verb …`, `ls` | the live scene, applied locally and instantly |
   | `? …` | Claude (kept — it was the documented way in) |

   Lines that *look* like commands (`npm test`) still ask rather than run.
   Guessing wrong in that direction costs an answer about npm; guessing
   wrong in the other direction runs something.

   **The selection is an attachment.** Selecting an object in the viewport
   puts it on the prompt as a chip, and asking sends Claude its id, kind,
   source file and CURRENT transform ahead of the question — so "make him
   taller" is a complete instruction. The block says explicitly that the
   live transform may differ from the source, because studio poses are
   non-destructive and an agent that does not know that will "fix" a
   position that was never wrong in code.
   **The lyric sheet is pinned 1:1 to the recording, and nothing maps it.**
   `public/lyrics/body-to-body.lrc` is what films.ts loads; every cue in it
   is song time, which is also film time, which is also the studio ruler's
   time. Edit it directly.

   It used to be GENERATED, and the reason is worth keeping because it is the
   shape of the bug that comes back: the shipping mp3 was once not the song
   but a splice of it (cut at 126.8, 8 seconds of silence for the death, then
   the song again from source 123.0), so a sheet timed against the original
   recording was right for two minutes and then a fixed 11.8s early for the
   rest — every cue still in the right ORDER and still roughly under a vocal,
   which is why it survived a merge unnoticed. `scripts/lyrics-splice.mjs`
   existed to do that mapping and is now a tombstone that refuses to run
   (its `--check` compared the sheet against its own splice defaults, so left
   as working code it would have called a re-spliced sheet up to date).
   `body-to-body-source.lrc` survives beside the shipping sheet as the
   hand-pinned original and the two are byte-identical; `cmp` them.
   **The double-buffered stage breaks the single-mounted-scene contract,
   and it goes deeper than two scenes fighting over one variable.** Four
   module-level singletons in `src/scenes` are written by scene code:
   `actB/time.ts`'s `offset`, `act7r/journey74.ts`'s `clockShift`,
   `actB/porch.tsx`'s `porchOverride`, and `cameraHandoff.ts`'s `lookAt`.
   Every one of them carries a comment saying it is safe because exactly one
   scene is mounted at a time. The stage mounts two.

   The chain, in order, because only the last link is fixable cheaply:

   1. The stage mounts the NEXT clip 1.5s early so a cut is instant.
   2. There is ONE anim clock, and it holds the CURRENT clip's local time. So
      the prefetched scene is evaluated at a time it will never be played
      at — 7.4 is 6.5s long and gets rendered at t=19.65.
   3. Scenes derive their world clock from that time and write it to the
      shared globals. `ValleyStill` writes `setFlightOffset` in its render
      body, and its `WorldClock` writes it again EVERY FRAME, so this is a
      continuous fight between two rAF loops rather than a mount race.
   4. The visible scene then reads the loser's values.

   Measured with 6.85 on screen at local t=19.65 and 7.4 prefetched. (That
   measurement predates the splice removal, when 6.85 was a 20.5s clip — it
   is 9.05s now, so t=19.65 is off the end of it and `journey74`'s shift is
   −9.05 rather than −20.5. The failure is unchanged; only the arithmetic
   under it moved, and re-measuring it would cost more than it is worth
   while `prefetch: false` is the answer.)

   | | prefetch on | correct | off by |
   |---|---|---|---|
   | `flightOffset` | 70.72 | 47.38 | +23.3s |
   | `worldTime` | 113.87 | 90.54 | +23.3s |
   | `journey74` shift | 0 | −20.5 | +20.5s |
   | `sceneLookAt` | −22, 38.2, −508 | 7.2, 41.5, −656.5 | ~150u |

   `flightOffset` drives the grade, the fog, the sun and `walkZ`, so this is
   not a debug-camera curiosity: the last 1.5s of a shot is lit for a
   different time of day. Renders are unaffected — Remotion's `<Sequence>`
   mounts one scene at a time.

   Today's answer is a switch: `prefetch: false` (Settings, or `?prefetch=0`)
   mounts one scene ever, and every value above comes back correct.

   The cure is to scope these per scene tree, and the objection recorded in
   the code — "a context read would re-render the whole valley every frame" —
   is answerable: put a stable GETTER over a ref in the context rather than
   the value. Readers call it inside `useFrame` and nothing re-renders, which
   is the same `state/useLatest.ts` shape the studio shell already uses. Every
   writer and every reader of these four lives inside the SAME Canvas, so the
   reconciler boundary the globals exist to work around is not between them.
3. **Undo/redo** — editedItems is already immutable snapshots; a
   history stack is a small addition once editing verbs grow.
4. **Multi-track** — the Scenebuilder is single-track (matching
   `<Sequence>` sequencing); overlays/transitions need a second track
   concept and a compositor story first.
5. **Tests** — the doctor covers the data graph; unit tests should
   start where math lives (`kf`, `makeToonRamp`, reorder/re-pack).
6. **Asset pipeline** — GLB ingredients (public/models) aren't in the
   registry yet; add a `model` ingredient kind with a drei loader when
   authored assets arrive.

## 13. Blender mode (F8) — direct object manipulation

The studio is a video editor AND a 3D DCC. Blender mode is the second
half: select an object in the viewport, transform it with a gizmo, read
and type its numbers, and address it by name from the terminal.

### 13.1 The editable object model

`src/studio/editable/` is a module singleton (same reason as the anim
clock: React context does not cross the R3F reconciler boundary).

- **`<Editable id name kind sourcePath>`** wraps an actor in a scene.
  Its `position/rotation/scale` props are the object's BASE transform:
  what `reset` returns to and what the exported JSX is diffed against.
  Animate on an INNER group (see `DistantKeeper` in story.1) so manual
  placement and the animation don't fight over the same node.
- **`store.ts`** owns the registry, selection, gizmo mode/axis/space/
  snap, and two notification channels: `subscribeEditables` (structure —
  selection, registration, visibility) and `subscribeEditableTransforms`
  (high frequency — every gizmo drag step). Panels subscribe to the
  narrow one they need; nothing in the chrome re-renders per frame.
- **Overrides are scoped and non-destructive.** Edits persist per scene
  key into sessionStorage, but ONLY while the studio has called
  `setEditableSceneContext(key)`. Plain `?act=` pages and Remotion
  renders never apply them, so captures stay deterministic — the code
  remains the source of truth, exactly like timeline edits (§4).
- **`window.__editables`** — `list/select/get/set/reset/mode/code` for
  CDP tooling. `shot.mjs --eval "…"` screenshots a driven state.

### 13.2 Viewport (in-canvas)

`StudioViewportTools` mounts inside `SceneCanvas`, gated on
`IS_STUDIO_APP`, lazily — viewer and render bundles never load it.

- **ClickSelect** raycasts registered objects on clean clicks (< 6px
  travel, not a gizmo release); a drag is a camera move, as in Blender.
- **TransformControls** (drei) reflects store state and commits on every
  `objectChange`; it disables OrbitControls while dragging, so it
  composes with DebugCamera rather than fighting it.
- **SelectionBox** is a `THREE.BoxHelper` refreshed per frame, so the
  highlight tracks animating objects.

### 13.3 On-screen controls (DOM overlays)

- **ObjectToolbar** (left): mode column ✥/⟳/⤢, axis constraint X/Y/Z,
  world/local space, snap increments (0.25u · 15° · 0.1×).
- **TransformSidebar** (right): Blender's N-panel — drag-scrub numeric
  fields (X/Y/Z colour-coded), rotation in degrees, per-channel reset,
  visibility, and `copy JSX` for pasting the pose back into the scene.
- **Outliner** (right dock): every editable, its kind, its `@id`, and a
  visibility toggle; empty state tells you how to expose objects.
- **PerfChip** (bottom-left): fps · dpr · draw calls · triangles, plus
  an `edited ⟲` affordance that discards the scene's overrides.
- **Keys** (`keys.ts`, capture phase so they beat the transport):
  G/R/S mode, Alt+G/R/S reset that channel, X/Y/Z axis, N space,
  C snap, H hide (Alt+H show), Tab cycle, Esc deselect. They stand down
  entirely when nothing is selected.

### 13.4 The @entity terminal

`commands.ts` is a pure parser (`parseEntityCommand`) plus a thin apply
layer (`runEntityCommand`), unit-tested in `entityCommands.test.ts`.

    @keeper move y 0.5      relative nudge on one axis
    @keeper pos 0 1.2 3     absolute location
    @keeper rot y 45        rotation in DEGREES
    @keeper scale 1.4       uniform (or three numbers)
    @keeper hide|show|select|reset [pos|rot|scale]|info|code
    ls                      list the scene's objects

`@` autocompletes from the LIVE scene's registry. Anything that is not
an entity verb falls through to `/__studio/exec`, so it stays a real
terminal. Scrollback is a list of BLOCKS, not one string: an entity
command answers with a card (live transform readout + select/hide/
reset/copy-JSX actions) that keeps updating as the object moves.

### 13.5 Performance governor

`FrameGovernor` (studio viewport only):

1. **Demand rendering** — frameloop drops to `demand` whenever the clock
   is paused and nothing is interacting; seeks, pointer activity, gizmo
   drags and console edits invalidate a frame. A parked viewport costs
   ~zero GPU, like any DCC.
2. **Adaptive DPR** — an FPS EMA steps the pixel ratio down through
   1.5 → 1.25 → 1 → 0.8 → 0.65 when a scene can't hold ~45fps, and back
   up after sustained headroom. User-generated scenes lose resolution,
   never responsiveness.
3. **Stats** — peak-hold draw calls/triangles per 0.25s window (peak,
   because EffectComposer scenes zero the counter on some frames).

Related fix: in studio mode `createScene` sizes the stage to the 16:9
cage (`100%`) instead of `100vw/100vh`, so the viewport shows the real
framing instead of a top-left crop of a window-sized render.

## 13.9 Iteration order

I2 shell → I3 timeline → I4 ingredients → I5 worlds (Village pilot) →
I6 toon → I7 Blender → I8 story → I9 test/fix → I10 polish/LOC report.
Hourly wake-ups continue from wherever this list stands.

## 14. Shot refs — hand a framing to the model

The note that motivated this, verbatim: *"I don't want to have to say go up
a little bit more, go right a bit more… I just want to show this and share
the full orientation with the model."*

Two chips in the stage header next to `⧉ open`, and the same pair (`⌖ ref`,
`⌖ →`) in the **Camera move panel's** button row — that panel is where you
go looking after flying a framing, and its `copy URL` (the whole page URL,
no scene, no time) and `copy code` (silently dead until both A and B are
set) are not what you wanted:

- **⌖ copy ref** — captures the current framing as ONE bracketed token and
  puts it on the clipboard:

  `[shotref 8.55 t=38.00 film=3:00.00 f5400 cam=(2.7,6.4,-12.9)->(-14.2,131,-24.1)
  fov=62 pose=orbited png=/abs/…/out/shotrefs/8.55@t38.00-….png]`

  Scene key; scene-local `t`; film time + master frame when the view came
  from the timeline (dropped when the shot was opened detached); the full
  camera orientation from `window.__camPose`; `pose=orbited` (a hand-flown
  debug-camera view — a framing you WANT) vs `pose=shot` (what the rig
  renders at that t); and the absolute path of a PNG of that exact stage
  frame. Paste it into any model chat, mid-sentence.

- **⌖ → claude** — same capture, then opens the console tab and TYPES the
  token onto the sidebar Claude's prompt (trailing space, not submitted —
  you finish the sentence: "…make the rig end here").

Pieces: `src/studio/shotref.ts` (capture + the pinned token format —
`__tests__/shotref.test.ts`), the gated `POST /__studio/shotref` endpoint in
vite.config.ts (writes `out/shotrefs/<basename>.png` + a JSON sidecar with
the same fields, answers absolute paths), `window.__shotref()` for headless
tooling, and one sentence in STUDIO_SYSTEM so the sidebar Claude knows what
the token means. `SceneCanvas` turns on `preserveDrawingBuffer` for the
studio page only — `canvas.toDataURL` reads black without it; the viewer
and the Remotion render path stay unchanged.

Fixed alongside, because it is the first half of the same workflow — you
cannot hand over a framing you cannot fly to:

- 8.55's `CameraRig` never published its look-at, so `● Camera` mid-shot
  adopted the static `debugTarget` (the house) as the orbit pivot and yanked
  the view off the sky framing you clicked on. It now calls
  `publishSceneLookAt` every frame it drives, like the act6b rigs and the
  World already did.
- **The orbit pivot is now distance-capped** (`PIVOT_MAX_FRAC` in
  DebugCamera.tsx). Publishing the look-at fixed the direction and created a
  worse problem: OrbitControls scales drag, dolly and pan by the pivot
  distance, and a rig aiming at the sky publishes one 5,130 units away. A
  measured 60-pixel flick moved the camera **410 units** — out of a village
  200 across — so the debug camera was unusable in exactly the shot people
  most want to reframe. The direction still comes from the rig; only the
  distance is capped, at `max(60, far × 0.005)` — `far` being the one number
  every scene sets for its own scale. Same flick now moves 43 units. The
  dolly leash moved to `far × 0.05` for the same reason: it used to be
  derived from the (now near) pivot, which would have fenced you in.
