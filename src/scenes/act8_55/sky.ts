/**
 * Act 8.5 — sky math. Pure data + functions, no React.
 *
 * Real J2000 star positions (RA decimal hours, Dec decimal degrees, visual
 * magnitude) for every constellation, projected gnomonically onto the scene's
 * sky dome so the SHAPES are astronomically correct while placement/scale in
 * the frame stay artistic.
 *
 * The sky (all verified against standard catalogs):
 *  - 북두칠성 Bukduchilseong (Big Dipper) — the Seven. Chilseong-shin: the
 *    seven gods of fate and lifespan; the most-painted motif on Goguryeo
 *    tomb ceilings (north side). Alcor rides beside Mizar — the quiet 8th.
 *  - 삼태성 Samtaeseong — three star-pairs (ι/κ, λ/μ, ν/ξ UMa), the "three
 *    steps" guarding the celestial palace.
 *  - 북극성 Polaris — the still point. Center of the Cheonsang Yeolcha
 *    Bunyajido (1395) star chart, echoed by the graticule at the end.
 *  - Cassiopeia — circumpolar from Korea, opposite the Dipper across the pole.
 *  - 직녀성 Jiknyeo (Vega) & 견우성 Gyeonwoo (Altair) — the Chilseok lovers
 *    on opposite banks of the 은하수 (Milky Way), Deneb the celestial ford
 *    (천진) between them. The Ojakgyo magpie bridge shimmers across at the end.
 *  - 남두육성 Namdu-yukseong (Southern Dipper, in Sagittarius) — low in the
 *    south where the river meets the horizon. The Southern Dipper registers
 *    births as the Northern registers deaths — painted opposite each other
 *    in Goguryeo tombs.
 *
 * And one that is not in any catalog:
 *  - 삿갓 the satgat. The hat the parent has worn since the road home —
 *    `PARENT_HAT`, on the figure standing at the door in this very shot —
 *    drawn in the sky above the valley it was worn across. Its outline is
 *    read off the hat's own lathe profile (`satgatOutline`), so it is that
 *    object and not a lookalike. See `SATGAT` below.
 */
import { satgatOutline } from '../characters/goldFigure/hats'
import {
  SKY_CENTER, SKY_R, STAR_WARM, STAR_WHITE, STAR_PURPLE, STAR_BLUE, GOLD_BRIGHT, PARENT_WARM,
} from './constants'

export type StarDef = { ra: number; dec: number; mag: number }
export type Vec3 = [number, number, number]

/* ── Catalogs (J2000) ────────────────────────────────────────────── */

// Dubhe, Merak, Phecda, Megrez, Alioth, Mizar, Alkaid
export const BIG_DIPPER: StarDef[] = [
  { ra: 11.062, dec: 61.751, mag: 1.79 },
  { ra: 11.031, dec: 56.383, mag: 2.37 },
  { ra: 11.897, dec: 53.695, mag: 2.44 },
  { ra: 12.257, dec: 57.033, mag: 3.31 },
  { ra: 12.900, dec: 55.960, mag: 1.77 },
  { ra: 13.399, dec: 54.925, mag: 2.27 },
  { ra: 13.792, dec: 49.313, mag: 1.86 },
]
export const BIG_DIPPER_LINES: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 0], [3, 4], [4, 5], [5, 6],
]
/** Alcor — Mizar's faint companion. Fades in last: the 8th, beside the Seven. */
export const ALCOR: StarDef = { ra: 13.421, dec: 54.988, mag: 3.99 }

// Caph, Schedar, Tsih, Ruchbah, Segin (the W, in W-order)
export const CASSIOPEIA: StarDef[] = [
  { ra: 0.153, dec: 59.150, mag: 2.28 },
  { ra: 0.675, dec: 56.537, mag: 2.24 },
  { ra: 0.945, dec: 60.717, mag: 2.15 },
  { ra: 1.430, dec: 60.235, mag: 2.68 },
  { ra: 1.907, dec: 63.670, mag: 3.37 },
]
export const CASSIOPEIA_LINES: [number, number][] = [[0, 1], [1, 2], [2, 3], [3, 4]]

