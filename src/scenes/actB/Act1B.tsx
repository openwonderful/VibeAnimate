/** 1-B — "THE APPROACH", alternate cut (0:00 → 0:26). The whole of Act 1
 *  with the approach the film used to have: shallower nudges landing ahead
 *  of the four "I need" signs, all four words on the canyon axis, and a high
 *  arrival that SLOWS into the stadium. Identical to `1` outside 0:07.47 →
 *  0:20.31 — see `flightApproachB.ts`. `1.2-B` is a window into THIS, so
 *  both take the same two arguments and there is only one cut to tune. */
import { makeFlightScene } from './scene'
import { flightPoseB, SIGN_X_B } from './flightApproachB'
export default makeFlightScene(0, 'Act1B', flightPoseB, SIGN_X_B)
