/**
 * Act 8.51 camera — one continuous GLIDE, never stopping.
 *
 * v2 changes from 8.5:
 *   - Opens close and low: just the glowing golden figure in front of the
 *     house door. The world beyond is dark. As the crowd ignites, the camera
 *     pulls back and the frame fills with new light.
 *   - Keyframes are interpolated with a time-aware Catmull-Rom (cubic
 *     Hermite with finite-difference tangents), so velocity is continuous
 *     through every key — no ease-in/ease-out "settle" moments. Something
 *     is always moving.
 *   - The bird's-eye phase is itself an orbital arc around the field, so
 *     even the top-down hold keeps drifting/rotating.
 *
 * Driven by the global anim clock; hands the camera off when the debug camera takes over.
 */
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useRef } from 'react'
import { getAnimTime } from '../../hooks/useAnimTime'
import { useCameraHandoff } from '../DebugCamera'
import { publishSceneLookAt } from '../cameraHandoff'
import { OPEN_CAM, SKY_R, T_DROP } from './constants'
import { toWorld } from './locale'
import { dir } from './sky'

type Key = { t: number; pos: [number, number, number]; tgt: [number, number, number]; fov: number }

/**
 * A key whose aim is written as a SKY DIRECTION — azimuth and elevation in
 * the very coordinates the sky itself is authored in (`sky.ts`: the river's
 * bezier, every constellation's centre) — resolved to a target one dome
 * radius out.
 *
 * Aim used to be written as bare points, and that is how the tail ended up
 * pinned within nine degrees of the zenith: pushing a target's y is the
 * obvious way to say "look higher", and past a point it stops composing
 * anything — the y goes up and the picture does not change. In (az, el) that
 * is impossible to walk into by accident, and the number that actually
 * composes the shot is legible in the diff instead of buried in a vector.
 *
 * WHAT ELEVATION DOES NOT TELL YOU. A high aim is not by itself the reason a
 * framing goes bad. The sky is a 66-unit dome centred on the field, and the
 * picture depends just as much on WHERE IN IT the lens is standing: aimed
 * 81° up from near the centre the river is directly overhead and seen
 * end-on, a narrow column running up the middle of frame — but the shot ref
 * this act now ends on is aimed 86.5° up, higher still, and lays the whole
 * river across the frame, because it is flown 28 units off centre and what
 * is overhead THERE is the band's flank. Judge a key by projecting the band,
 * never by reading the elevation off it.
 */
const skyKey = (t: number, pos: [number, number, number], az: number, el: number, fov: number): Key => {
  const d = dir(az, el)
  return { t, pos, tgt: [pos[0] + d[0] * SKY_R, pos[1] + d[1] * SKY_R, pos[2] + d[2] * SKY_R], fov }
}

/**
 * 8.55-old's camera, restored verbatim.
 *
 * Every key below is character-for-character the move `act8_55_old` runs, and
 * that is the point: the director's note was "just copy it", and two rounds of
 * re-authoring this arc produced something measurably worse each time. It opens
 * on the road looking UP it at the singer, pulls back and climbs, crests into a
 * high oblique over the whole lit valley at 22s, descends into the swarm, and
 * lands back on the road looking up the column of souls into the constellations.
 *
 * ── Why it fits in Act B's valley now, when it did not before ────────
 * Two things had to be true first, and both are:
 *
 *   1. The FIELD is centred on the house again, running from village z = −1.5
 *      to −63 — which means through and BEHIND it. See `world.ts`.
 *   2. The lateral offsets are legal. These keys stand the lens out at
 *      x = ±5.4, which is 108 Act B units, and Act B's road plus verge is only
 *      ±53 — the objection that forced this move to be re-authored in the first
 *      place was that the camera stood in flooded paddy and its mirror filled
 *      half of every frame. There is no paddy any more: after Act 4.5's
 *      industrialisation this valley is `farmland="none"`, bare worked-over
 *      dirt from the road to the range. The lens can stand anywhere on it.
 *
 * Poses are in village units (see `locale.tsx`) and mapped out to Act B's world
 * every frame; the camera cannot live inside the locale group, because a camera
 * in a group at 20× has its near plane, far plane and focal length scaled too.
 */
