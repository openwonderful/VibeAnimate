/**
 * Act 6 — THE EMPTY ROAD (~1:48 – ~1:51)
 *
 * Three seconds of the road with nobody on it.
 *
 * 5.4 ends on the caregiver looking through the open door at the road. This is
 * that road, from that door, at that dawn: the ruts, the paddies, the ridge,
 * and no one walking on any of it. Then Act 7 begins at 1:51 and puts him back
 * on the exact same ground.
 *
 * The beat is defined by absence, so the discipline is to put *nothing* here —
 * no figures, no fireflies, no event. The only motion is a slow drift down the
 * road and the house's door-light behind, still burning, still open.
 *
 * TIMELINE NOTE: the song is fully allocated (190s) and both ends of this
 * window are pinned to lyrics — 1:43 "Sunrise, but we don't go home" opens 5.4,
 * 1:51 "Somebody like you" opens Act 7. So these three seconds are taken from
 * the tail of 5.4 rather than pushing anything downstream; nothing after 1:51
 * moves.
 */

import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import * as THREE from 'three'

import { createScene } from '../createScene'
import { RoadGround, DistantHanok, RoadsideTree, roadSky } from '../sets/road'

const SKY = roadSky('dawn')

export default createScene({
  background: SKY.high,
  three: {
    camera: { position: [0.35, 1.30, 5.20], fov: 44, near: 0.05, far: 260 },
    gl: {
      antialias: true,
      toneMapping: THREE.ACESFilmicToneMapping,
      toneMappingExposure: 1.16,
    },
    shadows: true,
    onCreated: ({ camera }) => camera.lookAt(0, 1.05, -12),
    debugTarget: [0, 1.0, -8],
  },
  // A slow drift down the road. Not a push — nobody is going anywhere yet.
  cameraMoves: [{
    a: { pos: [0.35, 1.30, 5.20], target: [0, 1.05, -12], fov: 44 },
    b: { pos: [0.18, 1.22, 4.10], target: [0, 1.02, -12], fov: 44 },
    t0: 0,
    t1: 3,
    ease: 'inout',
  }],
}, function Act6() {
  return (
    <>
      <color attach="background" args={[SKY.high]} />
      <fog attach="fog" args={SKY.fog} />

      {/* First light, low and from behind the ridge. Cold fill from overhead so
          the road reads without anything warm standing on it. */}
      <ambientLight color="#5A6486" intensity={0.85} />
      <directionalLight
        position={[-9, 3.4, -26]} color="#E0A084" intensity={1.35}
        castShadow
        shadow-mapSize-width={1024} shadow-mapSize-height={1024}
        shadow-camera-left={-14} shadow-camera-right={14}
        shadow-camera-top={10} shadow-camera-bottom={-3}
        shadow-camera-far={80}
        shadow-bias={-0.0009}
      />
      <directionalLight position={[5, 9, 8]} color="#5E6C96" intensity={0.5} />

      <RoadGround hour="dawn" />

      {/* The house behind and to the left — the door still open, still lit.
          It is the only warm thing in the frame and there is nobody in it. */}
      <DistantHanok position={[-4.6, 0, -9.5]} doorGlow={1} />
      <RoadsideTree position={[3.4, 0, -7.5]} />
      <RoadsideTree position={[-2.9, 0, -16]} scale={0.85} />

      <EffectComposer>
        <Bloom intensity={0.5} luminanceThreshold={0.7} luminanceSmoothing={0.4} mipmapBlur />
        <Vignette eskil={false} offset={0.24} darkness={0.6} />
      </EffectComposer>
    </>
  )
})
