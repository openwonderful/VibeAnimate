/**
 * Act 4.5 — THE DOORWAY, in three measures (1:07.5 → …)
 *
 * A door frame, and the oldest way there is of recording that a child is
 * growing: they back up against the jamb, the parent scratches a line level
 * with the top of their head, and the line stays there forever.
 *
 * It happens three times, and — this is the change from the single held shot
 * this replaces — those three times are three SHOTS, with cuts between them
 * and years in the cuts. Each measure is one day of a different decade:
 *
 *   4.5a  the child is small. The valley is farmed, the range is clean, the
 *         road has no wire over it.
 *   4.5b  halfway up the post. Half the paddies are out of production, the
 *         power line has arrived, and the first towers are up behind the
 *         range.
 *   4.5c  nearly grown. No fields at all — just worked-over dirt — and the
 *         city is fully risen on the horizon.
 *
 * What deliberately does NOT change: the house gets no neighbours and the
 * road is never paved. The century happens on the horizon and to the ground;
 * this doorway does not move. That is the whole of Act 4 in one frame.
 *
 * ── One montage, three windows ───────────────────────────────────────
 * Exactly like `makeFlightScene` in `actB/`: there is ONE twelve-second
 * montage, and `makeDoorwayScene(part)` opens a four-second window onto it.
 * The marks, the light, the child's growth and the camera's orbit are all
 * functions of MONTAGE time, so playing a → b → c back to back is the same
 * thing as playing the montage straight through, and retiming means editing
 * `PART` and nothing else.
 *
 * ── Why time reads as moving now ─────────────────────────────────────
 * The old version drove Act B's world clock between t=58 and t=84 and looked
 * static, because everything that separates day from night in Act B happens
 * at `nightFall`, which is a STEP at t=64. Swinging across it is a light
 * switch, not a sunrise, and `indoors()` at t≥82 was quietly switching the
 * valley's lights off at the top of every night.
 *
 * This one swings between world t=12 and t=60 instead — under `nightFall`
 * the whole way — where `dayTint` and `sunRise` are continuous ramps. That
 * range is a real, unbroken rotation through Act B's own grade: sky dome,
 * stars, fog colour and density, ridge tint, environment map and key light
 * all travel with it. One full turn per measure, phased so the scratch
 * always lands at noon and each cut lands in the dark.
 *
 * On top of that, and the second half of why nothing read before: every
 * emissive thing in the frame is now attenuated against the same phase. The
 * lamp in the house, the two figures and the bloom all go to near-nothing at
 * noon and carry the frame at night. A gold wash on the ground that is the
 * same at midday as at midnight is the single loudest way of saying "this is
 * one held frame with a filter running over it".
 */

import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import { BloomEffect, VignetteEffect } from 'postprocessing'
import type { EffectComposer as PPEffectComposer } from 'postprocessing'
import * as THREE from 'three'

import { createScene } from '../createScene'
import { getAnimTime } from '../../hooks/useAnimTime'
import { useCameraHandoff } from '../DebugCamera'
import { seededRandom } from '../../utils/svgHelpers'
import { GoldFigure, v, proportionsFor, hatBrimRadius, type Proportions, type FigureKind } from '../characters/goldFigure'
import { PARENT_HAT, HOUSE_S, type Farmland } from '../actB/valley'
import { ValleyStill } from '../actB/still'
import { Hanok } from '../act3/hanok'
import { TowerField, type Tower } from '../actB/city'
import { buildCloud, makeGlowMaterial, updateGlow } from '../actB/points'
import { GlowPoints } from '../actB/GlowPoints'
import { dayTint, sunRise, VALLEY_Y, HOUSE_X, HOUSE_Z } from '../actB/flight'
import { clamp01, smooth, type V3 } from '../sets/hanok'
import { CARE_GOLD_ACT3 } from '../act5/shared'

/* ══ Timing ═════════════════════════════════════════════════════════ */

/**
 * One measure. Three of these, cut.
 *
 * Two seconds, not the four this was authored at. The measures are no longer
 * a block at the head of Act 4 — they are cut THROUGH it as time markers,
 * with the paired beats (persimmon, sickbed, piggyback) sitting between them,
 * so each one is a marker the length of the beats around it rather than a
 * held shot. Six seconds of montage total, across three cuts.
 */
export const PART = 2.0
export const CYCLES = 3
export const TOTAL = PART * CYCLES

/** When mark `i` is cut into the post, in montage time. Also — see
 *  `worldClock` — the moment the sun is highest on that day.
 *
 *  Proportional, not an absolute offset: at the original PART = 4 this was
 *  `i * PART + 1.6`, and 1.6 is 0.4 of that measure. Written as a fraction it
 *  keeps the scratch at the same point in the day whatever a measure is
 *  worth, which is the difference between retiming this montage and
 *  re-tuning it. */
const markAt = (i: number) => (i + 0.4) * PART

/* ══ The day, turning over ══════════════════════════════════════════ */

/**
 * Act B's world clock, run round and round.
 *
 * 12 is night — the black valley the film opens on, with the lamp in the
 * house the only warm thing in it. 60 is the top of the day. Both are on the
 * near side of `nightFall`'s step at 64, so the swing between them is
 * continuous in every term Act B grades on.
 *
 * The phase is anchored to the marks: `cos` is +1 at each `markAt(i)`, so
 * every scratch happens at the top of its own day and every cut happens at
 * the bottom of a night. That last part is doing real work — the world
 * changes BETWEEN the parts (fields out, towers up, wire strung), and it
 * changes in the dark, so each measure dawns on a valley you have not seen
 * yet rather than announcing itself.
 *
 * After the third mark the oscillation settles out into a held golden hour,
 * because that is where the film is now and time has stopped being a
 * montage.
 */
const W_NIGHT = 12
const W_DAY = 60
const W_MID = (W_NIGHT + W_DAY) / 2
const W_AMP = (W_DAY - W_NIGHT) / 2
/** Where the lapse comes to rest: Act 3.1's low sun in the pass. */
const W_SETTLE = 52

function worldClock(t: number): number {
  const osc = W_MID + W_AMP * Math.cos((2 * Math.PI * (t - markAt(0))) / PART)
  const s = smooth(clamp01((t - markAt(CYCLES - 1) - 0.5) / 2.2))
  return osc + (W_SETTLE - osc) * s
}

/**
 * How much sun is on the valley: 0 in the dark, ~0.3 at dusk, 1 at noon.
 *
 * Read off the SAME grade functions the valley itself is lit by rather than
 * off the raw clock, so "the glow knows it is daytime" cannot drift away
 * from "it is daytime".
 */
function dayness(t: number): number {
  const w = worldClock(t)
  return dayTint(w) * (0.3 + 0.7 * sunRise(w))
}

/** Emissive multiplier. Near nothing at noon, over unity at midnight. */
const glowFor = (t: number) => 0.20 + 1.00 * (1 - dayness(t))

/* ══ Staging ════════════════════════════════════════════════════════ */

/**
 * The doorway is the farmhouse's OWN front door.
 *
 * Everything below is authored in the house's LOCAL units — the Hanok body
 * is 2.4 x 1.2 x 1.8 with its front face at z = +0.9 — and lifted into the
 * world by HOUSE_S, so the frame is fixed to the wall by construction rather
 * than by matching numbers that would drift the moment the house was
 * rescaled.
 */
const HOUSE_ORIGIN: V3 = [HOUSE_X, VALLEY_Y + 7, HOUSE_Z]
/** Front face of the Hanok body, in its own units. */
const WALL_Z = 0.9
/** Floor line: the body sits from local y=0 up. */
const FLOOR_Y = 0

