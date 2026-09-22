/**
 * GoldGlowFigure — backwards-compatible alias for <GoldFigure> pre-set to
 * the goldAmber material. The implementation moved to ./goldFigure/ and is
 * now a shared framework. This module is kept so existing callers (Act3_1,
 * Act3_2, Act7, CharStickGold5G) don't need to change.
 *
 * For new code, prefer importing from './goldFigure' directly.
 */

import { GoldFigure, type GoldFigureProps } from './goldFigure'
export {
  GOLD_GLOW_AMBER,
  GOLD_GLOW_AMBER_DEEP,
} from './goldFigure'
export type { FigureKind } from './goldFigure'

// The original component's 'seated' pose draped legs apart (for shoulder-ride).
// Preserve that mapping: when callers pass pose='seated' to GoldGlowFigure,
// use the drape variant, not the new floor-sit variant.
export type FigurePose = 'walking' | 'seated'

export type GoldGlowFigureProps = Omit<GoldFigureProps, 'pose' | 'material' | 'animate'> & {
  pose?: FigurePose
}

export function GoldGlowFigure({ pose = 'walking', ...rest }: GoldGlowFigureProps) {
  const mappedPose = pose === 'seated' ? 'seated-drape' : 'walking'
  return <GoldFigure pose={mappedPose} material="goldAmber" animate {...rest} />
}
