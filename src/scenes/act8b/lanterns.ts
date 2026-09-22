/**
 * Act 8b — the lantern release. Flight maths, no React.
 *
 * Every figure in the valley is holding a paper sky lantern (풍등), and has
 * been since the first frame — unlit, a pale shape in the dark. The ring of
 * light that leaves the two hands on the road doesn't summon the lanterns, it
 * LIGHTS them; and when the wave reaches a figure again, it lets go.
 *
 * The difference from 8.55 is the body, not the sky. There, each soul leaves
 * its person and the ground ends up empty. Here nobody goes anywhere: the
 * people stay standing in the field, heads back, watching the thing they let
 * go of climb away — and that thing ends up in exactly the same place, in
 * exactly the same constellation, at exactly the same moment. Same sky, same
 * lock, same lines. What differs is who is left underneath to see it.
 *
 * So the flight is 8.55's flight with a lantern's opening: a cubic Hermite to
 * the star whose START TANGENT is straight up at the lantern's own buoyant
 * climb rate. The first seconds off the hand are a sky lantern rising — slow,
 * fanned by wind shear, each one at its own rate — and then the curve takes
 * over and the sky pulls it into place. One expression, C1 by construction; no
 * blend between two models and no moment where the motion changes its mind.
 *
 * Everything below is a pure function of the scene clock, evaluated fresh each
 * frame — no integration, no accumulated state — so it scrubs, freezes and
 * renders identically in every Remotion tab.
 */
import { TOUCH_POS } from '../act8_55/constants'
import type { Vec3 } from '../act8_55/sky'

function smooth01(x: number): number {
  const c = Math.min(1, Math.max(0, x))
  return c * c * (3 - 2 * c)
}

/** Held at chest height, as a fraction of body height. */
export const HOLD_Y = 0.95

/**
 * How far out from the body it is carried, as a multiplier on the per-figure
 * hand offset. Held close, the lantern's halo lands on the torso and reads as
 * a glow coming out of the person — which is the one thing a scene about
 * carrying a light must not look like. Out at arm's length there is dark
 * between the two and it is clearly an object being held.
 */
export const ARM = 2.5

/**
 * How much of the sky one lantern is allowed to take.
 *
 * A real 풍등 is about half a metre across, and at these body scales that
 * works out to an envelope WIDER than the person holding it — which is what
 * the honest number rendered: four thousand white buckets. Physical accuracy
 * loses to the fact that each one is also a light source with bloom on it, so
 * this is roughly 0.6× life size. Held, the envelope now reads a little
 * narrower than the body and about a fifth of its height.
 */
/**
 * Overall lantern size. Read as HEIGHT of the old egg envelope; the R6 drum
 * that replaced it is 0.78 tall against that 0.92, so this went up to keep the
 * same object in the same hand. Physically accurate (0.5 m) was wider than the
 * figure holding it at these scales — a real sky lantern is a big object and a
 * crowd figure here is a capsule.
 */
export const LANTERN_SIZE = 0.59

/**
 * 0 → 1: 0 = held at the hand, 1 = raised overhead and about to go. The raise
 * is the second before the release, and it is what makes the lift read as a
 * decision rather than as objects being deleted.
 */
export function raise(t: number, release: number): number {
  return smooth01((t - (release - 1.1)) / 1.1)
}

/**
 * Wind. Weak at head height and stronger aloft, which is both true and useful:
 * it fans the column out as it rises so the sky fills rather than stacking one
 * lantern behind another. Written into `out` — this runs four thousand times a
 * frame and a returned tuple is four thousand allocations.
 */
function wind(out: [number, number], y: number, dt: number, phase: number): void {
  const shear = Math.min(1, y / 22)
  const w = shear * shear * 1.35
  out[0] = w * dt * 0.62 + Math.sin(dt * 0.55 + phase) * 0.22 * shear
  out[1] = -w * dt * 0.24 + Math.cos(dt * 0.47 + phase * 1.3) * 0.18 * shear
}

const windScratch: [number, number] = [0, 0]

/**
 * Where a released lantern is, `u` of the way through its flight.
 *
 *   u = 0   the hands that let it go
 *   u = 1   its star, exactly — every extra term below is enveloped to zero
 *           there, so the lock is on the catalog position and the
 *           constellation lines have something to join.
 */
export function lanternFlight(
  out: [number, number, number],
  p0: [number, number, number],
  target: Vec3,
  u: number,
  dur: number,
  /** buoyant climb rate, m/s — the start tangent, and the whole lantern read */
  climb: number,
  spiralR: number,
  spiralTurns: number,
  spiralPhase: number,
  windPhase: number,
): void {
  const h00 = (1 + 2 * u) * (1 - u) * (1 - u)
  const h10 = u * (1 - u) * (1 - u)
  const h01 = u * u * (3 - 2 * u)
  const h11 = u * u * (u - 1)
  // Arrival tangent: a short way along the last stretch, so it settles into
  // the star instead of stopping dead on it.
  const ARRIVE = 0.16

  let x = h00 * p0[0] + h01 * target[0] + h11 * ARRIVE * (target[0] - p0[0])
  const y = h00 * p0[1] + h10 * (climb * dur) + h01 * target[1]
    + h11 * ARRIVE * (target[1] - p0[1])
  let z = h00 * p0[2] + h01 * target[2] + h11 * ARRIVE * (target[2] - p0[2])

  // 8.55's corkscrew, term for term — the two scenes have to rhyme in the air
  // as well as on the ground.
  const amp = spiralR * Math.sin(Math.PI * Math.min(1, u * 1.05))
  const ang = spiralPhase + spiralTurns * Math.PI * 2 * u
  x += Math.cos(ang) * amp
  z += Math.sin(ang) * amp

  // Wind owns the bottom of the flight and nothing of the top.
  const fade = (1 - u) * (1 - u)
  if (fade > 0.002) {
    wind(windScratch, Math.max(0, y - p0[1]), u * dur, windPhase)
    x += windScratch[0] * fade
    z += windScratch[1] * fade
  }

  out[0] = x
  out[1] = y
  out[2] = z
}

/** Distance from the touch, in the ground plane. */
export function touchDist(x: number, z: number): number {
  return Math.hypot(x - TOUCH_POS[0], z - TOUCH_POS[2])
}
