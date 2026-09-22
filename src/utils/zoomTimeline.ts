// --- Easing functions ---

function easeIn(t: number): number {
  return t * t * t
}

function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

function easeInOut(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

function applyEasing(t: number, easing: EasingType): number {
  switch (easing) {
    case 'easeIn':
      return easeIn(t)
    case 'easeOut':
      return easeOut(t)
    case 'easeInOut':
      return easeInOut(t)
    default:
      return t
  }
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

// --- Types ---

type EasingType = 'linear' | 'easeIn' | 'easeOut' | 'easeInOut'

export interface ZoomWaypoint {
  time: number
  scene1Scale: number
  scene1Opacity: number
  scene2Scale: number
  scene2Opacity: number
  easing: EasingType
  label?: string
}

export interface SceneZoomState {
  scale: number
  opacity: number
  visible: boolean
}

export interface ZoomState {
  scene1: SceneZoomState
  scene2: SceneZoomState
}

// --- Timeline waypoints ---

export const ZOOM_TIMELINE: ZoomWaypoint[] = [
  // Full landscape
  {
    time: 0.0,
    scene1Scale: 1.0,
    scene1Opacity: 1.0,
    scene2Scale: 1.0,
    scene2Opacity: 0.0,
    easing: 'linear',
    label: 'start',
  },
  // Scene 1 fading out as mountains fly past
  {
    time: 11.0,
    scene1Scale: 6.0,
    scene1Opacity: 0.0,
    scene2Scale: 1.0,
    scene2Opacity: 0.0,
    easing: 'linear',
    label: 'scene1-gone',
  },
  // "I need the whole stadium to jump" — Scene 2 fully visible
  {
    time: 18.65,
    scene1Scale: 12.0,
    scene1Opacity: 0.0,
    scene2Scale: 1.0,
    scene2Opacity: 1.0,
    easing: 'linear',
    label: 'stadium-reveal',
  },
  // REST — concert holds steady
  {
    time: 30.0,
    scene1Scale: 5.6,
    scene1Opacity: 0.0,
    scene2Scale: 1.0,
    scene2Opacity: 1.0,
    easing: 'linear',
    label: 'rest',
  },
]

// --- Interpolation ---

export function interpolateZoom(time: number): ZoomState {
  const timeline = ZOOM_TIMELINE

  // Clamp to timeline bounds
  if (time <= timeline[0].time) {
    const wp = timeline[0]
    return makeState(wp)
  }
  if (time >= timeline[timeline.length - 1].time) {
    const wp = timeline[timeline.length - 1]
    return makeState(wp)
  }

  // Find surrounding waypoints
  let prev = timeline[0]
  let next = timeline[1]
  for (let i = 0; i < timeline.length - 1; i++) {
    if (time >= timeline[i].time && time <= timeline[i + 1].time) {
      prev = timeline[i]
      next = timeline[i + 1]
      break
    }
  }

  const segmentDuration = next.time - prev.time
  const rawT = segmentDuration > 0 ? (time - prev.time) / segmentDuration : 0
  const t = applyEasing(Math.max(0, Math.min(1, rawT)), next.easing)

  return {
    scene1: {
      scale: lerp(prev.scene1Scale, next.scene1Scale, t),
      opacity: lerp(prev.scene1Opacity, next.scene1Opacity, t),
      visible: lerp(prev.scene1Opacity, next.scene1Opacity, t) > 0.01,
    },
    scene2: {
      scale: lerp(prev.scene2Scale, next.scene2Scale, t),
      opacity: lerp(prev.scene2Opacity, next.scene2Opacity, t),
      visible: lerp(prev.scene2Opacity, next.scene2Opacity, t) > 0.01,
    },
  }
}

function makeState(wp: ZoomWaypoint): ZoomState {
  return {
    scene1: {
      scale: wp.scene1Scale,
      opacity: wp.scene1Opacity,
      visible: wp.scene1Opacity > 0.01,
    },
    scene2: {
      scale: wp.scene2Scale,
      opacity: wp.scene2Opacity,
      visible: wp.scene2Opacity > 0.01,
    },
  }
}
