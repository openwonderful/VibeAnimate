# features_1 — from "a film with an editor" to a platform

A todo list, in the order the items were called out, with enough design
under each one that the work can start without another conversation.
Everything here is about the studio worktree (`/srv/work/code_animation-studio`,
branch `studio`), which is also what the public repo
(`github.com/FutureAIProject/VibeAnimate`) is a snapshot of.

Legend: `[ ]` todo · `[~]` partly there already · `[?]` unverified claim ·
**explore** = spike it, keep it detachable, it may be cut.

Files this list keeps pointing at:

| what | where |
|---|---|
| the films | `src/studio/films.ts` (flat `FILMS[]`: master, three alt-audio cuts, story, story-anime) |
| the Scenebuilder | `src/studio/panels/TimelinePanel.tsx` (+ `TrackHeaders.tsx`, `tracks.tsx`, `CameraLane.tsx`) |
| the Ingredients registry | `src/studio/ingredients/registry.tsx` |
| Blender mode | `src/studio/editable/` (`Editable.tsx`, `store.ts`, `commands.ts`, `ManipulatorLayer.tsx`), `src/studio/panels/Outliner.tsx`, `ObjectStrip.tsx` |
| the Claude sidebar | `src/studio/panels/TerminalPanel.tsx`, `terminalSession.ts`, `src/studio/shotref.ts`, `/__studio/pty` + `/__studio/agent` + `/__studio/shotref` in `vite.config.ts` |
| worlds | `src/studio/worlds/types.ts` (`WorldDef`, anchors, lighting presets, regions) |
| rendering | `src/studio/panels/RenderMenu.tsx`, `/__studio/jobs`, `scripts/render-fast.mjs` |
| scaffolding + validation | `scripts/new-shot.mjs`, `scripts/doctor.mjs` |
| viewport economy | `src/studio/editable/FrameGovernor.tsx` (demand rendering, adaptive DPR, perf store) |

---

## 1. README — lead with the studio, then the film; say how this differs from Remotion

Applies to the public README (`VibeAnimate/README.md`) first, then this
repo's `README.md` so they stop diverging.

- [ ] **Reorder**: title + one-paragraph pitch for the *platform* → studio
      walkthrough (the six `docs/studio/shots/*.jpg`) → "The first film: Body
      to Body" (the 13 stills) → "The second: The Lantern Keeper" → rendering
      → running it → license/credits. Right now the film comes first because
      it was written as a film repo with a studio section bolted on.
- [ ] **Add "How this differs from Remotion"** as its own section, near the
      top. Be fair to Remotion — we *use* it. Draft of the argument:

  > **Remotion is the render backend here, not the product.** Every manifest
  > scene auto-registers as a Remotion composition (`src/remotion/Root.tsx`)
  > and the final mp4 comes out of `remotion render`. What Remotion gives
  > you: React → frame-exact video, `<Sequence>` composition, and Remotion
  > Studio, which previews compositions and lets you tweak *props*. What it
  > deliberately does not give you, and what Flow Studio adds on top:
  >
  > | | Remotion / Remotion Studio | Flow Studio |
  > |---|---|---|
  > | the cut | code only (`<Sequence from=…>`) — Studio's timeline is a viewer | an NLE-style Scenebuilder: drag-trim, ripple, reorder, snap, J/K/L, exports the `timeline.ts` lines (paste-only for the hand-commented master) |
  > | 3D | you bring three.js yourself | persistent **worlds** (one environment, many shots), an Outliner, a transform gizmo, `@object` commands — Blender mode |
  > | reuse | components | an **Ingredients** registry: characters/props/environments/fx declared once, live-previewed, referenced everywhere |
  > | the author | you | **Claude Code in the sidebar**, with shot refs (`⌖` = camera pose + clock + PNG handed to the model as one token) |
  > | the clock | frame/fps | one anim clock shared by live playback, `?t=` scrubbing, CSS keyframes and the render — and a lyric lane on top of it |
  > | render pipeline | one `remotion render` | `render-fast`: per-slot segment cache, parallel Chrome shards on Vulkan, stream-copy stitch, song mux; a review server that seeks |
  > | what a "scene" is | a composition | a manifest entry that is *also* a URL, a nav item, a screenshot target, a sweep target and a composition |
  >
  > Also worth one line: Remotion's license is free for individuals and
  > small teams and paid above that; everything of ours is MIT, source only.

