/**
 * Act 5.3 — THE APARTMENT (~1:36 – 1:43)
 *
 * A small city room. One window, a narrow counter, a bare bulb. Night into
 * dawn. The grown child eats alone at the counter while the chorus plays
 * "I need some body to body / All of your body beside me" over them. The lyric
 * is the absence.
 *
 * THE BEAT: nothing changes. Same pose, same stool, same bowl, the same cloth
 * bundle the caregiver wrapped at the pat still sitting on the counter beside
 * them — for seven unbroken seconds while the chorus asks for a body. The only
 * thing that moves is the dawn coming up behind them. (An earlier cut swapped
 * the bundle for a folded cloth and then a takeout tray to say "home ran out";
 * see `Bundle` for why that came out.)
 *
 * THE MIRROR: 5.4 restages this exact composition in the hanok — a figure
 * alone at a surface with a bowl, light coming from behind them. So this scene
 * deliberately runs the *same figure rig and eating cycle* as 5.4 (the shared
 * `Diner`, with the stool leg variant) and echoes its camera. The two beats
 * are supposed to rhyme hard enough that the cut between them reads as one
 * dawn in two places.
 *
 * And it is a MIRROR, not a repeat. Both scenes used to put their one person
 * just left of centre, which is the version of this idea that does not work:
 * cut together, the second shot reads as the same body in the same place and
 * the pairing disappears. He sits in the RIGHT third here; the caregiver sits
 * in the LEFT third of 5.4, and the seat the other one is missing from is on
 * the opposite side in each. The cut then puts the two of them face to face
 * across it, four hundred kilometres apart.
 *
 * (This scene previously rendered as a pure black frame for its whole 7-second
 * slot: the camera sat at x = 2.6, outside the room's right-hand wall, so
 * every frame was the unlit back face of that wall.)
 *
 * THE ROOM ITSELF NOW LIVES IN `../sets/apartment`. It used to be four local
 * components in this file, which was fine while 5.3 was the only scene ever
 * set in the city flat. 6.85 stands him in the same room to take the call, so
 * the box, the bulb, the window and the bundle moved out to a set module the
 * way the farmhouse did — same reason, same shape. The defaults in that module
 * ARE these values; `<ApartmentShell />` with no props is the room below,
 * unchanged (verified frame-identical, SSIM 1.000000 at t = 0 / 1.5 / 3).
 */

import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import * as THREE from 'three'

import { createScene } from '../createScene'
import GradientEnvironment from '../effects/GradientEnvironment'
import { Diner, Steam, Bowl } from '../sets/hanok'
import {
  ApartmentShell, BareBulb, DawnWindow, Bundle,
  APT_NIGHT as NIGHT, COUNTER_Y, SEAT_X, SEAT_Z,
} from '../sets/apartment'
import { CHILD_GOLD } from './shared'

function SceneBody() {
  return (
    <>
      <color attach="background" args={[NIGHT]} />
      <fog attach="fog" args={[NIGHT, 4, 12]} />

      {/* Cold, thin, top-down. Nothing here is warm except the bulb. */}
      {/* Night sky through the one window, warming at the horizon as dawn
          comes up behind the figure. */}
      <GradientEnvironment
        zenith="#101A30" horizon="#40415C" ground="#14100E" intensity={0.95}
      />
      <ambientLight color="#3C3C4E" intensity={0.20} />
      <BareBulb />
      <DawnWindow />

      <ApartmentShell />
      {/* The bundle the caregiver wrapped at the pat, still on the counter —
          see `sets/apartment` for why it is one object and not three. */}
      <Bundle />

      {/* Their bowl, and the same eating cycle 5.4 runs at the hanok table.
          On the seat's −x side now: `mirrored` puts the eating arm nearer
          the middle of the counter from the right-hand seat. */}
      <Bowl position={[SEAT_X - 0.13, COUNTER_Y + 0.03, -0.74]} r={0.072} h={0.052} glow={0.18} />
      <Steam
        position={[SEAT_X - 0.13, COUNTER_Y + 0.09, -0.74]}
        count={26} spread={0.045} rise={0.36} size={2.6} opacity={0.11} seed={31}
      />

      <Diner
        kind="adult"
        x={SEAT_X}
        z={SEAT_Z}
        facing={-0.10}
        hipY={0.62}
        legs="stool"
        cycle={5.6}
        cycleOffset={0.08}
        mirrored
        bowl={[0.13, 0.99, 0.30]}
        mouth={[0.05, 1.30, 0.18]}
        restHand={[-0.12, 0.96, 0.26]}
        glow={1.35}
        color={CHILD_GOLD}
        emissive={CHILD_GOLD}
      />
    </>
  )
}

export default createScene({
  background: NIGHT,
  three: {
    camera: { position: [-0.52, 1.62, 2.48], fov: 44, near: 0.05, far: 40 },
    gl: {
      antialias: true,
      toneMapping: THREE.ACESFilmicToneMapping,
      toneMappingExposure: 1.0,
    },
    shadows: true,
    onCreated: ({ camera }) => camera.lookAt(-0.06, 1.16, -0.72),
    debugTarget: [-0.06, 1.12, -0.55],
  },
  // The same slow push 5.4 makes on the hanok table, so the cut between them
  // reads as one move continuing in a different room.
  cameraMoves: [{
    a: { pos: [-0.52, 1.62, 2.48], target: [-0.06, 1.16, -0.72], fov: 44 },
    b: { pos: [-0.40, 1.55, 2.16], target: [-0.04, 1.14, -0.73], fov: 43 },
    t0: 0,
    t1: 7,
    ease: 'inout',
  }],
}, function Act5_3() {
  return (
    <>
      <SceneBody />
      <EffectComposer>
        <Bloom intensity={0.5} luminanceThreshold={0.68} luminanceSmoothing={0.4} mipmapBlur />
        <Vignette eskil={false} offset={0.22} darkness={0.72} />
      </EffectComposer>
    </>
  )
})
