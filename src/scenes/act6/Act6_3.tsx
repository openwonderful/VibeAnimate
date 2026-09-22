/**
 * Act 6.3 — "BUSKING"
 *
 * The other end of the ramp, and the beat this act needed to make sense.
 *
 * It used to be an empty auditorium, and an empty auditorium raises a
 * question the film cannot answer: who booked a hall that size, and why did
 * nobody come? A rented room with no one in it is a story about a promoter.
 * Busking is a story about them. Nobody has to have decided not to turn up —
 * there was never an audience in the first place, only a pavement, and the
 * pavement is full, and not one person on it stops.
 *
 * So: a corner of the same city Act 5.2 walks through. The seven of them are
 * doing the entire show — full line-up, mic, amp, open case — to a stream of
 * commuters crossing the front of frame. That is the shot: you can see the
 * crowd, the crowd is three metres away, and the crowd is not an audience.
 *
 * ── What is borrowed, and why ─────────────────────────────────────────
 *  · The street is Act 5.2's shopfront grammar and Act B's glow-point
 *    grammar for the skyline behind it, so this is the same city he
 *    walked through one act ago.
 *  · The passers-by are `CrowdPeg` — the capsule-and-sphere body the film
 *    uses for everyone the story does not know. Same rule as 5.2: if the
 *    strangers were built like the Seven, the only thing separating them
 *    would be a hue.
 *  · The Seven wear Act B's stadium colours (`MEMBER_COLORS` below — B.3's
 *    palette, including its green Jimin), standing in the SAME left-to-right
 *    order they stand in on the stage in 2.2/B.3. They are already the group
 *    that plays that bowl at the top of the film; this is the same seven
 *    people and one pavement, years earlier, and putting them in a different
 *    order here would quietly make them a different band.
 *
 * The glow runs 6.2's ramp backwards — the same curve, both directions. Only
 * the lead carries it. The other six sit at a flat, ordinary level, because
 * the thing going out is his and not the band's.
 *
 * ── The level of the whole thing ──────────────────────────────────────
 * Nothing here is bright. Not the seven, not the street, not the sky. This
 * beat is the bottom of the film and it has to look like the bottom: the
 * emissives are low enough that the shopfronts are what light the band
 * rather than the other way round, the frontage is half-shuttered and lit in
 * dead fluorescent, and the exposure and bloom are pulled down under all of
 * it. The failure mode this scene fell into first was seven saturated toys
 * glowing in front of a warm, inviting street — which is a nice night out,
 * not a night nobody stopped.
 *
 * SCALE, as in 6.1 and 6.2: metres, GoldFigures at scale 1.
 */

