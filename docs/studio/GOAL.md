# Flow Studio — Goal

> Set 2026-08-06. This is the goal every iteration is measured against.
> Refer to `PRD.md` for requirements and `SPEC.md` for the technical design.

## The Goal

**Transform this repository into "Flow Studio" — a professional-grade,
browser-based 3D animation & video studio** — a blend of Google Flow's
project/ingredient/scenebuilder model, Blender/Maya's 3D scene authoring,
and After Effects' timeline compositing — where:

1. **Scenes are authored as code** (Claude Code is the harness: the
   scaffolding must make it maximally efficient for an AI agent to create
   new scenes, shots, and assets with minimal boilerplate).
2. **A visual editor UI** (timeline, viewport, asset browser, inspector)
   lets a human sequence, scrub, and inspect everything the code declares.
3. **Ingredients (assets/characters) are declared once and referenced
   everywhere** — consistent characters and props across shots, like
   Google Flow's Ingredients.
4. **Worlds are persistent** — one 3D world definition, many shots =
   camera setups at different places/times in that world, with
   render-only-what's-visible optimization.
5. **Anime-style toon shading** is a first-class material option
   (cel bands, outlines, rim light).
6. **Two backends**: (A) Three.js/R3F + Remotion (primary, already
   proven here) and (B) headless Blender (if installable in the
   environment) as an alternative render path.
7. **A new, original, cohesive story short film** is produced with the
   studio to prove it end-to-end — it must look genuinely good.

## Success criteria

- [ ] ≥ 10 shipped, committed iterations on branch `claude/3d-animation-app-e1hecv`
- [ ] PRD + SPEC exist and are refreshed on every hourly wake-up
- [ ] Studio UI runs at `?app=studio` — timeline, asset browser, shot list
- [ ] Ingredient registry with ≥ 5 reusable assets/characters used by ≥ 2 scenes each
- [ ] World system with ≥ 1 world hosting ≥ 3 distinct shots
- [ ] Toon shader library + demo scene
- [ ] Blender backend working, or a documented conclusion that it can't install here
- [ ] Original story short film renders to mp4 and looks professional
- [ ] `npm run build` and `npm run lint` green; scene sweep passes
- [ ] Substantial new code (measured with `git diff --stat master`), tested via screenshots + renders

## Cadence

- Hourly Routine (5 hours): each wake = research refresh → PRD update →
  ≥ 1 improvement iteration → test → commit + push.
