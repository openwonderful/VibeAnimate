/**
 * Act 4.5 — THE DOORWAY (~1:19)
 *
 * A door frame, and the oldest way there is of recording that a child is
 * growing: they back up against the jamb, the parent scratches a line level
 * with the top of their head, and the line stays there forever.
 *
 * It happens three times. Each time the child is taller and the mark is
 * higher, and the earlier marks are still on the post — so by the third one
 * the frame itself is the record. No caption, no dissolve, no dates.
 *
 * ── This scene absorbs the old 4.1 ───────────────────────────────────
 * The industrialisation timelapse used to be its own beat: a locked-off shot
 * of a house while the century happened around it. Standalone it never had
 * enough screen time to read, and as a montage item it was competing with the
 * human beats for the same seconds. It works far better as the BACKGROUND of
 * this one — the world changing behind a family measuring their kid is the
 * whole of Act 4 in a single frame, and it costs no extra time at all.
 *
 * What changes behind them, and what deliberately does not:
 *   • the sky runs back and forth between day and night, three times
 *   • the city rises behind the range, in three steps — one per mark
 *   • the power line goes up
 *   • the house does NOT get neighbours, and the road does NOT get paved
 *
 * That last pair is the point. In the old 4.1 the valley filled in around the
 * home until it was a suburb, which said "this place got swallowed". Here the
 * house stays alone on its own ground and the century happens on the horizon,
 * which says the thing Act 4 is actually about: the world changed enormously,
 * and this doorway did not.
 *
 * ── Where ────────────────────────────────────────────────────────────
 * Act B's valley, at Act B's scale (an adult is `scale={20}`, 37.8 units
 * tall). The ground, range, fog, sun, house and city are all Act B's own
 * objects — the skyline that rises here is literally the city the film opens
 * by flying through, at its own coordinates.
 *
 * The sky is Act B's too. Rather than animating a second sun on top of the
 * valley's, `ValleyStill`'s `atFn` drives Act B's own world clock back and
 * forth between full day (t=58) and full night (t=84), so every flip is the
 * real grade — fog colour, key light, environment map and all.
 */

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import * as THREE from 'three'

import { createScene } from '../createScene'
import { getAnimTime } from '../../hooks/useAnimTime'
import { GoldFigure, v, type Proportions } from '../characters/goldFigure'
import { PARENT_HAT } from '../actB/valley'
import { ValleyStill } from '../actB/still'
import { Poles, HOUSE_S } from '../actB/valley'
import { Towers, CityLights } from '../actB/city'
import { VALLEY_Y, HOUSE_X, HOUSE_Z } from '../actB/flight'
import { clamp01, smooth, ramp, type V3 } from '../sets/hanok'
import { CARE_GOLD_ACT3 } from '../act5/shared'

/* ══ Timing ═════════════════════════════════════════════════════════ */

/** Total beat. Absorbs the seconds the standalone timelapse used to hold. */
const DUR = 6.5

const CYCLES = 3
const CYCLE_0 = 0.55
const CYCLE_GAP = 1.95

/** Start of measuring `i`. */
const cycleAt = (i: number) => CYCLE_0 + i * CYCLE_GAP
/** When mark `i` is cut into the post. */
const markAt = (i: number) => cycleAt(i) + 1.02
/** Which measuring scene-time `t` belongs to. */
const cycleIndex = (t: number) =>
  Math.min(CYCLES - 1, Math.max(0, Math.floor((t - CYCLE_0) / CYCLE_GAP)))

/**
 * Act B's world clock, run back and forth.
 *
 * 58 is the widest daylight in the act; 84 is full night with the house the
 * brightest thing left. A raised cosine between them gives three unhurried
 * day/night turns across the beat and lands back on day, so the frame is lit
 * when the last mark goes on.
 */
const DAY = 58
const NIGHT = 84
function worldClock(t: number): number {
  const u = clamp01(t / DUR)
  return DAY + (NIGHT - DAY) * (0.5 - 0.5 * Math.cos(u * Math.PI * 2 * CYCLES))
}

