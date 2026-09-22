# scripts/

Shared CDP core lives in `lib/chrome.mjs` (launch headless Chrome with
SwiftShader WebGL, evaluate JS, wait for canvas, screenshot with blank-frame
retry). Both CLIs below build on it.

## shot.mjs — screenshot CLI

Deterministic screenshots of animation scenes using system Chrome
(`--headless=new` + SwiftShader WebGL) driven over raw CDP. No puppeteer —
the only runtime requirement beyond the Node stdlib is the `ws` package,
which is already present transitively in `node_modules`.

The dev server must already be running (default port 5173):

```bash
npm run dev
```

Then:

```bash
npm run shot -- --act 3.2 --t 0,2.5,8
# or directly:
node scripts/shot.mjs --act 3.2 --t 0,2.5,8
```

### How it works

- `--t` uses the app's freeze/seek contract: the first timestamp goes in the
  URL as `?t=SECONDS`, which starts the app's animation clock FROZEN at that
  time (a deterministic frame). Remaining timestamps are applied in the same
  browser session via `window.__anim.seek(t)` (~600ms settle per seek), so a
  sequence of frames costs one page load.
- Without `--t`, the scene plays live and a single frame is captured after
  the canvas appears plus `--wait` ms (default 2500).
- `?t=` also locks `THREE.Clock` to the anim clock (see
  `src/utils/threeClockLock.ts`), so three.js-clock-driven scenes freeze and
  scrub too, and CSS keyframe animations are paused at the target time.
  **Caveat:** delta-*accumulating* scene state (e.g. particles integrating
  velocity) pauses correctly but cannot rewind — scrub forward, or reload at
  the target time. Opt out of the lock with `&lockclock=0` in a `--url`.
  Per-page-load randomness (`Math.random` layouts) still varies between
  sessions; within one session frames are exact.
- Console errors and page exceptions are always printed to stderr at the end;
  pass `--console` to see every console message.
- Exits non-zero on failure; prints each written file path on success.

### Options

Run `node scripts/shot.mjs --help` for the full list. Highlights:

| Flag | Meaning |
| --- | --- |
| `--act KEY` | scene key (`?act=KEY`) |
| `--url URL` | full URL, overrides everything (pass all params yourself) |
| `--t LIST` | comma-separated timestamps, e.g. `0,2.5,8` |
| `--range A:B` | frame sequence from t=A to t=B (`<act>_f0001.png`, ...) |
| `--fps N` | frame rate for `--range`, default 12 |
| `--mp4 PATH` | assemble `--range` frames into an H.264 mp4 (needs ffmpeg) |
| `--out PATH` | output file (single shot) or directory (multiple); default `out/screenshots/` |
| `--size WxH` | viewport, default `1280x720` |
| `--dpr N` | device scale factor, default 1 |
| `--wait MS` | settle wait after canvas appears, default 2500 |
| `--speed X` | playback speed multiplier (`&speed=X`) |
| `--pose CSV` | fixed camera angle `x,y,z,tx,ty,tz[,fov]` (shorthand for `--camA P --camB P`) |
| `--camA` / `--camB` | camera start/end pose `x,y,z,tx,ty,tz[,fov]` |
| `--t0` / `--t1` | camera move start/end times (seconds) |
| `--ease` | `linear` or `inout` |
| `--list` | print every scene key from `src/scenes/manifest.ts` |
| `--port N` | dev server port, default 5173 |
| `--ui` | keep dev chrome visible (hidden by default via `ui=0`) |
| `--console` | print all page console messages |

Auto file names are `<act>_t<time>.png`, with dots in the time replaced by
`p` (so `--t 2.5` -> `3.2_t2p5.png`). Without `--t` the name is `<act>.png`.

### Examples

Single live frame of act 1.1 (default 1280x720, saved to `out/screenshots/1.1.png`):

```bash
node scripts/shot.mjs --act 1.1
```

