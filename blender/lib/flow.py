"""flow.py — Flow Studio Backend B helpers (headless Blender).

Mirrors the studio concepts from docs/studio/SPEC.md §8:

  studio (Three.js/R3F)            blender backend (this file)
  -------------------------------  ----------------------------------
  createScene({three, ...})        make_scene(fps, res, engine, samples)
  <CameraMove a b t0 t1/>          add_camera_move(a_pos, a_look, b_pos, b_look, t0, t1)
  LightingPreset 'day|dusk|night'  lighting_preset('day'|'dusk'|'night')
  makeToonMaterial (ramp bands)    toon_material(...)  (ColorRamp banded diffuse)
  ToonOutlineRenderer              enable_freestyle(...)
  ingredients (hanok, figure, ...) add_ground / add_hanok / add_figure /
                                   add_tree / add_lantern / add_moon / add_stars

Written for the Blender 4.0.2 binary at /usr/bin/blender (also loads under
pip bpy). Cycles CPU + moderate samples + firefly clamping = reliable
headless (this build has no OpenImageDenoise and no GPU).
"""

from __future__ import annotations

import math
import sys

import bpy
from mathutils import Vector

# ---------------------------------------------------------------------------
# CLI args (everything after blender's `--`)
# ---------------------------------------------------------------------------

def parse_args(defaults: dict) -> dict:
    """Parse `--key value` pairs after `--` in sys.argv into a dict.

    Knows the shared flags: --out DIR --frames A:B --res WxH --samples N
    (values are post-processed: frames -> (a, b) ints, res -> (w, h) ints,
    samples -> int). Unknown keys pass through as strings.
    """
    args = dict(defaults)
    argv = sys.argv
    if '--' in argv:
        extra = argv[argv.index('--') + 1:]
        key = None
        for tok in extra:
            if tok.startswith('--'):
                key = tok[2:]
                args[key] = True  # bare flag
            elif key is not None:
                args[key] = tok
                key = None
    if isinstance(args.get('frames'), str):
        a, b = args['frames'].split(':')
        args['frames'] = (int(a), int(b))
    if isinstance(args.get('res'), str):
        w, h = args['res'].lower().split('x')
        args['res'] = (int(w), int(h))
    if 'samples' in args:
        args['samples'] = int(args['samples'])
    return args


# ---------------------------------------------------------------------------
# Scene setup
# ---------------------------------------------------------------------------

def make_scene(fps=30, res=(1280, 720), engine='CYCLES', samples=16):
    """Fresh empty scene with render settings tuned for headless CPU."""
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.fps = fps
    sc.render.resolution_x, sc.render.resolution_y = res
    sc.render.resolution_percentage = 100
    sc.render.engine = engine
    sc.render.image_settings.file_format = 'PNG'
    sc.render.image_settings.color_mode = 'RGB'
    if engine == 'CYCLES':
        cy = sc.cycles
        cy.device = 'CPU'
        cy.samples = samples
        cy.use_adaptive_sampling = True
        # The apt Blender 4.0.2 build ships without OpenImageDenoise and there
        # is no GPU for OptiX — denoising must stay off; compensate with
        # samples (32-64 reads fine at 640x360 with the fog-glow pass).
        cy.use_denoising = False
        cy.sample_clamp_direct = 6.0    # tame point-light speckle
        cy.sample_clamp_indirect = 2.0  # kill fireflies
        cy.max_bounces = 4
        cy.diffuse_bounces = 2
        cy.glossy_bounces = 2
        cy.transmission_bounces = 2
        cy.caustics_reflective = False
        cy.caustics_refractive = False
    # Filmic gives a soft rolloff on the emissive lanterns (AgX washes them out)
    sc.view_settings.view_transform = 'Filmic'
    sc.view_settings.look = 'Medium High Contrast'
    return sc


