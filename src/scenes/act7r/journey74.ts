/**
 * Act 7.4 — "The Walk Home" (6.5s): the clock, the walk, the grandmother's
 * rise from the chair, and the handoff into 8.55.
 *
 * Pure data + functions, no React — journey.ts's handwriting, retimed for one
 * 6.5-second scene. Local t=0 ↔ film 135.5, and it is no longer the frame the
 * song returns on: 6.85 owns the trophy and the turn to the countryside, and
 * this scene's FIRST frame continues 6.85's last — the camera has just swept
 * around him onto the road, the lit house far ahead, and he is STANDING
 * STILL, arm up, still waving. The wave is the one gesture that crosses the
 * cut now (director's note: "the character should keep waving, all the way
 * into 7.4 as it's walking towards the parent — drop it in the first
 * quarter"), and her rise is its answer. Local t=6.5 IS 8.55's t=0, same as
 * ever.
 *
 * Everything is in VILLAGE units (an adult is 1.9 tall) and mounts through
 * `act8_55/locale`. Three things are enforced by construction, not by eye:
 *
 *   - he lands on GOLDEN_POS at t=6.5 exactly (Z_START solved backwards from
 *     the arrival, same as journey.ts's Z_START_72). For t ≤ 0 the trajectory
 *     is a STANDSTILL on Z_START: 6.85's tail shows him standing on this mark
 *     while its camera arcs onto KEYS_74[0], so position (Z_START), speed
 *     (zero) and gait (closed) are continuous ACROSS the cut by construction;
 *   - the grandmother ends on PARENT_MEET_POS in ParentFigure's exact idle,
 *     and the REAL ParentFigure takes over at T_SWAP so the handoff state is
 *     8.55's to the bit;
 *   - the final camera key is OPEN_CAM minus GOLDEN_POS (HANDOFF_KEY_74), so
 *     the last frame of this scene evaluates to 8.55's opening key.
 */
import { getAnimTime } from '../../hooks/useAnimTime'
import { GOLDEN_POS, OPEN_CAM, PARENT_MEET_POS, roadX } from '../act8_55/constants'
import { HERO_UNITS_PER_CYCLE } from '../act8_55/hero'
import { ORIGIN_X, ORIGIN_Z, S } from '../act8_55/locale'
import { HOUSE_X, HOUSE_Z, VALLEY_Y } from '../actB/flight'
import { smooth01, type CamKey } from './journey'

/* ── The clock ───────────────────────────────────────────────────── */

export const DUR = 6.5
/** What to pass as `timeOffset`/`tOff` to the shared 8.55 components so their
 *  internal t=0 lands exactly on this scene's last frame. */
export const T_OFF_74 = -DUR

/**
 * The scene clock, indirect so 6.85 can drive this whole world on ITS clock:
 * `t74()` is scene-local 7.4 time. In 7.4 the shift is 0 and t74 == anim
 * time; 6.85 mounts the same components with shift = −20.5 so its final two
 * seconds evaluate this file at t74 ∈ [−2, 0] — the seam frame is then the
 * same function at the same argument on both sides. Same single-mounted-scene
 * contract as `setFlightOffset` / `setPorchClock`.
 */
let clockShift = 0
export function setJourney74Shift(s: number) {
  clockShift = s
}
export function t74(): number {
  return getAnimTime() + clockShift
}

/* ── The walk ────────────────────────────────────────────────────── */

/** Same pace as the rest of Act 7 — a man who can see his own house. */
export const WALK_SPEED = 1.53

/**
 * He starts from a STANDSTILL. 6.85's world-turn ends with him standing on
 * this mark, waving — the camera sweeps around a stationary man (director's
 * note: "the character is staying still") — so at t=0 his speed is zero and
 * the first steps happen HERE, on 7.4's own clock. The accel window ramps
 * the stride in; position and velocity are both continuous across the seam
 * because both are zero on both sides of it.
 */