import { useRef, useMemo, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import * as THREE from 'three'
import type { Group } from 'three'
import { createScene } from '../createScene'
import { useCameraHandoff } from '../DebugCamera'
import { GoldFigure } from '../characters/goldFigure'
import { CrowdPeg, PEG_PER_GOLD, pegHeight, type Archetype } from '../characters/CrowdPeg'
import { buildCloud, makeGlowMaterial, updateGlow } from '../actB/points'
import { GlowPoints } from '../actB/GlowPoints'
import { GREY_CROWD, GREY_CROWD_DARK } from '../act5/shared'
import { getAnimTime } from '../../hooks/useAnimTime'
import { seededRandom } from '../../utils/svgHelpers'
import GradientEnvironment from '../effects/GradientEnvironment'
import { GLOW_BLAZING } from './Act6_2'

const clamp01 = (t: number) => Math.max(0, Math.min(1, t))
const easeInOut = (t: number) => t * t * (3 - 2 * t)

/** Where he ends up: still lit, but barely — not extinguished, which would
 *  be a different and much cheaper story. */
const GLOW_FADED = 0.11
/** What he walks in with — the long tail of 6.2, nowhere near its peak
 *  (`GLOW_BLAZING` is 1.76). He has already been losing it for a long time
 *  by the time this scene opens, and the shot should read as a man who is
 *  dim arriving and dimmer leaving, not as a floodlight being switched off. */
const GLOW_ARRIVING = 0.58

/** Scene length. Every arc below is expressed against it, so retiming the
 *  slot in timeline.ts rescales the camera and the glow ramp together.
 *
 *  3.7, not the 1.5 this had in the cut it was dropped from. At a second and a
 *  half the roll-past was a whip and the fade was a dip; the beat is "nobody
 *  stops", and nobody stopping takes time to read. The pan and the glow ramp
 *  both stretch with this number, so there is nothing else to retune. */
const DUR = 3.7

export function emptyRoomGlow(t: number): number {
  const u = easeInOut(clamp01(t / DUR))
  const tremor = Math.sin(t * 6.1) * 0.04
  return GLOW_ARRIVING + (GLOW_FADED - GLOW_ARRIVING) * u + tremor * (1 - u) * 0.5
}

/* ─── The pitch ─────────────────────────────────────────────────
 * The street runs left-to-right across frame. They have their backs to the
 * shopfronts; the pavement traffic crosses between them and the lens.
 */
/** Where the seven stand. */
const PITCH_Z = -8.4
/** The two walking lanes, in front of them. */
const LANE_NEAR = -6.75
const LANE_FAR = -7.45
/** Far frontage — the wall they are backed against. */
const FRONT_Z = -10.0
/** Nominal pavement eye — roughly where the lens lives across the three
 *  angles below. The skyline's visible band is derived from these, so moving
 *  the camera and forgetting the city is not possible. It is a reference, not
 *  a pose: the shots sit within a couple of metres of it and the band is
 *  broad enough (a 0.205 → 0.60 slope spread, thirty-odd metres out) to
 *  survive that. */
const EYE_Y = 1.70
const CAM_Z = -2.05

/* ─── The Seven ─────────────────────────────────────────────────
 * Act B's stadium palette (src/scenes/act2/Act2_2_B.tsx `MEMBERS`, with B.3's
 * green override for Jimin — its authored yellow sat two places from
 * Jungkook's and read as the same colour twice).
 *
 * And in the stage's OWN order. 2.2 lays them out at x = -5.1 … +5.1 with the
 * camera at +z, so screen left to right that stage reads Jin, J-Hope, RM,
 * Jungkook, V, Jimin, Suga. That is the line reproduced below, squeezed from
 * a ten-metre deck onto five metres of pavement. Jungkook is at centre there,
 * so Jungkook is at the mic here — which is also the right answer for the
 * other reason: the figure carrying this act is the amber one from 6.1's
 * waiting room and 6.2's audition, and he is the yellow of this line-up.
 */
const MEMBER_COLORS = {
  Jin: '#FFA3C9',
  'J-Hope': '#FF6B4D',
  RM: '#5B7BFF',
  Jungkook: '#FFD24A',
  V: '#B876FF',
  Jimin: '#7BE838',
  Suga: '#6FEDC4',
} as const

type MemberName = keyof typeof MEMBER_COLORS

/** Whoever is at the mic — the one the glow ramp belongs to. */
const LEAD: MemberName = 'Jungkook'

/** The lead's own amber, carried unchanged from 6.1 and 6.2 rather than taken
 *  from the stadium palette. Those two scenes light him at #FFB938 and this
 *  is the third act of one continuous fade; a different yellow here would be
 *  a different person. It sits a hair off Jungkook's #FFD24A, which is the
 *  point — on stage he is a member, here he is the one. */
const HERO_GOLD = '#FFB938'

/** Screen left → right, as on the stage. `back` bows the line into a shallow
 *  V toward camera. */
const LINE: { name: MemberName; x: number; back: number; phase: number }[] = [
  { name: 'Jin', x: -2.55, back: 0.36, phase: 0.11 },
  { name: 'J-Hope', x: -1.70, back: 0.19, phase: 0.63 },
  { name: 'RM', x: -0.85, back: 0.06, phase: 0.37 },
  { name: 'Jungkook', x: 0, back: 0, phase: 0 },
  { name: 'V', x: 0.85, back: 0.06, phase: 0.81 },
  { name: 'Jimin', x: 1.70, back: 0.19, phase: 0.24 },
  { name: 'Suga', x: 2.55, back: 0.36, phase: 0.52 },
]

/** The six who are not carrying the ramp. Low, and TONE-MAPPED, unlike the
 *  lead: at this level they stop being their own light sources and start
 *  being six people standing in what the shopfronts throw at them, which is
 *  the whole difference between a band busking and a row of neon. */
const GLOW_BAND = 0.26

function memberMaterial(color: string, emissiveIntensity: number, toneMapped = true) {
  return new THREE.MeshStandardMaterial({
    color, emissive: color, emissiveIntensity, roughness: 0.55, toneMapped,
  })
}

/** The lead, at the mic, dimming — and GUTTERING. The smooth ramp alone
 *  read as a lighting choice; what says "going out" is the same dropout
 *  grammar the caregiver flickers out on at the end of 5.1: brief dips that
 *  arrive in the back half and deepen toward the cut. Same film, same way
 *  of leaving. He does not reach zero — GLOW_FADED still stands. */
function gutter(t: number): number {
  const u = clamp01(t / DUR)
  if (u < 0.35) return 1
  // Bite rate up 40% from the first cut (41/17): the world is strobing
  // faster around him now — part of the whirlwind pass, along with the pan,
  // the rain and the crowd. The depth envelope is untouched.
  const bite = Math.sin(t * 57.4) * Math.sin(t * 23.8 + 2.3)
  const depth = (u - 0.35) / 0.65
  // A dip, not a blackout: at worst the glow sags to ~35% for a few frames.
  return bite > 0.86 - depth * 0.5 ? 1 - depth * 0.65 : 1
}

function Lead() {
  const groupRef = useRef<Group>(null)
  const slumpRef = useRef<Group>(null)
  const material = useMemo(() => memberMaterial(HERO_GOLD, GLOW_ARRIVING, false), [])
  // The hand slides DOWN the stand as the performance goes out of him —
  // same x/z (the stand is where it is), losing height. A ref, so the
  // skeleton re-solves per frame without re-rendering.
  const micHand = useRef<[number, number, number]>([0.06, 1.49, 0.26])

  useFrame(() => {
    const t = getAnimTime()
    material.emissiveIntensity = emptyRoomGlow(t) * gutter(t)
    const u = clamp01(t / DUR)
    // The collapse: shoulders coming forward and down. Whole-body pitch
    // about the feet, eased in over the second half — with the head tilt
    // it reads as a man folding toward the stand, not a plank tipping.
    const slump = easeInOut(clamp01((u - 0.42) / 0.58))
    if (groupRef.current) {
      // The performance gets smaller too — less weight shift, head lower.
      groupRef.current.position.y = Math.sin(t * 1.4) * 0.012 * (1 - u * 0.7)
      groupRef.current.rotation.y = Math.sin(t * 0.6) * 0.04 * (1 - u * 0.8)
    }
    if (slumpRef.current) slumpRef.current.rotation.x = slump * 0.115
    micHand.current = [0.06, 1.49 - slump * 0.30, 0.26 - slump * 0.03]
  })

  return (
    <group ref={groupRef} position={[0, 0, PITCH_Z]}>
      <group ref={slumpRef}>
        <GoldFigure
          pose="standing"
          animate
          castShadow
          material={material}
          rightHandAt={micHand}
          headForwardTilt={0.03}
        />
      </group>
    </group>
  )
}

/** The other six — and one by one, they stop working. The show dies from
 *  the wings in: the ends of the line go still first, the centre pair last,
 *  each one a discrete event (moving, then not) rather than a fade. Pure
 *  function of t, so it scrubs backwards correctly. */
const STOP_AT: Record<MemberName, number> = {
  Jin: 1.45, Suga: 1.85, 'J-Hope': 2.25, Jimin: 2.6, RM: 2.95, V: 3.3,
  [LEAD]: Infinity, // the lead never stops singing — that is his tragedy
}

function Band() {
  const materials = useMemo(
    () => Object.fromEntries(
      (Object.keys(MEMBER_COLORS) as MemberName[])
        .map((n) => [n, memberMaterial(MEMBER_COLORS[n], GLOW_BAND)]),
    ) as Record<MemberName, THREE.MeshStandardMaterial>,
    [],
  )

  const [stopKey, setStopKey] = useState(0)
  useFrame(() => {
    const t = getAnimTime()
    // Bitmask of who has stopped — six booleans in one integer, so the
    // React state only changes on the frames somebody actually stops.
    let key = 0
    LINE.forEach((m, i) => { if (t >= STOP_AT[m.name]) key |= 1 << i })
    if (key !== stopKey) setStopKey(key)
  })

  return (
    <group>
      {LINE.filter((m) => m.name !== LEAD).map((m) => {
        const still = (stopKey & (1 << LINE.indexOf(m))) !== 0
        return (
          <group
            key={m.name}
            position={[m.x, 0, PITCH_Z - m.back]}
            // Turned a few degrees inward, the way a line-up faces its centre.
            rotation={[0, -m.x * 0.06, 0]}
          >
            <GoldFigure
              pose={still ? 'standing' : 'walking'}
              inPlace
              animate
              phaseOffset={m.phase}
              castShadow
              material={materials[m.name]}
              // Stopped members look at the pavement.
              headForwardTilt={still ? 0.10 : 0}
            />
          </group>
        )
      })}
    </group>
  )
}

/* ─── The kit ───────────────────────────────────────────────────
 * A mic on a stand, a battery amp, and an open case with almost nothing in
 * it. Three props, and they are the difference between busking and a gig.
 */
function MicStand({ position }: { position: [number, number, number] }) {
  const BOOM_TILT = -0.55
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

function BuskKit() {
  return (
    <group>
      {/* Battery amp, tilted back on its wedge the way street amps are */}
      <group position={[-3.3, 0, PITCH_Z + 0.15]} rotation={[0, 0.5, 0]}>
        <mesh position={[0, 0.20, 0]} rotation={[-0.16, 0, 0]} castShadow>
          <boxGeometry args={[0.42, 0.38, 0.30]} />
          <meshStandardMaterial color="#171A22" roughness={0.85} />
        </mesh>
        <mesh position={[0, 0.22, 0.16]} rotation={[-0.16, 0, 0]}>
          <planeGeometry args={[0.32, 0.26]} />
          <meshStandardMaterial color="#2C313E" roughness={0.95} />
        </mesh>
        {/* Power lamp — the only thing in frame that says this is switched on */}
        <mesh position={[0.16, 0.36, 0.15]}>
          <sphereGeometry args={[0.015, 8, 8]} />
          <meshStandardMaterial color="#FF6A4A" emissive="#FF4A28" emissiveIntensity={3} toneMapped={false} />
        </mesh>
      </group>

      {/* The open case. Nothing in it. It had three coins in it once and
          three coins is a worse number than none: three coins says a few
          people stopped and gave what they had, which is a small kindness
          and a completely different scene. An empty lining says the exact
          thing the shot is about, and it says it without a prop.

          It sits at +2.15, in FRONT of both walking lanes, which is both
          where you would actually put it — on the side people pass, so they
          can drop into it without breaking step — and the only place it is
          ever visible. At +1.25 it was between the lanes and there was a
          stranger standing on it in most frames of every angle. */}
      <group position={[0.15, 0, PITCH_Z + 2.15]} rotation={[0, -0.22, 0]}>
        <mesh position={[0, 0.035, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.98, 0.07, 0.36]} />
          <meshStandardMaterial color="#14161D" roughness={0.9} />
        </mesh>
        {/* Lid, propped open toward the pavement */}
        <mesh position={[0, 0.20, -0.20]} rotation={[-0.44, 0, 0]}>
          <boxGeometry args={[0.98, 0.40, 0.05]} />
          <meshStandardMaterial color="#181B23" roughness={0.92} />
        </mesh>
        {/* Bare lining, and nothing on it. A shade lighter than the case it
            sits in, because an empty case only reads as empty if you can
            see the bottom of it. */}
        <mesh position={[0, 0.076, 0.02]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.88, 0.28]} />
          <meshStandardMaterial color="#4E392C" roughness={0.98} />
        </mesh>
      </group>
    </group>
  )
}

/* ─── The city behind them ──────────────────────────────────────
 * Not `TowerField`. Act B's facade shader is a window GRID, its windows are
 * 4.75 m across, and it only flattens past `smoothstep(500, 1500, vDist)` —
 * 125 m at street scale. Seen square-on from a pavement, every tower in it
 * lands in the half-resolved band and renders as television snow. Angling
 * the street, pushing the blocks back and drowning them in fog each moved
 * the snow somewhere else without removing it.
 *
 * So the skyline is built the OTHER way Act B draws a city: silhouette slabs
 * that fog out to almost nothing, and one seeded additively-blended point
 * cloud for every lit window in the frame. A point sprite has no grid to
 * alias, it dims with distance because we author its alpha that way, and the
 * whole thing is one draw call — which is exactly what `points.ts` exists
 * for. Dim, and dreamy, and stable.
 */
type Slab = { x: number; y: number; z: number; w: number; d: number; h: number }

/** Drained on purpose. The warm cluster this started with twinkled like a
 *  star field over the roofline and read as beautiful; a city that looks
 *  beautiful over his head is arguing against the scene. Cold, grey-amber,
 *  and dim enough to be a fact rather than a view. */
const SKY_WINDOWS = ['#B8B6AC', '#A9A79C', '#C4C0B2', '#9FAAB8', '#B0A48C', '#8E93A2']

function layoutSkyline(): Slab[] {
  const rand = seededRandom(6363)
  const out: Slab[] = []
  for (let i = 0; i < 26; i++) {
    const z = -24 - rand() * 84
    // Everything has to clear a four-metre parapet from thirty-odd metres
    // out or it is not in the shot at all, so nothing here is short.
    const away = Math.min(1, (-z - 24) / 84)
    out.push({
      x: (rand() - 0.5) * 190,
      y: 0,
      z,
      w: 11 + rand() * 22,
      d: 11 + rand() * 22,
      h: 22 + rand() * 26 + away * (24 + rand() * 66),
    })
  }
  return out
}

function Skyline() {
  const slabs = useMemo(() => layoutSkyline(), [])
  // Twinkle almost off — a lit office does not twinkle, and the twinkle was
  // the single biggest thing making this row of windows read as stars.
  const glowMat = useMemo(
    () => makeGlowMaterial({ falloff: 2.6, maxPixels: 16, twinkle: 0.05 }),
    [],
  )

  /**
   * Windows, on the camera-facing flank of each slab — and placed into the
   * slice of sky this lens can actually SEE.
   *
   * At eye level behind a 3.3 m parapet with a 46° lens, the sightline over
   * the parapet climbs at about 0.19 per metre of distance and the top of
   * frame at about 0.38. Scattering windows over the full height of a 70 m
   * tower therefore threw most of the cloud off-screen, so the band is
   * derived per slab from those sightlines and every point is spent in it.
   *
   * And they are placed CONTINUOUSLY, not snapped to a storey grid. Snapping
   * looked better on paper and rendered as ten dots: `seededRandom` is
   * Park-Miller, whose consecutive outputs are famously correlated in low
   * dimensions, so `floor(rand()*rows)` and `floor(rand()*cols)` drawn back
   * to back collapse 2,600 samples onto about a dozen lattice sites. Act B's
   * own clouds never hit this because they place continuously and in the
   * tens of thousands. At this distance a soft field of lights is what a lit
   * facade looks like anyway.
   */
  const windows = useMemo(() => buildCloud(900, 6367, SKY_WINDOWS, (rand) => {
    const b = slabs[Math.floor(rand() * slabs.length)]
    const dist = -b.z + CAM_Z
    const yLo = EYE_Y + dist * 0.205
    const yTop = Math.min(EYE_Y + dist * 0.60, b.h - 1.5)
    if (yTop <= yLo) return null
    /**
     * The rain fade, and it has to be authored HERE rather than left to the
     * fog, because `makeGlowMaterial` is a raw ShaderMaterial with no fog
     * support at all — scene fog does not touch a single one of these points.
     * With visibility down to 34 m, leaving them alone would put a crisp,
     * twinkling skyline behind a downpour that has already eaten the far end
     * of the street forty metres closer to the lens.
     *
     * So the falloff is matched to the fog by hand and it is brutal: full at
     * 18 m, nothing past 40. Roughly four of the twenty-six slabs survive it
     * and the rest are rejected outright (buildCloud retries), which is the
     * point — what is left is two or three blocks half-guessed through the
     * rain rather than a view.
     */
    const dim = 1 - (dist - 18) / 22
    if (dim <= 0) return null
    const y = yLo + rand() * (yTop - yLo)
    const x = b.x + (rand() - 0.5) * b.w * 0.94
    return [x, y, b.z + b.d / 2 + 0.4, 0.62 + rand() * 0.62, (0.13 + rand() * 0.15) * dim]
  }), [slabs])

  // uScale converts a sprite's authored size into pixels for the current
  // lens, so it has to be re-derived whenever the fov moves — and this
  // scene's does not, but the render pipeline changes viewport height.
  useFrame(({ camera, size }) => {
    updateGlow(glowMat, camera, size.height, getAnimTime())
  })

  // No slab MESHES. They fogged out to within a shade of the sky, so they
  // were invisible — and being opaque they occluded the bottom of the light
  // field, which is the only part of it this lens can see. The slabs exist
  // purely as the layout the windows are hung on.
  return <GlowPoints cloud={windows} material={glowMat} frustumCulled={false} />
}

/**
 * Shopfronts on the far frontage — the wall they busk against, and most of
 * what lights them. Act B's facade shader fades its bottom 28%, correct from
 * the air and exactly backwards from the pavement, where that band is the
 * whole frame. So the ground floor gets built here, in metres.
 */
/**
 * Interiors, in the colour a shop is lit at when nobody has replaced a tube
 * in years: cold fluorescent green-white, one drained sodium in the mix. The
 * warm creams that used to be here made the row look inviting — a street you
 * would want to walk down, which is not the street this is.
 */
const FRONT_COLORS = ['#C9D8CE', '#B8C9C4', '#D2D8CC', '#A9BCBE', '#C0B49C', '#B6C6C2']
/** Signage. Still coloured — a dead street is not monochrome, it is cheap —
 *  but the saturation is pulled most of the way out of all of it. */
const SIGN_COLORS = ['#B85D77', '#5E93A0', '#6E9A7C', '#B08947', '#7E7099', '#A8504A']
/** Shutters, and the dark above them. */
const SHUTTER = '#14161C'

type Panel = { pos: [number, number, number]; w: number; h: number; color: string; glow: number }

function Shopfronts() {
  const { panels, bars, flicker } = useMemo(() => {
    const rand = seededRandom(6365)
    const out: Panel[] = []
    const bars: Panel[] = []
    const flicker: Panel[] = []
    let x = -17
    while (x < 17) {
      const w = 1.7 + rand() * 1.9
      const h = 1.55 + rand() * 0.45
      const cx = x + w / 2
      // Rolled down, dark, no sign lit. A row where every single shop is
      // open at this hour is a high street doing well, and this one is not.
      // Raised from 0.34 — more of the row dark is the cheapest gloom in the
      // scene, because an unlit shopfront removes a light source as well as
      // adding a closed shop.
      const shut = rand() < 0.46
      out.push({
        pos: [cx, 0.18 + h / 2, FRONT_Z + 0.06], w: w - 0.22, h,
        color: shut ? SHUTTER : FRONT_COLORS[Math.floor(rand() * FRONT_COLORS.length)],
        glow: shut ? 1 : 0.075 + rand() * 0.085,
      })
      // The banner over the door, and a board or two climbing above it. This
      // is the part that actually reads as a Korean street.
      const banner: Panel = {
        pos: [cx, 0.24 + h + 0.24, FRONT_Z + 0.12], w: w - 0.42, h: 0.32 + rand() * 0.16,
        color: shut ? '#1B1E26' : SIGN_COLORS[Math.floor(rand() * SIGN_COLORS.length)],
        glow: shut ? 1 : 0.26 + rand() * 0.18,
      }
      // A tube on the way out. A failing sign is the cheapest honest signal
      // a street gives you that nobody is maintaining it. p sat at 0.09 for a
      // long time (exactly one tube on this seed; "two reads as a style"),
      // and the whirlwind pass raised it 40% to 0.13 — two tubes — on
      // purpose: at this pan speed the second one reads as more of the world
      // strobing past, not as decor. Nothing else shifts if this number
      // moves, because the draw is consumed either way.
      if (!shut && rand() < 0.13) flicker.push(banner)
      else out.push(banner)
      // Mullions across each front, plus the transom above the door.
      const bays = 2 + Math.floor(rand() * 2)
      for (let k = 1; k < bays; k++) {
        bars.push({
          pos: [cx - (w - 0.22) / 2 + (k / bays) * (w - 0.22), 0.18 + h / 2, FRONT_Z + 0.07],
          w: 0.055, h, color: '#0C0E14', glow: 1,
        })
      }
      bars.push({
        pos: [cx, 0.18 + h * 0.68, FRONT_Z + 0.07], w: w - 0.22, h: 0.05,
        color: '#0C0E14', glow: 1,
      })
      if (!shut && rand() > 0.45) {
        out.push({
          pos: [cx + (rand() - 0.5) * w * 0.6, h + 0.92, FRONT_Z + 0.18],
          w: 0.20 + rand() * 0.12, h: 0.42 + rand() * 0.4,
          color: SIGN_COLORS[Math.floor(rand() * SIGN_COLORS.length)],
          glow: 0.22 + rand() * 0.22,
        })
      }
      x += w + 0.22 + rand() * 0.9
    }
    return { panels: out, bars, flicker }
  }, [])

  const flickerRefs = useRef<(THREE.Material | null)[]>([])

  useFrame(() => {
    const t = getAnimTime()
    // Not a sine. A tube that is going stutters — mostly on, dropping out in
    // short irregular bites — so this is a couple of fast beats gated hard.
    // Rates up 40% (23.7/37.1 → 33.2/51.9) with the rest of the whirlwind.
    const beat = Math.sin(t * 33.2) + Math.sin(t * 51.9) * 0.7
    const on = beat > -0.55 ? 1 : 0.12
    for (const m of flickerRefs.current) {
      if (m) (m as THREE.MeshBasicMaterial).opacity = on * 0.34
    }
  })

  return (
    <group>
      {panels.map((p, i) => (
        <mesh key={i} position={p.pos}>
          <planeGeometry args={[p.w, p.h]} />
          <meshBasicMaterial color={p.color} toneMapped={false} opacity={p.glow} transparent />
        </mesh>
      ))}
      {flicker.map((p, i) => (
        <mesh key={`f${i}`} position={p.pos}>
          <planeGeometry args={[p.w, p.h]} />
          <meshBasicMaterial
            ref={(m) => { flickerRefs.current[i] = m }}
            color={p.color} toneMapped={false} opacity={0.34} transparent
          />
        </mesh>
      ))}
      {/* Frame and glazing bars. Without them each front is a glowing
          rectangle floating on a black wall — a billboard, not a window. */}
      {bars.map((b, i) => (
        <mesh key={`b${i}`} position={b.pos}>
          <planeGeometry args={[b.w, b.h]} />
          <meshBasicMaterial color="#0C0E14" toneMapped={false} />
        </mesh>
      ))}
      {/* The spill onto the pavement — and it is the only thing lighting the
          band now, so it stays. Colder and weaker than it was: this is what
          fluorescent through glass does at three metres, not a warm doorway.
          Four is the whole budget — every one of these is a per-mesh cost
          across every peg in the crowd. */}
      {/* Not evenly spaced: one of the four is parked just off centre so
          there is a pool of light on the pitch itself. Without it the open
          case sat in the one unlit metre of the whole street and the beat
          the scene is built on — the case is empty — was not legible. */}
      {[-8, -3.4, 1.1, 7].map((x) => (
        <pointLight
          key={x} position={[x, 2.7, FRONT_Z + 1.2]}
          color="#93A49D" intensity={12} distance={12} decay={2}
        />
      ))}
    </group>
  )
}

/* ─── The ground they are all standing on ───────────────────────
 * This was one dark plane with a thin bar on it, and it read as nothing —
 * the crowd was walking across an undefined black surface with no edge, no
 * scale and no texture, which is what made the pavement the weakest thing in
 * frame however good the rain got. Four things fix it, and they are all
 * cheap:
 *
 *  · A KERB you can see. The old one was a 14 cm bar at z = PITCH_Z+3.5,
 *    which the camera was past for most of the shot. It now sits inside the
 *    frame with a lighter top face and a gutter behind it, so there is a
 *    visible line where pavement stops and road starts. Without that line
 *    the ground has no edge, and ground with no edge has no size.
 *  · PAVING JOINTS. Twenty thin strips across and three along, over the
 *    stretch the lens can actually see. This is the only thing in the shot
 *    that gives the ground a scale, and a walker crossing three slabs a
 *    second is what makes the walk read as a walk rather than a slide.
 *  · PUDDLES. Near-mirror ellipses a few millimetres proud of the slab.
 *    They cost almost nothing and they do more for "it has been raining for
 *    an hour" than the rain does, because they hold still while everything
 *    else moves.
 *  · The wet grade itself: quarter roughness and metalness 0.4, so the
 *    shopfronts and the lead's amber smear down the surface. Metalness stops
 *    at 0.4 deliberately — a metal has no diffuse, and past about 0.5 the
 *    road took no fill at all and went pure black between the reflections.
 */
const JOINT_MAT = new THREE.MeshStandardMaterial({ color: '#0A0C11', roughness: 0.7, metalness: 0.2 })
/** Standing water: almost a mirror, and almost black on its own. Everything
 *  you see in a puddle at night is something else's reflection. */
const PUDDLE_MAT = new THREE.MeshStandardMaterial({ color: '#080A0E', roughness: 0.05, metalness: 0.72 })

/** Front and back edges of the paved strip, and the kerb line in front of it. */
const PAVE_BACK = PITCH_Z - 1.4
const PAVE_FRONT = PITCH_Z + 3.15
const KERB_Z = PAVE_FRONT

function Pavement() {
  const { joints, puddles } = useMemo(() => {
    const rand = seededRandom(6379)
    // Only over the span the lens sees — 110 m of paving joints would be
    // 180 meshes, and every mesh in this scene is paid for by six lights.
    // The camera drifts from -2.6 to +0.4, so this covers that plus the
    // frame either side of it with room to spare.
    const joints: { pos: [number, number, number]; w: number; d: number }[] = []
    for (let x = -11; x <= 11.001; x += 1.15) {
      joints.push({ pos: [x, 0.031, (PAVE_BACK + PAVE_FRONT) / 2], w: 0.035, d: PAVE_FRONT - PAVE_BACK })
    }
    for (let i = 1; i <= 3; i++) {
      const z = PAVE_BACK + (i / 4) * (PAVE_FRONT - PAVE_BACK)
      joints.push({ pos: [0, 0.031, z], w: 24, d: 0.035 })
    }
    const puddles: { pos: [number, number, number]; rx: number; rz: number; rot: number }[] = []
    for (let i = 0; i < 9; i++) {
      puddles.push({
        pos: [-9 + rand() * 18, 0.034, PAVE_BACK + 0.4 + rand() * (PAVE_FRONT - PAVE_BACK - 0.8)],
        rx: 0.34 + rand() * 0.78,
        rz: 0.20 + rand() * 0.34,
        rot: rand() * Math.PI,
      })
    }
    return { joints, puddles }
  }, [])

  return (
    <group>
      {/* Road, out to the horizon */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[160, 140]} />
        <meshStandardMaterial color="#0D1015" roughness={0.24} metalness={0.40} />
      </mesh>
      {/* The paved strip */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.028, (PAVE_BACK + PAVE_FRONT) / 2]}
        receiveShadow
      >
        <planeGeometry args={[110, PAVE_FRONT - PAVE_BACK]} />
        <meshStandardMaterial color="#1A1D24" roughness={0.34} metalness={0.34} />
      </mesh>
      {joints.map((j, i) => (
        <mesh key={`j${i}`} rotation={[-Math.PI / 2, 0, 0]} position={j.pos}>
          <planeGeometry args={[j.w, j.d]} />
          <primitive object={JOINT_MAT} attach="material" />
        </mesh>
      ))}
      {puddles.map((p, i) => (
        <mesh
          key={`p${i}`}
          rotation={[-Math.PI / 2, 0, p.rot]}
          position={p.pos}
          scale={[p.rx, p.rz, 1]}
        >
          <circleGeometry args={[1, 20]} />
          <primitive object={PUDDLE_MAT} attach="material" />
        </mesh>
      ))}
      {/* Kerb: face, then a lighter top so the edge catches light and reads
          as an edge rather than as a change of shade. */}
      <mesh position={[0, 0.062, KERB_Z]} receiveShadow>
        <boxGeometry args={[110, 0.125, 0.34]} />
        <meshStandardMaterial color="#191C23" roughness={0.55} metalness={0.28} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.126, KERB_Z]}>
        <planeGeometry args={[110, 0.34]} />
        <meshStandardMaterial color="#2C313B" roughness={0.4} metalness={0.3} />
      </mesh>
      {/* Gutter — the wettest strip on the street, right at the kerb foot. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.006, KERB_Z + 0.32]}>
        <planeGeometry args={[110, 0.42]} />
        <meshStandardMaterial color="#0A0C10" roughness={0.07} metalness={0.68} />
      </mesh>
    </group>
  )
}

/* ─── Rain ──────────────────────────────────────────────────────
 * One `LineSegments` draw call for the whole downpour: two vertices per drop,
 * fallen and wrapped entirely on the GPU off a single `uTime`. Nothing here
 * accumulates, so it scrubs and freezes with `?t=` and renders identically in
 * Remotion, which a delta-integrated particle system would not.
 *
 * The trap in this shape is that a falling line segment has to stay RIGID. If
 * you wrap each vertex independently — `mod(position.y - drop, span)` — the
 * head of a streak wraps a frame before its tail and the drop stretches into
 * a full-height stripe across the frame for that frame. So both vertices are
 * authored at the SAME point (the streak's head) and carry the offset to
 * their own end in an attribute: the wrap is computed once, from a value both
 * vertices share, and the segment can only ever translate.
 *
 * `aFall` packs that offset AND the streak length into one float — 0 for the
 * head vertex, the length for the tail — which is also what slants the streak
 * into the wind, since x is offset by the same number.
 */
const RAIN_COUNT = 5400
/** Vertical wrap height. Drops vanish into the road at 0 and reappear here. */
const RAIN_SPAN = 12
/** How far the tail lags the head horizontally, per unit of length — and it
 *  RAMPS now: the storm leans harder across the beat, 0.30 at the cut in to
 *  0.55 at the cut out. Wind without camera motion is most of what makes the
 *  whirlwind read while the seven hold still. Driven per-frame in
 *  `updateRain`, so it scrubs. */
const RAIN_WIND = 0.30
const RAIN_WIND_END = 0.55

function makeRainGeometry(): THREE.BufferGeometry {
  const rand = seededRandom(6371)
  const pos = new Float32Array(RAIN_COUNT * 2 * 3)
  const fall = new Float32Array(RAIN_COUNT * 2)
  const seed = new Float32Array(RAIN_COUNT * 2)
  for (let i = 0; i < RAIN_COUNT; i++) {
    const x = (rand() - 0.5) * 34
    const z = -14.5 + rand() * 17
    const y = rand() * RAIN_SPAN
    const len = 0.30 + rand() * 0.58
    const s = rand()
    const k = i * 6
    // Both vertices at the head. The tail gets there via aFall.
    pos[k] = x; pos[k + 1] = y; pos[k + 2] = z
    pos[k + 3] = x; pos[k + 4] = y; pos[k + 5] = z
    fall[i * 2] = 0
    fall[i * 2 + 1] = len
    seed[i * 2] = s
    seed[i * 2 + 1] = s
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  g.setAttribute('aFall', new THREE.BufferAttribute(fall, 1))
  g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1))
  // Authored by hand: the vertex shader moves everything, so a computed box
  // would be wrong the moment uTime advances.
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, RAIN_SPAN / 2, -6), 32)
  return g
}

function makeRainMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uSpan: { value: RAIN_SPAN },
      uWind: { value: RAIN_WIND },
      uColor: { value: new THREE.Color('#9FB0C4') },
      uAlpha: { value: 0.34 },
    },
    vertexShader: /* glsl */ `
      attribute float aFall;
      attribute float aSeed;
      uniform float uTime;
      uniform float uSpan;
      uniform float uWind;
      varying float vAlpha;
      void main() {
        // Speed varies per drop so the field never reads as one sheet.
        // +20% over the first cut (15..24 → 18..28.8): harder rain for the
        // whirlwind pass.
        float sp = 18.0 + aSeed * 10.8;
        // Computed from values BOTH vertices share, so the streak is rigid.
        float head = mod(position.y - uTime * sp - aSeed * 91.7, uSpan);
        vec3 p = vec3(position.x + uWind * aFall, head - aFall, position.z);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        // Near drops read, far drops are murk. This is also the scene's only
        // depth cue in the rain, since the fog does not touch this material.
        vAlpha = smoothstep(26.0, 2.0, -mv.z);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uAlpha;
      varying float vAlpha;
      void main() {
        gl_FragColor = vec4(uColor * (vAlpha * uAlpha), 1.0);
      }
    `,
    transparent: true,
    // Additive over a near-black street: a rain streak is a highlight, not a
    // shape, and additive means no sorting against 3,400 segments.
    blending: THREE.AdditiveBlending,
    // Depth TEST on, WRITE off: the drops are correctly occluded by the road,
    // which is what makes them look like they land rather than pass through.
    depthWrite: false,
    depthTest: true,
  })
}

