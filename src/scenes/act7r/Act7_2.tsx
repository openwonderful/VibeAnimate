/**
 * Act 7.2 — "The Road Back: Night" (2:06.9 – 2:22, 15.1s)
 *
 * "Everybody like you." CUT — six kilometres up the road from 7.1, because he
 * walks at 1.4 m/s and no camera move covers that ground honestly. He is in his
 * own village now, and the village is holding a festival: a night market strung
 * down both sides of Act B's road, stalls and carts and lanterns, and the whole
 * valley already out in it. None of them are here for him. None of them glow.
 * Behind the pass ahead of him, the city he came back from is still there.
 *
 * The last stretch of road is deliberately empty of market: the house sits in a
 * quiet pocket at the end of it — Act B's hanok, at Act B's `HOUSE_Z`, with the
 * door 5.1 left open — and the person waiting in front of it has already started
 * walking down to meet him before this scene ends.
 *
 * The last frame is not a match for Act 8.55's first frame; it IS that frame.
 * However long the slot is, that much gait lands him on GOLDEN_POS to the unit
 * (`Z_START_72` is solved backwards from the arrival, so a shorter scene starts
 * him further down the road and costs the top of the market, not the door), every walker
 * ends on its `generateWorld()` mark, and the camera lands on 8.55's opening key
 * — see `HANDOFF_KEY` in journey.ts.
 *
 * Local t=0 ↔ song 2:06.9 (timeline slot from=126.9). Act time == local + S71_DUR.
 */
import { Scene7 } from './Scene7'
import { KEYS_72, S72_ACT0, T_OFF_72, heroX, heroZ, sampleCam } from './journey'
import { toWorld } from '../act8_55/locale'

const k0 = sampleCam(KEYS_72, S72_ACT0)
const START = toWorld(
  heroX(S72_ACT0) + k0.d[0], k0.d[1], heroZ(S72_ACT0) + k0.d[2],
)

export default function Act7_2() {
  return (
    <Scene7
      variant="village"
      keys={KEYS_72}
      actOffset={S72_ACT0}
      timeOffset={T_OFF_72}
      camera={{ position: START, fov: k0.fov }}
    />
  )
}
