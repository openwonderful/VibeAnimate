/**
 * Hats — real Korean headwear for the adult figure.
 *
 * WHY. At the size the film holds these figures, face, costume, material and
 * hue are all under threshold; an outline above the shoulders is not. A hat
 * is the one difference drawn on the *body* that survives the distance — and
 * unlike a braid it belongs to the PARENT, which is the figure that has to
 * stay identifiable after the child has grown into the same proportions.
 *
 * FOUR PIECES, all real, two of them conical:
 *
 *   삿갓 B satgat-b   The same hat with the nón lá's line work: hoops under,
 *                    fine radial stitching over, doubled rim. Same
 *                    silhouette, a different craft on its surface.
 *   삿갓  satgat     The conical sedge rain hat — the travelling farmer's.
 *                    ROUND, big enough to cover the shoulders at 84 cm, and
 *                    bowed convex rather than dead straight. Woven in courses
 *                    over radial splits, carried off the skull by the 미사리
 *                    frame, tied under the chin. CONICAL.
 *   전모  jeonmo     The conical ribbed shade hat — fourteen bamboo ribs
 *                    under oiled paper, standing high on its own ring frame,
 *                    tied with a ribbon. Shallower and wider-angled than the
 *                    satgat, and the ribs are the whole silhouette. CONICAL.
 *                    (A woman's hat; this parent's gender is never stated.)
 *   갓    gat        The horsehair scholar's hat — flat 양태 brim, tapered
 *                    모자 crown, both a translucent mesh you can see the sky
 *                    through, a beaded 갓끈 slung under the chin and the
 *                    망건 headband showing beneath the brim.
 *   패랭이 paeraengi  The coarse split-bamboo commoner's hat — tall domed
 *                    crown, short brim, cloth band at the base. The plainest
 *                    of the four, and the one that reads as work.
 *
 * SCALE, and the one compromise in here. The rig's head is a stylised sphere
 * roughly 1.7× a real head against this body, so nothing can be scaled off
 * both at once. The split: BRIMS are sized to the body (the satgat comes out
 * 84 cm across on a 1.75 m figure, against documented artefacts at 74.5 and
 * 69 cm and a shoulder-covering standard of 70–80), CROWNS and fit
 * rings are sized to the head sphere, so they seat on it instead of through
 * it. That makes the crowns wider than life and it is the only way a hat sits
 * on this head without the skull poking out the top of it.
 *
 * CONSTRUCTION. Each hat is one revolved silhouette (`profile`, apex → rim)
 * plus trim built ON that surface — courses, ribs, bindings, cages, cords,
 * beads — as tubes in the same vocabulary as the body. That is not decoration
 * for its own sake: a woven hat IS a set of concentric courses over radial
 * splits, so the detail that reads up close is the same detail that makes the
 * silhouette solid at forty pixels. The shell carries a dimmer emissive than
 * the body (it is a surface catching the figure's light, not another source);
 * the trim runs at full body brightness, so the courses and the rim binding
 * are the bright edges. The gat's shell is dimmest and part transparent,
 * because a real gat is a black mesh you can see through.
 *
 * Everything is authored in the rig's own units (an adult is 1.73 to the top
 * of the head), so a hat is correct wherever a figure is correct — no
 * per-scene scaling.
 */
import * as THREE from 'three'
import { buildBody, v, type Curve, type Sphere } from './buildBody'

export type HatName = 'satgat' | 'satgat-b' | 'nonla' | 'jeonmo' | 'gat' | 'paeraengi'

/** Every hat, in the order they read best side by side — the three cones
 *  together so the differences between them are the thing you see first. */
export const HAT_NAMES: readonly HatName[] = ['satgat', 'satgat-b', 'nonla', 'jeonmo', 'gat', 'paeraengi']

export const HAT_LABELS: Record<HatName, { hangeul: string; roman: string; note: string }> = {
  satgat: { hangeul: '삿갓', roman: 'satgat', note: 'Korean conical sedge rain hat' },
  'satgat-b': { hangeul: '삿갓 B', roman: 'satgat-b', note: 'satgat form, nón lá line work' },
  nonla: { hangeul: 'nón lá', roman: 'non la', note: 'Vietnamese conical leaf hat' },
  jeonmo: { hangeul: '전모', roman: 'jeonmo', note: 'Korean conical ribbed shade hat' },
  gat: { hangeul: '갓', roman: 'gat', note: 'Korean horsehair scholar’s hat' },
  paeraengi: { hangeul: '패랭이', roman: 'paeraengi', note: 'Korean split-bamboo commoner’s hat' },
}