// ι/κ (상태), λ/μ (중태), ν/ξ (하태) UMa — three tight pairs
export const SAMTAE: StarDef[] = [
  { ra: 8.987, dec: 48.042, mag: 3.14 },
  { ra: 9.060, dec: 47.157, mag: 3.56 },
  { ra: 10.285, dec: 42.914, mag: 3.45 },
  { ra: 10.372, dec: 41.499, mag: 3.06 },
  { ra: 11.308, dec: 33.094, mag: 3.49 },
  { ra: 11.303, dec: 31.529, mag: 3.79 },
]
export const SAMTAE_LINES: [number, number][] = [[0, 1], [2, 3], [4, 5]]

// μ, λ (Kaus Borealis), φ, σ (Nunki), τ, ζ (Ascella) Sgr — the milk dipper
export const NAMDU: StarDef[] = [
  { ra: 18.230, dec: -21.059, mag: 3.85 },
  { ra: 18.466, dec: -25.421, mag: 2.82 },
  { ra: 18.762, dec: -26.991, mag: 3.17 },
  { ra: 19.078, dec: -26.297, mag: 2.05 },
  { ra: 19.117, dec: -27.670, mag: 3.32 },
  { ra: 19.043, dec: -29.880, mag: 2.59 },
]
export const NAMDU_LINES: [number, number][] = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 2]]

/* ── 삿갓 — not a catalog, an object ──────────────────────────────── */

/**
 * The hat, as a glyph: ten points on the outline of `PARENT_HAT`.
 *
 * Two slope stars a side and three under the brim. Fewer and the crown is a
 * straight line and the whole thing reads as a shallow chevron; more and the
 * points sit closer together than the ordinary stars around them, and a
 * constellation whose stars are evenly spaced by a millimetre reads as
 * drawn-on rather than found. Ten is what the Dipper and Cassiopeia have
 * between them, which is the company it is keeping.
 */
export const SATGAT: [number, number][] = satgatOutline(2, 3, 20)

/** A closed chain, in outline order: up the left slope, over, down, and the
 *  brim last — so the progressive draw completes the hat with the brim. */
export const SATGAT_LINES: [number, number][] =
  SATGAT.map((_, i) => [i, (i + 1) % SATGAT.length] as [number, number])

/**
 * Rendered weights, apex-first in outline order. Not magnitudes — there is no
 * catalog to read — but the same scale, so the hat sits in the same range of
 * star sizes as everything else up there rather than as a row of identical
 * dots. The rim tips and the apex carry it; the brim is faintest, which is
 * what a brim does.
 */
export const SATGAT_MAGS: number[] = [
  2.0,            // left rim tip
  2.7, 2.5,       // left slope
  1.6,            // apex
  2.5, 2.7,       // right slope
  2.0,            // right rim tip
  2.9, 2.6, 2.9,  // the brim, near edge
]

/* ── ♥ — the one thing up there that is nobody's folklore ─────────── */

/**
 * A heart, off the standard parametric curve
 *
 *     x = 16 sin³t,   y = 13 cos t − 5 cos 2t − 2 cos 3t − cos 4t
 *
 * SAMPLED BY HALVES, and that is the whole trick. Walking the full curve at
 * even arc length puts no star at the cleft — it falls between two samples —
 * and a heart whose notch is a straight line between two shoulders is a
 * blob. So the tip→cleft half is sampled evenly, both ENDS included, and
 * mirrored. Ten stars: the tip, four up each flank, and the cleft, with the
 * two lobes landing on samples 4 and 6 by construction. Both lobes are then
 * identical to the last digit, which matters more here than in a catalog —
 * a lopsided Cassiopeia reads as a real sky, a lopsided heart reads as a
 * mistake.
 *
 * The curve is about 32 across and 29 tall; callers normalise.
 */
