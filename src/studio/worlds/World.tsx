/**
 * WorldMount + Region — mounting a world for one shot.
 *
 *   <WorldMount world={LANTERN_VALLEY} shot={{ lighting: 'night',
 *     visibleRegions: ['ground', 'village', 'road'], actors: <…/> }} />
 *
 * Region gating is mount-level culling: a region not in the shot's
 * visibleRegions never enters the scene graph (no draw calls, no
 * per-frame cost) — cheaper than per-frame frustum tests, deterministic
 * for renders, and three.js per-object frustum culling still applies
 * within mounted regions.
 */
import { createContext, useContext } from 'react'
import type { ReactNode } from 'react'
import type { WorldDef, WorldShotConfig } from './types'

const RegionContext = createContext<ReadonlySet<string> | null>(null)

/** Wrap world chunks; renders children only when the region is visible in the active shot. */
export function Region({ id, children }: { id: string; children: ReactNode }) {
  const visible = useContext(RegionContext)
  if (visible && !visible.has(id)) return null
  return <>{children}</>
}

export function WorldMount({ world, shot }: { world: WorldDef; shot: WorldShotConfig }) {
  const Lighting = world.lightingPresets[shot.lighting]
  if (!Lighting) {
    throw new Error(`world '${world.id}' has no lighting preset '${shot.lighting}' (has: ${Object.keys(world.lightingPresets).join(', ')})`)
  }
  for (const r of shot.visibleRegions ?? []) {
    if (!world.regions.includes(r)) {
      throw new Error(`world '${world.id}' has no region '${r}' (has: ${world.regions.join(', ')})`)
    }
  }
  const visible = shot.visibleRegions ? new Set(shot.visibleRegions) : null
  const WorldBody = world.Component
  return (
    <RegionContext.Provider value={visible}>
      <Lighting />
      <WorldBody />
      {shot.actors}
    </RegionContext.Provider>
  )
}
