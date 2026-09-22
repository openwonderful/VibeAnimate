/**
 * Floor-seated figures for the hanok set.
 *
 * The shared GoldFigure 'seated' preset keeps the hips at standing height —
 * it was built for a child riding on shoulders, not for someone sitting on a
 * warm floor. These figures drive GoldFigure through its `skeleton` escape
 * hatch instead: hips near the boards, knees folded, spine leaning in, and
 * both hands driven by an eating cycle.
 */
import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { getAnimTime } from '../../../hooks/useAnimTime'
import {
  GoldFigure,
  type HatName,
  buildSeatedSpinePoints,
  v,
  type Proportions,
  type PoseGeometry,
} from '../../characters/goldFigure'
import { type V3, clamp01, smooth, ramp, mix3 } from './palette'

export type DinerBuild = {
  /** Hip height above the floor. */
  hipY: number
  /** Forward lean of the spine, in world units at the shoulders. */
  lean: number
  /**
   * 'cross' = cross-legged on the floor, 'kneel' = up on the knees,
   * 'stool' = perched on a stool at a counter with the feet down. The last one
   * is for Act 5.3, which has to run the same rig as 5.4 for the mirror to
   * land even though one is a floor table and the other is a city counter.
   */
  legs: 'cross' | 'kneel' | 'stool'
  /** Local-space hand targets, recomputed per frame. */
  leftHand: V3
  rightHand: V3
  /** Extra head tilt toward the bowl. */
  headTilt: number
  /**
   * Sideways lean of the upper body, in local +x at shoulder height. Rolling
   * the whole group about z instead would pivot on the floor and swing the
   * folded legs out from under the table — a seated person leans from the
   * hips up, and nothing below the hips moves.
   */
  sideLean: number
}

export function buildDiner(P: Proportions, b: DinerBuild): PoseGeometry {
  const spineLen = P.SHOULDER_Y - P.HIP_Y + 0.17
  const hipY = b.hipY
  const shY = hipY + (P.SHOULDER_Y - P.HIP_Y)
  const shZ = 0.025 + b.lean * 0.85
  const headY = hipY + spineLen + (P.HEAD_Y - P.SHOULDER_Y - 0.17)

  // Lateral offset ramps from 0 at the hips to `sideLean` at the shoulders.
  const sway = (y: number) => (b.sideLean * clamp01((y - hipY) / spineLen))

  const spine = buildSeatedSpinePoints(hipY, P, b.lean)
  spine.forEach(pt => { pt.x += sway(pt.y) })

  // ── Legs ──────────────────────────────────────────────────────────
  const leg = (side: number) => {
    const hip = v(side * 0.045, hipY, 0.02 + b.lean * 0.1)
    if (b.legs === 'cross') {
      // Cross-legged, and the FOLD is the whole thing: the thigh runs forward
      // and out to a knee lying near the boards, and the shin comes BACK
      // across the midline so the ankle tucks in under the other thigh.
      //
      // It used to put the ankle 0.08 in FRONT of the knee, which is a knee
      // bending the wrong way — and that is exactly what it looked like from
      // the side: a figure with its lower legs on backwards.
      //
      // Lengths come off the rig rather than being typed in, so a child folds
      // like a child: thigh ≈ shin ≈ half the standing leg.
      const half = (P.HIP_Y - P.FOOT_Y) * 0.5
      const knee = v(side * half * 0.76, P.R * 1.05, half * 0.68)
      // The right shin crosses in front of and over the left — crossed legs
      // stack, they do not share a tube of air. The near ankle rides a shin's
      // thickness higher and sits a little further forward.
      const over = side > 0
      const ankle = v(
        -side * half * 0.16,
        P.R * (over ? 2.0 : 1.0),
        half * (over ? 0.34 : 0.24),
      )
      // The neighbours are pulled in tight to the knee so the Catmull-Rom
      // turns the corner there instead of rounding the fold away.
      return [hip, hip.clone().lerp(knee, 0.68), knee, knee.clone().lerp(ankle, 0.32), ankle]
    }
    if (b.legs === 'stool') {
      // Perched: thigh forward and level, shin dropping to the floor.
      const knee = v(side * 0.11, hipY - 0.06, 0.30)
      const foot = v(side * 0.12, P.FOOT_Y, 0.26)
      return [hip, hip.clone().lerp(knee, 0.5), knee, knee.clone().lerp(foot, 0.5), foot]
    }
    // Kneeling on the heels: knees forward on the floor, shins folded back.
    const knee = v(side * 0.13, P.FOOT_Y + 0.01, 0.19)
    const foot = v(side * 0.13, P.FOOT_Y, -0.09)
    return [hip, hip.clone().lerp(knee, 0.5), knee, knee.clone().lerp(foot, 0.5), foot]
  }

  // ── Arms ──────────────────────────────────────────────────────────
  // Rooted INSIDE the torso tube — the shared rig plants its shoulders at
  // ±0.02, basically on the spine, and that is what makes its arms read as
  // growing out of the body. These used to start at ±0.09, a full tube
  // radius clear of the spine, and the arm hung in the air beside the
  // figure. The root is buried in the torso and the curve is led out
  // through a real shoulder point before it drops to the elbow.
  const arm = (side: number, hand: V3) => {
    const root = v(side * 0.02 + sway(shY - 0.04), shY - 0.03, shZ * 0.85)
    const sh = v(side * 0.085 + sway(shY), shY, shZ)
    const h = v(hand[0], hand[1], hand[2])
    const mid = sh.clone().lerp(h, 0.5)
    mid.x += side * 0.06
    mid.y -= 0.06
    mid.z += 0.02
    return [root, sh, mid, mid.clone().lerp(h, 0.5), h]
  }

  return {
    curves: [
      { points: spine, radius: P.R, segments: 16 },
      { points: arm(-1, b.leftHand), radius: P.R, segments: 14 },
      { points: arm(+1, b.rightHand), radius: P.R, segments: 14 },
      { points: leg(-1), radius: P.R, segments: 16 },
      { points: leg(+1), radius: P.R, segments: 16 },
    ],
    spheres: [{ center: v(sway(headY), headY, 0.03 + b.lean + b.headTilt), radius: P.RH * 0.86 }],
  }
}

