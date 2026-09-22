/* eslint-disable react-refresh/only-export-components -- registry: data + preview components in one manifest by design */
/**
 * The Ingredient registry — Flow Studio's answer to Google Flow's
 * "Ingredients": every reusable character/prop/environment/style asset is
 * declared here once with a live preview, then referenced across scenes
 * by importing its component. Consistency across shots comes from reusing
 * the same ingredient rather than rebuilding lookalikes per scene.
 *
 * Adding an ingredient: create the component under src/studio/ingredients/
 * (export a `<Name>Preview` fragment that includes its own lights), then
 * append ONE entry below.
 */
import type { ComponentType } from 'react'
import { GoldFigure } from '../../scenes/characters/goldFigure'
import { StoneWall } from '../../scenes/act4/StoneWall'
import { Lantern, LanternPreview } from './Lantern'
import { Hanok, HanokPreview } from './Hanok'
import { PersimmonTree, PersimmonTreePreview } from './PersimmonTree'
import { DirtRoad, DirtRoadPreview } from './DirtRoad'
import { Fireflies, FirefliesPreview } from './Fireflies'
import { GLBModel, GLBHumanPreview } from './GLBModel'

export type IngredientCategory = 'character' | 'prop' | 'environment' | 'style' | 'fx'

export type Ingredient = {
  id: string
  name: string
  category: IngredientCategory
  tags: string[]
  description: string
  /** Small self-lit R3F fragment rendered inside the AssetBrowser preview canvas. */
  Preview: ComponentType
  /** Where the underlying component lives (shown in the Inspector). */
  sourcePath: string
  /** Import + usage snippet the agent can paste into a scene. */
  snippet: string
}

function GoldAdultPreview() {
  return (
    <>
      <ambientLight intensity={0.3} />
      <directionalLight position={[2, 3, 3]} intensity={0.7} />
      <group position={[0, -0.68, 0]} scale={0.72}>
        <GoldFigure kind="adult" pose="standing" />
      </group>
    </>
  )
}

function GoldChildPreview() {
  return (
    <>
      <ambientLight intensity={0.3} />
      <directionalLight position={[2, 3, 3]} intensity={0.7} />
      <group position={[0, -0.62, 0]} scale={0.88}>
        <GoldFigure kind="child" pose="standing" />
      </group>
    </>
  )
}

function StoneWallPreview() {
  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[2, 3, 2]} intensity={0.9} />
      <group position={[0, -0.45, 0]} rotation={[0.1, 0.5, 0]} scale={0.72}>
        <StoneWall />
      </group>
    </>
  )
}

