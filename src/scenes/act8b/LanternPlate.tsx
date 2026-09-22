/**
 * The Plate — `?act=8b-plate`. A deliberate match of the lantern-festival
 * reference frame, built to be measured against it rather than admired.
 *
 * The earlier air tests (`8b-air*`) got the SHAPES right and still looked
 * nothing like the reference, because the three things that actually make that
 * image are none of them lantern design:
 *
 *   DEPTH OF FIELD. Almost nothing in the plate is sharp. A near lantern is a
 *     soft luminous blob a sixth of the frame tall with no readable silhouette;
 *     the mid-field is gently soft; only a band around 25 m is crisp. Rendering
 *     the same field pin-sharp reads as confetti, which is exactly what the
 *     air tests read as.
 *   THE SKY IS NOT BLACK. Sampled off the plate, the gaps between lanterns sit
 *     at rgb(82,40,48) — a plum with more blue in it than green — and where the
 *     swarm is dense the overlapping bokeh washes the background up past
 *     rgb(134,64,50). We were rendering onto near-black.
 *   THE WATER. The bottom quarter is a mirror, and it is nearly as bright as
 *     the sky above it. Without it the composition has no floor.
 *
 * So the geometry here is laid out in SCREEN terms — pick a bearing and an
 * elevation inside the frustum, pick a distance, convert — because a plate
 * match is a composition problem, and world-space scatter cannot be aimed.
 * `PITCH` puts the waterline at 75.5% of frame height, where the reference has
 * it, and the vertical framing is independent of viewport width because `fov`
 * is vertical.
 *
 * Screenshot it at the plate's own aspect or the comparison is meaningless:
 *
 *   node scripts/shot.mjs --act 8b-plate --t 8 --size 1080x569
 *
 * Nothing in 8b imports this.
 */
import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Bloom, DepthOfField, EffectComposer, Vignette } from '@react-three/postprocessing'
import * as THREE from 'three'
import { getAnimTime } from '../../hooks/useAnimTime'
import { seededRandom } from '../act8_55/constants'
import { SceneCanvas } from '../SceneCanvas'
import {
  COLOR_MIX, PLATE_COLORS, PLATE_ENVELOPE, TANGLED,
  buildLanternGeometry, makeEnvelopeMaterial,
} from './lanternShapes'

/* ── The camera, which fixes the composition ─────────────────────── */

/** Vertical fov. The plate is a longish lens — the depth is compressed. */
const VFOV = 36
const TAN_HALF = Math.tan((VFOV / 2) * Math.PI / 180)
/**
 * Eye height above the water, and it matters far more than it sounds. A
 * lantern at height `h` and horizontal distance `dh` reflects at an angle
 * `(h + c)/dh` below the horizon while sitting `(h − c)/dh` above it, so the
 * reflection is pushed DOWN the frame by `2c/dh` — a whole degree and a half
 * at 100 m for a camera at 1.3. Raise the eye and the water stops mirroring
 * the sky and starts showing a stretched, thinned version of it with an empty
 * band under the horizon. The reference is shot from a boat, inches up.
 */
const CAM_Y = 0.3
/**
 * Tilt up, which pushes the horizon DOWN the frame. Solved rather than dialled:
 * the waterline in the reference sits at 75.5% of frame height, i.e. ndc
 * −0.510, and the eye-level line lands at `−tan(PITCH)/tan(fov/2)`.
 */
const WATERLINE = 0.755
const PITCH = Math.atan((2 * WATERLINE - 1) * TAN_HALF)

/** Bearing spread. Wider than a 1.9:1 frame needs, so 2.4:1 still fills. */
const PHI_MAX = 0.68

/**
 * How thick the swarm is down the frame — read off the reference rather than
 * dialled. Its per-row means, minus a background floor, run
 *
 *   0.075 → 86    0.225 → 115    0.375 → 137    0.525 → 118    0.68 → 72
 *
 * normalised here. Apparent lantern size does not vary with elevation, so
 * brightness down the frame IS density down the frame, and this is the only
 * part of the composition that can be lifted off the plate directly.
 *
 * Sampling happens in FRAME fraction and converts to an elevation afterwards,
 * because the two are related by a tangent and any distribution shaped in
 * angle lands somewhere else on the page.
 */
