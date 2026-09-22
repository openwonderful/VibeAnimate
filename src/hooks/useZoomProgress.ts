import { useMemo } from 'react'
import { interpolateZoom, type ZoomState } from '../utils/zoomTimeline'

export function useZoomProgress(currentTime: number): ZoomState {
  return useMemo(() => interpolateZoom(currentTime), [currentTime])
}
