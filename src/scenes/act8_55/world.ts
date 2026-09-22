/**
 * Act 8.5 — procedural world. Pure data + functions, no React.
 *
 * Generates the rice-paddy quilt, the curved road, and the crowd — then
 * assigns every figure a destiny in the sky: 19 of them become the named
 * stars of the Korean constellations, the Seven become Bukduchilseong,
 * and the hundreds of others become the 은하수 — the Milky Way river.
 */
import {
  GOLD, GOLD_AMBER, GOLD_BRIGHT, GOLD_DEEP, GOLD_WARM,
  GOLDEN_Z, HOUSE_Z, igniteRaw, roadX, seededRandom, SKY_R, STAR_BLUE, STAR_PURPLE,
  STAR_WARM, TOUCH_POS,
} from './constants'
import { generateStalls, stallFootprints, type Stall } from './market'
import { bandPoint, buildConstellations, dir, domePos, magToSize, type Constellation, type Vec3 } from './sky'

export { seededRandom }

/* ── Paddy parcels ───────────────────────────────────────────────── */

export type Parcel = {
  x: number; z: number; w: number; d: number
  water: boolean
  /** per-parcel tint jitter 0..1 */
  tone: number
}

function generateParcels(rand: () => number): Parcel[] {
  const parcels: Parcel[] = []
  let z = -1.5
  while (z > -63) {
    const d = 4.5 + rand() * 3
    const zc = z - d / 2
    let x = -45
    while (x < 45) {
      const w = 5 + rand() * 6.5
      const xc = x + w / 2
      x += w + 0.6 // bund gap
      // Keep the road corridor and the house yard clear.
      if (Math.abs(xc - roadX(zc)) < w / 2 + 1.4) continue
      if (Math.hypot(xc, zc - HOUSE_Z) < 5) continue
      parcels.push({ x: xc, z: zc, w, d, water: rand() < 0.74, tone: rand() })
    }
    z -= d + 0.6
  }
  return parcels
}

/* ── Figures ─────────────────────────────────────────────────────── */

export type Archetype = 'tall' | 'short' | 'hunched' | 'child' | 'carrying' | 'wide' | 'thin'

export type Figure = {
  x: number; z: number
  scale: number
  archetype: Archetype
  color: string
  swayOffset: number
  swaySpeed: number
  swayAmount: number
  isMember: boolean
  /** ascent choreography */
  riseStart: number   // absolute scene time the soul leaves the ground
  riseDur: number
  apexY: number
  spiralR: number
  spiralTurns: number
  spiralPhase: number
  /** sky destiny */
  target: Vec3
  targetSize: number
  targetColor: string
  /** named-star bookkeeping (constellation id + star index), if any */
  named?: { con: string; idx: number }
}

const ARCHETYPES: Archetype[] = [
  'tall', 'tall', 'short', 'short', 'hunched', 'child', 'carrying',
  'wide', 'thin', 'tall', 'short', 'hunched', 'thin', 'carrying', 'tall',
]

export function archetypeHeight(a: Archetype): number {
  switch (a) {
    case 'child': return 0.26
    case 'hunched': return 0.36
    case 'short': return 0.4
    case 'wide': return 0.42
    case 'thin': return 0.52
    case 'carrying': return 0.58
    case 'tall': default: return 0.55
  }
}
export function archetypeWidth(a: Archetype): number {
  switch (a) {
    case 'child': return 0.12
    case 'thin': return 0.1
    case 'wide': return 0.19
    case 'carrying': return 0.16
    default: return 0.14
  }
}

const FIELD_CENTER: [number, number] = [0, -24]
const MAX_R = 46

/** [x, z, radius] discs kept figure-free: opening camera path + sightline. */
const OPEN_LANE: [number, number, number][] = [
  [5.4, -13.0, 3.2], [6.8, -11.8, 2.8], [4.2, -10.0, 3.0], [3.1, -7.2, 3.0],
  [0.4, -4.5, 2.6], [-2.2, -1.8, 2.4],
  // The sightline from the opening pose to the two of them, widened. This act
  // was authored on ground whose road SNAKED (`roadX` was a sine); in Act B's
  // valley the road is straight, so the line from (5.4, −13) to the pair at
  // z = −20 now runs a little further inboard than these three discs were cut
  // for, and a figure was standing in the middle of the only shot that matters.
  [4.5, -14.5, 2.4], [3.4, -16.5, 2.4], [2.3, -18.5, 2.2], [1.4, -19.8, 2.0],
]

