/**
 * The sickbed staging, shared by 4.4 (Before) and 4.6 (After).
 *
 * The whole point of the pair is recognition: same room, same futon, same
 * camera, same lamp — only the two people swap places. If the two scenes each
 * owned their own numbers they would drift apart under editing and the mirror
 * would stop landing, so the geometry lives here once and both beats import it.
 *
 * Nobody is under a quilt. Bedding drawn over a body has to be sculpted — a
 * slab for the cover, a capsule for the shape under it — and at this distance
 * none of it reads as cloth; it reads as a box with a pill on top, and the
 * person in the bed is reduced to a floating head. Bare mattress and a real
 * lying figure is a smaller claim and a truer one.
 */

import { useMemo, useEffect } from 'react'
import * as THREE from 'three'
import {
  HanokShell, HanokDressing, HanokLighting, SeatedFigure, LyingFigure, Steam,
  Futon, Bowl, Thermometer, FUTON_TOP, FUTON_PILLOW, FUTON_PILLOW_INSET,
  smooth, type V3,
} from '../sets/hanok'
import { PARENT_HAT } from '../actB/valley'
import { buildHat } from '../characters/goldFigure'

// The bed runs left-to-right across the frame with the head end on the left,
// and whoever is nursing kneels on the *far* side of it. Kneeling on the near
// side put a whole adult between the lens and the person in the bed, which is
// the one thing this composition cannot afford: at a second long, you have to
// see both of them at once.
//
// The mattress is 1.98 long because a lying adult is 1.9 long. It used to be
// 1.55 and that was fine while the body was a mound under a quilt; with a real
// figure on it the difference is a person with their feet off the end — and
// 4.6 puts the adult in the bed, so the long one is the one that has to fit.
export const BED_LEN = 1.98
export const BED_POS: V3 = [0.27, 0, -0.20]
export const BED_FACING = -Math.PI / 2      // head end lands screen-left
/** Pillow centre. Bed-local +z maps to world −x, so this is BED_POS.x − 0.76. */
export const PILLOW_X = BED_POS[0] - (BED_LEN * 0.5 - FUTON_PILLOW_INSET)
/** LyingFigure is anchored at its head, so this is just the pillow. */
export const LYING_POS: V3 = [PILLOW_X, FUTON_TOP, BED_POS[2]]
export const NURSE_POS: V3 = [-0.30, 0, -0.80]
/** Where the parent's hat is when the parent is the one in the bed: set down
 *  on the boards by the head end, crown up, the way you put a hat down. */
export const HAT_REST_POS: V3 = [PILLOW_X - 0.20, 0.004, BED_POS[2] + 0.34]
export const NURSE_FACING = 0

/**
 * Broth and thermometer, set down on the boards on the near side of the bed
 * within arm's reach of whoever is lying in it — not out at the foot of the
 * mattress where they were, which read as somebody else's supper.
 */
export const BOWL_POS: V3 = [0.04, 0.03, 0.31]

export const CAMERA = {
  position: [0.34, 1.16, 1.78] as V3,
  target: [-0.06, 0.30, -0.34] as V3,
  fov: 44,
}

/**
 * One hand comes to rest on the forehead and stays; the other takes their
 * weight on the edge of the mattress. At one second of screen time there is no
 * room for more than this.
 *
 * The forehead target is the *top* of the head sphere, not its centre. Aimed
 * at the centre the hand ends up inside the skull and the forearm reads as a
 * spike growing out of the face — which is exactly what it used to do.
 */
export function nurseHands(t: number) {
  const settle = smooth(Math.min(1, t / 0.45))
  const breathe = Math.sin(t * 1.4) * 0.006
  return {
    // Left hand crosses to the forehead — the patient's head is off to that
    // side, so this is the arm that reaches without crossing the body.
    left: [-0.23, 0.52 - settle * 0.12 + breathe, 0.54 + settle * 0.14] as V3,
    // Right hand down on the futon, propping. Nothing sprawls sideways.
    right: [0.15, 0.12 + breathe * 0.5, 0.33] as V3,
    headTilt: 0.03 + settle * 0.05,
  }
}

