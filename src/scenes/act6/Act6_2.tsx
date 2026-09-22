/**
 * Act 6.2 — "THE AUDITION"
 *
 * The moment the story turns. A practice room at an agency: a raised judging
 * bench with three people behind it, a hard overhead spotlight, a mic stand,
 * and our figure singing into it.
 *
 * He starts almost dark — the glow he had as a child on the road has been
 * dormant since Act 4 — and as he sings it comes back up. By the end of the
 * scene he is the brightest thing in the room, and the light spills onto the
 * floor and the bench.
 *
 * The camera does not sit still behind the panel any more: it swings a
 * three-quarter arc around him over the six seconds, so the scene opens on
 * the backs of the judges' heads (his view of the room) and ends with the
 * judges themselves in frame in front of him, lit enough to read as people
 * who are deciding something.
 *
 * SCALE, as in 6.1: the set is metres and GoldFigure is already human-sized,
 * so every figure here is at scale 1. At the old 2.2 he was four metres tall
 * and the mic stand came up to his knee.
 *
 * The glow is the whole point of the scene and of the two that follow it, so
 * it is a single number here, exported and reused: 6.3 runs the same ramp in
 * reverse in front of empty seats.
 */

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import * as THREE from 'three'
import { createScene } from '../createScene'
import { useCameraHandoff } from '../DebugCamera'
import { GoldFigure } from '../characters/goldFigure'
import { getAnimTime } from '../../hooks/useAnimTime'
import SeededSparkles from '../effects/SeededSparkles'
import GradientEnvironment from '../effects/GradientEnvironment'

const clamp01 = (t: number) => Math.max(0, Math.min(1, t))
const easeInOut = (t: number) => t * t * (3 - 2 * t)

/* ─── The glow arc ──────────────────────────────────────────────
 * Shared with 6.3 so the two scenes are unmistakably the same ramp seen
 * from both ends. 0.18 is "the light is still in there somewhere";
 * 1.76 is "he is the brightest thing in the building".
 */
export const GLOW_DORMANT = 0.18
/** 1.76, not the 1.85 this ran at — 5% off the top, because at the peak he
 *  was blown out enough that you stopped reading a figure and started
 *  reading a lamp. Everything downstream is normalised by this number
 *  (`g / GLOW_BLAZING`), so the room light he throws is unchanged; only the
 *  emissive on the body comes down. */
export const GLOW_BLAZING = 1.76

/** Where in the slot the voice opens up. It runs almost the whole length
 *  now: the camera goes a full turn around him and he has to be brighter at
 *  every point of it than he was a quarter-turn earlier, or the orbit and the
 *  ramp are telling two different stories. */
const SING_START = 0.4
const SING_FULL = 4.9

export function auditionGlow(t: number): number {
  const u = easeInOut(clamp01((t - SING_START) / (SING_FULL - SING_START)))
  // A little tremor on top — the glow is a voice, and a voice is not a dimmer.
  const tremor = Math.sin(t * 7.3) * 0.05 + Math.sin(t * 11.9) * 0.03
  const base = GLOW_DORMANT + (GLOW_BLAZING - GLOW_DORMANT) * u * (1 + tremor * u)
  // And a kick on the point (see below). Small — 8%. This material runs at
  // emissive 1.76 with tone-mapping off, and the Bloom notes at the bottom of
  // the file are the record of what happens when it goes much past that.
  const s = t - POINT_LAND
  return s > 0 ? base * (1 + 0.08 * Math.exp(-s * 3.4)) : base
}

/* ─── The point ─────────────────────────────────────────────────
 * The last thing that happens in the shot, and the reason the orbit is a
 * full turn rather than a half one: the camera comes all the way back round
 * to the front, and the moment it settles he puts his hand down the lens.
 *
 * It lands on the word "you" — the held G#4 in "Somebody like you", which in
 * the song is at 1:51.74 (see POINT_LAND). That note is the loudest, longest
 * and highest thing in the phrase, so the gesture has something to hit that
 * an audience can hear, not just a bar line.
 *
 * The shape is prep → load → drive → hold, and the prep is most of it:
 *
 *   · Across the whole turn the free hand is already coming up and opening
 *     out (the `u` ramp below). By 4s it is an open palm at chest height.
 *   · COIL (0.85s) — it draws back, in and under the shoulder, elbow behind
 *     the body line. The torso rotates AWAY from the camera and the whole
 *     figure sinks a couple of centimetres through the legs.
 *   · DWELL (0.12s) — and then nothing at all. This is the beat that makes
 *     the rest of it read as deliberate rather than as a flinch.
 *   · DRIVE (0.62s) — out. `driveEase` is a constant force to 58% of the
 *     travel and a hard brake after it, so the hand accelerates for a long
 *     time, holds a high speed through the middle and is stopped ON the
 *     mark rather than easing into it. A cubic ease-out here reads light and
 *     fast; this reads like something with mass being aimed.
 *   · HOLD — a single 3 Hz recoil of 1.6 cm along the arm, damped out in
 *     about a third of a second, and then he is completely still until the
 *     cut. Nothing returns to rest. The shot ends on the point.
 *
 * The body leads the hand by 90 ms (`BODY_LEAD`) — the shoulder and the
 * weight go first and the arm is dragged after them, which is how a person
 * throws anything. Driving the hand alone gets you a puppet.
 */

