/**
 * Act B, held still.
 *
 * Act B is one continuous flight through one world. Act 4's montage beats are
 * the opposite shape — one second each, cut hard, years apart — but they are
 * supposed to be happening in *that* world, at that house, under that tree.
 * Before this, they were happening in hand-built sets (`act4/yard.tsx`) whose
 * ridges were cones and whose sky was a gradient on a plane, and the seam
 * showed the moment the two played back to back.
 *
 * `ValleyStill` mounts Act B's valley — its ground, ridges, fog, key light,
 * sky and environment map — at one fixed moment of world time, with no flight
 * camera. The scene that uses it parks its own camera wherever it wants and
 * stages whatever it likes on top.
 *
 * ── Choosing `at` ─────────────────────────────────────────────────────
 * World time is the act's clock, and everything in the valley is a function of
 * it: `dayTint`, `sunRise` and `nightFall` grade the whole thing, and the
 * sub-scenes phase themselves in and out against it. Useful moments:
 *
 *   58   the widest frame in the act — full daylight over the whole valley
 *   65   golden hour, Act 3.1's light: low sun in the pass, long shadows
 *   72   the sun is off the valley; Act B's own two figures vanish from the
 *        road here (they are under the tree between the cuts), so this is the
 *        first moment the valley is guaranteed empty of other people
 *   84   full night, the house the brightest thing left
 *
 * Note that `at` is a START time, not a freeze: world time keeps running from
 * it at 1:1. Over a one-second montage beat that is a hair of extra sun
 * movement, which is exactly right — a still frame of a living world, not a
 * photograph of a dead one.
 *
 * ── People ────────────────────────────────────────────────────────────
 * `Valley` contains Act B's own walking pair. They hide themselves for
 * 72 ≤ t < 84; outside that window, frame the shot so the road behind the
 * camera rather than in front of it, or they will be in your background
 * doing something your scene is not about.
 */

import { useFrame } from '@react-three/fiber'
import { getAnimTime } from '../../hooks/useAnimTime'
import { setFlightOffset } from './time'
import { Atmosphere, Lights, ValleyEnvironment } from './World'
import { SkyDome, FixedStars, Moon, CloudBank } from './sky'
import { Ridges, Ground, Pines, HillFlowers, Blossoms } from './mountains'
import { Valley, ValleyHouse, type Farmland } from './valley'

/**
 * Drives world time from scene time, for scenes that want Act B's own grade to
 * MOVE rather than hold — Act 4.5 runs it back and forth between day and night
 * to get an industrialisation lapse out of the valley's real sun.
 *
 * Rendered as the first child of ValleyStill so its useFrame subscribes first
 * and every reader downstream sees the value for this frame, not the last one.
 */
function WorldClock({ atFn }: { atFn: (t: number) => number }) {
  useFrame(() => {
    const t = getAnimTime()
    setFlightOffset(atFn(t) - t)
  })
  return null
}

export type ValleyStillProps = {
  /** Where in Act B's clock this scene sits. See the table above. */
  at: number
  /** Optional: world time as a function of scene time. Overrides `at` after
   *  the first frame; `at` still sets the value the first render sees. */
  atFn?: (t: number) => number
  /** The lit farmhouse at the head of the valley. */
  house?: boolean
  /** Ridge line, pines, flowers and blossom — the range behind the valley. */
  range?: boolean
  /** Stars, moon and cloud bank. Worth switching off in full daylight. */
  night?: boolean
  /** Act B's fixed moon. Off for scenes flying their own celestial bodies. */
  moon?: boolean
  /** Act B's own two walkers, out on the road. Off for scenes staging their
   *  own figures in this valley. */
  people?: boolean
  /** The valley's power line. Off for scenes that raise their own. */
  poles?: boolean
  /** How much of the valley is still being farmed. `full` is the film's
   *  valley and the default; Act 4.5's three measurings walk it down to
   *  `none`. See `Farmland` in valley.tsx. */
  farmland?: Farmland
  /** Live 0..1 multiplier on the house's lamps and ground glow. See
   *  `ValleyHouse`. Read inside useFrame, so it must not allocate. */
  houseDim?: () => number
}

export function ValleyStill({
  at, atFn, house = true, range = true, night = true, moon = true,
  people = true, poles = true, farmland = 'full', houseDim,
}: ValleyStillProps) {
  // Module-level, exactly as the flight scenes do it: this is read inside
  // useFrame by every component below, and a context read would re-render the
  // whole valley every frame. Safe because one scene is ever mounted at once.
  setFlightOffset(at)

  return (
    <>
      {atFn && <WorldClock atFn={atFn} />}
      <Atmosphere />
      <Lights />
      <ValleyEnvironment />

      <SkyDome />
      {night && (
        <>
          <FixedStars />
          {moon && <Moon />}
        </>
      )}

      <Ground />
      {range && (
        <>
          <Ridges />
          <Pines />
          <HillFlowers />
          <Blossoms />
          {night && <CloudBank />}
        </>
      )}

      <Valley people={people} poles={poles} farmland={farmland} />
      {house && <ValleyHouse dim={houseDim} />}
    </>
  )
}
