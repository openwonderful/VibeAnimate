/**
 * Act 6.7 — "ARENA" (3.1s, film 123.35 → 126.45)
 *
 * The biggest room of his life so far — and it is not a new room. It is THE
 * room: the stadium the whole first act flies at, the one the camera clears
 * the rim of at 0:20.31, seen from down on its own deck instead of from the
 * air. Same bowl, same facade light, same 아리랑 wall, same 46,000 — the
 * geometry is imported from `../actB/stadium`, not rebuilt to look like it.
 *
 * That is the point of the shot now. He waves from this stage here, and six
 * seconds later — after the phone call — 6.85 stands him on the SAME deck in
 * grey with a trophy in his hands. The montage's stage is a return, not an
 * arrival, and the cut at 126.45 becomes a cut between two shots of one
 * place, which is the only kind of cut that does not read as one.
 *
 * The staging is unchanged and it is still the point: a huge pedestal
 * BROADCAST CAMERA out on the runway, foreground, rear-quarter to us — and
 * our lens a three-quarter step to its right, so we see the camera AND him
 * front-on beyond it, and his wave visibly lands in ITS lens, not ours. The
 * six members are on the deck behind him in their stadium colours. The
 * song's last "Somebody like you, somebody like" (onset film 123.2 = local
 * −0.15) rides into the scene: the wave is fully up by 0.5 and oscillates
 * through the cut. 6.85 is the phone call.
 *
 * SCALE. This bowl is not metres. The blocking below is still authored in
 * the metres it was blocked in — it is good blocking and there was no reason
 * to re-solve it — and one transform, `bowl()`, puts it on the stadium deck:
 * ×17 (6.85's and 6.95's figure scale in this bowl, so the man who waves
 * here is exactly the size of the man who wins there) and a π yaw, because
 * actB's stage faces −z and this scene's faced +z.
 */
import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import * as THREE from 'three'
import type { Group } from 'three'
import { createScene } from '../createScene'
import { useCameraHandoff } from '../DebugCamera'
import { publishSceneLookAt } from '../cameraHandoff'
import { GoldFigure } from '../characters/goldFigure'
import { CrowdPeg, PEG_PER_GOLD, type Archetype } from '../characters/CrowdPeg'
import { Bowl, Stage, Crowd } from '../actB/stadium'
import { STADIUM_Z, STAGE_Z } from '../actB/flight'
import { setFlightOffset } from '../actB/time'
import { getAnimTime } from '../../hooks/useAnimTime'
import { seededRandom } from '../../utils/svgHelpers'
import GradientEnvironment from '../effects/GradientEnvironment'
import { clamp01, smooth, ramp, waveHand } from './shared'
import { BroadcastCamera, venueBeatPulse, venueBeatJump } from './venue'

/** Scene length — manifest/timeline slot. */
const DUR = 3.1
/**
 * Film second this slot starts. Song == film, always — the film plays the
 * untouched recording end to end, and the 126.8 cut this scene used to hand
 * over to does not exist any more.
 *
 * Changing this re-derives every beat phase; it does not just shift them.
 * It was 123.7 until 6.2's tail lost 0.35s to the un-splice and pulled this
 * slot, 6.3, 6.5 and 6.6 all 0.35s earlier. 0.35 is 70% of a beat at 120
 * BPM: leave it at 123.7 and the lip light, the pit, the six and the whole
 * 46,000 still render perfectly and stop being on the record.
 */
const FILM_FROM = 123.35