/**
 * When the hand arrives, in scene-local seconds.
 *
 * The song sings "you" at **111.74s** (1:51.74). That is measured, not
 * guessed: on the demucs-isolated vocal the phrase runs E4 at 110.72,
 * E4 held from 111.00, F#4 at 111.40, G#4 at 111.54, then a quiet dip at
 * 111.70 and the phrase's loudest, longest and highest note — G#4, held to
 * 112.08 — starting at 111.74. The same shape repeats exactly 4.00s later at
 * 115.74, which is what rules out a lucky read of one syllable.
 *
 * 6.2 starts at 106.0 in `timeline.ts`, so 111.74 − 106.0 = 5.74. Retiming
 * that slot means retuning this number.
 */
export const POINT_LAND = 5.74

/**
 * How long the shot is.
 *
 * Everything past the old six seconds is TAIL. The orbit still finishes at
 * 5.44 and the hand still lands at 5.74; what the extra length bought was
 * the hold — the slot used to end 0.26s after the hand arrived, so the
 * gesture the whole shot is built around was on screen for a quarter of a
 * second and then cut.
 *
 * It was 7.2 until the song was un-spliced. The film had been running on a
 * cut mp3 (8s of silence dropped in at the death) and now runs 1:1 with the
 * untouched recording, which needs 0.35s back out of this stretch. This hold
 * is where it comes from, and the trim is taken entirely off the END: 6.2
 * still starts at 106.0, so the glow igniting, the full turn around him and
 * the point landing on "you" all keep the exact film second they are on
 * today. Only the out-point moves.
 *
 * That out-point is 112.85 in song time, and it is measured off the vocal
 * rather than chosen: "you" is the held G#4 from 111.74 to 112.08; the ad-lib —
 * the "ayy" — is a short C5/C#5 at 112.10–112.22; there is one more B4 tail at
 * 112.60–112.70; and the phrase starts over at 113.20. 112.85 sits in the gap
 * between that last tail and the restart, so the shot still holds the point
 * through the whole of "…you, ayy" — 1.11s of hold instead of 1.46s — and
 * still gets out before the next "Somebody like you" begins.
 */
export const SHOT_DUR = 6.75

/**
 * THE ARM STARTS LATER.
 *
 * The note was that he raises it about a second too early, and he did: the
 * coil began at 4.15 and the whole shot is 6.75 long, so for a quarter of
 * its length he was a man standing at a microphone slowly winding an arm
 * back. The load is a wind-up, not a pose, and a wind-up you can watch for
 * 1.6 seconds is a pose.
 *
 * It cannot be a full second, and the reason is the one number in this file
 * that is not a preference: POINT_LAND is 5.74 because the song sings "you"
 * at 111.74. Delay the gesture bodily by 1.0s and the hand arrives at 6.74
 * — 0.01s before the shot ends — and the hold the last retime was fought
 * for is gone along with the landing. So the delay comes out of the DURATION
 * of the wind-up and the throw instead of out of their position: the coil is
 * 0.22 rather than 0.85, the dwell 0.08 rather than 0.12, the drive 0.42
 * rather than 0.62. COIL_START moves 4.15 → 5.02, which is 0.87 of the
 * second asked for, and the arm is dead still until then.
 *
 * The throw being faster is not a cost. driveEase is constant-force-out,
 * hard-brake-in with peak speed at 58% of the travel; over 0.42s that peak
 * is half again what it was, which is more of what the shot is for.
 */
const DRIVE_DUR = 0.42
const DWELL = 0.08
const COIL_DUR = 0.22
const DRIVE_START = POINT_LAND - DRIVE_DUR
const COIL_END = DRIVE_START - DWELL
const COIL_START = COIL_END - COIL_DUR
/** The shoulder and the weight arrive before the hand does. */
const BODY_LEAD = 0.09

/**
 * Constant force out, hard brake in. Position under a constant acceleration
 * for the first `DRIVE_ACCEL_FRAC` of the move, then a constant deceleration
 * that reaches zero velocity exactly on the mark. Peak speed is 2× the
 * average and it happens late, which is the whole difference between "he
 * pointed" and "you felt him point".
 */
const DRIVE_ACCEL_FRAC = 0.58
function driveEase(t: number): number {
  const p = DRIVE_ACCEL_FRAC
  if (t <= p) return (t * t) / p
  const d = t - p
  return p + 2 * d - (d * d) / (1 - p)
}

