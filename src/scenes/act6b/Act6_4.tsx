/**
 * Act 6.4 — "PHONE CALL I" (3.1s, film 101.5–104.6, "손에 손, 너와 나, we on
 * and on" → "Sunrise, but we don't go home")
 *
 * The first split-screen call — the wish, while it still works. It now sits
 * BEFORE the audition, straight after 5.4's empty table at home: he is alone
 * in the city (5.3's room, 5.2's streets) and calls home before he dares the
 * door. He stands at the mouth of the grey city at night, phone to his ear;
 * the panel slides in from the right and there she is on the home porch at
 * dusk, in the rocking chair, satgat on, phone to her ear. The warmth of her
 * half against the grey of his is the entire meaning of the shot — same
 * device as 6.8, which plays this frame again with everything in the panel
 * gone gray.
 *
 * The street is 5.2's grammar (TowerField canyon, wet ground) but INTIMATE:
 * nobody streams past, he stands still. Mono is 0.95 — a hair off 5.2's full
 * grey: pre-audition the city has none of his warmth yet, and the only
 * colour in the frame is him and her half of it.
 */
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import * as THREE from 'three'
import { createScene } from '../createScene'
import { useCameraHandoff } from '../DebugCamera'
import { publishSceneLookAt } from '../cameraHandoff'
import { getAnimTime } from '../../hooks/useAnimTime'
import { seededRandom } from '../../utils/svgHelpers'
import {
  GoldFigure, v, buildSpinePoints, buildSolvedArmPoints, buildRestingArmPoints, buildStandingLegPoints,
  type Curve, type Sphere, type Proportions,
} from '../characters/goldFigure'
import { PARENT_HAT } from '../actB/valley'
import { RockingChair } from '../actB/porch'
import { Hanok } from '../act3/hanok'
import { TowerField, type Tower } from '../actB/city'
import GradientEnvironment from '../effects/GradientEnvironment'
import { SplitPanel } from './SplitCall'
import { ramp, smooth, clamp01, lifeFlicker } from './shared'
import { Phone, phoneRaise, rockerSitSkeleton, ROCKER_EAR_R, PanelBackstop, type V3 } from './call'

const DUR = 3.1

/* ── beats (compressed from the 4.0s cut — same order, tighter) ───── */
/** The raise — he lifts the phone over the first 0.7s. */
const RAISE0 = 0.05
const RAISE1 = 0.7
/** The panel slides in. */
const PANEL_IN: [number, number] = [0.75, 1.3]
/** Both talking from here. */
const TALK0 = 1.4
/** His glow warms +15% — she picked up. Done by 2.95 so the cut at 3.1
 *  lands on a held pose, not mid-gesture. */
const WARM0 = 2.45
const WARM1 = 2.95

/* ── the street (5.2's grammar, trimmed to a held shot) ───────────── */
const STREET_SCALE = 0.25
const STREET_HALF = 44

function layoutStreet(): Tower[] {
  const rand = seededRandom(6464)
  const out: Tower[] = []
  for (const side of [-1, 1] as const) {
    let z = 60
    while (z > -340) {
      const d = 44 + rand() * 92
      const w = 150
      const away = Math.min(1, Math.max(0, (50 - z) / 300))
      const h = 34 + rand() * 44 + away * away * (95 + rand() * 240)
      out.push({ x: side * (STREET_HALF + w / 2), z: z - d / 2, w, d, h, seed: rand() * 1000 })
      z -= d // FLUSH — alleys expose lit flanks as vertical streaks (5.2's bug)
    }
  }
  // The end of the street: two staggered rows closing the view in the fog.
  for (const [rowZ, lift] of [[-300, 0], [-360, 80]] as const) {
    let x = -400
    while (x < 400) {
      const d = 90 + rand() * 80
      out.push({
        x: x + d / 2, z: rowZ - rand() * 20, w: d, d: 150,
        h: 220 + lift + rand() * 180, seed: rand() * 1000,
      })
      x += d
    }
  }
  return out
}

function City() {
  const towers = useMemo(() => layoutStreet(), [])
  return (
    <group scale={STREET_SCALE}>
      <TowerField
        towers={towers} winW={19} winH={15} lit={0.72} resK={12} floorMin={1}
        colorSeed={6465} mono={0.95}
      />
    </group>
  )
}