/**
 * THE BOWL'S OWN CLOCK, pinned.
 *
 * Everything imported from `actB/` — the crowd's jump, the moving heads, the
 * 아리랑 wall's chroma breath — reads a module-global film offset through
 * `worldTime()`/`songTime()` rather than this scene's local t. Pinning that
 * offset at 20.35 puts the borrowed world at story 20.35 → 23.45 for the
 * length of this clip, which is deliberately the same 20-odd seconds Act 1.4
 * is: the moment the camera is over the rim and the bowl is at full life.
 * (T_RIM is 20.31.)
 *
 * The value is not free to round. `beatPulse`/`beatJump` in flight.ts carry
 * the flight's own envelope — silent before 16.65, dying from T_EXIT = 27.4
 * — so the window has to sit inside (18.15, 24.3) or the crowd goes still.
 * And 123.35 − 20.35 = 103.0 = exactly 206 beats at 120 BPM, so the bowl's
 * beat grid and this scene's `venueBeat*` grid are in phase to the sample:
 * the borrowed 46,000 and the pit pegs standing in front of them jump
 * together, on the record.
 */
const FLIGHT_OFF = 20.35

function BowlClock() {
  setFlightOffset(FLIGHT_OFF)
  useFrame(() => setFlightOffset(FLIGHT_OFF))
  return null
}

/* ── the deck, in bowl units ────────────────────────────────────────
 * actB's stage geometry, read off `stadium.tsx`'s own boxes so nothing here
 * is a guess: the main deck's top is y=16 at z=STAGE_Z, the thrust in front
 * of it is y=14 at STAGE_Z−74 (this is 6.85's mark, HERO_POS), the runway
 * running on downstage is y=12, 46 wide, and the pitch the crowd stands on
 * is y=2.
 *
 * Note how LOW that is: the thrust stands 12 units over the pitch against a
 * 30-unit man — 40% of his height, where this scene's own metre arena had it
 * at 74%. That is actB's proportion and it is not negotiable from here, so
 * the pedestal camera is re-solved against it below rather than just scaled.
 */
const FIG = 17
const DECK_Y = 14
const RUNWAY_Y = 12
const PITCH_Y = 2
const HERO_Z = STAGE_Z - 74

/** His mark in the metre layout everything below is still blocked in. */
const M0_Z = 2.6
/** Metres above the metre layout's 1.3 m deck → bowl y. */
const deckY = (m: number) => DECK_Y + (m - 1.3) * FIG
/**
 * Metre blocking → bowl world. A π rotation about y, not a mirror: (x, z) →
 * (−x, −z), so every bearing in the old layout survives and the frame is the
 * frame it always was. Only the room changed.
 */
function bowl(x: number, y: number, z: number): [number, number, number] {
  return [-x * FIG, y, HERO_Z + (M0_Z - z) * FIG]
}

const HERO_POS: [number, number, number] = [0, DECK_Y, HERO_Z]
/** Riding in on the last line, three-quarter to the left bank. */
const SING_YAW = -0.4
/** Turned square to the broadcast lens (atan2 of hero → PROP_CAM, in the
 *  metre layout — a similarity transform does not move a bearing). */
const WAVE_YAW = 0.13
/**
 * The turn starts as the scene opens; the wave is FULLY UP by 0.5 and
 * oscillates through the cut.
 *
 * These do NOT take the 0.35s the slot moved. The wave is pinned to the TOP
 * OF THE CLIP, not to a syllable — it rides in on the tail of "…somebody
 * like" (123.07) and there is no vocal at all between there and "Everybody
 * like you, ayy" at 127.21, which is inside 6.85. Pushing them +0.35 would
 * put the wave back where it was in the song, undoing the move, and cost the
 * shot the thing it opens on. FILM_FROM is what carries the record here.
 */
const T_TURN = 0.05
const T_WAVE = 0.18

/**
 * The pedestal camera, out on the runway.
 *
 * It used to stand on a rostrum in a pit 1.3 m below him. In this bowl there
 * is no such pit — the deck is 12 units up and the pitch is 12 units down,
 * and dropping the prop all the way to the pitch would put it under the
 * runway box, which occupies |x| ≤ 23 from z=5090 to z=5270 and is exactly
 * where the old blocking puts it. So it stands ON the runway (the runway IS
 * the rostrum) and the scale is re-solved so its lens lands where it always
 * did: 0.24 m over his head, i.e. bowl y = 43.75 + 4.08 = 47.83, which off a
 * 12-unit base with BroadcastCamera's 1.42 head height gives 25.2 — not the
 * naive 2.0 × 17 = 34, which would have towered a full metre over him.
 *
 * It is still enormous: four times nearer our lens than he is.
 */
