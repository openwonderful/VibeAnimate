/**
 * 8.55's own sky orientation — the finale's sky, turned.
 *
 * ── Why this file exists ────────────────────────────────────────────
 * The tail of this act used to end on a framing captured off the studio
 * stage: the river of souls laid corner-to-corner across the frame. Reaching
 * it meant flying the lens twenty units across the valley while aimed near
 * the zenith, and near the zenith crossing the dome IS rolling the frame —
 * measured by projecting the band's own bezier, the picture turned about
 * 150° in the last thirteen seconds, in a shot that by then contains nothing
 * but sky, so there is no parallax to read the motion against and the only
 * available reading is that the picture is spinning. The note was exact:
 * "it's like a full 180, it makes me dizzy."
 *
 * You cannot fix that by turning `SKY_YAW_DEG`. That constant rotates the
 * camera's aim and the sky's content TOGETHER — `dir()` serves both — so the
 * composition depends only on their difference and a yaw change is a pure
 * relabelling of azimuths. Nothing moves.
 *
 * What does work is turning the sky and NOT the aim: rotate the band, the
 * constellations and every soul's flight target about the dome's axis, leave
 * the camera's bearing alone, and the shot can stand still on the up-valley
 * bearing it already holds and see the captured framing anyway. At 176° the
 * match is near exact — projected band angle −33.3° against the shot ref's
 * −32.4°, 70% of the band on screen against 71%, centroid (0.11, 0.09)
 * against (0.13, 0.08) — and the tail's on-screen rotation drops from ~150°
 * to under 4° total.
 *
 * ── Why it is a separate file and not a change to sky.ts ────────────
 * `sky.ts` and `world.ts` are shared. `generateWorld()` alone is imported by
 * 7.2, 7.3, 7.4, Scene7, act8b, act8_56 and — the one that matters — Act B's
 * `ascendedSky`, which builds the 1:12 sky out of these same constellations
 * and the same magpie bridge. Turning the sky at the source would turn that
 * sky too. So the spin is applied HERE, to a copy of the data and to a
 * transform group, by the only scene that wants it. Every other act reads
 * the unspun sky it always read, byte for byte.
 */
import { useMemo } from 'react'
import type { ReactNode } from 'react'
import { SKY_CENTER } from './constants'
import type { Vec3 } from './sky'
import type { World } from './world'

/**
 * Degrees the finale's sky is turned about the dome's vertical axis.
 *
 * Solved, not chosen: it is the offset that puts the captured end framing on
 * the bearing the tail already holds (camera azimuth 176°). Composition
 * depends on (camera azimuth − content azimuth), the captured framing sits
 * at content-relative 0°, so the content moves the whole way. Re-solve it if
 * the tail's held azimuth in `CameraRig` ever changes — the two numbers are
 * one number.
 */
export const SKY_SPIN_DEG = 176

const COS = Math.cos((SKY_SPIN_DEG * Math.PI) / 180)
const SIN = Math.sin((SKY_SPIN_DEG * Math.PI) / 180)

/** A dome-space point, turned about the vertical through the dome's centre. */
export function spinSkyPoint(p: Vec3): Vec3 {
  const x = p[0] - SKY_CENTER[0]
  const z = p[2] - SKY_CENTER[2]
  return [
    SKY_CENTER[0] + x * COS + z * SIN,
    p[1],
    SKY_CENTER[2] - x * SIN + z * COS,
  ]
}

/**
 * The same world, with everything that lives ON THE DOME turned and
 * everything that lives on the ground left exactly where it was.
 *
 * That split is the whole trick, and it is why this is a data transform
 * rather than a group on the scene graph: a soul's flight is a curve from
 * its mark in the crowd to its star, and those two ends live in different
 * frames now. Rotating a group containing the crowd would move the crowd.
 *
 * `figures` are copied rather than mutated because `generateWorld()` is
 * memoised per caller and several other acts hold the same object shape;
 * nothing here may write through to them.
 */
export function spinWorldSky(world: World): World {
  return {
    ...world,
    figures: world.figures.map(f => ({ ...f, target: spinSkyPoint(f.target) })),
    constellations: world.constellations.map(c => ({
      ...c,
      stars: c.stars.map(spinSkyPoint),
    })),
  }
}

/**
 * Wrapper for sky content that places itself rather than reading the world —
 * the dome gradient, the ancient background stars, the moon, the nebula bed,
 * the Polaris cross and the graticule. Two nested groups so the rotation is
 * about the dome's centre and not the village origin.
 */
export function SpunSky({ children }: { children: ReactNode }) {
  return <SpunSkyBy deg={SKY_SPIN_DEG}>{children}</SpunSkyBy>
}

/** The same turn, by an arbitrary angle — `-SKY_SPIN_DEG` undoes it for a
 *  piece that has to stay where it was while the sky around it moves. */
export function SpunSkyBy({ deg, children }: { deg: number; children: ReactNode }) {
  const rad = useMemo(() => (deg * Math.PI) / 180, [deg])
  return (
    <group position={SKY_CENTER}>
      <group rotation={[0, rad, 0]}>
        <group position={[-SKY_CENTER[0], -SKY_CENTER[1], -SKY_CENTER[2]]}>
          {children}
        </group>
      </group>
    </group>
  )
}
