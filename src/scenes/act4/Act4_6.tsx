/**
 * Act 4.6 — SICKBED REVERSED (~1:20, the "After" of 4.4)
 *
 * Same room, same futon, same lamp, same camera — the caregiver is the one
 * lying down now, and the grown child kneels beside them, hand on the forehead
 * exactly where theirs was.
 *
 * Everything geometric is imported from ./sickbed rather than restated, so the
 * mirror cannot drift out of register with 4.4 under later editing. The only
 * differences declared here are who is in which place and how bright they are.
 */

import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'

import { createScene } from '../createScene'
import { NIGHT } from '../sets/hanok'
import { SickbedSet, SickbedPair, CAMERA, SICKBED_GL } from './sickbed'
import { CHILD_GOLD } from '../act5/shared'

export default createScene({
  background: NIGHT,
  three: {
    camera: { position: CAMERA.position, fov: CAMERA.fov, near: 0.05, far: 40 },
    gl: SICKBED_GL,
    shadows: true,
    onCreated: ({ camera }) => camera.lookAt(...CAMERA.target),
    debugTarget: CAMERA.target,
  },
}, function Act4_6() {
  return (
    <>
      <color attach="background" args={[NIGHT]} />
      <SickbedSet />
      {/* Roles inverted: the caregiver is in the bed and noticeably dimmer,
          the grown child kneels where the caregiver knelt four beats ago. */}
      <SickbedPair
        parent="patient"
        patientKind="adult" patientGlow={0.62}
        nurseKind="adult" nurseColor={CHILD_GOLD} nurseGlow={1.45}
      />
      <EffectComposer>
        <Bloom intensity={0.62} luminanceThreshold={0.6} luminanceSmoothing={0.4} mipmapBlur />
        <Vignette eskil={false} offset={0.2} darkness={0.7} />
      </EffectComposer>
    </>
  )
})