const DENSITY: [number, number][] = [
  [0.000, 0.12], [0.075, 0.26], [0.225, 0.70], [0.375, 0.95],
  [0.525, 1.00], [0.680, 0.97], [0.748, 0.88],
]
const FRAC_LOW = DENSITY[0][0]
const FRAC_HIGH = DENSITY[DENSITY.length - 1][0]

function densityAt(frac: number): number {
  for (let i = 1; i < DENSITY.length; i++) {
    if (frac <= DENSITY[i][0]) {
      const [f0, d0] = DENSITY[i - 1]
      const [f1, d1] = DENSITY[i]
      return d0 + (d1 - d0) * (frac - f0) / (f1 - f0)
    }
  }
  return DENSITY[DENSITY.length - 1][1]
}

/** Rejection sampling — the curve peaks at 1, so it accepts about 3 in 4. */
function sampleFrac(rand: () => number): number {
  for (let i = 0; i < 40; i++) {
    const f = FRAC_LOW + rand() * (FRAC_HIGH - FRAC_LOW)
    if (rand() < densityAt(f)) return f
  }
  return 0.375
}

/** Frame fraction → elevation above the horizon, in radians. */
function fracToTheta(frac: number): number {
  return PITCH + Math.atan((1 - 2 * frac) * TAN_HALF)
}

const COUNT = 900

/**
 * The reference's lanterns are WIDER THAN TALL — squat rounded boxes, not the
 * upright capsules the catalogue draws. Applied as a non-uniform instance scale
 * rather than by editing the profiles, so the sheets keep their own proportions.
 */
const WIDE = 1.34
const TALL = 0.9

/** Where the flat near half hands over to the volume-sampled far half. */
const D_MID3 = 60 ** 3
const D_MAX3 = 130 ** 3

/* ── Palette ─────────────────────────────────────────────────────── */

/** Shape mix: mostly the tall and the plain box, a few rounder ones. */
const SHAPE_MIX = [0, 0, 0, 0, 3, 3, 3, 1, 1, 2, 2, 4, 5]

/**
 * Brightness roll. Wide, because the plate's lanterns are visibly uneven.
 *
 * This, not the count, is the overall exposure control. The envelopes are
 * opaque, so past about half coverage another thousand lanterns mostly hide the
 * ones behind them: going from 800 to 900 moved the frame mean by one part in a
 * hundred and nothing else.
 */
const LIT_LOW = 0.86
const LIT_HIGH = 1.78

/**
 * How much of the sky the water gives back. Over 1, which is not physics: at
 * grazing incidence still water really does return almost everything, but the
 * reference's water band is lit by things this scene does not contain — a boat,
 * two people and the one lantern they are holding, all of it close and bright
 * and none of it reflected here. This is the compensation, and it is the only
 * number on the page that is not derived from something.
 */
const REFLECT = 1.65

/** How far ripples pull a reflection down the frame. */
const RIPPLE_SMEAR = 1.5

/**
 * The catalogue shapes, adapted for a sky this size.
 *
 * Decimated to twenty segments, because at eighteen hundred lanterns of which
 * the largest is out of focus and the typical one is ten pixels tall, the extra
 * facets are three million triangles nobody can see.
 *
 * CLOSED at the mouth, and STRUTLESS. The catalogue leaves the mouth open and
 * draws four struts, which is what a lantern is and reads correctly on a sheet
 * you look at straight on. This camera is tilted UP into a swarm entirely above
 * it, so every lantern is seen from underneath — and struts converging on the
 * axis of a shape viewed down its own pole are a rosette. Fifteen hundred of
 * them at six pixels each came out as a field of tiny spirographs.
 *
 * Blown up, the reference's lanterns are smooth to the point of being featureless:
 * a soft rounded-square silhouette, bright along the bottom where the flame is,
 * falling off toward the top, and no interior detail whatsoever. All the
 * character is in the shape and the falloff.
 */
