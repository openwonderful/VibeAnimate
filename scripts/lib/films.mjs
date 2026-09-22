/**
 * The film list, for tooling — parsed out of `src/studio/films.ts`.
 *
 * Same trick as `acts.mjs` does with the manifest, and for the same reason:
 * the list is authored in TypeScript for the app, tooling cannot execute
 * TypeScript, and a second hand-maintained copy of "which timeline, which
 * composition, which song" would drift the first time a film was added. The
 * cost is that `films.ts` entries have to stay literal — the same rule the
 * manifest already lives under.
 *
 * Returns, per film:
 *   { id, name, composition, sourcePath, timelineConst, audio, aspect, durationSec }
 *
 * `durationSec` is null whenever the entry uses an imported constant, which
 * all three currently do — the timeline slots carry the real lengths anyway.
 *
 * `timelineConst` is the identifier assigned to `items:`, which is what
 * `render-fast --const` needs: the story file declares three timelines and
 * parsing the whole file would stitch all three into one film.
 */
import { readFileSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')

export function listFilms() {
  const src = readFileSync(path.join(ROOT, 'src/studio/films.ts'), 'utf8')
  const body = src.match(/export const FILMS: Film\[\] = \[([\s\S]*?)\n\]/)
  if (!body) throw new Error('could not locate the FILMS array in src/studio/films.ts')

  const films = []
  // Split on the `id:` line — every entry starts with one, and it is the
  // only field guaranteed to be present and first.
  const blocks = body[1].split(/\n  \{\n/).slice(1)
  for (const block of blocks) {
    const str = (field) => block.match(new RegExp(`\\b${field}:\\s*'([^']*)'`))?.[1]
    const ident = (field) => block.match(new RegExp(`\\b${field}:\\s*([A-Z][A-Z0-9_]*)`))?.[1]
    // Every film currently declares its length as an imported constant
    // (TOTAL_DURATION_SEC, STORY_DURATION_SEC), which a regex cannot resolve
    // — so this is null unless someone writes a literal. Nothing here needs
    // it; the timeline slots carry the real lengths.
    const num = (field) => {
      const m = block.match(new RegExp(`\\b${field}:\\s*([\\d.]+)\\s*,`))
      return m ? Number(m[1]) : null
    }
    const id = str('id')
    if (!id) continue
    films.push({
      id,
      name: str('name') ?? id,
      composition: str('composition'),
      sourcePath: str('sourcePath'),
      timelineConst: ident('items'),
      // films.ts stores public-relative paths (they double as Remotion
      // staticFile() paths); ffmpeg wants a real one.
      audio: str('audio') ? `public/${str('audio')}` : null,
      // The shape the film IS. Absent = 16:9; it becomes part of the segment
      // cache key so a re-shape cannot silently reuse the old shape's cache.
      aspect: str('aspect') ?? null,
      durationSec: num('durationSec'),
    })
  }
  if (!films.length) throw new Error('FILMS array parsed but no entries found')
  return films
}

export function filmById(id) {
  return listFilms().find(f => f.id === id) ?? null
}