def set_output(out_dir: str, frames=(1, 120)):
    """Point render output at out_dir/frame_####.png and set the frame range."""
    sc = bpy.context.scene
    sc.frame_start, sc.frame_end = frames
    sc.render.filepath = out_dir.rstrip('/') + '/frame_'


def render_animation():
    bpy.ops.render.render(animation=True)


# ---------------------------------------------------------------------------
# Materials
# ---------------------------------------------------------------------------

def _new_material(name):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    nodes.clear()
    return mat, nodes, mat.node_tree.links


def toon_material(name, color, bands=3, shade=0.30, light_dir=(0.4, -0.35, 0.85)):
    """Banded 'cel' look that works in Cycles (no Shader-to-RGB needed).

    A ColorRamp (CONSTANT interpolation) quantizes the facing-ratio of the
    surface normal against a fixed stylized light direction, and the banded
    color feeds a Diffuse BSDF — so cel bands AND real scene lighting combine.
    """
    mat, nodes, links = _new_material(name)

    geo = nodes.new('ShaderNodeNewGeometry')
    dot = nodes.new('ShaderNodeVectorMath')
    dot.operation = 'DOT_PRODUCT'
    d = Vector(light_dir).normalized()
    dot.inputs[1].default_value = (d.x, d.y, d.z)
    rng = nodes.new('ShaderNodeMapRange')
    rng.inputs['From Min'].default_value = -1.0
    rng.inputs['From Max'].default_value = 1.0
    ramp = nodes.new('ShaderNodeValToRGB')
    ramp.color_ramp.interpolation = 'CONSTANT'
    # Build `bands` stops from shaded color -> full color
    elems = ramp.color_ramp.elements
    while len(elems) > 1:
        elems.remove(elems[0])
    elems[0].position = 0.0
    for i in range(bands):
        t = i / max(bands - 1, 1)          # 0..1 brightness factor
        f = shade + (1.0 - shade) * t
        col = (color[0] * f, color[1] * f, color[2] * f, 1.0)
        e = elems[0] if i == 0 else elems.new(0.25 + 0.75 * (i / bands))
        e.color = col
    bsdf = nodes.new('ShaderNodeBsdfDiffuse')
    out = nodes.new('ShaderNodeOutputMaterial')

    links.new(geo.outputs['Normal'], dot.inputs[0])
    links.new(dot.outputs['Value'], rng.inputs['Value'])
    links.new(rng.outputs['Result'], ramp.inputs['Fac'])
    links.new(ramp.outputs['Color'], bsdf.inputs['Color'])
    links.new(bsdf.outputs['BSDF'], out.inputs['Surface'])
    return mat


def emissive_material(name, color, strength=20.0):
    mat, nodes, links = _new_material(name)
    em = nodes.new('ShaderNodeEmission')
    em.inputs['Color'].default_value = (*color, 1.0)
    em.inputs['Strength'].default_value = strength
    out = nodes.new('ShaderNodeOutputMaterial')
    links.new(em.outputs['Emission'], out.inputs['Surface'])
    return mat


def enable_freestyle(thickness=1.4, color=(0.02, 0.02, 0.05), crease_angle=140.0):
    """Toon outlines (silhouette + crease + border) on the active view layer."""
    sc = bpy.context.scene
    sc.render.use_freestyle = True
    sc.render.line_thickness_mode = 'ABSOLUTE'
    sc.render.line_thickness = thickness
    vl = bpy.context.view_layer
    vl.use_freestyle = True
    fs = vl.freestyle_settings
    fs.crease_angle = math.radians(crease_angle)
    # empty factory startup leaves a default lineset with linestyle=None,
    # which crashes Freestyle's parameter editor at render time — drop it
    while fs.linesets:
        fs.linesets.remove(fs.linesets[0])
    ls = fs.linesets.new('FlowLines')
    ls.select_silhouette = True
    ls.select_border = True
    ls.select_crease = True
    if ls.linestyle is None:  # empty factory startup has no default linestyle
        ls.linestyle = bpy.data.linestyles.new('FlowLineStyle')
    ls.linestyle.color = color
    ls.linestyle.thickness = thickness