export function heartOutline(halfSteps = 5): [number, number][] {
  const f = (t: number): [number, number] => [
    16 * Math.pow(Math.sin(t), 3),
    13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t),
  ]
  // t ∈ [π, 2π] is the LEFT half, bottom tip → cleft.
  const N = 4000
  const pts: [number, number][] = []
  const cum = [0]
  for (let i = 0; i <= N; i++) {
    pts.push(f(Math.PI + (i / N) * Math.PI))
    if (i > 0) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]))
  }
  const half: [number, number][] = []
  let j = 0
  for (let k = 0; k <= halfSteps; k++) {
    const d = (k / halfSteps) * cum[N]
    while (j < N && cum[j + 1] < d) j++
    half.push(pts[j])
  }
  const out = [...half]
  for (let k = halfSteps - 1; k >= 1; k--) out.push([-half[k][0], half[k][1]])
  return out
}

export const HEART: [number, number][] = heartOutline(5)

/** Closed chain from the tip: up the left flank, through the cleft, down the
 *  right, home. The notch lands mid-draw, which is where you first know. */
export const HEART_LINES: [number, number][] =
  HEART.map((_, i) => [i, (i + 1) % HEART.length] as [number, number])

/** Tip brightest, then the lobes and the cleft — the three points the eye
 *  uses to decide it is a heart and not a leaf. */
export const HEART_MAGS: number[] = [
  1.9,                  // the tip
  2.8, 2.6, 2.7, 2.3,   // left flank, up to the lobe
  2.4,                  // the cleft
  2.3, 2.7, 2.6, 2.8,   // right lobe and flank, back down
]

export const POLARIS: StarDef = { ra: 2.530, dec: 89.264, mag: 1.98 }
export const VEGA: StarDef = { ra: 18.615, dec: 38.784, mag: 0.03 }
export const ALTAIR: StarDef = { ra: 19.846, dec: 8.868, mag: 0.76 }
export const DENEB: StarDef = { ra: 20.690, dec: 45.280, mag: 1.25 }

/* ── Direction / projection helpers ──────────────────────────────── */

const D2R = Math.PI / 180

/** RA/Dec → unit vector (arbitrary fixed frame; only shapes matter). */
function starVec(s: StarDef): Vec3 {
  const a = (s.ra / 24) * Math.PI * 2
  const d = s.dec * D2R
  return [Math.cos(d) * Math.cos(a), Math.sin(d), Math.cos(d) * Math.sin(a)]
}

function norm(v: Vec3): Vec3 {
  const l = Math.hypot(v[0], v[1], v[2]) || 1
  return [v[0] / l, v[1] / l, v[2] / l]
}
function cross(a: Vec3, b: Vec3): Vec3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
}
function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
}

/**
 * Which way this sky is hung.
 *
 * Every azimuth in this file — the Milky Way band, each constellation's catalog
 * centre, the Ojakgyo arc — was authored against a shot that looked UP the valley
 * toward the house, and `dir` measured azimuth from −Z for exactly that reason.
 * The act now looks the other way (the ground behind that house is the pass; see
 * `CameraRig`), which left the whole river of souls in the top-left corner of the
 * final frame with sixty per cent of the sky empty beside it.
 *
 * Turning it here rather than re-numbering forty azimuths keeps the sky rigid:
 * the constellations, the band and every soul's flight target all come through
 * this one function, so they rotate together and the catalog geometry is
 * untouched.
 */
export const SKY_YAW_DEG = 180

/**
 * View-sky direction. Azimuth in degrees measured from the direction the act
 * looks — down the valley — opening toward +X; elevation in degrees above the
 * horizon.
 */
export function dir(azDeg: number, elevDeg: number): Vec3 {
  const az = (azDeg + SKY_YAW_DEG) * D2R
  const el = elevDeg * D2R
  return [Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el)]
}

/** Point on the sky dome for a direction. */
export function domePos(d: Vec3, r: number = SKY_R): Vec3 {
  return [SKY_CENTER[0] + d[0] * r, SKY_CENTER[1] + d[1] * r, SKY_CENTER[2] + d[2] * r]
}

