# Flow Studio — Backend B (headless Blender)

Alternative render path to the primary Three.js/R3F + Remotion pipeline
(SPEC.md §8). Scenes are authored as Python scripts against `lib/flow.py`,
rendered headlessly with Cycles CPU, and stitched to mp4 with ffmpeg.

- Blender 4.0.2 binary: `/usr/bin/blender` (override with `$BLENDER_BIN`)
- No GPU, no OpenImageDenoise in this build → Cycles CPU, denoising off,
  firefly clamping + moderate samples instead (48 reads clean at 640x360).

## Usage

```bash
node blender/render.mjs lantern_hill                       # full 120-frame demo
node blender/render.mjs lantern_hill --frames 55:65        # a slice
node blender/render.mjs lantern_hill --res 1280x720 --samples 64 \
    --out out/renders/blender/lantern_hill_hd.mp4
node blender/render.mjs lantern_hill --keep-frames         # keep PNGs in
                                                           # out/renders/blender/.frames/
```

Flags: `--frames A:B` (default `1:120`), `--fps 30`, `--res WxH`
(default `640x360`), `--samples N` (default `48`), `--out FILE.mp4`,
`--keep-frames`.

ffmpeg discovery order: system `ffmpeg` → Remotion's bundled build
(`node_modules/@remotion/compositor-linux-x64-gnu/ffmpeg`, has libx264) →
Playwright's VP8-only build (falls back to `.webm`). On this box the
Remotion build is the one that works.

Suggested npm script (add to package.json when allowed):

```json
"render:blender": "node blender/render.mjs"
```

then: `npm run render:blender -- lantern_hill`.

A scene script can also be run directly:

```bash
blender -b -P blender/scenes/lantern_hill.py -- \
    --out /tmp/frames --frames 1:120 --res 640x360 --samples 48
```

Everything after blender's `--` is parsed by `flow.parse_args()`.

## Studio-concept mapping

| Studio (Three.js/R3F)                  | Blender backend (`lib/flow.py`)                          |
| -------------------------------------- | -------------------------------------------------------- |
| `createScene({three: {...}})`          | `make_scene(fps, res, engine, samples)`                  |
| `<CameraMove a b t0 t1 ease/>`         | `add_camera_move(a_pos, a_look, b_pos, b_look, t0, t1, ease)` |
| `WorldDef.lighting` presets            | `lighting_preset('day' \| 'dusk' \| 'night')`            |
| `makeToonMaterial` (banded ramp)       | `toon_material(color, bands, shade)` — ColorRamp (CONSTANT) quantizing normal·light into a Diffuse BSDF |
| `ToonOutlineRenderer` (inverted hull)  | `enable_freestyle(thickness, color)` — silhouette/crease/border lines |
| Bloom post pass                        | `enable_glow()` — compositor fog-glow (Cycles has no bloom) |
| Ingredients registry                   | `add_ground / add_hanok / add_figure / add_tree / add_lantern / add_moon / add_stars` |
| anim-clock keyframes (`getAnimTime`)   | `keyframe_loc(obj, t_seconds, loc)` + `sec_to_frame(t)`  |
| `?t=` scrub / `--frames`               | `--frames A:B` (Blender frame numbers, 1-based)          |

## Adding a new scene

1. Create `blender/scenes/<name>.py`:

   ```python
   import math, os, sys
   sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'lib'))
   import flow

   ARGS = flow.parse_args({'out': 'out/renders/blender/.frames/<name>',
                           'frames': (1, 120), 'res': (640, 360), 'samples': 48})
   sc = flow.make_scene(fps=30, res=ARGS['res'], samples=ARGS['samples'])
   flow.lighting_preset('dusk')
   flow.add_ground()
   flow.add_hanok((0, 4, flow.ground_height(0, 4)))
   flow.add_camera_move((0, -12, 4), (0, 2, 1.5), (2, -8, 3), (0, 2, 1.5),
                        t0=0, t1=4, ease='inout', fov=45)
   flow.enable_glow()
   flow.enable_freestyle()
   flow.set_output(ARGS['out'], ARGS['frames'])
   flow.render_animation()
   ```

2. `node blender/render.mjs <name> --frames 60:60` for a single-frame check
   (inspect the PNG with `--keep-frames`), then the full run.

Conventions:

- Time is seconds in helper APIs (`add_camera_move`, `keyframe_loc`);
  `sec_to_frame()` converts (Blender frames are 1-based).
- Place things on the terrain with `flow.ground_height(x, y)`.
- Animate actors by keyframing the root empty returned by builders
  (`fig = flow.add_figure(...)`, then `flow.keyframe_loc(fig, t, pos)`).
- Z-up, camera looks +Y into the set from -Y (matches the demo).

## Gotchas learned the hard way

- This Blender build has **no OpenImageDenoise** ("Build without
  OpenImageDenoiser" is fatal if `use_denoising=True`). `make_scene`
  disables it and sets `sample_clamp_direct/indirect` instead.
- `read_factory_settings(use_empty=True)` leaves a default Freestyle
  lineset with `linestyle=None`, which crashes stroke rendering —
  `enable_freestyle()` removes stale linesets first.
- Cycles ignores EEVEE's Shader-to-RGB, so the toon ramp quantizes the
  facing ratio (normal · fixed light dir) instead — bands plus real
  lighting combine, which is exactly the stylized look we want.
- Emissive paper at high strength blows out to white blobs under Filmic;
  keep paper emission ~2-4 and let a point light inside the lantern do
  the illuminating.
- EEVEE headless was not attempted as default: no GPU/GL context is
  available (`blender -b` EEVEE needs one); Cycles CPU at 640x360/48spp
  runs ~10 s/frame on 4 cores, which is fine.
