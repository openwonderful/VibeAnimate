/**
 * The hanok set — shared palette, room dimensions and small math helpers.
 *
 * Acts 3, 4 and 5 all keep coming back to the same farmhouse room: the table
 * in 3.3, first steps and the sickbed and the pat in Act 4, the empty table in
 * 5.4. They are supposed to read as *one house* seen across a lifetime, so the
 * room, its dressing and its light live here rather than being rebuilt (and
 * quietly diverging) in every scene file.
 */

export const NIGHT = '#04070E'
export const LAMP_WARM = '#FFBC63'
export const LAMP_CORE = '#FFE7BC'
export const PAPER_WALL = '#573A20'
export const PAPER_PANEL = '#7A5530'
export const WOOD_DARK = '#1E1410'
export const WOOD_MID = '#3A2517'
export const WOOD_WARM = '#5A3A21'
export const FLOOR_WOOD = '#472B19'
export const CLAY = '#6A4830'
export const CLAY_DARK = '#33231A'
export const BRASS = '#A87C3C'
export const RICE = '#F2E4C2'
export const MOON_COOL = '#6E88C4'
export const PERSIMMON = '#C4551C'
export const SOUP_GREEN = '#5C6B32'
export const KIMCHI = '#A33A18'

// ────────────────────────────────────────────────────────────────────
// Room dimensions. Floor is y = 0; the front (+z) is open — the camera
// sits in the doorway looking in, so the side walls run past it.
// ────────────────────────────────────────────────────────────────────
export const ROOM_W = 3.8
export const ROOM_BACK = -1.9
export const ROOM_FRONT = 3.9
export const ROOM_H = 2.05

export const TABLE_TOP = 0.28
export const TABLE_W = 1.24
export const TABLE_D = 0.88

// ────────────────────────────────────────────────────────────────────
// Small math helpers
// ────────────────────────────────────────────────────────────────────
export type V3 = [number, number, number]

export function clamp01(x: number) {
  return x < 0 ? 0 : x > 1 ? 1 : x
}
export function smooth(x: number) {
  const t = clamp01(x)
  return t * t * (3 - 2 * t)
}
/** Eased 0→1 ramp between two absolute times on the anim clock. */
export function ramp(t: number, t0: number, t1: number) {
  return smooth((t - t0) / (t1 - t0))
}
export function mix3(a: V3, b: V3, k: number): V3 {
  return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k]
}
export function rand(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}
