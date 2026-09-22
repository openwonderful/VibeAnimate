/**
 * Act 5.1 — THE WAVE (~1:24 – 1:28)
 *
 * First light outside Act B's farmhouse. The child walks a few paces down the
 * road with the bundle, turns, and waves. The caregiver is already out by the
 * door and waves back. Both hands up across a distance that is already
 * growing.
 *
 * The caregiver's hand stays up one beat longer than the child's — and as it
 * stays up, their light goes DOWN: dimmer and older by the cut, the gold
 * aging toward ember while the child leaves bright. The door stays open.
 * That last detail is the one that matters — it is what makes Act 7's
 * return honest instead of redemptive.
 *
 * ── Where this happens ───────────────────────────────────────────────
 * Act B's valley, at Act B's farmhouse, on Act B's road — `ValleyStill`
 * mounted at world time 50: the sun is halfway up over the pass, the valley
 * is in its first warm light, and the house lamp has dimmed to a pilot
 * light. (The previous version was staged in the hand-built `sets/road`
 * lookalike — box hanok, blob hills, banded sky on a plane — which stopped
 * being this film the day Act B existed.) Act B's own walking pair is seven
 * kilometres down-valley at this hour: below the horizon of any shot framed
 * at the house.
 *
 * All figure pose math runs in FIGURE units (adult = 1.73) exactly as
 * before; only the group transforms are in world units (×20, road level
 * VALLEY_Y + 6.2).
 *
 * Four seconds: walk to ~1.15s, turn back by 1.6s, both hands up ~1.8s,
 * child's hand down ~2.6s, caregiver's at ~3.4s, and the child turned away
 * and walking again as the cut comes.
 */

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import * as THREE from 'three'

import { createScene } from '../createScene'
import { getAnimTime } from '../../hooks/useAnimTime'
import { GoldFigure, ADULT, buildPose, type PoseGeometry, type Proportions } from '../characters/goldFigure'
import { PARENT_HAT } from '../actB/valley'
import { ValleyStill } from '../actB/still'
import { VALLEY_Y, HOUSE_X, HOUSE_Z } from '../actB/flight'
import { smooth, clamp01, ramp, type V3 } from '../sets/hanok'
import { CARE_GOLD_55, BUNDLE_CLOTH } from './shared'

/** Act B road level for figures — the same y Act B's own pair walks at. */
const ROAD_Y = VALLEY_Y + 6.2
/** World scale: Act B's adult is 20× the figure rig's. */
const WS = 20

/** The door side of the house. Act B's Hanok faces down-valley (−z), lamp
 *  spilling at world z ≈ −444; the caregiver stands just outside it. */
const CARE_POS: V3 = [HOUSE_X + 6, ROAD_Y, HOUSE_Z - 52]
/** Where the child starts: at the edge of the yard, already leaving. */
const WALK_FROM_Z = HOUSE_Z - 74

/** Ground covered by one full walk cycle, in FIGURE units. */
const STEP_PER_CYCLE = 4 * ADULT.STRIDE

/** The child's hand on the bundle — pinned, so the bundle never swings free. */
const BUNDLE_HAND: V3 = [-0.28, 0.86, 0.05]

/**
 * Cross-fade two poses. Both come out of `buildPose` with the same five
 * curves of five points, so the blend is a straight per-point lerp — which
 * is what lets the walk settle into a stand instead of snapping to it.
 */
function lerpPose(a: PoseGeometry, b: PoseGeometry, k: number): PoseGeometry {
  if (k <= 0.001) return a
  if (k >= 0.999) return b
  return {
    curves: a.curves.map((c, i) => ({
      ...c,
      points: c.points.map((p, j) => p.clone().lerp(b.curves[i].points[j], k)),
    })),
    spheres: a.spheres.map((s, i) => ({
      ...s,
      center: s.center.clone().lerp(b.spheres[i].center, k),
    })),
  }
}

/**
 * The child walks AWAY from the house — down-valley, −z — so the figure
 * faces π and travel is negative z. Stride phase is DISTANCE covered / step
 * length (in figure units), so the feet are planted by the ground they
 * cover: the walk decelerates into the halt on its own and there is no
 * skating at either end. Legs blend to the standing pose while stopped, so
 * the wave is played standing still.
 */
const LOOK_BACK = Math.PI