def enable_glow(threshold=1.0, size=7):
    """Compositor fog-glow so emissive lanterns bloom (Cycles has no bloom)."""
    sc = bpy.context.scene
    sc.use_nodes = True
    tree = sc.node_tree
    tree.nodes.clear()
    rl = tree.nodes.new('CompositorNodeRLayers')
    glare = tree.nodes.new('CompositorNodeGlare')
    glare.glare_type = 'FOG_GLOW'
    glare.quality = 'MEDIUM'
    glare.threshold = threshold
    glare.size = size
    comp = tree.nodes.new('CompositorNodeComposite')
    tree.links.new(rl.outputs['Image'], glare.inputs['Image'])
    tree.links.new(glare.outputs['Image'], comp.inputs['Image'])


# ---------------------------------------------------------------------------
# Lighting presets  (mirrors WorldDef.lighting 'day'|'dusk'|'night')
# ---------------------------------------------------------------------------

def _world_bg(color, strength=1.0):
    world = bpy.data.worlds.new('World')
    bpy.context.scene.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes['Background']
    bg.inputs['Color'].default_value = (*color, 1.0)
    bg.inputs['Strength'].default_value = strength


def _sun(name, rot_euler, color, energy):
    light = bpy.data.lights.new(name, type='SUN')
    light.color = color
    light.energy = energy
    light.angle = math.radians(3)
    obj = bpy.data.objects.new(name, light)
    obj.rotation_euler = rot_euler
    bpy.context.collection.objects.link(obj)
    return obj


LIGHTING_PRESETS = {
    'day':   dict(bg=(0.35, 0.52, 0.75), bg_strength=1.0,
                  sun=dict(rot=(math.radians(50), 0, math.radians(30)),
                           color=(1.0, 0.96, 0.88), energy=4.0)),
    'dusk':  dict(bg=(0.16, 0.07, 0.10), bg_strength=0.8,
                  sun=dict(rot=(math.radians(80), 0, math.radians(-60)),
                           color=(1.0, 0.55, 0.30), energy=2.0)),
    'night': dict(bg=(0.010, 0.020, 0.048), bg_strength=0.9,
                  sun=dict(rot=(math.radians(55), 0, math.radians(140)),
                           color=(0.60, 0.72, 1.0), energy=0.45)),
}


def lighting_preset(name='night'):
    p = LIGHTING_PRESETS[name]
    _world_bg(p['bg'], p['bg_strength'])
    s = p['sun']
    return _sun(f'Sun_{name}', s['rot'], s['color'], s['energy'])


# ---------------------------------------------------------------------------
# Camera move  (mirrors <CameraMove a b t0 t1 ease/>)
# ---------------------------------------------------------------------------

_EASING = {'inout': 'EASE_IN_OUT', 'in': 'EASE_IN', 'out': 'EASE_OUT'}


def _apply_ease(obj, ease):
    if not obj.animation_data or not obj.animation_data.action:
        return
    for fc in obj.animation_data.action.fcurves:
        for kp in fc.keyframe_points:
            if ease == 'linear':
                kp.interpolation = 'LINEAR'
            else:
                kp.interpolation = 'SINE'
                kp.easing = _EASING.get(ease, 'EASE_IN_OUT')


def sec_to_frame(t: float) -> int:
    return round(t * bpy.context.scene.render.fps) + 1  # Blender frames are 1-based


