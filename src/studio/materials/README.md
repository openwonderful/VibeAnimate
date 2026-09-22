# Flow Studio — toon materials (SPEC §7, F5)

Anime/cel-shading toolkit. Everything works identically in live mode and
Remotion render mode. Demo scene: `src/studio/lab/ToonLab.tsx` (`?act=lab.toon`).

## `toon.ts`

```ts
import { makeToonRamp, toonMaterial, applyRimLight, ToonSwap } from 'src/studio/materials/toon'
```

- **`makeToonRamp(stops: string[] | number): THREE.DataTexture`** —
  NearestFilter gradient map for `MeshToonMaterial.gradientMap`.
  A number gives that many evenly spaced bands; a hex list gives one band per
  stop (dark→light), using each stop's **luminance** as the band level (three's
  toon shader reads only the red channel — stops shape band spacing/contrast,
  not hue).

- **`toonMaterial(opts): THREE.MeshToonMaterial`** — configured toon material.
  `{ color, bands?=3, ramp?, emissive?, emissiveIntensity?, map?, transparent?,
  opacity?, side?, rim? }`. `ramp` overrides `bands`; `rim` calls
  `applyRimLight` for you.

- **`applyRimLight(material, { color?, power?, intensity? })`** — injects a
  fresnel rim term into any lit built-in material via `onBeforeCompile`
  (added to `outgoingLight` pre-output, so fog/tone-mapping still apply).
  Idempotent — calling again just updates the values; uniforms live at
  `material.userData.flowRim` for per-frame animation. Chains any existing
  `onBeforeCompile` and extends `customProgramCacheKey`.

- **`<ToonSwap bands? ramp? include? exclude? rim? restoreOnUnmount? />`** —
  scene-graph cel-shading pass (generalized from `scenes/act4/Act4_1_C.tsx`).
  Each frame it pairs every `MeshStandardMaterial` with a `MeshToonMaterial`
  (one toon per source material, so shared materials stay shared) and mirrors
  color / emissive / opacity / visibility / side from the original — existing
  animations that mutate the std refs keep driving the look.
  `include`/`exclude`: `(mesh, material) => boolean` predicates. `rim` applies
  a rim light to every swapped-in toon. Restores originals and disposes its
  materials on unmount.

## `ToonOutline.tsx`

- **`<ToonOutlineRenderer thickness? color? alpha? overlay? renderPriority? />`** —
  inverted-hull ink outlines via three-stdlib's `OutlineEffect`.
  - Default: owns the render loop (`useFrame` priority 1) — use when there is
    no `EffectComposer`.
  - `overlay`: for scenes with an `EffectComposer` — runs after the composer
    (priority 2), re-primes framebuffer depth with a color-write-off pass, then
    draws only the outlines on top of the post-processed image.
  - Per-mesh overrides via three's standard
    `material.userData.outlineParameters = { thickness, color, alpha, visible }`.

## `PosterizeEffect.ts`

- **`class PosterizeEffect`** — pmndrs `postprocessing` Effect: luminance
  posterization (chroma-preserving) + optional 45° halftone dot grid.
  Options / accessors: `levels` (default 6), `halftone` (0..1 dot strength,
  0 = off), `dotScale` (cell size in px, default 6), `blendFunction`.
- **`Posterize`** — `wrapEffect(PosterizeEffect)`; drop inside
  `<EffectComposer>`: `<Posterize levels={5} halftone={0.6} />`.

## Recipes

```tsx
// Cel-shade an existing MeshStandardMaterial scene + outlines (no composer):
<ToonSwap bands={4} rim={{ color: '#A8D8FF', power: 2.2, intensity: 0.85 }} />
<ToonOutlineRenderer thickness={0.004} color="#000" />

// With bloom/vignette — let the composer render, overlay the outlines:
<EffectComposer>
  <Bloom mipmapBlur intensity={0.75} luminanceThreshold={0.65} />
  <Vignette offset={0.22} darkness={0.82} />
</EffectComposer>
<ToonOutlineRenderer overlay thickness={0.0035} color="#06090F" />

// Hand-built toon material with custom band spacing:
const mat = toonMaterial({
  color: '#D4A843',
  ramp: makeToonRamp(['#1A1408', '#6E5020', '#D4A843', '#FFE9B8']),
  rim: { color: '#FFD9A6', power: 3 },
})
```
