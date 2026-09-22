/** Time-based keyframe lerp: kf(t, [[t0, v0], [t1, v1], …]) → value. */
import { lerp } from '../../hooks/useAnimTime'

export function kf(t: number, pairs: ReadonlyArray<readonly [number, number]>): number {
  if (t <= pairs[0][0]) return pairs[0][1]
  for (let i = 0; i < pairs.length - 1; i++) {
    if (t <= pairs[i + 1][0]) {
      const p = (t - pairs[i][0]) / (pairs[i + 1][0] - pairs[i][0])
      return lerp(pairs[i][1], pairs[i + 1][1], p)
    }
  }
  return pairs[pairs.length - 1][1]
}