/** Ground-floor shopfront glass and signs — dimmer and sparser than 5.2's;
 *  the hour is later and the street is his alone. Greys with a breath of
 *  tint, matching mono 0.95. */
const FRONT_COLORS = ['#C9CFD8', '#BFC5CE', '#D6D2C6', '#C2B4B8', '#B7C4C8', '#CCCCD2']
const SIGN_COLORS = ['#C8C8CE', '#D9C9A8', '#A8C0C8', '#B8B8BC', '#CCC2C6', '#B8AEA4']

type Panel = { pos: V3; rot: number; w: number; h: number; color: string; glow: number }

function Shopfronts() {
  const { fronts, mullions, signs } = useMemo(() => {
    const rand = seededRandom(6411)
    const X = STREET_HALF * STREET_SCALE - 0.16
    const fronts: Panel[] = []
    const mullions: Panel[] = []
    const signs: Panel[] = []
    for (const side of [-1, 1] as const) {
      const rot = side > 0 ? -Math.PI / 2 : Math.PI / 2
      let z = 1
      while (z > -36) {
        const w = 2.4 + rand() * 4.4
        const h = 1.9 + rand() * 1.0
        const cz = z - w / 2
        const y = 0.18 + h / 2
        fronts.push({
          pos: [side * X, y, cz], rot, w: w - 0.3, h,
          color: FRONT_COLORS[Math.floor(rand() * FRONT_COLORS.length)],
          glow: 0.16 + rand() * 0.24,
        })
        const bays = 2 + Math.floor(rand() * 3)
        for (let b = 1; b < bays; b++) {
          mullions.push({
            pos: [side * (X - 0.09), y, cz - w / 2 + 0.15 + (b / bays) * (w - 0.3)],
            rot, w: 0.09, h, color: '#0E1016', glow: 1,
          })
        }
        signs.push({
          pos: [side * (X - 0.09), 0.24 + h + 0.28, cz], rot,
          w: w - 0.4, h: 0.44 + rand() * 0.22,
          color: SIGN_COLORS[Math.floor(rand() * SIGN_COLORS.length)],
          glow: 0.4 + rand() * 0.3,
        })
        let sy = h + 1.1
        const stack = 1 + Math.floor(rand() * 2)
        for (let k = 0; k < stack; k++) {
          const sh = 0.9 + rand() * 1.4
          signs.push({
            pos: [side * (X - 0.3 - k * 0.04), sy + sh / 2, cz + (rand() - 0.5) * w * 0.5],
            rot, w: 0.3 + rand() * 0.24, h: sh,
            color: SIGN_COLORS[Math.floor(rand() * SIGN_COLORS.length)],
            glow: 0.35 + rand() * 0.35,
          })
          sy += sh + 0.35 + rand() * 0.7
        }
        z -= w + 0.3 + rand() * 1.8
      }
    }
    return { fronts, mullions, signs }
  }, [])

  const panel = (p: Panel, key: string) => (
    <mesh key={key} position={p.pos} rotation={[0, p.rot, 0]}>
      <planeGeometry args={[p.w, p.h]} />
      <meshBasicMaterial color={p.color} toneMapped={false} opacity={p.glow} transparent={p.glow < 1} />
    </mesh>
  )

  return (
    <group>
      {fronts.map((p, i) => panel(p, `f${i}`))}
      {mullions.map((p, i) => panel(p, `m${i}`))}
      {signs.map((p, i) => panel(p, `s${i}`))}
      {/* The spill — three cold lights; his own amber and the porch lamp are
          the rest of the budget. */}
      {[1, -8, -18].map((z, i) => (
        <pointLight
          key={z} position={[i % 2 === 0 ? 10 : -10, 2.6, z]}
          color="#D6D9DE" intensity={20} distance={24} decay={2}
        />
      ))}
    </group>
  )
}

