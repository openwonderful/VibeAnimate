---
name: spotcheck
description: Fast low-res master render for eyeballing the whole film — 384×216 @ 12fps, every scene in parallel, delivered as one small mp4
---

# Spotcheck render

Render the entire master timeline as cheaply as possible so the user can
eyeball pacing, scene order, grades and transitions. Not for judging detail,
motion smoothness, or additive point-cloud density — that's what the real
`render:fast` at full scale is for.

## The command

```bash
node scripts/render-fast.mjs --scale 0.3 --fps 12 --out out/renders/spotcheck.mp4
```

- `--scale 0.3` → 384×216 (the 720p comp scaled; both dimensions even, which
  h264 requires). `--scale 0.25` (320×180) also works if smaller is wanted.
- `--fps 12` → 2.5× fewer frames of the same film. It re-times the FullVideo
  compositions via `calculateMetadata` (`spotFps` prop); scene-local time
  stays correct because everything reads `useVideoConfig().fps`.
- Parallelism is already maxed by default: `--shards 4 --concurrency 3` =
  12 browser workers on 16 cores. Do NOT raise it — more WebGL contexts under
  GPU pressure silently drop additively-blended subtrees (see CLAUDE.md), and
  at spotcheck resolution the pool is not the bottleneck anyway.
- Run it in the background; a clean-cache full run is roughly 5–10 minutes.

## No GPU / don't touch the GPU

Spotcheck scale is exactly what makes CPU-only rendering viable (pixel cost
is ~9% of 720p, frame count 40%). Add `--cpu` (= `--gl swangle`, the software
rasterizer) to force it. Auto-detection trusts `/dev/dri/renderD128`, which a
virtio display or unplugged eGPU leaves behind with nothing real behind it —
when that happens, failed segments automatically retry on swangle, so the run
completes either way. Only a *full-scale 30fps* master on CPU is prohibitive
(hours); at spotcheck settings expect minutes.

## Cache

Segments cache under `out/renders/segments/FullVideo720@0.3x@12fps/`, keyed
`<key>@<from>+<duration>.mp4`. Retimes in `timeline.ts` self-invalidate;
**content-only scene edits do not** — after changing a scene's look, re-run
with `--only <key,key>` (or delete the cache dir for a from-scratch pass).

## Deliver (do ALL of this, unprompted)

1. Send the mp4 with SendUserFile (absolute path). At this scale the whole
   film is ~20 MB — always under the 30 MiB send limit, no re-encode needed.
2. Make sure the scrub server is up and give both links. It FOLLOWS the
   newest mp4 in out/renders, so if it is already running there is nothing
   to do — check with `curl -s -o /dev/null -w "%{http_code}" http://localhost:8090/`
   (200 = running). If down, start it detached:
   `setsid nohup node scripts/review.mjs --port 8090 >/tmp/review.log 2>&1 &`
   (CAREFUL with pkill when restarting: `pkill -f rev'iew.mjs'` — the quote
   split stops it matching your own shell and killing it.)
3. Tell the user, every time:
   - scrub page: `http://<devbox>:8090/`
   - seekable VLC: `vlc http://<devbox>:8090/video`
   - pipe fallback: `ssh <devbox> cat /srv/work/code_animation/out/renders/spotcheck.mp4 | vlc -`

## Judging the result

- Dark-and-empty stretches at this resolution are ambiguous: before declaring
  a scene broken, re-render that segment alone at full scale
  (`npm run render:fast -- --only <key> --shards 1 --concurrency 1`).
- The blank-segment guard only catches solid white (full GL context loss),
  not missing subtrees.