def add_camera_move(a_pos, a_look, b_pos, b_look, t0, t1, ease='inout', fov=None):
    """Camera + tracked look-target, keyframed pos/look from A@t0 to B@t1 (seconds).

    Pass identical A/B for a static camera. Returns (camera, target_empty).
    """
    cam_data = bpy.data.cameras.new('Camera')
    if fov is not None:
        cam_data.angle = math.radians(fov)
    cam = bpy.data.objects.new('Camera', cam_data)
    bpy.context.collection.objects.link(cam)
    bpy.context.scene.camera = cam

    target = bpy.data.objects.new('CamTarget', None)
    bpy.context.collection.objects.link(target)
    con = cam.constraints.new('TRACK_TO')
    con.target = target
    con.track_axis = 'TRACK_NEGATIVE_Z'
    con.up_axis = 'UP_Y'

    f0, f1 = sec_to_frame(t0), sec_to_frame(t1)
    for obj, pa, pb in ((cam, a_pos, b_pos), (target, a_look, b_look)):
        obj.location = pa
        obj.keyframe_insert('location', frame=f0)
        obj.location = pb
        obj.keyframe_insert('location', frame=f1)
        _apply_ease(obj, ease)
    return cam, target


def keyframe_loc(obj, t, loc, ease='linear'):
    """Insert a location keyframe at second t (applies ease to whole curve)."""
    obj.location = loc
    obj.keyframe_insert('location', frame=sec_to_frame(t))
    _apply_ease(obj, ease)


# ---------------------------------------------------------------------------
# Primitive helpers
# ---------------------------------------------------------------------------

def _link(obj, parent=None):
    bpy.context.collection.objects.link(obj)
    if parent is not None:
        obj.parent = parent
    return obj


def _box(name, size, loc, mat, rot=(0, 0, 0), parent=None):
    mesh = bpy.data.meshes.new(name)
    obj = bpy.data.objects.new(name, mesh)
    import bmesh
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bm.to_mesh(mesh)
    bm.free()
    obj.scale = size
    obj.location = loc
    obj.rotation_euler = rot
    obj.data.materials.append(mat)
    return _link(obj, parent)


def _sphere(name, radius, loc, mat, scale=(1, 1, 1), parent=None, segments=20):
    mesh = bpy.data.meshes.new(name)
    obj = bpy.data.objects.new(name, mesh)
    import bmesh
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=segments, v_segments=max(segments // 2, 8),
                              radius=radius)
    for f in bm.faces:
        f.smooth = True
    bm.to_mesh(mesh)
    bm.free()
    obj.scale = scale
    obj.location = loc
    obj.data.materials.append(mat)
    return _link(obj, parent)


def _cylinder(name, radius, depth, loc, mat, rot=(0, 0, 0), parent=None, segments=16):
    mesh = bpy.data.meshes.new(name)
    obj = bpy.data.objects.new(name, mesh)
    import bmesh
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=segments,
                          radius1=radius, radius2=radius, depth=depth)
    for f in bm.faces:
        f.smooth = len(f.verts) == 4  # smooth sides, flat caps
    bm.to_mesh(mesh)
    bm.free()
    obj.location = loc
    obj.rotation_euler = rot
    obj.data.materials.append(mat)
    return _link(obj, parent)


def _root(name, pos):
    root = bpy.data.objects.new(name, None)
    root.location = pos
    return _link(root)


# ---------------------------------------------------------------------------
# Ingredients  (mirrors src/studio/ingredients/)
# ---------------------------------------------------------------------------

def ground_height(x, y, hill=2.0):
    """Height of the default hilly ground at (x, y) — keep in sync with add_ground."""
    d2 = (x * x + y * y) / (18.0 ** 2)
    return hill * math.exp(-d2) + 0.30 * math.sin(x * 0.33) * math.cos(y * 0.27)