- [ ] Keep the "TBA — coming soon" line for the film links until the master
      is published.

## 2. Projects — a level above the films (the DaVinci model)

Today `FILMS[]` is flat and the film switcher is a row of chips *inside the
Scenebuilder*. Body to Body's four films and the Lantern Keeper's two sit
side by side as if they were cuts of one thing. They are not.

- [ ] **Project manager as the landing page.** `?app=studio` with no project
      → a grid of project cards (poster still, name, film count, last
      opened), like DaVinci's Project Manager. Click → `?app=studio&project=<id>`.
      Deep links that name a film (`&film=…`) still work and resolve to the
      owning project.
- [ ] **Data model** — new `src/studio/projects.ts`:
      ```ts
      type Project = {
        id: 'body-to-body' | 'lantern-keeper' | string
        name: string
        poster: string                // a still under docs/ or out/
        films: FilmId[]               // the FILMS this project owns
        sceneGroups: string[]         // manifest `group`s that belong to it ('Act 1'…'Act 8' vs 'Studio')
        worlds?: string[]             // WorldDef ids (LanternValley → lantern-keeper)
        ingredients?: 'all' | string[] // registry ids visible in this project's browser
        sourceRoots: string[]         // ['src/scenes', 'src/remotion'] vs ['src/studio/story', 'src/studio/worlds']
        audio?: string; lyrics?: string  // defaults films can inherit
      }
      ```
      Two entries to start: **Body to Body** (master, arirang, arirang-bed) and **The Lantern Keeper** (story, story-anime).
      Nothing about a scene file changes; the project is a *view* over the
      manifest (`group` is already the natural key — the story scenes are
      `group: 'Studio'`).
- [ ] **Everything scopes to the open project**: the ShotList, the
      Storyboard, the Ingredients browser (`ingredients` filter), the film
      picker, the Render menu's composition list, `new-shot.mjs --project`
      (chooses the dir + group), and the Claude sidebar's system prompt
      (`/__studio/agent` already appends "the editor is showing scene X";
      add "in project Y, whose sources live under Z").
- [ ] **Film picker moves to the TopBar** as a dropdown next to the project
      name (breadcrumb: `Body to Body ▸ Arirang bed ▸ 8.55`). The
      chip row leaves the Scenebuilder (see §3).
- [ ] `scripts/doctor.mjs` learns projects: every film belongs to exactly
      one project, every manifest group is claimed by one project, warn on
      orphans.
- [ ] Per-project prefs key (`flowstudio.<project>.…`) so the Lantern
      Keeper's last playhead doesn't land you at 3:00 of Body to Body.

## 3. Scenebuilder — one line, and scenes that contain scenes

The bar is thick because it stacks ruler + lyric lane + FX lane + a tall
video track + audio (`lanes[]` in `TimelinePanel.tsx`, ~243–260). The
user's ask: it should read as **one line** by default, and the
hierarchy (film → act → shot → components) should be *navigated*, not
flattened into 25 clips.

- [ ] **Collapsed by default: a single 28 px clip lane.** Lyric words become
      tick labels on the ruler (they are cue *times*, the ruler already has
      them), the waveform is drawn as the clip background, FX overlays are
      a 3 px stripe on the top edge of the clips they cover. `▾` on the
      track header expands to today's full stack. Remember the state in
      prefs. The film chips are gone from this panel (they moved to the
      TopBar, §2).