/**
 * One bite: lift from the bowl, hold at the mouth, lower, rest. The rest beat
 * is the longest one — people eat in bursts and then just sit there, and the
 * pauses are what make it read as a meal instead of a machine.
 */
/**
 * Where the eating hand is at phase u: up from the bowl, held at the mouth,
 * back down, then resting over the bowl.
 *
 * The wobble is applied to EVERY phase and is periodic over the whole cycle.
 * It used to be added in the hold and the rest and omitted in the two
 * travels, so the hand jumped by the wobble amplitude at u=0.44, again at
 * 0.68 and again at the wrap — three discontinuities per cycle. At 1× that
 * is a twitch; in Act B, where the room is mounted at 20×, it is a visible
 * shake.
 */
export function bite(u: number, bowl: V3, mouth: V3, seed: number): V3 {
  const wob = Math.sin(u * Math.PI * 2 * 3 + seed) * 0.006
  const stir = Math.sin(u * Math.PI * 2 + seed) * 0.008
  let base: V3
  if (u < 0.26) base = mix3(bowl, mouth, smooth(u / 0.26))
  else if (u < 0.44) base = mouth
  else if (u < 0.68) base = mix3(mouth, bowl, smooth((u - 0.44) / 0.24))
  else base = bowl
  return [base[0] + wob, base[1] + stir, base[2] + wob * 0.5]
}

export type DinerProps = {
  kind: 'adult' | 'child'
  /** World position of the seat. */
  x: number
  z?: number
  /** Y rotation — figure forward is local +z. */
  facing: number
  hipY: number
  legs: 'cross' | 'kneel' | 'stool'
  /** Seconds per eating cycle, and where in it this figure starts. */
  cycle: number
  cycleOffset: number
  /**
   * Hand targets in figure-local space, written for a figure that eats with
   * its +x arm. `mirrored` flips them to the −x arm, so whoever sits on the
   * right still eats with the hand nearer the middle of the table.
   */
  bowl: V3
  mouth: V3
  restHand: V3
  mirrored?: boolean
  /** Optional reach across the table (local space) + when it happens. */
  serveTo?: V3
  serveAt?: [number, number]
  glow: number
  /** Uniform size multiplier on top of `kind`. The rig's CHILD is 69% of
   *  ADULT — a ten-year-old — and at a low table opposite a cross-legged
   *  adult that reads as two adults, one of them crouching. */
  scale?: number
  /** Body colour; defaults to the signature amber the whole arc uses. */
  color?: string
  emissive?: string
  /** Drives the "leans toward the other one" gesture (0 = upright). */
  leanTo?: (t: number) => number
  /** Headwear. Indoors too — see the note on <SeatedFigure>. */
  hat?: HatName
  hatTilt?: number
  /** Extra emissive added near the end of the scene (the child's beat). */
  flare?: (t: number) => number
}