Three deterministic frames of act 3.2 at t=0, 2.5 and 8 seconds
(writes `3.2_t0.png`, `3.2_t2p5.png`, `3.2_t8.png`):

```bash
node scripts/shot.mjs --act 3.2 --t 0,2.5,8
```

A single frame at t=4 to a specific file, at higher resolution:

```bash
node scripts/shot.mjs --act 5.3 --t 4 --size 1920x1080 --out out/screenshots/act53_mid.png
```

Camera-move sequence: interpolate the camera from pose A to pose B over
t=1..7 (ease in-out), screenshotting the move at t=2, 4 and 6. Any cam flag
automatically appends `camplay=1` to activate the camera driver:

```bash
node scripts/shot.mjs --act 5.3 --t 2,4,6 \
  --camA 0,2,10,0,1,0 --camB 4,3,6,0,1,0,50 \
  --t0 1 --t1 7 --ease inout
```

Debugging a scene that logs to the console (three.js-clock-driven, so no
`--t` — let it play ~6s in real time first):

```bash
node scripts/shot.mjs --act 4.1 --wait 6000 --console
```

### Iteration loop for agents

Assume the dev server is already running on port 5173 (do not start a second
one; if it's down, `shot.mjs` says so and exits 1). Vite hot-reloads on save,
so the loop is simply:

1. Edit the scene component under `src/scenes/`.
2. `node scripts/shot.mjs --act <key> --t <times>` (or omit `--t` for
   three.js-clock scenes).
3. Read the printed PNG path(s), inspect the image, check stderr for page
   errors, refine, repeat.

Pick timestamps that bracket the moment you're tuning (e.g. `--t 0,2,5`
around a transition). Use the default `out/screenshots/` directory so shots
are easy to find, and name one-offs explicitly with `--out` when comparing
variants.

Frame sequence + preview video of a camera move (17 frames at 4fps, then an
mp4 assembled with ffmpeg):

```bash
node scripts/shot.mjs --act 3.2 --range 1:5 --fps 4 \
  --camA 0,3,7,-0.4,2.6,-1 --camB 3,2.2,2.5,-0.4,2.6,-1 --t0 1 --t1 5 \
  --mp4 out/screenshots/move_preview.mp4
```

## sweep.mjs — smoke-test every scene

Screenshots every act key in the scene manifest (`src/scenes/manifest.ts`,
or a `--filter`ed subset) and reports page exceptions, console errors, and
blank captures — run it after refactors that touch shared code.

```bash
node scripts/sweep.mjs                       # all scenes (~93, a few minutes)
node scripts/sweep.mjs --filter 4. --t 3     # act 4 only, frozen at t=3
```

One PNG per act lands in `out/screenshots/sweep/`; failures are summarised at
the end and the exit code is non-zero if anything failed.

## eval.mjs — run JS inside a live scene

Interrogate or drive a scene without opening a browser: evaluate one or more
expressions (in order, awaited, printed as JSON), then optionally screenshot
the result in the same session.

```bash
# Where is the camera right now?
npm run eval -- --act 3.2 --wait 6000 "window.__camPose"

# Freeze at t=2, jump the camera to an exact pose, verify, screenshot.
# --camera is REQUIRED for __cam.set on scenes with their own camera
# drivers (CameraDrift etc.) — it makes them stand down.
node scripts/eval.mjs --act 3.2 --t 2 --camera --wait 7000 \
  "window.__cam.set(-3,4,5, -0.4,2.6,-1)" "window.__camPose" \
  --shot out/screenshots/probe.png

# Scrub the clock and read it back
node scripts/eval.mjs --act 1.1 "window.__anim.seek(4); window.__anim.time"
```

Useful globals: `window.__anim` (time/seek/pause/play/setSpeed),
`window.__camPose` (live pose), `window.__cam.get()/.set(...)`.

## render-act.mjs — render a scene to video via Remotion

Every scene in the manifest is automatically a Remotion composition
(`src/remotion/Root.tsx`). Render any of them to an mp4 by scene key:

```bash
npm run render:act -- 3.2                     # → out/renders/3.2.mp4
npm run render:act -- 3.2 --gpu               # --gl=angle-egl (GPU) instead of angle
npm run render:act -- 3.2 --out my.mp4 --frames 0-60   # extra remotion args pass through
npm run render:act -- FullVideo               # master timeline (or: npm run render:full)
```

Scene keys are sanitised to Remotion's composition-id charset (`3.2` → `3-2`,
`arirang_v1.1` → `arirang-v1-1`); the script does the mapping for you.
Composition duration comes from the manifest entry's `durationSec` (default
20s). The master `FullVideo` composition sequences scenes per SCRIPT.md
timings (`src/remotion/timeline.ts`) with the song audio underneath.

Renders are CPU-heavy with `--gl=angle` (SwiftShader); use `--gpu` when the
GPU is free. `--concurrency=1` and a long timeout are baked in — heavy 3D
scenes need warm-up. Env overrides: `$REMOTION_GL` (GL backend) and
`$CHROME_BIN` (browser binary — needed on boxes without system Chrome).

## render-fast.mjs — cached, parallel master-video renders

The master video is a sequence of independent scene slots over one audio
track, so render-fast renders each timeline slot as a video-only **segment**
(`out/renders/segments/<comp>/<key>.mp4`), caches them on disk, renders only
what's missing (or what you `--only`) in a pool of parallel browser
processes, then stream-copies the segments together and muxes the song.
Iterating on one scene = re-render one segment, not the whole 190s video.

```bash
npm run render:fast                            # full video; only missing segments render
npm run render:fast -- --only 2.1-zoom         # re-render one scene, stitch with cache
npm run render:fast -- --range 18:44           # just Act 2 (boundaries must match slots)
npm run render:fast -- --comp FullVideo --out out/renders/FullVideo.mp4   # final 1080p
npm run render:fast -- --force                 # ignore cache
```

Per-frame cost is dominated by React/SVG DOM updates, not pixels — `--scale`
barely helps, and >4 shards contend for the GPU (default `--shards 4`).
Segment boundaries come from `src/remotion/timeline.ts` (regex-parsed:
keep entries one-per-line literals). After editing a scene, re-run with
`--only <key>` — the cache does not detect code changes by itself.

Each segment is verified before it's cached: on a crash (non-zero exit) or a
**blank render** (a mid-render GPU context loss can leave the tail of a
segment solid white while the process still exits 0) the segment is retried
once, and a blank file is never cached. Blank detection samples three frames
and flags a segment where all are near-solid-color (< ~45KB PNG). A
genuinely dark scene could false-positive; disable with `BLANK_BYTES=0` or
tune the threshold via that env var.

## archive/

One-off predecessors of `shot.mjs` (`snap-*.mjs`), kept for reference only.

## GL backend override ($SHOT_GL)

`lib/chrome.mjs` launches Chrome with ANGLE on SwiftShader by default.
Set `SHOT_GL=gl-egl` to use system GL instead (Mesa llvmpipe when no
GPU) — measured ~30% faster with identical output on this repo's
scenes. Applies to shot.mjs, sweep.mjs, eval.mjs and preview-film.mjs.

## preview-film.mjs — watchable film previews without a GPU

Captures every shot of a film timeline as frames (via shot.mjs),
assembles cached per-shot segment mp4s and concats the film:

```bash
npm run preview:film -- story          # The Lantern Keeper
npm run preview:film -- story-anime    # the anime cut
npm run preview:film -- master --fps 8 # Body to Body (long!)
```

Flags: `--fps N` (default 10), `--size WxH` (default 1280x720),
`--force` (ignore segment cache). Segments cache under
`out/renders/preview/<film>/`; output `out/renders/<film>_preview.mp4`.
Requires the dev server + system ffmpeg (`apt-get install ffmpeg` — the
Playwright-bundled ffmpeg lacks the image2 demuxer).
