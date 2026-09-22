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
  HOUSE_Z, roadX, SKY_R, STAR_BLUE, STAR_PURPLE, STAR_WARM,
  T_ASCEND,
} from './constants'
import { bandPoint, buildConstellations, dir, domePos, magToSize, type Constellation, type Vec3 } from './sky'

export function seededRandom(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

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
  while (z > -47) {
    const d = 4.5 + rand() * 3
    const zc = z - d / 2
    let x = -29
    while (x < 29) {
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
const MAX_R = 32

/** [x, z, radius] discs kept figure-free: opening camera path + sightline. */
const OPEN_LANE: [number, number, number][] = [
  [5.4, -13.0, 3.2], [6.8, -11.8, 2.8], [4.2, -10.0, 3.0], [3.1, -7.2, 3.0],
  [0.4, -4.5, 2.6], [-2.2, -1.8, 2.4],
  [4.5, -14.5, 2.0], [3.4, -16.5, 1.9], [2.3, -18.5, 1.7],
]

type Placement = { x: number; z: number }

function placeCrowd(rand: () => number, parcels: Parcel[], count: number): Placement[] {
  const placements: Placement[] = []
  // Cluster centers on open ground.
  const clusters: Placement[] = []
  for (let i = 0; i < 12; i++) {
    clusters.push({ x: (rand() - 0.5) * 44, z: -4 - rand() * 38 })
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
      z = -rand() * 44
      const side = rand() > 0.5 ? 1 : -1
      x = roadX(z) + side * (2.0 + rand() * 1.6)
    } else {
      // Scattered.
      x = (rand() - 0.5) * 56
      z = 1 - rand() * 47
    }
    if (Math.abs(x) > 28 || z > 0.5 || z < -46) continue
    if (Math.abs(x - roadX(z)) < 1.7) continue                    // keep the road open
    if (Math.hypot(x, z - HOUSE_Z) < 3.4) continue                // house footprint
    if (z > -2.5 && Math.abs(x) < 9) continue                     // dolly lane for phase A
    // 8.51 opens close-up: keep the pull-back path and the sightline from
    // the opening camera to the golden figure clear of blockers.
    if (OPEN_LANE.some(([lx, lz, r]) => Math.hypot(x - lx, z - lz) < r)) continue
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
  /** carried children: index into figures (the parent) */
  carriedBy: number[]
  /** per-constellation completion time (last star locks) — lines draw after */
  lockTimes: Record<string, number>
}

export function generateWorld(seed = 20260725): World {
  const rand = seededRandom(seed)
  const parcels = generateParcels(rand)
  const constellations = buildConstellations()

  const N = 1150
  const placements = placeCrowd(rand, parcels, N)

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
    if (c.id === 'bukdu') continue
    c.stars.forEach((pos, idx) => {
      namedPool.push({ con: c.id, idx, pos, size: magToSize(c.mags[idx]), color: c.color })
    })
  }
  // Named stars must lock early (arrive ≤ ~42s): hand them to every 24th figure.
  let namedCursor = 0

  const mkAscent = (x: number, z: number, named: boolean, member: boolean) => {
    const r = Math.hypot(x - FIELD_CENTER[0], z - FIELD_CENTER[1])
    // 8.52: THE LONG ASCENT. Most souls drift upward from t≈18 with slow
    // 13–17s flights — the camera descends into the middle of them. The
    // rest stay grounded, singing, jump on the beat drop and follow fast.
    let riseStart: number
    let dur: number
    if (member) {
      riseStart = 26 + rand() * 0.8
      dur = 13.2 + rand() * 0.8
    } else if (named) {
      riseStart = 18.4 + rand() * 1.6
      dur = 11.5 + rand() * 1.5
    } else if (rand() < 0.62) {
      riseStart = 18 + (MAX_R - Math.min(r, MAX_R)) * 0.14 + rand() * 4.5
      dur = 13 + rand() * 4.5
    } else {
      riseStart = T_ASCEND + rand() * 1.8 + (MAX_R - Math.min(r, MAX_R)) * 0.03
      dur = 6 + rand() * 2.5
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
    const { p } = ordinary[k]
    const archetype = ARCHETYPES[Math.floor(rand() * ARCHETYPES.length)]
    const baseScale =
      archetype === 'child' ? 0.3 + rand() * 0.15
      : archetype === 'hunched' ? 0.55 + rand() * 0.15
      : archetype === 'short' ? 0.5 + rand() * 0.15
      : archetype === 'carrying' ? 0.7 + rand() * 0.15
      : archetype === 'wide' ? 0.6 + rand() * 0.1
      : archetype === 'thin' ? 0.65 + rand() * 0.15
      : 0.6 + rand() * 0.2

    const takeNamed = namedPool.length > 0 && k % 24 === 12
    const named = takeNamed ? namedPool[namedCursor++ % namedPool.length] : undefined
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
      ...mkAscent(p.x, p.z, !!named, false),
      target: t.pos,
      targetSize: named ? named.size : bandTargets[k].size,
      targetColor: t.color,
      named: named ? { con: named.con, idx: named.idx } : undefined,
    }
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
      ...mkAscent(p.x, p.z, false, true),
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

  return { parcels, figures, constellations, carriedBy, lockTimes }
}

const WARM_COLORS = [GOLD_BRIGHT, GOLD, GOLD_AMBER, GOLD_WARM, GOLD_DEEP, GOLD, GOLD_AMBER]