/** Wet road: low-metalness sheen plus a few near-mirror puddles. */
function WetGround() {
  const puddles = useMemo(() => {
    const rand = seededRandom(6420)
    return Array.from({ length: 6 }, () => ({
      x: (rand() - 0.5) * 9,
      z: 3 - rand() * 26,
      w: 0.8 + rand() * 1.8,
      d: 0.5 + rand() * 1.0,
      rot: rand() * Math.PI,
    }))
  }, [])
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[120, 140]} />
        <meshStandardMaterial color="#10141B" roughness={0.28} metalness={0.38} />
      </mesh>
      {[-6.4, 6.4].map(x => (
        <mesh key={x} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.02, -30]}>
          <planeGeometry args={[3.2, 130]} />
          <meshStandardMaterial color="#1E222B" roughness={0.5} metalness={0.15} />
        </mesh>
      ))}
      {puddles.map((p, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, p.rot]} position={[p.x, 0.012, p.z]}>
          <planeGeometry args={[p.w, p.d]} />
          <meshStandardMaterial color="#080A0E" roughness={0.05} metalness={0.7} />
        </mesh>
      ))}
    </group>
  )
}

/* ── him — still, phone to ear, center-left ───────────────────────── */
const HERO_POS: V3 = [-1.15, 0, -0.6]
/** Three-quarter toward the lens AND the incoming panel — so the phone
 *  hand (his right) stays on the camera side of his silhouette. */
const HERO_ROT = 0.75
const HERO_GLOW = 0.9

const hero64Hand = (t: number): V3 => phoneRaise(ramp(t, RAISE0, RAISE1))

/**
 * His standing pose, hand-authored: feet actually apart (the preset's
 * near-touching ankles bloom into one lollipop stem at this glow), the
 * solved phone arm, and a small listening nod once the call is up.
 */
function heroSkeleton64({ P, t }: { P: Proportions; t: number; phase: number }): { curves: Curve[]; spheres: Sphere[] } {
  const talk = ramp(t, TALK0, TALK0 + 0.6)
  const breathe = Math.sin(t * 2.0) * 0.005
  const nod = talk * (0.22 + 0.18 * Math.sin(t * 1.7 + 0.8))
  const shY = P.SHOULDER_Y + breathe
  const hand = hero64Hand(t)
  return {
    curves: [
      { points: buildSpinePoints(P.HIP_Y, P), radius: P.R, segments: 16 },
      { points: buildRestingArmPoints(-0.1, shY, P), radius: P.R, segments: 14 },
      { points: buildSolvedArmPoints(0.02, shY, v(hand[0], hand[1], hand[2]), P, 0.02), radius: P.R, segments: 14 },
      { points: buildStandingLegPoints(-0.055, P.HIP_Y, P), radius: P.R, segments: 16 },
      { points: buildStandingLegPoints(0.055, P.HIP_Y, P), radius: P.R, segments: 16 },
    ],
    spheres: [{
      center: v(nod * 0.01, P.HEAD_Y + breathe - nod * 0.04, 0.03 + nod * 0.07),
      radius: P.RH,
    }],
  }
}

function Hero() {
  const lightRef = useRef<THREE.PointLight>(null)
  const groupRef = useRef<THREE.Group>(null)
  const mat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#FFB938', emissive: '#FFB938',
    emissiveIntensity: HERO_GLOW, roughness: 0.35, toneMapped: false,
  }), [])

  useFrame(() => {
    const t = getAnimTime()
    // Warm +15% at the end — she answered, and it shows on him.
    const glow = HERO_GLOW * (1 + 0.15 * ramp(t, WARM0, WARM1)) + Math.sin(t * 1.3) * 0.025
    mat.emissiveIntensity = glow
    if (lightRef.current) lightRef.current.intensity = 3.0 * (glow / HERO_GLOW)
    // The smallest weight shift — standing still is not being a statue.
    if (groupRef.current) groupRef.current.rotation.z = Math.sin(t * 0.5) * 0.008
  })

  return (
    <group position={HERO_POS} rotation={[0, HERO_ROT, 0]}>
      <group ref={groupRef}>
        <GoldFigure skeleton={heroSkeleton64} material={mat} />
        <Phone hand={hero64Hand} />
      </group>
      <pointLight ref={lightRef} position={[0, 1.35, 0.25]} color="#FFC24E" intensity={3.0} distance={5} decay={2} />
    </group>
  )
}

/* ── her — the porch at dusk, inside the panel ────────────────────── */