export function Diner({
  hat, hatTilt,
  kind, x, z = 0, facing, hipY, legs, cycle, cycleOffset,
  bowl, mouth, restHand, mirrored = false, serveTo, serveAt,
  glow, color = '#FFB938', emissive = '#E89B1F', leanTo, flare,
  scale = 1,
}: DinerProps) {
  const groupRef = useRef<THREE.Group>(null)

  // Same amber the road figures wear in 3.2 — kept as our own instance so this
  // scene can push the emissive around without touching the shared preset.
  const bodyMat = useMemo(
    () => new THREE.MeshStandardMaterial({
      color,
      emissive,
      emissiveIntensity: glow,
      roughness: 0.55,
      metalness: 0,
    }),
    [glow, color, emissive],
  )
  useEffect(() => () => bodyMat.dispose(), [bodyMat])

  // Whole-body sway: settle into the seat, breathe, and lean toward the
  // other person on cue. Direct mutation, so no re-render per frame.
  useFrame(() => {
    const g = groupRef.current
    if (!g) return
    const t = getAnimTime()
    const towards = leanTo ? leanTo(t) : 0
    const breathe = Math.sin(t * 0.9 + cycleOffset * 6) * 0.012
    // Both figures face +z. Turning toward the other one means rotating away
    // from your own side of the table; the sideways lean itself happens in the
    // skeleton, above the hips.
    const side = Math.sign(x) || 1
    g.rotation.y = facing - side * towards * 0.20 + Math.sin(t * 0.37 + cycleOffset * 3) * 0.02
    g.position.x = x - side * towards * 0.05
    g.position.y = breathe * 0.4
    g.position.z = z

    bodyMat.emissiveIntensity =
      glow + Math.sin(t * 1.1 + cycleOffset * 5) * 0.18 + (flare ? flare(t) : 0)
  })

  const skeleton = useMemo(
    () => ({ P }: { P: Proportions }) => {
      const t = getAnimTime()
      const u = ((t / cycle) + cycleOffset) % 1
      let active = bite(u, bowl, mouth, cycleOffset * 11)

      // Serving: you stop eating to do it, so the same hand leaves the bowl,
      // crosses, and comes back. Reusing the eating arm keeps the gesture
      // attached to a real shoulder instead of floating beside the figure.
      if (serveTo && serveAt) {
        const [s0, s1] = serveAt
        const k = 0.9 * ramp(t, s0, s0 + 1.3) * (1 - ramp(t, s1 - 1.0, s1))
        if (k > 0.001) active = mix3(active, serveTo, k)
      }

      // Head follows the hand up a little, and the spine straightens as the
      // bite goes in — the small mechanics of actually eating something.
      const up = clamp01((active[1] - bowl[1]) / Math.max(0.001, mouth[1] - bowl[1]))
      const rest: V3 = [restHand[0], restHand[1] + Math.sin(t * 0.8) * 0.006, restHand[2]]
      // Lean toward the middle of the table: −side in local space, and the
      // mirrored figure's local +x already points the same way as everyone
      // else's, so only the seat side matters here.
      const towards = leanTo ? leanTo(t) : 0
      const sideLean = -(Math.sign(x) || 1) * towards * 0.13
      const eat: V3 = mirrored ? [-active[0], active[1], active[2]] : active
      const off: V3 = mirrored ? [-rest[0], rest[1], rest[2]] : rest
      return buildDiner(P, {
        hipY,
        lean: 0.15 - up * 0.07,
        legs,
        leftHand: mirrored ? eat : off,
        rightHand: mirrored ? off : eat,
        headTilt: 0.05 - up * 0.05,
        sideLean,
      })
    },
    [cycle, cycleOffset, bowl, mouth, restHand, hipY, legs, mirrored, serveTo, serveAt, leanTo, x],
  )

  return (
    <group ref={groupRef} position={[x, 0, z]} rotation={[0, facing, 0]} scale={scale}>
      {/* pose/inPlace are redundant now that GoldFigure skips locomotion for
          skeleton-driven figures, but they stay as a statement of intent:
          these two are seated and they do not go anywhere. */}
      <GoldFigure
        kind={kind}
        pose="seated"
        inPlace
        skeleton={skeleton}
        material={bodyMat}
        castShadow
        hat={hat}
        hatTilt={hatTilt}
      />
    </group>
  )
}

