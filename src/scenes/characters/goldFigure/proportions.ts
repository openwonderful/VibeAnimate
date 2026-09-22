export type FigureKind = 'adult' | 'child'

export type Proportions = {
  /** Limb tube radius. */
  R: number
  /** Head sphere radius. */
  RH: number
  HIP_Y: number
  SHOULDER_Y: number
  HEAD_Y: number
  FOOT_Y: number
  /** Seconds per full walk cycle. */
  CYCLE: number
  /** Half-stride: foot z swings ±STRIDE. */
  STRIDE: number
  FOOT_LIFT: number
  /**
   * Shoulder to fingertips. Carried on the proportions rather than looked up
   * by identity (`P === CHILD`), so a scene that derives a rig — a toddler
   * with a longer stride, say — still gets its own arms rather than an
   * adult's the moment it stops being the CHILD object itself.
   */
  ARM: number
  /** How far out from the spine an arm hangs. */
  ARM_SPAN: number
  /** Distance walked before looping back (for non-in-place walkers). */
  LOOP_DIST: number
  LOOP_START_Z: number
}

export const ADULT: Proportions = {
  R: 0.050, RH: 0.16,
  HIP_Y: 0.93, SHOULDER_Y: 1.47, HEAD_Y: 1.73, FOOT_Y: 0.06,
  CYCLE: 1.0, STRIDE: 0.18, FOOT_LIFT: 0.12,
  ARM: 0.55, ARM_SPAN: 0.10,
  LOOP_DIST: 3.0, LOOP_START_Z: -1.5,
}

// Child: bigger head, shorter body, narrower shoulders, brisker cadence.
export const CHILD: Proportions = {
  R: 0.042, RH: 0.185,
  HIP_Y: 0.58, SHOULDER_Y: 0.98, HEAD_Y: 1.20, FOOT_Y: 0.05,
  CYCLE: 0.75, STRIDE: 0.12, FOOT_LIFT: 0.10,
  ARM: 0.38, ARM_SPAN: 0.07,
  LOOP_DIST: 3.0, LOOP_START_Z: -1.5,
}

export function proportionsFor(kind: FigureKind): Proportions {
  return kind === 'child' ? CHILD : ADULT
}