const PROP_CAM_M: [number, number] = [0.5, 6.7]
const PROP_CAM: [number, number, number] = bowl(PROP_CAM_M[0], RUNWAY_Y, PROP_CAM_M[1])
const PROP_CAM_SCALE = 25.2

/** Our lens: the metre three-quarter, transformed. Unchanged framing — the
 *  hero sits at the same fraction of the frame he always did, because the
 *  camera, the prop and the deck all went through one similarity. */
const CAM_A = bowl(3.75, deckY(3.1), 9.7)
const CAM_B = bowl(3.42, deckY(2.94), 9.1)
const LOOK_AT = bowl(0.25, deckY(2.5), 4.5)
/** The metre x/z of our lens, kept because the pit's sight-line clearing is
 *  still solved in the layout it was written for. */
const CAM_A_M: [number, number] = [3.75, 9.7]

const LED_PINK = '#FF5A7A'
const HERO_GOLD = '#FFB938'

/* ── him ────────────────────────────────────────────────────────────
 * The animation is untouched and still runs in metres: the outer group
 * carries the mark, the yaw flip and the ×17, the inner group does the
 * performance. Nothing about the gesture had to be re-solved to move rooms.
 *
 * `castShadow` is gone from him and from the six. It was already a no-op —
 * nothing in this scene has ever cast — but a shadow-casting light dropped
 * into a bowl this size later would have quietly started rendering a shadow
 * map over a 1,000-unit frustum, and there is no reason to leave that fuse
 * lying about.
 */
function Hero() {
  const groupRef = useRef<Group>(null)
  const micRef = useRef<Group>(null)
  const material = useMemo(() => new THREE.MeshStandardMaterial({
    color: HERO_GOLD, emissive: HERO_GOLD, emissiveIntensity: 1.5,
    roughness: 0.35, toneMapped: false,
  }), [])
  const micHand = useRef<[number, number, number]>([0.08, 1.58, 0.20])
  const freeHand = useRef<[number, number, number]>([-0.42, 1.30, 0.12])

  useFrame(() => {
    const t = getAnimTime()
    // Arena-size glow with the singing tremor; a small swell as the wave
    // rises. The song does not fade out of this scene any more, and neither
    // does he.
    const tremor = Math.sin(t * 7.3) * 0.05 + Math.sin(t * 11.9) * 0.03
    const wave = ramp(t, T_WAVE, T_WAVE + 0.32)
    material.emissiveIntensity = 1.5 * (1 + tremor * 0.5) * (1 + wave * 0.08)

    const turn = smooth(clamp01((t - T_TURN) / 0.38))
    if (groupRef.current) {
      groupRef.current.rotation.y = SING_YAW + (WAVE_YAW - SING_YAW) * turn
      // Big-room performance: weight moving until the turn plants him.
      groupRef.current.position.y = Math.sin(t * 1.5) * 0.016 * (1 - turn * 0.8)
      groupRef.current.rotation.z = Math.sin(t * 0.9) * 0.02 * (1 - turn)
    }
    // Handheld mic: at the mouth for the line riding in, down to his side
    // on the turn — the wave replaces the song.
    const mx = 0.08 + (0.17 - 0.08) * turn
    const my = 1.58 + (1.02 - 1.58) * turn
    const mz = 0.20 + (0.05 - 0.20) * turn
    micHand.current = [mx, my, mz]
    if (micRef.current) {
      micRef.current.position.set(mx, my, mz)
      // Upright toward the mouth while singing, hanging with the arm after.
      micRef.current.rotation.x = -0.5 + turn * 0.9
    }
    // Free hand: an open gesture to the bowl gathering into THE WAVE —
    // fully up by 0.5, oscillating steadily through the cut.
    const up = ramp(t, T_WAVE, T_WAVE + 0.32)
    const w = waveHand(t, up, { mirror: true })
    const spread = 1 - up
    freeHand.current = [
      w[0] - spread * 0.16,
      w[1] + up * 0.12 - spread * 0.30 + Math.sin(t * 1.4) * 0.015 * spread,
      w[2] + spread * 0.08 + up * 0.1,
    ]
  })

  return (
    <group position={HERO_POS} rotation={[0, Math.PI, 0]} scale={FIG}>
      <group ref={groupRef}>
        <GoldFigure
          pose="standing"
          animate
          solvedArms
          material={material}
          rightHandAt={micHand}
          leftHandAt={freeHand}
          headForwardTilt={0.02}
        />
        {/* Handheld mic riding the right hand. */}
        <group ref={micRef}>
          <mesh position={[0, 0.05, 0.02]}>
            <capsuleGeometry args={[0.028, 0.1, 6, 10]} />
            <meshStandardMaterial color="#0C0E14" roughness={0.5} metalness={0.5} />
          </mesh>
        </group>
      </group>
    </group>
  )
}

