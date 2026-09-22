/**
 * Act 4.9 — PIGGYBACK INVERSION (~1:23, the payoff of the whole act)
 *
 * In Act 3.2 the caregiver carried the sleeping child home on their back, up
 * the dark road to the lit door. This is that image with the roles swapped:
 * the child is grown now, and it is the caregiver — smaller than they used to
 * be, and dimmer — riding on the grown child's back, carried up the same road
 * toward the same door. One second, one read: *now he carries her.*
 *
 * ── Where this happens ───────────────────────────────────────────────
 * Act B's valley, on Act B's road, walking toward Act B's farmhouse — the
 * same world every other beat of this act now lives in (`ValleyStill`, world
 * units, adult = 34.6 tall). The camera sits low behind the pair looking up
 * the road at the lit door, which is Act B's own framing of the original
 * carry at 1:16 — so the quote is exact: same road, same house, same
 * bearing, opposite carrier.
 *
 * `at={66}`: night has fallen, the house lamp is the brightest thing in the
 * valley, and Act B's own walking pair is guaranteed off the road (they hide
 * for 64 ≤ t < 76, and this beat lives inside that window).
 *
 * (The previous version had no piggyback in it at all — two figures walking
 * beside a cloth bundle, staged in a hand-built lookalike set. The title had
 * to be explained to be seen, which for a one-second beat means it wasn't
 * there.)
 */

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import * as THREE from 'three'

import { createScene } from '../createScene'
import { getAnimTime } from '../../hooks/useAnimTime'
import {
  GoldFigure, v, ADULT, buildPose, buildHat,
  type Proportions, type PoseGeometry,
} from '../characters/goldFigure'
import { PARENT_HAT } from '../actB/valley'
import { ValleyStill } from '../actB/still'
import { VALLEY_Y } from '../actB/flight'
import { CARE_GOLD_48 } from '../act5/shared'

/** Act B road level for figures — the same y Act B's own pair walks at. */
const ROAD_Y = VALLEY_Y + 6.2
/** Where on the road the beat happens: the last stretch before the yard,
 *  close enough that the lit door is a destination, not a rumour. */
const WALK_Z0 = -585
/** Ground covered in the one second — Act B's own gait speed, near enough. */
const WALK_DIST = 12

const CARE_SCALE = 0.88          // shorter than the grown child, and shrinking

/**
 * Where the rider's HIPS sit, in carrier units: high on the carrier's back,
 * close in. This was z = -0.30, a third of a body length behind a spine
 * whose tube is 0.05 thick — the rider was riding a hand's breadth of air.
 * The rider skeleton below is authored with its hips at the origin, so this
 * point places the whole body.
 */
const RIDER_HIP: [number, number, number] = [0, 0.98, -0.24]
/**
 * Which shoulder the rider's head is over: -1 is the carrier's left, which
 * is the side this camera is on. A head laid on the far shoulder is a head
 * behind a body.
 */
const RIDER_SIDE = -1
/** Where the carrier's hands end up, hooked under the rider's knees. Derived
 *  below from the rider's own knee, so the grip cannot drift off it. */
const KNEE_LOCAL = v(0.23, -0.02, 0.36)
/**
 * Her outboard hand, hanging — and what is in it.
 *
 * The 삿갓 came OFF, and this is the only honest answer to the note about it.
 * The brim is 0.42 in radius on a rig whose head is 0.16, so worn it is a
 * disc a metre across sitting between two heads that are 0.46 apart: no
 * tilt takes it off the carrier (a tilt about the wearer's x leaves the
 * brim's reach along x exactly where it was, and x is the axis he is on),
 * and the roll that does take it off him swings the whole face of it into
 * the lens and hides both of them instead. Every arrangement of a worn hat
 * in this pose is either clipping him or covering him.
 *
 * A hat carried in the hand of the person being carried is clear of
 * everything by 0.14 at the nearest, and it is also simply what happens:
 * you take your hat off to be picked up. It reads as the second body, too —
 * a round thing swinging at the pair's side is the one part of her that is
 * unambiguously not him.
 */
