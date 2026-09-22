# Publishing this repo to GitHub — readiness checklist

Status of each item as of the last audit. ✅ = done in-repo; ⚠️ = needs a
decision or a destructive step only the owner should run.

## ✅ Done in-repo

- **LICENSE** — MIT for the *source code only* (media explicitly excluded).
- **package.json** — real name/version/description/license/repository
  (was `temp-scaffold 0.0.0`). `private: true` kept to block accidental
  `npm publish`; it does not affect GitHub hosting.
- **CI** — `.github/workflows/ci.yml`: `npm ci` → `doctor` → build
  (tsc + vite) → lint (0-errors policy) → unit tests.
- **README** — describes the project for a fresh cloner.
- **.gitignore** — `out/`, `dist`, `node_modules`, `*.mp3`, `*.mp4`
  covered (note: ignore rules do NOT untrack already-tracked files —
  see below).

## ⚠️ Rights-holder media (owner has decided to keep the song in-repo)

Example-project media now lives in `examples/body-to-body/` (song,
lyrics, reference image — see its README) with ONE runtime copy at
`public/audio/body-to-body.mp3`; the redundant `src/assets/` copy was
removed. Remaining consideration for a PUBLIC repo:

| File | What it is |
|------|-----------|
| `examples/body-to-body/body-to-body.mp3` + `public/audio/body-to-body.mp3` | the commercial recording (owner keeps for the example project; a public repo still distributes it — DMCA risk is the owner's call) |
| `examples/body-to-body/body_to_body.lrc` | lyrics (same consideration) |
| `examples/body-to-body/yournamevertical.jpg` | film still reference |
| `public/models/*.glb`, `public/models/rpm/*.glb` | 3D assets of unverified provenance — the `rpm/` clips look like Ready Player Me animation assets (check their license for redistribution); `asian_*.glb` sources unknown |

**If the decision ever changes, the two-step removal (step 1 alone
leaves everything in history):**

```bash
# 1. Untrack going forward (keeps local files on disk)
git rm --cached examples/body-to-body/body-to-body.mp3 \
  examples/body-to-body/body_to_body.lrc \
  examples/body-to-body/yournamevertical.jpg public/audio/body-to-body.mp3
git commit -m "Untrack rights-holder media"

# 2. Scrub history (DESTRUCTIVE — rewrites every commit hash). Note the
#    files lived at the ROOT and src/assets/ before the examples/ reorg —
#    scrub the old paths too:
pip install git-filter-repo
git filter-repo --invert-paths \
  --path "Body to Body [RBaSiVjtKR4].mp3" \
  --path body_to_body.lrc \
  --path yournamevertical.jpg \
  --path public/audio/body-to-body.mp3 \
  --path src/assets/body-to-body.mp3 \
  --path examples/body-to-body/body-to-body.mp3 \
  --path examples/body-to-body/body_to_body.lrc \
  --path examples/body-to-body/yournamevertical.jpg
# then force-push to a FRESH GitHub repo (simplest), or force-push all
# rewritten branches and have collaborators re-clone.
```

After removal the app still runs; what changes:

- `npm run render:full` (master video) needs `public/audio/body-to-body.mp3`
  to exist locally — document "drop your own licensed audio at this path".
  Everything else (studio, story films with the synthesized theme,
  previews, screenshots) is self-contained.
- If the GLBs are scrubbed too, the four `char.glbHuman`-style ingredients
  and the `characters/` galleries lose their meshes; the procedural
  GoldFigure pipeline (all story/master scenes) is unaffected.

## ⚠️ Naming/content decision

The project is BTS-fan-content themed (scene titles, SCRIPT.md
references). Publishing fan tooling is normal; publishing the *song* or
*lyrics* is not. Keeping the scene names and SCRIPT.md beat descriptions
is generally fine (facts/titles), but read SCRIPT.md once for any quoted
lyric lines before going public.

## Recommended publish sequence

1. Decide GLB keep/scrub (verify Ready Player Me license for `rpm/`).
2. Run the two-step removal above on a fresh clone.
3. `npm ci && npm run doctor && npm run build && npm test` on that clone.
4. Create the GitHub repo (suggested name: `flow-studio`), push, confirm
   CI is green, add repo topics: `threejs`, `remotion`, `react-three-fiber`,
   `animation`, `blender`, `video-editor`.