/* ── the other six ──────────────────────────────────────────────────
 * The band on the deck — Act6_3's stadium palette (file-local there), same
 * people, same hues, arena energy: the in-place walk cycle as stage movement
 * plus a beat-jump off the record, each a hair desynced.
 *
 * The table is still the metre blocking. Its bearings were checked from
 * CAM_A back when this was a 46 m room and they survive the transform
 * unchanged, which is the whole reason it is a transform and not a re-block:
 * the lens ray through the hero still sweeps the deep-left deck (his
 * "shadow" runs x ≈ −1.8…−2.4 back there), nobody stands on it, and no two
 * members share a bearing. Run through `bowl()` every one of them lands on
 * actB's real deck or its thrust — checked against the boxes in
 * stadium.tsx's Stage(), not assumed.
 */
const MEMBERS = [
  { name: 'Jin', color: '#FFA3C9', x: -2.55, z: 0.55, phase: 0.11, lag: 0.05 },
  { name: 'J-Hope', color: '#FF6B4D', x: 1.45, z: 1.20, phase: 0.63, lag: 0.00 },
  { name: 'RM', color: '#5B7BFF', x: -1.35, z: -1.90, phase: 0.37, lag: 0.09 },
  { name: 'V', color: '#B876FF', x: -0.50, z: -1.60, phase: 0.81, lag: 0.12 },
  { name: 'Jimin', color: '#7BE838', x: 1.70, z: -0.40, phase: 0.24, lag: 0.03 },
  { name: 'Suga', color: '#6FEDC4', x: 2.45, z: 0.90, phase: 0.52, lag: 0.07 },
] as const

const MEMBER_GLOW = 0.6

function Member({ color, x, z, phase, lag }: (typeof MEMBERS)[number]) {
  const ref = useRef<Group>(null)
  const material = useMemo(() => new THREE.MeshStandardMaterial({
    color, emissive: color, emissiveIntensity: MEMBER_GLOW, roughness: 0.55,
  }), [color])
  useFrame(() => {
    const t = getAnimTime()
    const jump = venueBeatJump(t + FILM_FROM - lag)
    if (ref.current) {
      ref.current.position.y = jump * 0.09
      ref.current.rotation.z = Math.sin(t * 1.8 + phase * 6.3) * 0.035
    }
  })
  return (
    <group position={bowl(x, DECK_Y, z)} rotation={[0, Math.PI, 0]} scale={FIG}>
      <group ref={ref} rotation={[0, -x * 0.06, 0]}>
        <GoldFigure pose="walking" inPlace animate phaseOffset={phase}
          material={material} />
      </group>
    </group>
  )
}

function Band() {
  return <group>{MEMBERS.map((m) => <Member key={m.name} {...m} />)}</group>
}

