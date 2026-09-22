/**
 * acts.mjs — enumerate scene keys from src/scenes/manifest.ts (heuristic
 * regex parse of the SCENES array). Shared by shot.mjs --list and sweep.mjs.
 */
import { readFileSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

function sceneBody() {
  const manifestPath = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)), '../../src/scenes/manifest.ts')
  const src = readFileSync(manifestPath, 'utf8')
  const m = src.match(/const SCENES[^=]*=\s*\[([\s\S]*?)\n\]/)
  if (!m) throw new Error(`could not locate the SCENES array in ${manifestPath}`)
  return m[1]
}

export function listActKeys() {
  const keys = [...sceneBody().matchAll(/^\s*\{ key: '([^']+)'/gm)].map(x => x[1])
  if (keys.length === 0) throw new Error('SCENES array parsed but no keys found')
  return keys
}

/**
 * Same parse, but carrying the fields the thumbnail sweep needs:
 * { key, title, group, durationSec }. `durationSec` is undefined when the
 * entry omits it (callers apply the manifest's DEFAULT_DURATION_SEC).
 */
export function listActs() {
  const acts = [...sceneBody().matchAll(/^\s*\{ key: '([^']+)'.*$/gm)].map(([line, key]) => ({
    key,
    title: line.match(/title: '([^']*)'/)?.[1] ?? key,
    group: line.match(/group: '([^']*)'/)?.[1] ?? '',
    durationSec: line.match(/durationSec: ([\d.]+)/)
      ? Number(line.match(/durationSec: ([\d.]+)/)[1])
      : undefined,
  }))
  if (acts.length === 0) throw new Error('SCENES array parsed but no keys found')
  return acts
}

/** Scene key → thumbnail basename. Mirrors compositionId() in the manifest. */
export const compositionId = key => key.replace(/[^a-zA-Z0-9-]/g, '-')