/** Left shoulder, in figure-local coords — `poses.ts` puts it at shX = -0.02
 *  and P.SHOULDER_Y. Everything about the arm is measured from here. */
const SHOULDER_L = new THREE.Vector3(-0.02, 1.47, 0.01)
/** The adult arm is 0.55 long, so this is a locked elbow. */
const POINT_REACH = 0.545
/**
 * How far outboard of the camera axis the arm is aimed, and the number this
 * whole gesture came down to.
 *
 * Two things fight over it. Aim the arm straight down the lens and it is
 * perfectly foreshortened and completely invisible — it projects onto the
 * head and the torso and reads as no arm at all. Swing it far enough out to
 * clear the silhouette and it stops foreshortening and reads as an arm held
 * out sideways, which is a different gesture. There is also a hard floor:
 * the mic stand is at x = 0, z = +0.44 and its boom carries the capsule back
 * to (0, 1.505, 0.351), which is exactly where a left arm aimed down the
 * lens puts its elbow.
 *
 * The first pass at this aimed the arm down the lens at 0.34 rad, on the
 * theory that a point at the camera should BE at the camera. It reads as a
 * two-inch stub. The camera is 5.9 out with a 26° lens, so half a metre of
 * reach toward it is an 8% depth change — there is no foreshortening to be
 * had at this distance, only a shorter arm. What reads on camera is the
 * silhouette: a long diagonal with the hand clearly at the end of it, which
 * is what a point looks like in any concert footage ever shot.
 *
 * The measure that settled it: the open palm this scene already had, out at
 * x = -0.405, is legible in this framing. Anything with less lateral extent
 * than that is not. 0.62 rad puts the hand at -0.35 and the fingertip at
 * -0.46, so the point is the longest line on the figure — while 0.42 of the
 * reach is still spent travelling toward the lens, which is what keeps it a
 * point at the audience rather than a semaphore.
 */
const POINT_OUTBOARD = 0.62
/** A few degrees above the arm's own level, so it is a line with a direction
 *  rather than a dead horizontal bar. */
const POINT_RISE = 0.08
/**
 * (This used to carry a cone "finger" past the wrist along the aim. It was
 * meant to taper the point; from the landing bearing it read as a spike
 * bolted to the hand, so it is gone — the drive, the reach and the recoil
 * carry the direction, and the arm ends at the hand like every other limb
 * on the figure.)
 */
/** Where the arm folds to before it goes: back, in, and under the shoulder. */
const COIL_HAND = new THREE.Vector3(-0.175, 1.375, -0.115)

const Y_AXIS = new THREE.Vector3(0, 1, 0)
const _aim = new THREE.Vector3()
const _camLocal = new THREE.Vector3()

/**
 * The hand's mark: full reach from the shoulder, aimed at wherever the
 * camera actually is this frame and then swung outboard past the mic.
 *
 * Aiming at the LIVE camera rather than at a baked triple matters — the
 * torso is rotating 10° into the point while the hand is travelling, so a
 * fixed local target would arrive pointing 10° off the lens, and the orbit's
 * home bearing is a number in this file that is allowed to change.
 */
function pointHandLocal(camLocal: THREE.Vector3, out: THREE.Vector3): THREE.Vector3 {
  _aim.copy(camLocal).sub(SHOULDER_L).normalize()
  _aim.applyAxisAngle(Y_AXIS, -POINT_OUTBOARD)
  _aim.y += POINT_RISE
  _aim.normalize()
  return out.copy(SHOULDER_L).addScaledVector(_aim, POINT_REACH)
}

/** 0 → 1 as the arm folds back into the load, and 1 from then on. */
function coilAmount(t: number): number {
  if (t <= COIL_START) return 0
  if (t >= COIL_END) return 1
  return easeInOut((t - COIL_START) / COIL_DUR)
}

/** 0 → 1 as the hand travels from the load to the mark. */
function driveAmount(t: number): number {
  if (t <= DRIVE_START) return 0
  if (t >= POINT_LAND) return 1
  return driveEase((t - DRIVE_START) / DRIVE_DUR)
}

/**
 * Signed commitment, for everything that is not the hand: 0 neutral, -1
 * fully loaded away from the camera, +1 all the way into the point. The
 * torso, the weight shift and the roll all ride this, so they cannot drift
 * out of agreement with the arm however the timings above are retuned.
 */
function pointCommit(t: number): number {
  return 2 * driveAmount(t) - coilAmount(t)
}

/* ─── Palette ───────────────────────────────────────────────────── */
const FLOOR = '#2A2620'
const WALL = '#1B1F2B'
const DESK = '#191C26'
const CHAIR = '#252A36'

/* ─── World layout ──────────────────────────────────────────────
 * He stands at the origin facing +z; the bench is in front of him. Everything
 * else (mic, spotlight, camera arc) is authored off these two numbers.
 */