export type HatBuild = {
  /** The revolved surface — straw, paper, mesh, bamboo. */
  shell: THREE.BufferGeometry
  /** Courses, ribs, bindings, cage, cords, beads — at body brightness. */
  trim: THREE.BufferGeometry
  /** Height of the hat's rim plane (its local y=0) above the head sphere's
   *  CENTRE. How low the thing is worn. */
  seat: number
  /** True when the hat carries no fit cage and is instead dropped until it
   *  rests on the skull. `seat` is then just the scale-1 answer, and
   *  `onHeadSeat` re-solves it for any other `hatScale`. */
  seatOnHead: boolean
  /** The revolved silhouette, kept so the drop can be re-solved. */
  profile: Pt[]
  /** Shell emissive as a fraction of the body's. */
  shellDim: number
  /** Shell opacity. < 1 renders the shell transparent (the gat's mesh). */
  shellOpacity: number
  /**
   * Radius of the widest point of the brim, in the figure's own rig units.
   *
   * Staging needs this. A 삿갓 is 0.42 rig units across the radius — nearly
   * three head-widths — so anything the wearer stands next to has to be
   * further away than that or the brim goes through it, and the two places
   * this film found out the hard way (the parent at the doorpost, the
   * caregiver riding a back) both did it by standing where a person without
   * a hat would stand. Reading it off the profile means the clearance a scene
   * leaves is a function of the hat it actually put on the figure.
   */
  brimR: number
}

/* ══ Profile helpers ════════════════════════════════════════════════════
 * A profile is a polyline of [radius, height] run from the apex to the rim.
 * Revolved it is the shell; sampled it is where every course, rib and
 * binding sits, so the trim is on the surface by construction rather than by
 * a second set of hand-typed numbers that drift out of agreement with it.
 */

export type Pt = readonly [number, number]

const TAU = Math.PI * 2

/** Cumulative arc length along a profile, so `u` is distance-along-surface
 *  rather than index — otherwise every course bunches up wherever the
 *  polyline happens to be finely sampled. */
function lens(p: Pt[]): number[] {
  const l = [0]
  for (let i = 1; i < p.length; i++) {
    l.push(l[i - 1] + Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]))
  }
  return l
}

type Sample = { r: number; y: number; nr: number; ny: number }

/** Point and outward surface normal at arc-length fraction u ∈ [0,1]. */
function at(p: Pt[], l: number[], u: number): Sample {
  const d = Math.max(0, Math.min(1, u)) * l[l.length - 1]
  let i = 1
  while (i < l.length - 1 && l[i] < d) i++
  const span = Math.max(1e-6, l[i] - l[i - 1])
  const f = (d - l[i - 1]) / span
  const dr = p[i][0] - p[i - 1][0]
  const dy = p[i][1] - p[i - 1][1]
  const m = Math.hypot(dr, dy) || 1
  return {
    r: p[i - 1][0] + dr * f,
    y: p[i - 1][1] + dy * f,
    // Tangent rotated a quarter turn: for a cone run apex → rim this points
    // out and up, i.e. off the TOP face. Negative offsets go underneath.
    nr: -dy / m,
    ny: dr / m,
  }
}

/**
 * Distance to the SURFACE of a `sides`-gon whose corners sit at radius `r`,
 * along bearing `ang`. `sides = 0` is a circle.
 *
 * This is what makes a satgat a satgat: its plan is a hexagon, not a disc,
 * so every course and every rib has to sit on a flat panel rather than on a
 * cone. A vertex sits at ang = 0, matching where LatheGeometry starts, so
 * the trim lands on the shell instead of near it.
 */
function polyR(r: number, sides: number, ang: number): number {
  if (!sides) return r
  const step = TAU / sides
  const a = (((ang % step) + step) % step) - step / 2
  return (r * Math.cos(step / 2)) / Math.cos(a)
}

/** A closed ring lying on the surface at u, floated `off` clear of it. */
function course(p: Pt[], l: number[], u: number, off: number, seg = 44, sides = 0): THREE.Vector3[] {
  const s = at(p, l, u)
  return ring(s.r + s.nr * off, s.y + s.ny * off, seg, sides)
}

/** A closed ring — or polygon — at an explicit corner radius and height. */
function ring(r: number, y: number, seg = 44, sides = 0): THREE.Vector3[] {
  const pts: THREE.Vector3[] = []
  for (let i = 0; i < seg; i++) {
    const a = (i / seg) * TAU
    const rr = polyR(r, sides, a)
    pts.push(v(Math.cos(a) * rr, y, Math.sin(a) * rr))
  }
  return pts
}

/** A rib following the surface from u0 to u1 at bearing `ang`. */
function rib(
  p: Pt[], l: number[], u0: number, u1: number, ang: number, off: number, steps = 9, sides = 0,
): THREE.Vector3[] {
  const c = Math.cos(ang)
  const s = Math.sin(ang)
  const pts: THREE.Vector3[] = []
  for (let i = 0; i <= steps; i++) {
    const q = at(p, l, u0 + (u1 - u0) * (i / steps))
    const r = polyR(q.r + q.nr * off, sides, ang)
    pts.push(v(c * r, q.y + q.ny * off, s * r))
  }
  return pts
}

/**
 * A chin cord: off the side of the hat, down past the jaw, to a knot under
 * the chin. `seat` puts the head sphere's centre at hat-local y = −seat, and
 * the rig faces +z, so the chin is forward and below that.
 */
function chinCord(
  from: THREE.Vector3, seat: number, RH: number, sag: number,
): { curves: THREE.Vector3[][]; knot: THREE.Vector3 } {
  const knot = v(0, -seat - RH * 0.86, RH * 0.30)
  const curves = [-1, 1].map(side => {
    const a = v(from.x * side, from.y, from.z)
    const mid = a.clone().lerp(knot, 0.55)
    mid.y -= sag
    mid.z += RH * 0.18
    return [a, a.clone().lerp(mid, 0.5), mid, mid.clone().lerp(knot, 0.5), knot]
  })
  return { curves, knot }
}

