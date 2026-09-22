/**
 * Where the homecoming happens: Act 8.55's village space, placed inside Act B's
 * valley.
 *
 * Acts 7 and 8 were built before Act B existed, on their own ground — their own
 * terrain, their own house, their own ridge with their own skyline behind it,
 * their own night sky. All of it was a lookalike for the valley the rest of the
 * film is set in, and the moment Act B existed, the seam showed: he leaves a
 * hanok at the end of Act B's road (5.1) and comes home to a different house in
 * a different valley under a different sky.
 *
 * This module is the fix, and it is a coordinate change rather than a rewrite.
 * Everything in acts 7 and 8 stays authored where it was authored — in VILLAGE
 * units, where an adult figure is 1.9 tall and the fog is 26 units deep —
 * and gets mounted inside Act B's valley through one transform:
 *
 *     <ValleyStill at={…} people={false} />     ← Act B's ground, house, range,
 *     <Village>                                   sky, fog, key light, grade
 *       …everything acts 7/8 already draw…
 *     </Village>
 *
 * ── The transform ────────────────────────────────────────────────────
 * Two things fix it completely:
 *
 *   1. SCALE. Act B's adult is 20× the figure rig's, so village units go in at
 *      `S` = 20. Same number Act 5.1 uses for the same reason.
 *   2. A HALF TURN. Act 8.55 authors its road running out to +z away from its
 *      house; Act B's road runs out to −z away from its own. One rotation of π
 *      makes those the same road, pointing the same way — so "walking home" is
 *      village −z in both, and no gait, key or pose has to be re-signed.
 *
 * The origin then follows from one requirement: 8.55's house has to land on Act
 * B's house, because that is the entire point. `ORIGIN_Z` is solved for, not
 * chosen — see below — so if either act ever moves its house, the two stay
 * married.
 *
 * ── What does NOT come through the transform ─────────────────────────
 * The camera. A camera inside a scaled group would have its near/far planes
 * and its fov scaled with it, so the rigs stay in world space and map their
 * authored village-space poses through `toWorld()` instead. That is the only
 * thing an act has to remember to do.
 *
 * ── The one thing that had to actually move ──────────────────────────
 * Act 8.55's field of people ran from village z=−62 to z=0 — that is, it spread
 * out BEYOND its house, away from the road. In Act B's valley the ground beyond
 * the house is not field, it is the pass: the first ridge band's low fill-hills
 * have footprints from z=−258 back to z=+898, which is why Act B's house sits
 * at −400 in the last clear stretch of the axis. A crowd laid out behind that
 * house stands in a mountain.
 *
 * So the field moved to the road side of the house, where in Act B there are
 * five hundred clear units of paddy for every one the old layout had: `FIELD_Z0`
 * / `FIELD_Z1` below are village z, and everything that populates the valley
 * floor — parcels, crowd, market, far crowd — is generated between them.
 */
import type { ReactNode } from 'react'
import { HOUSE_X, HOUSE_Z, VALLEY_Y } from '../actB/flight'
import { HOUSE_Z as VILLAGE_HOUSE_Z } from './constants'

/** Act B world units per village unit. Act B's adult is 20× the figure rig's. */
export const S = 20

/**
 * Road level. Act B's valley floor is at `VALLEY_Y` and its road surface sits
 * 6.2 above it — the same y Act B's own pair walks at, and the one Act 5.1
 * stands its figures on.
 */
export const ROAD_Y = VALLEY_Y + 6.2

/**
 * Solved, not chosen: village z=`VILLAGE_HOUSE_Z` must land on Act B's
 * `HOUSE_Z`, and the half turn makes world z = ORIGIN_Z − S·village z, so
 *
 *     HOUSE_Z = ORIGIN_Z − S·VILLAGE_HOUSE_Z   ⟹   ORIGIN_Z = HOUSE_Z + S·VILLAGE_HOUSE_Z
 */
export const ORIGIN_X = HOUSE_X
export const ORIGIN_Z = HOUSE_Z + S * VILLAGE_HOUSE_Z
export const ORIGIN: [number, number, number] = [ORIGIN_X, ROAD_Y, ORIGIN_Z]

/**
 * A point in village units → Act B world units. The rigs' authored poses go
 * through this; anything drawn goes inside `<Village>` instead and gets the
 * same transform from the scene graph.
 */
export function toWorld(x: number, y: number, z: number): [number, number, number] {
  return [ORIGIN_X - S * x, ROAD_Y + S * y, ORIGIN_Z - S * z]
}

/** Convenience for the many places holding a pose as a tuple. */
export function toWorldV(p: readonly [number, number, number]): [number, number, number] {
  return toWorld(p[0], p[1], p[2])
}

/** A village-space distance in Act B world units. */
export const toWorldLen = (d: number) => d * S