/* ── the lip light ──────────────────────────────────────────────────
 * 6.5's pink LED strip, grown up twice: it ran the basement riser, it ran
 * the metre thrust, and here it outlines actB's real thrust and runway. The
 * one piece of this scene's own production value that had to be rebuilt
 * rather than imported, because actB's Stage() has a warm front-of-stage
 * wash and no colour of its own — and the pink is how 6.5 and 6.7 read as
 * the same career.
 */
function ThrustLip() {
  const mat = useMemo(() => new THREE.MeshBasicMaterial({
    color: LED_PINK, toneMapped: false, transparent: true, opacity: 0.85, fog: false,
  }), [])
  const washRef = useRef<THREE.PointLight>(null)
  useFrame(() => {
    const t = getAnimTime()
    const pulse = venueBeatPulse(t + FILM_FROM)
    mat.opacity = 0.55 + pulse * 0.4
    // 7 at 10 m with decay 1.8 in the metre room; the same illuminance at
    // 17× the throw is 7 × 17^1.8.
    if (washRef.current) washRef.current.intensity = 1150 + pulse * 575
  })
  const strips: [number, number, number, number, number][] = [
    // x, z, y, x-extent, z-extent — the thrust's downstage lip and both
    // flanks, then the runway's two edges one step lower.
    [0, STAGE_Z - 104, DECK_Y + 0.1, 150, 0.85],
    [75, HERO_Z, DECK_Y + 0.1, 0.85, 60],
    [-75, HERO_Z, DECK_Y + 0.1, 0.85, 60],
    [23, STAGE_Z - 190, RUNWAY_Y + 0.1, 0.85, 180],
    [-23, STAGE_Z - 190, RUNWAY_Y + 0.1, 0.85, 180],
  ]
  return (
    <group>
      {strips.map(([x, z, y, w, d], i) => (
        <mesh key={i} position={[x, y, z]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[w, d]} />
          <primitive object={mat} attach="material" />
        </mesh>
      ))}
      <pointLight ref={washRef} position={bowl(0, deckY(3.4), 3.4)}
        color="#FFD2E0" intensity={1150} distance={170} decay={1.8} />
    </group>
  )
}

/* ── the bowl's light ───────────────────────────────────────────────
 * 6.85 lights this same deck for the death montage and its rig is the
 * proven one at this scale — arena wash off the roof, a key down the
 * runway, a rim from upstage. Same three positions, this scene's palette:
 * violet air, and him gold. 6.85's version of these lights is grey and
 * fades up out of nothing; here they are simply on, and they breathe.
 */
function ArenaLights() {
  const wash = useRef<THREE.PointLight>(null)
  const key = useRef<THREE.PointLight>(null)
  const hero = useRef<THREE.PointLight>(null)
  useFrame(() => {
    const t = getAnimTime()
    const pulse = venueBeatPulse(t + FILM_FROM)
    if (wash.current) wash.current.intensity = 78 + pulse * 34
    if (key.current) key.current.intensity = 980 + pulse * 190
    const wave = ramp(t, T_WAVE, T_WAVE + 0.32)
    if (hero.current) hero.current.intensity = 1520 + wave * 430
  })
  return (
    <>
      <ambientLight color="#3A3448" intensity={0.34} />
      <pointLight ref={wash} position={[0, 165, STADIUM_Z]} color="#A374F0"
        intensity={78} distance={2600} decay={1.4} />
      <pointLight ref={key} position={[0, 58, STAGE_Z - 145]} color="#E8D0FF"
        intensity={980} distance={420} decay={1.6} />
      <pointLight position={[0, 80, STAGE_Z + 30]} color="#6F5AA8"
        intensity={420} distance={320} decay={1.6} />
      {/* His own, on the metre mark it was always on: 7 at 10 m decay 1.9
          is 7 × 17^1.9 at 17× the throw. */}
      <pointLight ref={hero} position={bowl(0.4, deckY(3.6), 3.2)} color={HERO_GOLD}
        intensity={1520} distance={175} decay={1.9} />
    </>
  )
}