function grandmaHands(t: number): { left: V3; right: V3; headNod?: number } {
  const talk = ramp(t, TALK0, TALK0 + 0.6)
  const breathe = Math.sin(t * 1.4) * 0.006
  return {
    // Phone hand — held to the jaw, steady. Receivers hold still.
    right: [ROCKER_EAR_R[0], ROCKER_EAR_R[1] + breathe, ROCKER_EAR_R[2]],
    // Free hand: from the armrest into slow, small talking gestures.
    left: [
      -0.26 + Math.sin(t * 1.1) * 0.035 * talk,
      0.78 + talk * (0.1 + Math.sin(t * 1.7 + 0.6) * 0.05),
      0.18 + talk * (0.12 + Math.sin(t * 0.9 + 1.9) * 0.03),
    ],
    // A gentle listening nod once the call is up.
    headNod: talk * (0.3 + 0.25 * Math.sin(t * 1.9)),
  }
}

/** Vertical dusk gradient — a tiny canvas, deterministic. */
function useDuskTexture() {
  return useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 4
    c.height = 128
    const ctx = c.getContext('2d')!
    const g = ctx.createLinearGradient(0, 0, 0, 128)
    g.addColorStop(0, '#04081A')     // zenith
    g.addColorStop(0.5, '#0C1737')
    g.addColorStop(0.78, '#1E3060')
    g.addColorStop(0.92, '#3C4070')
    g.addColorStop(1, '#574560')     // the last warmth on the horizon
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 4, 128)
    const tex = new THREE.CanvasTexture(c)
    tex.colorSpace = THREE.SRGBColorSpace
    return tex
  }, [])
}

/**
 * 7.4's house, CONSTRUCTED the way 7.4 constructs it — not a re-dress.
 *
 * The first pass of this shot angled the hanok, lerped its walls warm and
 * parked her on an invented deck out in the yard, and the note came back
 * "6.4 does not look like the scene in 7.4… you just remade a brand-new
 * house — use the house that we have right now and place the chair where it
 * is in these other scenes". So this is `ValleyHouse`'s recipe at panel
 * scale, term for term: the hanok FRONTAL in its own palette with
 * `lights={false}`, the big warm lamp standing in FRONT of the door (that
 * lamp, not a material trick, is what makes 7.4's house glow at night), and
 * the porch deck under the rocker at the house's front corner, screen-right
 * of the door — exactly where the chair lives in 7.4 and 8.55.
 *
 * Proportions matter as much as palette: in the valley the house is scale 38
 * against figures at 20 (ratio 1.9). HOUSE_PANEL_S / FIG_PANEL_S keep that
 * ratio, which is why she got smaller — in 7.4 the house is BIGGER than the
 * person on its porch, and the first pass had it the other way round.
 *
 * The only concession to panel distance: the self-lit door/window planes are
 * multiplied to 0.8 on mount (they are authored to read from kilometres away
 * and flare a lens 4 units out).
 */
/**
 * THE FRAMING, and the arithmetic that forced it.
 *
 * The note was "we need to move the angle on the right one so that we're
 * more centered on the grandparent — the right one being much more
 * important; you're so off-center". She was at 88% of the panel's width,
 * half out of frame, with the house holding the middle.
 *
 * The panel window's LEFT edge is the screen-centre plane — content
 * x = −0.75·aspect ≈ −1.33 at every depth — while its right edge widens with
 * depth. Her chair is anchored 0.85 house-units screen-RIGHT of the door
 * (7.4's and 8.55's mark; not negotiable), so with the whole house inside
 * the window her chair can only ever end up out at the right edge. Three
 * things fix it together:
 *
 *   1. The panel now CLIPS at the split line (SplitCall), so the house is
 *      free to run off the left of frame. The eave and the far window go.
 *   2. The house is scaled UP to 1.6 and yawed 14° — the yaw swings the
 *      porch corner toward the lens and inboard, which is worth more than it
 *      sounds: it is what lets her grow from 27% of the panel's height to
 *      ~40% while staying centred, because a corner nearer the camera is a
 *      bigger corner. Fourteen degrees is as far as it goes; past ~20° the
 *      house stops being the flat-on facade 7.4 photographs.
 *   3. The lit door stays clear of the split line, because the door IS the
 *      house at night — clip that and the panel is a beige wall.
 *
 * Proportions hold: in the valley the house is scale 38 against figures at
 * 20 (ratio 1.9), and HOUSE_PANEL_S / FIG_PANEL_S keep it, so the house is
 * still bigger than the person on its porch — she just stands nearer.
 *
 * The only concession to panel distance: the self-lit door/window planes are
 * multiplied to 0.8 on mount (they are authored to read from kilometres away
 * and flare a lens 4 units out).
 */
