/**
 * Act B — Act 3.3, inside the house.
 *
 * The last fourteen seconds. Everything here is 3.3's own set, mounted at
 * 20× where the farmhouse stands, with 3.3's own composition: the two of
 * them across a soban, the stew between them, the lamp behind, the moon in
 * the open paper screen.
 *
 * ── Two things scaling a room breaks ─────────────────────────────────
 *  1. `PointLight.distance` does NOT scale with a parent group — three
 *     computes falloff in world space — so a 3-unit lamp bubble stays 3
 *     units across in a room that is now sixty. `scaleLights` walks the
 *     subtree once on mount and fixes distance and intensity together.
 *  2. Act B's own sky, fog and key light are still on. A moonlit valley
 *     directional raking through the walls turns 3.3's warm pocket into a
 *     blue box, so `indoors()` stands the whole outdoor rig down.
 */
import { useCallback } from 'react'
import * as THREE from 'three'
import {
  HanokShell, HanokDressing, HanokLighting, Steam, Diner,
  Soban, Bowl, Dish, Utensils, StewPot, BrassKettle,
  SOUP_GREEN, KIMCHI, CLAY_DARK, ROOM_BACK, TABLE_TOP, ramp,
} from '../sets/hanok'
import SeededSparkles from '../effects/SeededSparkles'
import { flightOffset } from './time'
import { HOUSE_X, HOUSE_Z, VALLEY_Y, T_33, filmTime } from './flight'
import { PARENT_HAT } from './valley'

/** Act B units per Act 3.3 unit — the same 20 the valley uses. */
const S = 20
/** 3.3's floor, in Act B's world. */
const FLOOR_Y = VALLEY_Y + 7

/**
 * The set's own ambient is 0.17, and at 20× that lands the room's far
 * corners some thirty times darker than Act 3.3 renders the identical rig:
 * measured on the same frame, 3.3's near-left wall sits at 0.037 luminance
 * and this room's at 0.001, while everything the lamp actually reaches
 * matches to within 20%. So the shortfall is specifically in what nothing
 * illuminates directly — the fill — and 6 is the value that puts that wall
 * back on 3.3's number (0.036) without touching the lit half of the frame.
 *
 * Worth knowing before trusting the 0.17: the two scenes are otherwise the
 * same set, same camera, same lights, and both render with the renderer's
 * tone mapping disabled by the effect composer.
 */
const ROOM_AMBIENT = 6

const PARENT_X = -0.50
const CHILD_X = +0.46
const SEAT_Z = -0.74

function TableSetting() {
  return (
    <group>
      <Soban />
      <StewPot position={[0, TABLE_TOP, 0.06]} />
      <Bowl position={[-0.29, TABLE_TOP + 0.028, -0.31]} />
      <Bowl position={[-0.46, TABLE_TOP + 0.024, -0.23]} r={0.062} h={0.048} fill={SOUP_GREEN} glow={0.12} clay={CLAY_DARK} />
      <Utensils position={[-0.36, TABLE_TOP, -0.10]} />
      <Bowl position={[0.25, TABLE_TOP + 0.026, -0.24]} r={0.066} h={0.05} />
      <Bowl position={[0.44, TABLE_TOP + 0.023, -0.23]} r={0.056} h={0.044} fill={SOUP_GREEN} glow={0.12} clay={CLAY_DARK} />
      <Utensils position={[0.32, TABLE_TOP, -0.10]} flip />
      <Dish position={[-0.30, TABLE_TOP + 0.012, 0.22]} r={0.058} fill={KIMCHI} />
      <Dish position={[-0.09, TABLE_TOP + 0.012, 0.26]} r={0.052} fill="#4A5A2A" />
      <Dish position={[0.14, TABLE_TOP + 0.012, 0.25]} r={0.055} fill="#8A6A28" />
      <Dish position={[0.35, TABLE_TOP + 0.012, 0.20]} r={0.05} fill="#7A3A18" />
      <Dish position={[-0.50, TABLE_TOP + 0.012, 0.09]} r={0.048} fill="#5A4A22" />
      <BrassKettle position={[0.52, TABLE_TOP, 0.14]} />
    </group>
  )
}