// ════════════════════════════════════════════════════════════════════
// GENERAL FLOOR-SEATED FIGURE
// ════════════════════════════════════════════════════════════════════
/**
 * The same floor-sitting rig as <Diner>, but with both hands driven by the
 * caller instead of an eating cycle — for the beats where somebody kneels to
 * put a hand on a forehead, or hold out a bowl, or reach for a child.
 */
export type SeatedFigureProps = {
  kind: 'adult' | 'child'
  position?: V3
  /** Y rotation — figure forward is local +z. */
  facing?: number
  hipY?: number
  legs?: 'cross' | 'kneel' | 'stool'
  /** Forward lean of the spine at the shoulders. */
  lean?: number
  glow?: number
  /** Body colour; defaults to the signature amber the whole arc uses. */
  color?: string
  emissive?: string
  /** Per-frame hand targets in figure-local space. */
  hands: (t: number) => { left: V3; right: V3; headTilt?: number; sideLean?: number }
  /**
   * Headwear — and yes, indoors.
   *
   * Realism says you take your hat off at a table. This film says the
   * opposite, for a better reason: once the child has grown into the
   * parent's proportions, two gold figures at a low table are two gold
   * figures, and there is nothing else in the frame that tells you which is
   * which. The hat is the only difference drawn on the body that survives
   * both the growth and the distance, so it stays on indoors.
   */
  hat?: HatName
  hatTilt?: number
  /**
   * Cant the hat sideways — positive drops the brim on the wearer's LEFT.
   * A 삿갓's brim is wider than a head and a shoulder together, so a seated
   * figure filmed from anywhere above eye level is a hat with a body under
   * it; the roll is the only thing that takes the disc off the face.
   */
  hatRoll?: number
  /** Shrink the hat for close shots — see <GoldFigure hatScale>. */
  hatScale?: number
  /** Extra emissive over time (used for the caregiver's fade across Act 4). */
  glowOverTime?: (t: number) => number
  castShadow?: boolean
}

export function SeatedFigure({
  hat, hatTilt, hatRoll, hatScale,
  kind, position = [0, 0, 0], facing = 0, hipY = 0.18, legs = 'cross',
  lean = 0.15, glow = 1.25, color = '#FFB938', emissive = '#E89B1F',
  hands, glowOverTime, castShadow = true,
}: SeatedFigureProps) {
  const bodyMat = useMemo(
    () => new THREE.MeshStandardMaterial({
      color, emissive, emissiveIntensity: glow, roughness: 0.55, metalness: 0,
    }),
    [color, emissive, glow],
  )
  useEffect(() => () => bodyMat.dispose(), [bodyMat])

  useFrame(() => {
    bodyMat.emissiveIntensity = glowOverTime
      ? glowOverTime(getAnimTime())
      : glow + Math.sin(getAnimTime() * 1.1) * 0.12
  })

  const skeleton = useMemo(
    () => ({ P }: { P: Proportions }) => {
      const h = hands(getAnimTime())
      return buildDiner(P, {
        hipY,
        lean,
        legs,
        leftHand: h.left,
        rightHand: h.right,
        headTilt: h.headTilt ?? 0,
        sideLean: h.sideLean ?? 0,
      })
    },
    [hands, hipY, lean, legs],
  )

  return (
    <group position={position} rotation={[0, facing, 0]}>
      <GoldFigure
        kind={kind}
        pose="seated"
        inPlace
        skeleton={skeleton}
        material={bodyMat}
        castShadow={castShadow}
        hat={hat}
        hatTilt={hatTilt}
        hatRoll={hatRoll}
        hatScale={hatScale}
      />
    </group>
  )
}

/**
 * Somebody lying on their back on a floor mattress.
 *
 * The group origin is the *mattress surface* at the point the hips rest, and
 * local +z runs toward the head — so a caller only has to know where the bed
 * is, not how a body folds. Standing proportions are read off `P` and laid
 * flat: the distance hip→shoulder becomes a distance along the bed instead of
 * up the spine, which is what keeps a lying child unmistakably a child.
 *
 * There is no blanket in this pose and there is not supposed to be. The old
 * version drew a head and a stub of neck and let a capsule in the bedding
 * stand in for the rest, because an arm laid over a quilt read as a spike
 * growing out of the face. Take the quilt away and the body has to be real:
 * chest, arms down at the sides, knees a little apart, feet up.
 *
 * The anchor is the *head*, not the hips: position is the pillow, and the body
 * runs back along local −z from there. `pillowY` is how far the head is lifted
 * above the mattress.
 */