const PLATE_DESIGNS = TANGLED.map(d => {
  const [rEnd, yEnd] = d.profile[d.profile.length - 1]
  return {
    ...d,
    segments: Math.min(d.segments, 20),
    ribs: 0,
    // A shallow DOME, not a flat cap. A flat annulus shares its outer ring of
    // vertices with the bottom of the side wall, so `computeVertexNormals`
    // hands those vertices the average of a downward normal and a sideways one
    // — and on a squircle the sideways one varies around the circumference.
    // Interpolate that across twenty triangles converging on a pole and every
    // lantern in the frame wears a twenty-armed spirograph. Curving the
    // underside instead keeps the surface continuous, which is why the crown
    // never had the problem. Costs 0.04 of depth and nothing in silhouette.
    profile: [
      ...d.profile,
      [rEnd * 0.80, yEnd - 0.018],
      [rEnd * 0.48, yEnd - 0.032],
      [rEnd * 0.16, yEnd - 0.039],
      [0.004, yEnd - 0.041],
    ] as [number, number][],
  }
})

/* ── The field ───────────────────────────────────────────────────── */

type Lantern = {
  design: number
  x: number
  z: number
  /** Wrap band, chosen per lantern so it never leaves its slot in frame. */
  yMin: number
  yMax: number
  y0: number
  speed: number
  drift: number
  driftRate: number
  scale: number
  yaw: number
  spin: number
  rock: number
  phase: number
  color: THREE.Color
}

function buildField(): Lantern[] {
  const rand = seededRandom(80417)
  const out: Lantern[] = []
  // Clumps. A crowd releases lanterns in handfuls from wherever people are
  // standing, and the reference has that all over it — knots of eight or ten
  // with real holes of plum sky between them. An even scatter at this density
  // has no holes at any scale and reads as wallpaper, which is the single
  // biggest thing still separating a numerically-matched frame from the plate.
  const clumps = Array.from({ length: 26 }, () => ({
    phi: (Math.pow(rand(), 0.86) - 0.5) * 2 * PHI_MAX,
    frac: sampleFrac(rand),
  }))
  for (let i = 0; i < COUNT; i++) {
    // Distance. Two populations, and the split is load-bearing.
    //
    // A pure volume draw (count in a shell ∝ d², the physically honest one)
    // over 16–130 m puts ONE PERCENT of the field closer than 30 m: the sky
    // comes out as a uniform haze of four-pixel dots with nothing in it you
    // could call a lantern. A flat or log-uniform draw goes the other way and
    // makes everything the same size on screen. The reference has both — a
    // legion of tiny ones AND a readable middle distance — so the near half is
    // drawn flat across 16–60 m and the far half by volume beyond it.
    const mid = rand() < 0.35
    const d = mid
      ? 16 + rand() * 44
      : Math.cbrt(D_MID3 + rand() * (D_MAX3 - D_MID3))
    // Bearing and elevation: three in five join a clump, the rest fill in
    // between. The scatter half keeps a mild lean to the right, because a
    // perfectly balanced frame is another way of looking like wallpaper.
    let phi: number
    let frac: number
    if (rand() < 0.6) {
      const c = clumps[Math.floor(rand() * clumps.length)]
      phi = c.phi + (rand() - 0.5) * 0.3
      frac = Math.min(FRAC_HIGH, Math.max(FRAC_LOW, c.frac + (rand() - 0.5) * 0.16))
    } else {
      phi = (Math.pow(rand(), 0.86) - 0.5) * 2 * PHI_MAX
      frac = sampleFrac(rand)
    }
    const th = fracToTheta(frac)
    const dh = d * Math.cos(th)
    const lit = LIT_LOW + rand() * (LIT_HIGH - LIT_LOW)
    const hex = PLATE_COLORS[COLOR_MIX[Math.floor(rand() * COLOR_MIX.length)]]
    out.push({
      design: SHAPE_MIX[Math.floor(rand() * SHAPE_MIX.length)],
      x: dh * Math.sin(phi),
      z: -dh * Math.cos(phi),
      // Wrap band: the slot this lantern occupies on the page, so a lifetime of
      // rising never changes where in the composition it contributes.
      yMin: CAM_Y + d * Math.sin(fracToTheta(FRAC_HIGH)) - 0.6,
      yMax: CAM_Y + d * Math.sin(fracToTheta(FRAC_LOW)) + 0.6,
      y0: CAM_Y + d * Math.sin(th),
      // Rise rate scaled by distance, so every lantern climbs at roughly the
      // same rate ON SCREEN and the fitted density profile survives the shot.
      // At a real 0.5 m/s a lantern 25 m out crosses a third of the frame in
      // twenty seconds and the composition measured above stops being the
      // composition you are looking at. About 5% of frame height per twenty
      // seconds — a swarm that is plainly moving and still the same picture.
      speed: d * (0.003 + rand() * 0.0035),
      drift: 0.14 + rand() * 0.5,
      driftRate: 0.1 + rand() * 0.26,
      // Smaller than feels right in isolation. Measured, the reference's blown
      // cores are 6–7 px across against our 13, at the same total blown AREA —
      // it is not a brighter sky, it is twice as many lanterns at half the size.
      scale: 0.58 + rand() * 0.42,
      yaw: rand() * Math.PI * 2,
      spin: (rand() - 0.5) * 0.12,
      rock: 0.03 + rand() * 0.08,
      phase: rand() * Math.PI * 2,
      color: new THREE.Color(hex).multiplyScalar(lit),
    })
  }
  return out
}

