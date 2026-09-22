# Flow Studio — Product Requirements Document

> Living document. Refreshed at every hourly iteration wake-up with new
> research findings. Last refresh: 2026-08-06 (initial).

## 1. Background & research

### 1.1 What Google Flow gets right (primary inspiration)

Google Flow (built on Veo/Imagen/Gemini) is an "AI filmmaking tool". Its
product shape, from published material:

- **Scenebuilder** — the differentiator vs. plain text-to-video: a
  timeline-based editor where generated clips are arranged, sequenced,
  extended ("reveal more of the action / transition to what happens
  next"), and connected into a coherent scene or film, with continuous
  motion and consistent characters across cuts.
- **Ingredients** — reusable visual assets (characters, objects, styles)
  locked into a project; every generated clip inherits them, which is how
  Flow maintains cross-shot visual consistency. "Ingredients to Video"
  uses multiple references to control characters/objects/style.
- **Camera controls** — direct control over camera motion, angles,
  perspectives per shot.
- **Asset management** — organizing ingredients and prompts at the
  project level.

**Translation to this repo:** we don't generate pixels with a model — we
generate *code* with Claude Code. The analogy holds exactly:
prompt→clip becomes prompt→scene-component; Ingredients become a typed
asset/character registry; Scenebuilder becomes a visual timeline over the
existing Remotion master timeline; camera controls already exist
(CameraMove/DebugCamera) and get surfaced in the editor UI.

### 1.2 What pro tools contribute

- **After Effects**: layered timeline with tracks, per-layer in/out
  points, scrubbing, RAM-preview mentality → our timeline editor +
  deterministic anim clock (already present) are the equivalent.
- **Blender/Maya**: persistent 3D scenes (a *world* exists independently
  of any camera), cameras as first-class scene objects, material/shader
  editors, and an asset browser with linked libraries → our World system,
  shot-as-camera-setup, toon material library, and Ingredient browser.
- **Blender specifically**: headless CLI rendering (`blender -b -P
  script.py`) makes it automatable by an agent — this is backend B.

### 1.3 Current repo reality (what we build on)

- React 19 + TS + Vite 8 + react-three-fiber + Remotion 4.
- `src/scenes/manifest.ts` = single source of truth for scenes; viewer,
  tooling (`shot.mjs`, `sweep.mjs`), and Remotion compositions derive
  from it.
- Deterministic global anim clock (`useAnimTime`) with URL/CDP/scrubber
  control; THREE.Clock lock; camera move tooling.
- Master timeline `src/remotion/timeline.ts` sequences acts per
  SCRIPT.md; `render:fast` segment cache.
- Weakness: scenes duplicate similar sets (same location rebuilt per
  act); no shared world/asset reuse; no visual editor over the timeline;
  no stylized shading; everything renders everywhere (no culling
  strategy).

## 2. Product definition

**Flow Studio** is a code-first animation studio in the browser. A
project = manifest of scenes + timeline + ingredient registry + worlds.
Claude Code is the "generator"; the studio UI is the human's monitor and
editing surface.

### 2.1 Personas

- **The director (human)**: reviews shots visually, scrubs the timeline,
  tweaks sequencing/camera, asks the agent for changes.
- **The agent (Claude Code)**: authors scenes/assets/worlds as code; needs
  scaffolding that makes a new shot a ~1-file, ~1-manifest-line change,
  plus CLI tooling to verify its own work (screenshots, sweeps, renders).

### 2.2 Core features (requirements)

**F1. Studio shell (`?app=studio`)** — professional dark editor UI:
viewport (live scene preview), timeline panel, asset/ingredient browser,
shot list, inspector. Keyboard-first (space = play, arrows = step).
Must not disturb the plain scene viewer (`?act=`) or render pipeline.

**F2. Scenebuilder timeline** — visual track view of the master
timeline: one lane per track, clip blocks with titles/durations, click
to jump viewer to that shot at that local time, drag playhead to scrub
globally (drives the shared anim clock), zoom in/out. Read-only over
`timeline.ts` first; editing (reorder/trim) exports updated code.

**F3. Ingredients (asset & character registry)** — `src/studio/ingredients/`:
typed, self-contained R3F components (characters, props, environment
pieces, style presets) registered in an `ingredients.ts` manifest with id,
name, category, thumbnail-able preview scene, and default props. Scenes
reference ingredients by import; the browser panel previews each one
live. Character consistency = same component + same palette across shots.

**F4. Worlds** — `src/studio/worlds/`: a world = one component defining a
full 3D environment plus named **anchors** (points of interest). A shot =
`{world, camera A→B move, time-of-day/lighting preset, extra actors}`.
Multiple manifest scenes can mount the same world with different shot
configs. Performance requirement: the world wrapper culls region groups
outside the active shot's interest set (declarative `visibleRegions`),
so big worlds render only what the camera looks at.

**F5. Anime/toon shading** — a material library (`src/studio/materials/`)
implementing cel-banded lighting (gradient-mapped MeshToonMaterial +
custom ramps), inverted-hull outlines, rim lighting, and optional
halftone/posterize post pass. Must work in both live and Remotion render
modes. Shader-lab demo scene in the manifest.

**F6. Blender backend (option B)** — if Blender/bpy installs in this
environment: `blender/` directory with Python scene scripts mirroring the
studio concepts (world/shot/ingredient), headless render CLI
(`npm run render:blender -- <scene>`), output to `out/renders/blender/`.
If not installable: documented experiment + scripts runnable elsewhere.

**F7. Original story film** — a new, cohesive short story (own story
bible, beat sheet, look book) authored with F3/F4/F5 primitives,
sequenced on the timeline, rendered to mp4. Quality bar: "looks
amazing" — deliberate palette, composition, camera language.

**F8. Agent harness** — CLAUDE.md-documented recipes so that "add a shot
in world W with character C at anchor A" is a one-file change; sweep and
screenshot tooling keeps working for all new scenes.

### 2.3 Non-goals (this phase)

- No server/backend, no accounts, no real AI-video generation calls.
- No general-purpose node-graph compositor.
- No in-browser editing that writes files directly to disk (edits export
  copy-paste-ready code instead — the agent applies them).

## 3. Success metrics

See `GOAL.md` success criteria. Additionally each iteration must leave
`npm run build` + `npm run lint` green and be committed + pushed.

## 4. Iteration log

| # | When | What shipped |
|---|------|--------------|
| 1 | 2026-08-06 | Research (Google Flow model), GOAL/PRD/SPEC, hourly routine armed |
| 2 | 2026-08-06 | Flow Studio shell `?app=studio`: transport, ShotList, caged direct-mount viewport, Inspector |
| 3 | 2026-08-06 | Scenebuilder timeline: clips, ruler, zoom, scrub→clip-local seek, timing editor w/ code export |
| 4 | 2026-08-06 | Ingredients registry + AssetBrowser (7 assets: 4 new originals + wrappers), preview framing iterated |
| 5 | 2026-08-06 | World system + Lantern Valley pilot; 3 shots (dusk/night/dawn) w/ region culling; lighting iterated |
| 6 | 2026-08-06 | Toon library (ramps, ToonSwap, rim, outlines-with-composer, posterize) + lab.toon scene |
| 7 | 2026-08-06 | Blender headless backend verified end-to-end (Cycles 120-frame demo mp4 in blender/samples) |
| 8 | 2026-08-06 | "The Lantern Keeper" 60s story film: 6 shots, story bible, StoryFilm comps; staging iterated on screenshots |
| 9 | 2026-08-06 | Test pass: sweep 10/10 Studio scenes clean, StoryFilm720 render, per-shot screenshot fixes |
| 10 | 2026-08-06 | Docs (CLAUDE.md studio recipes, PRD log), LOC report (~4.7k lines added vs master) |

| 11 | 2026-08-06 | Multi-film Scenebuilder (FILMS registry, film switcher tabs, ?film= deep link); render:blender script; Lantern Keeper preview mp4 pipeline (shot.mjs frame-capture path — full Remotion render at 720p measured ~6.5h on SwiftShader, deferred to a GPU box) |

| 12 | 2026-08-06 (hourly wake 1) | Lint 396→0 errors (scoped compiler-rule policy + real fixes) |
| 13 | 2026-08-06 (hourly wake 1) | **Fixed Act 5.3 black frame on the master timeline** — camera was outside the room shell filming the wall's back face; plus latent GoldFigure-API break (custom skeleton silently fell back to walking loop) → stock seated pose. Diagnosed by in-scene bisection with debug-camera screenshots. |

### Research notes — render performance (wake 1)

- SwiftShader (Chromium's bundled software GL) is the bottleneck for both
  Remotion renders (~13s/frame @720p w/ post) and shot.mjs captures.
  [Mesa llvmpipe measured ~49% less CPU than SwiftShader on Linux Chromium](https://botbrowser.io/en/blog/mesa-llvmpipe-vs-swiftshader-chromium-linux/) —
  experiment: launch Chrome with system-Mesa GL instead of SwiftShader.
- [InstancedMesh](https://threejs.org/docs/pages/InstancedMesh.html) helps
  when many copies share one geometry (lantern line, mountain ring,
  crowd) but [hurts with many small-count instances](https://github.com/mrdoob/three.js/issues/30352);
  target only the ≥12-copy groups in Lantern Valley.
- Practical now: preview pipeline captures at 10fps/720p via shot.mjs
  (~3s/frame when the box is idle); full-quality renders should run on a
  GPU box (`--gl=angle-egl` already wired in scripts).

| 14 | 2026-08-06 (hourly wake 2) | **Fixed Act 5.4 black frames** (103–111s master slot) — same buried-camera + GoldFigure-skeleton-API bugs as 5.3; mirrored framing so the paired beats cut together |
| 15 | 2026-08-06 (hourly wake 2) | **Drag-trim editing in the Scenebuilder**: out-point trim handle (hit area ~3× visual, per editor-UX research), 0.5s snap, ripple mode keeping the timeline contiguous, modified/reset state, Inspector exports the full edited timeline array as paste-ready code |

### Research notes — timeline editing UX (wake 2)

- Trim handles need hit areas ≥2× their visual size ([img.ly on mobile
  timeline design](https://img.ly/blog/designing-a-timeline-for-mobile-video-editing/)) — implemented at 14px hit / 4px visual.
- [Ripple editing](https://clideo.com/resources/ripple-editing) (auto-close
  gaps so everything stays in sync) is the default professional trim
  behavior — implemented as a default-on toggle; the repo's timelines are
  contiguous by construction so ripple preserves that invariant.
- Snapping to frame/marker boundaries is expected ([Filmora timeline
  guide](https://filmora.wondershare.com/video-editing-tips/what-is-timeline-in-video-editing.html)) — implemented at 0.5s (master timeline granularity).

| 16 | 2026-08-06 (hourly wake 3) | **Anime-toon story variant `story.2-B`** — the Lantern Lane shot re-rendered through the toon stack (warm-shifted 4-stop shadow ramp, cool fresnel rim, ink outlines over bloom): full ink-outlined anime night-village look from the same world/actors/camera as the standard shot; S2 shell/actors refactored into shared exports |

### Research notes — anime NPR (wake 3)

- The signature anime-shadow move is **warm/hue-shifted shadow colors**,
  not darkened albedo ([Blender NPR in 5 concepts](https://medium.com/@emiliahoarfrost/blender-anime-styled-npr-in-5-concepts-6727fd9bb19f)) — implemented as an amber-leaning ramp in `story.2-B`.
- Genshin-style cel transitions use *moderate* hardness (~0.1 smoothing),
  ramp atlases, rim + edge highlights and separate face-shadow handling
  ([UE5 breakdown](https://80.lv/articles/breakdown-setting-up-a-genshin-impact-style-shader-in-unreal-engine-5), [Unity URP breakdown](https://adrianmendez.artstation.com/projects/wJZ4Gg)) —
  our MeshToonMaterial ramp is hard-banded; a smoothed-band ramp texture
  (2px gradient at each stop edge) is the natural next refinement.
- Full kits pair cel lighting with outline + anisotropic hair + outer
  shadow ([backlace shader](https://github.com/kleineluka/backlace)) — outline + rim + ramp is the sweet spot for our primitive-based figures.

| 17 | 2026-08-06 (wake 3, bonus) | SHOT_GL env override — Mesa llvmpipe capture path measured ~30% faster than SwiftShader, identical output |
| 18 | 2026-08-06 (hourly wake 4) | Soft-band toon ramps — `makeToonRamp(stops, softness)` renders 256px smoothstep-edged LinearFilter ramps (Genshin-class ~0.1 transition); applied to story.2-B |
| 19 | 2026-08-06 (hourly wake 4) | Blender anime sample — `blender/scenes/lantern_toon.py`: every diffuse material rebuilt via toon_material (ColorRamp bands), heavier Freestyle ink; validation still in blender/samples. Both backends now have comparable anime looks |

### Research notes — Blender NPR pipeline (wake 4)

- Cycles has the built-in [Toon BSDF](https://docs.blender.org/manual/en/latest/render/shader_nodes/shader/toon.html); EEVEE needs shader-node
  workarounds and is unreliable headless without a GPU — our Cycles-CPU
  backend is the right substrate for the anime look.
- [Freestyle](https://artisticrender.com/a-guide-to-blender-freestyle-rendering-with-eevee-and-cycles/) line sets (silhouette/crease/border) work in
  headless Cycles; lines-on-separate-layer compositing is Cycles-only.
- Grease-pencil line art is the richer alternative for hand-drawn-style
  strokes ([EEVEE toon + grease pencil intro](https://www.blendernation.com/2018/11/15/eevee-toon-shader-and-grease-pencil-introduction/)) — future option if
  backend B graduates from procedural sets to authored assets.

| 20 | 2026-08-06 (round 2) | Drag-to-reorder clips (ghost preview, contiguous re-pack) |
| 21 | 2026-08-06 (round 2) | Instanced world geometry — mountain ring + road scatter as 3 draw calls |
| 22 | 2026-08-06 (round 2) | Camera tooling (toggle + A/B shot panel + code export) inside the studio viewport |
| 23 | 2026-08-06 (round 2) | **The anime cut** — AnimeLook drop-in grade, 6 toon shots, third film in the switcher, StoryFilmAnime comps |
| 24 | 2026-08-06 (round 2) | preview-film.mjs — cached per-shot film previews on the Mesa path; npm run preview:film |
| 25 | 2026-08-06 (round 2) | fx.fireflies ingredient (round-sprite Points swarm) layered into story.3 / story.6 |
| 26 | 2026-08-06 (round 2) | Backend B anime film — 120-frame lantern_toon Cycles render (blender/samples/lantern_toon.mp4) |
| 28 | 2026-08-06 (round 2) | Docs: project README rewritten for Flow Studio; scripts/README gains SHOT_GL + preview-film sections |

| 33–35 | 2026-08-06 (round 3) | SPEC §12 audit; leaf-clock isolation; FILMS-driven comps; npm run doctor |
| 36–41 | 2026-08-06 (round 3) | Roadmap "do all": per-film audio + synthesized theme; undo/redo; overlay track + fx.letterbox; 19-test vitest suite; GLB ingredient kind; dev-server apply endpoint |
| 42 | 2026-08-06 (round 3) | Pro-editor verbs: blade/split with real in-points (offsetSec through both film factories, byte-identical render proof), ripple delete, duplicate |
| 43 | 2026-08-06 (round 3) | Embedded context-aware console: per-scene terminal tabs, context command chips (shot @t / sweep / render / preview / doctor / test), streamed exec with group-kill |
| 44 | 2026-08-07 (round 4) | Professional NLE re-skin: neutral near-black chrome, single steel-blue accent, muted lane colours, tighter radii — the chrome stops competing with the footage |
| 45 | 2026-08-07 (round 4) | **Blender mode, part 1 — viewport manipulation.** `<Editable>` object model + module store (scoped, non-destructive overrides), in-canvas ClickSelect/TransformControls/selection box, on-screen controls (tool column, N-panel with drag-scrub fields, Outliner, keys G/R/S · X/Y/Z · H · Tab), `copy JSX` export, `lab.manip` playground, `story.1` keeper adopted. Fixed the studio stage crop (scenes now size to the 16:9 cage, not the window). |
| 46 | 2026-08-07 (round 4) | **Blender mode, part 2 — the @entity terminal.** `@object` autocomplete over the live scene, a pure/tested command language (move/pos/rot/scale/hide/show/reset/info/code, degrees in, radians stored), block-based scrollback with live entity cards, `ls`; unknown verbs still fall through to the real shell. `window.__editables` + `shot.mjs --eval` for agent-driven captures. |
| 47 | 2026-08-07 (round 4) | **Performance governor.** Demand rendering while parked (invalidate on seek/pointer/gizmo), adaptive DPR 1.5→0.65 driven by an FPS EMA, peak-hold draw-call/triangle stats, viewport stats chip. |
| — | 2026-08-06 (round 3) | GitHub readiness: LICENSE (code-only MIT), CI workflow, real package metadata, PUBLISHING.md with rights-holder-media scrub plan |

(iterations append here)

## Sources

- [Introducing Flow: Google's AI filmmaking tool designed for Veo](https://blog.google/innovation-and-ai/products/google-flow-veo-ai-filmmaking-tool/)
- [5 tips for using Flow, Google's AI filmmaking tool](https://blog.google/innovation-and-ai/products/flow-video-tips/)
- [Bringing new Veo 3.1 updates into Flow to edit AI video](https://blog.google/innovation-and-ai/products/veo-updates-flow/)
- [Google Introduces Flow (No Film School)](https://nofilmschool.com/google-flow-ai-filmmaking-tool)