const KEYS: Key[] = [
  // act8_55_old's arc, with two director's-note departures marked below.
  { t: 0.0, ...OPEN_CAM },                                                // the singer, alone in the dark — and 7.2's last frame
  // The climb runs a shade AHEAD of the old keys (y 3.1 → 4.2, 9.5 → 11.5):
  // the note was to get up a touch faster near the start so the frame takes
  // in the surroundings — the range, now lit — while the ring is still
  // crossing the field. Same path, same targets, just higher sooner.
  { t: 8.4, pos: [3.3, 4.2, -5.6], tgt: [0.6, 0.8, -23], fov: 51 },       // pulling back + climbing
  { t: 16.2, pos: [-2.4, 11.5, 0.5], tgt: [0.2, 0.1, -26], fov: 57 },     // high enough to see the lit horizon
  { t: 22.0, pos: [-1.4, 16.5, -2.0], tgt: [0.2, 1.2, -25.5], fov: 58 },  // high OBLIQUE — never full bird's-eye
  { t: 26.0, pos: [1.2, 13, -6.5], tgt: [0.4, 11, -24], fov: 58 },        // descended INTO the swarm
  // ── THE TAIL: ONE UNBROKEN TILT, FOLLOWING THE ORBS ────────────────
  // The aim NEVER comes back down. The previous tail dropped onto the
  // field for the jump and then looked up, and the note was exact: "it
  // just looks down at the house and then looks up again — we don't get
  // to see the orbs become the stars… at 2:53 we should already be moving
  // up a lot more." So from t=31 (song 2:53) the target only climbs.
  // The look-up is COMMITTED from 31: the early souls (the wings, aloft
  // since 18–23) are already at dome height, so an aim in the teens points
  // at the empty band between ridge and dome — which is exactly the "at
  // 2:56 we see nothing in the frame" note. By the drop the aim is IN the
  // orb band; the main flood then rises INTO frame from below, on pace,
  // and is held while it becomes the stars.
  //
  // From 37.5 the camera itself RISES with the flood and pulls back off
  // the field ("I like the camera following the orbs up — it needs to
  // move more up"): a crane, not a landing.
  //
  // ── THE BEARING NEVER MOVES. THE SKY WAS TURNED INSTEAD. ───────────
  // The note, and it was measured before it was believed: "to get from what
  // we see at 2:59 to what we see at 3:09 you rotate the camera… it's like a
  // full 180, it makes me dizzy."
  //
  // It was. Projecting the band's own bezier through the old tail and taking
  // the principal angle of what is on screen: 34.5 → −3°, 37.5 → +65°,
  // 41.7 → +88°, 45.9 → +124°, 48 → +148°. A hundred and fifty degrees of
  // on-screen rotation in thirteen seconds, in a frame that by then contains
  // nothing but sky — no parallax, nothing to read the motion against, and
  // so the only available reading is that the picture is spinning.
  //
  // It rotated because it TRAVELLED to a framing captured off the studio
  // stage, twenty units across the valley, aimed near the zenith — and near
  // the zenith crossing the dome IS rolling the frame. The captured framing
  // was not the problem and has not been given up. THE SKY WAS TURNED to
  // meet the camera instead: `skySpin.tsx` rotates the band, the
  // constellations and every soul's flight target 176° about the dome's
  // axis, for this act alone, so the shot can stand on the up-valley bearing
  // it already holds and see the same picture. (A `SKY_YAW_DEG` change
  // cannot do this — it turns the aim and the content together and is a pure
  // relabelling. That was tried first and measured as a no-op.)
  //
  // What the tail is now: ONE bearing, 176°, from the descent to the last
  // frame — no azimuth key anywhere in it — a tilt from 22° to 62°, and a
  // slow crane after 36.2. Measured on the same projection, the on-screen
  // angle stays inside −33°…−37° for the WHOLE tail (4° total, against 150°)
  // and never exceeds 1°/s.
  //
  // The end framing against the captured shot ref, same measurement:
  //   band angle   −33.3°  vs  −32.4°
  //   on screen    70%     vs  71%
  //   centroid     (0.11, 0.09)  vs  (0.13, 0.08)
  // It is the shot ref, arrived at from the other side of a turned sky.
  //
  // The lens ends at village x = +16.4 — the mirror of the ref's −17.36,
  // which is what a 176° turn of the sky implies. That is 328 Act B units
  // off the road centre and legal: after Act 4.5's industrialisation this
  // valley is `farmland="none"`, bare worked-over dirt with no paddy to
  // stand in, and the camera is 248 units up regardless.
  //
  // Elevation tops out at 62°, nowhere near the zenith, so the up-vector
  // cannot flip and the Hermite has no pole to spike through. The fov is
  // CONSTANT at 62 from 36.2 — an earlier draft narrowed it 63→45 and the
  // note was immediate: "you still have a random zoom in at the end — noooo".
  //
  // (`scripts/` has no tool for this; it was measured by projecting the
  // band's own bezier through each sampled pose. Re-measure if you retime,
  // and re-solve SKY_SPIN_DEG with it if you ever move the held azimuth.)
  skyKey(29.0, [5.0, 12.4, -11.0], 176, 22, 59),   // the tilt begins; the band's low end is already in frame
  skyKey(31.0, [8.4, 12.2, -14.5], 176, 40, 60),   // 2:53 — "we should already be moving up a lot more"
  skyKey(33.2, [12.0, 12.2, -17.8], 176, 52, 61),  // the river fills the frame as the flood arrives
  skyKey(36.2, [16.4, 12.4, -22.0], 176, 62, 62),  // 2:58.2 — THE FINAL FRAMING, twelve seconds early
  // …and from here nothing turns. The camera cranes; the sky moves by
  // parallax alone, which is the only motion a held frame can afford.
  skyKey(39.5, [16.9, 13.2, -22.6], 176, 62, 62),
  skyKey(43.0, [17.3, 14.2, -23.1], 176, 62, 62),
  skyKey(46.0, [17.6, 15.0, -23.5], 176, 62, 62),
  skyKey(48.0, [17.8, 15.6, -23.8], 176, 62, 62),  // THE LAST FRAME OF THE FILM
]