/** Door opening, in house units. 1.05 tall clears an adult's 1.89/HOUSE_S. */
const DOOR_W = 0.66
const DOOR_H = 1.06
const JAMB_W = 0.09
/** Top of the threshold board — the sill they stand ON to be measured, not
 *  the floor behind it. Derived from the board's own box below (centre 0.02,
 *  height 0.05) so the two cannot drift apart. */
const STEP_Y = FLOOR_Y + 0.045

/** House units → world. */
const HS = HOUSE_S
/** Adult figure units → world. */
const S = 20

/* ══ The three measures ═════════════════════════════════════════════ */

/**
 * Who is standing in the door each time, and what the world behind them is.
 *
 * The third one is an `adult` rig at 0.8 rather than a `child` rig scaled
 * up: a child figure at 1.15 is a four-year-old's proportions at a
 * fifteen-year-old's height, which reads as a giant toddler. Adult
 * proportions at 80% read as the adolescent the montage is delivering.
 */
type Measure = {
  kind: FigureKind
  scale: number
  /**
   * How much of the arm-waving is left in them, and how fast.
   *
   * This is the montage's only piece of acting and it is a decay: a small
   * child in a doorway cannot hold still and does not try, and by fifteen the
   * arms are down. `0` is genuinely still — the skeleton keeps a breath and
   * nothing else — because a teenager standing to be measured stands there.
   */
  wave: number
  waveRate: number
  /**
   * How far down the parent has to go to reach this mark. 1 is a full squat.
   *
   * Not a directorial choice — a consequence. See `makeParentSkeleton`: the
   * arm is 0.55 rig units and mark 0 is 0.75 below a standing shoulder, so
   * the first measure is only reachable from a crouch and the last one is
   * reachable standing.
   */
  crouch: number
  farmland: Farmland
  skyline: 'none' | 'sparse' | 'full'
  /** Poles across the valley. 0 = the line has not come yet. */
  wire: number
  /** How much the century is in the air by now. Browns the daytime sky. */
  haze: number
}

const MEASURES: Measure[] = [
  { kind: 'child', scale: 0.46, wave: 1.00, waveRate: 3.3, crouch: 0.79, farmland: 'full', skyline: 'none', wire: 0, haze: 0 },
  { kind: 'child', scale: 0.78, wave: 0.34, waveRate: 2.4, crouch: 0.24, farmland: 'partial', skyline: 'sparse', wire: 9, haze: 0.34 },
  { kind: 'adult', scale: 0.80, wave: 0, waveRate: 1.9, crouch: 0, farmland: 'none', skyline: 'full', wire: 15, haze: 0.72 },
]

/**
 * The figure's own numbers, in HOUSE units.
 *
 * `figScale` is rig units → house units: the measure's own scale times the
 * S/HS the figure is mounted at. Everything below — where the feet land, how
 * tall the crown is, where the mark goes — is a function of it, so the marks
 * and the kid cannot disagree and neither can disagree with the sill.
 */
const figProp = (i: number) => proportionsFor(MEASURES[i].kind)
const figScale = (i: number) => (MEASURES[i].scale * S) / HS
/** Where the figure's ORIGIN sits so its feet land on top of the threshold
 *  board. The rig's own FOOT_Y is a few centimetres up from its origin, which
 *  is exactly the amount that used to bury the feet in the sill. */
const baseY = (i: number) => STEP_Y - figProp(i).FOOT_Y * figScale(i)
/** Top of the head, standing on the step. This IS mark `i`. */
const markY = (i: number) =>
  baseY(i) + (figProp(i).HEAD_Y + figProp(i).RH) * figScale(i)

/** Where the child stands, in house units: inside the opening, one shoulder
 *  to the marked jamb, so their body never covers the column of marks. */
const CHILD_X = -DOOR_W / 2 + 0.20
const MARK_X = -DOOR_W / 2 - JAMB_W / 2
/** Mark sits a hair proud of the jamb's front face (WALL_Z + 0.10). */
const MARK_Z = WALL_Z + 0.1025

/* ══ The stroke ═════════════════════════════════════════════════════ */

/**
 * The knife's path across the post, in HOUSE units.
 *
 * It runs from the child's side of the jamb to the far side of it and carries
 * through — a scratch is a follow-through, not a stop — so the hand enters
 * frame off the crown, crosses the post, and leaves. The mark is revealed
 * behind it, which is the whole of "the mark only appears once the parent has
 * drawn it".
 */
const STROKE_X0 = MARK_X + JAMB_W * 0.95
const STROKE_X1 = MARK_X - JAMB_W * 0.95
const STROKE_Z = WALL_Z + 0.125
/** How long one scratch takes. A knife on a doorpost is quick. */
const STROKE_T = 0.30

/** Half-length of mark `i`, and the tilt it was cut at. Nobody has ever cut
 *  the same line twice: each is a little short or a little long of the post's
 *  width and none of them is level. */
const MARK_TILT = [0.017, -0.012, 0.022]
const MARK_HALF = [0.99, 0.92, 1.06].map(k => (JAMB_W * 0.46 * k))

/** 0 → 1 across the scratch. Shared by the hand and by the line the hand is
 *  leaving behind, so the two cannot come apart. */
const strokeAt = (t: number, i: number) => smooth(clamp01((t - markAt(i)) / STROKE_T))
/** How much of mark `i` is on the post. Trails the blade by a hair: the line
 *  exists where it has already been, never where it is about to go. */
const drawnAt = (t: number, i: number) => clamp01((strokeAt(t, i) - 0.10) / 0.82)

/* ══ The camera: one orbit, three thirds of it ══════════════════════ */

/**
 * A left-to-right arc pivoting on the child — but taken in three steps, not
 * as one even sweep.
 *
 * Inside a measure the camera barely moves: a small drift right, the amount a
 * held shot breathes. The travel happens in the CUTS, where the angle jumps
 * three times as far as the whole preceding shot moved. That is the reading
 * the beat wants — you did not walk round this house, you came back to it
 * twice and stood somewhere else each time — and it puts a second cue on each
 * cut besides the world behind the door changing.
 *
 * The pivot is the point of the whole thing. The child stays put in frame
 * while the house swings from one side of it to the other and the valley
 * behind opens up on the opposite side; the doorway is the only fixed thing
 * in a shot where everything else is moving, which is the sentence the beat
 * is there to say.
 */
const PIVOT = new THREE.Vector3(
  HOUSE_X - (CHILD_X * HS + MARK_X * HS) / 2,
  VALLEY_Y + 7 + 25,
  HOUSE_Z - (WALL_Z + 0.12) * HS,
)
const ORBIT_R = 102
const ORBIT_Y = PIVOT.y + 6
/** Bearing at the top of the first measure — well round to the left. */
const ORBIT_A0 = -0.72
/** How far the camera turns WITHIN one measure … */
const ORBIT_SWEEP = 0.16
/** … and how far it jumps in the cut between two. */
const ORBIT_STEP = 0.48
const ORBIT_FOV = 47

/** Bearing at montage time `t`. Three short arcs with two hard steps in the
 *  cuts; lands at +0.72, symmetric with where it started. */
function orbitAngle(t: number): number {
  const i = Math.min(CYCLES - 1, Math.max(0, Math.floor(t / PART)))
  const u = clamp01((t - i * PART) / PART)
  return ORBIT_A0 + i * (ORBIT_SWEEP + ORBIT_STEP) + u * ORBIT_SWEEP
}