const HAND_HAT = v(RIDER_SIDE * 0.55, 0.15, 0.28)
/** …and how far below that hand the thing itself hangs. Hats hang from the
 *  hand holding them; a brim centred ON the hand is a wheel bolted to a
 *  wrist, and at this size it covers both of them. */
const HAT_DROP = 0.30

/**
 * A piggyback rider. None of the rig's presets can do this — 'seated-drape'
 * was built for a child on SHOULDERS, and its legs stick straight out
 * sideways at the carrier's back like handlebars. What a back-carry actually
 * looks like: chest pressed against the carrier's back, arms coming forward
 * OVER the shoulders to rest on the chest, thighs forward along the
 * carrier's flanks, shins hanging.
 *
 * ── The head is the whole bug ────────────────────────────────────────
 * It used to sit at (0.06, 0.70, 0.33), which puts it 0.23 from the
 * carrier's head — and the two skulls are 0.16 and 0.14 in radius, so they
 * INTERSECTED. Two heads merged into one lump is why the beat read as a lone
 * walker in two separate contact sheets, and it is why the 삿갓 on top of it
 * was cutting through the carrier: a hat cannot clear a head its wearer is
 * standing inside.
 *
 * So the upper body is canted outboard and the head is laid right over onto
 * the carrier's far shoulder — 0.36 clear now — which is both where a
 * dozing head actually goes and the only place in this pose where a head can
 * be seen at all. The neck is carried in the spine, because a head that far
 * off the shoulder line with nothing between them is a ball floating beside
 * a body.
 */
function riderSkeleton({ P }: { P: Proportions }): PoseGeometry {
  const R = P.R

  const k = RIDER_SIDE
  const hip = v(0, 0, 0)
  const shoulder = v(k * 0.20, 0.50, 0.10)   // riding on the carrier's back
  const head = v(k * 0.42, 0.54, 0.34)       // laid right over on his shoulder
  const neck = shoulder.clone().lerp(head, 0.6)

  const spine = [
    hip,
    v(k * 0.04, 0.18, 0.02),
    v(k * 0.11, 0.35, 0.06),
    shoulder,
    neck,
  ]

  /**
   * The inboard arm goes over the carrier's shoulder line and down onto his
   * chest, which is how you hold on. The outboard one hangs, because it has
   * the hat in it — see `HELD_HAT`.
   */
  const arm = (s: number) => {
    const sh = v(k * 0.20 + s * 0.05, 0.50, 0.10)
    if (s === k) {
      const elbow = v(k * 0.30, 0.28, 0.24)
      return [sh, sh.clone().lerp(elbow, 0.5), elbow, elbow.clone().lerp(HAND_HAT, 0.5), HAND_HAT]
    }
    const over = v(k * 0.10 + s * 0.13, 0.60, 0.30)
    const hand = v(k * 0.04 + s * 0.15, 0.40, 0.28)
    return [sh, sh.clone().lerp(over, 0.5), over, over.clone().lerp(hand, 0.5), hand]
  }

  /** Thigh forward along the carrier's flank, shin hanging. */
  const leg = (s: number) => {
    const h = v(s * 0.10, 0, 0.04)
    const knee = v(s * KNEE_LOCAL.x, KNEE_LOCAL.y, KNEE_LOCAL.z)
    const ankle = v(s * 0.25, -0.42, 0.40)
    return [h, h.clone().lerp(knee, 0.5), knee, knee.clone().lerp(ankle, 0.5), ankle]
  }

  return {
    curves: [
      { points: spine, radius: R, segments: 14 },
      { points: arm(-1), radius: R * 0.9, segments: 14 },
      { points: arm(+1), radius: R * 0.9, segments: 14 },
      { points: leg(-1), radius: R, segments: 14 },
      { points: leg(+1), radius: R, segments: 14 },
    ],
    spheres: [{ center: head, radius: P.RH }],
  }
}