const ACCEL_T = 0.85

export const Z_END = GOLDEN_POS[2]
/**
 * Constant-speed walking ends here; the last 1.5s glide him to a halt.
 *
 * Z_DECEL is SOLVED, not chosen: a body decelerating from cruise to zero
 * over T seconds covers exactly WALK_SPEED·T/2 ground. The old hand-picked
 * 2.4 was more than double that, and the ease-out cubic made up the
 * difference by opening at 3× walk speed — a visible LURCH right as the two
 * of them close the last metres ("their walking speeds up in a little bit
 * of a weird way"). Now the glide's entry velocity IS the cruise velocity.
 */
const DECEL_T = DUR - 1.5
const Z_DECEL = Z_END + WALK_SPEED * (DUR - DECEL_T) / 2

/** Distance covered by the accel-then-cruise stretch at time t (0 at t ≤ 0). */
function cruiseDist(t: number): number {
  if (t <= 0) return 0
  if (t < ACCEL_T) return WALK_SPEED * t * t / (2 * ACCEL_T)
  return WALK_SPEED * (t - ACCEL_T / 2)
}

/**
 * Solved backwards from the arrival, so this much gait lands him on GOLDEN_POS
 * to the unit: z ≈ −11.85, already PAST the market's last stalls (they stop at
 * z=−8 going down-road) — the compressed walk is all quiet pocket, the aisle
 * a warm bokeh behind the lens. The ACCEL_T/2 term is the distance the
 * standing start costs against the old rolling one.
 */
export const Z_START = Z_DECEL + (DECEL_T - ACCEL_T / 2) * WALK_SPEED

export function heroZ(t: number): number {
  if (t <= DECEL_T) return Z_START - cruiseDist(t)
  // Linear velocity ramp WALK_SPEED → 0: position is the quadratic below,
  // velocity-continuous at DECEL_T and exactly Z_END with zero speed at DUR.
  const T = DUR - DECEL_T
  const s = Math.min(T, t - DECEL_T)
  return Z_DECEL - WALK_SPEED * (s - s * s / (2 * T))
}

export function heroX(t: number): number {
  return roadX(heroZ(t))
}

/** Distance walked — drives the gait so his feet stay planted, not skating.
 *  Zero for all t ≤ 0: 6.85's tail shows him standing on Z_START. */
export function heroDist(t: number): number {
  if (t <= DECEL_T) return cruiseDist(t)
  return cruiseDist(DECEL_T) + (Z_DECEL - heroZ(t))
}

export function heroPhase(t: number): number {
  const p = (heroDist(t) / HERO_UNITS_PER_CYCLE) % 1
  return p < 0 ? p + 1 : p
}

/** 1 while walking, easing to 0 as he arrives — kills the gait and the lean. */
export function heroMotion(t: number): number {
  const dz = heroZ(t + 0.05) - heroZ(t - 0.05)
  return Math.min(1, Math.abs(dz) / (WALK_SPEED * 0.1))
}

/** He squares up to the house and lifts his chin into 8.55's opening pose. */
export function heroSettle(t: number): number {
  return smooth01((t - (DUR - 1.6)) / 1.6)
}

/* ── The wave — carried across the cut, released in the first quarter ── */

/**
 * The wave CROSSES the seam now. He raised it on the stage in 6.85 and never
 * brought it down — through the world-turn it became a wave at the house, and
 * this scene opens with the arm still up as he sets off. It releases over the
 * first quarter (director's note: "maybe in the first quarter of 7.4, drop
 * the waving"), which is also what the grandmother answers: she rises at the
 * sight of it. For t ≤ 0 (6.85's tail) waveUp is exactly 1, so the seam pose
 * agrees by construction.
 */
export const WAVE_DROP0 = 0.9
export const WAVE_DROP1 = 1.7

export function waveUp(t: number): number {
  return 1 - smooth01((t - WAVE_DROP0) / (WAVE_DROP1 - WAVE_DROP0))
}

