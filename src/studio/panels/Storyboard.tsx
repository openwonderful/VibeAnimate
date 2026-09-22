/**
 * Storyboard — the whole project as thumbnail cards, split into what is
 * IN the active film and what is not.
 *
 * The Shots panel answers "what scenes exist"; the Scenebuilder answers
 * "what plays when". Neither answers the question you actually ask while
 * cutting — *which of the things I built are in the film, and which are
 * sitting on the shelf* — because one is a text list of 155 rows and the
 * other is a strip of clips too small to recognise. This view is that
 * question, as pictures.
 *
 * Cards are stills from public/thumbs (see scripts/thumbs.mjs), never live
 * canvases: 150+ WebGL contexts on one page is not a thing a GPU will do.
 * A scene with no still yet falls back to a colored placeholder, so the
 * board is usable before the sweep has ever run.
 *
 * Drag moves clips within the film, and drags shelf scenes into it.
 */
import { useMemo, useState } from 'react'
import { SCENES, SCENE_GROUPS, DEFAULT_DURATION_SEC, sceneByKey, preloadScene, type SceneEntry } from '../../scenes/manifest'
import type { TimelineItem } from '../../remotion/timeline'
import type { Film } from '../films'
import { insertClip, deleteClip, repackOrder } from '../edit'
import { thumbUrl } from '../thumbs'
import { T, panelStyle, panelHeaderStyle, chipStyle, clipColor, fmtTime } from '../ui/theme'
import { FilterBar, StarButton } from '../ui/FilterBar'
import { matchesFilter } from '../filter'
import { setPrefs, toggleStar, useStudioPrefs } from '../state/prefs'
import type { Selection } from '../types'

type Props = {
  film: Film
  items: TimelineItem[]
  onItemsChange: (next: TimelineItem[]) => void
  selection: Selection
  activeKey: string
  onSelectClip: (index: number, item: TimelineItem) => void
  onOpenShot: (entry: SceneEntry) => void
}

/** Everything the board can show: the manifest minus the navigator's
 *  hidden entries and minus the `Film` group, whose entry is the whole cut
 *  rather than a shot you could place inside one. */
const SHELF_POOL = SCENES.filter(s => s.nav !== false && s.group !== 'Film')

/** What the pointer is carrying: an existing clip, or a shelf scene. */
type Drag =
  | { kind: 'clip'; index: number }
  | { kind: 'scene'; key: string; durationSec: number }
  | null

