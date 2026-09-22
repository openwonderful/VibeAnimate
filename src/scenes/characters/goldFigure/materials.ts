import * as THREE from 'three'

/** The signature gold amber used for the protagonist / Gold5G figure. */
export const GOLD_GLOW_AMBER = '#FFB938'
export const GOLD_GLOW_AMBER_DEEP = '#E89B1F'

export type MaterialPreset =
  | 'goldAmber'          // Protagonist: bright amber emissive, pulses
  | 'goldParent'         // The parent: deeper, steadier, warmer than goldAmber
  | 'goldChild'          // The child: brighter, cooler core — a spark to the parent's ember
  | 'stickGold'          // Warmer solid gold (#D4A843) for Act3 dinner / Act5 caregiver
  | 'stickBrown'         // Brown-gold for background figures (Act3_3 family)
  | 'careGold51'         // Act5.1 dimmed caregiver gold
  | 'careGold55'         // Act5.5 darker caregiver gold
  | 'greyCrowd'          // City walkers / background crowd (grey, near-no emissive)
  | 'greyCrowdDark'      // Darker grey crowd silhouettes
  | 'darkSilhouette'     // Near-black with tiny warm emissive (doorway figures)

export type MaterialSpec = {
  color: string
  emissive?: string
  emissiveIntensity?: number
  roughness?: number
  metalness?: number
  /** Does emissiveIntensity pulse on a slow sine? */
  pulse?: boolean
  /** Pulse amplitude (added to base emissiveIntensity). */
  pulseAmp?: number
}

const PRESETS: Record<MaterialPreset, MaterialSpec> = {
  goldAmber: {
    color: GOLD_GLOW_AMBER,
    emissive: GOLD_GLOW_AMBER_DEEP,
    emissiveIntensity: 1.4,
    roughness: 0.55,
    metalness: 0.0,
    pulse: true,
    pulseAmp: 0.35,
  },
  /**
   * The pair, as two temperatures of the same gold.
   *
   * They are made of light, so which one is which can live in the EMISSION
   * rather than in the body — the one channel that still reads when the two
   * of them are twenty pixels tall on a dark road, and the only one that
   * does not expire as the child grows into the parent's proportions.
   * Parent: deeper, warmer, steady. Child: brighter, cooler at the core.
   * Ember and spark. Everything else about them is identical, deliberately.
   */
  goldParent: {
    color: '#F5B45C',
    emissive: '#D8891A',
    emissiveIntensity: 1.4,
    roughness: 0.55,
    metalness: 0.0,
    pulse: true,
    pulseAmp: 0.30,
  },
  goldChild: {
    color: '#FFF0C4',
    emissive: '#FFC85E',
    emissiveIntensity: 1.4,
    roughness: 0.55,
    metalness: 0.0,
    pulse: true,
    pulseAmp: 0.35,
  },
  stickGold: {
    color: '#D4A843',
    emissive: '#D4A843',
    emissiveIntensity: 0.25,
    roughness: 0.7,
  },
  stickBrown: {
    color: '#8B6914',
    emissive: '#8B6914',
    emissiveIntensity: 0.25,
    roughness: 0.8,
  },
  careGold51: {
    color: '#A6792E',
    emissive: '#A6792E',
    emissiveIntensity: 0.25,
    roughness: 0.7,
  },
  careGold55: {
    color: '#6E5020',
    emissive: '#6E5020',
    emissiveIntensity: 0.2,
    roughness: 0.75,
  },
  greyCrowd: {
    color: '#5A5A62',
    emissive: '#5A5A62',
    emissiveIntensity: 0.05,
    roughness: 0.9,
  },
  greyCrowdDark: {
    color: '#3A3A42',
    emissive: '#3A3A42',
    emissiveIntensity: 0.05,
    roughness: 0.9,
  },
  darkSilhouette: {
    color: '#1A1008',
    emissive: '#C4913A',
    emissiveIntensity: 0.1,
    roughness: 0.8,
  },
}

/** Build a new MeshStandardMaterial from a preset. */
export function buildMaterialFromPreset(preset: MaterialPreset): THREE.MeshStandardMaterial {
  const spec = PRESETS[preset]
  return new THREE.MeshStandardMaterial({
    color: spec.color,
    emissive: spec.emissive ?? spec.color,
    emissiveIntensity: spec.emissiveIntensity ?? 0.25,
    roughness: spec.roughness ?? 0.7,
    metalness: spec.metalness ?? 0.0,
  })
}

export function getPresetSpec(preset: MaterialPreset): MaterialSpec {
  return PRESETS[preset]
}