const HOUSE_PANEL_S = 1.45
const FIG_PANEL_S = HOUSE_PANEL_S * (20 / 38)
/** Three-quarter by a hair: the front face still square-ish to the lens, the
 *  porch corner swung toward it. */
const HOUSE_YAW = -0.32
const HOUSE_POS: V3 = [-0.28, 0, -3.09]
/** ValleyHouse's porch corner, hanok-local [0.85, −0.026, 1.30] — on the
 *  +x side here, which is SCREEN-RIGHT of the door from this lens: the side
 *  the chair sits on in 7.4's frame (checked against its opening frame, not
 *  derived — two coordinate flips deep, the screenshot is the authority).
 *  Carried through the house's yaw, so the chair rides the corner. */
const PORCH_PANEL: V3 = [
  HOUSE_POS[0] + (0.85 * Math.cos(HOUSE_YAW) + 1.30 * Math.sin(HOUSE_YAW)) * HOUSE_PANEL_S,
  HOUSE_POS[1] - 0.026 * HOUSE_PANEL_S,
  HOUSE_POS[2] + (-0.85 * Math.sin(HOUSE_YAW) + 1.30 * Math.cos(HOUSE_YAW)) * HOUSE_PANEL_S,
]

function TamedHanok() {
  const root = useRef<THREE.Group>(null)
  const tamed = useRef(false)
  useFrame(() => {
    if (tamed.current || !root.current) return
    root.current.traverse(o => {
      const m = (o as THREE.Mesh).material as THREE.MeshBasicMaterial | undefined
      if (m && m.toneMapped === false) {
        m.color.multiplyScalar(0.94)
        if (m.transparent) m.opacity = Math.min(m.opacity, 0.9)
      }
    })
    tamed.current = true
  })
  return (
    <group ref={root} position={HOUSE_POS} rotation={[0, HOUSE_YAW, 0]} scale={HOUSE_PANEL_S}>
      {/* No foundation slab and no ground-glow quads: the first reads as a
          bench parked in front of the door at this distance, the second lays
          hard-edged amber trapezoids over her lap. Both are authored for the
          road-distance view in 3.2/7.4, and the lamps below do the spill
          properly here. */}
      <Hanok position={[0, 0, 0]} lights={false} foundation={false} groundGlow={false} />
      {/* ValleyHouse's front lamp pair, at panel scale — the door light and
          its ground spill. These are what "lit hanok at night" looks like.
          `distance` does NOT scale with the group (see Hanok's header), so it
          is written in world units and had to grow with the house: at the old
          7 the spill stopped short of the porch corner and left her lit by
          nothing but her own emissive. */}
      <pointLight position={[0, 0.9, 2.2]} color="#FFBA42" intensity={9}
        distance={10} decay={1.8} />
      <pointLight position={[0, 0.2, 4.0]} color="#F5C36C" intensity={3.4}
        distance={8} decay={2} />
    </group>
  )
}

/** Her glow at rest, before the gutter takes a bite out of it. */
const GMA_GLOW = 0.78
/** How deep the sag goes. */
const GMA_SAG = 0.42