const DUMMY = new THREE.Object3D()

/**
 * One `InstancedMesh` per design, and a mirrored twin of each for the water.
 *
 * Instanced rather than a mesh apiece because the sky is fifteen hundred
 * lanterns once the reflections are counted, and because per-instance colour is
 * the only way to roll brightness per lantern without a shader compile each —
 * which is what the earlier air tests were quietly doing, at a minute of stall
 * before the first frame.
 */
function Swarm() {
  const field = useMemo(() => buildField(), [])
  const buckets = useMemo(
    () => PLATE_DESIGNS.map((_, di) => field.filter(l => l.design === di)), [field])
  // Twenty segments, not the catalogue's thirty-six: at three thousand
  // lanterns of which the largest is out of focus and the typical one is ten
  // pixels tall, the extra facets are three million triangles nobody can see.
  const geometries = useMemo(
    () => PLATE_DESIGNS.map(buildLanternGeometry), [])
  const materials = useMemo(
    () => PLATE_DESIGNS.map(d => makeEnvelopeMaterial('#FFFFFF', 1, d, PLATE_ENVELOPE)), [])
  const skyRefs = useRef<(THREE.InstancedMesh | null)[]>([])
  const waterRefs = useRef<(THREE.InstancedMesh | null)[]>([])

  // Colour never changes; write it once. The water gets the same colours pulled
  // down — a reflection is the sky minus what the surface swallows, not a
  // different palette.
  useLayoutEffect(() => {
    buckets.forEach((items, di) => {
      const sky = skyRefs.current[di]
      const water = waterRefs.current[di]
      items.forEach((l, k) => {
        sky?.setColorAt(k, l.color)
        water?.setColorAt(k, DUMMY_COLOR.copy(l.color).multiplyScalar(REFLECT))
      })
      if (sky?.instanceColor) sky.instanceColor.needsUpdate = true
      if (water?.instanceColor) water.instanceColor.needsUpdate = true
    })
  }, [buckets])

  useFrame(() => {
    const t = getAnimTime()
    buckets.forEach((items, di) => {
      const sky = skyRefs.current[di]
      const water = waterRefs.current[di]
      if (!sky) return
      for (let k = 0; k < items.length; k++) {
        const l = items[k]
        const span = l.yMax - l.yMin
        const y = l.yMin + (((l.y0 - l.yMin + t * l.speed) % span) + span) % span
        DUMMY.position.set(l.x + Math.sin(t * l.driftRate + l.phase) * l.drift, y, l.z)
        DUMMY.rotation.set(
          Math.sin(t * 0.42 + l.phase) * l.rock,
          l.yaw + t * l.spin,
          Math.cos(t * 0.31 + l.phase * 1.4) * l.rock * 0.8,
          'YXZ',
        )
        DUMMY.scale.set(l.scale * WIDE, l.scale * TALL, l.scale * WIDE)
        DUMMY.updateMatrix()
        sky.setMatrixAt(k, DUMMY.matrix)
        if (water) {
          // Same place, smeared vertically. Still water would put an exact copy
          // down there and leave a dead strip under the horizon, because a
          // lantern's mirror sits further from the waterline than the lantern
          // does. Real water has ripples, and what ripples do to a reflection is
          // stretch it down the frame — which fills the strip, reads as water
          // rather than as a flipped photograph, and costs one scale term.
          DUMMY.scale.set(l.scale * WIDE, l.scale * TALL * RIPPLE_SMEAR, l.scale * WIDE)
          DUMMY.updateMatrix()
          water.setMatrixAt(k, DUMMY.matrix)
        }
      }
      sky.instanceMatrix.needsUpdate = true
      if (water) water.instanceMatrix.needsUpdate = true
    })
  })

  return (
    <>
      {buckets.map((items, di) => items.length === 0 ? null : (
        <instancedMesh
          key={`sky${di}`}
          ref={m => { skyRefs.current[di] = m }}
          args={[geometries[di], materials[di], items.length]}
          frustumCulled={false}
        />
      ))}
      {/* The water. Every lantern sits above eye level by construction, so its
          mirror is always below the horizon — no clipping needed, and none of
          this can leak into the sky. */}
      <group scale={[1, -1, 1]}>
        {buckets.map((items, di) => items.length === 0 ? null : (
          <instancedMesh
            key={`water${di}`}
            ref={m => { waterRefs.current[di] = m }}
            args={[geometries[di], materials[di], items.length]}
            frustumCulled={false}
          />
        ))}
      </group>
    </>
  )
}