/* ── foreground bodies: the pit either side of the runway ───────────
 * Silhouette pegs jumping on the record, right under our lens. actB's own
 * floor crowd is a point cloud — forty thousand lights, which is what a
 * stadium is from the air — and it has nothing at peg size to put in the
 * near frame. These are that: thirty bodies on the pitch, flanking the
 * runway, in the band our lens actually looks across (bowl z 5199…5264,
 * |x| 31…140), which is downstage of the thrust, clear of the runway box,
 * and still 24 units in front of the lens at its nearest — the same
 * foreground-to-subject ratio the metre room had.
 */
const PIT_MAT = new THREE.MeshStandardMaterial({
  color: '#4E4650', emissive: '#4E4650', emissiveIntensity: 0.05, roughness: 0.9,
})
const PIT_MAT_DARK = new THREE.MeshStandardMaterial({
  color: '#332E38', emissive: '#332E38', emissiveIntensity: 0.05, roughness: 0.9,
})
const PIT_TYPES: Archetype[] = ['tall', 'tall', 'short', 'thin', 'wide', 'hunched']

type PitBody = {
  /** Metre blocking, as everything else in this file. */
  pos: [number, number]
  scale: number
  archetype: Archetype
  dark: boolean
  lag: number
  amp: number
  swayPhase: number
}

function Pit() {
  const bodies = useMemo(() => {
    const rng = seededRandom(6755)
    const out: PitBody[] = []
    let guard = 0
    while (out.length < 30 && guard++ < 600) {
      // |x| ≥ 1.85 m clears the runway (23 bowl units = 1.35 m); z from 4.5
      // keeps them off the thrust's downstage edge.
      const x = (rng() < 0.5 ? -1 : 1) * (1.85 + rng() * 6.4)
      const z = 4.5 + rng() * 3.8
      // Keep the broadcast camera's working room clear.
      if (Math.hypot(x - PROP_CAM_M[0], z - PROP_CAM_M[1]) < 2.0) continue
      // And our corridor to him.
      const u = (CAM_A_M[1] - z) / (CAM_A_M[1] - M0_Z)
      if (u > 0 && u < 1) {
        const sightX = CAM_A_M[0] + (0 - CAM_A_M[0]) * u
        if (Math.abs(x - sightX) < 1.15) continue
      }
      out.push({
        pos: [x, z],
        scale: 0.84 + rng() * 0.2,
        archetype: PIT_TYPES[Math.floor(rng() * PIT_TYPES.length)],
        dark: rng() > 0.5,
        lag: rng() * 0.16,
        amp: 0.5 + rng() * 0.5,
        swayPhase: rng() * Math.PI * 2,
      })
    }
    return out
  }, [])
  return <group>{bodies.map((b, i) => <PitPeg key={i} {...b} />)}</group>
}

function PitPeg({ pos, scale, archetype, dark, lag, amp, swayPhase }: PitBody) {
  const ref = useRef<Group>(null)
  useFrame(() => {
    const t = getAnimTime()
    const jump = venueBeatJump(t + FILM_FROM - lag)
    if (ref.current) {
      ref.current.position.y = jump * 0.11 * amp
      ref.current.rotation.z = Math.sin(t * 1.7 + swayPhase) * 0.04 * amp
    }
  })
  return (
    <group position={bowl(pos[0], PITCH_Y + 0.2, pos[1])} rotation={[0, Math.PI, 0]} scale={FIG}>
      <group ref={ref}>
        <CrowdPeg archetype={archetype} scale={scale * PEG_PER_GOLD}
          material={dark ? PIT_MAT_DARK : PIT_MAT} />
      </group>
    </group>
  )
}

/* ── THE broadcast camera ───────────────────────────────────────────
 * The venue kit's pedestal rig, bowl-size, standing out on the runway —
 * huge in the near frame, rear-quarter to us, lens on him. This is the
 * camera she is watching through; the tally says LIVE. An operator peg
 * works it from behind, and a rail on the runway's downstage edge says
 * "broadcast position" rather than "somebody left a camera here".
 */
