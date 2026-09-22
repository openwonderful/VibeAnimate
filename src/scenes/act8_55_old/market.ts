/**
 * The night market (야시장) — deterministic layout, no React.
 *
 * The valley is holding a festival. That is the answer to the question 8.55
 * never used to answer: why are four thousand people standing in a rice paddy
 * at night before anyone starts singing? They were already here. The hero walks
 * home into a market that has nothing to do with him.
 *
 * Two rules the layout obeys, both of them load-bearing:
 *
 *   1. NOTHING NEAR THE HOUSE. The stretch of road the house sits on is kept
 *      empty (`HOUSE_CLEAR`) — the homecoming has to happen in a quiet pocket,
 *      and a stall between the hero and the parent would wreck the only shot in
 *      the scene that matters.
 *   2. NOTHING IN THE OPENING LANE. 8.55's camera starts on the road at
 *      z = −13 and glides out through z ≈ 0; a stall in that tube is a wall
 *      across the first ten seconds.
 *
 * `stallFootprints()` is fed back into `placeCrowd` so nobody stands inside a
 * cart. Everything is built from `seededRandom` — a layout made of bare
 * `Math.random()` gets a different result in every Remotion tab and the whole
 * market strobes.
 */
import { HOUSE_Z, roadX } from './constants'
import { seededRandom } from './world'

/* ── Palette: the cool the gold field needs ──────────────────────── */

/** Galvanised carts. The one genuinely un-gold thing in the valley. */
export const CART_METAL = '#4A4F57'
export const CART_METAL_DARK = '#31353B'
export const STALL_WOOD = '#2C2118'
/** Awning cloth — dancheong reds and greens, dark enough to sit under gold. */
export const CLOTH_COLORS = ['#7A3327', '#6B2E24', '#26463C', '#1F3B44', '#5C3520', '#2B4A36']
export const LANTERN_COLOR = '#F0A850'

/* ── Where the market may and may not be ─────────────────────────── */

/** Road-centre stretch left completely empty for the homecoming. */
const HOUSE_CLEAR: [number, number] = [-17.5, -34]
/** The opening camera's tube, as a polyline in the ground plane. */
const CAM_TUBE: [number, number][] = [[5.4, -13.0], [3.3, -5.6], [-2.4, 0.5]]
const CAM_TUBE_R = 3.2

function distToSeg(px: number, pz: number, ax: number, az: number, bx: number, bz: number): number {
  const dx = bx - ax
  const dz = bz - az
  const len2 = dx * dx + dz * dz
  const t = len2 < 1e-9 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / len2))
  return Math.hypot(px - (ax + dx * t), pz - (az + dz * t))
}

function inCameraTube(x: number, z: number, r: number): boolean {
  for (let i = 0; i < CAM_TUBE.length - 1; i++) {
    if (distToSeg(x, z, CAM_TUBE[i][0], CAM_TUBE[i][1], CAM_TUBE[i + 1][0], CAM_TUBE[i + 1][1]) < r) {
      return true
    }
  }
  return false
}

/* ── Stalls ──────────────────────────────────────────────────────── */

export type StallKind = 'canopy' | 'cart'

export type Stall = {
  x: number
  z: number
  /** Yaw, radians — every stall faces the road. */
  rotY: number
  kind: StallKind
  /** Along the road frontage / into the stall. */
  w: number
  d: number
  cloth: string
  /** 0..1 tint jitter. */
  tone: number
  /** Local lantern offsets, [x, y, z] in stall space. */
  lamps: [number, number, number][]
}

/**
 * A double row down the road, thinning with distance. Sides alternate so the
 * market reads as an aisle rather than a wall, and each stall is turned to face
 * the road it fronts onto — which, on a road that curves, means the yaw has to
 * come from the road's own tangent.
 */