/** Advance the downpour. A free function for the same reason `points.ts`
 *  exports `updateGlow` rather than poking uniforms at the call site: the
 *  whole animation is one uniform (two, now the wind leans in), and the hook
 *  lint rightly objects to a component reaching into a memoised object to
 *  mutate it. Pure function of t — scrubs and renders deterministically. */
function updateRain(mat: THREE.ShaderMaterial, t: number) {
  mat.uniforms.uTime.value = t
  mat.uniforms.uWind.value = RAIN_WIND + (RAIN_WIND_END - RAIN_WIND) * clamp01(t / DUR)
}

function Rain() {
  const geo = useMemo(() => makeRainGeometry(), [])
  const mat = useMemo(() => makeRainMaterial(), [])
  useFrame(() => updateRain(mat, getAnimTime()))
  return <lineSegments geometry={geo} material={mat} frustumCulled={false} />
}

/* ─── The people who do not stop ────────────────────────────────
 * Same grammar as 5.2: capsule-and-sphere, one shared material per shade,
 * and the walk lives entirely in a vertical bob and a matching lean, because
 * a peg has no legs.
 */
const CROWD_MAT = new THREE.MeshStandardMaterial({
  color: GREY_CROWD, emissive: GREY_CROWD, emissiveIntensity: 0.05, roughness: 0.9,
})
const CROWD_DARK_MAT = new THREE.MeshStandardMaterial({
  color: GREY_CROWD_DARK, emissive: GREY_CROWD_DARK, emissiveIntensity: 0.05, roughness: 0.9,
})