- [ ] **Compound clips (a scene that contains a scene).** DaVinci's
      compound clip / timeline-in-timeline, in our terms:
      - `TimelineItem` gets an optional `children?: TimelineItem[]` (or a
        `ref: FilmId` to an entire sub-timeline). The act rows in FILM.md are
        exactly this: **Act 1–3** is one compound whose children are the
        flight windows `1.1 … 3.4` (already "windows into the same flight",
        so grouping them is honest), **Act 4** is `4.1 … 4.10`, **Act 8** is
        the one 48 s shot `8.55`.
      - The lane draws the *top level* (8–9 act clips). Double-click / `⏎`
        enters a compound: breadcrumb grows (`Body to Body ▸ Act 4`), the lane
        now shows the children on the same ruler, zoomed to the act's span.
        `⌫`/`Esc` goes up. Arrow keys ←/→ move between siblings; ↑/↓ change
        level. Same navigation the Claude context picker uses (§4).
      - Trim/ripple inside a compound is bounded by the compound's span;
        the compound's own trim ripples the film. The master's
        `timelineReadOnly` rule is unchanged: the Inspector *copies* the
        edited `timeline.ts` lines, it never writes them.
      - `timeline.ts` stays flat on disk for now; the grouping is
        declared once in `films.ts` (`acts: [{ title:'Act 4', keys:['4.1',…] }]`)
        and validated by `doctor.mjs` (every key in exactly one act, acts
        contiguous). Flattening = `items.flatMap(...)`, so Remotion and
        `render-fast` never see the hierarchy.
- [ ] **Third level: components inside a shot.** Entering a *shot* (not a
      compound) shows its registered `<Editable>` objects and its camera
      keys as sub-rows on the shot's span — the Outliner and the CameraLane,
      but as lanes. Read-only at first; it is the "see the components of a
      scene as clips" view the Claude picker wants (§4).