/**
 * Project a catalog onto the dome around (az, elev): gnomonic tangent-plane
 * projection about the catalog centroid — internal proportions astronomically
 * true — then scaled so the widest star pair spans `spanDeg`, rotated by
 * `rollDeg` in the tangent plane, and placed on the dome.
 */
export function layoutConstellation(
  stars: StarDef[], azDeg: number, elevDeg: number, spanDeg: number, rollDeg = 0,
): Vec3[] {
  const vs = stars.map(starVec)
  const c = norm(vs.reduce((acc, v) => [acc[0] + v[0], acc[1] + v[1], acc[2] + v[2]] as Vec3, [0, 0, 0]))
  // Tangent basis at the centroid (any stable pair works — pole handled).
  const ref: Vec3 = Math.abs(c[1]) > 0.94 ? [1, 0, 0] : [0, 1, 0]
  const e1 = norm(cross(ref, c))
  const e2 = norm(cross(c, e1))
  const flat = vs.map(v => {
    const k = 1 / dot(v, c)
    const p: Vec3 = [v[0] * k - c[0], v[1] * k - c[1], v[2] * k - c[2]]
    return [dot(p, e1), dot(p, e2)] as [number, number]
  })
  return placeFlat(flat, azDeg, elevDeg, spanDeg, rollDeg)
}

/**
 * Place an explicit 2D glyph on the dome — x right, y up, any units, centred
 * and scaled the same way a projected catalog is.
 *
 * This is the door for shapes that are not constellations: `SATGAT` comes
 * through here. It is deliberately the SAME placement path as
 * `layoutConstellation` (bounding-box centre, widest-point span, roll in the
 * tangent plane) so a drawn shape and a real catalog are hung by one set of
 * rules and `spanDeg` means the same thing for both.
 */
export function layoutShape(
  pts: readonly (readonly [number, number])[],
  azDeg: number, elevDeg: number, spanDeg: number, rollDeg = 0,
): Vec3[] {
  return placeFlat(pts.map(p => [p[0], p[1]] as [number, number]), azDeg, elevDeg, spanDeg, rollDeg)
}

/** Shared tail of both: recentre, scale to the span, roll, hang on the dome. */
function placeFlat(
  flat: [number, number][], azDeg: number, elevDeg: number, spanDeg: number, rollDeg: number,
): Vec3[] {
  // Recenter on the 2D bounding box and normalize to the span.
  const xs = flat.map(f => f[0]); const ys = flat.map(f => f[1])
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2
  const cy = (Math.min(...ys) + Math.max(...ys)) / 2
  let maxR = 0
  for (const f of flat) maxR = Math.max(maxR, Math.hypot(f[0] - cx, f[1] - cy))
  const scale = Math.tan((spanDeg / 2) * D2R) / (maxR || 1)
  const roll = rollDeg * D2R
  // Place at the target direction.
  const C = dir(azDeg, elevDeg)
  const E1 = norm(cross([0, 1, 0], C))   // screen-right-ish
  const E2 = norm(cross(C, E1))          // screen-up-ish
  return flat.map(f => {
    const x0 = (f[0] - cx) * scale
    const y0 = (f[1] - cy) * scale
    const x = x0 * Math.cos(roll) - y0 * Math.sin(roll)
    const y = x0 * Math.sin(roll) + y0 * Math.cos(roll)
    return domePos(norm([
      C[0] + E1[0] * x + E2[0] * y,
      C[1] + E1[1] * x + E2[1] * y,
      C[2] + E1[2] * x + E2[2] * y,
    ]))
  })
}

/* ── Placement in the final up-shot frame ────────────────────────── */
/* Final camera looks az ≈ +8°, elev ≈ 66°, fov 70. */

export type NamedStar = {
  pos: Vec3
  mag: number
  color: string
  /** constellation id for line/lock bookkeeping */
  con: string
  /** index within the constellation's catalog (for lines) */
  idx: number
}