export function Storyboard({
  film, items, onItemsChange, selection, activeKey, onSelectClip, onOpenShot,
}: Props) {
  const [drag, setDrag] = useState<Drag>(null)
  const [dropAt, setDropAt] = useState<number | null>(null)

  const prefs = useStudioPrefs()
  // Shared with the Shots panel, so switching edit ⇄ board keeps what you
  // typed. It used to be two independent boxes and you lost it every time.
  const filter = { text: prefs.filterText, chips: prefs.filterChips }
  const starred = useMemo(() => new Set(prefs.starred), [prefs.starred])

  // Every key the film uses. A scene used twice is two clips but one
  // shelf entry, so membership is a set lookup, not a count.
  const usedKeys = useMemo(() => new Set(items.map(i => i.key)), [items])

  const passes = (entry: SceneEntry | undefined, key: string) =>
    !entry || matchesFilter(
      { entry, inFilm: usedKeys.has(key), starred: starred.has(key) },
      filter,
    )

  const inFilm = useMemo(() => items
    .map((item, index) => ({ item, index, entry: sceneByKey(item.key) }))
    .filter(({ item, entry }) => passes(entry, item.key)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, prefs.filterText, prefs.filterChips, starred])

  // The shelf: everything in the manifest the film does not use. The 'Film'
  // group is excluded — its entry is the whole cut, not a shot you could
  // place inside one.
  const shelf = useMemo(() => SCENE_GROUPS
    .filter(g => g.name !== 'Film')
    .map(group => ({
      group,
      entries: SCENES.filter(s =>
        s.group === group.name && s.nav !== false &&
        !usedKeys.has(s.key) && passes(s, s.key)),
    }))
    .filter(g => g.entries.length > 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [usedKeys, prefs.filterText, prefs.filterChips, starred])

  const shelfCount = shelf.reduce((n, g) => n + g.entries.length, 0)

  const endDrag = () => { setDrag(null); setDropAt(null) }

  /** Resolve whatever is being dragged into the film at `at`. */
  const dropInto = (at: number) => {
    if (!drag) return
    // Both branches select the clip out of the NEW array — the repacked
    // item carries the corrected `from`, and the viewport maps master time
    // through it.
    if (drag.kind === 'clip') {
      // repackOrder's destination index is into the post-removal list.
      const to = at > drag.index ? at - 1 : at
      const next = repackOrder(items, drag.index, to)
      if (next !== items) {
        onItemsChange(next)
        const idx = Math.max(0, Math.min(to, next.length - 1))
        onSelectClip(idx, next[idx])
      }
    } else {
      const next = insertClip(items, drag.key, drag.durationSec, at)
      const idx = Math.max(0, Math.min(at, next.length - 1))
      onItemsChange(next)
      onSelectClip(idx, next[idx])
    }
    endDrag()
  }

  const removeAt = (index: number) => {
    const next = deleteClip(items, index, true)
    if (next === items) return   // last clip — the film cannot go empty
    onItemsChange(next)
    const idx = Math.min(index, next.length - 1)
    onSelectClip(idx, next[idx])
  }

  const addToEnd = (entry: SceneEntry) => {
    const next = insertClip(items, entry.key, entry.durationSec ?? DEFAULT_DURATION_SEC, items.length)
    onItemsChange(next)
    onSelectClip(next.length - 1, next[next.length - 1])
  }

  const filmSeconds = items.reduce((n, i) => n + i.duration, 0)

  return (
    <div style={{ ...panelStyle, flex: 1 }}>
      <div style={panelHeaderStyle}>
        <span>Storyboard</span>
        <span style={chipStyle}>{film.name}</span>
      </div>

      <FilterBar
        entries={SHELF_POOL}
        usedKeys={usedKeys}
        starred={starred}
        state={filter}
        onChange={next => setPrefs({ filterText: next.text, filterChips: next.chips })}
        matched={inFilm.length + shelfCount}
        total={SHELF_POOL.length}
        placeholder="filter scenes…"
      />

      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 14px 18px' }}>
        {/* ── In the film ─────────────────────────────────────────── */}
        <SectionHeader
          label="In the film"
          accent={T.accent}
          count={inFilm.length}
          note={`${fmtTime(filmSeconds).replace(/\.\d+$/, '')} total · drag to reorder`}
        />
        <div
          style={GRID}
          onDragOver={e => { if (drag) e.preventDefault() }}
          onDrop={e => { e.preventDefault(); dropInto(dropAt ?? items.length) }}
        >
          {inFilm.map(({ item, index, entry }) => (
            <ClipCard
              key={`${item.key}@${item.from}-${index}`}
              item={item}
              index={index}
              title={entry?.title ?? '(missing scene)'}
              missing={!entry}
              selected={selection?.type === 'clip' && selection.index === index}
              active={item.key === activeKey}
              dragging={drag?.kind === 'clip' && drag.index === index}
              dropBefore={dropAt === index}
              onClick={() => onSelectClip(index, item)}
              onRemove={() => removeAt(index)}
              onDragStart={() => setDrag({ kind: 'clip', index })}
              onDragEnd={endDrag}
              onDragOverCard={half => setDropAt(half === 'left' ? index : index + 1)}
            />
          ))}
          {/* Tail drop zone — the only way to land a card after the last one. */}
          {drag && (
            <div
              onDragOver={e => { e.preventDefault(); setDropAt(items.length) }}
              onDrop={e => { e.preventDefault(); dropInto(items.length) }}
              style={{
                minHeight: 120, borderRadius: 4, display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                fontSize: 11, color: dropAt === items.length ? T.select : T.textFaint,
                border: `1px dashed ${dropAt === items.length ? T.select : T.borderSoft}`,
                background: dropAt === items.length ? '#5b96e814' : 'transparent',
              }}
            >append</div>
          )}
        </div>

        {/* ── Not in the film ─────────────────────────────────────── */}
        <SectionHeader
          label="Not in the film"
          accent={T.textDim}
          count={shelfCount}
          note="drag onto the film above, or ＋ to append"
        />
        {shelf.map(({ group, entries }) => (
          <div key={group.name}>
            <div style={{
              padding: '10px 2px 4px', fontSize: 10, fontWeight: 700,
              color: T.textDim, letterSpacing: '0.06em', userSelect: 'none',
            }}>
              {group.name}
              <span style={{ color: T.textFaint, fontWeight: 400 }}> — {group.title}</span>
            </div>
            <div style={GRID}>
              {entries.map(entry => (
                <ShelfCard
                  key={entry.key}
                  entry={entry}
                  active={entry.key === activeKey}
                  selected={selection?.type === 'shot' && selection.key === entry.key}
                  starred={starred.has(entry.key)}
                  onClick={() => onOpenShot(entry)}
                  onAdd={() => addToEnd(entry)}
                  onDragStart={() => setDrag({
                    kind: 'scene',
                    key: entry.key,
                    durationSec: entry.durationSec ?? DEFAULT_DURATION_SEC,
                  })}
                  onDragEnd={endDrag}
                />
              ))}
            </div>
          </div>
        ))}
        {shelfCount === 0 && (
          <div style={{ padding: '12px 2px', fontSize: 11, color: T.textFaint }}>
            {filter.text || filter.chips.length
              ? 'nothing off the film matches this filter.'
              : 'every scene in the manifest is in this film.'}
          </div>
        )}
      </div>
    </div>
  )
}

const GRID: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(184px, 1fr))',
  gap: 8,
}