const STREET_TYPES: Archetype[] = ['tall', 'tall', 'short', 'thin', 'wide', 'hunched', 'tall', 'short']

/* Umbrellas. Two shared materials across the whole crowd — a fresh one per
 * walker would cost a shader compile and a draw-call group each, and there
 * are six lights in this scene paying per mesh.
 *
 * These are the point of putting rain in the shot. Everyone crossing the
 * frame is carrying one and the seven standing still are not, so the weather
 * stops being atmosphere and becomes the difference between the people who
 * are going somewhere and the people who are stuck here. It also means every
 * face in that stream is under a canopy, i.e. angled at the pavement, i.e.
 * unable to look at the band even if they wanted to. */
/* DoubleSide because the canopy is an open spherical cap with no underside
 * face, and the near lane passes close enough to a low lens to be seen from
 * beneath. */
const UMBRELLA_MAT = new THREE.MeshStandardMaterial({ color: '#15171D', roughness: 0.62, metalness: 0.15, side: THREE.DoubleSide })
const UMBRELLA_PALE_MAT = new THREE.MeshStandardMaterial({ color: '#3A414E', roughness: 0.55, metalness: 0.2, side: THREE.DoubleSide })
const UMBRELLA_SHAFT_MAT = new THREE.MeshStandardMaterial({ color: '#0D0F14', roughness: 0.5, metalness: 0.5 })