function Porch() {
  const rockRef = useRef<THREE.Group>(null)
  const lampRef = useRef<THREE.PointLight>(null)
  const skeleton = useMemo(() => rockerSitSkeleton(grandmaHands), [])
  const mat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#F5B45C', emissive: '#D8891A', emissiveIntensity: GMA_GLOW, roughness: 0.5,
  }), [])
  const duller = useMemo(() => new THREE.Color('#8C6B34'), [])
  const full = useMemo(() => new THREE.Color('#D8891A'), [])
  const dusk = useDuskTexture()

  useFrame(() => {
    const t = getAnimTime()
    // The rock: calm, amp 0.03, about one swing every 3.7s.
    if (rockRef.current) rockRef.current.rotation.x = Math.sin(t * 1.7) * 0.03
    // SHE GUTTERS. The first sign, and the only one before 6.85 — she is on
    // the phone, she is fine, and her light keeps sagging off gold and coming
    // back. Both halves of the colour move: intensity alone just dims her,
    // and the note was that she should go "between being yellow and less
    // yellow", so the emissive hue slides toward a spent amber in the
    // troughs too.
    //
    // And her LAMP sags with her. Emissive alone barely read: she stands in
    // the house lamp's spill, which does not flicker, so her lit side stayed
    // put while only her self-glow moved — the two frames were hard to tell
    // apart. Giving her a light of her own means the wall behind her and the
    // chair under her breathe with her, which is what makes a guttering
    // figure read as guttering rather than as a shading artefact.
    const k = lifeFlicker(t, GMA_SAG)
    mat.emissiveIntensity = GMA_GLOW * k
    mat.emissive.copy(duller).lerp(full, (k - (1 - GMA_SAG)) / GMA_SAG)
    if (lampRef.current) lampRef.current.intensity = 2.4 * k * k
  })

  // Content may now run past the divider at local x ≈ −1.33: SplitPanel
  // clips it there. Before that it could not, and the yard plane that had to
  // reach the window's right edge was also laying a warm floor across his
  // night street.
  //
  // THE HOUSE IS IN THE SHOT NOW — the actual act3 hanok, the one 7.4 and
  // 8.55 photograph from the road. The panel used to show a plank deck, a
  // sliver of wall and a light leak: her, on a porch, somewhere. The note —
  // "I want to be able to clearly see the house in the background… it's kind
  // of like a side view right now, should be the same view that we would see
  // in 7.4" — is a continuity note, not a framing nit: the audience has to
  // recognise THIS house when he walks back up the road to it. So the panel
  // is now 7.4's grammar in miniature: the hanok three-quarter to the lens
  // with its lit door, her in the rocker on the yard in front of it, dusk
  // ridge behind.
  return (
    <group>
      <PanelBackstop />
      {/* Yard ground, running back under the house and out to both edges of
          the window — the split line crops its left, so it can be as wide as
          the far corners need. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[1.2, -0.03, -2.6]}>
        <planeGeometry args={[12, 10]} />
        <meshStandardMaterial color="#141721" roughness={1} />
      </mesh>
      {/* The house, exactly as 7.4 builds it (see TamedHanok's header). */}
      <TamedHanok />

      {/* The porch corner: PorchRocker's own low deck under the chair, at
          figure scale, on ValleyHouse's mark — her chair where it is in
          every other scene the house appears in. */}
      <group position={PORCH_PANEL} rotation={[0, HOUSE_YAW, 0]} scale={FIG_PANEL_S}>
        <mesh position={[0, -0.08, 0.04]}>
          <boxGeometry args={[1.7, 0.16, 1.35]} />
          <meshStandardMaterial color="#3A2B1C" roughness={0.9} />
        </mesh>
        <group ref={rockRef}>
          <RockingChair />
          <GoldFigure
            skeleton={skeleton}
            material={mat}
            hat={PARENT_HAT}
            hatTilt={-0.12}
          />
          <Phone hand={ROCKER_EAR_R} />
        </group>
      </group>
      {/* Her own light, BEHIND her — between the chair and the house wall, so
          what it does is throw her warmth onto the wall she is sitting
          against. In front of her (or inside her, which 0.85 above the chair
          turns out to be) it lit her own surface at point-blank range and
          bloomed her head into a white blob. Outside the scaled group,
          because a pointLight's `distance` does not scale with its parent. */}
      <pointLight
        ref={lampRef}
        position={[PORCH_PANEL[0], PORCH_PANEL[1] + 0.9, PORCH_PANEL[2] - 0.45]}
        color="#FFC24E" intensity={2.4} distance={2.9} decay={2}
      />

      {/* Dusk sky and the ridge line — both pushed out behind the house now
          that it stands 1.6× and yawed. Its back corner reaches z ≈ −5.7, and
          a sky plane at the old −3.6 was a wall through the middle of it. The
          plane's bottom edge stays at y ≈ 0 whatever its size: that is where
          the yard meets it, at every depth, and it is the horizon. */}
      <mesh position={[2.1, 3.2, -6.6]}>
        <planeGeometry args={[9, 7]} />
        <meshBasicMaterial map={dusk} toneMapped={false} />
      </mesh>
      <Ridge />
      {/* Her own dim fill so the deck isn't lit by the door alone. */}
      <ambientLight intensity={0.16} color="#5A6C9A" />
    </group>
  )
}