function SectionHeader({ label, count, note, accent }: {
  label: string; count: number; note: string; accent: string
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'baseline', gap: 8, userSelect: 'none',
      padding: '14px 2px 8px', position: 'sticky', top: 0, zIndex: 2,
      background: T.panel,
    }}>
      <span style={{
        fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
        textTransform: 'uppercase', color: accent,
      }}>{label}</span>
      <span style={chipStyle}>{count}</span>
      <span style={{ fontSize: 10, color: T.textFaint }}>{note}</span>
    </div>
  )
}

/** The still, with a colored placeholder for scenes not yet swept. */
function Thumb({ sceneKey, height = 96 }: { sceneKey: string; height?: number }) {
  const [failed, setFailed] = useState(false)
  const c = clipColor(sceneKey)
  if (failed) {
    return (
      <div style={{
        height, background: `linear-gradient(160deg, ${c.bg}, ${T.inset})`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: T.mono, fontSize: 15, color: c.border, letterSpacing: '0.04em',
      }}>{sceneKey}</div>
    )
  }
  return (
    <img
      src={thumbUrl(sceneKey)}
      alt={sceneKey}
      draggable={false}
      onError={() => setFailed(true)}
      style={{ display: 'block', width: '100%', height, objectFit: 'cover', background: T.inset }}
    />
  )
}

