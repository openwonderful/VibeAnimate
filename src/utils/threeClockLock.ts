/**
 * threeClockLock — make three.js-clock-driven scenes freeze/scrub with the
 * global anim clock.
 *
 * Most 3D scenes animate off `state.clock` (a THREE.Clock) inside useFrame,
 * which normally tracks wall time and therefore ignores ?t= freezing and the
 * time scrubber. When the lock is installed, Clock.prototype.getElapsedTime /
 * getDelta answer from the anim clock instead: elapsed == anim time, delta ==
 * anim-time delta since the last call (0 while frozen, clamped >= 0 on
 * backward seeks). `clock.elapsedTime` property reads stay correct because
 * both methods refresh it.
 *
 * Installed once, prototype-wide, by AnimTimeProvider when the URL opts in
 * (?t= implies it; &lockclock=0 opts out, &lockclock=1 forces it without ?t=).
 * Dev-tooling only — Remotion renders never mount AnimTimeProvider, so they
 * are unaffected.
 *
 * Caveat: delta-*accumulating* scene state (particles integrating velocity)
 * pauses correctly but cannot rewind — scrub forward, or reload at the target
 * time, for such scenes.
 */
import { Clock } from 'three'

type LockedClock = Clock & { __lastAnim?: number }

let installed = false

export function installThreeClockLock(getTime: () => number) {
  if (installed) return
  installed = true

  const proto = Clock.prototype as LockedClock

  proto.getElapsedTime = function (this: LockedClock) {
    const t = getTime()
    this.elapsedTime = t
    return t
  }

  proto.getDelta = function (this: LockedClock) {
    const t = getTime()
    const last = this.__lastAnim ?? t
    this.__lastAnim = t
    this.elapsedTime = t
    return Math.max(0, t - last)
  }
}