type Walker = {
  laneZ: number
  speed: number
  phaseOffset: number
  scale: number
  archetype: Archetype
  dark: boolean
  /** Crown height, so the canopy sits on the head and not through it. */
  crown: number
  umbrella: 'dark' | 'pale' | null
  /** Nobody holds one straight. */
  tilt: number
}

/**
 * A DOME, SMALL, and HELD CLEAR OF THE HEAD — three separate corrections,
 * each of which was visible on screen before it was obvious in the code.
 *
 *  · Cone → spherical cap. A cone with a hard apex is a straw hat no matter
 *    how you light it. The cap below is solved for a 0.34 rim radius and a
 *    0.12 rise: (1-cos t)/sin t = 0.12/0.34 gives t = 0.677 rad, and then
 *    R = 0.34/sin t = 0.543. Its rim lands at R·cos t = 0.423 below the
 *    sphere centre, which is where the -0.423 offset comes from.
 *  · 0.50 radius → 0.34. Geometrically 0.50 was right — an umbrella IS a
 *    metre across — but the near lane passes about a metre from the lens and
 *    one canopy covered a third of the opening frame and the lead behind it.
 *  · Sitting on the crown → 0.20 above it. Resting on the head is a hat.
 *    Held at arm's reach over the head is an umbrella, and the gap between
 *    the canopy and the shoulders is the entire difference.
 */
const UMB_R = 0.543
const UMB_THETA = 0.677
const UMB_RIM_DROP = 0.423

function Umbrella({ crown, pale, tilt }: { crown: number; pale: boolean; tilt: number }) {
  const mat = pale ? UMBRELLA_PALE_MAT : UMBRELLA_MAT
  return (
    <group position={[0, crown + 0.20, 0]} rotation={[tilt * 0.8, 0, tilt]}>
      <mesh position={[0, -UMB_RIM_DROP, 0]} castShadow>
        <sphereGeometry args={[UMB_R, 18, 6, 0, Math.PI * 2, 0, UMB_THETA]} />
        <primitive object={mat} attach="material" />
      </mesh>
      {/* Shaft, running from under the canopy down past the shoulder */}
      <mesh position={[0, -0.26, 0]}>
        <cylinderGeometry args={[0.011, 0.011, 0.52, 6]} />
        <primitive object={UMBRELLA_SHAFT_MAT} attach="material" />
      </mesh>
    </group>
  )
}

function PegWalker({ laneZ, speed, phaseOffset, scale, archetype, dark, crown, umbrella, tilt }: Walker) {
  const groupRef = useRef<Group>(null)
  const pegRef = useRef<Group>(null)

  useFrame(() => {
    const t = getAnimTime()
    const travel = 24
    const raw = (t * Math.abs(speed) + phaseOffset) % travel
    const x = speed > 0 ? raw - 12 : 12 - raw
    const stride = t * Math.abs(speed) * 3.4 + phaseOffset * 5.1
    if (groupRef.current) {
      groupRef.current.position.set(x, Math.abs(Math.sin(stride)) * 0.035 * scale, laneZ)
      // Facing the way they are going — i.e. NOT at the band. That is the shot.
      groupRef.current.rotation.y = speed > 0 ? Math.PI / 2 : -Math.PI / 2
    }
    // Lean is on the peg itself so it tips about the hips, not the feet.
    if (pegRef.current) pegRef.current.rotation.z = Math.sin(stride) * 0.045
  })

  return (
    <group ref={groupRef}>
      <group ref={pegRef}>
        <CrowdPeg
          archetype={archetype}
          scale={scale * PEG_PER_GOLD}
          material={dark ? CROWD_DARK_MAT : CROWD_MAT}
        />
        {/* Inside pegRef, so it leans with the body rather than floating
            level above a walker who is tipping about the hips. */}
        {umbrella && <Umbrella crown={crown} pale={umbrella === 'pale'} tilt={tilt} />}
      </group>
    </group>
  )
}

/**
 * ONE of them almost stops.
 *
 * "Nobody stops" lands hardest when somebody nearly does: a single walker
 * comes through the near lane, slows as the band comes level, drifts half a
 * step while HALF-turning toward them — a second and a bit, umbrella still
 * up, never actually facing them square — and then turns back and walks on
 * with everyone else. The beat is authored as distances, not times: the
 * stride phase is driven by ground covered, so the feet plant through the
 * slow-down instead of skating through it.
 *
 * Everything is a pure function of t (scrubs, renders deterministically).
 */