/** A faint ridge line against the dusk — a handful of dark triangles. */
function Ridge() {
  const geo = useMemo(() => {
    const shape = new THREE.Shape()
    shape.moveTo(-2.45, 0)
    const pts: [number, number][] = [
      [-1.9, 0.5], [-1.1, 0.3], [-0.3, 0.66], [0.5, 0.4], [1.2, 0.58], [1.9, 0.3], [2.5, 0.5],
    ]
    for (const [x, y] of pts) shape.lineTo(x, y)
    shape.lineTo(2.6, 0.28)
    shape.lineTo(2.6, -1)
    shape.lineTo(-2.45, -1)
    shape.closePath()
    return new THREE.ShapeGeometry(shape)
  }, [])
  return (
    <mesh geometry={geo} position={[2.0, 0.35, -6.2]} scale={2.4}>
      <meshBasicMaterial color="#060B16" />
    </mesh>
  )
}

/* ── camera: held, with the gentlest push ─────────────────────────── */
/**
 * Swung right off the old −0.42: the street's vanishing point and the man
 * standing on it were sitting a good 150px right of the centre of his own
 * half, crowding the divider. Yawing the lens (rather than sliding him
 * along the street) keeps him ON the vanishing point — the thing that makes
 * him read as standing in the middle of the road rather than beside it —
 * and carries the whole canyon left with him.
 */
const LOOK: V3 = [0.13, 1.2, -2.2]

function CameraRig() {
  const yieldCamera = useCameraHandoff()
  const target = useRef(new THREE.Vector3())
  useFrame(({ camera }) => {
    if (yieldCamera()) return
    const u = smooth(clamp01(getAnimTime() / DUR))
    camera.position.set(0.7 - u * 0.14, 1.58 - u * 0.03, 3.9 - u * 0.26)
    target.current.set(LOOK[0], LOOK[1], LOOK[2])
    camera.lookAt(target.current)
    // The debug camera orbits this if you take over — the lookAt quaternion
    // alone cannot say the pair are six units out, so without it you would
    // orbit a point just past the panel's face.
    publishSceneLookAt(target.current.x, target.current.y, target.current.z)
  })
  return null
}

function SceneContent() {
  return (
    <>
      <CameraRig />
      <GradientEnvironment zenith="#2B3A55" horizon="#141C2A" ground="#0A0D14" intensity={0.9} />
      <ambientLight color="#3A4558" intensity={0.36} />
      <directionalLight position={[0, 5, 5]} color="#6A7590" intensity={0.7} />
      {/* Far-started: the panel sits 2.6 units from the lens and must stay clear. */}
      <fog attach="fog" args={['#0A0E16', 9, 80]} />

      <WetGround />
      <City />
      <Shopfronts />
      <Hero />

      {/* depth 9: the backstop plane has to sit BEHIND the dusk sky (z −6.6)
          and the house's far corner (−5.7). At the 3.2 default it stood in
          front of both and the panel was a flat blue card. */}
      <SplitPanel enter={PANEL_IN} depth={9} backdrop="#0E1836" divider="#0B0B10">
        <Porch />
      </SplitPanel>
    </>
  )
}

export default createScene({
  background: '#0A0E16',
  three: {
    camera: { position: [0.7, 1.58, 3.9], fov: 40, near: 0.1, far: 160 },
    gl: {
      antialias: true,
      toneMapping: THREE.ACESFilmicToneMapping,
      toneMappingExposure: 1.1,
    },
    onCreated: ({ camera }) => camera.lookAt(...LOOK),
    debugTarget: LOOK,
  },
}, function Act6_4() {
  return (
    <>
      <SceneContent />
      <EffectComposer>
        <Bloom intensity={0.6} luminanceThreshold={0.62} luminanceSmoothing={0.6} mipmapBlur radius={0.5} />
        <Vignette eskil={false} offset={0.2} darkness={0.72} />
      </EffectComposer>
    </>
  )
})