export function LyingFigure({
  kind = 'adult', position = [0, 0, 0], facing = 0, glow = 1.0,
  color = '#FFB938', emissive = '#E89B1F', pillowY = 0.075,
  /** Head rolled off centre toward local +x. Nobody sleeps face-up-square. */
  headTurn = 0.5,
  material,
  stillFrom, stillTo,
}: {
  kind?: 'adult' | 'child'
  position?: V3
  facing?: number
  glow?: number
  color?: string
  emissive?: string
  pillowY?: number
  headTurn?: number
  /** Body material override, for a figure whose colour is driven per frame
   *  (6.85 drains the grandmother from gold to grey as she dies). When given,
   *  `color`/`emissive`/`glow` are ignored. */
  material?: THREE.Material
  /**
   * THE BREATH STOPS across this window on the anim clock.
   *
   * Default is undefined — everybody lying down goes on breathing forever,
   * which is right for every sleeper this is used for. It is not right for
   * the one who dies: 6.85 flatlined her monitor at FLAT0 and her chest kept
   * rising for the rest of the scene, which quietly argued against the only
   * event the shot is built on. The oscillator damps to zero rather than
   * being switched off, so the chest SETTLES instead of snapping.
   */
  stillFrom?: number
  stillTo?: number
}) {
  const bodyMat = useMemo(
    () => new THREE.MeshStandardMaterial({
      color, emissive, emissiveIntensity: glow, roughness: 0.55,
    }),
    [color, emissive, glow],
  )
  useEffect(() => () => bodyMat.dispose(), [bodyMat])

  const skeleton = useMemo(
    () => ({ P }: { P: Proportions }) => {
      const t = getAnimTime()
      // Shallow, slow, and slightly uneven — someone asleep with a fever, not
      // someone at rest. The chest carries it; the hips barely move.
      const still = stillFrom === undefined ? 0
        : smooth(clamp01((t - stillFrom) / Math.max(1e-6, (stillTo ?? stillFrom) - stillFrom)))
      const breathe = (Math.sin(t * 0.8) * 0.55 + Math.sin(t * 1.9 + 1.1) * 0.16) * 0.011
        * (1 - still)

      const R = P.R
      const headR = P.RH * 0.86
      // Standing landmarks, laid flat down the bed. The head is the anchor —
      // z = 0 is the pillow — so an adult and a child on the same mattress both
      // have their head in the same place and differ at the feet, which is how
      // a shared bed actually works.
      const hipZ = -(P.HEAD_Y - P.HIP_Y + headR * 0.25)
      const shZ = hipZ + (P.SHOULDER_Y - P.HIP_Y)
      const legLen = P.HIP_Y - P.FOOT_Y

      const shHalf = R * 2.8
      const hipHalf = R * 1.3

      // Everything below the head rests within a body-radius of the mattress.
      const yBody = R * 1.05
      const yChest = yBody + R * 0.42 + breathe
      // On the pillow, denting it — sitting the head fully on top of the
      // pillow's height reads as balanced on a brick.
      const yHead = pillowY * 0.62 + headR * 0.86

      // Interpolate a radius profile expressed in multiples of R.
      const profile = (stops: number[]) => (u: number) => {
        const f = clamp01(u) * (stops.length - 1)
        const i0 = Math.min(stops.length - 1, Math.floor(f))
        const i1 = Math.min(stops.length - 1, i0 + 1)
        return R * (stops[i0] + (stops[i1] - stops[i0]) * (f - i0))
      }

      // A limb is ONE gauge along its whole length. The only thing that varies
      // is the very root, which swells to meet the trunk so the join is a
      // fillet instead of a socket — blended over `over`, then flat. Tapering
      // the whole limb reads as a wax model of an arm rather than an arm.
      const jointBlend = (base: number, root: number, over: number) => (u: number) =>
        R * (base + (root - base) * (1 - smooth(clamp01(u / over))))

      // ── Trunk: one tube from the hips to the shoulders, in at the waist and
      //    out across the chest.
      const trunkAt = (u: number) => v(
        0,
        yBody + (yChest - yBody) * smooth(u * 1.1),
        hipZ + (shZ - hipZ) * u,
      )
      const TRUNK_HIP_R = 1.5
      // Where the trunk stops. buildBody caps it with a sphere of its own
      // radius, so the cap's *surface* — not its centre — is the end of the
      // body, and the tube has to stop one radius short of the hips for the
      // two to be flush. Run it to u = 0 and that sphere hangs out past the
      // point where the legs branch, in the gap between them, as a stub.
      const trunkEnd = (R * TRUNK_HIP_R) / (shZ - hipZ)
      const trunk = [trunkEnd, 0.24, 0.40, 0.58, 0.76, 0.90, 1.0].map(trunkAt)
      const trunkR = profile([TRUNK_HIP_R, 1.40, 1.32, 1.42, 1.64, 1.84, 1.80, 1.62])

      // ── Neck, out of the top of the trunk and up onto the pillow. Its own
      //    curve, because it is the one part that has to be thin. Both ends are
      //    buried — one inside the chest, one inside the head.
      const neck = [
        v(0, yChest - R * 0.15, shZ - R * 0.2),
        v(headTurn * 0.015, (yChest + yHead) * 0.55, shZ * 0.5),
        v(headTurn * 0.02, yHead - headR * 0.2, -headR * 0.7),
      ]

      // ── Arms and legs BEGIN INSIDE THE TRUNK, on the centreline, and sweep
      //    out through its flank.
      //
      //    That is the whole trick for getting rid of the beads at the joints.
      //    buildBody caps every curve with a sphere of its own radius at each
      //    end, so a limb rooted *at* a shoulder always parks a ball there, and
      //    a cross-member to hang it off is just a second ball. Root the curve
      //    deep inside the body instead and that cap is swallowed whole. The
      //    first point of each limb is anatomy, not a joint — it must never
      //    move outboard.
      //
      //    Past the joint the limb is a constant gauge to the end, and the end
      //    cap is a hemisphere of that same gauge: a limb that thins toward the
      //    wrist looks like a model of a limb, not a limb.
      const arm = (side: number) => [
        v(side * R * 0.3, yChest - R * 0.35, shZ - R * 0.05),
        v(side * shHalf * 0.82, yBody + R * 0.42, shZ - R * 0.4),
        v(side * (shHalf + R * 0.28), yBody + R * 0.15, hipZ + (shZ - hipZ) * 0.52),
        v(side * (shHalf + R * 0.18), yBody + R * 0.05, hipZ + (shZ - hipZ) * 0.20),
        v(side * (shHalf + R * 0.08), yBody + R * 0.30, hipZ + legLen * 0.02),
      ]
      // The root swell runs out over the first ~third of the arm, which is
      // roughly where it clears the flank.
      const armR = jointBlend(0.66, 1.20, 0.30)

      // ── Legs: out of the hips, knees fallen slightly apart, ankles back
      //    together, feet up.
      const leg = (side: number) => [
        v(side * R * 0.25, yBody + R * 0.05, hipZ + R * 0.8),
        v(side * hipHalf, yBody, hipZ - R * 0.3),
        v(side * (hipHalf + R * 0.5), yBody + R * 0.25, hipZ - legLen * 0.42),
        v(side * (hipHalf + R * 0.1), yBody, hipZ - legLen * 0.86),
        v(side * hipHalf, yBody + R * 0.75, hipZ - legLen - R * 0.5),
      ]
      // A leg is much longer than an arm, so the same physical swell is a much
      // smaller fraction of the curve.
      const legR = jointBlend(0.78, 1.32, 0.15)

      return {
        curves: [
          { points: trunk, radius: trunkR, segments: 26 },
          { points: neck, radius: jointBlend(0.86, 1.15, 0.34), segments: 12 },
          { points: arm(-1), radius: armR, segments: 22 },
          { points: arm(+1), radius: armR, segments: 22 },
          { points: leg(-1), radius: legR, segments: 22 },
          { points: leg(+1), radius: legR, segments: 22 },
        ],
        // The head sits on the pillow, rolled a little off centre.
        spheres: [{ center: v(headTurn * headR * 0.28, yHead, 0), radius: headR }],
      }
    },
    [pillowY, headTurn, stillFrom, stillTo],
  )

  return (
    <group position={position} rotation={[0, facing, 0]}>
      <GoldFigure kind={kind} pose="seated" inPlace skeleton={skeleton}
        material={material ?? bodyMat} castShadow />
    </group>
  )
}
