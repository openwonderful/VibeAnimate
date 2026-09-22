/**
 * Finding a shot among 155 (B2).
 *
 * There were TWO filter boxes — one in the Shots panel, one on the
 * Storyboard — with duplicated substring predicates that matched `key` and
 * `title` only, missed `label` and `group` entirely, and lost whatever you
 * had typed the moment you switched between them. The count chip beside the
 * box read 155 regardless of what was typed.
 *
 * One predicate here, one piece of state in prefs, both panels.
 *
 * The chips are not new metadata. Every dimension below is derivable from
 * what the manifest and the active film already say — which is why this is
 * a filter and not a tagging system nobody will maintain:
 *
 *   act        `group` (19 of them)
 *   in film    whether the active film's timeline uses the key
 *   variant    a `-B` / `-C` suffix — the alternate cuts
 *   starred    the only user-supplied bit, and it lives in prefs
 *   duration   short / medium / long, off `durationSec`
 *
 * OR within a dimension, AND across dimensions. That is the rule people
 * expect from faceted search without being told, and it is the only one
 * where ticking a second act WIDENS and ticking a second dimension NARROWS.
 */
import { DEFAULT_DURATION_SEC, SCENE_GROUPS, type SceneEntry } from '../scenes/manifest'

export type ChipKind = 'act' | 'use' | 'shape' | 'star'

export type FilterChip = {
  /** Stable id, persisted in prefs. */
  id: string
  label: string
  kind: ChipKind
  /** Chips of the same kind OR together; kinds AND together. */
  test: (ctx: ChipContext) => boolean
  /** Category colour, so a shared chip component cannot flatten the
   *  ingredient browser's per-category coding into one accent. */
  color?: string
}

export type ChipContext = {
  entry: SceneEntry
  /** Is this scene used by the film currently open? */
  inFilm: boolean
  starred: boolean
}

const ACT_COLOR: Record<ChipKind, string> = {
  act: '#5b96e8',
  use: '#6fbf73',
  shape: '#6e6350',
  star: '#d8a34a',
}

/** Built once — SCENE_GROUPS is a module constant. */
export const FILTER_CHIPS: FilterChip[] = [
  { id: 'star', label: '★', kind: 'star', color: ACT_COLOR.star, test: c => c.starred },
  { id: 'in', label: 'in film', kind: 'use', color: ACT_COLOR.use, test: c => c.inFilm },
  { id: 'shelf', label: 'shelf', kind: 'use', color: ACT_COLOR.use, test: c => !c.inFilm },
  {
    id: 'variant',
    label: 'variants',
    kind: 'shape',
    color: ACT_COLOR.shape,
    test: c => /-[A-Z]$/.test(c.entry.key),
  },
  {
    id: 'short',
    label: '< 5s',
    kind: 'shape',
    color: ACT_COLOR.shape,
    test: c => (c.entry.durationSec ?? DEFAULT_DURATION_SEC) < 5,
  },
  {
    id: 'long',
    label: '> 20s',
    kind: 'shape',
    color: ACT_COLOR.shape,
    test: c => (c.entry.durationSec ?? DEFAULT_DURATION_SEC) > 20,
  },
  ...SCENE_GROUPS.map(g => ({
    id: `act:${g.name}`,
    label: g.name,
    kind: 'act' as const,
    color: ACT_COLOR.act,
    test: (c: ChipContext) => c.entry.group === g.name,
  })),
]

const CHIP_BY_ID = new Map(FILTER_CHIPS.map(c => [c.id, c]))

export type FilterState = {
  text: string
  chips: string[]
}

/**
 * Text matches key, label, title OR group — all four, because "act 5" and
 * "streets" and "5.2" are all things you would type looking for the same
 * shot, and the old predicate answered only the last one.
 */
function matchesText(entry: SceneEntry, q: string): boolean {
  if (!q) return true
  const hay = `${entry.key} ${entry.label ?? ''} ${entry.title} ${entry.group}`.toLowerCase()
  // Every word must appear somewhere, in any order: "5 streets" finds it.
  return q.split(/\s+/).filter(Boolean).every(w => hay.includes(w))
}

export function matchesFilter(ctx: ChipContext, state: FilterState): boolean {
  if (!matchesText(ctx.entry, state.text.trim().toLowerCase())) return false
  if (!state.chips.length) return true

  const byKind = new Map<ChipKind, FilterChip[]>()
  for (const id of state.chips) {
    const chip = CHIP_BY_ID.get(id)
    if (!chip) continue                       // a chip removed in a later build
    const list = byKind.get(chip.kind) ?? []
    list.push(chip)
    byKind.set(chip.kind, list)
  }
  for (const [, chips] of byKind) {
    if (!chips.some(c => c.test(ctx))) return false
  }
  return true
}

/** Toggle a chip, returning a new list (prefs stores plain arrays). */
export function toggleChip(chips: string[], id: string): string[] {
  return chips.includes(id) ? chips.filter(c => c !== id) : [...chips, id]
}

/**
 * Which chips are worth SHOWING. Nineteen act chips plus six others is a
 * wall; the acts collapse to the ones that actually contain something the
 * text has not already filtered away, which is how the row stays a row.
 */
export function liveChips(entries: SceneEntry[], usedKeys: Set<string>, starred: Set<string>, state: FilterState): FilterChip[] {
  const present = new Set<string>()
  for (const entry of entries) {
    const ctx: ChipContext = { entry, inFilm: usedKeys.has(entry.key), starred: starred.has(entry.key) }
    if (!matchesText(entry, state.text.trim().toLowerCase())) continue
    for (const chip of FILTER_CHIPS) if (chip.test(ctx)) present.add(chip.id)
  }
  // A chip already ticked stays visible even if nothing matches it any more
  // — otherwise it disappears and you cannot untick the thing hiding
  // everything, which is a trap rather than a tidy-up.
  return FILTER_CHIPS.filter(c => present.has(c.id) || state.chips.includes(c.id))
}
