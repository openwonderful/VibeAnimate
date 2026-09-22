import * as THREE from 'three'
import type { Curve, Sphere } from './buildBody'
import { v } from './buildBody'
import type { Proportions } from './proportions'
import {
  footState,
  buildLegPoints,
  buildStandingLegPoints,
  buildSeatedDrapeLegPoints,
  buildSeatedFloorLegPoints,
  buildArmPoints,
  buildPinnedArmPoints,
  buildSolvedArmPoints,
  buildRestingArmPoints,
  buildSpinePoints,
  buildSeatedSpinePoints,
} from './skeleton'

export type PoseName =
  | 'walking'      // legs cycle, arms counter-swing
  | 'standing'     // idle, feet apart, arms resting at sides
  | 'seated'       // sitting on floor / around low table, legs forward
  | 'seated-drape' // legs drape apart (riding on shoulders — original GoldGlowFigure seated)
  | 'reaching'     // seated/standing, one or both hands pinned to reach targets

export type PoseInput = {
  P: Proportions
  /** Phase in [0, 1). Used by walking; ignored by static poses. */
  phase: number
  /** Optional hand pins (local coords). */
  leftHandAt?: [number, number, number]
  rightHandAt?: [number, number, number]
  /** Head forward tilt (positive = nudge head forward along +z). */
  headForwardTilt?: number
  /** For seated poses, lean forward amount at the shoulders. */
  lean?: number
  /** Seated sub-variant. Default 'floor'. */
  seatedVariant?: 'floor' | 'drape'
  /** Standing/reaching only: open the stance by moving the ankles this far
   *  outward. Default 0 = the idle feet-together stance. */
  stanceSpread?: number
  /**
   * Solve pinned arms as two bones instead of interpolating the elbow.
   * Opt-in — see `buildSolvedArmPoints`. Worth it for any reach that leaves
   * the body: overhead, across, or up.
   */
  solvedArms?: boolean
}

export type PoseGeometry = {
  curves: Curve[]
  spheres: Sphere[]
}

/**
 * Build the merged-body curve + sphere description for a pose. Returns
 * everything buildBody() needs to produce a single merged geometry.
 */
export function buildPose(pose: PoseName, input: PoseInput): PoseGeometry {
  const { P, phase, leftHandAt, rightHandAt, headForwardTilt = 0, lean = 0.12, seatedVariant = 'floor', solvedArms = false, stanceSpread = 0 } = input

  /** Whichever way this pose pins a hand. */
  const pinned = (shX: number, shY: number, handAt: THREE.Vector3) =>
    solvedArms
      ? buildSolvedArmPoints(shX, shY, handAt, P)
      : buildPinnedArmPoints(shX, shY, handAt)

  // Shared bob — applied to walking only; static poses have bobY = 0.
  const bobY = pose === 'walking' ? -Math.cos(phase * 4 * Math.PI) * 0.020 : 0
  const hipY = P.HIP_Y + bobY
  const shY = P.SHOULDER_Y + bobY
  const headY = P.HEAD_Y + bobY

  // ── Legs ─────────────────────────────────────────────
  let leftLeg: THREE.Vector3[]
  let rightLeg: THREE.Vector3[]
  switch (pose) {
    case 'walking': {
      const rFoot = footState(phase, P)
      const lFoot = footState((phase + 0.5) % 1, P)
      leftLeg = buildLegPoints(-0.02, lFoot, hipY)
      rightLeg = buildLegPoints(+0.02, rFoot, hipY)
      break
    }
    case 'standing':
    case 'reaching': {
      leftLeg = buildStandingLegPoints(-0.02, hipY, P, stanceSpread)
      rightLeg = buildStandingLegPoints(+0.02, hipY, P, stanceSpread)
      break
    }
    case 'seated':
    case 'seated-drape': {
      const useDrape = pose === 'seated-drape' || seatedVariant === 'drape'
      leftLeg = useDrape ? buildSeatedDrapeLegPoints(-0.02, hipY) : buildSeatedFloorLegPoints(-0.02, hipY, P)
      rightLeg = useDrape ? buildSeatedDrapeLegPoints(+0.02, hipY) : buildSeatedFloorLegPoints(+0.02, hipY, P)
      break
    }
  }

  // ── Arms ─────────────────────────────────────────────
  let leftArm: THREE.Vector3[]
  let rightArm: THREE.Vector3[]

  const leftHand = leftHandAt ? v(leftHandAt[0], leftHandAt[1], leftHandAt[2]) : undefined
  const rightHand = rightHandAt ? v(rightHandAt[0], rightHandAt[1], rightHandAt[2]) : undefined

  switch (pose) {
    case 'walking': {
      const rFoot = footState(phase, P)
      const lFoot = footState((phase + 0.5) % 1, P)
      const rSwing = -rFoot.z / P.STRIDE
      const lSwing = -lFoot.z / P.STRIDE
      leftArm = leftHand
        ? pinned(-0.02, shY, leftHand)
        : buildArmPoints(-0.02, lSwing, shY, P)
      rightArm = rightHand
        ? pinned(+0.02, shY, rightHand)
        : buildArmPoints(+0.02, rSwing, shY, P)
      break
    }
    case 'standing': {
      leftArm = leftHand
        ? pinned(-0.02, shY, leftHand)
        : buildRestingArmPoints(-0.02, shY, P)
      rightArm = rightHand
        ? pinned(+0.02, shY, rightHand)
        : buildRestingArmPoints(+0.02, shY, P)
      break
    }
    case 'seated':
    case 'seated-drape': {
      // Seated figures: default to hands in lap (slightly forward + down).
      const lapL: [number, number, number] = [-0.12, hipY - 0.05, 0.18]
      const lapR: [number, number, number] = [+0.12, hipY - 0.05, 0.18]
      leftArm = pinned(-0.02, shY, leftHand ?? v(...lapL))
      rightArm = pinned(+0.02, shY, rightHand ?? v(...lapR))
      break
    }
    case 'reaching': {
      // Reaching default: right hand pinned forward, left hand resting.
      const reachR: [number, number, number] = [+0.15, shY - 0.25, 0.50]
      leftArm = leftHand
        ? pinned(-0.02, shY, leftHand)
        : buildRestingArmPoints(-0.02, shY, P)
      rightArm = pinned(+0.02, shY, rightHand ?? v(...reachR))
      break
    }
  }

  // ── Spine ────────────────────────────────────────────
  const seated = pose === 'seated' || pose === 'seated-drape'
  const spine = seated ? buildSeatedSpinePoints(hipY, P, lean) : buildSpinePoints(hipY, P)

  // ── Head ─────────────────────────────────────────────
  const seatedLean = seated ? lean : 0
  const headZ = 0.03 + headForwardTilt + seatedLean * 0.8

  return {
    curves: [
      { points: spine, radius: P.R, segments: 16 },
      { points: leftArm, radius: P.R, segments: 14 },
      { points: rightArm, radius: P.R, segments: 14 },
      { points: leftLeg, radius: P.R, segments: 16 },
      { points: rightLeg, radius: P.R, segments: 16 },
    ],
    spheres: [
      { center: v(0, headY, headZ), radius: P.RH },
    ],
  }
}