/* ══ The hats ═══════════════════════════════════════════════════════════ */

type Recipe = {
  profile: Pt[]
  seat: number
  shellDim: number
  shellOpacity: number
  /** Lathe segments — the silhouette's smoothness. */
  seg: number
  /** Plan: 0 (default) is round; 6 makes a hexagon, which is the satgat. */
  sides?: number
  /** Drop the hat onto the skull instead of standing it off with a cage. */
  seatOnHead?: boolean
  trim: (ctx: { p: Pt[]; l: number[]; seat: number; RH: number }) => {
    curves: Curve[]
    spheres?: Sphere[]
  }
}

/* ── 삿갓 satgat ─────────────────────────────────────────────────────────
 * Round, bowed, and big enough to cover the shoulders.
 *
 * SIZE is well sourced. Documented surviving artefacts measure 74.5 cm and
 * 69 cm and are cited as the SMALL ones; the standard covers the shoulders
 * at 70–80, and paper 지삿갓 average past 90 with some over a metre. This is
 * 84 cm, which is why it has real presence in frame — the object is supposed
 * to.
 *
 * SHAPE cost this file two wrong passes, so the reasoning is written down.
 * 국악사전's entry says the edge is 가장자리가 육각형을 이루도록 곱게 도련을 하고
 * — trimmed to form a hexagon — and namu.wiki repeats it, and a first pass
 * built this as a hexagonal pyramid with six flat panels and hard folds.
 * That is wrong twice over:
 *
 *   - 한국민족문화대백과사전, the primary encyclopaedia (E0026979), does not
 *     say it at all. Its 삿갓 is 대오리나 갈대를 엮어서 우산과 비슷한 모양으로
 *     만든 쓰개 — woven into an UMBRELLA-like shape. The Korean hat that
 *     genuinely has a non-round edge is the 방갓 (E0021657), whose rim is
 *     네 개의 꽃잎모양, four petals — and that entry defines the 미사리 as a
 *     둥근 테두리, a ROUND frame.
 *   - Even taking 국악사전 at its word, 도련 is neatly TRIMMING an edge. A
 *     fine six-point trim on a woven rim is a finishing detail, not the
 *     geometry of the whole hat.
 *
 * And the physical argument settles it: a conical hat is woven as a
 * continuous spiral course, and the edge that falls out of that is a circle.
 * Faceting it is extra work that buys nothing, which is why every photograph
 * of the object shows a round cone.
 *
 * So: round, and BOWED — the profile runs convex, which is what a woven cone
 * does under its own weight and is the slight billow you see in every
 * surviving example. Dead straight is the nón lá, stretched over hoops.
 * (`polyR`/`sides` are kept for the day this file gets a 방갓, which really
 * does have four lobes.)
 *
 * Courses running round, radial splits underneath, a bound rim, and the
 * 미사리 — 머리에 걸쳐 얹히도록 된 둥근 테두리 — holding it off the skull.
 */
/**
 * The satgat's silhouette, shared by both variants of it. 84 cm across,
 * bowed convex — the exponent is 0.72, not a straight 1.0: the billow has to
 * be visible in profile, because along with the width it is the whole
 * difference between this and the nón lá's dead-straight cone.
 */
const SATGAT_R = 0.420
const SATGAT_H = 0.212
function satgatProfile(): Pt[] {
  const profile: Pt[] = [[0.007, SATGAT_H]]
  const N = 10
  for (let i = 1; i <= N; i++) {
    const u = i / N
    profile.push([SATGAT_R * u, SATGAT_H * Math.pow(1 - u, 0.72)])
  }
  // The rim turns down at the very edge, where the weave is folded back.
  profile.push([SATGAT_R * 1.014, -0.018])
  return profile
}

/**
 * The 미사리 and the chin cord, shared too — the fitting is the same object
 * whatever the surface is woven like, and it is what keeps both variants
 * Korean rather than one of them drifting into being a nón lá.
 */
function satgatFitting(p: Pt[], l: number[], seat: number, RH: number): {
  curves: Curve[]; spheres: Sphere[]
} {
  const curves: Curve[] = []
  const spheres: Sphere[] = []
  // NO 미사리. The hat is worn straight on the head — `seatOnHead` drops the
  // cone until it touches the skull, so there is no frame standing it off and
  // nothing showing underneath it. The cord hangs off the shell itself, low on
  // the cone where the old frame used to meet it.
  const hang = at(p, l, 0.34)
  const cord = chinCord(v(hang.r * 0.99, hang.y - 0.004, 0), seat, RH, 0.030)
  for (const c of cord.curves) curves.push({ points: c, radius: 0.0038, segments: 12, radialSegments: 6 })
  spheres.push({ center: cord.knot, radius: 0.013 })
  return { curves, spheres }
}