const DUMMY_COLOR = new THREE.Color()

/* ── The near ones ───────────────────────────────────────────────── */

/**
 * The handful of giants — and they are not lanterns, they are cards.
 *
 * The reference's most recognisable feature is the two or three lanterns close
 * enough to the lens to have lost their outline completely: soft luminous
 * shapes a sixth of the frame tall with no edge you could point at. That is
 * ordinary defocus, and there is no way to get it out of this post chain,
 * because postprocessing's bokeh pass finishes with a SIXTEEN-tap max filter.
 * Past `bokehScale` 3 that filter stops reading as blur and starts drawing its
 * own kernel — every small bright lantern in the frame acquires a little
 * spirograph — so the scale that the giants need is a scale the rest of the sky
 * cannot survive.
 *
 * So the giants are authored soft instead of blurred soft: a camera-facing quad
 * carrying a squircle with a wide gradient edge, which is what an out-of-focus
 * lantern looks like anyway. They write no depth, so the defocus pass leaves
 * them alone, and Bloom still takes them.
 */
const NEAR_COUNT = 6

function makeBlobTexture(): THREE.CanvasTexture {
  const N = 192
  const canvas = document.createElement('canvas')
  canvas.width = N
  canvas.height = N
  const ctx = canvas.getContext('2d')!
  const img = ctx.createImageData(N, N)
  for (let j = 0; j < N; j++) {
    for (let i = 0; i < N; i++) {
      const x = (i / (N - 1)) * 2 - 1
      const y = (j / (N - 1)) * 2 - 1
      // Superellipse radius: the rounded-square section, seen face on.
      // Exponent 2.6, not 4: at 4 the card keeps straight sides and reads as
      // exactly what it is. A defocused lantern this close has almost no
      // corners left.
      const q = Math.pow(Math.abs(x) ** 2.6 + Math.abs(y * 0.88) ** 2.6, 1 / 2.6)
      // A wide gradient edge — this IS the defocus. A hard edge here and the
      // card reads as a card.
      const a = 1 - smootherstep(0.12, 1.0, q)
      // Hotter low, as the flame is; and hotter in the middle, where you are
      // looking straight through the paper at it.
      const v = (1 - 0.22 * smootherstep(0.0, 1.0, q)) * (1 - 0.26 * (y * 0.5 + 0.5))
      const o = (j * N + i) * 4
      img.data[o] = 255 * Math.min(1, v)
      img.data[o + 1] = 255 * Math.min(1, v)
      img.data[o + 2] = 255 * Math.min(1, v)
      img.data[o + 3] = 255 * Math.max(0, a)
    }
  }
  ctx.putImageData(img, 0, 0)
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

function smootherstep(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * t * (t * (t * 6 - 15) + 10)
}

function NearBokeh() {
  const texture = useMemo(() => makeBlobTexture(), [])
  const items = useMemo(() => {
    const rand = seededRandom(4471)
    return Array.from({ length: NEAR_COUNT }, () => {
      const d = 4.5 + Math.pow(rand(), 0.8) * 9
      // Kept off the very top of the frame: the reference hangs its giants
      // through the middle and low, where they overlap the mass.
      const th = fracToTheta(0.12 + rand() * 0.62)
      const phi = (rand() - 0.5) * 2 * PHI_MAX * 1.1
      const dh = d * Math.cos(th)
      // Its own lantern size, plus the spread that being out of focus adds.
      const size = (0.52 + rand() * 0.4) * 1.28
      return {
        pos: [dh * Math.sin(phi), CAM_Y + d * Math.sin(th), -dh * Math.cos(phi)] as const,
        size,
        // Dimmer than the field. A giant covers a hundred times the area of a
        // mid-field lantern, and at the same brightness it is a searchlight;
        // the reference's biggest are among its softest and palest.
        // Bright, and off the pale end. These get no hot core of their own —
        // they are a texture, not a shaded solid — so at field brightness they
        // come out as brown smoke rather than as something lit.
        color: new THREE.Color(PLATE_COLORS[2 + Math.floor(rand() * 3)])
          .multiplyScalar(1.0 + rand() * 0.35),
        drift: 0.1 + rand() * 0.3,
        driftRate: 0.08 + rand() * 0.18,
        speed: d * 0.004,
        phase: rand() * Math.PI * 2,
      }
    })
  }, [])

  const group = useRef<THREE.Group>(null)
  useFrame(({ camera }) => {
    const g = group.current
    if (!g) return
    const t = getAnimTime()
    g.children.forEach((child, i) => {
      const it = items[i]
      child.position.set(
        it.pos[0] + Math.sin(t * it.driftRate + it.phase) * it.drift,
        it.pos[1] + t * it.speed,
        it.pos[2],
      )
      child.quaternion.copy(camera.quaternion)
    })
  })

  return (
    <group ref={group} renderOrder={4}>
      {items.map((it, i) => (
        <mesh key={i}>
          <planeGeometry args={[it.size * WIDE, it.size * TALL * 1.18]} />
          <meshBasicMaterial
            map={texture} color={it.color} transparent depthWrite={false}
            toneMapped={false} opacity={0.85}
          />
        </mesh>
      ))}
    </group>
  )
}

/* ── The sky behind it ───────────────────────────────────────────── */

/**
 * A gradient locked to the camera, authored in FRAME coordinates rather than
 * world ones, because the thing being matched is a picture. Stops come off the
 * reference's own per-row background samples: plum at the top, warming through
 * the body of the swarm, then the near-black water below the line.
 *
 * Deliberately a stop or two under those samples — most of the lift in the
 * plate's background is bloom off the lanterns, and this render generates its
 * own.
 */
const SKY_STOPS: [number, string][] = [
  [0.00, '#4E2A38'],
  [0.15, '#562C39'],
  [0.30, '#5D2E33'],
  [0.42, '#592B2A'],
  [0.54, '#421D1E'],
  [0.66, '#220C0E'],
  [0.74, '#140507'],
  // A step, not a ramp. Still water at a distance is darker than the sky it
  // reflects, and the reference reads as a mirror mostly because there is a
  // line where one stops and the other starts.
  [WATERLINE, '#0A0304'],
  [0.86, '#080202'],
  [1.00, '#100405'],
]
const BACKDROP_DIST = 150

function Backdrop() {
  const ref = useRef<THREE.Mesh>(null)
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 4
    canvas.height = 512
    const ctx = canvas.getContext('2d')!
    const g = ctx.createLinearGradient(0, 0, 0, 512)
    SKY_STOPS.forEach(([at, hex]) => g.addColorStop(at, hex))
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 4, 512)
    const tex = new THREE.CanvasTexture(canvas)
    tex.colorSpace = THREE.SRGBColorSpace
    return tex
  }, [])

  const h = 2 * BACKDROP_DIST * TAN_HALF
  useFrame(({ camera }) => {
    const m = ref.current
    if (!m) return
    m.position.copy(camera.position)
    m.quaternion.copy(camera.quaternion)
    m.translateZ(-BACKDROP_DIST)
  })

  return (
    <mesh ref={ref} renderOrder={-10}>
      <planeGeometry args={[h * 4, h]} />
      <meshBasicMaterial map={texture} toneMapped={false} depthWrite={false} />
    </mesh>
  )
}

