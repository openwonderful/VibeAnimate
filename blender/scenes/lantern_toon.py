"""lantern_toon — anime-look variant of lantern_hill (Backend B).

Same night hill, hanok, lanterns and walking figure, but every diffuse
material is rebuilt through flow.toon_material (ColorRamp-banded facing
ratio — the Cycles analogue of the web toon stack's gradient ramp) and
Freestyle draws heavier ink lines. Mirrors the web `story.2-B` experiment
so both backends have a comparable anime sample.

Run headless (single validation still by default):
  blender -b -P blender/scenes/lantern_toon.py -- \
      --out out/renders/blender/.frames/lantern_toon \
      --frames 60:60 --res 640x360 --samples 12
"""

import math
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'lib'))
import flow  # noqa: E402

import bpy  # noqa: E402

ARGS = flow.parse_args({
    'out': 'out/renders/blender/.frames/lantern_toon',
    'frames': (60, 60),
    'res': (640, 360),
    'samples': 12,
})

DUR = 4.0
FPS = 30

sc = flow.make_scene(fps=FPS, res=ARGS['res'], engine='CYCLES',
                     samples=ARGS['samples'])

# --- world (same layout as lantern_hill) -----------------------------------
flow.lighting_preset('night')
flow.add_ground(hill=2.0)
flow.add_moon()
flow.add_stars()

gz = flow.ground_height

for (x, y), rot, scale in [((-3.6, 5.0), 0.25, 1.0),
                           ((3.6, 7.0), -0.35, 0.9),
                           ((-6.2, 9.5), 0.55, 0.8)]:
    flow.add_hanok((x, y, gz(x, y) - 0.10), rot=rot, scale=scale)

for x, y in [(-6.5, 2.5), (5.5, 3.5), (-4.2, -2.5), (7.0, 8.0)]:
    flow.add_tree((x, y, gz(x, y) - 0.05), scale=1.0 + 0.15 * math.sin(x))

for x, y in [(-1.3, -3.5), (1.2, -1.5), (-1.2, 0.6), (1.3, 2.8), (-1.0, 4.8)]:
    flow.add_lantern((x, y, gz(x, y)), strength=30.0)

fig = flow.add_figure((0, 0, 0), scale=1.0, color=(0.83, 0.66, 0.20))
x0, y0 = -0.35, -5.0
x1, y1 = 0.55, 4.4
STEPS = 10
for i in range(STEPS + 1):
    t = DUR * i / STEPS
    f = i / STEPS
    x = x0 + (x1 - x0) * f + 0.25 * math.sin(f * math.pi * 2)
    y = y0 + (y1 - y0) * f
    bob = 0.05 * abs(math.sin(f * math.pi * 6))
    flow.keyframe_loc(fig, t, (x, y, gz(x, y) + bob), ease='linear')

flow.add_camera_move(
    a_pos=(0.0, -14.5, 5.2), a_look=(0.0, 3.0, 2.5),
    b_pos=(0.4, -9.0, 3.6), b_look=(0.3, 4.0, 2.4),
    t0=0.0, t1=DUR, ease='inout', fov=44,
)

# --- toonify: rebuild every non-emissive material as a banded toon ----------
def _principled_base_color(mat):
    if not mat or not mat.use_nodes:
        return None
    for node in mat.node_tree.nodes:
        if node.type == 'BSDF_PRINCIPLED':
            r, g, b, _ = node.inputs['Base Color'].default_value
            return (r, g, b)
        if node.type == 'EMISSION':
            return None  # keep glow materials untouched
    return None


toon_cache = {}
for obj in bpy.data.objects:
    if obj.type != 'MESH':
        continue
    for slot in obj.material_slots:
        base = _principled_base_color(slot.material)
        if base is None:
            continue
        key = (round(base[0], 3), round(base[1], 3), round(base[2], 3))
        if key not in toon_cache:
            toon_cache[key] = flow.toon_material(
                f'toon_{len(toon_cache)}', base, bands=3, shade=0.35)
        slot.material = toon_cache[key]

# --- look: heavier ink than the standard shot -------------------------------
flow.enable_glow(threshold=1.0, size=7)
flow.enable_freestyle(thickness=2.2, crease_angle=130.0)

flow.set_output(ARGS['out'], ARGS['frames'])
flow.render_animation()