function satgat(): Recipe {
  const profile = satgatProfile()

  return {
    profile, seat: -0.042, seatOnHead: true, shellDim: 0.44, shellOpacity: 1, seg: 56,
    trim: ({ p, l, seat, RH }) => {
      const curves: Curve[] = []
      const spheres: Sphere[] = []

      // The spiral weave, read as thirteen courses on the outside. Fewer and
      // fatter and the cone reads as a stack of rings — a wedding cake —
      // rather than as something woven.
      for (let i = 0; i < 13; i++) {
        const u = 0.11 + (i / 12) * 0.85
        curves.push({ points: course(p, l, u, 0.0028, 52), radius: 0.0036, segments: 56, closed: true, radialSegments: 6 })
      }
      // The split frame underneath.
      for (let i = 0; i < 26; i++) {
        curves.push({
          points: rib(p, l, 0.02, 0.996, (i / 26) * TAU, -0.005),
          radius: 0.0042, segments: 11, radialSegments: 6,
        })
      }
      // 도련 — the edge, finely trimmed and bound.
      curves.push({ points: course(p, l, 0.982, 0.0015, 56), radius: 0.0092, segments: 60, closed: true, radialSegments: 8 })
      spheres.push({ center: v(0, at(p, l, 0).y + 0.006, 0), radius: 0.019 })

      const fit = satgatFitting(p, l, seat, RH)
      curves.push(...fit.curves)
      spheres.push(...fit.spheres)

      return { curves, spheres }
    },
  }
}

/* ── 삿갓 B — the satgat's form, the nón lá's line work ──────────────────
 * Same hat, different hand.
 *
 * Everything about the SILHOUETTE is 삿갓: 84 cm across, the convex billow,
 * the turned-down rim, the 미사리 and the chin cord. What changes is the
 * surface — it is finished the way a nón lá is finished, and those are two
 * genuinely different crafts:
 *
 *   satgat    a coarse spiral WEAVE. Thirteen fat courses on the outside
 *             over splits underneath. The lines are structural and you can
 *             count them from across a field.
 *   nón lá    graded hoops UNDERNEATH, leaf stretched over them, and fine
 *             thread stitched through in radial rows on top. The lines are
 *             a stitch, not a strand — many more of them and much finer.
 *
 * So this variant gets 20 graded hoops under the cone and 34 rows of fine
 * stitching over it — 34 rather than the nón lá's 24 because this cone has
 * two and a half times the surface area and the rows have to stay the same
 * distance apart at the rim or they read as a starburst. Doubled bound rim,
 * finial at the apex, and the shell a touch brighter, because a stretched
 * leaf catches light where a coarse straw weave scatters it.
 */
function satgatB(): Recipe {
  const profile = satgatProfile()

  return {
    profile, seat: -0.042, seatOnHead: true, shellDim: 0.50, shellOpacity: 1, seg: 56,
    trim: ({ p, l, seat, RH }) => {
      const curves: Curve[] = []
      const spheres: Sphere[] = []

      // Twenty graded hoops UNDER the surface — tighter toward the apex,
      // which is what stops a wide cone reading as a funnel.
      for (let i = 0; i < 20; i++) {
        const u = 0.07 + Math.pow(i / 19, 0.86) * 0.91
        curves.push({ points: course(p, l, u, -0.0038, 52), radius: 0.0030, segments: 56, closed: true, radialSegments: 5 })
      }
      // And the stitching over it. Deliberately the finest line work in this
      // file — thread, not batten.
      for (let i = 0; i < 34; i++) {
        curves.push({
          points: rib(p, l, 0.055, 0.985, (i / 34) * TAU, 0.0020, 9),
          radius: 0.0017, segments: 10, radialSegments: 5,
        })
      }
      // Doubled rim: the surface is folded back over the last hoop and bound.
      curves.push({ points: course(p, l, 0.99, 0.0, 56), radius: 0.0072, segments: 60, closed: true, radialSegments: 8 })
      curves.push({ points: course(p, l, 0.935, 0.0022, 52), radius: 0.0034, segments: 56, closed: true, radialSegments: 6 })
      // Where the hoops converge.
      spheres.push({ center: v(0, at(p, l, 0).y + 0.005, 0), radius: 0.0135 })

      const fit = satgatFitting(p, l, seat, RH)
      curves.push(...fit.curves)
      spheres.push(...fit.spheres)

      return { curves, spheres }
    },
  }
}

/* ── 전모 jeonmo ─────────────────────────────────────────────────────────
 * 60 cm across and only 9 cm deep — a much wider angle than the satgat, and
 * the reason the two conicals do not read as the same hat twice. Fourteen
 * ribs stand proud on the paper, the rim is double-bound, and the whole
 * thing sits HIGH: it rides on its own ring cage above the head rather than
 * over it, which is the silhouette people recognise.
 */