export function generateStalls(seed = 85510): Stall[] {
  const rand = seededRandom(seed)
  const out: Stall[] = []

  // Both sides at every step rather than alternating: a market is an aisle you
  // walk down, and alternating single stalls at 5-unit spacing produced four
  // survivors once the two clear zones took their cut.
  for (let z = 6; z > -56; z -= 2.0 + rand() * 1.3) {
    for (const side of [1, -1]) {
      if (rand() < 0.3) continue                                   // gaps in the row
      if (z < HOUSE_CLEAR[0] && z > HOUSE_CLEAR[1]) continue       // the quiet pocket
      // A back row now and then, so the market has depth off the road.
      const back = rand() < 0.26
      const off = back ? 4.9 + rand() * 1.5 : 2.3 + rand() * 1.35
      const x = roadX(z) + side * off
      if (inCameraTube(x, z, CAM_TUBE_R)) continue
      if (Math.hypot(x, z - HOUSE_Z) < 7.5) continue

      // Face the road: for a road x = f(z) the frontage normal is (1, −f'(z)),
      // so the "back to the field, front to the road" yaw follows the tangent
      // instead of being a flat ±90° that only looks right where it is straight.
      const slope = roadX(z + 0.5) - roadX(z - 0.5)
      const rotY = -side * Math.PI / 2 + Math.atan(slope) * side + (rand() - 0.5) * 0.18

      const kind: StallKind = rand() < 0.42 ? 'cart' : 'canopy'
      const w = kind === 'cart' ? 1.5 + rand() * 0.5 : 1.9 + rand() * 1.0
      const d = kind === 'cart' ? 0.8 + rand() * 0.25 : 1.2 + rand() * 0.5
      // Hung just under the eaves — the roof went up to 2.1 to clear the
      // crowd's heads, and a lamp left at 1.5 hangs behind the counter
      // instead of over it.
      const lamps: [number, number, number][] = kind === 'cart'
        ? [[w * 0.36, 1.78, d * 0.44]]
        : rand() < 0.45
          ? [[-w * 0.42, 1.86, d * 0.5], [w * 0.42, 1.86, d * 0.5]]
          : [[w * 0.38, 1.86, d * 0.5]]

      out.push({
        x, z, rotY, kind, w, d,
        cloth: CLOTH_COLORS[Math.floor(rand() * CLOTH_COLORS.length)],
        tone: rand(),
        lamps,
      })
    }
  }
  return out
}

/** [x, z, radius] discs the crowd must not stand in. */
export function stallFootprints(stalls: Stall[]): [number, number, number][] {
  return stalls.map(s => [s.x, s.z, Math.max(s.w, s.d) * 0.62 + 0.55] as [number, number, number])
}

/* ── The banner over the road ────────────────────────────────────── */

/**
 * Strung across the road where he first reaches the village, high enough to
 * walk under. Its z is chosen for 7.2: the hero passes it around act 22, so it
 * is legible for a good while before he is under it.
 */
export const BANNER_Z = -4.5
export const BANNER_Y = 3.0
export const BANNER_TEXT = '야시장'
export const BANNER_SUB = '한가위 축제'

/* ── Pennant strings ─────────────────────────────────────────────── */

export type Pennant = { ax: number; az: number; bx: number; bz: number; y: number; n: number }

/**
 * Little strings of lights hopping from stall to stall along each side. Cheap,
 * and they do more for "festival" than the stalls themselves — a straight run
 * of warm dots at head height reads as a market from any distance.
 */
export function generatePennants(stalls: Stall[]): Pennant[] {
  const out: Pennant[] = []
  const bySide = (s: Stall) => (s.x - roadX(s.z) > 0 ? 1 : -1)
  for (const dir of [1, -1]) {
    const row = stalls.filter(s => bySide(s) === dir).sort((a, b) => b.z - a.z)
    for (let i = 0; i < row.length - 1; i++) {
      const a = row[i]
      const b = row[i + 1]
      // Don't span the quiet pocket, or the camera lane the gap was cut for.
      if (Math.abs(a.z - b.z) > 9) continue
      out.push({ ax: a.x, az: a.z, bx: b.x, bz: b.z, y: 2.05, n: 7 })
    }
  }
  return out
}