/**
 * The hat itself, hanging from that hand.
 *
 * `buildHat` is the same call `GoldFigure` makes for a worn one, so this is
 * the film's 삿갓 B and not a lookalike — same shell, same twenty hoops and
 * thirty-four rows of stitching. It is just mounted on a hand instead of a
 * head, tipped over so it hangs by the rim with its crown out.
 */
function HeldHat({ mat }: { mat: THREE.Material }) {
  const built = useMemo(() => buildHat(PARENT_HAT, ADULT.RH), [])
  const shellMat = useMemo(() => {
    const src = mat as THREE.MeshStandardMaterial
    const m = src.clone()
    m.emissiveIntensity = src.emissiveIntensity * built.shellDim
    m.roughness = Math.min(1, src.roughness + 0.25)
    m.side = THREE.DoubleSide
    return m
  }, [mat, built])
  useMemo(() => () => shellMat.dispose(), [shellMat])

  // Tipped almost onto its side. The angle is not free: a 0.42 disc held
  // beside a body is either edge-on to this camera or it is a wheel over the
  // middle of frame, and 1.75 with no roll puts it 22° off edge-on — an
  // ellipse you can read as a hat, through which you can still see the two
  // of them.
  return (
    <group
      position={[HAND_HAT.x, HAND_HAT.y - HAT_DROP, HAND_HAT.z]}
      rotation={[1.75, 0, 0]}
    >
      <mesh geometry={built.shell} material={shellMat} castShadow />
      <mesh geometry={built.trim} material={mat} castShadow />
    </group>
  )
}

/* ══ The carrier ════════════════════════════════════════════════════ */

/**
 * His rig, under a load.
 *
 * ADULT walks 4*STRIDE per CYCLE = 0.72 rig units a second, and this pair
 * covers 12 world units a second at scale 20 — 0.6. The legs were cycling
 * 20% faster than the road was going past. Shorter steps and a slower cycle
 * is also what a carry looks like, so the fix and the characterisation are
 * the same edit: 0.69 of ground per 1.15s cycle is exactly WALK_DIST.
 */
const CARRY_CYCLE = 1.15
const CARRIER: Proportions = {
  ...ADULT,
  STRIDE: (WALK_DIST / 20) * CARRY_CYCLE / 4,
}
const PER_CYCLE = 4 * CARRIER.STRIDE
/** Both hands hooked back under the rider's knees. */
const GRIP_L: [number, number, number] = [
  RIDER_HIP[0] - KNEE_LOCAL.x * CARE_SCALE,
  RIDER_HIP[1] + (KNEE_LOCAL.y - 0.03) * CARE_SCALE,
  RIDER_HIP[2] + (KNEE_LOCAL.z - 0.04) * CARE_SCALE,
]
const GRIP_R: [number, number, number] = [
  RIDER_HIP[0] + KNEE_LOCAL.x * CARE_SCALE,
  GRIP_L[1], GRIP_L[2],
]

/**
 * They walk at an angle across the road — drifting toward the yard path — so
 * the camera, sitting near the road axis, sees the carry in three-quarter
 * profile. Square from behind, the rider disappears into the carrier's
 * silhouette and the whole beat is a figure with lumps, which is exactly
 * what two contact sheets and the director all read it as.
 *
 * -0.25 was not enough of an angle to do the job: at 14° off the lens axis a
 * body on a back is still behind that back. This is 49°, and it is the pair
 * that turns rather than the camera, because the camera cannot go round
 * without taking the lit door — the thing they are walking TOWARD, and the
 * whole point of putting the beat on this road — off the back of frame.
 */
const WALK_HEADING = -0.85