function orbitPose(t: number) {
  const a = orbitAngle(t)
  return {
    pos: [
      PIVOT.x + Math.sin(a) * ORBIT_R,
      ORBIT_Y,
      PIVOT.z - Math.cos(a) * ORBIT_R,
    ] as V3,
    tgt: [PIVOT.x, PIVOT.y + 2, PIVOT.z] as V3,
  }
}

function OrbitCamera({ time }: { time: () => number }) {
  const yieldCamera = useCameraHandoff()
  const tgt = useRef(new THREE.Vector3())
  useFrame(({ camera }) => {
    if (yieldCamera()) return
    const p = orbitPose(time())
    camera.position.set(p.pos[0], p.pos[1], p.pos[2])
    tgt.current.set(p.tgt[0], p.tgt[1], p.tgt[2])
    camera.lookAt(tgt.current)
    const cam = camera as THREE.PerspectiveCamera
    if (Math.abs(cam.fov - ORBIT_FOV) > 1e-4) {
      cam.fov = ORBIT_FOV
      cam.updateProjectionMatrix()
    }
  })
  return null
}

/* ══ The door, cut into the front wall ══════════════════════════════ */

function HouseDoorway({ time }: { time: () => number }) {
  const wood = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#4A362A', roughness: 0.94, metalness: 0,
  }), [])
  const dark = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#2A1E16', roughness: 0.96, metalness: 0,
  }), [])
  /** The step stone. Keyed off the hanok's own plinth grey so it reads as
   *  part of the building rather than as a crate left by the door. */
  const stone = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#6E6E78', roughness: 0.95, metalness: 0,
  }), [])
  /** Pale scored wood, lifted a touch so the marks still read at night. */
  const scored = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#EFDCB2', roughness: 0.85, metalness: 0,
    emissive: new THREE.Color('#7A6440'), emissiveIntensity: 0.5,
  }), [])
  /** The shadow in the groove, under the lip of the cut. Two thin bars —
   *  bright wood over dark — is what makes a line read as a knife score in a
   *  post rather than as a strip of tape stuck to it. */
  const groove = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#22160F', roughness: 1, metalness: 0,
  }), [])
  /** Warm interior seen through the opening — a lamp burning in a room, so
   *  it is at its strongest when the frame around it is dark. */
  const inside = useMemo(() => new THREE.MeshBasicMaterial({
    color: '#5A3616', toneMapped: false,
  }), [])
  const insideBase = useMemo(() => new THREE.Color('#5A3616'), [])

  const markRefs = useRef<(THREE.Group | null)[]>([])

  useFrame(() => {
    const t = time()
    markRefs.current.forEach((g, i) => {
      if (!g) return
      // The line is drawn, not faded in: it grows out from the end the blade
      // started at, one frame behind the hand, and stops when the hand runs
      // off the post. Then it is there forever — by the third measure all
      // three are on the jamb, which is the only record this film keeps of
      // the years in between.
      const on = drawnAt(t, i)
      g.visible = on > 0.001
      g.scale.x = Math.max(0.0001, on)
    })
    inside.color.copy(insideBase).multiplyScalar(0.30 + 0.70 * (1 - dayness(t)))
  })

  return (
    <group position={HOUSE_ORIGIN} rotation={[0, Math.PI, 0]} scale={HS}>
      {/* The dark of the room behind the opening, set back off the wall so the
          jambs read as having thickness. */}
      <mesh position={[0, FLOOR_Y + DOOR_H / 2, WALL_Z - 0.09]} material={inside}>
        <planeGeometry args={[DOOR_W, DOOR_H]} />
      </mesh>

      {/* Jambs and head, proud of the wall face. */}
      {[-1, 1].map(k => (
        <mesh
          key={k}
          position={[k * (DOOR_W / 2 + JAMB_W / 2), FLOOR_Y + DOOR_H / 2, WALL_Z + 0.03]}
          material={wood}
        >
          <boxGeometry args={[JAMB_W, DOOR_H + JAMB_W, 0.14]} />
        </mesh>
      ))}
      <mesh
        position={[0, FLOOR_Y + DOOR_H + JAMB_W / 2, WALL_Z + 0.03]}
        material={wood}
      >
        <boxGeometry args={[DOOR_W + JAMB_W * 2, JAMB_W, 0.14]} />
      </mesh>
      {/* Threshold board */}
      <mesh position={[0, FLOOR_Y + 0.02, WALL_Z + 0.05]} material={dark}>
        <boxGeometry args={[DOOR_W + JAMB_W * 2, 0.05, 0.2]} />
      </mesh>

      {/*
        댓돌 — the stone apron at the door.

        It is here because of the parent. The Hanok's own plinth stops at
        z = +1.0 and the parent stands at +1.10, so they were planted a tenth
        of a house unit past the edge of the building and two units above the
        road: standing on air. A single tapering column of a standing figure
        hid it; the moment they squatted and the feet came apart it was the
        first thing in the frame. It also happens to be what is actually
        there in front of a hanok's door.
      */}
      <mesh position={[-0.16, FLOOR_Y - 0.045, WALL_Z + 0.36]} material={stone}>
        <boxGeometry args={[1.15, 0.09, 0.62]} />
      </mesh>

      {/*
        The record, on the face of the near jamb. ONE line per measuring.
        The version this replaces drew a second short tick beside each mark —
        meant as the year, read as a double-scratch, and by the third measure
        the post was a six-rung ladder. A height mark is one line.
      */}
      {MEASURES.map((_, i) => (
        <group
          key={i}
          ref={g => { markRefs.current[i] = g }}
          /* Anchored at the END THE BLADE STARTS FROM, with the bars hung off
             it to -x, so scaling the group along x is the line lengthening
             the way the hand is travelling rather than growing out of its own
             middle. */
          position={[MARK_X + MARK_HALF[i], markY(i), MARK_Z]}
          rotation={[0, 0, MARK_TILT[i]]}
        >
          {/* Down from 1.3 world units to 0.4: a height mark is a knife cut,
              and the version this replaces was a batten nailed to the post.
              Still comfortably wider than a pixel at the montage's distance,
              which is the floor a scratch has to clear to be in the shot at
              all. */}
          <mesh position={[-MARK_HALF[i], 0, 0]} material={scored}>
            <boxGeometry args={[MARK_HALF[i] * 2, 0.0105, 0.006]} />
          </mesh>
          <mesh position={[-MARK_HALF[i], -0.0085, -0.0004]} material={groove}>
            <boxGeometry args={[MARK_HALF[i] * 1.88, 0.0062, 0.005]} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

/* ══ The two of them ════════════════════════════════════════════════ */

/**
 * A kid waiting to be measured, waving their arms about.
 *
 * The version this replaces had them JUMP, three times, on three different
 * rates — which is the wrong action twice over: you cannot be measured while
 * airborne, and a hop rendered on a rig with no feet reads as the whole
 * figure sliding up and down. Arms are the honest version of the same
 * energy. Nothing here is choreographed: two sines per arm at incommensurate
 * rates, a different pair per side, so the two arms never agree and the
 * motion never loops visibly inside a four-second shot.
 *
 * `amp` takes it out of them as they get older, and by the third measure it
 * is 0: the arms are down and the figure is still. That is the only acting
 * the montage needs to say fifteen — and it is why the BREATH below is
 * outside `amp`. A figure with nothing moving on it at all is a mannequin
 * propped in a doorway, not a person holding still to be measured.
 */
function makeWavingSkeleton(time: () => number, amp: number, rate: number) {
  return function waving({ P }: { P: Proportions }) {
    const t = time()
    const R = P.R
    const legLen = P.HIP_Y - P.FOOT_Y
    const torso = P.SHOULDER_Y - P.HIP_Y
    const armLen = torso * 1.02

    // A little weight going side to side under the waving.
    const sway = amp * 0.035 * Math.sin(t * rate * 0.42 + 0.6)
    // …and, always, the chest.
    const breath = 0.011 * Math.sin(t * 1.15)

    const hip = v(sway * torso * 0.5, P.HIP_Y, 0)
    const shoulder = v(sway * torso, P.SHOULDER_Y + torso * breath, 0)
    const head = v(sway * torso * 1.25, P.HEAD_Y + torso * breath, 0)

    /**
     * Hip → shoulders → NECK. That last point is not decoration: the head is
     * a free sphere at HEAD_Y and the shoulder is at SHOULDER_Y, and on the
     * adult rig those are 0.10 apart with a 0.16 head — so a spine that stops
     * at the shoulders leaves a visible gap of daylight under the skull. It
     * only showed on the third measure because the child rig's head is big
     * enough to very nearly close it by itself.
     */
    const neck = v(
      shoulder.x + (head.x - shoulder.x) * 0.62,
      shoulder.y + (head.y - shoulder.y) * 0.62,
      0,
    )

    const spine = [
      hip,
      v(hip.x * 0.7 + shoulder.x * 0.3, hip.y + torso * 0.36, 0),
      v(hip.x * 0.3 + shoulder.x * 0.7, hip.y + torso * 0.72, 0),
      shoulder,
      neck,
    ]

    /**
     * Feet a little apart rather than together. The rig's own standing pose
     * brings the ankles almost to touching, which at this size renders the
     * legs as one tapering column.
     */
    const leg = (k: number) => {
      const knee = v(k * legLen * 0.13, hip.y - legLen * 0.50, legLen * 0.015)
      const foot = v(k * legLen * 0.19, P.FOOT_Y, 0)
      return [hip, hip.clone().lerp(knee, 0.5), knee, knee.clone().lerp(foot, 0.5), foot]
    }

    /**
     * `a` is the arm's angle away from hanging straight down, so a=0 is at
     * rest and a=PI is straight overhead. The forearm carries a second,
     * faster angle on top of it — an arm waved by a child bends at the elbow
     * far more than it swings at the shoulder.
     */
    const arm = (k: number) => {
      const ph = k > 0 ? 0 : 1.9
      // The last term is outside `amp` and stays when the waving is gone: an
      // arm hanging at rest still drifts a couple of degrees.
      const a = amp * (1.10
        + 0.72 * Math.sin(t * rate + ph)
        + 0.26 * Math.sin(t * rate * 1.73 + ph * 2.2))
        + 0.038 * Math.sin(t * 0.74 + ph)
      const b = a + amp * (0.55 + 0.50 * Math.sin(t * rate * 1.31 + ph * 0.8))
      const up = armLen * 0.52
      const fore = armLen * 0.50
      const elbow = v(
        shoulder.x + k * (0.16 * armLen + Math.sin(a) * up),
        shoulder.y - Math.cos(a) * up,
        0.05 * armLen * Math.sin(t * rate * 0.9 + ph),
      )
      const hand = v(
        elbow.x + k * Math.sin(b) * fore,
        elbow.y - Math.cos(b) * fore,
        elbow.z + 0.10 * armLen,
      )
      return [shoulder, shoulder.clone().lerp(elbow, 0.5), elbow, elbow.clone().lerp(hand, 0.5), hand]
    }

    return {
      curves: [
        { points: spine, radius: R, segments: 14 },
        { points: arm(-1), radius: R * 0.88, segments: 14 },
        { points: arm(+1), radius: R * 0.88, segments: 14 },
        { points: leg(-1), radius: R, segments: 14 },
        { points: leg(+1), radius: R, segments: 14 },
      ],
      spheres: [{ center: head, radius: P.RH }],
    }
  }
}

function Child({ i, time }: { i: number; time: () => number }) {
  const m = MEASURES[i]
  const skeleton = useMemo(
    () => makeWavingSkeleton(time, m.wave, m.waveRate),
    [time, m.wave, m.waveRate],
  )
  const glowScale = useMemo(() => () => glowFor(time()), [time])

  return (
    <group position={HOUSE_ORIGIN} rotation={[0, Math.PI, 0]} scale={HS}>
      {/* In the opening, one shoulder to the marked jamb, facing out — and
          standing ON the threshold board, not sunk through it into the room
          behind. `baseY` puts the rig's own FOOT_Y on top of the sill. */}
      <group position={[CHILD_X, baseY(i), WALL_Z + 0.12]} rotation={[0, Math.PI, 0]}>
        <group scale={figScale(i)}>
          <GoldFigure kind={m.kind} material="goldAmber" glow={1.5}
            skeleton={skeleton} glowScale={glowScale} />
        </group>
      </group>
    </group>
  )
}

/**
 * Where the parent stands relative to the mark, in house units, and the yaw
 * that squares them to it.
 *
 * The sign of dz matters: the parent stands OUT from the wall, so the jamb is
 * BEHIND them in z, not in front. Taking the yaw from `+PARENT_DZ` turns them
 * away from the door and sends the marking arm out over the fields.
 *
 * ── How far out they stand is the HAT's number, not theirs ──────────
 * A 삿갓 is 0.42 rig units in radius — 0.224 house units, wider than this
 * doorway's jamb is thick — and it sits on a disc centred over the wearer's
 * head. At the 0.20 this was authored at, the brim's left side was buried
 * 0.03 into the front wall of the house and its leading edge was inside the
 * near jamb: a hat cutting through a doorpost, which is what the note at
 * 1:17 is pointing at. Nothing about the parent was wrong — they were
 * standing where a person with no hat on stands.
 *
 * So the stand-off is derived from whatever they are actually wearing, plus
 * the jamb's own 0.10 of proudness off the wall and a little margin. It
 * costs a straighter arm at the mark (the reach goes from 83% of the arm's
 * length to about 105%, so the elbow no longer bends), which is what a
 * person reaching to scratch a doorpost from arm's length looks like anyway.
 */
const PARENT_DX = 0.22
const BRIM_R = hatBrimRadius(PARENT_HAT) * (S / HS)
const PARENT_DZ = BRIM_R + 0.075
const PARENT_YAW = Math.atan2(PARENT_DX, MARK_Z - WALL_Z - PARENT_DZ)
/** The adult rig's own sole height, in HOUSE units. */
const PARENT_FOOT = (proportionsFor('adult').FOOT_Y * S) / HS

/**
 * A point on the doorframe, expressed in the PARENT's own figure units.
 *
 * The hand target has to be a point on the JAMB — that is the only thing this
 * gesture is about — and the parent stands offset from it and turned toward
 * it, at a different scale. Writing the target as a triple in the parent's
 * local frame means recomputing three trig terms by hand every time the
 * staging moves, and the version this replaces got the sign of one of them
 * wrong: the "stroke" ran the hand 0.16 along local -x, which after the yaw
 * is not across the post at all but straight back out over the fields.
 *
 * So: say where on the house you want the hand, and let the transform be
 * inverted for you.
 */
function toParentLocal(X: number, Y: number, Z: number): [number, number, number] {
  const dx = X - (MARK_X - PARENT_DX)
  const dz = Z - (WALL_Z + PARENT_DZ)
  const c = Math.cos(PARENT_YAW)
  const s = Math.sin(PARENT_YAW)
  const k = HS / S
  return [
    (dx * c - dz * s) * k,
    (Y - (FLOOR_Y - PARENT_FOOT)) * k,
    (dx * s + dz * c) * k,
  ]
}

/* ══ The crouch ═════════════════════════════════════════════════════ */

/** How far the hips travel at a full squat, in the parent's own rig units.
 *  The leg is 0.87 long, so this is most of the way down. */
const CROUCH_DROP = 0.70
/** Ankles, ditto. Wider than the rig's own standing pose, which brings them
 *  to 0.032 apart — at this scale that is one tapering column, and a squat
 *  with the feet together is not a squat. */
const PARENT_STANCE = 0.12

/**
 * One leg, solved rather than posed.
 *
 * The knee is placed off the hip→ankle line by exactly the amount that keeps
 * both bones their own length, so the feet stay planted through the whole
 * descent and neither thigh nor shin ever stretches. Standing, the hip and
 * ankle are two bone-lengths apart and the offset falls out at zero — the
 * same straight leg the rig's own standing pose gives.
 */
function bentLeg(hipX: number, hipY: number, P: Proportions): THREE.Vector3[] {
  const ankleX = hipX > 0 ? PARENT_STANCE : -PARENT_STANCE
  const hip = v(hipX, hipY, 0)
  const ankle = v(ankleX, P.FOOT_Y, 0)
  const bone = 0.5 * Math.hypot(ankleX - hipX, P.HIP_Y - P.FOOT_Y)
  const d = hip.distanceTo(ankle)
  const out = Math.sqrt(Math.max(0, bone * bone - (d * d) / 4))
  // Forward AND out. All-forward knees read as somebody perched on a stool;
  // a squat splays.
  const knee = hip.clone().lerp(ankle, 0.5)
  knee.z += out * 0.80
  knee.x += (hipX > 0 ? 1 : -1) * out * 0.55
  return [hip, hip.clone().lerp(knee, 0.5), knee, knee.clone().lerp(ankle, 0.5), ankle]
}

/**
 * The parent, squatting to whatever height they are marking.
 *
 * This exists because of a number. Mark 0 sits 0.75 rig units BELOW a
 * standing adult's shoulder and the arm is 0.55 long, so pinning the hand to
 * it from full height does not reach — and `buildPinnedArmPoints` will
 * happily run a tube to a point the arm cannot get to, which renders as a
 * straight golden noodle from the shoulder to the floor. You cannot mark a
 * small child's height standing up. The rig was telling the truth; the pose
 * was wrong.
 *
 * The arms are built here rather than through `buildPose` for one reason: its
 * pinned arm hardcodes the shoulder at z = 0.01, and a crouching torso pitches
 * forward. Two centimetres of rig is forty of world, and it reads as the arm
 * hanging off the back of the shoulder.
 */
function makeParentSkeleton(
  hand: { current: [number, number, number] },
  crouch: { current: number },
) {
  return function parent({ P }: { P: Proportions }) {
    const c = clamp01(crouch.current)
    const dropY = CROUCH_DROP * c
    /** The torso pitches in over the knees as it goes down — and does most of
     *  it early, because a small drop is a person bending toward a child, not
     *  a person sinking straight down on their heels. */
    const lean = 0.13 * Math.sqrt(c)

    const hipY = P.HIP_Y - dropY
    const shY = P.SHOULDER_Y - dropY
    const torso = shY - hipY

    const shoulder = v(0, shY, 0.01 + lean)
    const head = v(0, P.HEAD_Y - dropY, 0.03 + lean * 1.15)
    const neck = shoulder.clone().lerp(head, 0.62)

    const spine = [
      v(0, hipY, 0),
      v(0, hipY + torso * 0.30, lean * 0.34),
      v(0, hipY + torso * 0.66, lean * 0.72),
      shoulder,
      neck,
    ]

    const legL = bentLeg(-0.02, hipY, P)
    const legR = bentLeg(+0.02, hipY, P)

    /** Shoulder → hand, elbow nudged out and forward. Same shape as the
     *  rig's own pinned arm, off the shoulder this pose actually has. */
    const armTo = (side: number, target: THREE.Vector3) => {
      const sh = v(shoulder.x + side * 0.02, shoulder.y, shoulder.z)
      const mid = sh.clone().lerp(target, 0.5)
      mid.x += side * 0.05
      mid.z += 0.03
      mid.y -= 0.01
      return [sh, sh.clone().lerp(mid, 0.45), mid, mid.clone().lerp(target, 0.5), target]
    }

    // The free hand goes onto the knee as they go down — which is how anybody
    // holds a squat, and it also keeps that arm from hanging straight through
    // the thigh.
    const knee = legL[2]
    const free = v(-0.105, shY - 0.55, 0.02).lerp(
      v(knee.x - 0.05, knee.y + 0.05, knee.z + 0.04),
      clamp01(c * 1.25),
    )

    return {
      curves: [
        { points: spine, radius: P.R, segments: 16 },
        { points: armTo(-1, free), radius: P.R, segments: 14 },
        { points: armTo(+1, v(...hand.current)), radius: P.R, segments: 14 },
        { points: legL, radius: P.R, segments: 16 },
        { points: legR, radius: P.R, segments: 16 },
      ],
      spheres: [{ center: head, radius: P.RH }],
    }
  }
}

/** The parent, who does the marking. */
function Parent({ i, time }: { i: number; time: () => number }) {
  const handRef = useRef<[number, number, number]>([0.24, 0.92, 0.30])
  const crouchRef = useRef(0)
  const skeleton = useMemo(
    () => makeParentSkeleton(handRef, crouchRef),
    [],
  )
  const mat = useMemo(() => new THREE.MeshStandardMaterial({
    color: CARE_GOLD_ACT3, emissive: CARE_GOLD_ACT3,
    emissiveIntensity: 0.95, roughness: 0.6,
  }), [])

  useFrame(() => {
    const t = time()
    const local = t - markAt(i)

    // Down first, then up to the crown, hold there a moment — you level your
    // hand off the top of their head before you cut anything — then one
    // stroke across, and everything comes back up together.
    const reach = smooth(clamp01((local + 1.0) / 0.75))
    const drop = smooth(clamp01((local - STROKE_T - 0.30) / 0.7))
    crouchRef.current = MEASURES[i].crouch
      * smooth(clamp01((local + 1.5) / 0.8)) * (1 - drop)
    const rest: [number, number, number] = [0.24, 0.92, 0.30]
    // Where the blade is on the jamb this frame, in HOUSE units — the same
    // stroke the mark is being revealed behind.
    const s = strokeAt(t, i)
    const at = toParentLocal(
      STROKE_X0 + (STROKE_X1 - STROKE_X0) * s,
      markY(i) + 0.012,
      STROKE_Z,
    )
    const k = reach * (1 - drop)
    handRef.current = [
      rest[0] + (at[0] - rest[0]) * k,
      rest[1] + (at[1] - rest[1]) * k,
      rest[2] + (at[2] - rest[2]) * k,
    ]
    mat.emissiveIntensity = 0.95 * glowFor(t)
  })

  return (
    <group position={HOUSE_ORIGIN} rotation={[0, Math.PI, 0]} scale={HS}>
      {/* Placed and turned so local +z points straight at the mark. This is
          the transform `toParentLocal` inverts. */}
      <group
        /* Dropped by the rig's own FOOT_Y so the soles, not the origin, land
           on the step stone. */
        position={[MARK_X - PARENT_DX, FLOOR_Y - PARENT_FOOT, WALL_Z + PARENT_DZ]}
        rotation={[0, PARENT_YAW, 0]}
        scale={S / HS}
      >
        {/* Reaching up to the jamb, so the brim goes back off the brow. */}
        <GoldFigure skeleton={skeleton} material={mat}
          hat={PARENT_HAT} hatTilt={-0.35} />
      </group>
    </group>
  )
}

/* ══ The house, with a lamp that knows what time it is ══════════════ */

/**
 * Act B's own farmhouse, mounted here rather than through `ValleyStill`
 * (`house={false}`) for one reason: the lamp.
 *
 * `ValleyHouse`'s lamp bottoms out at 18% of full in daylight, which is
 * correct for a scene that is only ever seen at dusk or at night — and is
 * 5,400 units of point light on the ground four metres from the door at
 * noon. That gold wash, identical in every frame of the old version, is what
 * "the glow in front of the house stays the same, even during the daylight"
 * was pointing at. Here it goes to 4%.
 */
function DoorwayHouse({ time }: { time: () => number }) {
  const group = useRef<THREE.Group>(null)
  const lamp = useRef<THREE.PointLight>(null)
  const spill = useRef<THREE.PointLight>(null)
  /**
   * The Hanok's OWN unconditional light: two big translucent amber planes
   * lying on the ground in front of the door (152 x 190 units at this scale)
   * and three lit paper panels on the wall. None of them are gated by
   * `lights={false}`, none of them are driven by anything, and the ground
   * pair is — precisely — the gold wash that sat in front of this house at
   * midday looking exactly as it looked at midnight. They are found by shape
   * rather than by index so a change to the hanok cannot silently unhook
   * this: planes are the ground spill, boxes are the windows.
   */
  const found = useRef<{ spill: THREE.MeshBasicMaterial[]; panes: THREE.MeshBasicMaterial[] } | null>(null)
  const paneBase = useRef<THREE.Color[]>([])

  useFrame(() => {
    if (!found.current && group.current) {
      const f = { spill: [] as THREE.MeshBasicMaterial[], panes: [] as THREE.MeshBasicMaterial[] }
      group.current.traverse(o => {
        const mesh = o as THREE.Mesh
        if (!mesh.isMesh) return
        const m = mesh.material as THREE.Material
        if (!(m instanceof THREE.MeshBasicMaterial)) return
        const type = mesh.geometry.type
        if (type === 'PlaneGeometry') f.spill.push(m)
        else if (type === 'BoxGeometry') f.panes.push(m)
      })
      found.current = f
      paneBase.current = f.panes.map(m => m.color.clone())
    }

    const night = 1 - dayness(time())
    const lit = 0.04 + 0.96 * night
    if (lamp.current) lamp.current.intensity = 22000 * lit
    if (spill.current) spill.current.intensity = 3000 * lit
    const f = found.current
    if (f) {
      // The ground wash goes out with the lamp that is supposed to be casting
      // it. At noon it is not there at all.
      for (const m of f.spill) m.opacity = 0.085 * night * night
      f.panes.forEach((m, i) => {
        const base = paneBase.current[i]
        if (base) m.color.copy(base).multiplyScalar(0.34 + 0.66 * night)
      })
    }
  })

  return (
    <group ref={group} position={[HOUSE_X, VALLEY_Y + 7, HOUSE_Z]} rotation={[0, Math.PI, 0]} scale={HOUSE_S}>
      <Hanok position={[0, 0, 0]} lights={false} />
      <pointLight ref={lamp} position={[0, 0.9, 2.2]} color="#FFBA42"
        intensity={30000} distance={520} decay={1.8} />
      <pointLight ref={spill} position={[0, 0.2, 4.0]} color="#F5C36C"
        intensity={5200} distance={260} decay={2} />
    </group>
  )
}

/* ══ Probe ══════════════════════════════════════════════════════════ */
/**
 * `npm run eval -- --act 4.5b --wait 5000 "window.__doorway"` answers "what
 * time is it in this frame, and where is the sun" without guessing. Act B
 * learnt this the expensive way: the grade here is four functions deep and
 * reading it off a screenshot is how you spend an afternoon tuning the wrong
 * one.
 */
function DoorwayProbe({ time }: { time: () => number }) {
  const d = useMemo(() => new THREE.Vector3(), [])
  useFrame(({ camera }) => {
    const t = time()
    const w = worldClock(t)
    sunDir(t, d)
    ;(window as unknown as { __doorway: unknown }).__doorway = {
      t: +t.toFixed(3),
      world: +w.toFixed(2),
      dayTint: +dayTint(w).toFixed(3),
      sunRise: +sunRise(w).toFixed(3),
      dayness: +dayness(t).toFixed(3),
      sunY: +d.y.toFixed(3),
      sunX: +d.x.toFixed(3),
      cam: camera.position.toArray().map(v => +v.toFixed(1)),
    }
  })
  return null
}

/* ══ Sun and moon, and the light they throw ═════════════════════════ */

/**
 * Which way the sun goes.
 *
 * NOT through the zenith, and that was the first version's mistake: a sun
 * directly overhead at noon throws its light straight down, so the front wall
 * of the house — the only surface this shot is about — receives nothing, and
 * the brightest moment of the day rendered darker than the dusk either side
 * of it. Act B's own key light is no help; it sits at [220,150,2400], which
 * is almost horizontal along +z, i.e. straight through the range and into the
 * BACK of the house.
 *
 * So the arc peaks at 58° over the camera's shoulder. The wall is raked all
 * day, the light swings right across it as the sun goes over, and the two
 * bodies still rise and set on opposite sides of frame where you can see
 * them do it.
 */
const NOON = new THREE.Vector3(0, Math.sin(1.01), -Math.cos(1.01)).normalize()
const EAST = new THREE.Vector3(1, 0, 0)
const SKY_R = 2200
const SKY_ORIGIN = new THREE.Vector3(HOUSE_X, VALLEY_Y, HOUSE_Z)

/** Unit vector to the sun at montage time `t`. `cos` is +1 at each mark, so
 *  the sun is at the top of its arc exactly when the scratch goes on. */
function sunDir(t: number, out: THREE.Vector3): THREE.Vector3 {
  const psi = (2 * Math.PI * (t - markAt(0))) / PART
  return out.copy(NOON).multiplyScalar(Math.cos(psi))
    .addScaledVector(EAST, Math.sin(psi)).normalize()
}

/**
 * The two of them on one arc, 180 degrees apart, so every time the sky turns
 * over you can see WHY — one body going down as the other comes up, rather
 * than the colour simply changing.
 *
 * The lights ride with them. Act B's own key light is fixed on one bearing
 * for the whole act (it has to be: the act is one continuous shot), so
 * without these the wall of the house is lit from exactly the same angle at
 * noon and at midnight and the only thing moving is the grade. These two are
 * what put a travelling rake across the front of the house.
 */
function SkyBodies({ time }: { time: () => number }) {
  const sunG = useRef<THREE.Group>(null)
  const moonG = useRef<THREE.Group>(null)
  const sunL = useRef<THREE.DirectionalLight>(null)
  const moonL = useRef<THREE.DirectionalLight>(null)
  const d = useMemo(() => new THREE.Vector3(), [])
  const p = useMemo(() => new THREE.Vector3(), [])

  useFrame(() => {
    const t = time()
    sunDir(t, d)
    const place = (g: THREE.Group | null, k: number) => {
      if (!g) return
      p.copy(SKY_ORIGIN).addScaledVector(d, SKY_R * k)
      g.position.copy(p)
      g.visible = p.y > VALLEY_Y - 40
    }
    place(sunG.current, 1)
    place(moonG.current, -1)

    const aim = (l: THREE.DirectionalLight | null, k: number, gain: number) => {
      if (!l) return
      const h = Math.max(0, d.y * k)
      l.position.copy(SKY_ORIGIN).addScaledVector(d, 1400 * k)
      l.target.position.copy(SKY_ORIGIN)
      l.target.updateMatrixWorld()
      l.intensity = Math.pow(h, 0.65) * gain
    }
    aim(sunL.current, 1, 3.6)
    aim(moonL.current, -1, 0.55)
    // Low sun goes orange, high sun goes white — the one cue that says which
    // end of the day this is when the sky alone is ambiguous.
    if (sunL.current) {
      const h = clamp01(d.y)
      sunL.current.color.setRGB(1, 0.62 + 0.30 * h, 0.30 + 0.55 * h)
    }
  })

  return (
    <>
      <group ref={sunG}>
        <mesh>
          <sphereGeometry args={[78, 20, 20]} />
          <meshBasicMaterial color="#FFD79A" toneMapped={false} fog={false} />
        </mesh>
        <mesh>
          <sphereGeometry args={[138, 20, 20]} />
          <meshBasicMaterial color="#FFB65E" transparent opacity={0.3} depthWrite={false} fog={false} />
        </mesh>
      </group>
      <group ref={moonG}>
        <mesh>
          <sphereGeometry args={[54, 20, 20]} />
          <meshBasicMaterial color="#DCE4F4" toneMapped={false} fog={false} />
        </mesh>
        <mesh>
          <sphereGeometry args={[96, 20, 20]} />
          <meshBasicMaterial color="#A8BEE8" transparent opacity={0.18} depthWrite={false} fog={false} />
        </mesh>
      </group>
      <directionalLight ref={sunL} intensity={0} color="#FFD2A0" />
      <directionalLight ref={moonL} intensity={0} color="#8FA8E6" />
      <DayFill time={time} />
    </>
  )
}

/**
 * Sky bounce. Act B's ambient and hemisphere terms are tuned for a night
 * flight and barely move; without this the valley at noon is one hard
 * directional and black shadow, which reads as a stage rather than as a day.
 */
function DayFill({ time }: { time: () => number }) {
  const hemi = useRef<THREE.HemisphereLight>(null)
  const amb = useRef<THREE.AmbientLight>(null)
  useFrame(() => {
    const day = dayness(time())
    if (hemi.current) hemi.current.intensity = day * 0.88
    if (amb.current) amb.current.intensity = day * 0.28
  })
  return (
    <>
      <hemisphereLight ref={hemi} intensity={0} color="#CFE0FF" groundColor="#9A7048" />
      <ambientLight ref={amb} intensity={0} color="#FFE8CC" />
    </>
  )
}

/* ══ The daytime sky ════════════════════════════════════════════════ */

/**
 * Act B has no daytime.
 *
 * Its sky dome runs between night and DUSK — `dayTint` at 1 is Act 3.1's
 * dusty violet with gold on the horizon, because the act it was built for
 * ends at golden hour and never sees noon. Swinging the world clock up and
 * down that ramp therefore gives night ↔ evening, which is not a day, and it
 * is a large part of why the old version read as one held frame.
 *
 * This is a second dome inside Act B's, drawn over it in proportion to how
 * much sun is actually on the valley: a warm minhwa daylight rather than a
 * stock blue, so it belongs to the same painting as the hills. `haze` browns
 * it out measure by measure — the century arrives in the air as well as on
 * the horizon.
 */
const DAY_SKY_VERT = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`
const DAY_SKY_FRAG = /* glsl */ `
  varying vec3 vDir;
  uniform vec3 uTop;
  uniform vec3 uHorizon;
  uniform float uOpacity;
  void main() {
    // max() before pow(): a negative base is NaN, and one NaN pixel in a
    // frame gets smeared over the whole image by the bloom's mipmap chain.
    float h = pow(max(0.0, vDir.y), 0.62);
    gl_FragColor = vec4(mix(uHorizon, uTop, h), uOpacity);
  }
`

function DaySky({ time, haze }: { time: () => number; haze: number }) {
  const { camera } = useThree()
  const ref = useRef<THREE.Mesh>(null)
  const mat = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      uTop: { value: new THREE.Color('#5C90DC').lerp(new THREE.Color('#A2917F'), haze) },
      uHorizon: { value: new THREE.Color('#FFDCAE').lerp(new THREE.Color('#D8B489'), haze) },
      uOpacity: { value: 0 },
    },
    vertexShader: DAY_SKY_VERT,
    fragmentShader: DAY_SKY_FRAG,
    side: THREE.BackSide,
    transparent: true,
    depthWrite: false,
    fog: false,
  }), [haze])

  useFrame(() => {
    if (ref.current) ref.current.position.copy(camera.position)
    // Slightly ahead of the grade, so the sky is fully day for the whole
    // middle of the day rather than only at the instant of noon.
    mat.uniforms.uOpacity.value = clamp01(dayness(time()) * 1.18)
  })

  return (
    <mesh ref={ref} material={mat} renderOrder={-99} frustumCulled={false}>
      <sphereGeometry args={[4000, 32, 20]} />
    </mesh>
  )
}

/* ══ The wire ═══════════════════════════════════════════════════════ */

/**
 * Act B's own `Poles` run BACK down the road from the house, which is the one
 * direction this camera never looks: it stands between the house and the
 * road, facing the house, so that line arrives from behind the lens and its
 * first span crosses the entire frame at eye height. (It did, for one round.)
 *
 * The line that belongs in this shot is the one crossing the valley in the
 * middle distance, out past the house and short of the range, marching off to
 * both sides. Same poles, laid the other way.
 */
function PowerLine({ count = 15 }: { count?: number }) {
  const wood = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#54382A', roughness: 0.95, metalness: 0,
  }), [])
  const wire = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#2A1C18', roughness: 0.8, metalness: 0.1,
  }), [])

  const SPAN = 240
  const Z = 96
  const BASE = VALLEY_Y + 4
  const xs = useMemo(
    () => Array.from({ length: count }, (_, i) => (i - (count - 1) / 2) * SPAN),
    [count],
  )

  const wires = useMemo(() => {
    const geo: THREE.BufferGeometry[] = []
    for (let i = 0; i < xs.length - 1; i++) {
      for (const dy of [0, -6]) {
        const pts: THREE.Vector3[] = []
        for (let k = 0; k <= 6; k++) {
          const u = k / 6
          const sag = Math.sin(u * Math.PI) * 7
          pts.push(new THREE.Vector3(
            xs[i] + (xs[i + 1] - xs[i]) * u, BASE + 40 + dy - sag, Z,
          ))
        }
        geo.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 8, 0.5, 4, false))
      }
    }
    return geo
  }, [xs])

  return (
    <group>
      {xs.map((x, i) => (
        <group key={i} position={[x, BASE, Z]}>
          <mesh position={[0, 21, 0]} material={wood}>
            <cylinderGeometry args={[1.2, 1.9, 42, 6]} />
          </mesh>
          <mesh position={[0, 40, 0]} material={wood}>
            <boxGeometry args={[1.6, 1.6, 15]} />
          </mesh>
        </group>
      ))}
      {wires.map((g, i) => (
        <mesh key={i} geometry={g} material={wire} frustumCulled={false} />
      ))}
    </group>
  )
}

/* ══ The century, on the horizon ════════════════════════════════════ */

/**
 * The skyline, built out of Act B's own `TowerField` — the same instanced
 * geometry and the same window shader the film opens by flying between — but
 * on a layout authored for THIS sightline instead of the city's own.
 *
 * Act B's city stands at z = 2650–4300, on the far side of a range whose
 * front band tops out around y = 386 seven hundred units from this camera.
 * From the ground at the door, clearing that costs about 900 units of height
 * at z = 1400 and about 1350 at z = 2400, and Act B's tallest tower is 500.
 * That city is not hidden behind the range by accident; it is *geometrically*
 * unreachable from here, which is why the old version's `RisingCity` was
 * invisible however far it was raised.
 *
 * So this one stands closer and much taller: the near rows crest the first
 * band, the far rows crest everything, and the big flank hills still cut
 * across them — which is what "behind the range" is supposed to look like.
 * At night the window shader carries them (they are past the distance at
 * which the grid resolves, so each block reads as one warm mass); by day the
 * valley's own fog leaves them a pale silhouette in the haze, which is the
 * correct amount of city for a farm to be able to see.
 */
const SKY_CAM_Z = -545
/** Reference distance the heights below are quoted at. */
const SKY_REF = 2250

function layoutSkyline(density: 'sparse' | 'full'): Tower[] {
  const rand = seededRandom(density === 'full' ? 4477 : 8813)
  const rows = density === 'full' ? 4 : 3
  const perRow = density === 'full' ? 12 : 8
  const z0 = 1250
  const z1 = density === 'full' ? 2250 : 1950
  /** Apparent height of the median tower, in units at SKY_REF. The range's
   *  front band tops out around 24° from this camera and the tallest of these
   *  reach about 26°, so the skyline crests the ridge without becoming the
   *  sky — the first pass ran to 2,900 units and the two frames it appeared
   *  in had no sky left in them at all. */
  const H0 = density === 'full' ? 900 : 700
  const out: Tower[] = []
  for (let r = 0; r < rows; r++) {
    const z = z0 + (r + 0.5) * ((z1 - z0) / rows)
    // Height scaled by the row's own distance, so every row reads at roughly
    // the same angular height instead of the back ones vanishing behind the
    // front ones.
    const grow = (z - SKY_CAM_Z) / SKY_REF
    for (let i = 0; i < perRow; i++) {
      const x = (i - (perRow - 1) / 2) * (430 + rand() * 170) + (rand() - 0.5) * 200
      if (Math.abs(x) > 3000) continue
      out.push({
        x,
        z: z + (rand() - 0.5) * 170,
        w: 78 + rand() * 120,
        d: 78 + rand() * 110,
        h: H0 * grow * (0.55 + rand() * 0.9),
        seed: rand() * 1000,
      })
    }
  }
  return out
}

/** Aircraft-warning beacons on the tall ones, which is most of what says
 *  "city" on a horizon at night without a single window being resolvable. */
function SkylineBeacons({ towers, time }: { towers: Tower[]; time: () => number }) {
  const mat = useMemo(() => makeGlowMaterial({ falloff: 2.2, maxPixels: 70, twinkle: 0.10 }), [])
  const { camera } = useThree()
  const tall = useMemo(() => towers.filter(t => t.h > 950), [towers])
  const cloud = useMemo(() => buildCloud(
    Math.max(1, tall.length), 7311, ['#FF4444', '#FF6644', '#FFAA88'],
    (rand, i) => {
      const t = tall[i]
      if (!t) return null
      return [t.x, t.h - 20, t.z, 16 + rand() * 10, 0.7 + rand() * 0.3]
    },
  ), [tall])

  useFrame(({ size, gl }) => {
    const t = time()
    updateGlow(mat, camera, size.height * gl.getPixelRatio(), t)
    mat.uniforms.uGlobal.value = 0.25 + 0.75 * (1 - dayness(t))
  })

  return <GlowPoints cloud={cloud} material={mat} frustumCulled={false} />
}

function Skyline({ density, time }: { density: 'sparse' | 'full'; time: () => number }) {
  const towers = useMemo(() => layoutSkyline(density), [density])
  return (
    <group>
      <TowerField towers={towers} baseY={-40} lit={0.62} resK={6} colorSeed={3311} />
      {density === 'full' && <SkylineBeacons towers={towers} time={time} />}
    </group>
  )
}

/* ══ Grade ══════════════════════════════════════════════════════════ */

/**
 * Bloom against the clock. Reached through the composer rather than by
 * putting a ref on `<Bloom>`: @react-three/postprocessing memoises each
 * effect on `JSON.stringify(props)`, and under React 19 `ref` IS a prop —
 * stringify hits the KawaseBlurPass's circular `resolution` and throws,
 * which blanks the whole canvas.
 */
function Grade({ time }: { time: () => number }) {
  const composer = useRef<PPEffectComposer>(null)
  const found = useRef<{ bloom?: BloomEffect; vignette?: VignetteEffect }>({})

  useFrame(() => {
    const f = found.current
    if (!f.bloom && composer.current?.passes) {
      for (const pass of composer.current.passes) {
        for (const e of (pass as { effects?: unknown[] }).effects ?? []) {
          if (e instanceof BloomEffect) f.bloom = e
          if (e instanceof VignetteEffect) f.vignette = e
        }
      }
    }
    const day = dayness(time())
    if (f.bloom) {
      // A night frame is carried by its bloom; a noon frame is carried by the
      // sun, and the same halo over it is what made every hour of the old
      // version look like the same hour.
      f.bloom.intensity = 0.70 - 0.50 * day
      f.bloom.luminanceMaterial.threshold = 0.42 + 0.34 * day
    }
    if (f.vignette) f.vignette.darkness = 0.62 - 0.16 * day
  })

  return (
    <EffectComposer ref={composer}>
      <Bloom intensity={0.86} luminanceThreshold={0.42} luminanceSmoothing={0.55} mipmapBlur />
      <Vignette eskil={false} offset={0.24} darkness={0.62} />
    </EffectComposer>
  )
}

/* ══ Scene ══════════════════════════════════════════════════════════ */

/**
 * One window onto the montage. `part` is 0, 1 or 2; everything downstream
 * reads MONTAGE time, so the three play back to back as one move.
 */
export function makeDoorwayScene(part: number) {
  const offset = part * PART
  const time = () => getAnimTime() + offset
  const m = MEASURES[part]
  const start = orbitPose(offset)

  return createScene({
    background: '#0B1020',
    three: {
      camera: { position: start.pos, fov: ORBIT_FOV, near: 1, far: 24000 },
      gl: {
        antialias: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.06,
      },
      onCreated: ({ camera }) => camera.lookAt(...start.tgt),
      debugTarget: start.tgt,
    },
  }, function Doorway() {
    return (
      <>
        {/* Act B's valley, its clock turning over. Its own two walkers, its
            power line and its farmhouse are off: this scene stages its own
            people, strings the wire when the century strings it, and mounts
            the house itself so the lamp can know what time it is. */}
        <ValleyStill
          at={worldClock(offset)}
          atFn={t => worldClock(t + offset)}
          people={false} poles={false} moon={false} house={false}
          farmland={m.farmland}
        />

        <DaySky time={time} haze={m.haze} />
        <DoorwayHouse time={time} />
        {m.wire > 0 && <PowerLine count={m.wire} />}
        {m.skyline !== 'none' && <Skyline density={m.skyline} time={time} />}

        <SkyBodies time={time} />
        <DoorwayProbe time={time} />
        <HouseDoorway time={time} />
        <Child i={part} time={time} />
        <Parent i={part} time={time} />

        <OrbitCamera time={time} />
        <Grade time={time} />
      </>
    )
  })
}