/**
 * Would a figure standing here be seen DEPARTING, in the 16–22s framing?
 *
 * The ascent order is radial: `mkAscent` gives the ring nearest MAX_R a
 * riseStart of ~18s — local 18s is film 2:40 — and the camera is up at
 * y 11.5→16.5 then, looking down the valley at the pair. So the earliest
 * souls to leave are the ones standing in the band directly behind the two
 * of them, and their bodies dissolve on camera. It reads as the crowd
 * shrinking out of the lens's way rather than as souls departing.
 *
 * The fix is placement, not timing: nobody stands in that band in the first
 * place. The wings (|x| >= 45.5) are deliberately outside it — they fill the
 * corners of this exact frame and they are far enough off-centre that their
 * leaving reads as distance, not as clearing.
 */
function departsOnCamera(x: number, z: number): boolean {
  const r = Math.hypot(x - FIELD_CENTER[0], z - FIELD_CENTER[1])
  return r > 36 && z < -30 && Math.abs(x) < 24
}

function distToSeg(px: number, pz: number, ax: number, az: number, bx: number, bz: number): number {
  const dx = bx - ax
  const dz = bz - az
  const len2 = dx * dx + dz * dz
  const t = len2 < 1e-9 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / len2))
  return Math.hypot(px - (ax + dx * t), pz - (az + dz * t))
}

type Placement = { x: number; z: number }

function placeCrowd(
  rand: () => number,
  parcels: Parcel[],
  count: number,
  blockers: [number, number, number][],
): Placement[] {
  const placements: Placement[] = []
  // Cluster centers on open ground.
  const clusters: Placement[] = []
  for (let i = 0; i < 18; i++) {
    clusters.push({ x: (rand() - 0.5) * 70, z: -3 - rand() * 54 })
  }
  // Bund edges: horizontal + vertical borders of each parcel.
  type Edge = { x0: number; z0: number; x1: number; z1: number }
  const edges: Edge[] = []
  for (const p of parcels) {
    edges.push({ x0: p.x - p.w / 2, z0: p.z - p.d / 2, x1: p.x + p.w / 2, z1: p.z - p.d / 2 })
    edges.push({ x0: p.x - p.w / 2, z0: p.z + p.d / 2, x1: p.x + p.w / 2, z1: p.z + p.d / 2 })
    edges.push({ x0: p.x - p.w / 2, z0: p.z - p.d / 2, x1: p.x - p.w / 2, z1: p.z + p.d / 2 })
    edges.push({ x0: p.x + p.w / 2, z0: p.z - p.d / 2, x1: p.x + p.w / 2, z1: p.z + p.d / 2 })
  }

  let guard = 0
  while (placements.length < count && guard++ < count * 30) {
    const kind = rand()
    let x: number
    let z: number
    if (kind < 0.45 && edges.length) {
      // Along a paddy bund — from above the crowd traces the terrace filigree.
      const e = edges[Math.floor(rand() * edges.length)]
      const s = rand()
      x = e.x0 + (e.x1 - e.x0) * s + (rand() - 0.5) * 0.5
      z = e.z0 + (e.z1 - e.z0) * s + (rand() - 0.5) * 0.5
    } else if (kind < 0.75) {
      // Loose cluster.
      const c = clusters[Math.floor(rand() * clusters.length)]
      x = c.x + (rand() + rand() - 1) * 3.2
      z = c.z + (rand() + rand() - 1) * 3.2
    } else if (kind < 0.9) {
      // Lining the road.
      z = -rand() * 58
      const side = rand() > 0.5 ? 1 : -1
      x = roadX(z) + side * (2.0 + rand() * 1.6)
    } else {
      // Scattered.
      x = (rand() - 0.5) * 88
      z = 1 - rand() * 63
    }
    if (Math.abs(x) > 44 || z > 0.5 || z < -62) continue
    if (Math.abs(x - roadX(z)) < 1.7) continue                    // keep the road open
    if (Math.hypot(x, z - HOUSE_Z) < 3.4) continue                // house footprint
    if (z > -2.5 && Math.abs(x) < 9) continue                     // dolly lane for phase A
    // 8.51 opens close-up: keep the pull-back path and the sightline from
    // the opening camera to the golden figure clear of blockers.
    if (departsOnCamera(x, z)) continue
    if (OPEN_LANE.some(([lx, lz, r]) => Math.hypot(x - lx, z - lz) < r)) continue
    if (blockers.some(([bx, bz, r]) => Math.hypot(x - bx, z - bz) < r)) continue // stalls
    placements.push({ x, z })
  }
  return placements
}