export type Constellation = {
  id: string
  stars: Vec3[]
  mags: number[]
  lines: [number, number][]
  color: string
}

export function buildConstellations(): Constellation[] {
  return [
    {
      id: 'bukdu',
      stars: layoutConstellation(BIG_DIPPER, -30, 52, 27, 8),
      mags: BIG_DIPPER.map(s => s.mag),
      lines: BIG_DIPPER_LINES,
      color: GOLD_BRIGHT,
    },
    {
      id: 'samtae',
      stars: layoutConstellation(SAMTAE, -48, 27, 21, -12),
      mags: SAMTAE.map(s => s.mag),
      lines: SAMTAE_LINES,
      color: STAR_WARM,
    },
    {
      id: 'cass',
      stars: layoutConstellation(CASSIOPEIA, 30, 75, 17, 25),
      mags: CASSIOPEIA.map(s => s.mag),
      lines: CASSIOPEIA_LINES,
      color: STAR_PURPLE,
    },
    {
      id: 'namdu',
      stars: layoutConstellation(NAMDU, 62, 16, 14, 10),
      mags: NAMDU.map(s => s.mag),
      lines: NAMDU_LINES,
      color: STAR_BLUE,
    },
    {
      id: 'polaris',
      stars: [domePos(dir(-4, 68))],
      mags: [POLARIS.mag],
      lines: [],
      color: STAR_WHITE,
    },
    {
      id: 'jiknyeo', // Vega — the weaver, west bank of the river
      stars: [domePos(dir(16, 57))],
      mags: [0.55], // rendered importance, not raw mag 0.03
      lines: [],
      color: STAR_WHITE,
    },
    {
      id: 'gyeonwoo', // Altair — the herder, east bank
      stars: [domePos(dir(58, 34))],
      mags: [0.85],
      lines: [],
      color: STAR_WARM,
    },
    {
      id: 'cheonjin', // Deneb — the celestial ford, inside the river
      stars: [domePos(dir(38, 64))],
      mags: [1.35],
      lines: [],
      color: STAR_BLUE,
    },
    /**
     * 삿갓 — the parent's hat, over the valley it was worn across.
     *
     * PLACED FOR THE LAST FRAME, not for the sky's own logic. Everything else
     * in this list sits where a Korean sky puts it; this one has no such
     * claim, so the only honest rule left is that it has to be LEGIBLE in the
     * shot that actually ends the film.
     *
     * These two numbers were measured, not guessed, and the first guess was
     * wrong in the way that matters. Dead centre of the last frame is
     * authored azimuth −8° (the tail holds camera azimuth 176° from 36.2s and
     * `skySpin.tsx` turns the sky 176° under it, so authored A arrives at
     * A − 176), and putting the hat there — high, spanning the frame, the way
     * a brim sits over a face — produced a correctly-drawn hat that you
     * cannot see: the 은하수 runs corner-to-corner through exactly that part
     * of the picture, and Cassiopeia's W sits inside it. Ten stars and ten
     * faint lines do not survive being laid over a thousand.
     *
     * So it goes BELOW the river instead, in the one large clear region the
     * final frame has: projecting the band's own bezier through the last
     * pose, the core crosses from (561, 245) to off the right edge at y≈540
     * on a 1920×1080 frame, and everything under y≈700 is open sky with only
     * the Dipper in the bottom-left corner. Authored (38, 43) lands the hat
     * centred around (1300, 820) — clear of the river, clear of 북두칠성, and
     * low in frame, which is where it belongs anyway: nearer the horizon is
     * nearer the valley it was worn across.
     *
     * Re-measure both numbers if the tail's held pose, `SKY_SPIN_DEG` or the
     * band's bezier ever move. Do it by projecting, not by eye — at 480px a
     * night sky looks plausible whatever is in it.
     *
     * WIDE — 30° against the Dipper's 27. It is the biggest single thing
     * drawn up there, because at the aspect a satgat actually has (0.85
     * across, 0.36 tall) anything smaller reads as a smudge rather than as an
     * object with a brim.
     */
    {
      id: 'satgat',
      stars: layoutShape(SATGAT, 34, 43, 26, 26),
      mags: SATGAT_MAGS,
      lines: SATGAT_LINES,
      color: PARENT_WARM, // the colour of the light she is standing in
    },
    /**
     * ♥ — high in the last frame, opposite the hat.
     *
     * Placed by the same measurement as the satgat and against the same
     * picture. Scanning the mean brightness of the final frame in eighths,
     * the darkest large block in the whole frame is the top-left (10–35 of
     * 255) and the river's core crosses it at y≈180–360 only once you are
     * right of x≈480, where the same scan jumps to 114. So it goes there —
     * authored (−60, 72), landing at 380×326 px centred on (323, 298),
     * inside the dark and clear of the core. That also puts it diagonally
     * opposite the hat with the river between them, rather than stacking
     * both drawn objects down one side of the frame.
     *
     * The roll is −40°, and it is not decoration: the tangent frame this
     * far round the dome stands the heart on its side (its tip→cleft axis
     * projects at 41° with no roll), and a heart lying on its side is not a
     * heart. −40 puts that axis at 89° — upright to within a degree.
     *
     * SMALLER: 18° against the hat's 26. This is the Easter egg and the hat
     * is the closing image, and the way to keep it the smaller of the two
     * claims is to make it the smaller of the two objects.
     *
     * PURPLE, alone in a gold sky. Everything else up there is a soul, warm
     * because the valley's light is warm; this is the one shape that is not
     * folklore and not the film's own furniture, and it is allowed to say
     * so rather than pretend to be a constellation.
     */
    {
      id: 'heart',
      stars: layoutShape(HEART, -60, 72, 18, -40),
      mags: HEART_MAGS,
      lines: HEART_LINES,
      color: STAR_PURPLE,
    },
  ]
}