/** 0 = hand pinned to the wave, 1 = hand released to the walk swing. */
export function waveRelease(t: number): number {
  return smooth01((t - WAVE_DROP0) / (WAVE_DROP1 - WAVE_DROP0))
}

/* ── His colour: the thaw completing ─────────────────────────────── */

/**
 * Grey → 8.55's hero, done by t≈4.7 so the arrival is materially 8.55's frame.
 * 0 = the countryside-turn's end state (the drained grey 6.85 hands over), 1 =
 * #C79A5E with emissive #F0CE7E at intensity 0. Clamped at 0 for t < 0 so
 * 6.85's run-in shows exactly the t=0 colour.
 */
export function thaw(t: number): number {
  return smooth01((t - 0.3) / 4.4)
}

/* ── The grandmother ─────────────────────────────────────────────── */

/**
 * The porch rocker's spot, in village units — solved from ValleyHouse's own
 * mounting (hanok group at [HOUSE_X, VALLEY_Y+7, HOUSE_Z], rotation π, scale
 * HOUSE_S, porch wrapper at hanok-local [0.85, −0.026, 1.30]), so if the house
 * ever moves, she moves with it.
 */
const HOUSE_S = 38
const PORCH_LOCAL: [number, number, number] = [0.85, -0.026, 1.30]
const porchWorldX = HOUSE_X - HOUSE_S * PORCH_LOCAL[0]
const porchWorldZ = HOUSE_Z - HOUSE_S * PORCH_LOCAL[2]
void VALLEY_Y // porch deck sits ~9mm off village y=0 — flattened to 0
export const PORCH_POS: [number, number] = [
  (ORIGIN_X - porchWorldX) / S,
  (ORIGIN_Z - porchWorldZ) / S,
]

/**
 * She rises from the chair the moment she SEES him — the scene opens with his
 * arm up, waving at the house, and the rise is her answer to it (director's
 * note: "the grandparent should have stood as soon as it saw the character
 * and started slowly walking over"). It was 2.8, timed to the camera's swing
 * onto the porch — which meant she sat through his whole approach and then
 * had 1.85s to cross the yard: a sprint. Now the rise happens small and far
 * at the lit house while the lens is still over his shoulder, and the swing
 * at 2.5 finds her already on her way.
 */
export const T_RISE = 0.55
const RISE_DUR = 1.15
/** …steps off and crosses the yard to the road edge, unhurried this time:
 *  the same path over ~3.5s instead of 1.85 — an amble, not a dash. */
const T_WALK0 = T_RISE + RISE_DUR
const T_ARRIVE = 5.35
/** …and from here the REAL ParentFigure renders her (both agree: standing at
 *  PARENT_MEET_POS, dark, facing up the road). */
export const T_SWAP = 5.55

/** Where she steps to as she stands — a small step forward off the chair. */
const RISE_STEP = 0.32
const P0: [number, number] = [PORCH_POS[0], PORCH_POS[1] + RISE_STEP]
const P1: [number, number] = [PARENT_MEET_POS[0], PARENT_MEET_POS[2]]
const PATH_LEN = Math.hypot(P1[0] - P0[0], P1[1] - P0[1])
/** Facing along the walk (figure faces +z at yaw 0). */
const PATH_YAW = Math.atan2(P1[0] - P0[0], P1[1] - P0[1])

/** ParentFigure's gait numbers (PARENT_PROPS.STRIDE = 0.34). */
const GMA_UNITS_PER_CYCLE = 4 * 0.34

export function rise01(t: number): number {
  return smooth01((t - T_RISE) / RISE_DUR)
}

/** Eased distance along the yard path, 0..PATH_LEN — near-linear through the
 *  middle with soft ends, so she steps off and arrives rather than lurching. */
export function gmaWalkDist(t: number): number {
  const u = Math.min(1, Math.max(0, (t - T_WALK0) / (T_ARRIVE - T_WALK0)))
  return smooth01(u * 1.12 - 0.06) * PATH_LEN
}