const SINGER_Z = 0
const BENCH_Z = 2.85
/** Top of the judges' bench. It is a raised panel, not a school desk. */
const BENCH_TOP = 1.06
/** Riser the judges' chairs stand on behind it. */
const RISER_H = 0.58

/* ─── The singer ────────────────────────────────────────────────
 * The group owns the body — the weight, the rock, the rotation — AND the
 * free hand, because the two have to agree: the hand is aimed at the camera
 * in the figure's LOCAL space, and this group's rotation is what that space
 * is relative to. Computing the aim anywhere else means aiming through a
 * matrix that is one transform out of date by 10° at exactly the frame it
 * matters.
 */
function Singer() {
  const groupRef = useRef<THREE.Group>(null)
  const leftHand = useRef<[number, number, number]>([-0.105, 0.92, 0.01])
  const rest = useRef(new THREE.Vector3())
  const mark = useRef(new THREE.Vector3())
  const hand = useRef(new THREE.Vector3())

  // One material for the whole figure, riding the act's glow ramp.
  const material = useMemo(
    () => new THREE.MeshStandardMaterial({
      color: '#FFB938',
      emissive: '#FFB938',
      emissiveIntensity: GLOW_DORMANT,
      roughness: 0.35,
      metalness: 0.0,
      toneMapped: false,
    }),
    [],
  )

  useFrame(({ camera }) => {
    if (!groupRef.current) return
    const t = getAnimTime()
    material.emissiveIntensity = auditionGlow(t)
    const u = easeInOut(clamp01((t - SING_START) / (SING_FULL - SING_START)))
    const g = groupRef.current

    const commit = pointCommit(t + BODY_LEAD)
    // Once he starts loading, the singer's idle has to get out of the way —
    // a foot-to-foot rock still running underneath a point makes it read as
    // something that happened to him rather than something he did.
    const idle = 1 - Math.min(1, Math.abs(commit) * 1.35)

    // He is singing, so he is never still — and the movement GROWS with the
    // voice. Early on it is nerves (small, fast, uneven); by the end it is
    // performance (bigger, slower, on the phrase). Standing rigid at a mic
    // for five seconds while the camera circles you reads as a mannequin.
    const nerve = (1 - u) * 0.6 + 0.4

    // Weight shifting foot to foot, and a rock through the shoulders. The
    // point adds its own: the weight goes onto the far foot as the arm goes
    // out (you cannot push something away without bracing against it), and
    // the pointing shoulder lifts.
    g.position.x = Math.sin(t * 0.9) * 0.035 * (0.5 + u) * idle + commit * 0.028
    g.rotation.z = -Math.sin(t * 0.9) * 0.028 * (0.5 + u) * idle - commit * 0.030
    // Breath, plus a slow lift of the whole body into the note — and a sink
    // through the legs on the load that is paid back on the drive.
    g.position.y = Math.sin(t * 1.6) * 0.014 * nerve * idle + u * 0.05 + commit * 0.026
    // Turning off the mic and back, the way a singer works a phrase. The
    // point winds the shoulders away from the lens and then swings them
    // through it — this is the piece that carries the weight, and it is safe
    // to swing hard because the head sits on the spine axis and so does not
    // leave the capsule.
    g.rotation.y = (Math.sin(t * 0.7) * 0.07 + Math.sin(t * 1.9) * 0.02 * nerve) * idle
      + commit * 0.095
    // Chest opening: he leans back a few degrees as the note goes up. The
    // forward lean on the point is deliberately tiny — the head is 1.73 up,
    // so 0.05 rad of pitch walks it 8.6 cm along +z and straight into the
    // mic capsule at (0, 1.655, 0.255). 0.018 is what fits.
    g.rotation.x = -u * 0.045 - Math.sin(t * 1.6) * 0.008 * idle
      + Math.max(0, commit) * 0.018

    // ── The free hand ────────────────────────────────────────────
    // Where it would be if he were only singing: out from the side and up to
    // an open palm at chest height, with a float on top so it never parks.
    const float = Math.sin(t * 1.15) * 0.035 + Math.sin(t * 2.3) * 0.012
    rest.current.set(
      -0.105 - u * 0.30,
      0.92 + u * 0.42 + float * (0.3 + u) * idle,
      0.01 + u * 0.26 + float * 0.4 * idle,
    )

    const drive = driveAmount(t)
    if (drive <= 0 && coilAmount(t) <= 0) {
      hand.current.copy(rest.current)
    } else {
      // The mark is aimed at where the camera IS, this frame, in this
      // group's space — so `updateMatrixWorld` first, or the aim is computed
      // against the transform set on the PREVIOUS frame and the arm arrives
      // pointing at where the lens used to be.
      g.updateMatrixWorld()
      _camLocal.copy(camera.position)
      g.worldToLocal(_camLocal)
      pointHandLocal(_camLocal, mark.current)

      hand.current.copy(rest.current).lerp(COIL_HAND, coilAmount(t))
      if (drive > 0) hand.current.lerp(mark.current, drive)

      // Landing recoil: one damped 3 Hz bounce back along the arm, 1.6 cm,
      // gone inside a third of a second. Then he holds it, and nothing else
      // in the shot moves.
      const s = t - POINT_LAND
      if (s > 0) {
        const recoil = Math.sin(s * Math.PI * 6.2) * 0.016 * Math.exp(-s * 8)
        hand.current.addScaledVector(_aim, -recoil)
      }

      // (A cone "finger" used to unfurl past the wrist here to give the
      // point a taper. From the orbit's landing bearing it read as a spike
      // stuck on the hand — "a pointy triangle" — not a finger, so the arm
      // ends at the hand now and the direction is carried by the reach, the
      // rise, and the recoil alone.)
    }

    leftHand.current = [hand.current.x, hand.current.y, hand.current.z]
  })

  return (
    <group ref={groupRef} position={[0, 0, SINGER_Z]}>
      <SingingFigure leftHand={leftHand} material={material} />
    </group>
  )
}