function CarriedPair() {
  const groupRef = useRef<THREE.Group>(null)
  const phase = useRef(0.2)
  const riderMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: CARE_GOLD_48, emissive: CARE_GOLD_48,
    emissiveIntensity: 1.05, roughness: 0.6,
  }), [])

  // The carrier's legs run off the ground he has covered rather than off the
  // clock, so the road stays still under the planted foot.
  const carrier = useMemo(() => () => buildPose('walking', {
    P: CARRIER,
    phase: phase.current,
    leftHandAt: GRIP_L,
    rightHandAt: GRIP_R,
    headForwardTilt: 0.10,
  }), [])

  useFrame(() => {
    const t = getAnimTime()
    const dist = WALK_DIST * t
    phase.current = 0.2 + dist / (20 * PER_CYCLE)
    if (groupRef.current) {
      // Travel along the facing, so the stride and the ground agree.
      groupRef.current.position.x = -12 + Math.sin(WALK_HEADING) * dist
      groupRef.current.position.z = WALK_Z0 + Math.cos(WALK_HEADING) * dist
      // The rider's weight: the carrier's step reads in a slow two-beat sway
      // the rider shares, because they are one load now. On the step, not on
      // a rate of its own.
      groupRef.current.rotation.z = Math.sin(phase.current * 2 * Math.PI) * 0.014
    }
  })

  return (
    <group ref={groupRef} position={[-12, ROAD_Y, WALK_Z0]} rotation={[0, WALK_HEADING, 0]}>
      {/* Facing up the road toward the house, quartered away from the lens. */}
      <group scale={20} rotation={[0.05, 0, 0]}>
        {/* The grown child, carrying: walking, leaning into the load, both
            hands hooked back under the rider's knees. */}
        <GoldFigure
          skeleton={carrier} material="goldAmber" glow={1.5} castShadow
        />
        {/* The caregiver, carried — with her hat in her hand. See HAND_HAT. */}
        <group position={RIDER_HIP} scale={CARE_SCALE}>
          <GoldFigure skeleton={riderSkeleton} material={riderMat} castShadow />
          <HeldHat mat={riderMat} />
        </group>
      </group>
    </group>
  )
}

export default createScene({
  background: '#0B1020',
  three: {
    camera: {
      // Still on the road, still looking up it at the door — the pair is
      // what turned (see WALK_HEADING). Closer and lower than it was, so a
      // 1.7s beat about two bodies is not played at 60% of frame height.
      //
      // Do NOT swing this camera out to the side to get the angle instead.
      // Act B's poles stand at x = 51 every 190 units and the roadside set
      // is scattered along both verges; from off the road's west shoulder a
      // pole lands squarely behind the pair and a persimmon tree fills the
      // right half of frame. Tried, rendered, black.
      position: [-40, ROAD_Y + 26, WALK_Z0 - 62],
      fov: 42,
      // Act B's world is kilometres deep; the far plane has to clear the
      // ridge behind the valley or the range disappears.
      near: 1,
      far: 24000,
    },
    gl: {
      antialias: true,
      toneMapping: THREE.ACESFilmicToneMapping,
      toneMappingExposure: 1.06,
    },
    shadows: true,
    onCreated: ({ camera }) => camera.lookAt(-16, ROAD_Y + 16, WALK_Z0 + 8),
    debugTarget: [-16, ROAD_Y + 16, WALK_Z0 + 8],
  },
}, function Act4_9() {
  return (
    <>
      {/* `people={false}`: Act B's own two walkers are on this road at world
          time 66 — and at 66 the parent is CARRYING the child, so leaving
          them on put a second piggyback in the background of a shot about
          one. `still.tsx` warns about exactly this; only 72 ≤ t < 84 is
          guaranteed empty. */}
      <ValleyStill at={66} people={false} />
      <CarriedPair />

      <EffectComposer>
        <Bloom intensity={0.62} luminanceThreshold={0.62} luminanceSmoothing={0.4} mipmapBlur />
        <Vignette eskil={false} offset={0.22} darkness={0.62} />
      </EffectComposer>
    </>
  )
})