/* ══ Staging ════════════════════════════════════════════════════════ */

/**
 * The doorway is the farmhouse's OWN front door.
 *
 * The first pass built a free-standing frame out in the fields, because the
 * range — and the city that rises behind it — only exists toward +z, so the
 * camera has to look that way, and a house behind the subject masks exactly
 * the horizon the background is for. A door frame standing in a paddy is a
 * worse problem than the one it solved.
 *
 * The fix is the camera, not the set. Stand off the house's front corner
 * looking along the wall rather than square at it: the door and the two of
 * them sit in the right of frame with the wall raking away behind them, and
 * the whole left half is open valley running to the range. Everything below is
 * authored in the house's LOCAL units — the Hanok body is 2.4 x 1.2 x 1.8
 * with its front face at z = +0.9 — and lifted into the world by HOUSE_S, so
 * the frame is fixed to the wall by construction rather than by matching
 * numbers that would drift the moment the house was rescaled.
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

/** House units → world. */
const HS = HOUSE_S
/** Adult figure units → world. */
const S = 20

const CAMERA = {
  position: [HOUSE_X - 86, VALLEY_Y + 33, HOUSE_Z - 108] as V3,
  target: [HOUSE_X - 6, VALLEY_Y + 36, HOUSE_Z - 40] as V3,
  fov: 52,
}

/* ══ The frame ══════════════════════════════════════════════════════ */

/** How tall the child is at each measuring. Steps, not a ramp. */
const CHILD_SCALES = [0.46, 0.66, 0.86]
/** GoldFigure child crown height, in adult units, at scale 1. */
const CHILD_CROWN = 1.30
/** Height of mark `i` above the floor, in HOUSE units — driven off the same
 *  number the child is scaled by, so the marks and the kid cannot disagree. */
const markY = (i: number) => (CHILD_SCALES[i] * CHILD_CROWN * S) / HS

/** Where the child stands, in house units: inside the opening, one shoulder to
 *  the marked jamb, so their body never covers the column of marks. */
const CHILD_X = -DOOR_W / 2 + 0.20
const MARK_X = -DOOR_W / 2 - JAMB_W / 2

/* ══ The door, cut into the front wall ══════════════════════════════ */