def add_ground(size=70, subdivisions=110, hill=2.0, color=(0.10, 0.16, 0.13)):
    """Gently hilly grass ground; use ground_height(x, y) to place things on it."""
    mesh = bpy.data.meshes.new('Ground')
    obj = bpy.data.objects.new('Ground', mesh)
    import bmesh
    bm = bmesh.new()
    bmesh.ops.create_grid(bm, x_segments=subdivisions, y_segments=subdivisions,
                          size=size / 2)
    for v in bm.verts:
        v.co.z = ground_height(v.co.x, v.co.y, hill)
    for f in bm.faces:
        f.smooth = True
    bm.to_mesh(mesh)
    bm.free()
    obj.data.materials.append(toon_material('GroundToon', color, bands=4, shade=0.45))
    return _link(obj)


def add_hanok(pos, rot=0.0, scale=1.0, lit_window=True):
    """Simple traditional Korean house: stone base, beige walls, dark posts,
    layered slab roof with upturned eaves, optional warm glowing window."""
    root = _root('Hanok', pos)
    root.rotation_euler = (0, 0, rot)
    root.scale = (scale, scale, scale)

    stone = toon_material('HanokStone', (0.42, 0.40, 0.38), bands=3)
    wall = toon_material('HanokWall', (0.82, 0.72, 0.55), bands=3)
    wood = toon_material('HanokWood', (0.30, 0.16, 0.10), bands=3)
    tile = toon_material('HanokTile', (0.13, 0.16, 0.22), bands=3, shade=0.4)

    _box('base', (3.6, 2.8, 0.35), (0, 0, 0.18), stone, parent=root)
    _box('walls', (3.0, 2.2, 1.5), (0, 0, 1.1), wall, parent=root)
    # corner posts
    for sx in (-1, 1):
        for sy in (-1, 1):
            _box('post', (0.18, 0.18, 1.6), (sx * 1.45, sy * 1.05, 1.15), wood,
                 parent=root)
    _box('door', (0.7, 0.06, 1.0), (0, -1.13, 0.9), wood, parent=root)
    if lit_window:
        win = emissive_material('HanokWindow', (1.0, 0.72, 0.35), strength=6.0)
        _box('window', (0.6, 0.05, 0.55), (0.95, -1.14, 1.15), win, parent=root)
        _box('window2', (0.6, 0.05, 0.55), (-0.95, -1.14, 1.15), win, parent=root)

    # roof: two big slabs meeting at a ridge + upturned eave slabs (giwa curve)
    slab = (2.2, 3.4, 0.12)
    pitch = math.radians(24)
    for s in (-1, 1):
        _box('roofSlab', slab, (s * 0.95, 0, 2.32), tile,
             rot=(0, s * pitch, 0), parent=root)
        _box('roofEave', (0.75, 3.6, 0.10), (s * 1.95, 0, 1.94), tile,
             rot=(0, s * pitch * 0.35, 0), parent=root)
    _box('ridge', (0.35, 3.5, 0.18), (0, 0, 2.80), tile, parent=root)
    return root


def add_figure(pos, scale=1.0, color=(0.83, 0.66, 0.20)):
    """Stylized humanoid from primitives (capsule torso, sphere head, limb
    capsules). Returns the root empty — keyframe its location to move it."""
    root = _root('Figure', pos)
    root.scale = (scale, scale, scale)
    mat = toon_material(f'FigureToon_{len(bpy.data.materials)}', color, bands=3)

    # torso capsule = squashed sphere over a short cylinder
    _cylinder('torso', 0.22, 0.55, (0, 0, 1.05), mat, parent=root)
    _sphere('chest', 0.24, (0, 0, 1.32), mat, scale=(1, 0.8, 0.9), parent=root)
    _sphere('hips', 0.21, (0, 0, 0.80), mat, parent=root)
    _sphere('head', 0.185, (0, 0, 1.68), mat, parent=root)
    for s in (-1, 1):  # arms
        _cylinder('arm', 0.065, 0.55, (s * 0.30, 0, 1.10), mat,
                  rot=(0, s * math.radians(12), 0), parent=root)
        _sphere('hand', 0.075, (s * 0.36, 0, 0.82), mat, parent=root)
    for s in (-1, 1):  # legs
        _cylinder('leg', 0.085, 0.75, (s * 0.13, 0, 0.40), mat, parent=root)
        _sphere('foot', 0.09, (s * 0.13, -0.05, 0.05), mat,
                scale=(1, 1.5, 0.7), parent=root)
    return root


