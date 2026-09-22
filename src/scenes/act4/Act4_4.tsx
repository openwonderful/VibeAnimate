/**
 * Act 4.4 — SICKBED CARE (~1:17, "Before")
 *
 * Night. The child lies on a futon. The caregiver kneels beside them, one hand
 * settling on the child's forehead, the other taking their weight on the edge
 * of the mattress. Broth and a thermometer are set down at the child's side.
 * The lamp is close.
 *
 * TIMING: one second on screen. There is no journey here — the image *is* the
 * beat — so the second buys one small movement: the hand coming to rest on the
 * forehead at ~0.45s. Everything else just breathes.
 *
 * Staging lives in ./sickbed so 4.6 can mirror it exactly.
 */

import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'

import { createScene } from '../createScene'
import { NIGHT } from '../sets/hanok'
import { SickbedSet, SickbedPair, CAMERA, SICKBED_GL } from './sickbed'
import { CARE_GOLD_44 } from '../act5/shared'

export default createScene({
  background: NIGHT,
  three: {
    camera: { position: CAMERA.position, fov: CAMERA.fov, near: 0.05, far: 40 },
    gl: SICKBED_GL,
    shadows: true,
    onCreated: ({ camera }) => camera.lookAt(...CAMERA.target),
    debugTarget: CAMERA.target,
  },
}, function Act4_4() {
  return (
    <>
      <color attach="background" args={[NIGHT]} />
      <SickbedSet />
      {/* The child is ill; the caregiver is still near full brightness here. */}
      <SickbedPair
        patientKind="child" patientGlow={1.5}
        nurseKind="adult" nurseColor={CARE_GOLD_44} nurseGlow={1.0}
      />
      <EffectComposer>
        <Bloom intensity={0.62} luminanceThreshold={0.6} luminanceSmoothing={0.4} mipmapBlur />
        <Vignette eskil={false} offset={0.2} darkness={0.7} />
      </EffectComposer>
    </>
  )
})
