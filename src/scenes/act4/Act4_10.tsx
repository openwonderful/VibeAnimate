/**
 * Act 4.10 — THE PAT (~1:23, the climax of the act)
 *
 * The child is grown and taller now. The caregiver reaches up — *has to reach
 * up* — and the child, seeing it, dips: knees soft, head bowed, receiving the
 * pat the way you receive a blessing. The hand lands ON TOP of the bowed head
 * — the same gesture from when the child was small, inverted by scale. The
 * child sees the caregiver's gold properly for the first time in years, and it
 * is dimmer than they remembered.
 *
 * TIMING: 1.8 seconds (funded from 4.5's doorway hold — see timeline.ts).
 * The child settles into the bow over the first ~0.3s while the hand rises;
 * then three unhurried pats at ~0.5, ~1.0 and ~1.5, the last one lingering.
 * The child holds still through all three — just breathing — because the
 * stillness is what makes the hand's motion the whole event.
 *
 * The crown of the head and the hand that pats it are both computed from the
 * same two curves (`patCurve`, `crouchAmount`), so the hand cannot land beside
 * the head — the defect this file used to have: a fully-upright child whose
 * crown was out of the caregiver's reach, with the "pat" arriving at ear
 * height on the side of the head.
 *
 * Same room as 3.3 and the rest of Act 4, with the door open behind them onto
 * the road the child is about to walk down.
 */

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import * as THREE from 'three'

import { createScene } from '../createScene'
import { getAnimTime } from '../../hooks/useAnimTime'
import {
  GoldFigure, ADULT, v, type Proportions, type PoseGeometry,
} from '../characters/goldFigure'
import { PARENT_HAT } from '../actB/valley'
import {
  HanokShell, HanokDressing, HanokLighting, Soban,
  NIGHT, ramp, smooth, TABLE_TOP,
} from '../sets/hanok'
import { CARE_GOLD_51, BUNDLE_CLOTH } from '../act5/shared'

const CHILD_X = 0.38
const CHILD_ROT = -1.15          // bowing toward the caregiver, in three-quarter
const CARE_X = -0.26
const CARE_ROT = 0.9
const CARE_SCALE = 0.88          // shorter than the grown child, and shrinking
const FIGURE_Z = -0.55

const UP = new THREE.Vector3(0, 1, 0)
const CARE_POS = new THREE.Vector3(CARE_X, 0, FIGURE_Z)

/**
 * Three unhurried pats — soft press, soft release, a beat apart. The last
 * one lingers a touch longer: it is the one that means *go*. (The first cut
 * of this ran two snappy 80ms taps and read as drumming on the child.)
 */
function patCurve(t: number) {
  const rise = smooth(Math.min(1, t / 0.52))
  const pat =
    ramp(t, 0.58, 0.74) * (1 - ramp(t, 0.80, 1.00)) * 0.85 +
    ramp(t, 1.06, 1.20) * (1 - ramp(t, 1.26, 1.44)) * 0.9 +
    ramp(t, 1.48, 1.62)
  return { rise, pat }
}

/** The child's dip — an unhurried settle as the caregiver's hand rises. */
function crouchAmount(t: number) {
  return smooth(Math.min(1, t / 0.55))
}

/**
 * Where the bowed child's head is, in child-local space. Single source of
 * truth: the child's skeleton puts the head here, and the caregiver's hand
 * target is derived from it, so the pat always lands on the crown.
 */
function childHeadLocal(t: number) {
  const crouch = crouchAmount(t)
  const torso = ADULT.SHOULDER_Y - ADULT.HIP_Y
  const neck = ADULT.HEAD_Y - ADULT.SHOULDER_Y
  const hipY = ADULT.HIP_Y - 0.18 * crouch
  const shoulderY = hipY + torso * (1 - 0.08 * crouch)
  const shoulderZ = 0.12 * crouch
  // The head does NOT give under the pats. It bows once and then holds
  // still — the stillness is what lets the hand do the talking.
  return {
    y: shoulderY + neck * (1 - 0.40 * crouch),
    z: shoulderZ + 0.06 * crouch + 0.03,
  }
}

