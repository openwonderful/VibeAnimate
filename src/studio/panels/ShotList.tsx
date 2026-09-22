/**
 * ShotList — every scene in the manifest, grouped like the Act Navigator,
 * as a compact editor list. Clicking a shot loads it in the viewport.
 */
import { useMemo } from 'react'
import { SCENES, SCENE_GROUPS, DEFAULT_DURATION_SEC, preloadScene, type SceneEntry } from '../../scenes/manifest'
import { T, panelStyle, panelHeaderStyle, chipStyle, clipColor } from '../ui/theme'
import { FilterBar, StarButton } from '../ui/FilterBar'
import { matchesFilter } from '../filter'
import { setPrefs, toggleStar, useStudioPrefs } from '../state/prefs'
import type { Selection } from '../types'

type Props = {
  activeKey: string
  selection: Selection
  onOpenShot: (entry: SceneEntry) => void
  /** Keys the active film uses — one of the filter's dimensions. */
  usedKeys: Set<string>
}

/** Listed shots: everything except the ones the navigator hides. */
const LISTED = SCENES.filter(s => s.nav !== false)

export function ShotList({ activeKey, selection, onOpenShot, usedKeys }: Props) {
  const prefs = useStudioPrefs()
  const filter = { text: prefs.filterText, chips: prefs.filterChips }
  const starred = useMemo(() => new Set(prefs.starred), [prefs.starred])

  const groups = useMemo(() => SCENE_GROUPS.map(group => ({
    group,
    items: LISTED.filter(s => s.group === group.name && matchesFilter(
      { entry: s, inFilm: usedKeys.has(s.key), starred: starred.has(s.key) },
      filter,
    )),
  })).filter(g => g.items.length > 0),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [prefs.filterText, prefs.filterChips, usedKeys, starred])

  const matched = groups.reduce((n, g) => n + g.items.length, 0)

  return (
    <div style={{ ...panelStyle, flex: 1 }}>
      <div style={panelHeaderStyle}>
        <span>Shots</span>
        <span style={chipStyle}>{SCENES.length}</span>
      </div>
      <FilterBar
        entries={LISTED}
        usedKeys={usedKeys}
        starred={starred}
        state={filter}
        onChange={next => setPrefs({ filterText: next.text, filterChips: next.chips })}
        matched={matched}
        total={LISTED.length}
      />
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
        {groups.map(({ group, items }) => (
          <div key={group.name}>
            <div style={{
              padding: '8px 12px 3px', fontSize: 10, fontWeight: 700, color: T.gold,
              opacity: 0.75, letterSpacing: '0.06em', userSelect: 'none',
            }}>
              {group.name} <span style={{ color: T.textFaint, fontWeight: 400 }}>{group.title}</span>
            </div>
            {items.map(entry => {
              const isActive = entry.key === activeKey
              const isSel = selection?.type === 'shot' && selection.key === entry.key
              const c = clipColor(entry.key)
              return (
                <div
                  key={entry.key}
                  onClick={() => onOpenShot(entry)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '4px 12px', cursor: 'pointer', userSelect: 'none',
                    background: isActive ? '#5b96e81f' : isSel ? '#ffffff08' : 'transparent',
                    borderLeft: `2px solid ${isActive ? T.gold : 'transparent'}`,
                  }}
                  // Hovering is a good enough signal that you are about to
                  // click: start the module fetch now, not on mousedown.
                  onMouseEnter={e => {
                    void preloadScene(entry.key)
                    if (!isActive) e.currentTarget.style.background = '#ffffff06'
                  }}
                  onMouseLeave={e => { e.currentTarget.style.background = isActive ? '#5b96e81f' : isSel ? '#ffffff08' : 'transparent' }}
                >
                  <StarButton on={starred.has(entry.key)} onToggle={() => toggleStar(entry.key)} />
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: c.border, flexShrink: 0 }} />
                  <span style={{ fontSize: 11, fontFamily: T.mono, color: isActive ? T.gold : T.text, minWidth: 44 }}>
                    {entry.label ?? entry.key}
                  </span>
                  <span style={{
                    fontSize: 11, color: T.textDim, overflow: 'hidden',
                    textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
                  }}>
                    {entry.title}
                  </span>
                  <span style={{ fontSize: 9, fontFamily: T.mono, color: T.textFaint }}>
                    {entry.durationSec ?? DEFAULT_DURATION_SEC}s
                  </span>
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