def add_tree(pos, scale=1.0, canopy_color=(0.06, 0.14, 0.10)):
    root = _root('Tree', pos)
    root.scale = (scale, scale, scale)
    trunk = toon_material('TreeTrunk', (0.22, 0.13, 0.08), bands=3)
    leaf = toon_material(f'TreeLeaf_{len(bpy.data.materials)}', canopy_color,
                         bands=3, shade=0.5)
    _cylinder('trunk', 0.16, 1.6, (0, 0, 0.8), trunk, parent=root)
    _sphere('canopy1', 0.95, (0, 0, 2.1), leaf, scale=(1, 1, 0.85), parent=root)
    _sphere('canopy2', 0.65, (0.55, 0.25, 2.6), leaf, parent=root)
    _sphere('canopy3', 0.55, (-0.5, -0.15, 2.5), leaf, parent=root)
    return root


def add_lantern(pos, strength=30.0, color=(1.0, 0.62, 0.22), post=True):
    """Glowing paper lantern (emissive body + real point light so it
    illuminates its surroundings even at low Cycles samples)."""
    root = _root('Lantern', pos)
    wood = toon_material('LanternWood', (0.26, 0.15, 0.09), bands=2)
    # keep the paper glow modest so it reads as a warm lantern, not a white
    # blob — the point light inside does the actual illuminating
    paper = emissive_material(f'LanternPaper_{len(bpy.data.materials)}',
                              color, strength=max(strength * 0.09, 2.0))
    cap = toon_material('LanternCap', (0.12, 0.08, 0.06), bands=2)

    z = 0.0
    if post:
        _cylinder('post', 0.05, 1.7, (0, 0, 0.85), wood, parent=root)
        _cylinder('arm', 0.035, 0.5, (0.20, 0, 1.68), wood,
                  rot=(0, math.radians(90), 0), parent=root)
        z = 1.35
        lx = 0.42
    else:
        lx = 0.0
    body = _sphere('paper', 0.17, (lx, 0, z), paper, scale=(1, 1, 1.3), parent=root)
    _cylinder('capTop', 0.08, 0.06, (lx, 0, z + 0.25), cap, parent=root)
    _cylinder('capBot', 0.08, 0.06, (lx, 0, z - 0.25), cap, parent=root)

    light = bpy.data.lights.new('LanternLight', type='POINT')
    light.color = color
    light.energy = strength
    light.shadow_soft_size = 0.25
    lobj = bpy.data.objects.new('LanternLight', light)
    lobj.location = (lx, 0, z)
    _link(lobj, parent=root)
    return root, body


def add_moon(pos=(-16, 34, 17), radius=2.1, strength=4.0):
    mat = emissive_material('Moon', (0.92, 0.94, 1.0), strength=strength)
    return _sphere('Moon', radius, pos, mat, segments=24)


def add_stars(count=90, radius=48, seed=7):
    """Tiny emissive spheres on the upper sky dome."""
    import random
    rnd = random.Random(seed)
    mat = emissive_material('Star', (0.85, 0.90, 1.0), strength=10.0)
    root = _root('Stars', (0, 0, 0))
    for i in range(count):
        az = rnd.uniform(0, 2 * math.pi)
        el = rnd.uniform(math.radians(8), math.radians(75))
        r = radius * rnd.uniform(0.9, 1.0)
        p = (r * math.cos(el) * math.cos(az), r * math.cos(el) * math.sin(az),
             r * math.sin(el))
        s = rnd.uniform(0.10, 0.26)
        _sphere(f'star{i}', s, p, mat, parent=root, segments=8)
    return root