/** Same point in world space, through the child group's transform. */
function childHeadWorld(t: number): THREE.Vector3 {
  const { y, z } = childHeadLocal(t)
  return new THREE.Vector3(0, y, z)
    .applyAxisAngle(UP, CHILD_ROT)
    .add(new THREE.Vector3(CHILD_X, 0, FIGURE_Z))
}

function Caregiver() {
  const handRef = useRef<[number, number, number]>([0.13, 0.92, 0.02])

  useFrame(() => {
    const t = getAnimTime()
    const { rise, pat } = patCurve(t)
    // The crown of the bowed head, in world space; the hand hovers a breath
    // above it and presses down to it on each pat.
    const head = childHeadWorld(t)
    const target = new THREE.Vector3(
      head.x,
      head.y + ADULT.RH + 0.055 - pat * 0.055,
      head.z,
    )
    // Into caregiver-local space (the group below is translated, rotated,
    // scaled — undo in reverse order).
    target.sub(CARE_POS).divideScalar(CARE_SCALE).applyAxisAngle(UP, -CARE_ROT)
    // Blend up from the resting hand at the side.
    const rest = new THREE.Vector3(0.13, 0.92, 0.02)
    rest.lerp(target, rise)
    handRef.current = [rest.x, rest.y, rest.z]
  })

  return (
    <group position={[CARE_X, 0, FIGURE_Z]} rotation={[0, CARE_ROT, 0]} scale={CARE_SCALE}>
      <GoldFigure
        pose="standing"
        material={new THREE.MeshStandardMaterial({
          color: CARE_GOLD_51, emissive: CARE_GOLD_51,
          emissiveIntensity: 0.85, roughness: 0.6,
        })}
        rightHandAt={handRef}
        castShadow
        hat={PARENT_HAT}
        hatTilt={-0.3}
      />
    </group>
  )
}

/**
 * Standing, then dipping: knees soften, hips sink and sit back, the spine
 * rounds forward and the head bows — deep enough that the shorter caregiver's
 * hand can rest on the crown. The head still gives a little under each pat
 * (that lives in `childHeadLocal`, so the hand rides it down).
 */
function bowedSkeleton({ P, t }: { P: Proportions; t: number }): PoseGeometry {
  const crouch = crouchAmount(t)
  const torso = P.SHOULDER_Y - P.HIP_Y
  const legLen = P.HIP_Y - P.FOOT_Y
  const armLen = 0.55

  // Normal breathing, nothing more: the chest rises a centimetre and
  // settles, twice over the beat. The head is deliberately NOT on this —
  // it holds still under the hand.
  const breathe = Math.sin(t * 2.6) * 0.005

  const hipY = P.HIP_Y - 0.18 * crouch
  const hip = v(0, hipY, -0.05 * crouch)
  const shoulder = v(0, hipY + torso * (1 - 0.08 * crouch) + breathe, 0.12 * crouch + breathe * 0.4)
  const headAt = childHeadLocal(t)
  const head = v(0, headAt.y, headAt.z)

  // The trunk runs PAST the shoulder into the head — that stub is the neck.
  // The shared spine (`buildSpinePoints`) carries 0.17 above SHOULDER_Y for
  // exactly this reason; this pose used to stop at the shoulder, and with a
  // head sphere of RH=0.16 sitting 0.26 higher, the crown floated free of the
  // body for the first third of a second — until the bow dropped it far
  // enough for the sphere to swallow the shoulder. Aim the stub at the head
  // instead of straight up, so it bends with the bow.
  const spine = [
    hip,
    v(0, hip.y + torso * 0.33, hip.z + (shoulder.z - hip.z) * 0.22),
    v(0, hip.y + torso * 0.66, hip.z + (shoulder.z - hip.z) * 0.62),
    shoulder,
    shoulder.clone().lerp(head, 0.66),
  ]

  // Knees bend forward as the hips sit back — the counterweight of a crouch.
  const leg = (s: number) => {
    const knee = v(
      s * 0.06,
      hipY - legLen * (0.46 - 0.04 * crouch),
      hip.z + 0.10 * crouch,
    )
    const foot = v(s * 0.05, P.FOOT_Y, 0.01)
    return [hip, hip.clone().lerp(knee, 0.5), knee, knee.clone().lerp(foot, 0.5), foot]
  }

  // Arms stay at the sides — the child receives the pat, they don't return it.
  const arm = (s: number) => {
    const sh = v(s * 0.02, shoulder.y, shoulder.z)
    const elbow = v(s * 0.11, shoulder.y - armLen * 0.5, shoulder.z * 0.4)
    const hand = v(s * 0.10, shoulder.y - armLen, 0.0)
    return [sh, sh.clone().lerp(elbow, 0.4), elbow, elbow.clone().lerp(hand, 0.5), hand]
  }

  return {
    curves: [
      { points: spine, radius: P.R, segments: 16 },
      { points: arm(-1), radius: P.R, segments: 14 },
      { points: arm(+1), radius: P.R, segments: 14 },
      { points: leg(-1), radius: P.R, segments: 16 },
      { points: leg(+1), radius: P.R, segments: 16 },
    ],
    spheres: [{ center: head, radius: P.RH }],
  }
}

