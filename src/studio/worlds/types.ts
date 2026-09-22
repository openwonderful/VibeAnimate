/**
 * World system types — SPEC.md §6.
 *
 * A World is one persistent 3D environment declared once. A Shot is a
 * camera setup + lighting preset + visible-region set inside that world.
 * Many manifest scenes mount the same world with different shots, which
 * is how "several scenes filmed in the same location" stays one source
 * of truth — and how big worlds stay fast (regions outside the shot's
 * interest set are never mounted).
 */
import type { ComponentType, ReactNode } from 'react'

export type Vec3 = [number, number, number]

export type WorldAnchor = {
  id: string
  /** Point of interest in world space (things live here / cameras look here). */
  pos: Vec3
  description?: string
}

export type WorldDef = {
  id: string
  name: string
  description: string
  /** All region ids the world's Component wraps its chunks in. */
  regions: string[]
  /** Named points of interest for framing shots and placing actors. */
  anchors: Record<string, WorldAnchor>
  /** Lighting rigs (lights + fog) selectable per shot: 'dusk' | 'night' | … */
  lightingPresets: Record<string, ComponentType>
  /** The world geometry, chunked into <Region id=…> wrappers. */
  Component: ComponentType
}

export type WorldShotConfig = {
  /** Lighting preset id (must exist in the world's lightingPresets). */
  lighting: string
  /**
   * Regions to mount for this shot. Omit = whole world. This is
   * declarative culling: unlisted regions are not rendered at all.
   */
  visibleRegions?: string[]
  /** Shot-specific actors/props (ingredient instances), rendered in-world. */
  actors?: ReactNode
}