/**
 * Standing at a mic: the right hand stays on the stand throughout — he is
 * singing the word he is pointing on, so he does not come off the capsule to
 * do it — and the left one carries the whole gesture.
 *
 * The free hand is the biggest piece of movement in the shot and it is worth
 * the machinery: `leftHandAt` accepts a ref, which GoldFigure reads every
 * frame, so the arm can be driven from useFrame without re-rendering. Pinning
 * it to a fixed triple would have frozen it.
 */
function SingingFigure({ leftHand, material }: {
  leftHand: React.RefObject<[number, number, number]>
  material: THREE.Material
}) {
  return (
    <GoldFigure
      pose="standing"
      animate
      castShadow
      material={material}
      rightHandAt={[0.06, 1.49, 0.26]}
      leftHandAt={leftHand}
      headForwardTilt={-0.04}
    />
  )
}

/* ─── Mic stand ─────────────────────────────────────────────────
 * The head sits at 1.66 — his mouth. The old stand topped out at 1.62 with
 * the figure at 2.2× scale, which put the capsule somewhere around his shin.
 */
function MicStand({ position }: { position: [number, number, number] }) {
  const BOOM_TILT = -0.55 // top of the boom leans back toward the singer (-z)
  return (
    <group position={position}>
      <mesh position={[0, 0.02, 0]}>
        <cylinderGeometry args={[0.20, 0.24, 0.04, 20]} />
        <meshStandardMaterial color="#101218" roughness={0.5} metalness={0.7} />
      </mesh>
      <mesh position={[0, 0.70, 0]}>
        <cylinderGeometry args={[0.020, 0.026, 1.36, 12]} />
        <meshStandardMaterial color="#20242E" roughness={0.35} metalness={0.85} />
      </mesh>
      {/* Boom, angled up and back, and the capsule on the end of it */}
      {/* Boom, angled up and back, and the capsule on the end of it */}
      <mesh position={[0, 1.505, -0.089]} rotation={[BOOM_TILT, 0, 0]}>
        <cylinderGeometry args={[0.015, 0.015, 0.34, 10]} />
        <meshStandardMaterial color="#20242E" roughness={0.35} metalness={0.85} />
      </mesh>
      <mesh position={[0, 1.655, -0.185]} rotation={[BOOM_TILT, 0, 0]}>
        <capsuleGeometry args={[0.045, 0.09, 6, 12]} />
        <meshStandardMaterial color="#0C0E14" roughness={0.6} metalness={0.4} />
      </mesh>
    </group>
  )
}

/* ─── The bench ─────────────────────────────────────────────────
 * A raised panel on a riser rather than a table, and NOBODY BEHIND IT.
 *
 * The three seats are empty and set at slightly different angles, the way
 * chairs are left rather than placed. The papers and the lamp stay: someone
 * was here. The camera goes all the way round him and finds no one at any
 * point of the turn, which is a colder scene than three silhouettes and a
 * cheaper one to light — and it is the same beat 6.3 lands on a pavement.
 */
