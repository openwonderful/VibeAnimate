# BTS "Body to Body" Code Animation + Flow Studio

## Flow Studio (`?app=studio`)

The repo hosts **Flow Studio** — a Google Flow-style, code-first animation
studio layered over the scene system. Docs: `docs/studio/` (GOAL.md, PRD.md,
SPEC.md, STORY.md, and **ROADMAP.md — the current build queue**, read it before
starting studio work). Open `/?app=studio` (add `&tab=ingredients` to preselect
the asset browser). Keys: Space play/pause, ←/→ frame-step (Shift ×10),
J/K/L shuttle, Home to clip start.

- **Blender mode** (`src/studio/editable/`): wrap an actor in `<Editable
  id="keeper" name="…" kind="character">` (animate on an INNER group) and
  it becomes selectable in the viewport — transform gizmo, N-panel numeric
  fields, Outliner row, and `@keeper move y 0.5` in the console. Edits are
  scoped to the studio and non-destructive (`copy JSX` pastes the pose back
  into the scene); plain `?act=` pages and renders ignore them. Keys: G/R/S
  mode, X/Y/Z axis, Alt+G/R/S reset, H hide, Tab cycle, Esc deselect.
  Playground: `?act=lab.manip`. Tooling: `window.__editables`,
  `shot.mjs --eval "window.__editables.select('keeper')"`. Docs: SPEC §13.
- **Scenebuilder** (`src/studio/panels/TimelinePanel.tsx`): visual master
  timeline; click a clip to load its scene at its master offset; Inspector
  edits clip timing and emits regex-safe `timeline.ts` lines to paste back.