function jeonmo(): Recipe {
  const R = 0.335
  const H = 0.102
  const profile: Pt[] = [
    [0.010, H],
    [R * 0.30, H * 0.71],
    [R * 0.62, H * 0.39],
    [R * 0.90, H * 0.11],
    [R * 0.985, 0.0],
    [R, 0.014], // the lip turns up
  ]
  return {
    // The paper is held DOWN so the ribs on it are the bright thing. Run the
    // shell as hot as the satgat's straw and the ribs vanish into it, which
    // is the one way to make a jeonmo look like a small satgat.
    profile, seat: 0.115, shellDim: 0.44, shellOpacity: 1, seg: 60,
    trim: ({ p, l, seat, RH }) => {
      const curves: Curve[] = []
      const spheres: Sphere[] = []

      // The ribs. Everything else on this hat is subordinate to them — they
      // stand well proud of the paper, which is what casts the shadow lines
      // a jeonmo is recognised by.
      for (let i = 0; i < 14; i++) {
        curves.push({
          points: rib(p, l, 0.03, 0.99, (i / 14) * TAU, 0.0062),
          radius: 0.0058, segments: 10, radialSegments: 6,
        })
      }
      // Two painted courses on the paper, then the bound rim.
      for (const u of [0.40, 0.68]) {
        curves.push({ points: course(p, l, u, 0.0025), radius: 0.0026, segments: 52, closed: true, radialSegments: 6 })
      }
      curves.push({ points: course(p, l, 0.955, 0.002), radius: 0.0072, segments: 60, closed: true, radialSegments: 8 })
      curves.push({ points: course(p, l, 1.0, 0.0), radius: 0.0050, segments: 60, closed: true, radialSegments: 6 })
      spheres.push({ center: v(0, H + 0.004, 0), radius: 0.014 })

      // The frame it stands on: two rings and six uprights, then five struts
      // out to the paper. This is the hat's tell — a jeonmo floats.
      const upR = RH * 0.94
      const upY = -0.050
      const loR = RH * 1.06
      const loY = -0.115
      curves.push({ points: ring(upR, upY, 28), radius: 0.0048, segments: 32, closed: true, radialSegments: 6 })
      curves.push({ points: ring(loR, loY, 28), radius: 0.0058, segments: 32, closed: true, radialSegments: 6 })
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU
        curves.push({
          points: [v(Math.cos(a) * upR, upY, Math.sin(a) * upR), v(Math.cos(a) * loR, loY, Math.sin(a) * loR)],
          radius: 0.0040, segments: 4, radialSegments: 6,
        })
      }
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * TAU + 0.6
        const s = at(p, l, 0.44)
        curves.push({
          points: [
            v(Math.cos(a) * upR, upY + 0.004, Math.sin(a) * upR),
            v(Math.cos(a) * s.r, s.y - 0.004, Math.sin(a) * s.r),
          ],
          radius: 0.0036, segments: 4, radialSegments: 6,
        })
      }

      // A ribbon, not a cord: knot under the chin and two tails hanging.
      const cord = chinCord(v(loR * 0.98, loY, 0), seat, RH, 0.026)
      for (const c of cord.curves) curves.push({ points: c, radius: 0.0046, segments: 12, radialSegments: 6 })
      spheres.push({ center: cord.knot, radius: 0.016 })
      for (const s of [-1, 1]) {
        const k = cord.knot
        curves.push({
          points: [
            k,
            v(k.x + s * 0.018, k.y - 0.035, k.z + 0.010),
            v(k.x + s * 0.030, k.y - 0.075, k.z + 0.006),
            v(k.x + s * 0.026, k.y - 0.112, k.z - 0.004),
          ],
          radius: 0.0040, segments: 10, radialSegments: 6,
        })
      }

      return { curves, spheres }
    },
  }
}

/* ── 갓 gat ──────────────────────────────────────────────────────────────
 * The one everybody knows. A flat 양태 brim 67 cm across drooping very
 * slightly, a tapered 모자 crown with a flat top, and both of them a
 * horsehair mesh — hence the dim, part-transparent shell with a fine bright
 * lattice over it, which is what the object actually looks like against a
 * sky. Beaded 갓끈 under the chin and the 망건 headband showing below the
 * brim, because on a real gat you always see both.
 */
