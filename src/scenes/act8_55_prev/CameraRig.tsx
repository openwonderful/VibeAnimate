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
  // ── The aim STOPS CLIMBING at ~62° and the bearing does the work ────
  // Every previous pass answered "look further up" by raising the aim, and
  // by 37.5 it was at 81° of elevation and stayed within nine degrees of
  // the zenith to the end. That is why the finish read as a narrow column:
  // the river was directly overhead and we were looking at it END-ON, up
  // its own length, so the widest thing in the sky projected to the
  // narrowest thing in the frame. Standing the aim off to ~62° puts the
  // lens BROADSIDE to it, and the 87° of sky the river spans lies across
  // the picture instead of receding up the middle of it.
  //
  // The bearing keeps the fast approach it always had — 178° across to 122°
  // by 3:00, so the frame is FULL of river the moment we get there (a draft
  // that arrived at only 150° left two thirds of the frame empty black,
  // which is the old "at 2:56 we see nothing in the frame" note) — and from
  // there the shot is ONE MOVE, ten and a half seconds long, to the frame
  // the film ends on.
  //
  // ── The last move, and the ONE number that governs it ──────────────
  // The end pose is not invented: it is a framing flown on the studio stage
  // and handed over as a shot ref, reproduced here exactly (village
  // [-17.36, 7.51, -1.14] looking up the 10.8°/86.5° bearing at fov 62). The
  // camera crosses the valley — twenty units left and thirteen forward,
  // barely two up — while the aim tilts twenty degrees onto its back, and
  // the sky wheels a full 77° in frame as it goes.
  //
  // That wheel is the whole difficulty, because it must be EVEN. The thing
  // to watch is not azimuth, which is meaningless this close to the zenith
  // and swings wildly for a degree of real rotation; it is the angle the
  // river itself makes on screen. Interpolating straight from 3:00 to the
  // end pose on two keys turns it 2°/s for eight seconds and then 34°/s in
  // the last one — dead, dead, dead, SPIN. That is the same defect as the
  // old roll, arriving by a different route. The keys below carry the aim on
  // a near-linear bearing schedule instead, eased slightly in and out, which
  // holds the river's on-screen turn between 6 and 9°/s from 3:00 to the
  // final frame: the sky wheeling over, not the camera rolling.
  //
  // (`scripts/` has no tool for this; it was measured by projecting the
  // band's own bezier through each sampled pose. Re-measure if you retime.)
  //
  // No roll, and the fov is CONSTANT at 62 the whole way — an earlier draft
  // narrowed it 63→45 and the note was immediate: "you still have a random
  // zoom in at the end — noooo".
  skyKey(31.0, [0.4, 10.5, -11.5], 178.1, 46.5, 60),   // committed tilt-up: risers + the first formed stars
  skyKey(34.5, [2.0, 7.2, -13.5], 162, 64.4, 62),      // "the whole stadium to jump": aim already aloft
  skyKey(37.5, [2.6, 5.6, -14.2], 122, 66, 62),        // 3:00 — the river corner to corner; the move starts here
  skyKey(39.6, [-1.39, 5.98, -11.59], 101.7, 69.7, 62),
  skyKey(41.7, [-5.38, 6.36, -8.98], 78.5, 74, 62),
  skyKey(43.8, [-9.38, 6.75, -6.36], 54.3, 78.5, 62),
  skyKey(45.9, [-13.37, 7.13, -3.75], 31.2, 82.7, 62),
  skyKey(47.16, [-15.76, 7.36, -2.18], 18.5, 85.1, 62), // the last stretch keyed tighter: near the zenith the
                                                        // interpolation drifts fastest, and this is where a
                                                        // spike would land — on the final frame
  skyKey(48.0, [-17.36, 7.51, -1.14], 10.8, 86.5, 62),  // THE LAST FRAME OF THE FILM — the captured shot ref
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