/** Alcor's dome position — computed with the Dipper layout so it sits true beside Mizar. */
export function alcorPos(): Vec3 {
  const withAlcor = layoutConstellation([...BIG_DIPPER, ALCOR], -30, 52, 27.4, 8)
  return withAlcor[7]
}

/* ── The Milky Way band (은하수) ─────────────────────────────────── */

/** Spherical quadratic bezier through three sky directions. */
export function bandDir(s: number): Vec3 {
  const A = dir(86, 7)
  const B = dir(38, 50)
  const C = dir(-32, 81)
  const u = 1 - s
  return norm([
    A[0] * u * u + B[0] * 2 * u * s + C[0] * s * s,
    A[1] * u * u + B[1] * 2 * u * s + C[1] * s * s,
    A[2] * u * u + B[2] * 2 * u * s + C[2] * s * s,
  ])
}

/** Perpendicular offset from the band core (radians ≈ small-angle). */
export function bandPoint(s: number, off: number, r: number = SKY_R): Vec3 {
  const d = bandDir(s)
  const d2 = bandDir(Math.min(1, s + 0.01))
  const along = norm([d2[0] - d[0], d2[1] - d[1], d2[2] - d[2]])
  const perp = norm(cross(d, along))
  return domePos(norm([d[0] + perp[0] * off, d[1] + perp[1] * off, d[2] + perp[2] * off]), r)
}

/** Arc of the Ojakgyo (magpie bridge) between Vega and Altair. */
export function ojakgyoPoints(count: number): Vec3[] {
  const a = dir(16, 57)
  const b = dir(58, 34)
  const pts: Vec3[] = []
  for (let i = 0; i < count; i++) {
    const s = i / (count - 1)
    const v = norm([
      a[0] + (b[0] - a[0]) * s,
      a[1] + (b[1] - a[1]) * s + Math.sin(s * Math.PI) * 0.07,
      a[2] + (b[2] - a[2]) * s,
    ])
    pts.push(domePos(v, SKY_R - 1.5))
  }
  return pts
}

/** Magnitude → rendered star radius (world units on the dome). */
export function magToSize(mag: number): number {
  return Math.max(0.09, 0.42 - mag * 0.075)
}
