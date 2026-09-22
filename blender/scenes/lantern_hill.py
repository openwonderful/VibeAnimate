"""lantern_hill — demo shot for the Blender backend (Backend B).

Night hill with hanok houses and glowing paper lanterns along a path; a
lone figure walks up the hill while the camera slowly pushes in.
4 seconds @ 30 fps (frames 1..120).

Run headless:
  blender -b -P blender/scenes/lantern_hill.py -- \
      --out out/renders/blender/.frames/lantern_hill \
      --frames 1:120 --res 640x360 --samples 12

(Usually invoked via `node blender/render.mjs lantern_hill`.)
"""

import math
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'lib'))
import flow  # noqa: E402

ARGS = flow.parse_args({
    'out': 'out/renders/blender/.frames/lantern_hill',
    'frames': (1, 120),
    'res': (640, 360),
    'samples': 12,
})

DUR = 4.0        # seconds
FPS = 30

sc = flow.make_scene(fps=FPS, res=ARGS['res'], engine='CYCLES',
                     samples=ARGS['samples'])

# --- world -----------------------------------------------------------------
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

# lantern path winding up the hill
LANTERNS = [(-1.3, -3.5), (1.2, -1.5), (-1.2, 0.6), (1.3, 2.8), (-1.0, 4.8)]
for x, y in LANTERNS:
    flow.add_lantern((x, y, gz(x, y)), strength=30.0)

# --- actor: walking figure --------------------------------------------------
fig = flow.add_figure((0, 0, 0), scale=1.0, color=(0.83, 0.66, 0.20))
x0, y0 = -0.35, -5.0
x1, y1 = 0.55, 4.4
STEPS = 10
for i in range(STEPS + 1):
    t = DUR * i / STEPS
    f = i / STEPS
    x = x0 + (x1 - x0) * f + 0.25 * math.sin(f * math.pi * 2)  # slight weave
    y = y0 + (y1 - y0) * f
    bob = 0.05 * abs(math.sin(f * math.pi * 6))                # step bob
    flow.keyframe_loc(fig, t, (x, y, gz(x, y) + bob), ease='linear')

# --- camera: slow push-in ---------------------------------------------------
flow.add_camera_move(
    a_pos=(0.0, -14.5, 5.2), a_look=(0.0, 3.0, 2.5),
    b_pos=(0.4, -9.0, 3.6), b_look=(0.3, 4.0, 2.4),
    t0=0.0, t1=DUR, ease='inout', fov=44,
)

# --- look -------------------------------------------------------------------
flow.enable_glow(threshold=1.0, size=7)
flow.enable_freestyle(thickness=1.1)

# --- render -----------------------------------------------------------------
flow.set_output(ARGS['out'], ARGS['frames'])
flow.render_animation()