function Child() {
  const posRef = useRef<THREE.Group>(null)
  const turnRef = useRef<THREE.Group>(null)
  const waveRef = useRef<V3>([0.3, 1.0, 0.1])
  const gaitRef = useRef({ phase: 0, walking: 1 })

  useFrame(() => {
    const t = getAnimTime()
    const walk1 = smooth(clamp01(t / 1.15))
    const walk2 = ramp(t, 3.15, 4.0)
    const turn = ramp(t, 1.15, 1.6) * (1 - ramp(t, 2.75, 3.15))
    const wave = ramp(t, 1.5, 1.8) * (1 - ramp(t, 2.35, 2.65))

    // Figure-unit distance walked; world translation is ×20 down the road.
    const dist = walk1 * 1.1 + walk2 * 1.1
    gaitRef.current.phase = dist / STEP_PER_CYCLE
    // 1 while the feet are moving, 0 across the turn-and-wave.
    gaitRef.current.walking = clamp01(1 - ramp(t, 0.95, 1.3) + ramp(t, 3.15, 3.45))

    if (posRef.current) posRef.current.position.z = WALK_FROM_Z - dist * WS
    if (turnRef.current) turnRef.current.rotation.y = turn * LOOK_BACK

    // Hand goes up and shakes; drops before the caregiver's does.
    // The raised target sits out to the SIDE at head height, inside the
    // arm's actual reach (|target − shoulder| < P.ARM = 0.55): overhead-in-
    // front put it 0.67 out, and the pinned arm stretched to cover it —
    // which read as the arm growing and shrinking with every beat.
    const up = wave
    waveRef.current = [
      0.30 + up * 0.06 + Math.sin(t * 11) * 0.07 * up,
      0.98 + up * 0.80,
      0.08 - up * 0.02,
    ]
  })

  const skeleton = useMemo(() => ({ P }: { P: Proportions }) => {
    const { phase, walking } = gaitRef.current
    const input = {
      P,
      phase: phase - Math.floor(phase),
      leftHandAt: BUNDLE_HAND,
      rightHandAt: waveRef.current,
      // Two bones of fixed length — without this the elbow is interpolated
      // and the limb stretches to wherever the hand is.
      solvedArms: true,
    }
    return lerpPose(buildPose('standing', input), buildPose('walking', input), walking)
  }, [])

  return (
    <group ref={posRef} position={[HOUSE_X - 20, ROAD_Y, WALK_FROM_Z]}>
      {/* Facing down the road (−z); the look-back swings from there. */}
      <group rotation={[0, Math.PI, 0]} scale={WS}>
        <group ref={turnRef}>
          <GoldFigure skeleton={skeleton} material="goldAmber" glow={1.9} castShadow />
          {/* Bundle in the other hand. */}
          <mesh position={[-0.32, 0.66, 0.05]} castShadow>
            <boxGeometry args={[0.24, 0.28, 0.20]} />
            <meshStandardMaterial color={BUNDLE_CLOTH} roughness={0.95} />
          </mesh>
        </group>
      </group>
    </group>
  )
}

/**
 * The caregiver does not lower their hand and go back inside — their LIGHT
 * GOES DOWN where they stand, hand still up: ember versus spark. This is
 * the "telling the pair apart" deck's light channel, run inside one shot —
 * the parent's gold dims toward the aged palette (#C98B2C mid, dim .55)
 * with the deck's soft gutter riding on it (a slow sinusoidal sag, flicker
 * .34 — an intensity modulation, NEVER a visibility toggle). They are still
 * there at the cut: dimmer, older, hand up.
 */
const DIM_START = 1.8
const DIM_END = 2.9
/** The aged parent's emission, from the differentiation deck. */
const CARE_GOLD_AGED = new THREE.Color('#C98B2C')