export const INGREDIENTS: Ingredient[] = [
  {
    id: 'char.goldAdult',
    name: 'Gold Figure — Adult',
    category: 'character',
    tags: ['figure', 'glow', 'parent', 'keeper'],
    description: 'Stylized glowing adult figure with pose presets (walking, standing, seated…) and skeleton escape hatch. The story\'s protagonist body.',
    Preview: GoldAdultPreview,
    sourcePath: 'src/scenes/characters/goldFigure',
    snippet: "import { GoldFigure } from '../characters/goldFigure'\n<GoldFigure kind=\"adult\" pose=\"walking\" />",
  },
  {
    id: 'char.goldChild',
    name: 'Gold Figure — Child',
    category: 'character',
    tags: ['figure', 'glow', 'child'],
    description: 'Child-proportioned gold figure sharing the adult skeleton system; phase-offset walk cycles for pairs.',
    Preview: GoldChildPreview,
    sourcePath: 'src/scenes/characters/goldFigure',
    snippet: "import { GoldFigure } from '../characters/goldFigure'\n<GoldFigure kind=\"child\" pose=\"walking\" phaseOffset={0.3} />",
  },
  {
    id: 'prop.lantern',
    name: 'Paper Lantern',
    category: 'prop',
    tags: ['light', 'glow', 'night', 'story'],
    description: 'Glowing paper lantern with sway animation, cord, tassel and optional real point light. Reads at close and far range.',
    Preview: LanternPreview,
    sourcePath: 'src/studio/ingredients/Lantern.tsx',
    snippet: "import { Lantern } from '../../studio/ingredients/Lantern'\n<Lantern position={[0, 2, 0]} light swayPhase={i} />",
  },
  {
    id: 'env.hanok',
    name: 'Hanok House',
    category: 'environment',
    tags: ['building', 'village', 'traditional'],
    description: 'Traditional Korean house: stone base, timber posts, lattice paper windows (optionally lit), curved upswept tile roof.',
    Preview: HanokPreview,
    sourcePath: 'src/studio/ingredients/Hanok.tsx',
    snippet: "import { Hanok } from '../../studio/ingredients/Hanok'\n<Hanok position={[4, 0, -6]} rotationY={-0.4} windowsLit />",
  },
  {
    id: 'env.persimmonTree',
    name: 'Persimmon Tree',
    category: 'environment',
    tags: ['tree', 'seasons', 'fruit'],
    description: 'Crooked persimmon tree with seasonal states (summer/autumn/winter) and glowing fruit. Seeded — same seed, same tree, every scene.',
    Preview: PersimmonTreePreview,
    sourcePath: 'src/studio/ingredients/PersimmonTree.tsx',
    snippet: "import { PersimmonTree } from '../../studio/ingredients/PersimmonTree'\n<PersimmonTree position={[-3, 0, -4]} season=\"autumn\" seed={7} />",
  },
  {
    id: 'env.dirtRoad',
    name: 'Dirt Road',
    category: 'environment',
    tags: ['ground', 'road', 'village'],
    description: 'Country road with wheel ruts, edge stones and grass tufts. Canonical replacement for the 12 per-scene DirtRoad copies.',
    Preview: DirtRoadPreview,
    sourcePath: 'src/studio/ingredients/DirtRoad.tsx',
    snippet: "import { DirtRoad } from '../../studio/ingredients/DirtRoad'\n<DirtRoad length={40} rotationY={0.2} />",
  },
  {
    id: 'env.stoneWall',
    name: 'Stone Wall',
    category: 'environment',
    tags: ['wall', 'marks', 'village'],
    description: 'Low field-stone wall with height-mark scratches (the growing-up motif from Act 4).',
    Preview: StoneWallPreview,
    sourcePath: 'src/scenes/act4/StoneWall.tsx',
    snippet: "import { StoneWall } from '../act4/StoneWall'\n<StoneWall position={[2, 0, -3]} markCount={3} />",
  },
  {
    id: 'fx.fireflies',
    name: 'Fireflies',
    category: 'fx',
    tags: ['night', 'particles', 'atmosphere'],
    description: 'Drifting warm motes (single Points draw call) with seeded layout and swarm-wide breathing shimmer. Night-scene atmosphere.',
    Preview: FirefliesPreview,
    sourcePath: 'src/studio/ingredients/Fireflies.tsx',
    snippet: "import { Fireflies } from '../../studio/ingredients/Fireflies'\n<Fireflies position={[0, 0, 8]} bounds={[12, 3, 6]} count={40} />",
  },
  {
    id: 'char.glbHuman',
    name: 'Human (GLB)',
    category: 'character',
    tags: ['model', 'glb', 'authored'],
    description: 'Authored GLB asset via the GLBModel ingredient kind (cloned scene graph, optional flat tint). Editor/live use; add delayRender handling before Remotion renders.',
    Preview: GLBHumanPreview,
    sourcePath: 'src/studio/ingredients/GLBModel.tsx',
    snippet: "import { GLBModel } from '../../studio/ingredients/GLBModel'\n<GLBModel src=\"/models/human_a.glb\" position={[0, 0, -2]} tint=\"#B8A184\" />",
  },
]

export const ingredientById = new Map(INGREDIENTS.map(i => [i.id, i]))

export const INGREDIENT_CATEGORIES: IngredientCategory[] = ['character', 'prop', 'environment', 'style', 'fx']

// Re-export the components so scenes can import everything from one place.
export { Lantern, Hanok, PersimmonTree, DirtRoad, StoneWall, GoldFigure, Fireflies, GLBModel }