function ClipCard({
  item, index, title, missing, selected, active, dragging, dropBefore,
  onClick, onRemove, onDragStart, onDragEnd, onDragOverCard,
}: {
  item: TimelineItem
  index: number
  title: string
  missing: boolean
  selected: boolean
  active: boolean
  dragging: boolean
  dropBefore: boolean
  onClick: () => void
  onRemove: () => void
  onDragStart: () => void
  onDragEnd: () => void
  onDragOverCard: (half: 'left' | 'right') => void
}) {
  const c = clipColor(item.key)
  return (
    <div
      draggable
      // Addressable from the studio console / CDP tooling: the board's
      // buttons are the only way to exercise add+remove without synthesising
      // HTML5 drag events.
      data-clip-index={index}
      data-clip-key={item.key}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={e => {
        e.preventDefault()
        const r = e.currentTarget.getBoundingClientRect()
        onDragOverCard(e.clientX < r.left + r.width / 2 ? 'left' : 'right')
      }}
      onClick={onClick}
      onMouseEnter={() => void preloadScene(item.key)}
      title={`${item.key} — ${title}`}
      style={{
        position: 'relative', cursor: 'pointer', userSelect: 'none',
        background: T.panelAlt, borderRadius: 4, overflow: 'hidden',
        border: `1px solid ${selected ? T.select : active ? T.accent : T.border}`,
        outline: dropBefore ? `2px solid ${T.select}` : 'none',
        outlineOffset: 1,
        opacity: dragging ? 0.35 : 1,
        boxShadow: selected ? `0 0 0 1px ${T.goldDim}` : 'none',
      }}
    >
      <Thumb sceneKey={item.key} />
      {/* Order badge — the card's place in the cut, which is the one thing
          a storyboard has to make obvious. */}
      <span style={{
        position: 'absolute', top: 4, left: 4, minWidth: 16, textAlign: 'center',
        fontFamily: T.mono, fontSize: 10, fontWeight: 700, color: '#0b0b0c',
        background: c.border, borderRadius: 2, padding: '1px 4px',
      }}>{index + 1}</span>
      <button
        data-action="remove"
        onClick={e => { e.stopPropagation(); onRemove() }}
        title="remove from the film"
        style={{
          position: 'absolute', top: 4, right: 4, width: 18, height: 18,
          lineHeight: '16px', textAlign: 'center', padding: 0,
          fontSize: 12, cursor: 'pointer', borderRadius: 2,
          background: '#101011cc', color: T.textDim,
          border: `1px solid ${T.borderSoft}`,
        }}
      >✕</button>
      <div style={{ padding: '5px 7px 6px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{
            fontFamily: T.mono, fontSize: 11,
            color: missing ? T.danger : T.text,
          }}>{item.key}</span>
          <span style={{ fontFamily: T.mono, fontSize: 9, color: T.textFaint, marginLeft: 'auto' }}>
            {fmtTime(item.from).replace(/\.\d+$/, '')} · {item.duration}s
          </span>
        </div>
        <div style={{
          fontSize: 10, color: T.textDim, overflow: 'hidden',
          textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {title}{item.offsetSec ? ` · in ${item.offsetSec}s` : ''}
        </div>
      </div>
    </div>
  )
}

function ShelfCard({ entry, active, selected, starred, onClick, onAdd, onDragStart, onDragEnd }: {
  entry: SceneEntry
  active: boolean
  selected: boolean
  starred: boolean
  onClick: () => void
  onAdd: () => void
  onDragStart: () => void
  onDragEnd: () => void
}) {
  return (
    <div
      draggable
      data-shelf-key={entry.key}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      title={`${entry.key} — ${entry.title}`}
      style={{
        position: 'relative', cursor: 'pointer', userSelect: 'none',
        background: T.panel, borderRadius: 4, overflow: 'hidden',
        border: `1px solid ${selected ? T.select : active ? T.accent : T.borderSoft}`,
        // Off-film cards read as shelved: desaturated until hovered.
        filter: 'saturate(0.55)',
      }}
      onMouseEnter={e => {
        void preloadScene(entry.key)
        e.currentTarget.style.filter = 'saturate(1)'
      }}
      onMouseLeave={e => { e.currentTarget.style.filter = 'saturate(0.55)' }}
    >
      <Thumb sceneKey={entry.key} height={86} />
      <span style={{
        position: 'absolute', top: 4, left: 5, zIndex: 2,
        textShadow: '0 1px 3px #000',
      }}>
        <StarButton on={starred} onToggle={() => toggleStar(entry.key)} size={14} />
      </span>
      <button
        data-action="add"
        onClick={e => { e.stopPropagation(); onAdd() }}
        title="append to the film"
        style={{
          position: 'absolute', top: 4, right: 4, width: 18, height: 18,
          lineHeight: '16px', textAlign: 'center', padding: 0,
          fontSize: 12, cursor: 'pointer', borderRadius: 2,
          background: '#101011cc', color: T.select,
          border: `1px solid ${T.borderSoft}`,
        }}
      >＋</button>
      <div style={{ padding: '5px 7px 6px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{ fontFamily: T.mono, fontSize: 11, color: T.text }}>
            {entry.label ?? entry.key}
          </span>
          <span style={{ fontFamily: T.mono, fontSize: 9, color: T.textFaint, marginLeft: 'auto' }}>
            {entry.durationSec ?? DEFAULT_DURATION_SEC}s
          </span>
        </div>
        <div style={{
          fontSize: 10, color: T.textDim, overflow: 'hidden',
          textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{entry.title}</div>
      </div>
    </div>
  )
}