/* ── Camera ──────────────────────────────────────────────────────── */

/** Held on the plate's framing, with only enough drift to prove it is alive. */
function PlateCamera() {
  useFrame(({ camera }) => {
    const t = getAnimTime()
    camera.position.set(Math.sin(t * 0.07) * 0.35, CAM_Y + Math.sin(t * 0.11) * 0.12, 0)
    camera.rotation.set(PITCH, 0, 0, 'YXZ')
  })
  return null
}

/* ── The page ────────────────────────────────────────────────────── */

export default function LanternPlate() {
  return (
    <div style={{ width: '100vw', height: '100vh', background: '#160A12', overflow: 'hidden' }}>
      <SceneCanvas
        style={{ width: '100%', height: '100%' }}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.2,
          preserveDrawingBuffer: true,
        }}
        camera={{ position: [0, CAM_Y, 0], fov: VFOV, near: 0.4, far: 400 }}
        debugTarget={[0, 8, -30]}
      >
        <PlateCamera />
        <Backdrop />
        <Swarm />
        <NearBokeh />
        <EffectComposer>
          {/* Blur first, glow second — the plate's halos are halos around soft
              blobs, not sharp lanterns wearing a soft coat. */}
          {/* Two traps here, both measured rather than guessed.
              `focusRange` is a LINEAR world-space half-width in postprocessing 6,
              not a normalised one — at 28 it pinned everything past 56 m to
              maximum blur, which is most of a field running out to 130, and the
              whole sky came back as mush.
              And the bokeh blur is a fixed 64-TAP disc kernel. Push a 4-pixel
              lantern through it at a large circle of confusion and you do not get
              a soft disc, you get sixty-four discrete copies of it arranged in a
              spiral — every far lantern in the frame wearing a little
              spirograph. So focus sits DEEP in the swarm: the near heroes blur
              hard, which is what the reference does anyway, and the far field
              stays close enough to sharp that the kernel never shows. */}
          <DepthOfField
            worldFocusDistance={100} worldFocusRange={78} bokehScale={3}
            resolutionScale={1}
          />
          {/* Threshold well up: at 0.2 the dim rims bloomed too and the whole
              frame washed to cream. Bloom keeps hue, so a saturated source
              gives a saturated wash — which is what the reference's 52% of
              rgb(137,69,54) actually is. */}
          <Bloom
            intensity={1.4} luminanceThreshold={0.27} luminanceSmoothing={0.85}
            radius={0.9} mipmapBlur
          />
          <Vignette eskil={false} offset={0.3} darkness={0.38} />
        </EffectComposer>
      </SceneCanvas>
    </div>
  )
}