export function gmaMotion(t: number): number {
  const d = gmaWalkDist(t + 0.06) - gmaWalkDist(t - 0.06)
  // Normalised to the AMBLE's cruise (~0.8 u/s), not the old dash's 1.35 —
  // left at the old constant her stride never opened and she glided.
  return Math.min(1, Math.abs(d) / (0.12 * 0.8))
}

export function gmaPhase(t: number): number {
  const scale = gmaScale(t)
  const p = (gmaWalkDist(t) / (GMA_UNITS_PER_CYCLE * scale)) % 1
  return p < 0 ? p + 1 : p
}

export function gmaPos(t: number): [number, number] {
  if (t < T_RISE) return [PORCH_POS[0], PORCH_POS[1]]
  const r = rise01(t)
  const d = gmaWalkDist(t)
  const u = PATH_LEN < 1e-6 ? 0 : d / PATH_LEN
  return [
    PORCH_POS[0] + (P1[0] - PORCH_POS[0]) * u,
    PORCH_POS[1] + RISE_STEP * r + (P1[1] - (PORCH_POS[1] + RISE_STEP)) * u,
  ]
}

/** Facing: chair faces up the road (+z, yaw 0); she turns onto the path as
 *  she starts walking and back to face up the road as she arrives. */
export function gmaYaw(t: number): number {
  const turnIn = smooth01((t - T_WALK0) / 0.5)
  const turnOut = smooth01((t - (T_ARRIVE - 0.5)) / 0.65)
  return PATH_YAW * turnIn * (1 - turnOut)
}

/**
 * The built-in porch sitter is a full-height adult; ParentFigure is 0.90. She
 * shrinks the difference while walking AWAY from the lens, where a 10% change
 * reads as perspective and nothing else.
 */
export function gmaScale(t: number): number {
  return 1.0 - 0.10 * smooth01((t - (T_WALK0 + 0.1)) / 1.6)
}

/* ── The chair's rock — shared with the porch override ───────────── */

/**
 * The porch override clock: crosses PorchRocker's `occupiedUntil` (12) exactly
 * at T_RISE, so the chair rocks while she sits and decays after she leaves.
 * The decay constants MUST match porch.tsx's (0.045 / 1.75 / 0.6): her seated
 * body rides this same curve so she and the chair move as one thing.
 */
export const PORCH_CLOCK_SHIFT = 12 - T_RISE

export function rockAngle(t: number): number {
  const c = t + PORCH_CLOCK_SHIFT
  const amp = t < T_RISE ? 0.045 : 0.045 * Math.exp(-(t - T_RISE) * 0.6)
  return Math.sin(c * 1.75) * amp
}

/* ── The light: Act B's clock, and the world under the seams ─────── */

/**
 * Deep in Act B's night window, same endpoints the 11.5s cut used (68 → 75.4);
 * for t74 < 0 — 6.85's turn-to-countryside — it extrapolates a shade earlier
 * into the dusk (≈66 at t74=−1.9), which is exactly the "scenery changes to
 * the countryside" light the beat wants, and lands on 68 at the cut on both
 * sides. Same raw-value convention as journey.ts's worldAt.
 */
export function worldAt(t: number): number {
  return 68 + (t / DUR) * (75.4 - 68)
}

/**
 * Flat: 6.85 now delivers a fully-revealed dusk valley at the cut (its own
 * exposure driver ramps up to this value during the world-turn), so the old
 * "out of the dark" fade-up would double-dip. 7.2/8.55's shared exposure.
 */
export function exposureAt(_t: number): number {
  return 1.25
}

/* ── Walkers, retimed for a 6.5s act ─────────────────────────────── */

/** Market brightness drains to 8.55's opening 0.025 over t 1 → 5.2. */
export function litDrain(t: number): number {
  return 1 - smooth01((t - 1.0) / 4.2)
}