function CaregiverAtDoor() {
  const waveRef = useRef<V3>([0.26, 0.98, 0.1])
  const emissive = useMemo(() => ({
    young: new THREE.Color(CARE_GOLD_55),
    now: new THREE.Color(CARE_GOLD_55),
  }), [])
  // Hotter than the 0.95 this used to run at. The caregiver stands in front of
  // the lit facade, and the facade is a big flat panel of the same hue they
  // are: the only thing that can separate them from it is being brighter than
  // it. See the header note on legibility.
  const bodyMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: CARE_GOLD_55, emissive: CARE_GOLD_55,
    emissiveIntensity: 1.5, roughness: 0.6,
  }), [])

  useFrame(() => {
    const t = getAnimTime()
    // Up before the child's, and never seen to come down.
    // Same side-of-the-body wave as the child's, but LOWER and WIDER: the
    // 삿갓's brim is 0.42 out from the head axis, and a hand raised to head
    // height disappears under it — reads as holding the hat on. Shoulder
    // height, clear of the brim, still inside the arm's 0.55 reach.
    const up = ramp(t, 1.3, 1.65)
    waveRef.current = [
      0.26 + up * 0.20 + Math.sin(t * 9) * 0.06 * up,
      0.94 + up * 0.64,
      0.06,
    ]

    // The dimming. Deterministic, continuous, no visibility toggles: the
    // deck's gutter is a slow product-of-sines sag, so the light breathes
    // down rather than blinking. `u` is how far into the aging we are.
    const u = ramp(t, DIM_START, DIM_END)
    const gutterSag = 0.5 + 0.5 * Math.sin(t * 11.3 + 1.7) * Math.sin(t * 4.1)
    const dim = (1 - u * 0.45) * (1 - u * 0.34 * gutterSag)
    bodyMat.emissiveIntensity = 1.5 * dim
    // …and the hue ages with the level: toward the deck's #C98B2C.
    emissive.now.copy(emissive.young).lerp(CARE_GOLD_AGED, u * 0.8)
    bodyMat.emissive.copy(emissive.now)
  })

  // Facing down the road after the child — the two of them have to be
  // facing each other for the wave to be a wave.
  return (
    <group position={CARE_POS} rotation={[0, Math.PI - 0.2, 0]} scale={WS * 0.9}>
      <GoldFigure
        pose="standing"
        castShadow
        material={bodyMat}
        rightHandAt={waveRef}
        solvedArms
        hat={PARENT_HAT}
      />
    </group>
  )
}

/**
 * ── The frame, and why it is off the road ────────────────────────────
 *
 * This shot used to sit ON the road axis, down-valley of the house, looking
 * straight back up it. That put both figures dead in front of the facade —
 * and the facade is a flat panel of lamp-lit ochre, which is the same hue and
 * very nearly the same value as the two gold people standing on it. Add the
 * lamp's ground pool filling the bottom third and the whole frame was one
 * wash: you could not read the wave, you could not read the 삿갓, and you
 * could not see the child leave.
 *
 * The fix is staging, not exposure. From the paddy side of the road, looking
 * back up it, the house falls to frame LEFT and the child walks out against
 * the dark range and sky at frame RIGHT — so the raised arm, the bundle and
 * the walk away all read against black. The caregiver keeps the facade behind
 * them, which is why they got hotter (above) and why the bloom came down.
 *
 * Camera height is deliberately just below head height: it puts both heads
 * above the horizon line, and it drops the power line into the top corner
 * instead of drawing three heavy cables across both faces.
 */
const CAM_A: V3 = [HOUSE_X + 75, ROAD_Y + 7.8, HOUSE_Z - 180]
const CAM_TGT_A: V3 = [HOUSE_X - 6, ROAD_Y + 27.8, HOUSE_Z - 62]

export default createScene({
  background: '#1A2238',
  three: {
    camera: {
      position: CAM_A,
      fov: 38,
      // Act B's world is kilometres deep; the far plane has to clear the
      // ridge behind the valley or the range disappears.
      near: 1,
      far: 24000,
    },
    gl: {
      antialias: true,
      toneMapping: THREE.ACESFilmicToneMapping,
      // Was 1.12. The lamp pool on the road clipped at that, and a clipped
      // highlight next to an emissive figure is what removed the silhouette.
      toneMappingExposure: 0.96,
    },
    shadows: true,
    onCreated: ({ camera }) => camera.lookAt(...CAM_TGT_A),
    debugTarget: CAM_TGT_A,
  },
  // A slow drift out and back, so the growing distance is in the camera too.
  cameraMoves: [{
    a: { pos: CAM_A, target: CAM_TGT_A, fov: 38 },
    b: {
      pos: [HOUSE_X + 88, ROAD_Y + 9.4, HOUSE_Z - 196],
      target: [HOUSE_X - 9, ROAD_Y + 27.4, HOUSE_Z - 68],
      fov: 38,
    },
    t0: 0,
    t1: 4,
    ease: 'inout',
  }],
}, function Act5_1() {
  return (
    <>
      {/* Dawn over the whole valley: sun halfway up the pass, first warm
          light on the paddies, house lamp down to a pilot light. */}
      <ValleyStill at={50} night={false} />

      <CaregiverAtDoor />
      <Child />

      <EffectComposer>
        {/* Threshold 0.88, not 0.64. At 0.64 the lamp-lit facade itself was
            over the line, so the bloom was not haloing the figures against the
            wall — it was haloing the wall too, and the two merged. */}
        <Bloom intensity={0.34} luminanceThreshold={0.88} luminanceSmoothing={0.3} mipmapBlur />
        <Vignette eskil={false} offset={0.28} darkness={0.55} />
      </EffectComposer>
    </>
  )
})