function JudgePanel() {
  const seats: { x: number; turn: number }[] = [
    { x: -1.35, turn: 0.22 },
    { x: 0.10, turn: -0.06 },
    { x: 1.55, turn: -0.31 },
  ]
  return (
    <group position={[0, 0, BENCH_Z]}>
      {/* Riser the whole panel stands on */}
      <mesh position={[0, RISER_H / 2, 0.75]} receiveShadow castShadow>
        <boxGeometry args={[6.4, RISER_H, 2.6]} />
        <meshStandardMaterial color="#12141C" roughness={0.85} />
      </mesh>
      {/* Bench top + the modesty panel facing him */}
      <mesh position={[0, BENCH_TOP, 0]} castShadow receiveShadow>
        <boxGeometry args={[5.6, 0.09, 1.05]} />
        <meshStandardMaterial color={DESK} roughness={0.55} metalness={0.12} />
      </mesh>
      <mesh position={[0, (BENCH_TOP - 0.05) / 2, -0.48]} castShadow>
        <boxGeometry args={[5.6, BENCH_TOP - 0.05, 0.09]} />
        <meshStandardMaterial color={DESK} roughness={0.8} />
      </mesh>
      {/* Lit lip along the front edge — reads the bench's height from any
          angle, and gives the camera arc something to travel along. */}
      <mesh position={[0, BENCH_TOP - 0.07, -0.53]}>
        <boxGeometry args={[5.6, 0.018, 0.018]} />
        <meshStandardMaterial color="#5B6E96" emissive="#4E6089" emissiveIntensity={0.7} toneMapped={false} />
      </mesh>
      {/* Papers catching the singer's light */}
      {[-1.35, 0.15, 1.55].map((x, i) => (
        <mesh key={i} position={[x, BENCH_TOP + 0.05, -0.1]} rotation={[-Math.PI / 2, 0, i * 0.3 - 0.2]}>
          <planeGeometry args={[0.42, 0.3]} />
          <meshStandardMaterial color="#C9C4B4" roughness={0.95} />
        </mesh>
      ))}
      {/* Gooseneck lamp — the bench's practical, and the near key on the faces */}
      <group position={[-2.35, BENCH_TOP + 0.05, 0.05]}>
        <mesh position={[0, 0.02, 0]}>
          <cylinderGeometry args={[0.10, 0.12, 0.03, 14]} />
          <meshStandardMaterial color="#0E1017" roughness={0.5} metalness={0.6} />
        </mesh>
        <mesh position={[0, 0.20, 0.03]} rotation={[0.3, 0, 0]}>
          <cylinderGeometry args={[0.012, 0.012, 0.38, 8]} />
          <meshStandardMaterial color="#0E1017" roughness={0.5} metalness={0.6} />
        </mesh>
        <mesh position={[0, 0.40, 0.14]} rotation={[1.15, 0, 0]}>
          <coneGeometry args={[0.10, 0.14, 14, 1, true]} />
          <meshStandardMaterial color="#161A24" roughness={0.6} side={THREE.DoubleSide} />
        </mesh>
        <pointLight position={[0, 0.30, 0.1]} color="#FFD79A" intensity={4.5} distance={5.5} decay={1.7} />
      </group>

      {/* Three empty chairs, pushed about at the angles chairs get left at */}
      {seats.map((h, i) => (
        <group key={i} position={[h.x, RISER_H, 0.66]} rotation={[0, h.turn, 0]}>
          <mesh position={[0, 0.46, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.48, 0.05, 0.46]} />
            <meshStandardMaterial color={CHAIR} roughness={0.85} />
          </mesh>
          <mesh position={[0, 0.73, 0.22]} rotation={[0.14, 0, 0]} castShadow>
            <boxGeometry args={[0.48, 0.52, 0.05]} />
            <meshStandardMaterial color={CHAIR} roughness={0.85} />
          </mesh>
          {[[-0.2, -0.19], [0.2, -0.19], [-0.2, 0.19], [0.2, 0.19]].map(([lx, lz], k) => (
            <mesh key={k} position={[lx, 0.22, lz]}>
              <boxGeometry args={[0.035, 0.44, 0.035]} />
              <meshStandardMaterial color="#14171F" roughness={0.5} metalness={0.6} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  )
}

/* ─── Room shell ────────────────────────────────────────────────── */
function Room() {
  return (
    <group>
      {/* Floor — sprung wood, scuffed */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[40, 40]} />
        <meshStandardMaterial color={FLOOR} roughness={0.62} metalness={0.08} />
      </mesh>
      {/* Back wall behind the singer. No wordmark on it for now — the agency
          name is out of Act 6 entirely. */}
      <mesh position={[0, 2.7, -8.6]} receiveShadow>
        <planeGeometry args={[30, 9]} />
        <meshStandardMaterial color={WALL} roughness={0.92} />
      </mesh>
      {/* Mirror rail — practice rooms always have one, and it gives the back
          wall a horizontal to sit against */}
      <mesh position={[0, 1.5, -8.54]}>
        <planeGeometry args={[28, 0.05]} />
        <meshStandardMaterial color="#39404F" roughness={0.4} metalness={0.5} />
      </mesh>
      {/* Wall behind the panel. The orbit reaches z = +6.4, so this has to
          sit past that or the camera starts the shot outside the room. */}
      <mesh position={[0, 2.7, BENCH_Z + 4.9]} rotation={[0, Math.PI, 0]} receiveShadow>
        <planeGeometry args={[30, 9]} />
        <meshStandardMaterial color="#141822" roughness={0.94} />
      </mesh>
      {/* Side walls, just enough to close the box in peripheral vision */}
      <mesh position={[-9.6, 2.9, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[20, 9]} />
        <meshStandardMaterial color="#161A24" roughness={0.95} />
      </mesh>
      <mesh position={[9.6, 2.9, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[20, 9]} />
        <meshStandardMaterial color="#161A24" roughness={0.95} />
      </mesh>
      {/* Ceiling — the camera swings low enough on the arc to see it */}
      <mesh position={[0, 5.8, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[30, 26]} />
        <meshStandardMaterial color="#0D1017" roughness={0.98} />
      </mesh>
    </group>
  )
}

/* ─── The spotlight cone ────────────────────────────────────────
 * NARROW AT THE FIXTURE, WIDE ON THE FLOOR. `coneGeometry` puts its apex at
 * +height/2, so an un-rotated cone is already the right way up; this one
 * carried `rotation={[Math.PI, 0, 0]}`, which flipped it into a funnel —
 * a metre-wide pool of light at his feet opening out to three metres at the
 * ceiling. Every real spot is the other way round, and it matters more now
 * that the camera goes all the way round it.
 */
function SpotCone() {
  const matRef = useRef<THREE.MeshBasicMaterial>(null)
  useFrame(() => {
    if (!matRef.current) return
    // The cone brightens with the voice, but only a little — it is the room's
    // light, not his.
    const g = auditionGlow(getAnimTime())
    matRef.current.opacity = 0.028 + 0.020 * (g / GLOW_BLAZING)
  })
  // Apex just under the lamp at 5.4, base on the floor: height 5.4, so the
  // centre sits at 2.7. Base radius matches the spot's 0.30 rad half-angle.
  return (
    <mesh position={[0, 2.70, SINGER_Z]}>
      <coneGeometry args={[1.72, 5.4, 40, 1, true]} />
      <meshBasicMaterial
        ref={matRef}
        color="#DCE6FF"
        transparent
        opacity={0.04}
        depthWrite={false}
        side={THREE.DoubleSide}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  )
}

/* ─── Camera: one full turn around him, tightening ───────────────
 * A complete 360° about the singer, and the lens closes from 54° to 26° as
 * it goes. So the shot opens wide over the empty bench — the whole cold room
 * and the three chairs nobody is in — travels all the way round behind him,
 * and comes back to the same bearing in a near-close-up with him at his
 * brightest. Same angle, twice, and everything about him has changed.
 *
 * The radius only shrinks from 6.4 to 5.9 and the rest of the push-in is the
 * lens, deliberately: the bench riser reaches z = 4.9 and the chairs stand
 * on it, so an orbit that closed much further flies the camera into them on
 * the way home — at 5.0 the nearest chair back was a metre off the lens and
 * read as a slab of nothing. The camera also rises a little, which puts the
 * whole chair in frame instead of its top corner.
 */
const ORBIT_C = new THREE.Vector3(0, 0, SINGER_Z)
const ORBIT_R0 = 6.4
const ORBIT_R1 = 5.9
const ORBIT_A0 = 0.05
const ORBIT_A1 = 0.05 + Math.PI * 2 // one full turn, home to the same bearing

/**
 * The turn finishes a beat BEFORE the hand arrives, and `u` clamps at 1, so
 * the last third of a second of the shot is a locked-off close-up with the
 * point landing into it. Under a still frame the gesture is the only thing
 * moving; under a moving one it is just more motion.
 */
const ORBIT_DUR = POINT_LAND - 0.3

export function auditionCamPose(t: number, dur = ORBIT_DUR) {
  const u = easeInOut(clamp01(t / dur))
  const a = ORBIT_A0 + (ORBIT_A1 - ORBIT_A0) * u
  const r = ORBIT_R0 + (ORBIT_R1 - ORBIT_R0) * u
  return {
    pos: new THREE.Vector3(
      ORBIT_C.x + Math.sin(a) * r,
      // The rise is load-bearing: the home bearing looks at him OVER the
      // bench, and the middle chair (back top at y≈1.57, three metres off
      // the lens) sat dead centre of the last frame's bottom edge. The
      // final framing has to put the frame's lower edge ABOVE that chair at
      // the chair's depth — which is a function of fov, camera height and
      // aim together. 19° / y 2.62 / aim 1.70 clears it by a few
      // centimetres; widen the lens or drop the ray and the chair comes
      // back.
      1.86 + u * 0.76,
      ORBIT_C.z + Math.cos(a) * r,
    ),
    // Look-at settles high on his chest and RISES a touch — with a full turn
    // to travel, anything that drifts sideways swings the frame around
    // twice, and the climb is what walks the bottom of frame up off the
    // furniture.
    target: new THREE.Vector3(0, 1.58 + u * 0.12, SINGER_Z),
    // The lens does nearly all of the push-in. 54 → 19 is about 3.5× on
    // him: the shot opens on the whole cold room and ends waist-up on the
    // singer alone — by the last frame there is no bench and no chair, just
    // him and the dark.
    fov: 54 - u * 35,
  }
}

function CameraRig() {
  const yieldCamera = useCameraHandoff()
  useFrame(({ camera }) => {
    if (yieldCamera()) return
    const { pos, target, fov } = auditionCamPose(getAnimTime())
    camera.position.copy(pos)
    camera.lookAt(target)
    const cam = camera as THREE.PerspectiveCamera
    if (cam.isPerspectiveCamera && Math.abs(cam.fov - fov) > 1e-3) {
      cam.fov = fov
      cam.updateProjectionMatrix()
    }
  })
  return null
}

/* ─── Scene ─────────────────────────────────────────────────────── */
function SceneContent() {
  const keyRef = useRef<THREE.SpotLight>(null)
  const singerLightRef = useRef<THREE.PointLight>(null)

  useFrame(() => {
    const g = auditionGlow(getAnimTime())
    // The figure lights the room as he brightens: this is what turns the
    // ramp from "a material got brighter" into "he filled the space".
    if (singerLightRef.current) {
      singerLightRef.current.intensity = 1.5 + 11 * (g / GLOW_BLAZING)
    }
    if (keyRef.current) keyRef.current.intensity = 26
  })

  return (
    <>
      <CameraRig />

      {/* A cold, dim room environment — nothing warm in here but him. */}
      <GradientEnvironment
        zenith="#0A0E18" horizon="#1A2233" ground="#0A0C12" intensity={0.9}
      />
      <ambientLight intensity={0.12} color="#5C6A8A" />
      <fog attach="fog" args={['#0A0D14', 12, 34]} />

      {/* Hard overhead key on the singer */}
      <spotLight
        ref={keyRef}
        position={[0, 6.6, SINGER_Z + 0.2]}
        angle={0.30}
        penumbra={0.55}
        intensity={26}
        distance={22}
        decay={1.4}
        color="#E6EDFF"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-bias={-0.0009}
        target-position={[0, 0, SINGER_Z]}
      />
      {/* His own light */}
      <pointLight ref={singerLightRef} position={[0, 1.7, SINGER_Z + 0.1]} color="#FFC24E" intensity={2} distance={8.5} decay={2.0} />

      {/* Light on the bench. Less than it had, because there is nobody behind
          it to key any more — just enough to read the empty chairs as chairs
          from every bearing the orbit passes through. */}
      <spotLight
        position={[-1.2, 3.4, BENCH_Z - 2.6]}
        angle={0.78}
        penumbra={0.92}
        intensity={34}
        distance={14}
        decay={1.4}
        color="#A9BCE2"
        target-position={[0, 1.1, BENCH_Z + 0.6]}
      />
      <pointLight position={[0, 3.2, BENCH_Z + 0.2]} color="#7B8FBE" intensity={16} distance={8} decay={1.5} />
      <pointLight position={[3.2, 2.3, BENCH_Z + 1.6]} color="#54679A" intensity={12} distance={9} decay={1.6} />

      <Room />
      <SpotCone />
      <MicStand position={[0, 0, SINGER_Z + 0.44]} />
      <Singer />
      <JudgePanel />

      {/* Dust in the beam */}
      <SeededSparkles seed={61} count={70} scale={[2.4, 3.4, 2.4]} size={2.0} speed={0.09}
        color="#D8E4FF" opacity={0.4} position={[0, 2.1, SINGER_Z]} />
    </>
  )
}

export default createScene({
  background: '#05070C',
  three: {
    camera: { position: [0.32, 1.86, 6.39], fov: 54, near: 0.3, far: 90 },
    gl: {
      antialias: true,
      toneMapping: THREE.ACESFilmicToneMapping,
      toneMappingExposure: 1.15,
    },
    onCreated: ({ camera }) => camera.lookAt(0, 1.58, SINGER_Z),
    debugTarget: [0, 1.5, SINGER_Z],
  },
}, function Act6_2() {
  return (
    <>
      <SceneContent />
      <EffectComposer>
        {/* Tight bloom. He ends at emissive 1.76 with tone-mapping off, and at
            a wide-open threshold the mipmap chain smeared him across the whole
            frame — the last second of the shot came out flat brown. `radius`
            is the lever that actually fixes it: intensity and threshold only
            change how MUCH halo there is, not how far it reaches. */}
        <Bloom intensity={0.7} luminanceThreshold={0.62} luminanceSmoothing={0.6} mipmapBlur radius={0.42} />
        <Vignette eskil={false} offset={0.18} darkness={0.82} />
      </EffectComposer>
    </>
  )
})