function AlmostStop() {
  const groupRef = useRef<Group>(null)
  const pegRef = useRef<Group>(null)
  const scale = 0.92
  const crown = pegHeight('thin', scale * PEG_PER_GOLD)

  useFrame(() => {
    const t = getAnimTime()
    // Three overlapping moves: brisk approach, a creeping drift while the
    // head is turned, and the walk-off. Sum of eased distances.
    const approach = easeInOut(clamp01(t / 1.05))
    const drift = clamp01((t - 1.05) / 1.4)
    const leave = easeInOut(clamp01((t - 2.45) / 1.25))
    const x = 5.4 - approach * 3.5 - drift * 0.4 - leave * 5.2
    // Half-turn toward the band, held, released. Never square-on: 0.72 rad
    // of the 1.57 it would take to face them — a look, not a stop.
    const turn = easeInOut(clamp01((t - 1.35) / 0.55)) * (1 - easeInOut(clamp01((t - 2.35) / 0.6)))
    // Stride from ground covered; the bob and hip-lean die back while they
    // hang, and come back with the walk-off.
    const covered = 5.4 - x
    const stride = covered * 3.1
    const hang = easeInOut(clamp01((t - 1.2) / 0.5)) * (1 - easeInOut(clamp01((t - 2.35) / 0.6)))
    const moving = 1 - hang * 0.85
    if (groupRef.current) {
      groupRef.current.position.set(x, Math.abs(Math.sin(stride)) * 0.035 * scale * moving, PITCH_Z + 2.55)
      groupRef.current.rotation.y = -Math.PI / 2 - turn * 0.72
    }
    if (pegRef.current) pegRef.current.rotation.z = Math.sin(stride) * 0.045 * moving
  })

  return (
    <group ref={groupRef}>
      <group ref={pegRef}>
        <CrowdPeg archetype="thin" scale={scale * PEG_PER_GOLD} material={CROWD_MAT} />
        <Umbrella crown={crown} pale={false} tilt={-0.08} />
      </group>
    </group>
  )
}

/**
 * THREE lanes, and each lane's walkers spaced along it rather than dropped
 * at random.
 *
 * The old crowd drew a uniform `phaseOffset` per figure, which is the same
 * mistake as scattering points on a grid: uniform-random spacing clumps.
 * Two people in one lane at similar speeds and similar phase walk through
 * each other, and a pegs-with-no-legs body has nothing to sell the overlap
 * as two people passing — it reads as one body glitching. That was most of
 * what made the pavement look wrong.
 *
 * So each lane gets its own evenly-divided phase and only a small jitter on
 * top, which over a two-second shot is enough that nobody intersects anybody.
 * The third lane is new: two lanes is a corridor, three is a pavement, and
 * the near one crosses in front of the open case so people are visibly
 * stepping around it.
 */
/** Far lane pushed forward off the band. At -7.45 it was under a metre in
 *  front of them, so a canopy in it projected onto the seven's heads from
 *  almost every angle. The case at PITCH_Z+2.15 sits in the gap between the
 *  middle and near lanes, which is why that gap is the wide one. */
const LANES = [LANE_FAR + 0.35, LANE_NEAR + 0.2, PITCH_Z + 2.9] as const
/** 58, up from 42, at 1.35× the walking speed — the whirlwind pass. The rush
 *  hour thickens and accelerates around the seven while THEY hold their
 *  STOP_AT beats exactly where they were; the stillness against the faster
 *  world is the whole effect. */
const CROWD_N = 58

function Crowd() {
  const figures = useMemo(() => {
    const rng = seededRandom(636)
    const out: Walker[] = []
    // Travel distance in PegWalker's wrap — the phase spread has to match it
    // or the even spacing is even in the wrong units.
    const TRAVEL = 24
    const perLane = Math.ceil(CROWD_N / LANES.length)
    for (let li = 0; li < LANES.length; li++) {
      for (let k = 0; k < perLane && out.length < CROWD_N; k++) {
        const dir = rng() > 0.5 ? 1 : -1
        const scale = 0.80 + rng() * 0.22
        const archetype = STREET_TYPES[Math.floor(rng() * STREET_TYPES.length)]
        const u = rng()
        out.push({
          laneZ: LANES[li] + (rng() - 0.5) * 0.28,
          // Everyone moves faster than they did in the dry version. Rain is
          // the reason nobody is going to stop, and a crowd that strolls
          // through it undoes that. The trailing ×1.35 is the whirlwind
          // pass — the same commute at rush-hour pace.
          speed: dir * (1.35 + rng() * 1.9) * 1.35,
          phaseOffset: (k / perLane) * TRAVEL + (rng() - 0.5) * 1.1,
          scale,
          archetype,
          dark: rng() > 0.5,
          crown: pegHeight(archetype, scale * PEG_PER_GOLD),
          /**
           * Just over half — at four in five the pavement became a solid
           * raft of canopies with the seven somewhere underneath it, and the
           * shot needs to see past the crowd to the people it is about.
           *
           * And barely any in the BACK lane, which is a projection problem
           * and not a taste one. The lens is above head height, so screen
           * height falls off with distance: a canopy 4.5 m out lands HIGHER
           * in frame than a head 5.8 m out. Every umbrella in the lane
           * nearest the band therefore drew itself across the seven's heads,
           * and the one that kept landing on the lead read as though he were
           * holding it — in the one shot whose entire point is that he is
           * standing in the rain and the people with umbrellas are the ones
           * walking away. The near lanes have the opposite geometry and are
           * free to be as full as they like.
           */
          umbrella: u > (li === 0 ? 0.18 : 0.56) ? null : u > 0.34 ? 'pale' : 'dark',
          tilt: (rng() - 0.5) * 0.22,
        })
      }
    }
    return out
  }, [])

  return <group>{figures.map((f, i) => <PegWalker key={i} {...f} />)}</group>
}

/* ─── Camera: one slow lateral pan, left to right ───────────────
 * No cuts, and now no arc either. Everything the lens does is ONE axis: it
 * slides sideways, and that is the whole move.
 *
 * Two earlier versions were wrong in opposite directions. Three cut angles
 * inside a two-second slot gave each one under 0.7s, which reads as a
 * trailer, not as a beat where nothing is happening. Replacing them with a
 * single arc that pulled back and lifted and crossed at the same time fixed
 * the cutting but not the pace — a move that changes distance, height and
 * angle in two seconds is a fast move however smoothly it is interpolated.
 *
 * So: fixed height, fixed depth, fixed lens, and the look target rides the
 * camera at a constant offset — which makes the look DIRECTION constant too,
 * so there is no rotation anywhere in it. Pure translation. And the drift is
 * LINEAR, not eased: an ease gives a move a beginning and an end, and this
 * one should feel like it was already happening when the shot started and
 * carries on after it ends.
 *
 * ── How far it rolls ──────────────────────────────────────────────────
 * 3.0 units — about 37% of a frame width across the slot. It opened at 1.9
 * (a quarter frame; all the slack the line-up leaves) until the whirlwind
 * pass widened it: the world now streams past faster than the frame can
 * keep all seven inside it, so the ends of the line brush in and out of
 * frame while the middle holds. Still slow enough that the move reads as
 * drift rather than travel — a point takes ~5.5s to cross frame.
 *
 * It USED to run all the way past them and empty the frame, and that version
 * was unwatchable for a reason worth writing down, because the arithmetic is
 * not obvious. Sweeping a subject from one edge of frame to the other is by
 * definition one frame width of travel; over a fixed 2 s slot that fixes the
 * rate at one screen width per two seconds, and there is no number anywhere
 * in this file that can make it slower — not the fov, not the distance, not
 * the easing. Only a longer slot, and 6.3's is boxed in by lyric pins at
 * both ends. Dropping the requirement that they leave frame is what bought
 * the speed back: with no edge to reach, travel is a free parameter again.
 */
/** Above head height, looking down about fourteen degrees. Not a style
 *  choice — at eye level the three walking lanes and the band all landed in
 *  the same horizontal strip of frame, so a near-lane canopy sat exactly on
 *  the lead's head and read as though HE were holding an umbrella, which is
 *  the one thing this shot must never say. Lifting the lens stacks the lanes
 *  vertically: near traffic low, far traffic high, pavement visible between
 *  them. It is also what lets the ground be in the shot at all. */