/** Crowd drift damps to exactly zero by 5.7. */
export function driftK74(t: number): number {
  return 1 - smooth01((t - 3.4) / 2.3)
}

/** Camera-sightline corridor closes over 4.4 → 6.0 (8.55's OPEN_LANE holds the
 *  same ground clear at generation, so the handoff frame is untouched). */
export function clearing74(t: number): number {
  return 1 - smooth01((t - 4.4) / 1.6)
}

/** A second corridor, camera → the porch, held open only around the chair
 *  beat so no capsule stands across the one thing the shot is about. */
export function porchGate(t: number): number {
  return smooth01((t - 1.9) / 0.5) * (1 - smooth01((t - 4.7) / 0.6))
}

/**
 * A third, down the road itself: camera → the lit door. The whole scene is
 * one look down this road, and a villager drifting across it stands dead
 * centre of frame for seconds. Released over 4.6 → 6.0 (while the camera
 * falls back and the market settles) so the handoff frame keeps 8.55's own
 * road-standers exactly where its opening expects them. Zero at t ≤ 0.2, so
 * the 6.85 seam frame agrees by construction.
 */
export function roadGate(t: number): number {
  return smooth01((t - 0.2) / 0.6) * (1 - smooth01((t - 4.6) / 1.4))
}
/** The lit door, in village x/z — what `roadGate`'s corridor aims at. */
export const DOOR_POS: [number, number] = [0, -24.3]

/* ── Camera ──────────────────────────────────────────────────────── */

/**
 * Hero-relative form of 8.55's opening pose — journey.ts's HANDOFF_KEY
 * derivation, verbatim, keyed at this scene's DUR. The last frame of this
 * scene IS 8.55's first frame, by subtraction rather than by eye.
 */
export const HANDOFF_KEY_74: CamKey = {
  a: DUR,
  d: [
    OPEN_CAM.pos[0] - GOLDEN_POS[0],
    OPEN_CAM.pos[1],
    OPEN_CAM.pos[2] - GOLDEN_POS[2],
  ],
  t: [
    OPEN_CAM.tgt[0] - GOLDEN_POS[0],
    OPEN_CAM.tgt[1],
    OPEN_CAM.tgt[2] - GOLDEN_POS[2],
  ],
  fov: OPEN_CAM.fov,
}

/**
 * One move: open LOW and CLOSE behind his shoulder — 6.85's closing arc has
 * just swept around him onto this pose, the lit house far up the road, his
 * waving arm up over his silhouette — hold the set-off a beat (she rises,
 * small and far, at the house), swing out right toward the yard and find her
 * already ambling across it, follow her to the road edge, then fall back
 * behind him and settle onto 8.55's key.
 *
 * The first key is the SEAM KEY: 6.85's closing camera arc lands on exactly
 * this hero-relative pose (plus the same breath term) at its last frame.
 * He starts at z≈−11.85, past the last stalls, so the lateral swings clear
 * everything — the market is behind the lens for the whole shot.
 */
export const KEYS_74: CamKey[] = [
  { a: 0.0, d: [0.85, 1.35, 1.60], t: [-0.55, 0.98, -6.0], fov: 42 },  // over the shoulder: the road, the lamp, the wave
  { a: 1.2, d: [1.30, 1.48, 2.25], t: [-0.15, 1.00, -7.0], fov: 40 },  // easing out and right
  { a: 2.5, d: [2.40, 1.52, 4.00], t: [1.45, 0.74, -8.6], fov: 38 },   // the yard: she is already crossing it — him left
  { a: 3.9, d: [2.85, 1.45, 4.20], t: [0.75, 0.82, -6.6], fov: 38 },   // following her down to the road edge
  { a: 5.0, d: [4.30, 1.30, 4.90], t: [1.10, 0.98, -2.7], fov: 40 },   // falling back behind him
  HANDOFF_KEY_74,                                                       // === 8.55 t=0
]