function HouseDoorway() {
  const wood = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#4A362A', roughness: 0.94, metalness: 0,
  }), [])
  const dark = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#2A1E16', roughness: 0.96, metalness: 0,
  }), [])
  /** Pale scored wood, lifted a touch so the marks still read at night. */
  const scored = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#EFDCB2', roughness: 0.85, metalness: 0,
    emissive: new THREE.Color('#7A6440'), emissiveIntensity: 0.5,
  }), [])
  /** Warm interior seen through the opening. */
  const inside = useMemo(() => new THREE.MeshBasicMaterial({
    color: '#5A3616', toneMapped: false,
  }), [])

  const markRefs = useRef<(THREE.Group | null)[]>([])

  useFrame(() => {
    const t = getAnimTime()
    markRefs.current.forEach((g, i) => {
      if (!g) return
      // The scratch arrives fast — it is a knife, not a fade.
      const on = ramp(t, markAt(i), markAt(i) + 0.10)
      g.visible = on > 0.02
      g.scale.x = Math.max(0.001, on)
    })
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
          material={wood} castShadow receiveShadow
        >
          <boxGeometry args={[JAMB_W, DOOR_H + JAMB_W, 0.14]} />
        </mesh>
      ))}
      <mesh
        position={[0, FLOOR_Y + DOOR_H + JAMB_W / 2, WALL_Z + 0.03]}
        material={wood} castShadow
      >
        <boxGeometry args={[DOOR_W + JAMB_W * 2, JAMB_W, 0.14]} />
      </mesh>
      {/* Threshold board */}
      <mesh position={[0, FLOOR_Y + 0.02, WALL_Z + 0.05]} material={dark} castShadow>
        <boxGeometry args={[DOOR_W + JAMB_W * 2, 0.05, 0.2]} />
      </mesh>

      {/* The record, on the face of the near jamb. */}
      {CHILD_SCALES.map((_, i) => (
        <group
          key={i}
          ref={g => { markRefs.current[i] = g }}
          position={[MARK_X, FLOOR_Y + markY(i), WALL_Z + 0.105]}
        >
          <mesh material={scored}>
            <boxGeometry args={[JAMB_W * 0.82, 0.018, 0.012]} />
          </mesh>
          {/* A short tick beside it — a year, written the way anyone writes it */}
          <mesh material={scored} position={[-JAMB_W * 0.16, -0.05, 0]}>
            <boxGeometry args={[JAMB_W * 0.34, 0.013, 0.01]} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

/* ══ The two of them ════════════════════════════════════════════════ */

/**
 * A child standing at ease — feet a little apart rather than together.
 *
 * GoldFigure's built-in standing pose brings the ankles almost to touching,
 * which at this size renders the legs as one tapering column. A few degrees of
 * separation is all it takes to read as two legs, and it is what a kid waiting
 * to be measured actually does.
 */
function kidStanding({ P }: { P: Proportions }) {
  const R = P.R
  const legLen = P.HIP_Y - P.FOOT_Y
  const torso = P.SHOULDER_Y - P.HIP_Y
  const armLen = torso * 1.02

  const hip = v(0, P.HIP_Y, 0)
  const shoulder = v(0, P.SHOULDER_Y, 0)
  const head = v(0, P.HEAD_Y, 0)

  const spine = [hip, v(0, hip.y + torso * 0.36, 0), v(0, hip.y + torso * 0.72, 0), shoulder]

  const leg = (k: number) => {
    const knee = v(k * legLen * 0.13, hip.y - legLen * 0.50, legLen * 0.015)
    const foot = v(k * legLen * 0.19, P.FOOT_Y, 0)
    return [hip, hip.clone().lerp(knee, 0.5), knee, knee.clone().lerp(foot, 0.5), foot]
  }
  const arm = (k: number) => {
    const elbow = v(k * armLen * 0.30, shoulder.y - armLen * 0.48, 0.02 * armLen)
    const hand = v(k * armLen * 0.36, shoulder.y - armLen * 0.96, 0.05 * armLen)
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

/**
 * Per-measuring jump character. Three identical bounces read as a looping
 * sprite rather than as a kid — so each year gets its own count, rate and
 * height. The toddler manages one heave; the middle one is all spring; the
 * oldest gives it a single perfunctory hop, already bored of this.
 */
const HOPS = [
  { n: 1.0, rate: 2.4, h: 0.030, from: 0.20, to: 0.72 },
  { n: 2.5, rate: 3.6, h: 0.055, from: 0.12, to: 0.80 },
  { n: 1.5, rate: 2.0, h: 0.022, from: 0.24, to: 0.66 },
]

function Child() {
  const hopRef = useRef<THREE.Group>(null)
  const sizeRef = useRef<THREE.Group>(null)

  useFrame(() => {
    const t = getAnimTime()
    const i = cycleIndex(t)
    const local = t - cycleAt(i)

    // Growth is a step. Easing between the three would read as one child
    // slowly inflating rather than as three separate years.
    if (sizeRef.current) sizeRef.current.scale.setScalar(CHILD_SCALES[i])

    const j = HOPS[i]
    const hop = local > j.from && local < j.to
      ? Math.abs(Math.sin((local - j.from) * Math.PI * j.rate)) * j.h
      : 0
    if (hopRef.current) hopRef.current.position.y = FLOOR_Y + hop
  })

  return (
    <group position={HOUSE_ORIGIN} rotation={[0, Math.PI, 0]} scale={HS}>
      {/* In the opening, one shoulder to the marked jamb, facing out. */}
      <group ref={hopRef} position={[CHILD_X, FLOOR_Y, WALL_Z + 0.13]} rotation={[0, Math.PI, 0]}>
        <group ref={sizeRef} scale={CHILD_SCALES[0]}>
          <group scale={S / HS}>
            <GoldFigure kind="child" material="goldAmber" glow={1.5} castShadow skeleton={kidStanding} />
          </group>
        </group>
      </group>
    </group>
  )
}

/**
 * Where the parent stands relative to the mark, in house units, and the yaw
 * that squares them to it.
 *
 * The sign of dz matters and the first version had it backwards: the parent
 * stands OUT from the wall, so the jamb is BEHIND them in z, not in front.
 * Taking the yaw from `+PARENT_DZ` turned them away from the door and sent the
 * marking arm out over the fields.
 */
const PARENT_DX = 0.30
const PARENT_DZ = 0.22
/** Mark sits just proud of the jamb face. */
const MARK_Z = 0.105
const PARENT_YAW = Math.atan2(PARENT_DX, MARK_Z - PARENT_DZ)
/** Reach, expressed in the PARENT's own figure units. */
const PARENT_REACH = (Math.hypot(PARENT_DX, PARENT_DZ - MARK_Z) * HS) / S

/** The parent, who does the marking. */
function Parent() {
  const handRef = useRef<[number, number, number]>([0.24, 0.92, 0.30])
  const mat = useMemo(() => new THREE.MeshStandardMaterial({
    color: CARE_GOLD_ACT3, emissive: CARE_GOLD_ACT3,
    emissiveIntensity: 0.95, roughness: 0.6,
  }), [])

  useFrame(() => {
    const t = getAnimTime()
    const i = cycleIndex(t)
    const local = t - cycleAt(i)

    const reach = smooth(clamp01((local - 0.70) / 0.32))
    const draw = ramp(t, markAt(i) - 0.06, markAt(i) + 0.16)
    const rest: [number, number, number] = [0.24, 0.92, 0.30]
    // Target in the parent's own units: straight ahead, at the mark's height.
    const at: [number, number, number] = [
      -0.10 - draw * 0.16,
      (markY(i) * HS) / S + 0.10,
      PARENT_REACH,
    ]
    handRef.current = [
      rest[0] + (at[0] - rest[0]) * reach,
      rest[1] + (at[1] - rest[1]) * reach,
      rest[2] + (at[2] - rest[2]) * reach,
    ]
  })

  return (
    <group position={HOUSE_ORIGIN} rotation={[0, Math.PI, 0]} scale={HS}>
      {/* Placed and turned so local +z points straight at the mark, which is
          what lets the hand target above be a plain (0, crown, reach). */}
      <group
        position={[MARK_X - PARENT_DX, FLOOR_Y, WALL_Z + PARENT_DZ]}
        rotation={[0, PARENT_YAW, 0]}
        scale={S / HS}
      >
        {/* Reaching up to the jamb, so the brim goes back off the brow. */}
        <GoldFigure pose="standing" material={mat} rightHandAt={handRef} castShadow
          hat={PARENT_HAT} hatTilt={-0.35} />
      </group>
    </group>
  )
}

/* ══ Sun and moon, trading places ═══════════════════════════════════ */

/**
 * The two of them on one arc, 180 degrees apart, so every time the sky turns
 * over you can see WHY — one body going down as the other comes up, rather
 * than the colour simply changing. Tied to the same cycle count as the grade,
 * so a sunset always has the sun in it.
 */
const SKY_R = 2100
const SKY_CY = 120

function SkyBodies() {
  const sunRef = useRef<THREE.Group>(null)
  const moonRef = useRef<THREE.Group>(null)

  useFrame(() => {
    const t = getAnimTime()
    // One full turn per day/night cycle, starting with the sun overhead.
    const phase = Math.PI / 2 + clamp01(t / DUR) * CYCLES * Math.PI * 2
    const place = (g: THREE.Group | null, a: number) => {
      if (!g) return
      const y = SKY_CY + SKY_R * Math.sin(a)
      g.position.set(SKY_R * Math.cos(a) * 0.42, y, HOUSE_Z + SKY_R * 0.92)
      g.visible = y > -80
    }
    place(sunRef.current, phase)
    place(moonRef.current, phase + Math.PI)
  })

  return (
    <>
      <group ref={sunRef}>
        <mesh>
          <sphereGeometry args={[74, 20, 20]} />
          <meshBasicMaterial color="#FFD79A" toneMapped={false} fog={false} />
        </mesh>
        <mesh>
          <sphereGeometry args={[132, 20, 20]} />
          <meshBasicMaterial color="#FFB65E" transparent opacity={0.3} depthWrite={false} fog={false} />
        </mesh>
      </group>
      <group ref={moonRef}>
        <mesh>
          <sphereGeometry args={[52, 20, 20]} />
          <meshBasicMaterial color="#DCE4F4" toneMapped={false} fog={false} />
        </mesh>
        <mesh>
          <sphereGeometry args={[92, 20, 20]} />
          <meshBasicMaterial color="#A8BEE8" transparent opacity={0.18} depthWrite={false} fog={false} />
        </mesh>
      </group>
    </>
  )
}

/* ══ The century, on the horizon ════════════════════════════════════ */

/**
 * Act B's city, pushed up from under the range in three steps — one per mark.
 *
 * Same buildings the film opens by flying through, at their own coordinates
 * (z ≈ 2650–4300, on the far side of the pass), so what crests the ridge here
 * is the skyline Act B's corridor sequence is inside — not a set of lookalike
 * boxes standing in for it.
 */
function RisingCity() {
  const ref = useRef<THREE.Group>(null)
  useFrame(() => {
    const t = getAnimTime()
    const up = (ramp(t, markAt(0) - 0.55, markAt(0) + 0.55)
      + ramp(t, markAt(1) - 0.55, markAt(1) + 0.55)
      + ramp(t, markAt(2) - 0.55, markAt(2) + 0.65)) / 3
    if (ref.current) ref.current.position.y = -620 * (1 - up)
  })
  return (
    <group ref={ref} position={[0, -620, 0]}>
      <Towers />
      <CityLights />
    </group>
  )
}

/** The power line, arriving with the second measuring. */
function RisingPoles() {
  const ref = useRef<THREE.Group>(null)
  useFrame(() => {
    const t = getAnimTime()
    const up = ramp(t, markAt(0) + 0.35, markAt(1) + 0.25)
    if (ref.current) {
      ref.current.position.y = -70 * (1 - up)
      ref.current.visible = up > 0.01
    }
  })
  return (
    <group ref={ref} position={[0, -70, 0]}>
      <Poles />
    </group>
  )
}

/* ══ Scene ══════════════════════════════════════════════════════════ */

export default createScene({
  background: '#0B1020',
  three: {
    camera: { position: CAMERA.position, fov: CAMERA.fov, near: 1, far: 24000 },
    gl: {
      antialias: true,
      toneMapping: THREE.ACESFilmicToneMapping,
      toneMappingExposure: 1.06,
    },
    shadows: true,
    onCreated: ({ camera }) => camera.lookAt(...CAMERA.target),
    debugTarget: CAMERA.target,
  },
}, function Act4_5() {
  return (
    <>
      {/* Act B's valley, clock driven back and forth. Its own two walkers and
          its own power line are off: this scene stages its own people, and
          raises the line itself as part of the lapse. */}
      <ValleyStill at={DAY} atFn={worldClock} people={false} poles={false} moon={false} />

      <RisingCity />
      <RisingPoles />

      <SkyBodies />
      <HouseDoorway />
      <Child />
      <Parent />

      <EffectComposer>
        <Bloom intensity={0.6} luminanceThreshold={0.6} luminanceSmoothing={0.5} mipmapBlur />
        <Vignette eskil={false} offset={0.24} darkness={0.6} />
      </EffectComposer>
    </>
  )
})