/* ── The field ───────────────────────────────────────────────────────
 * The valley floor acts 7 and 8 populate, in village z.
 *
 * `FIELD_Z0` is the up-road end and it is pinned as close to the house as the
 * geometry allows. Village −22 is Act B world −480, which is 46 world units
 * down-valley of the hanok's front wall — so the crowd runs right up to the
 * yard and the opening shot, which looks UP the road at the two of them, has
 * banks of people flanking the lens all the way to the door. It used to stop at
 * −12, twelve units short, and that gap is most of why that frame had no crowd
 * in it.
 *
 * It cannot go further: village z < −26 is Act B world z > −400, which is the
 * first ridge band's fill-hills (footprints from −258 back to +898). A crowd
 * laid out there stands in a mountain. That is the one thing the valley really
 * does forbid, and it costs a distant band behind the house — which Act B's own
 * range and its risen city now occupy instead, and better.
 *
 * `FIELD_Z1` is the down-valley end, and it is where the shot spends its second
 * half: the camera turns as it climbs and the ocean runs away from it across
 * seventy units of barren valley.
 */
export const FIELD_Z0 = -22
export const FIELD_Z1 = 50
/**
 * Half-width of the field in village x. Back to 8.55-old's ±44 — ±880 world —
 * and this number is DENSITY, not extent.
 *
 * A cut of this act widened it to ±62 on the reasoning that Act B's valley is
 * 4,600 units wide so there was room. There was room, and that was the problem:
 * the same four and a half thousand figures spread over 8,900 square units
 * instead of 6,300 is 0.49 people per unit against 0.70, and at the altitude the
 * high oblique looks from, that difference is exactly the difference between an
 * ocean of bodies and a scatter of bokeh. The wings still run out to 78, so the
 * valley's width is used — it is used at the edges, where thinning reads as
 * distance, instead of in the middle, where it reads as absence.
 */
export const FIELD_X_HALF = 44

/** Village-space z of the far end of Act B's valley floor, for anything that
 *  wants to reach the actual horizon rather than the edge of the field. */
export const VALLEY_FAR_Z = (ORIGIN_Z + 11600) / S

/**
 * A point light authored in village units, expressed in Act B's.
 *
 * three.js scales neither a light's `distance` nor its `intensity` with its
 * parent — Act B's own house lamp carries the same note — so a lantern authored
 * as "distance 9, intensity 2.4" inside `<Village>` lights a nine-WORLD-unit
 * bubble, which is 0.45 village units: a glow you cannot see from half a metre
 * away. `distance` therefore scales with `S`, and `intensity` with `S^decay`,
 * which is what keeps the illuminance at the same village-space radius.
 */
export function villageLight(intensity: number, distance: number, decay: number) {
  return { intensity: intensity * Math.pow(S, decay), distance: distance * S, decay }
}

/** The `intensity` multiplier alone, for lights whose brightness is animated. */
export const lightGain = (decay: number) => Math.pow(S, decay)

/**
 * Height of the valley floor at a village-space point.
 *
 * Zero — and a function anyway. Acts 7, 8.55 and 8b each carried their own copy
 * of `sin(x·0.3)·0.08 + sin(z·0.15)·0.12` to sit figures on the gentle relief of
 * their own terrain mesh. Act B's valley floor has none: it is a road plane at
 * `VALLEY_Y + 6` with paddy planes stacked three units under it, laid out that
 * way because a far plane of 24,000 costs the depth precision to do anything
 * subtler. So anything standing in this valley stands at village y = 0, and the
 * old undulation would have floated every figure up to four world units off the
 * road. Kept as a function so there is one place to change if that floor ever
 * gains relief.
 */
export function groundY(_x: number, _z: number): number {
  return 0
}

/**
 * A soft contact shadow under a figure, in village units.
 *
 * Neither this act's canvas nor Act B's casts real shadows — with four thousand
 * instanced figures and a 24,000-unit far plane it would not be worth it — so
 * the film draws contact by hand, exactly as Act B's own walking pair do. It
 * matters more here than it used to: the lamp in that open door washes the road
 * outside it, and a figure standing on a lit plane with nothing under its feet
 * reads as hovering a foot above the ground.
 *
 * `radial` puts the darkening under the body and lets it fall off, so the blob
 * has no edge to notice.
 */
export function GroundShadow({ r = 0.42, opacity = 0.34 }: {
  r?: number
  opacity?: number
} = {}) {
  return (
    <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={-1}>
      <circleGeometry args={[r, 20]} />
      <meshBasicMaterial color="#000000" transparent opacity={opacity} depthWrite={false} />
    </mesh>
  )
}

/**
 * Mounts village-unit content inside Act B's valley. One group, and the reason
 * acts 7 and 8 did not have to be re-authored in Act B's units.
 */
export function Village({ children }: { children: ReactNode }) {
  return (
    <group position={ORIGIN} rotation={[0, Math.PI, 0]} scale={S}>
      {children}
    </group>
  )
}
