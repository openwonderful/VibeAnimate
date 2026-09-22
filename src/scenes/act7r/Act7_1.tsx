/**
 * Act 7.1 — "The Long Road" (1:56.9 – 2:06.9, 10s)
 *
 * The golden kid of Act 3 is an adult, walking home, and this is the part of the
 * journey with nothing in it. No house, no village, no market, nobody else on
 * the road: seven kilometres of the valley he grew up in, strung with wire now,
 * and a skyline standing behind the pass that was not there when he left.
 *
 * Not a rhyme with 3.1 — the same ground. This is staged on Act B's road at
 * `WALK_31_Z`, the exact spot Act B stages the 3.1 beat on: the same paddies,
 * the same verge, the same shrines, the same range on the same horizon, and the
 * same low sun in the same gap in it (Act B's own, run backwards, so it is going
 * down into the pass he is walking toward). In 3.1 he was small, and holding a
 * hand.
 *
 * He does not glow. Nothing in this scene does except the sun and the far city;
 * the light in this film starts two scenes from here, when he gets home and
 * someone takes his hand.
 *
 * Local t=0 ↔ song 1:56.9 (timeline slot from=116.9). Act time == local time here.
 * The slot is 10s now, not 12: Act 6 took the difference so the audition could
 * hold its point and the busking corner could come back into the cut. The whole
 * authored move still plays — `KEYS_71` is keyed as fractions of `S71_DUR`.
 */
import { Scene7 } from './Scene7'
import { KEYS_71, T_OFF_71, heroX, heroZ, sampleCam } from './journey'
import { toWorld } from '../act8_55/locale'

// Start pose, resolved from the first camera key so the very first frame is
// already framed even before the rig's first useFrame lands. Keys are in village
// units; the canvas wants Act B's.
const k0 = sampleCam(KEYS_71, 0)
const START = toWorld(heroX(0) + k0.d[0], k0.d[1], heroZ(0) + k0.d[2])

export default function Act7_1() {
  return (
    <Scene7
      variant="road"
      keys={KEYS_71}
      actOffset={0}
      timeOffset={T_OFF_71}
      camera={{ position: START, fov: k0.fov }}
    />
  )
}