function gat(): Recipe {
  const R = 0.350
  // Tall and narrow. The first pass had the crown at 0.15 to clear the head
  // sphere at the brim plane and it read as a basket with a plate under it —
  // a gat's crown is a CHIMNEY. It only has to clear the sphere where the
  // sphere is still wide, which is the bottom 40 mm of it.
  const rTop = 0.121
  const rBot = 0.134
  const hC = 0.176
  const profile: Pt[] = [
    [0.0, hC],
    [rTop * 0.62, hC],
    [rTop * 0.95, hC - 0.006],
    [rTop, hC - 0.020],
    [rBot * 0.99, hC * 0.42],
    [rBot, 0.020],
    [rBot * 1.05, 0.006],
    [0.215, -0.012],
    [0.285, -0.026],
    [R * 0.98, -0.037],
    [R, -0.028], // bound edge, turned up a hair
  ]
  // The brim is its own sub-profile: courses and radials belong to it, not
  // to the crown, and slicing is how they stay off the crown.
  const BRIM_FROM = 6

  return {
    profile, seat: 0.100, shellDim: 0.26, shellOpacity: 0.78, seg: 64,
    trim: ({ p, seat, RH }) => {
      const curves: Curve[] = []
      const spheres: Sphere[] = []
      const brim = p.slice(BRIM_FROM)
      const bl = lens(brim)

      // 양태 — five courses over twenty-eight radials, the fine mesh.
      for (const u of [0.05, 0.28, 0.50, 0.72, 0.90]) {
        curves.push({ points: course(brim, bl, u, 0.0035), radius: 0.0030, segments: 60, closed: true, radialSegments: 6 })
      }
      for (let i = 0; i < 28; i++) {
        curves.push({
          points: rib(brim, bl, 0.0, 0.99, (i / 28) * TAU, -0.0035, 5),
          radius: 0.0026, segments: 6, radialSegments: 6,
        })
      }
      curves.push({ points: course(brim, bl, 0.985, 0.001), radius: 0.0085, segments: 64, closed: true, radialSegments: 8 })

      // 모자 — the crown, four bands and fourteen uprights.
      const crownR = (y: number) => rBot + (rTop - rBot) * (y / (hC - 0.020))
      for (const y of [0.032, 0.070, 0.108, 0.146]) {
        curves.push({ points: ring(crownR(y) + 0.0035, y, 40), radius: 0.0032, segments: 44, closed: true, radialSegments: 6 })
      }
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * TAU
        curves.push({
          points: [
            v(Math.cos(a) * (rBot + 0.0035), 0.014, Math.sin(a) * (rBot + 0.0035)),
            v(Math.cos(a) * (crownR(hC * 0.5) + 0.0035), hC * 0.5, Math.sin(a) * (crownR(hC * 0.5) + 0.0035)),
            v(Math.cos(a) * (rTop + 0.002), hC - 0.022, Math.sin(a) * (rTop + 0.002)),
          ],
          radius: 0.0028, segments: 6, radialSegments: 6,
        })
      }
      curves.push({ points: ring(rTop * 0.93, hC + 0.002, 36), radius: 0.0034, segments: 40, closed: true, radialSegments: 6 })

      // 망건 — the headband, on the brow under the brim. The head sphere is
      // widest at its centre, so this rides just outside it at that height.
      const bandY = -seat + RH * 0.34
      curves.push({
        points: ring(Math.sqrt(Math.max(0, RH * RH - (RH * 0.34) ** 2)) + 0.006, bandY, 32),
        radius: 0.0075, segments: 36, closed: true, radialSegments: 8,
      })

      // 갓끈 — amber beads on a strand, slung under the chin.
      const ax = 0.170
      const ay = -0.008
      const knotY = -seat - RH * 1.02
      const BEADS = 15
      const strand: THREE.Vector3[] = []
      for (let i = 0; i <= BEADS; i++) {
        const u = i / BEADS
        const s = Math.sin(u * Math.PI)
        const x = ax * (1 - 2 * u)
        const y = ay + (knotY - ay) * s
        const z = RH * 0.34 * s
        const pt = v(x, y, z)
        strand.push(pt)
        if (i > 0 && i < BEADS) spheres.push({ center: pt, radius: 0.0105 })
      }
      curves.push({ points: strand, radius: 0.0032, segments: 24, radialSegments: 6 })

      return { curves, spheres }
    },
  }
}

/* ── 패랭이 paeraengi ────────────────────────────────────────────────────
 * The plain one: a tall domed crown of coarse split bamboo, a 47 cm brim,
 * and a cloth band where the two meet. Nothing is bound or beaded — twelve
 * splits over three courses and a folded rim, which is the whole object.
 */
function paeraengi(): Recipe {
  const crownR = 0.172
  // A shallower dome and a longer brim than the first pass: at 0.145 tall
  // over a 0.235 brim it read as a kettle helmet, which is a different
  // century and a different country.
  const hC = 0.132
  const R = 0.262
  const profile: Pt[] = [[0.0, hC]]
  const N = 7
  for (let i = 1; i <= N; i++) {
    const u = i / N
    profile.push([crownR * Math.sin((u * Math.PI) / 2), hC * Math.cos((u * Math.PI) / 2)])
  }
  profile.push([crownR * 1.02, -0.006], [0.215, -0.018], [R * 0.985, -0.029], [R, -0.020])
  const BRIM_FROM = N + 1

  return {
    profile, seat: 0.040, shellDim: 0.40, shellOpacity: 1, seg: 48,
    trim: ({ p, seat, RH }) => {
      const curves: Curve[] = []
      const spheres: Sphere[] = []
      const brim = p.slice(BRIM_FROM)
      const bl = lens(brim)
      // Crown occupies the profile up to the band; sample it on its own so
      // the splits stop at the brim instead of running out over it.
      const crown = p.slice(0, BRIM_FROM + 1)
      const cl = lens(crown)

      for (let i = 0; i < 12; i++) {
        curves.push({
          points: rib(crown, cl, 0.03, 0.99, (i / 12) * TAU, 0.0045),
          radius: 0.0048, segments: 10, radialSegments: 6,
        })
      }
      for (const u of [0.28, 0.56, 0.84]) {
        curves.push({ points: course(crown, cl, u, 0.0035), radius: 0.0036, segments: 40, closed: true, radialSegments: 6 })
      }
      spheres.push({ center: v(0, hC + 0.004, 0), radius: 0.014 })

      // The cloth band at the base of the crown.
      curves.push({ points: ring(crownR + 0.008, 0.012, 40), radius: 0.0115, segments: 44, closed: true, radialSegments: 8 })

      for (let i = 0; i < 16; i++) {
        curves.push({
          points: rib(brim, bl, 0.02, 0.98, (i / 16) * TAU, -0.0035, 4),
          radius: 0.0032, segments: 5, radialSegments: 6,
        })
      }
      for (const u of [0.35, 0.72]) {
        curves.push({ points: course(brim, bl, u, 0.003), radius: 0.0030, segments: 44, closed: true, radialSegments: 6 })
      }
      curves.push({ points: course(brim, bl, 0.98, 0.001), radius: 0.0075, segments: 48, closed: true, radialSegments: 8 })

      const cord = chinCord(v(crownR * 0.99, 0.006, 0), seat, RH, 0.024)
      for (const c of cord.curves) curves.push({ points: c, radius: 0.0036, segments: 12, radialSegments: 6 })
      spheres.push({ center: cord.knot, radius: 0.012 })

      return { curves, spheres }
    },
  }
}