function GrownChild() {
  return (
    <group position={[CHILD_X, 0, FIGURE_Z]} rotation={[0, CHILD_ROT, 0]}>
      <GoldFigure
        skeleton={bowedSkeleton}
        material="goldAmber"
        glow={1.5}
        castShadow
      />
    </group>
  )
}

function SceneBody() {
  return (
    <>
      <color attach="background" args={[NIGHT]} />
      <fog attach="fog" args={['#160C06', 5, 12]} />

      <HanokLighting warm={0.95} moon={1.0} ambient={0.16} />
      <HanokShell />
      <HanokDressing threshold={false} />

      {/* The table from 3.3, cleared except for the wrapped food bundle the
          caregiver is sending with them. */}
      <group position={[0.98, 0, 0.34]} rotation={[0, -0.3, 0]}>
        <Soban />
        <mesh position={[0.06, TABLE_TOP + 0.09, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.30, 0.20, 0.26]} />
          <meshStandardMaterial color={BUNDLE_CLOTH} roughness={0.95} />
        </mesh>
        {/* Knot on top */}
        <mesh position={[0.06, TABLE_TOP + 0.20, 0]} rotation={[0, 0.5, 0]} castShadow>
          <boxGeometry args={[0.13, 0.05, 0.09]} />
          <meshStandardMaterial color={BUNDLE_CLOTH} roughness={0.95} />
        </mesh>
      </group>

      <Caregiver />
      <GrownChild />
    </>
  )
}

export default createScene({
  background: NIGHT,
  three: {
    /**
     * Low, and looking slightly UP.
     *
     * From 1.34 looking down at 1.02 the ceiling beams ran straight across
     * the caregiver's head and the 삿갓 was cut in half by one of them — the
     * brim is the widest silhouette in the film and it cannot afford to
     * share a line with anything. Dropping the lens under the hat and tilting
     * up puts the whole brim against the lit shoji and takes the beams out of
     * the top of frame. The hat wins the frame; the room can have the rest.
     */
    camera: { position: [0.30, 1.00, 2.16], fov: 44, near: 0.05, far: 40 },
    gl: {
      antialias: true,
      toneMapping: THREE.ACESFilmicToneMapping,
      toneMappingExposure: 1.06,
    },
    shadows: true,
    onCreated: ({ camera }) => camera.lookAt(0.02, 1.14, -0.55),
    debugTarget: [0.02, 1.14, -0.55],
  },
}, function Act4_10() {
  return (
    <>
      <SceneBody />
      <EffectComposer>
        <Bloom intensity={0.6} luminanceThreshold={0.6} luminanceSmoothing={0.4} mipmapBlur />
        <Vignette eskil={false} offset={0.22} darkness={0.68} />
      </EffectComposer>
    </>
  )
})