/** The opening pose, in Act B world units — the canvas needs it before the rig's
 *  first useFrame lands, and Act 7.2 needs it to land on. */
export const OPEN_POS = toWorld(...KEYS[0].pos)
export const OPEN_TGT = toWorld(...KEYS[0].tgt)
export const OPEN_FOV = KEYS[0].fov
/** Village-space form, for Act 7's hero-relative keys. */
export const OPEN_KEY = KEYS[0]

/** Component-wise cubic Hermite through KEYS with finite-difference tangents
 *  (time-aware Catmull-Rom): C1-continuous — velocity never drops to zero. */
function sampleKeys(t: number, out: { pos: THREE.Vector3; tgt: THREE.Vector3; fov: number }) {
  const n = KEYS.length
  const tc = Math.min(Math.max(t, KEYS[0].t), KEYS[n - 1].t - 1e-4)
  let i = 0
  while (i < n - 2 && tc >= KEYS[i + 1].t) i++
  const a = KEYS[i]
  const b = KEYS[i + 1]
  const dt = b.t - a.t
  const s = (tc - a.t) / dt

  const h00 = (1 + 2 * s) * (1 - s) * (1 - s)
  const h10 = s * (1 - s) * (1 - s)
  const h01 = s * s * (3 - 2 * s)
  const h11 = s * s * (s - 1)

  // Finite-difference tangent at key k for one channel.
  const tan = (k: number, get: (key: Key) => number): number => {
    // KEYS[0] is a CUT, not a continuation — 8.55 opens on OPEN_CAM the frame
    // after 7.4's last. Clamping the first key's tangent to zero is what makes
    // that a start rather than a lurch: the finite difference here is the
    // chord slope of the whole 8.4s pull-back, so the camera used to leave the
    // cut ALREADY at the move's average speed. That is the jolt at 2:23. The
    // move now builds out of rest, and since only the tangent changes, key 1
    // is still reached at 8.4s in the same place.
    if (k === 0) return 0
    const prev = KEYS[Math.max(0, k - 1)]
    const next = KEYS[Math.min(n - 1, k + 1)]
    return (get(next) - get(prev)) / (next.t - prev.t)
  }

  const sample = (get: (key: Key) => number): number =>
    h00 * get(a) + h10 * dt * tan(i, get) + h01 * get(b) + h11 * dt * tan(i + 1, get)

  out.pos.set(sample(k => k.pos[0]), sample(k => k.pos[1]), sample(k => k.pos[2]))
  out.tgt.set(sample(k => k.tgt[0]), sample(k => k.tgt[1]), sample(k => k.tgt[2]))
  out.fov = sample(k => k.fov)
}

export function CameraRig() {
  const yieldCamera = useCameraHandoff()
  const state = useRef({ pos: new THREE.Vector3(), tgt: new THREE.Vector3(), fov: 42 })
  const world = useRef({ pos: new THREE.Vector3(), tgt: new THREE.Vector3() })

  useFrame(({ camera }) => {
    if (yieldCamera()) return
    const t = getAnimTime()
    const s = state.current
    sampleKeys(t, s)

    // Breath — barely-there handheld life (invisible at altitude). In village
    // units, so it survives the trip out to Act B's scale.
    s.pos.x += Math.sin(t * 0.17) * 0.05
    s.pos.y += Math.sin(t * 0.28) * 0.04

    // Beat kick on the drop — a short damped dip.
    if (t > T_DROP) {
      const dt = t - T_DROP
      s.pos.y -= Math.exp(-dt * 5.5) * Math.sin(dt * 16) * 0.4
    }

    const w = world.current
    w.pos.set(...toWorld(s.pos.x, s.pos.y, s.pos.z))
    w.tgt.set(...toWorld(s.tgt.x, s.tgt.y, s.tgt.z))
    camera.position.copy(w.pos)
    camera.lookAt(w.tgt)
    // Enabling the debug camera mid-shot must orbit around what THIS rig is
    // looking at — the tail aims at the sky, and the fallback pivot (the
    // scene's static debugTarget, down at the house) yanked the whole view
    // off the framing the moment you clicked ● Camera.
    publishSceneLookAt(w.tgt.x, w.tgt.y, w.tgt.z)
    const cam = camera as THREE.PerspectiveCamera
    if (Math.abs(cam.fov - s.fov) > 1e-3) {
      cam.fov = s.fov
      cam.updateProjectionMatrix()
    }
  })

  return null
}