/* ── nón lá ─────────────────────────────────────────────────────────────
 * The Vietnamese one, and the only piece here that is not Korean.
 *
 * It earns its place next to the satgat by being the OPPOSITE cone. The
 * satgat is wide, shallow and slightly bowed — a disc on the horizon. This is
 * narrow, steep and dead straight: 47 cm across but 27 cm to the point, a
 * 41° half-angle, so on a distant road it reads as a spike and the satgat
 * reads as a plate. Two conicals that cannot be confused for each other at
 * any distance is the whole reason to have both.
 *
 * Built the way the object is built, which is unusual in that all of its
 * structure is on the INSIDE: eighteen graded bamboo hoops, palm leaf
 * stretched over them and stitched through with thread in fine radial rows,
 * a doubled bound rim, and a broad silk quai off an inner headband. Look up
 * into a real one and you see the hoops; that is what is modelled here.
 */
function nonla(): Recipe {
  // Widened from 47 cm to 66 cm across. At the first width it was a spike —
  // technically the right cone angle for the object, but on this rig's
  // oversized head it read as a party hat rather than as shade. It keeps the
  // steeper pitch that separates it from the satgat (53° of half-angle
  // against the satgat's 60°) and gains the width that makes it a hat.
  const R = 0.330
  const H = 0.250
  const profile: Pt[] = [
    [0.004, H],
    [R * 0.25, H * 0.75],
    [R * 0.55, H * 0.45],
    [R * 0.82, H * 0.18],
    [R * 0.99, 0.004],
    [R, -0.009],
  ]
  return {
    profile, seat: 0.035, shellDim: 0.50, shellOpacity: 1, seg: 56,
    trim: ({ p, l, seat, RH }) => {
      const curves: Curve[] = []
      const spheres: Sphere[] = []

      // The eighteen hoops, UNDER the leaf where they belong. Graded: tighter
      // toward the apex, which is what stops the cone reading as a funnel.
      for (let i = 0; i < 18; i++) {
        const u = 0.08 + Math.pow(i / 17, 0.86) * 0.90
        curves.push({ points: course(p, l, u, -0.0038), radius: 0.0031, segments: 44, closed: true, radialSegments: 5 })
      }
      // Stitch rows through the leaf — 24 of them, and deliberately the
      // finest thing in any of these hats. Thread, not batten.
      for (let i = 0; i < 24; i++) {
        curves.push({
          points: rib(p, l, 0.07, 0.985, (i / 24) * TAU, 0.0020, 7),
          radius: 0.0017, segments: 8, radialSegments: 5,
        })
      }
      // Doubled rim: the leaf is folded back over the last hoop and bound.
      curves.push({ points: course(p, l, 0.99, 0.0), radius: 0.0068, segments: 56, closed: true, radialSegments: 8 })
      curves.push({ points: course(p, l, 0.935, 0.0022), radius: 0.0034, segments: 52, closed: true, radialSegments: 6 })
      // Where the hoops converge.
      spheres.push({ center: v(0, H + 0.005, 0), radius: 0.0125 })

      // Inner headband, and the quai hung off it — a broad silk band rather
      // than the satgat's cord, so the two hats differ under the chin too.
      const bandR = RH * 1.05
      const bandY = -0.028
      curves.push({ points: ring(bandR, bandY, 30), radius: 0.0046, segments: 34, closed: true, radialSegments: 6 })
      const cord = chinCord(v(bandR * 0.97, bandY - 0.004, 0), seat, RH, 0.034)
      for (const c of cord.curves) curves.push({ points: c, radius: 0.0072, segments: 14, radialSegments: 6 })
      spheres.push({ center: cord.knot, radius: 0.0145 })

      return { curves, spheres }
    },
  }
}

const RECIPES: Record<HatName, () => Recipe> = {
  satgat, 'satgat-b': satgatB, nonla, jeonmo, gat, paeraengi,
}

/**
 * Build a hat's geometry. `RH` is the wearer's head radius — only the fit
 * rings, the headband and the chin cords read it; brims and crowns are
 * absolute, for the reason in the header.
 *
 * The result is static: hats do not deform with the walk cycle, they ride
 * the head. Callers own disposal.
 */