/** Room, light, futon, lamp and broth — everything except the two people. */
export function SickbedSet() {
  return (
    <>
      <fog attach="fog" args={['#160C06', 4.5, 11]} />

      {/* Deep night: the hanging lantern is out, a floor lamp does the work,
          and cold moonlight comes through the open panel behind. */}
      <HanokLighting lantern={null} warm={0.5} moon={1.1} ambient={0.11} />
      <HanokShell />
      <HanokDressing threshold={false} clutter={false} />

      {/* The close oil lamp — this beat's key light. */}
      <group position={[1.02, 0, 0.42]}>
        <mesh position={[0, 0.035, 0]} castShadow>
          <cylinderGeometry args={[0.07, 0.085, 0.05, 14]} />
          <meshStandardMaterial color="#A87C3C" roughness={0.3} metalness={0.8} />
        </mesh>
        <mesh position={[0, 0.10, 0]}>
          <sphereGeometry args={[0.032, 10, 8]} />
          <meshBasicMaterial color="#FFE7BC" transparent opacity={0.85} />
        </mesh>
        <pointLight position={[0, 0.14, 0]} color="#FFA641" intensity={2.8} distance={3.2} decay={2} />
      </group>

      {/* Bare bedding — see the note on <Futon>. Nothing is draped over
          anybody; the person in it is an actual figure. */}
      <Futon position={BED_POS} facing={BED_FACING} covers={false} length={BED_LEN} />

      {/* Broth at their side, still steaming, with the thermometer set down
          next to it. The thermometer is the only object in the room that says
          this is an illness and not an early night. */}
      <Bowl position={BOWL_POS} r={0.07} h={0.05} fill="#C08A3C" glow={0.3} />
      <Steam
        position={[BOWL_POS[0], BOWL_POS[1] + 0.06, BOWL_POS[2]]}
        count={30} spread={0.045} rise={0.34} size={2.4} opacity={0.11}
        seed={21} color="#FFD9A4"
      />
      <Thermometer
        position={[BOWL_POS[0] + 0.165, 0.010, BOWL_POS[2] + 0.015]}
        rotation={[0, -0.52, 0]}
        len={0.17}
      />
    </>
  )
}

/**
 * The two people. `patientKind`/`nurseKind` and the two golds are all that
 * change between 4.4 and 4.6.
 */
/**
 * The parent's 삿갓, off and on the floor beside the bed.
 *
 * When the parent is the one lying down there is nowhere on them to put it —
 * a hat on a sleeping head is a hat balanced on a pillow — and without it 4.6
 * is two adult stick figures either side of a futon with nothing to say which
 * is which. So it comes off and goes down by their head, which is both what
 * actually happens and the only prop in the shot that says whose bed this is.
 *
 * Its own material, dimmer than either figure: this is an object in the room,
 * not a person.
 */
function HatOnFloor() {
  const build = useMemo(() => buildHat(PARENT_HAT, 0.16), [])
  const shellMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#C98B2C', emissive: '#8E5F14', emissiveIntensity: 0.30, roughness: 0.85,
    side: THREE.DoubleSide,
  }), [])
  const trimMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#E8B45C', emissive: '#C98B2C', emissiveIntensity: 0.55, roughness: 0.7,
  }), [])
  useEffect(() => () => {
    build.shell.dispose(); build.trim.dispose()
    shellMat.dispose(); trimMat.dispose()
  }, [build, shellMat, trimMat])

  return (
    <group position={HAT_REST_POS} rotation={[0, 0.7, 0]}>
      <mesh geometry={build.shell} material={shellMat} castShadow />
      <mesh geometry={build.trim} material={trimMat} castShadow />
    </group>
  )
}

export function SickbedPair({
  patientKind, patientGlow, nurseKind, nurseColor, nurseGlow, parent = 'nurse',
}: {
  patientKind: 'adult' | 'child'
  patientGlow: number
  nurseKind: 'adult' | 'child'
  nurseColor: string
  nurseGlow: number
  /** Which of the two is the parent. 4.4 the parent nurses; 4.6 they are the
   *  one in the bed. Whoever it is wears the hat, because two adult stick
   *  figures either side of a futon are otherwise indistinguishable. */
  parent?: 'nurse' | 'patient'
}) {
  return (
    <>
      {parent === 'patient' && <HatOnFloor />}
      <LyingFigure
        position={LYING_POS} facing={BED_FACING}
        kind={patientKind} glow={patientGlow}
        pillowY={FUTON_PILLOW} headTurn={0.9}
      />
      <SeatedFigure
        kind={nurseKind}
        position={NURSE_POS}
        facing={NURSE_FACING}
        hipY={0.19}
        legs="kneel"
        lean={0.17}
        color={nurseColor}
        emissive={nurseColor}
        glow={nurseGlow}
        hands={nurseHands}
        hat={parent === 'nurse' ? PARENT_HAT : undefined}
      />
    </>
  )
}

export const SICKBED_GL = {
  antialias: true,
  toneMapping: THREE.ACESFilmicToneMapping,
  toneMappingExposure: 1.05,
}