export function TableRoom() {
  /**
   * The shot's own clock, in the LOCAL seconds `Diner` reads.
   *
   * `filmTime(T_33)` rather than `T_33`, because the two are no longer the
   * same number: T_33 is a story time and the window offset is a film time.
   *
   * Seven seconds now, not fourteen — the meal was carrying twice the screen
   * time it needed. Every cue below is the old one halved: the child leans in
   * at 1.9 instead of 3.8, the parent puts something in their bowl at 3.7
   * instead of 7.4, and the child's flare lands at 5.4 instead of 12.4 with
   * room to fall away before the cut. The eating LOOP is untouched — the two
   * of them move at the same speed they always did, there is simply less of
   * it. Speeding the loop up instead would have read as a comedy dinner.
   */
  const t0 = filmTime(T_33) - flightOffset()

  const scaleLights = useCallback((g: THREE.Group | null) => {
    if (!g || g.userData.lit) return
    g.traverse(o => {
      const l = o as THREE.PointLight & THREE.SpotLight
      // ONLY the lights that actually fall off with distance. Ambient,
      // hemisphere and directional light are already scale-invariant, and
      // sweeping them up in this loop is what made the room read as a flat
      // orange wash: THREE.AmbientLight has no `decay`, so it took the ?? 2
      // default and the set's 0.17 warm-brown ambient came out at 68. Every
      // surface in the house was being lit to the same value, which is
      // exactly what "no shadows anywhere and the whole frame one colour"
      // looks like.
      if (!l.isPointLight && !l.isSpotLight) return
      if (l.distance > 0) l.distance *= S
      // Falloff is 1/d^decay, so holding illuminance at 20× the distance
      // costs 20^decay.
      l.intensity *= Math.pow(S, l.decay ?? 2)
    })
    g.userData.lit = true
  }, [])

  return (
    <group ref={scaleLights} position={[HOUSE_X, FLOOR_Y, HOUSE_Z]} scale={S}>
      <HanokLighting ambient={ROOM_AMBIENT} />
      <HanokShell />
      <HanokDressing />
      <TableSetting />
      <Steam position={[0, TABLE_TOP + 0.14, 0.06]} count={120} spread={0.11} rise={1.05} size={5.2} opacity={0.20} seed={5} />
      <Steam position={[-0.29, TABLE_TOP + 0.09, -0.31]} count={30} spread={0.05} rise={0.40} size={3.0} opacity={0.13} seed={11} />
      <Steam position={[0.25, TABLE_TOP + 0.085, -0.31]} count={30} spread={0.045} rise={0.38} size={2.8} opacity={0.13} seed={13} />

      <Diner
        hat={PARENT_HAT}
        kind="adult" x={PARENT_X} z={SEAT_Z} facing={0.16} hipY={0.18} legs="cross"
        cycle={5.2} cycleOffset={0.13}
        bowl={[0.13, 0.35, 0.36]} mouth={[0.05, 0.87, 0.22]} restHand={[-0.10, 0.33, 0.30]}
        serveTo={[0.55, 0.355, 0.56]} serveAt={[t0 + 3.7, t0 + 5.3]}
        // 3.3's own values. They were pulled down to 0.98/1.12 to fight a
        // room that was 400× too bright — with the ambient fixed, that
        // compensation just leaves the two of them under-lit.
        glow={1.25}
        leanTo={t => ramp(t, t0 + 2.7, t0 + 3.7) * 0.50}
      />
      <Diner
        kind="child" scale={0.84} x={CHILD_X} z={SEAT_Z} facing={-0.16} hipY={0.17} legs="kneel"
        cycle={4.1} cycleOffset={0.61} mirrored
        bowl={[0.13, 0.345, 0.30]} mouth={[0.04, 0.685, 0.17]} restHand={[-0.13, 0.325, 0.24]}
        glow={1.45}
        leanTo={t => ramp(t, t0 + 1.9, t0 + 3.2) * 1.0}
        flare={t => ramp(t, t0 + 5.4, t0 + 5.9) * (1 - ramp(t, t0 + 6.2, t0 + 6.9)) * 0.85}
      />

      {/* Dust turning slowly in the lamp light. */}
      <SeededSparkles
        seed={71} count={110} scale={[3.0, 1.6, 1.8]} size={1.15} speed={0.14}
        color="#FFCE8A" opacity={0.5} position={[0, 1.0, -0.45]} timeOffset={flightOffset()}
      />
      {/* Fireflies outside, through the open panel. The valley's own are
          switched off by `indoors()` along with the rest of the outdoor rig,
          so without these the one window onto the world is a dead grey
          rectangle — which is exactly what it looked like. */}
      <SeededSparkles
        seed={73} count={30} scale={[1.1, 1.0, 0.6]} size={2.2} speed={0.3}
        color="#CFE07A" opacity={0.75} position={[0.72, 0.7, ROOM_BACK - 0.5]}
        timeOffset={flightOffset()}
      />
    </group>
  )
}