export function buildHat(name: HatName, RH: number): HatBuild {
  const r = RECIPES[name]()
  const p = r.profile
  const l = lens(p)
  let shell: THREE.BufferGeometry = new THREE.LatheGeometry(
    p.map(([rr, yy]) => new THREE.Vector2(Math.max(rr, 1e-4), yy)),
    r.sides || r.seg,
  )
  if (r.sides) {
    // Flat panels need flat normals. Smooth-shading a hexagon makes it read
    // as a slightly lumpy cone — the folds vanish, which is the one thing
    // the hexagon is here to show.
    shell.deleteAttribute('normal')
    shell = shell.toNonIndexed()
  }
  shell.computeVertexNormals()
  const seat = r.seatOnHead ? onHeadSeat(p, RH) : r.seat
  const { curves, spheres = [] } = r.trim({ p, l, seat, RH })
  return {
    shell,
    trim: buildBody(curves, spheres),
    seat,
    seatOnHead: !!r.seatOnHead,
    profile: p,
    shellDim: r.shellDim,
    shellOpacity: r.shellOpacity,
    brimR: brimRadius(p),
  }
}

/**
 * Where a hat with no fit cage comes to rest: drop the revolved profile
 * straight down its axis until the first point of it touches the head
 * sphere, and return the rim-plane height that puts it there.
 *
 * Scale matters and is not optional. The hat is scaled by `hatScale` about
 * its own origin while the skull is NOT, so a seat solved at 1.0 buries the
 * hat when a close shot asks for 0.6 — Act6_6 does. Working in head radii,
 * T = RH / scale, is what keeps the hat resting at any size.
 *
 * A profile point wider than T is outside the sphere's equator and can never
 * be the contact, which is why the brim is skipped rather than clamped.
 */
export function onHeadSeat(p: Pt[], RH: number, scale = 1): number {
  const T = RH / Math.max(scale, 1e-4)
  let seat = -Infinity
  for (const [r, y] of p) {
    if (r >= T) continue
    seat = Math.max(seat, Math.sqrt(T * T - r * r) - y)
  }
  return Number.isFinite(seat) ? seat : 0
}

/** Widest point of a profile — the brim. */
function brimRadius(p: Pt[]): number {
  return p.reduce((m, [r]) => Math.max(m, r), 0)
}

/**
 * How wide a hat is, without building it.
 *
 * For staging maths: `hatBrimRadius('satgat-b') * (S / HS)` is how far from a
 * wall a wearer has to stand, in that wall's own units.
 */
export function hatBrimRadius(name: HatName): number {
  return brimRadius(RECIPES[name]().profile)
}

/**
 * The 삿갓's OUTLINE — the shape the object cuts against the sky, for anything
 * that has to DRAW the hat rather than build it. (Act 8.55's sky joins these
 * points into a constellation; see `sky.ts`.)
 *
 * It is read off `satgatProfile()` rather than typed out, for the same reason
 * the courses and ribs are: the outline and the object are then the same
 * shape by construction, and re-tuning the billow moves both.
 *
 * ORTHOGRAPHIC, from `tiltDeg` BELOW the rim plane — you are standing under
 * it, which is the only angle this hat is ever seen from in the film and the
 * only one where it reads as a hat rather than as a line. That tilt is what
 * puts the near edge of the brim below the rim tips: a surface of revolution
 * seen from off-axis shows its rim as an ellipse, and the near half of that
 * ellipse IS the sag under the brim. Dead side-on (tilt 0) the whole thing
 * collapses to the profile and you have drawn a shallow arc.
 *
 * Returned as a closed loop, wound so that walking it in order is the way you
 * would draw the hat: left rim tip, UP the left slope and over the apex, DOWN
 * the right slope to the right rim tip, then round the near edge of the brim
 * back to where you started. Anything animating the outline progressively
 * gets the crown before the brim closes it, which is the reveal.
 *
 * Units are the rig's own (see the file header) — an adult is 1.73 tall, so
 * this comes out about 0.85 wide. Callers normalise.
 */
export function satgatOutline(slopeSteps = 2, brimSteps = 3, tiltDeg = 20): [number, number][] {
  const p = satgatProfile()
  const l = lens(p)
  const cos = Math.cos(tiltDeg * (Math.PI / 180))
  const sin = Math.sin(tiltDeg * (Math.PI / 180))
  const R = brimRadius(p)
  const yRim = p[p.length - 1][1]

  /** A point on the profile at arc-fraction u, on the `s` side (+1 right). */
  const slope = (u: number, s: number): [number, number] => {
    const q = at(p, l, u)
    return [s * q.r, q.y * cos]
  }

  const out: [number, number][] = []
  out.push(slope(1, -1))                                            // left rim tip
  for (let i = slopeSteps; i >= 1; i--) out.push(slope(i / (slopeSteps + 1), -1))
  out.push(slope(0, 1))                                             // the apex
  for (let i = 1; i <= slopeSteps; i++) out.push(slope(i / (slopeSteps + 1), 1))
  out.push(slope(1, 1))                                             // right rim tip
  // The near half of the rim ellipse, right tip back round to the left.
  for (let i = 1; i <= brimSteps; i++) {
    const th = (i / (brimSteps + 1)) * Math.PI
    out.push([R * Math.cos(th), yRim * cos - R * Math.sin(th) * sin])
  }
  return out
}