- [ ] Keep the lane height math in one place: `TrackHeaders.tsx` mirrors
      `lanes[]` by hand today ("the rows here mirror the lane stack's
      heights and margins exactly") — derive both from one array before
      adding a collapsed mode, or they will drift.

## 4. The Claude panel — referencing, navigation, and letting it make scenes

### 4a. `[?]` Does referencing work? Verify before building on it.

What is known (checked 2026-09-12): the dev server on :5174 answers,
`/__studio/shotref` is live (POST-only, guarded by the studio tab's token),
and `out/shotrefs/` already holds five png+json pairs from August — e.g.
`8.55@t51.83-…json` carries key, scene t, film t (193.832), frame 5814,
pose (pos/target/fov 62) and `orbit: true`. So the *capture* half has
worked. What nobody has confirmed is the other half: the token reaching
the sidebar prompt, and the model reading the PNG.

- [ ] **Test the shot-ref path end to end** on :5174 and write the result
      here: park the playhead on `8.55` t=11, press `⌖ ref` → expect a token
      like `[shotref 8.55 t=11.00 film=… cam=(…)->(…) fov=… pose=rig png=/abs/…png]`
      *and* a PNG+JSON pair under `out/shotrefs/`; press `⌖ → Claude` →
      expect the token typed onto the sidebar terminal's prompt, not
      submitted. Then send "describe this frame" and confirm the model
      actually `Read`s the PNG. Known soft spots from the code: the
      `⌖ → Claude` write goes through the pty as keystrokes into a
      full-screen TUI (see the `ObjectStrip.tsx` header on why that is
      fragile); the terminal must be `open` (`terminalSession.ts` status)
      or the paste is silently lost. Fix: buffer the token and flush on
      `open`, and show a toast either way.
- [ ] **Selection → context is already streamed** (`lastSelection` frame is
      resent on every reconnect). Confirm the model sees it (ask "what is
      selected?").

### 4b. A context picker: move up and down through acts, shots, components

The ask: *see and move up and down to choose between the acts, or the
components within a scene, each shown as a separate clip-ish thing*, and
whatever is chosen is what the prompt refers to.

- [ ] **`Context` strip above the terminal** (in `TerminalPanel.tsx`): a
      compact vertical list of cards, one per node of the current level of
      the same tree §3 navigates — `Film › Act › Shot › Component`. `↑/↓`
      moves the highlight, `→` descends (Act → its shots → a shot's
      `<Editable>`s and camera keys), `←` ascends. Each card is clip-shaped:
      a thumbnail (the storyboard already renders live thumbs — reuse
      `thumbs.ts`), the key, the span, and for components the `@id` glyph.
- [ ] **Choosing a card pins it as the reference**: the sidebar shows
      `ref: 4.7 (1:19.0–1:22.5)` and every `/__studio/agent` call (and the
      pty's selection frame) carries it as `context`. Selecting a component
      also selects it in the viewport (same `selectEditable`), so the gizmo,
      the ObjectStrip's `@id` and the model all agree on what "it" is.
- [ ] **`⌖` respects the pinned ref**: the shot-ref PNG is taken of the
      pinned shot at its own clock, not whatever the stage happens to show.
- [ ] Multi-pin (Shift-click two shots: "make 4.7 match 4.6's grade") —
      later.

### 4c. The agent creates new scenes, and says so

- [ ] **A `creating scene …` status line** in the sidebar whenever the
      harness is used to scaffold. Mechanism: `scripts/new-shot.mjs` posts
      to `/__studio/jobs` (or a tiny `/__studio/events`) — `{kind:'scene',
      key, phase:'creating'|'registered'|'failed'}` — and the panel renders
      the last event as a pill. Vite's HMR already re-reads the manifest,
      so the new key appears in the ShotList on `registered`; the pill is
      the bit that was missing.
- [ ] **Teach the model the one true way**: the `STUDIO_SYSTEM` prompt in
      `vite.config.ts` says *always* create scenes via
      `node scripts/new-shot.mjs --key … --template world|three|dom --register`
      (never by hand), and to run `npm run doctor` after. Add the same rule
      to `CLAUDE.md`.
- [ ] **A Claude Code hook** (`.claude/settings.json`, `PostToolUse` on
      `Write|Edit` matching `src/scenes/**`) that runs `doctor.mjs` and
      feeds errors back to the model. This is the harness enforcing the
      contract, and it is the same lever §5 uses.
- [ ] The scaffolded file should already carry an `<Editable>` for its
      protagonist and a `WorldMount` for the project's world when
      `--template world`, so a new scene is *born* inspectable.

## 5. Objects: enforce "a character is one object", show the hierarchy like Blender

The gap: `<Editable>` is opt-in. A scene written as loose meshes never
reaches the Outliner or the Ingredients browser, and nothing complains.

- [ ] **`defineIngredient()`** — a typed factory in `registry.tsx` that
      returns `{ Component, Preview, meta }` and *is* the registry entry:
      ```ts
      export const Keeper = defineIngredient({
        id: 'char.keeper', name: 'Lantern Keeper', category: 'character',
        sourcePath: import.meta.url, tags: [...],
        Component: ({ pose }) => <group>…</group>,   // wrapped in <Editable> for you
        Preview: () => <…self-lit…/>,
      })
      ```
      The registry becomes `import.meta.glob('./ingredients/**/*.tsx')` +
      anything under `src/scenes/characters/**` that calls `defineIngredient`,
      so declaring an ingredient anywhere registers it — no "append ONE
      entry below" step to forget.
- [ ] **Runtime detection of the unregistered**: the Outliner traverses
      `window.__scene` (FlightProbe publishes it) and lists every `Mesh` /
      `Points` / `Light` whose ancestors include no `Editable` group, under
      an **"Unregistered (n)"** section, dimmed, with a `wrap` action that
      copies a `<Editable id="…" kind="…">` snippet. Zero is the goal; the
      count is the nag.
- [ ] **Static enforcement in `doctor.mjs`**: for every scene file,
      `character`/`prop`-shaped JSX (a `<group>` with a `name=` or a
      `<GLBModel>` / `<GoldFigure>` / any registered ingredient) must sit
      inside an `<Editable>` or be an ingredient itself. Warning first,
      error once the existing scenes are clean. `lint` runs it in CI.
- [ ] **The hook from §4c** makes it bite for the agent: edits to
      `src/scenes/**` that add unregistered actors come back with the
      doctor's message, so the model wraps them before it reports done.
- [ ] **Hierarchy + collections (Blender's outliner)**:
      - `<Editable>` nesting is already a `<group>` tree; the `store.ts`
        registers flat. Record `parentId` at register time (walk up
        `obj.parent` for the nearest registered ancestor) and render the
        Outliner as a **tree** with expand/collapse.
      - `<Collection name="villagers">` — a non-transform grouping node
        (Blender collections are not objects), so twelve lanterns can be
        hidden/selected/isolated as one row without changing their
        transforms. Visibility toggles cascade.
      - Outliner filters by `kind` (☻ ◈ ⛰ ☀ ✧) and by text; **isolate**
        (`/` like Blender's local view) hides everything else.
      - Drag-to-reparent writes nothing; it produces the JSX diff the
        Inspector already exports ("non-destructive with copy JSX").
- [ ] Ingredients browser: an ingredient card shows **where it is used**
      (scenes that import it — a static grep, cached by `doctor.mjs`), so
      "one character, holistically" is visible: the same Keeper, every shot.

## 6. **explore** — drawing paths in 3D (camera, or a character's movement)

Keep it in `src/studio/lab/paths/` behind a `?lab=paths` flag with **one**
touchpoint in the real code (an optional `path` binding on `<Editable>` /
the camera). If it is cut, delete the directory.

What exists to build on: `CatmullRomCurve3`-style keys in `flight.ts`
(position, look-at, fov over time), the `CameraLane` drawing those keys as
diamonds on the film ruler, `createScene({ cameraMoves })`, the gizmo from
Blender mode, and `WorldDef.anchors` (named points of interest).

- [ ] **A `Path` object**: an ordered list of anchors `{pos, t?, fov?, lookAt?}`
      → `THREE.CatmullRomCurve3` (centripetal, so it doesn't overshoot),
      drawn as a `<Line>` with the anchors as small draggable handles. The
      gizmo already moves an `Editable`; an anchor is just an `Editable`
      with `kind:'anchor'`, so dragging works on day one.
- [ ] **Three ways to lay it down** (try all three, keep the one that feels
      right):
      1. **Click-to-place**: raycast onto the ground / any surface / a
         chosen height plane (`H` cycles the plane height), one anchor per
         click, `⏎` closes the path.
      2. **Sketch**: hold the mouse and draw a stroke in screen space; it is
         projected onto the plane at the *current* depth (the point under
         the cursor at stroke start), resampled (Douglas-Peucker) into a
         handful of anchors. Fast, then tidy with the gizmo.
      3. **Motion sketch** (After Effects' name for it): press record, play
         the film, drag the object in real time — the stroke *is* the timing
         (anchors get `t`). Best for "he wanders over there while she talks".
- [ ] **Time mapping**: a path without `t`s is even-speed over the clip;
      with `t`s it is keyframed; a curve editor is out of scope — offer
      `ease` presets and per-anchor `hold`. Draw the anchors on the
      CameraLane / the component sub-row (§3) as diamonds, so retiming is
      the same drag as retiming a camera key.
- [ ] **Bindings**: `camera` (position path + optional separate look-at
      path — the flight's `pos`/`target` pairs are exactly this), or an
      `@id` (`<FollowPath id="keeper" path="keeper.walk" face="tangent"/>`).
      For characters, orientation = curve tangent, with a `turnLag`.
- [ ] **Ghosts**: onion-skin the bound object every N frames along the
      path (cheap: render the object's mesh at `curve.getPointAt(k/N)`
      with a 20 % opacity clone) so you can *see* the timing before playing.
- [ ] **Anchors snap to `WorldDef.anchors`** ("go to the well") and to
      other objects' positions; a path can start from an object's current
      position so "from wherever she is, to the door" is one click.
- [ ] **Export is JSX** (the rule everywhere in the studio): a
      `<Path id points={[…]} ts={[…]}/>` + the binding, copied to the
      clipboard, pasted into the scene by a person or by the model. Once it
      is in the code, the lab is not needed to play it back.
- [ ] Wilder ideas to keep in the notebook, not the roadmap: draw the path
      *in the storyboard thumbnail* and lift it into 3D; let the model
      propose a path from a sentence ("circle her slowly, end on her face")
      by emitting anchors in world space, which the picker (§4b) then hands
      to the viewport to draw; VR-style hand-held camera recorded from a
      phone's gyro.

## 7. **explore** — live AI render (depth → turbo model), then an offline hi-fi pass

The ask: press play and see the *stylised* frame — the render and its
depth map pushed through a fast image model on the local GPU, live, with a
prompt — and later re-run the same thing through a bigger local or online
model for the real output.

### 7·0 Status (built 2026-09-13): the live path WORKS, end to end

What exists now, all uncommitted on the `studio` branch:

| piece | where |
|---|---|
| venv + models | `scripts/live-render/setup.sh` → `.venv-live/` (torch 2.11 cu128, diffusers); SD-Turbo + `thibaud/controlnet-sd21-depth-diffusers` + TAESD in the HF cache |
| the model | `scripts/live-render/pipeline.py` — `load()` / `generate()`: depth-ControlNet img2img, guidance 0, fixed seed, tiny VAE, cached prompt embeddings, previous-output blend |
| the server | `scripts/live-render/server.py` (`npm run live`), WebSocket on :8765, one frame in flight, same-host origin check |
| the bench | `scripts/live-render/bench.py` (`npm run live:bench`) |
| viewport capture | `src/studio/live/LiveCapture.tsx` — colour off the drawing buffer, depth from a second render with `MeshDepthMaterial` (RGBA packing, r183 unpack), log-percentile normalisation, non-occluding planes skipped |
| client + overlay | `src/studio/live/store.ts`, `LiveOverlay.tsx` — `✦ live` chip in the stage header, the AI frame over the picture, A/B wipe, prompt box, strength / depth / hold knobs, status chip |
| on-demand start | `studioLive()` in `vite.config.ts` — `/__studio/live` GET status + log tail, POST start |
| prefs | `liveRender`, `livePrompt`, `liveNegative`, `liveStrength`, `liveControl`, `liveBlend`, `liveWipe` in `state/prefs.ts` |
| proof | `out/screenshots/live/{3.2,8.55,1.1}-{stage,depth,ai}.*` — stage with the overlay on, the depth map, the raw AI frame |

Measured on this box (RTX 3090, 512×288, 2 steps × strength 0.5 = one real step):

| model | depth control | ms/frame | fps | peak VRAM |
|---|---|---|---|---|
| sd-turbo, real VAE, prompt re-encoded per frame | no | 93 | 10.7 | 2.8 GB |
| sd-turbo, real VAE, prompt re-encoded per frame | yes | 106 | 9.4 | 3.5 GB |
| **sd-turbo, TAESD, cached embeds (what runs now)** | no | 37 | 27 | 2.3 GB |
| **sd-turbo, TAESD, cached embeds (what runs now)** | yes | 51 | 20 | 3.0 GB |

In the studio (headless Chrome, GPU shared with the viewport): 10–15 fps
on a parked frame, ~9 fps while the flight plays. The remaining gap to the
bench is the browser side (drawImage + JPEG + readback + socket), not the
model.

Three things learned building it, so nobody re-learns them:
- three r183's `packDepthToRGBA` puts the MOST significant byte in R and
  the unpack factors apply to 0..1 floats — reading bytes with the old
  `(1/256³, 1/256², 1/256, 1)` order gives striped garbage, and the model
  then hallucinates buildings and wheat fields from it.
- Depth must skip anything with `depthWrite: false` or near-zero opacity:
  1.1's glow plane became a wall in the depth map and a hanok in the AI
  frame.
- `canvas.toBlob` starves while a heavy scene plays (0.7 fps measured);
  `toDataURL` is synchronous and costs ~2 ms at 512×288.

Still open from the list below: SDXL-Turbo comparison (weights not
downloaded), Style ingredients, flow-warped coherence, and all of §7c.

### 7a. Is it feasible on this box? Yes.

| | |
|---|---|
| GPU | NVIDIA RTX 3090, 24 GB (driver 580.x, CUDA 13-class) — Chrome's Vulkan WebGL already runs on it |
| Python | `/usr/bin/python3`, **no torch / diffusers installed** — needs a venv (~6 GB) |
| Weights on disk | only HTDemucs; SD-Turbo fp16 ≈ 2.5 GB, SDXL-Turbo ≈ 7 GB, a depth ControlNet ≈ 0.7–2.5 GB |
| Disk | 288 GB free on `/` |

Published numbers, to set expectations (a 3090 is roughly half a 4090):
SD-Turbo at 512², 1 step ≈ 30–50 ms/frame in plain diffusers, 15–25 ms
with `torch.compile`/TensorRT (StreamDiffusion reaches ~90 fps txt2img on a
4090). A depth ControlNet adds ~50–80 % per step. SDXL-Turbo at 512² is
~3–4× slower. So the honest live target is **10–20 fps at 512×288 with
depth control on SD-Turbo**, ~30 fps with img2img only, sharing the GPU
with Chrome's viewport. That is a *preview*, which is the point.

### 7b. Architecture

```
R3F viewport ──(every Nth frame)──▶ color RT 512×288 + linear depth RT
        │                                   │ readPixels → JPEG + 16-bit PNG
        │                                   ▼
        │                     WebSocket  ws://localhost:8765  (binary frames)
        │                                   │
        │                    scripts/live-render/server.py  (torch + diffusers)
        │                      SD-Turbo img2img + ControlNet-depth, fixed seed,
        │                      prompt from the Style ingredient / a prompt box
        │                                   │ JPEG back, tagged with the frame id
        ▼                                   ▼
   stage shows the raw render      <LiveRenderOverlay/> draws the AI frame on top
   (A/B wipe, or side by side)      1–2 frames behind, dropped frames tolerated
```

- [x] **Depth from the viewport.** Render the scene a second time with
      `scene.overrideMaterial = new MeshDepthMaterial({ depthPacking: RGBADepthPacking })`
      into a small `WebGLRenderTarget` (or use drei's `useFBO({ depth: true })`
      and read the depth texture). Linearise with the camera's near/far and
      normalise to the *shot's* depth range (the flight's `far` is 24 000;
      normalising to that turns every close-up into a flat white). Additive
      point clouds (stars, crowd, souls) have no depth — render them into the
      colour pass only and let the depth read as "far"; that is what a depth
      ControlNet expects of a sky anyway. Toon/`<ToonSwap>` scenes work
      unchanged.
- [x] **A `live` toggle in the ViewportPanel** (next to the Blender-mode
      toggle): starts the server if it is not up (`/__studio/jobs` can own
      it as a long-running job so the console is its log sink), opens the
      socket, and shows a status chip (`model · fps · lag`). Off = nothing
      mounted, zero cost — the same discipline `FrameGovernor` has.
- [x] **The model server** (`scripts/live-render/server.py`, own venv under
      `.venv-live/`, created by `scripts/live-render/setup.sh`):
      - Start with **SD-Turbo (2.1-based) + a 2.1 depth ControlNet**, img2img
        strength ~0.4–0.6, 1–2 steps, `guidance 0`, fp16, channels-last,
        fixed seed and a fixed noise tensor per session (biggest single
        flicker reduction).
      - Second candidate: **SDXL-Turbo + `controlnet-depth-sdxl`** — better
        image, ~3× the cost; useful at 8–10 fps.
      - Optional: StreamDiffusion (batched denoising, RCFG, similarity
        filter that skips near-identical frames) — try it only if plain
        diffusers is not enough; it is a heavier dependency.
      - Protocol: `{id, w, h, prompt, negative, strength, seed}` header +
        JPEG + PNG; reply `{id, ms}` + JPEG. One in-flight frame; the browser
        drops frames while one is out, so the pipeline never queues.
- [~] **Prompting is an ingredient.** (a prompt box on the overlay exists; the Style ingredient does not yet) The registry already has
      `category: 'style'`. A Style ingredient carries `prompt`, `negative`,
      `strength`, optional LoRA path; a scene (or a project, §2) picks one;
      the Inspector shows a prompt box that edits the *live* copy. That
      keeps "the look" declared once and reused, same as characters.
- [~] **Temporal coherence, in order of cost** (fixed seed and the previous-output blend are in; the rest is not): fixed seed/noise → feed the
      *previous AI output* blended 30 % into the next init image (Deforum's
      trick; smooths, also smears — keep the slider) → StreamDiffusion's
      similarity filter → optical-flow warp of the previous output (RAFT)
      before blending — that last one is the offline pass's job (7c), not
      the live one.
- [ ] **Latency budget**: the overlay runs 1–2 frames behind the stage.
      Either accept it (a preview), or let `FrameGovernor` hold playback at
      the model's fps when `live` is on ("locked to render") — expose both.
- [x] **Measure before designing further**: a `scripts/live-render/bench.py`
      that runs 100 frames of a `8.55` still at 512×288 through each
      candidate and prints ms/frame with and without ControlNet. The
      decision between SD-Turbo and SDXL-Turbo is that table, nothing else.

### 7c. The offline hi-fi pass (same inputs, bigger model, later)

- [ ] **"Render with AI" in the RenderMenu**, next to "render this clip".
      Inputs already exist: `render-fast` writes per-slot video-only
      segments; add a `--depth` mode that renders the same slot with the
      override material (a `?depth=1` query the SceneShell honours) so every
      segment has a `<key>@<from>+<dur>.depth.mp4` twin. Both go into the
      job.
- [ ] **Backends, pick per job**:
      - *local image model*: SDXL + depth ControlNet, 20–30 steps, previous
        frame flow-warped and blended, upscaled to the film's size — slow
        (seconds a frame, hours a film) but free and reproducible;
      - *local video model*: a control-conditioned video model driven by
        the depth sequence (the Wan 2.x VACE / Fun-Control family, or
        Stable Video Diffusion with a depth adapter) for real temporal
        coherence, in clips of a few seconds with overlap;
      - *online*: a video-to-video API (Runway / Luma / Kling class) fed
        the raw render + prompt, one call per segment.
      The job spec is the same JSON for all three: `{segments, style,
      backend, size, fps}`; the backends are adapters under
      `scripts/live-render/backends/`.
- [ ] Output lands in `out/renders/` and is stitched + song-muxed by the
      same code path as a normal master, so the review server (`:8090`)
      serves it and the VLC link works unchanged.
- [ ] Non-goals for the spike: training, LoRA baking, lip-sync, anything
      that needs the raw render to change. The raw film stays the source
      of truth; the AI pass is a *grade* you can turn off.

### 7d. Order

1. ~~`bench.py` numbers on the 3090~~ — done, table in §7·0.
2. ~~Depth RT + readback in the viewport, checked by eye on 3.2 and 8.55~~ — done (`window.__liveDepth()`).
3. ~~Server + overlay, SD-Turbo, one prompt, fixed seed. Play 1.1 live.~~ — done.
4. Style ingredient (the prompt box exists). Then the remaining coherence knobs.
5. Offline `--depth` segments + the local-image backend. Only then look at
   video models / online APIs.

---

## Suggested order of everything above

1. §4a verify shot refs (an afternoon; everything in §4 stands on it).
2. §2 projects + §3 collapsed one-line Scenebuilder + TopBar film picker
   (the visible restructure; the README screenshots get retaken after).
3. §1 README (studio-first, Remotion section) — after 2, so the pictures
   show the new layout.
4. §5 `defineIngredient` + doctor rule + hook + Outliner tree.
5. §4b context picker, §4c scene-creation status (they reuse §3's tree).
6. §7 live render spike (7d order), in parallel with 4–5 since it is a
   separate process and a lab module.
7. §6 path drawing, last — it is the most speculative and the most
   detachable.
