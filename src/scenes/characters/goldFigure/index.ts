export { GoldFigure } from './GoldFigure'
export type { GoldFigureProps, HandTarget, SkeletonBuilder } from './GoldFigure'
export type { FigureKind, Proportions } from './proportions'
export { ADULT, CHILD, proportionsFor } from './proportions'
export type { PoseName, PoseInput, PoseGeometry } from './poses'
export { buildPose } from './poses'
export {
  footState,
  buildLegPoints,
  buildStandingLegPoints,
  buildSeatedDrapeLegPoints,
  buildSeatedFloorLegPoints,
  buildArmPoints,
  buildPinnedArmPoints,
  buildSolvedArmPoints,
  buildRestingArmPoints,
  buildSpinePoints,
  buildSeatedSpinePoints,
} from './skeleton'
export type { Curve, Sphere } from './buildBody'
export { buildBody, v } from './buildBody'
export type { MaterialPreset, MaterialSpec } from './materials'
export { GOLD_GLOW_AMBER, GOLD_GLOW_AMBER_DEEP, buildMaterialFromPreset, getPresetSpec } from './materials'
export type { HatName, HatBuild } from './hats'
export { HAT_NAMES, HAT_LABELS, buildHat, hatBrimRadius, satgatOutline } from './hats'