/* ── Sky destiny assignment ──────────────────────────────────────── */

const SOUL_MIX = [STAR_WARM, STAR_WARM, GOLD, STAR_PURPLE, STAR_WARM, STAR_BLUE, GOLD_WARM]

export type World = {
  parcels: Parcel[]
  figures: Figure[]
  constellations: Constellation[]
  /** the night market the crowd is here for */
  stalls: Stall[]
  /** carried children: index into figures (the parent) */
  carriedBy: number[]
  /** per-constellation completion time (last star locks) — lines draw after */
  lockTimes: Record<string, number>
}

export function generateWorld(seed = 20260725): World {
  const rand = seededRandom(seed)
  const parcels = generateParcels(rand)
  const constellations = buildConstellations()

  // The market goes down first and the crowd is placed around it — a figure
  // standing inside a cart is worse than a thinner crowd. Its own generator has
  // its own seed, so re-tuning the market can't shuffle the whole valley.
  const stalls = generateStalls()
  const blockers = stallFootprints(stalls)

  const N_MAIN = 3000
  const placements = placeCrowd(rand, parcels, N_MAIN, blockers)

  // 8.55: THE WINGS — mid-distance flanks beyond the main field (the empty
  // top-left/top-right corners of the ~17s frame). They wake on the heavy
  // beats: when the drums land, thousands more are suddenly there.
  let guard = 0
  const wingTarget = N_MAIN + 560
  while (placements.length < wingTarget && guard++ < 20000) {
    const side = rand() > 0.5 ? 1 : -1
    const x = side * (45.5 + Math.pow(rand(), 0.9) * 25)
    const z = -4 - rand() * 58
    placements.push({ x, z })
  }
  // ...and a little more near-foreground fill under the camera.
  const nearTarget = wingTarget + 150
  while (placements.length < nearTarget && guard++ < 40000) {
    const x = (rand() - 0.5) * 34
    const z = -1.5 - rand() * 13
    if (Math.abs(x - roadX(z)) < 1.8) continue
    if (z > -2.5 && Math.abs(x) < 9) continue
    if (OPEN_LANE.some(([lx, lz, r]) => Math.hypot(x - lx, z - lz) < r)) continue
    if (blockers.some(([bx, bz, r]) => Math.hypot(x - bx, z - bz) < r)) continue
    placements.push({ x, z })
  }

  // THE RIGHT SHOULDER. OPEN_LANE is a chain of 2–3.2-unit discs centred on the
  // opening camera's path, and that path runs down the +x side of the road — so
  // every pass above is excluded from exactly the near-right wedge the camera
  // spends its first ten seconds looking across. The result was a frame packed
  // solid on the left and bald in the bottom-right corner.
  //
  // These figures answer to a tighter rule instead of the whole lane: stay out
  // of the camera's actual tube, stay off the sightline to the singer, and
  // otherwise stand wherever. The tube is fattest at the opening position,
  // where the camera is at eye height and a figure two metres away would fill
  // a third of the frame.
  const shoulderTarget = nearTarget + 700
  let sGuard = 0
  while (placements.length < shoulderTarget && sGuard++ < 90000) {
    const x = 3.4 + Math.pow(rand(), 0.72) * 19
    const z = -1.5 - rand() * 27
    if (Math.hypot(x - 5.4, z + 13.0) < 2.1) continue                        // the opening pose
    if (distToSeg(x, z, 5.4, -13.0, 3.3, -5.6) < 1.9) continue               // the pull-back
    if (distToSeg(x, z, 3.3, -5.6, -2.4, 0.5) < 1.9) continue
    if (distToSeg(x, z, 5.4, -13.0, roadX(GOLDEN_Z), GOLDEN_Z) < 1.9) continue // the sightline
    if (Math.abs(x - roadX(z)) < 1.8) continue
    if (Math.hypot(x, z - HOUSE_Z) < 3.4) continue
    if (blockers.some(([bx, bz, r]) => Math.hypot(x - bx, z - bz) < r)) continue
    placements.push({ x, z })
  }

  // THE BOTTOM-RIGHT CORNER, specifically. The pass above spreads 700 figures
  // over 500-odd square units and the corner still came up thin, because the
  // corner is *small*: the wedge the opening lens covers below the road is only
  // about 4–8 units out from the camera, on the +x side. Ray-cast from the
  // t=0 pose, the bottom-right of frame lands around (6, −17) to (6, −20) —
  // ten square metres that every earlier rule has some reason to avoid.
  //
  // So it gets its own pass at four times the field density. These stand close
  // enough to the lens to be cropped by the bottom edge, which is the point:
  // a crowd with nothing in the near foreground reads as a crowd you are
  // looking at, not one you are standing in.
  const cornerTarget = shoulderTarget + 190
  let cGuard = 0
  while (placements.length < cornerTarget && cGuard++ < 40000) {
    const x = 3.6 + Math.pow(rand(), 0.8) * 9
    const z = -13.5 - rand() * 12
    if (Math.hypot(x - 5.4, z + 13.0) < 2.1) continue
    if (distToSeg(x, z, 5.4, -13.0, roadX(GOLDEN_Z), GOLDEN_Z) < 1.9) continue
    if (Math.abs(x - roadX(z)) < 1.8) continue
    if (Math.hypot(x, z - HOUSE_Z) < 3.4) continue
    if (blockers.some(([bx, bz, r]) => Math.hypot(x - bx, z - bz) < r)) continue
    placements.push({ x, z })
  }

  // The Seven — hand-seeded mid-field near the road, one per Dipper star.
  // (8.51: two spots moved off the opening camera's foreground/sightline)
  const memberSpots: Placement[] = [
    { x: -3.4, z: -13.5 }, { x: -3.6, z: -11.2 }, { x: -4.8, z: -16.5 },
    { x: -6.2, z: -14.6 }, { x: -3.0, z: -19 }, { x: 3.8, z: -20 }, { x: 0.4 + roadX(-23) + 2.2, z: -23 },
  ]

  const figures: Figure[] = []
  const carriedBy: number[] = []

  // Named (non-Dipper) star targets to hand out to ordinary figures.
  type NamedTarget = { con: string; idx: number; pos: Vec3; size: number; color: string }
  const namedPool: NamedTarget[] = []
  for (const c of constellations) {
    if (c.id === 'bukdu' || c.id === 'satgat' || c.id === 'heart') continue
    c.stars.forEach((pos, idx) => {
      namedPool.push({ con: c.id, idx, pos, size: magToSize(c.mags[idx]), color: c.color })
    })
  }
  // Named stars must lock early (arrive ≤ ~42s): hand them to every 24th figure.
  let namedCursor = 0

  /**
   * 삿갓 — handed to the people who were CARRYING someone.
   *
   * The hat is the parent's, and the last thing this film says about that
   * parent is Act 4.9: carried up the road with the hat off her head and in
   * her hand, because you take your hat off to be picked up. So the ten stars
   * that draw it are ten souls who spent the night with a child on their
   * back. It is not visible in the frame that they are — the point is that
   * it is TRUE in the data, so nothing downstream has to remember it.
   *
   * Taken on a stride rather than in order: `ordinary` is sorted west→east,
   * and the first ten carriers in that list all stand in the same corner of
   * the field, which would send the whole hat up out of one place.
   */
  /**
   * ♥ — handed to the CHILDREN, which is the other half of the same idea.
   * The hat goes up out of the people who carried someone; the heart goes up
   * out of the ones who were small enough to be carried.
   */
  const drawnPool = (id: string): NamedTarget[] => {
    const c = constellations.find(k => k.id === id)!
    return c.stars.map((pos, idx) => ({
      con: id, idx, pos, size: magToSize(c.mags[idx]), color: c.color,
    }))
  }
  const satgatPool = drawnPool('satgat')
  const heartPool = drawnPool('heart')
  let carriers = 0
  let children = 0

  type AscentKind = 'ordinary' | 'named' | 'member' | 'satgat' | 'heart'

  const mkAscent = (x: number, z: number, kind: AscentKind) => {
    const r = Math.hypot(x - FIELD_CENTER[0], z - FIELD_CENTER[1])
    // 8.53: ONE long ascent, no second wave — every soul departs in the
    // 18–28s window with a slow 13–17.5s flight.
    //
    // Every branch below draws EXACTLY TWO rand()s, and must keep doing so.
    // The generator is one shared stream and the crowd's whole layout is
    // downstream of it, so a branch that spends a third number here shuffles
    // three thousand people standing in a field.
    let riseStart: number
    let dur: number
    if (kind === 'satgat') {
      // LAST. The other constellations lock around 30–33s and have drawn
      // themselves long before the camera settles; the hat is the closing
      // image, so its ten stars leave with the Seven and arrive at ~40–41.4,
      // which puts its ten line segments (0.3s apart, +0.9 to draw) across
      // 41.9–45.5 — inside the held final framing, finished with a couple of
      // seconds of sky left to look at it in.
      riseStart = 26.0 + rand() * 0.8
      dur = 14.0 + rand() * 0.6
    } else if (kind === 'heart') {
      // A beat AHEAD of the hat — arriving ~38–39.1, drawn out by ~42.6 —
      // so the two do not race each other across the frame and the hat is
      // still the last line to land.
      riseStart = 25.0 + rand() * 0.6
      dur = 13.0 + rand() * 0.5
    } else if (kind === 'member') {
      riseStart = 26 + rand() * 0.8
      dur = 13.2 + rand() * 0.8
    } else if (kind === 'named') {
      riseStart = 18.4 + rand() * 1.6
      dur = 11.5 + rand() * 1.5
    } else {
      riseStart = 18 + (MAX_R - Math.min(r, MAX_R)) * 0.11 + rand() * 5
      dur = 13 + rand() * 4.5
    }
    return {
      riseStart,
      riseDur: dur,
      apexY: 16 + rand() * 10,
      spiralR: 0.3 + rand() * 1.0,
      spiralTurns: 1.4 + rand() * 1.9,
      spiralPhase: rand() * Math.PI * 2,
    }
  }

  // Ordinary crowd → milky way band (sorted so the river doesn't cross itself:
  // west-side figures flow to the high/NW end of the band).
  const ordinary = placements.map((p, i) => ({ p, i })).sort((a, b) => a.p.x - b.p.x)
  const bandTargets: { pos: Vec3; size: number; color: string }[] = []
  for (let i = 0; i < placements.length; i++) {
    const u = rand()
    const s = 1 - Math.min(1, Math.max(0, (u + (rand() - 0.5) * 0.25)))
    // Denser toward the band core; occasional far-flung stragglers.
    const g = (rand() + rand() + rand() - 1.5) / 1.5
    const off = g * (rand() < 0.85 ? 0.095 : 0.2)
    const rJitter = SKY_R * (0.97 + rand() * 0.05)
    // Most souls join the river; some scatter across the whole sky so the
    // final frame is FULL of new stars, not just one band.
    const scatterSky = rand() < 0.13
    bandTargets.push({
      pos: scatterSky
        ? domePos(dir(-70 + rand() * 160, 14 + rand() * 68), rJitter)
        : bandPoint(s, off, rJitter),
      size: scatterSky ? 0.1 + rand() * 0.12 : 0.09 + rand() * 0.13,
      color: SOUL_MIX[Math.floor(rand() * SOUL_MIX.length)],
    })
  }
  bandTargets.sort((a, b) => b.pos[0] - a.pos[0]) // east→west matches figure sort below? see zip
  // Zip: westmost figures get westmost targets (band high end has negative x).
  bandTargets.reverse()

  for (let k = 0; k < ordinary.length; k++) {
    const { p, i: srcIdx } = ordinary[k]
    const isWing = srcIdx >= N_MAIN && srcIdx < wingTarget // far flanks only
    const isExtra = srcIdx >= N_MAIN // wings + near-fill (both skip named stars)
    const archetype = ARCHETYPES[Math.floor(rand() * ARCHETYPES.length)]
    const baseScale =
      archetype === 'child' ? 0.3 + rand() * 0.15
      : archetype === 'hunched' ? 0.55 + rand() * 0.15
      : archetype === 'short' ? 0.5 + rand() * 0.15
      : archetype === 'carrying' ? 0.7 + rand() * 0.15
      : archetype === 'wide' ? 0.6 + rand() * 0.1
      : archetype === 'thin' ? 0.65 + rand() * 0.15
      : 0.6 + rand() * 0.2

    // The two drawn shapes get first refusal on their own kind of person;
    // the catalogs take the rest. Both are taken on a STRIDE rather than in
    // order — `ordinary` is sorted west→east, so the first ten carriers (or
    // children) in it all stand in the same corner of the field, and the
    // whole shape would go up out of one place.
    const takeSatgat =
      satgatPool.length > 0 && archetype === 'carrying' && !isExtra && carriers++ % 30 === 14
    const takeHeart =
      !takeSatgat && heartPool.length > 0 && archetype === 'child' && !isExtra && children++ % 15 === 7
    const takeNamed = !takeSatgat && !takeHeart
      && namedPool.length > 0 && k % 24 === 12 && !isExtra
    const named = takeSatgat ? satgatPool.shift()!
      : takeHeart ? heartPool.shift()!
      : takeNamed ? namedPool[namedCursor++ % namedPool.length]
      : undefined
    if (takeNamed && namedCursor >= namedPool.length) namedPool.length = 0

    const t = named ?? bandTargets[k]
    const fig: Figure = {
      x: p.x, z: p.z,
      scale: baseScale,
      archetype,
      color: WARM_COLORS[Math.floor(rand() * WARM_COLORS.length)],
      swayOffset: rand() * Math.PI * 2,
      swaySpeed: 0.4 + rand() * 0.3,
      swayAmount: 0.035 + rand() * 0.045,
      isMember: false,
      ...mkAscent(p.x, p.z, takeSatgat ? 'satgat' : takeHeart ? 'heart' : named ? 'named' : 'ordinary'),
      target: t.pos,
      targetSize: named ? named.size : bandTargets[k].size,
      targetColor: t.color,
      named: named ? { con: named.con, idx: named.idx } : undefined,
    }
    // The ring reaches everyone by distance, and nobody by lottery. 8.54 used
    // to wake a random quarter of the crowd on random heavy beats — which is a
    // fine way to make a world keep growing, and a terrible way to draw a
    // circle. The expanding ring IS the scene now, so the only thing that
    // decides when a figure lights is how far it stands from the two hands.
    //
    // The wings sit 40–88 units out, so they still land on the heavy hits;
    // they get there by being far away rather than by being told to.
    const dTouch = Math.hypot(p.x - TOUCH_POS[0], p.z - TOUCH_POS[2])
    // A soul can't leave before it catches light — clamped rather than
    // re-derived, so the near field (which lights in the first seconds) keeps
    // 8.53's timing. The whole valley burns by 16.8 now, so this floor mostly
    // sleeps; the far wings rise on their base 18–23 schedule, which is what
    // puts the first bubbles in the air as Arirang line 4 arrives.
    fig.riseStart = Math.max(fig.riseStart, igniteRaw(dTouch) + 1.6)
    if (isWing) fig.riseDur = 10.5 + rand() * 3
    figures.push(fig)
    if (archetype === 'carrying') carriedBy.push(figures.length - 1)
  }

  // The Seven → Bukduchilseong, in catalog order (Dubhe → Alkaid).
  const bukdu = constellations.find(c => c.id === 'bukdu')!
  memberSpots.forEach((p, mi) => {
    figures.push({
      x: p.x, z: p.z,
      scale: 0.82 + (mi % 3) * 0.05,
      archetype: 'tall',
      color: GOLD_BRIGHT,
      swayOffset: rand() * Math.PI * 2,
      swaySpeed: 0.42 + rand() * 0.2,
      swayAmount: 0.04,
      isMember: true,
      ...mkAscent(p.x, p.z, 'member'),
      target: bukdu.stars[mi],
      targetSize: magToSize(bukdu.mags[mi]) * 1.5,
      targetColor: GOLD_BRIGHT,
      named: { con: 'bukdu', idx: mi },
    })
  })

  // Per-constellation lock time = when its last star arrives.
  const lockTimes: Record<string, number> = {}
  for (const f of figures) {
    if (!f.named) continue
    const arrive = f.riseStart + f.riseDur
    lockTimes[f.named.con] = Math.max(lockTimes[f.named.con] ?? 0, arrive)
  }

  return { parcels, figures, constellations, stalls, carriedBy, lockTimes }
}

const WARM_COLORS = [GOLD_BRIGHT, GOLD, GOLD_AMBER, GOLD_WARM, GOLD_DEEP, GOLD, GOLD_AMBER]