- **Shot refs** (`src/studio/shotref.ts`, SPEC §14): when a user message
  contains a `[shotref 8.55 t=38.00 film=3:00.00 f5400 cam=(…)->(…) fov=62
  pose=orbited png=/abs/path.png]` token, it is a framing they captured on
  the studio stage: Read the png, and treat the numbers as exact.
  `pose=orbited` = a hand-flown debug-camera view (a framing they WANT and
  the scene does not have); `pose=shot` = what the scene's rig renders at
  that t. `cam` is pos->target in the scene's WORLD units. A JSON sidecar
  sits next to the png. Captured with the ⌖ chips in the stage header AND in
  the Camera move panel (⌖ copy ref → clipboard; ⌖ → claude → the sidebar
  terminal's prompt); headless: `window.__shotref()`. If a framing note
  arrives WITHOUT a token — a bare screenshot — ask for one rather than
  reverse-engineering the pose from the picture; the sky is 87° of band and
  the search space is not worth the guesswork.
- **Ingredients** (`src/studio/ingredients/registry.tsx`): reusable
  characters/props/environments with live preview cards. Declare once,
  import everywhere — this is how cross-shot consistency works. Add one =
  component file exporting `<Name>` + `<Name>Preview`, then one registry entry.
- **Worlds** (`src/studio/worlds/`): a world is one persistent environment;
  a shot = camera move + lighting preset + `visibleRegions` (mount-level
  culling — unlisted regions never render). Recipe for a new shot in an
  existing world: one scene file calling `createScene` + `<WorldMount
  world={LANTERN_VALLEY} shot={{ lighting, visibleRegions, actors }} />`,
  plus one manifest line. Pilot world: `LanternValley` (anchors: gate,
  lane, bridge, shrine).
- **Toon/anime shading** (`src/studio/materials/`): `toonMaterial`,
  `<ToonSwap>` (cel-swap a whole scene), `applyRimLight`,
  `<ToonOutlineRenderer overlay>` (composes with EffectComposer),
  `Posterize`. Demo: `?act=lab.toon`.
- **Story film**: "The Lantern Keeper" (`story.1`–`story.6`, 60s), timeline
  in `src/studio/story/timeline.ts`, Remotion comps `StoryFilm`/`StoryFilm720`.
- **Blender backend** (`blender/`): headless bpy pipeline mirroring the same
  concepts — `node blender/render.mjs lantern_hill` (see blender/README.md).



Animated visual experience for BTS's "Body to Body" — three scenes transitioning from Korean traditional art to modern concert stage. Built with React 19 + TypeScript + Vite 8.

## Quick Start

```bash
npm run dev       # Start dev server
npm run build     # TypeScript check + production build
npm run lint      # ESLint
```

## Delivering an mp4 (ALWAYS do this)

Whenever a session produces an mp4 the user should see (a spotcheck, a
master, a preview clip), don't just send the file — ALSO make sure the scrub
server is running and give the links. It serves the newest mp4 in
`out/renders` with seeking, scene-chip navigation and frame stepping:

```bash
# is it up?  200 = yes, nothing to do (it follows the newest mp4 by itself)
curl -s -o /dev/null -w "%{http_code}" http://localhost:8090/
# if down:
setsid nohup node scripts/review.mjs --port 8090 >/tmp/review.log 2>&1 &
```

Then tell the user, every time: scrub page `http://<devbox>:8090/`,
seekable VLC `vlc http://<devbox>:8090/video`. For a one-off file
outside out/renders, pass its path: `node scripts/review.mjs <file> --port 8091`.
(`/spotcheck` — `.claude/skills/spotcheck/` — is the low-res render flow
that feeds this; `npm run render:spot` is the same thing for humans.)

## Scene Switching

URL query param: `?act=<key>` (`?scene=` is an accepted alias). `?act=film`
plays the **whole video** — every act in sequence off the master timeline,
with the song under it. Everything else is one scene: `?act=1`, `?act=3.2`,
`?act=8.55`, `?act=5.2-B`.

**Every scene is declared once in `src/scenes/manifest.ts`** — the viewer's
route map and navigator, the tooling's `--list`/sweep, and the Remotion
video compositions all derive from it. `?act=` with no key shows the
navigator, which lists every key there is.

**`FILM.md` is the cut sheet**: every scene in the film, what it is, which
lyric it stands on, what seconds it owns, and why the middle is cut the way
it is. Read it before retiming anything.

The acts:

| | |
|---|---|
| **1–3** (0:00–1:04.8) | One continuous take through one world (`src/scenes/actB/`) — see below |
| **4** (1:04.8–1:27) | The life between: a childhood in eight beats, ending on the pat |
| **5** (1:27–1:44.6) | Separation: the wave, the streets, two kitchens at the same dawn, and the first phone call home (`6.4`) |
| **6** (1:44.6–1:56.55) | The audition, then busking in the rain |
| **6B** (1:56.55–2:15.5) | The rise, and the grandmother (`src/scenes/act6b/`): the waves into cameras, the interview, then `6.85` — the death in the grey city apartment, the huddle, the stage from 0:20 with the trophy and colourless confetti, and the swap to the road, one unbroken piece |
| **7** (2:15.5–2:22) | The walk home (`7.4` — one piece where 7.1/7.2 used to be; both remain as scenes) |
| **8** (2:22–3:10) | Arirang and the finale, in one 48s shot (`8.55`) — opens on song 2:22 "Everybody like you". **Film time == song time everywhere**: the song is the untouched recording. (It was spliced for a while — 8s of silence at the death — which put the film 11.8s ahead of the song clock from 2:06.8 on. Any number that assumes that shift is stale; see FILM.md.) |

## Adding a new scene (one file + one manifest entry)

Create the scene with `createScene` — the SceneShell owns the container,
the Canvas (live R3F vs Remotion `ThreeCanvas`), the debug camera, and any
declared camera moves:

```tsx
// src/scenes/act5/MyScene.tsx
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { getAnimTime } from '../../hooks/useAnimTime'
import { createScene } from '../createScene'

function Pulse() {
  const ref = useRef<THREE.Mesh>(null)
  useFrame(() => {
    if (ref.current) ref.current.position.y = 1 + Math.sin(getAnimTime() * 2) * 0.4
  })
  return <mesh ref={ref}><boxGeometry /><meshStandardMaterial color="#D4A843" /></mesh>
}

export default createScene({
  background: '#0A1628',
  three: { camera: { position: [0, 2, 8], fov: 45 }, debugTarget: [0, 1, 0] },
  cameraMoves: [{ a: { pos: [0, 2, 8], target: [0, 1, 0] },
                  b: { pos: [4, 3, 5], target: [0, 1, 0] }, t0: 1, t1: 5 }],
}, function MyScene() {
  return (<><ambientLight intensity={0.4} /><directionalLight position={[3, 5, 2]} /><Pulse /></>)
})
```

Then add ONE line to `src/scenes/manifest.ts` (`SCENES`, keep the literal one-line shape — tooling regex-parses it):

```ts
{ key: '5.5', title: 'My Scene', group: 'Act 5', durationSec: 8, load: () => import('./act5/MyScene') },
```

Done. Without further edits the scene: appears in the nav, is served at
`?act=5.5`, scrubs/freezes with `?t=`/the scrubber/camera panel, is visible
to `shot.mjs`/`sweep.mjs`, and renders to video with
`npm run render:act -- 5.5`. DOM/SVG scenes: omit `three` and have the body
render its own full-viewport container (read time via `useAnimTime()`).
Scene variants (`-B`, `-C`, …) are just another file + manifest entry.
Existing scenes that mount their own R3F `<Canvas>` can instead swap the tag
for `<SceneCanvas>` (`src/scenes/SceneCanvas.tsx`) — same props, auto
DebugCamera live, Remotion canvas in render mode. All FullVideo-timeline
scenes are migrated; remaining variants are listed in `MIGRATION.md`.

## Rendering video (Remotion)

Every manifest entry is auto-registered as a Remotion composition
(`src/remotion/Root.tsx`; duration = `durationSec`, default 20s; key
sanitised: `3.2` → `3-2`). One shared clock drives everything: live mode
advances the anim-time store via rAF, render mode writes `frame/fps` into
the same store (`src/remotion/RemotionTimeDriver.tsx`) with the THREE.Clock
lock installed — so `useFrame(({clock}))`, `getAnimTime()`, `useAnimTime()`
and CSS keyframes all agree in both modes.

```bash
npm run render:act -- 3.2               # any scene key → out/renders/3.2.mp4
npm run render:full                     # FullVideo: the whole cut + audio
npm run render:fast -- --only 4.5       # master video from per-scene segment cache,
                                        # re-rendering only the named scene(s)
npm run render:fast -- --range 18:44    # just a chunk of the master timeline
```

**GL backend — this is the single biggest speed lever.** Everything defaults
to `--gl=vulkan` (ANGLE-over-Vulkan) whenever `/dev/dri/renderD128` exists,
which is the only backend that gets a *hardware* WebGL context in headless
Chrome here. Measured on 30 frames of 3.2: **7s vulkan / 37s angle-egl /
196s swangle**. `angle`/`angle-egl`/`egl` silently fall back to software or
fail to create a context — if a render suddenly crawls, check which GL it
picked (the render-fast banner prints it). Override with `$REMOTION_GL` (or
`--gl`); boxes with no GPU fall back to `swangle`.

**Concurrency is per-tab, and each tab pays for every WebGL canvas the scene
mounts.** DOM-heavy scenes love `--concurrency 4`; scenes that mount *two*
canvases do not. The retired `old-stage-to-mountains` mounts both the depth chain's canvas and
the stage canvas, so at concurrency 3–4 that is 6–8 live WebGL contexts plus the GPU
process, and once it starts evicting them the page falls back to software:
measured 263s at concurrency 4 on a good run, and **>2 hours** on a bad one,
for the same 14s segment. At `--concurrency 1` it is ~0.4 s/frame, steady.
Symptom to watch for: chrome renderer RES climbing past ~2 GB and a process
stuck in `D` state. If a segment suddenly takes an order of magnitude longer,
re-run it alone with `--only <key> --concurrency 1`.

**GPU contention can silently drop a subtree, and the blank check will not
catch it.** `render:fast` runs `--shards 4 × --concurrency 3` = twelve live
WebGL contexts. Under that pressure a segment can come back *rendering* —
correct camera, correct geometry, correct grade — with every
additively-blended point cloud simply missing. Measured on Act 3: the tree
scene's whole sky (`ascendedSky`) was absent for four seconds, and the same
composition at the same frames rendered perfectly at `--shards 1
--concurrency 1`. `segmentLooksBlank` only rejects SOLID WHITE (a full
context loss), so a segment missing its stars passes every check and caches.

Symptom: a stretch of the master that is dark and *empty* rather than dark
and detailed. Check with a per-frame luminance scan (count pixels > 0.3),
not by eye on a contact sheet — a 480px thumbnail of a night scene looks
plausible either way. Fix: `npm run render:fast -- --only <key> --shards 1
--concurrency 1`.

Iterating on the master video: use `render:fast` (scripts/render-fast.mjs) —
it renders each timeline slot as a cached video-only segment (parallel
browser processes), stitches with stream-copy and muxes the song. Segment
files are keyed `<key>@<from>+<duration>.mp4`, so retiming a slot in
`timeline.ts` invalidates its cache automatically. Env: `$CHROME_BIN`,
`$REMOTION_GL`.

The master timeline (`src/remotion/timeline.ts`) sequences scenes per the
cut sheet in `FILM.md`; each scene's local time starts at 0 inside its
`<Sequence>`. It throws at module load on an overlap, a gap, or a total that
is not 190s (the song, untouched — `public/audio/body-to-body.mp3` IS the
original recording; see FILM.md "The death, and the grandmother").
`?act=film` is the same timeline played live in the browser.

## Acts 1–3 — one world, one camera (`src/scenes/actB/`)

**The directory is still called `actB/`** — that was this act's name while
the scene-per-beat opening it replaced still existed alongside it. It is now
Acts 1, 2 and 3, and it is also the project's shared world module: acts 4,
5, 6, 7 and 8.55 import its valley, city, tree, glow points and layout
constants. Do not rename it casually.

Acts 1–3 are the opening as one take, 0:00–1:36: the lit farmhouse at
the end of a black road → mountains → city → stadium → inside the bowl → all
the way back out over the rice fields to the golden hour, the tree, the road
home and the table. There is no
crossfade and no portal anywhere in it, and no cut for the first 1:04 —
after which there are exactly TWO, to the pair resting under a tree and to
the table inside the house. (Tree → road home is NOT a cut any more: the
camera flies the distance sky-aimed — the pair is off frame, so the
time-lapse lie is avoided without one.) The cuts are deliberate: carrying
them seven kilometres in twelve seconds while their legs walked at 11 units
a second was a time-lapse, and a time-lapse is a worse lie than a cut. A key marked `cut`
starts a new segment and `flightPose` never interpolates across one. The range, the star field, the city, the stadium, its
46,000-strong crowd and the valley all exist in ONE three.js scene at
the same time, laid out along Z; the only thing that changes is where the
camera is.

- `flight.ts` — the whole shot: world layout constants and the camera
  keyframes, Catmull-Rom interpolated (position, look-at and fov), anchored
  to the vocals (punch through the stars at 0:07.24, wordmark at 0:13.05 and
  0:14.96, the facade fills frame on 0:18.65, over the rim on 0:20.31).
- `World.tsx` — assembles the world, drives fog/lights/grade, and switches
  subtrees off with `<Phased>` once the camera cannot see them.
- `sky.tsx` / `mountains.tsx` / `city.tsx` / `stadium.tsx` / `valley.tsx` —
  the five regions, laid out from z=-11,600 (the far fields) to z=+5,370
  (the stage).
- `valley.tsx` — the golden-hour road AND the walk home, in one piece of ground. That beat
  happens at z=-6,800, seven kilometres from anything; the pair then cover
  that ground during the twelve seconds the light is going out of the valley
  (`walkZ` in flight.ts jumps them while they are 20 px tall on a dark road,
  which is also where the child stops walking and gets carried), and the
  arrival plays at the house at z=-400. Built out of the retired road
  scenes' ACTUAL parts,
  not lookalikes: `GoldGlowFigure` in 3.1's hand-holding
  layout, the roadside set from `../act3/roadside`, the hanok from
  `../act3/hanok`, `StylizedWater` on the near paddies, `GradientEnvironment`
  for the bounce. All of it is authored in 3.1's units and wrapped in a group
  at `S = 20`. Everything past the near band is instanced with cells that
  grow with distance — 16× the field area cannot be meshes.
- `ascendedSky.tsx` — what the sky has become when they look up at 1:12:
  Act 8.55's river of souls, rebuilt out of this act's own glow points rather
  than imported. 8.55's sky is a function of 8.55's clock (its souls leave
  the ground on a per-figure schedule baked into `generateWorld()`), and
  mounting it here would mean a second timeline under this one.
- `points.ts` + `GlowPoints.tsx` — every population of lights (stars, far
  city, traffic, crowd) is one seeded, additively-blended draw call.

`1`, `1.1`–`1.4`, `2`, `2.1`–`2.2`, `3`, `3.1`–`3.4` are all **windows into
the same flight**, not separate shots: `makeFlightScene(offset)` reads the
initial camera pose from `flightPose()`, so playing them back to back is
frame-identical to playing `?act=flight` straight through. Retiming = editing `KEYS`
in `flight.ts` and nothing else. The act boundaries are cuts in the edit,
not seams in the world.

**Those offsets are FILM time; the keys are STORY time, and they are no
longer the same number.** The journey home is authored as 31 seconds and
plays in 10, so film 0:37.5 is story 0:59. `storyTime()`/`filmTime()` in
`flight.ts` are the map; `worldTime()` applies it. Everything downstream —
KEYS, the fog and light ramps, `walkZ`, the table's cues, and every
`ValleyStill at={…}` in Acts 4/5/7/8.55 — stays in STORY time and did not
have to change. That is why it is a map and not a re-keying: `at={65}` means
"the low sun sitting in the pass" and should go on meaning that however fast
the film gets there.

| key | offset | | key | offset | | key | offset |
|---|---|---|---|---|---|---|---|
| `1` | 0:00 | | `2` | 0:26 | | `3` | 0:37.5 |
| `1.1` The Range | 0:00 | | `2.1` The Seven | 0:26 | | `3.1` The Valley | 0:37.5 |
| `1.2` The City | 0:08 | | `2.2` Pull Out | 0:31 | | `3.2` The Tree | 0:40.5 |
| `1.3` The Stadium | 0:16 | | | | | `3.3` The Road Home | 0:52 |
| `1.4` Inside | 0:20.4 | | | | | `3.4` The Table | 0:58 |

Three traps this act already fell into, worth knowing about:

- **`pow()` with a negative base is NaN**, and a single NaN pixel in an
  additively-blended quad gets smeared over the entire frame by Bloom's
  mipmap chain — the whole shot renders black while a Vignette-only
  composer renders it fine. Guard every `pow(1.0 - x, k)` with `max(0.0, …)`.
- **`gl.info.render` read inside `useFrame` is useless when an
  EffectComposer is mounted**: it reports the composer's final fullscreen
  pass (1 call, 1 triangle), not the scene render. `window.__flight` /
  `window.__scene` (published by `FlightProbe`) are the things to query.
- **Nothing is where the layout constants say it is.** The first ridge
  band's low fill-hills have footprints running from z=-258 back to z=+898
  across the axis, so the house at z=+30 was standing inside one and the last
  frame of the act was the inside of a hill. `npm run eval` + a
  `__scene.traverse` that reports world-space bounding boxes is how to find a
  clear corridor; do that before placing anything near the range.
- **The camera's `far` plane silently eats the background.** The pull-out
  ends 10,000 units past the range; at the old `far: 6800` the mountains
  were clipped away entirely and the wide shot was fields and sky. It read
  exactly like fog eating them, and three rounds of fog tuning went into
  chasing it. `far` is 24,000 now (`scene.tsx`), which costs depth
  precision — hence the ground planes in the valley are stacked 3 units
  apart rather than fractions of one.

## Architecture

Each scene is a full-viewport layered SVG composition. Components render as absolutely-positioned SVG elements stacked by z-index (or DOM order).

```
src/
├── scenes/           # Scene compositions, one directory per act
│   ├── manifest.ts   # THE scene list (viewer, tooling, Remotion all derive from it)
│   ├── createScene.tsx  # SceneShell: container/Canvas/DebugCamera/cameraMoves wrapper
│   └── sceneMode.ts  # live vs Remotion-render context
├── remotion/         # Video pipeline: Root (auto compositions), RemotionTimeDriver,
│                     # SceneComposition, FullVideo + timeline.ts (SCRIPT.md beat table)
├── components/
│   ├── scene/        # Scene 1 layers (nature elements)
│   ├── scene2/       # Scene 2 layers (stadium elements)
│   ├── scene3/       # Scene 3 layers (stage elements)
│   ├── decorative/   # Korean decorative elements
│   ├── typography/   # Title, artist badge, hangeul
│   ├── borders/      # Dancheong border
│   └── patterns/     # Lattice pattern
├── theme/colors.ts   # All color palettes
├── utils/svgHelpers.ts  # Procedural generators (seeded random)
└── index.css         # All CSS keyframe animations
```

## Key Conventions

### SVG
- ViewBox: `0 0 1920 1080` with `preserveAspectRatio="none"`
- All coordinates are absolute in the 1920x1080 space
- Each component is a self-contained SVG overlay

### Z-Index Layering (Scene 3 example)
StageFloor(10) → LEDWall(15) → StageSymbols(16) → StageBacklight(18) → StageEquipment(20) → BackupDancers(22) → MemberReflections(25) → MemberSilhouettes(30) → PyroEffects(40) → MemberSpotlights(45) → LaserBeams(50) → SparkParticles(55) → StageText(60)

### Animations
- Pure CSS keyframes defined in `index.css` (no JS animation libraries)
- Inline `style={{ animationName, animationDuration, ... }}` on elements
- Seeded random delays for natural variation (`seededRandom()` in svgHelpers.ts)
- `@media (prefers-reduced-motion: reduce)` supported

### Color System (`theme/colors.ts`)
- **Obangsaek (오방색)**: Korean five-directional colors (CHEONG, BAEK, JEOK, HEUK, HWANG)
- **Dancheong palette**: Extended traditional greens, teals, corals
- **Concert palette**: CONCERT_PURPLE, CONCERT_MAGENTA, CONCERT_CYAN, etc.
- **LED palette**: LED_CRIMSON, LED_CRIMSON_BRIGHT, LED_CRIMSON_DARK, LED_PANEL_FRAME

### Procedural Generators (`utils/svgHelpers.ts`)
Use `seededRandom(seed)` for deterministic layouts: stars, blossoms, crowd positions, ARMY bombs, confetti, sparks. All generators return typed arrays of position/animation data.

## Screenshots & Iteration Tooling

Save all screenshots to `out/screenshots/`. Use `scripts/shot.mjs` (system Chrome over CDP — not Playwright, it conflicts with other sessions). Full docs: `scripts/README.md`.

```bash
npm run shot -- --act 3.2 --t 0,2.5,8        # deterministic frames at t=0 / 2.5 / 8s
node scripts/shot.mjs --act 3.2 --t 2 --pose 0,3,7,-0.4,2.6,-1   # one fixed camera angle
node scripts/shot.mjs --act 5.3 --t 2,4,6 \  # frames along a camera move A→B over t=1..7
  --camA 0,2,10,0,1,0 --camB 4,3,6,0,1,0,50 --t0 1 --t1 7
node scripts/shot.mjs --act 2.2 --range 0:8 --fps 6 --mp4 out/preview.mp4  # frame seq + video
node scripts/shot.mjs --list                 # all scene keys
npm run eval -- --act 3.2 --wait 6000 "window.__camPose"   # run JS in a live scene
node scripts/sweep.mjs --filter 4.           # smoke-test scenes, report page errors
```

`shot.mjs` appends `ui=0` (hides dev chrome) and retries blank frames (GL
warm-up). Dev server must already be running. Headless Chrome runs on the
GPU (`--use-angle=vulkan`) whenever `/dev/dri/renderD128` exists — heavy 3D
scenes present their first frame in ~1s instead of the 20–30s SwiftShader
needs. Force the software path with `$CHROME_GL=swiftshader`.

### Time control (deterministic frames)

The global anim clock (`src/hooks/useAnimTime.tsx`) is controllable:

- URL: `?t=12.5` starts **frozen** at 12.5s (`&play=1` to keep playing), `&speed=0.5` playback rate, `&ui=0` hides dev chrome.
- Console/CDP: `window.__anim.seek(t)` / `.pause()` / `.play()` / `.setSpeed(s)` / `.time`.
- In-browser: the ⏱ **time scrubber** (bottom-right chip) — play/pause (P), ±1-frame stepping (`,` / `.`, Shift ×10 @30fps), scrub slider, speed, and "t→URL" to pin the current frame.
- Inside a Canvas (`useFrame`), call `getAnimTime()` directly — React context doesn't cross the R3F boundary.
- `?t=` also locks `THREE.Clock` to the anim clock (`src/utils/threeClockLock.ts`) and pauses CSS keyframe animations at the target time, so three.js-clock scenes freeze/scrub too (`&lockclock=0` opts out). Delta-accumulating state pauses but can't rewind; per-page-load `Math.random` layouts still vary between sessions.

### Camera moves (start/end pose over frames/timestamps)

Tooling lives in `src/scenes/DebugCamera.tsx`; any scene rendering `<DebugCamera />` gets all of it:

- `<CameraMove a={{pos, target, fov?}} b={...} t0={2} t1={8} ease="inout" />` — permanent, code-driven move along the anim clock (scrubs/freezes with `?t=`).
- URL preview (no code): `?camA=x,y,z,tx,ty,tz[,fov]&camB=...&camT0=2&camT1=8&camplay=1`. Scene camera drivers (`CameraDrift` etc. gated on `useDebugCameraEnabled()`) automatically stand down during playback.
- In-browser editing: enable the debug camera (`?camera=1` / ● Camera button), frame a shot, then use the **Camera move panel** — *Set A* / *Set B* capture the current pose + timestamp, *play move* previews, *copy URL* / *copy code* export (code = paste-ready `<CameraMove />`).
- Globals for tooling: `window.__camPose` (live pose readout), `window.__cam.set(x,y,z,tx,ty,tz,fov?)` (jump camera).