const PAN_Y = 2.28
const PAN_Z = -2.60
/**
 * Measured on a TRUE 16:9 frame, which is the only way these two numbers
 * mean anything.
 *
 * IMPORTANT, and the cause of three bad versions of this shot: `npm run
 * shot` sizes the browser WINDOW, and Chrome's chrome eats about 143 px of
 * it, so the default capture comes back 1280×581 — a 2.2:1 letterbox. Every
 * composition here renders at 1920×1080. Framing judged off a default
 * screenshot is being judged on a frame a fifth wider than the one that
 * ships, which puts subjects further inside frame than they really are and
 * makes any lateral move look slower than it will play. Use
 * `--size 1920x1223` for anything to do with framing or camera speed.
 *
 * On that frame one world unit is about 238 px, so the shot is ~8.1 units
 * wide at the band's depth and the seven (±2.90 including body width) fill
 * roughly two thirds of it.
 *
 * The travel WIDENED for the whirlwind pass: 1.9 units → 3.0 (-2.6 → +0.4),
 * about 37% of a frame width across the slot instead of a quarter. That is
 * past the slack the line-up leaves, deliberately: Suga opens just off the
 * right edge and slides in, Jin ends brushing the left one — the world
 * streams past faster than the frame can hold all seven, which is the
 * point. The move is still linear, still one axis, still no rotation; only
 * the rate changed.
 */
const PAN_X0 = -2.6
const PAN_X1 = 0.4
/** Constant offset from camera to look-at — a standing ~6° yaw, kept so the
 *  shopfront row is seen at a slight angle instead of dead square on. It
 *  shifts the framing about 0.6 m right of the camera, which is already
 *  accounted for in the two numbers above. */
const PAN_LOOK_DX = 0.60
const PAN_LOOK_Y = 0.94
const PAN_LOOK_Z = PITCH_Z + 0.4
const CAM_FOV = 42
/** The lens breathes: 42 → 44.5 at mid-scene → 42, one slow cycle across
 *  DUR. A fov change is the proven "the world moves and the camera does
 *  not" lever (6.2's push), and a single symmetric breath is the largest
 *  dose that stays subliminal — zero-slope at both ends, so the boundary
 *  frames cut against the neighbours at exactly the authored 42. */
const FOV_BREATH = 2.5

function CameraRig() {
  const yieldCamera = useCameraHandoff()
  const target = useRef(new THREE.Vector3())
  useFrame(({ camera }) => {
    if (yieldCamera()) return
    const u = clamp01(getAnimTime() / DUR)
    const x = PAN_X0 + (PAN_X1 - PAN_X0) * u
    camera.position.set(x, PAN_Y, PAN_Z)
    target.current.set(x + PAN_LOOK_DX, PAN_LOOK_Y, PAN_LOOK_Z)
    camera.lookAt(target.current)
    const cam = camera as THREE.PerspectiveCamera
    cam.fov = CAM_FOV + FOV_BREATH * (0.5 - 0.5 * Math.cos(Math.PI * 2 * u))
    cam.updateProjectionMatrix()
  })
  return null
}

function SceneContent() {
  const leadLightRef = useRef<THREE.PointLight>(null)

  useFrame(() => {
    const g = emptyRoomGlow(getAnimTime())
    if (leadLightRef.current) leadLightRef.current.intensity = 0.4 + 4.2 * (g / GLOW_BLAZING)
  })

  return (
    <>
      <CameraRig />
      {/* Dim, cold and hazy — a sliver of city sky over dark glass. The blue
          is pulled toward grey-green: a clean night blue is a pretty night,
          and the fill is low enough that most of what shapes anyone in frame
          is the flat spill off the shopfronts. */}
      {/* Overcast. There is no sky in this shot any more — a rain night has
          a lid on it, so the zenith is barely lighter than the ground and
          the whole gradient sits inside a few values of black. */}
      <GradientEnvironment zenith="#151A21" horizon="#0A0E12" ground="#050608" intensity={0.46} />
      <ambientLight color="#2C3334" intensity={0.20} />
      <directionalLight position={[3, 6, 4]} color="#434A4D" intensity={0.18} />
      {/* Rain visibility. Tight enough that the far end of the street is gone
          well before the frame edge and the shopfront row dissolves as it
          recedes, which is most of what makes the corner feel like the only
          lit thing for a while in either direction. */}
      <fog attach="fog" args={['#070A0D', 4, 26]} />

      <Pavement />

      <Skyline />
      {/* Low cloud lit from underneath — the ceiling this weather puts on the
          city, and now the only thing above the roofline. Sodium-brown, and
          dropped and thickened from where it sat as a light-pollution band:
          in rain that glow is ON something, a few hundred feet up, not a
          wash across open sky. */}
      <mesh position={[0, 10, -30]}>
        <planeGeometry args={[190, 22]} />
        <meshBasicMaterial
          color="#2A211A" toneMapped={false} transparent opacity={0.5}
          blending={THREE.AdditiveBlending} depthWrite={false}
        />
      </mesh>
      {/* The frontage they are backed against. ONE STOREY, and that height
          is load-bearing: at eye level with a 46° lens the top of frame is
          only about four and a half metres up at this distance, so anything
          taller put the whole skyline off-screen and the background went
          flat brown. A single-storey shopfront row is also just what this
          kind of side street is. */}
      <mesh position={[0, 1.65, FRONT_Z - 0.7]} receiveShadow>
        <boxGeometry args={[110, 3.3, 1.4]} />
        <meshStandardMaterial color="#12141B" roughness={0.96} />
      </mesh>
      {/* Parapet, so the roofline is a line and not an edge of nothing */}
      <mesh position={[0, 3.36, FRONT_Z - 0.62]}>
        <boxGeometry args={[110, 0.14, 1.6]} />
        <meshStandardMaterial color="#1A1D26" roughness={0.9} />
      </mesh>
      <Shopfronts />

      {/* His own light — amber now, because the figure throwing it is, and it
          fades with him. And a soft top so the seven read against the wall,
          weak and colourless: whatever separation they get here they should
          get from the street, not from a key light nobody is holding. */}
      <pointLight ref={leadLightRef} position={[0, 1.7, PITCH_Z + 0.6]} color="#FFB938" intensity={4} distance={6} decay={1.9} />
      <pointLight position={[0, 3.3, PITCH_Z + 1.5]} color="#6F7A85" intensity={8} distance={9} decay={1.7} />

      <BuskKit />
      <MicStand position={[0, 0, PITCH_Z + 0.44]} />
      <Band />
      <Lead />
      <Crowd />
      <AlmostStop />
      <Rain />
    </>
  )
}

export default createScene({
  background: '#0B0F17',
  three: {
    // The move's A pose, so frame zero is already framed before CameraRig's
    // first useFrame lands.
    camera: { position: [PAN_X0, PAN_Y, PAN_Z], fov: CAM_FOV, near: 0.1, far: 240 },
    gl: {
      antialias: true,
      toneMapping: THREE.ACESFilmicToneMapping,
      // Under a stop down from where this sat. Everything below is authored
      // against this number, so it is the one knob to move if the whole beat
      // ever needs to come up or down together.
      toneMappingExposure: 0.76,
    },
    onCreated: ({ camera }) => camera.lookAt(PAN_X0 + PAN_LOOK_DX, PAN_LOOK_Y, PAN_LOOK_Z),
    debugTarget: [0.05, 1.30, PITCH_Z],
  },
}, function Act6_3() {
  return (
    <>
      <SceneContent />
      <EffectComposer>
        {/* Bloom is what was making the seven read as light bulbs. Held to a
            threshold only the lead and the brightest signage clear, and at a
            third of the strength — a haze around a light, not a halo. */}
        <Bloom intensity={0.28} luminanceThreshold={0.72} luminanceSmoothing={0.45} mipmapBlur />
        <Vignette eskil={false} offset={0.11} darkness={1.30} />
      </EffectComposer>
    </>
  )
})
