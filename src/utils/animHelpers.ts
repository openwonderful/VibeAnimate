/**
 * Animation helper functions — compute animated values from time.
 * Replace CSS @keyframes with deterministic JS math.
 * Works in both Remotion (frame-perfect) and live (real-time) modes.
 */

/** Smooth sine oscillation between min and max */
export function oscillate(
  time: number,
  period: number,
  min: number,
  max: number,
  delay: number = 0,
): number {
  const t = ((time + delay) % period) / period
  const sine = (Math.sin(t * Math.PI * 2 - Math.PI / 2) + 1) / 2 // 0→1→0
  return min + sine * (max - min)
}

/** Bounce effect for crowd jumping — sharp up, slow down */
export function jumpBounce(
  time: number,
  period: number,
  amplitude: number,
  delay: number = 0,
): number {
  const t = ((time + delay) % period) / period
  // 0-0.4: rise, 0.4-0.5: peak, 0.5-0.6: descend, 0.6-1: rest
  if (t < 0.4) return -(t / 0.4) * amplitude * 0.8
  if (t < 0.5) return -amplitude
  if (t < 0.6) return -(1 - (t - 0.5) / 0.1) * amplitude * 0.8
  return 0
}

/** Linear loop — 0 to 1 repeating */
export function linearLoop(
  time: number,
  period: number,
  delay: number = 0,
): number {
  return ((time + delay) % period) / period
}

/** Sweep rotation — oscillate between min/max degrees */
export function sweep(
  time: number,
  period: number,
  minDeg: number,
  maxDeg: number,
  delay: number = 0,
): number {
  const t = ((time + delay) % period) / period
  const sine = Math.sin(t * Math.PI * 2)
  return (minDeg + maxDeg) / 2 + ((maxDeg - minDeg) / 2) * sine
}

/** Camera flash — mostly invisible, brief bright pop */
export function flashPulse(
  time: number,
  period: number,
  delay: number = 0,
): number {
  const t = ((time + delay) % period) / period
  if (t > 0.96 && t < 0.97) return 1.0
  if (t > 0.97 && t < 0.985) return 0.4
  return 0
}

/** Beat-locked bounce — jump synced to BPM with variable amplitude */
export function beatBounce(
  time: number,
  bpm: number,
  amplitude: number,
  delay: number = 0,
): number {
  const period = 60 / bpm; // 0.5s at 120 BPM
  const t = ((time + delay) % period) / period;
  // 0-0.3: rise, 0.3-0.4: peak, 0.4-0.55: descend, 0.55-1: rest
  if (t < 0.3) return -(t / 0.3) * amplitude * 0.8;
  if (t < 0.4) return -amplitude;
  if (t < 0.55) return -(1 - (t - 0.4) / 0.15) * amplitude * 0.8;
  return 0;
}

/** Wave sweep — gaussian brightness boost based on proximity to wave front */
export function waveSweep(
  wavePosition: number,
  elementX: number,
  waveWidth: number,
): number {
  const dist = Math.abs(elementX - wavePosition);
  if (dist > waveWidth) return 0;
  const t = dist / waveWidth;
  return Math.exp(-t * t * 4); // peaks at 1.0, ~0.02 at edge
}

/** Confetti sway — gentle side-to-side */
export function sway(
  time: number,
  period: number,
  amplitude: number,
  delay: number = 0,
): number {
  const t = ((time + delay) % period) / period
  return Math.sin(t * Math.PI * 2) * amplitude
}