function RunwayCamera() {
  return (
    <group>
      <mesh position={bowl(PROP_CAM_M[0], RUNWAY_Y + 7.1, PROP_CAM_M[1] + 0.92)}>
        <boxGeometry args={[32.3, 0.6, 0.6]} />
        <meshStandardMaterial color="#2A2536" roughness={0.5} metalness={0.8} />
      </mesh>
      <BroadcastCamera position={PROP_CAM} scale={PROP_CAM_SCALE} pedestal
        aimAt={[HERO_POS[0], DECK_Y + 1.72 * FIG, HERO_POS[2]]} />
      {/* The operator, shoulder to the viewfinder. */}
      <group position={bowl(1.1, RUNWAY_Y, 7.45)} rotation={[0, Math.PI, 0]} scale={FIG}>
        <CrowdPeg archetype="thin" scale={0.96 * PEG_PER_GOLD} material={PIT_MAT_DARK} />
      </group>
    </group>
  )
}

/* ── camera ─────────────────────────────────────────────────────────*/
function CameraRig() {
  const yieldCamera = useCameraHandoff()
  const target = useRef(new THREE.Vector3())
  useFrame(({ camera }) => {
    if (yieldCamera()) return
    const t = getAnimTime()
    const u = smooth(clamp01(t / DUR))
    camera.position.set(
      CAM_A[0] + (CAM_B[0] - CAM_A[0]) * u,
      CAM_A[1] + (CAM_B[1] - CAM_A[1]) * u,
      CAM_A[2] + (CAM_B[2] - CAM_A[2]) * u,
    )
    target.current.set(LOOK_AT[0], LOOK_AT[1], LOOK_AT[2])
    camera.lookAt(target.current)
    // Past the pedestal, a hundred units down the lens, in a bowl a
    // kilometre across — and the lookAt quaternion has thrown that distance
    // away. Hand the debug camera the point itself to orbit, not a guess a
    // few units off our nose.
    publishSceneLookAt(target.current.x, target.current.y, target.current.z)
  })
  return null
}

function SceneContent() {
  return (
    <>
      <BowlClock />
      <CameraRig />
      <GradientEnvironment zenith="#0A0714" horizon="#1A1128" ground="#05040A" intensity={0.5} />
      {/* Only enough to give the far tiers depth: the bowl is ~1,000 units
          corner to corner and the near half must stay perfectly clear. */}
      <fog attach="fog" args={['#0B0716', 350, 1800]} />

      <ArenaLights />

      {/* THE ROOM — Act 1's stadium, not a lookalike. Bowl and its pitch,
          the deck/thrust/runway with the 아리랑 wall and its seven moving
          heads, and the 46,000. Facade, masts and apron are deliberately
          NOT mounted: they are the outside of the building and this lens
          never leaves the deck. */}
      <Bowl />
      <Stage />
      <Crowd />

      <ThrustLip />
      <Pit />
      <RunwayCamera />

      <Hero />
      <Band />
    </>
  )
}

export default createScene({
  background: '#07060C',
  three: {
    // near/far are 6.85's stadium-frame values: this lens stands 5,175 units
    // out along z and the old far: 140 would have clipped the stage away.
    camera: { position: CAM_A, fov: 46, near: 1, far: 4000 },
    gl: {
      antialias: true,
      toneMapping: THREE.ACESFilmicToneMapping,
      toneMappingExposure: 1.1,
    },
    onCreated: ({ camera }) => camera.lookAt(...LOOK_AT),
    debugTarget: LOOK_AT,
  },
}, function Act6_7() {
  return (
    <>
      <SceneContent />
      <EffectComposer>
        {/* Stadium-glow scene: threshold below the interiors' 0.6 so the
            crowd sea blooms; radius contains the halo around him. */}
        <Bloom intensity={0.7} luminanceThreshold={0.5} luminanceSmoothing={0.4} radius={0.55} mipmapBlur />
        <Vignette eskil={false} offset={0.2} darkness={0.75} />
      </EffectComposer>
    </>
  )
})
