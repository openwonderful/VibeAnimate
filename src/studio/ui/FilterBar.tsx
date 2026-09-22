/**
 * FilterBar — the box and the chips, shared by the Shots panel and the
 * Storyboard so that switching between them keeps what you typed.
 *
 * The chips take their colour from the filter definition rather than from a
 * single accent: the ingredient browser codes its categories by colour and a
 * naive shared component would flatten all five into blue.
 */
import { T, chipStyle, inputStyle } from './theme'
import { liveChips, toggleChip, type FilterState } from '../filter'
import type { SceneEntry } from '../../scenes/manifest'

export function FilterBar({ entries, usedKeys, starred, state, onChange, matched, total, placeholder }: {
  entries: SceneEntry[]
  usedKeys: Set<string>
  starred: Set<string>
  state: FilterState
  onChange: (next: FilterState) => void
  matched: number
  total: number
  placeholder?: string
}) {
  const chips = liveChips(entries, usedKeys, starred, state)
  const filtering = state.text.trim() !== '' || state.chips.length > 0

  return (
    <div style={{ padding: 8, borderBottom: `1px solid ${T.borderSoft}`, display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <input
          style={inputStyle}
          placeholder={placeholder ?? 'filter shots…'}
          value={state.text}
          onChange={e => onChange({ ...state, text: e.target.value })}
          spellCheck={false}
        />
        {filtering && (
          <button
            onClick={() => onChange({ text: '', chips: [] })}
            title="Clear the filter"
            style={{ ...chipStyle, cursor: 'pointer' }}
          >✕</button>
        )}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
        {chips.map(chip => {
          const on = state.chips.includes(chip.id)
          const color = chip.color ?? T.accent
          return (
            <button
              key={chip.id}
              onClick={() => onChange({ ...state, chips: toggleChip(state.chips, chip.id) })}
              title={chip.kind === 'act'
                ? `Only ${chip.label}. Acts OR together; other kinds narrow.`
                : `${chip.label} — narrows the result`}
              style={{
                ...chipStyle,
                cursor: 'pointer',
                padding: '1px 6px',
                color: on ? '#0d0d0e' : color,
                background: on ? color : T.inset,
                borderColor: on ? color : T.borderSoft,
                fontFamily: T.font,
              }}
            >{chip.label}</button>
          )
        })}
      </div>

      {/* The count used to read 155 whatever was typed, which made it a
          decoration rather than a readout. */}
      <div style={{ fontSize: 10, fontFamily: T.mono, color: filtering ? T.select : T.textFaint }}>
        {filtering ? `${matched} / ${total}` : `${total} shots`}
      </div>
    </div>
  )
}

/** The star, as a control. Its own colour token — `T.gold` is byte-identical
 *  to `T.accent`, which the active row already uses, so a "gold star" would
 *  be invisible on exactly the row you are looking at. */
export function StarButton({ on, onToggle, size = 12 }: {
  on: boolean
  onToggle: () => void
  size?: number
}) {
  return (
    <span
      role="button"
      tabIndex={-1}
      onClick={e => { e.stopPropagation(); onToggle() }}
      title={on ? 'Unstar' : 'Star this shot'}
      style={{
        fontSize: size,
        lineHeight: 1,
        cursor: 'pointer',
        color: on ? T.star : T.textFaint,
        opacity: on ? 1 : 0.35,
        userSelect: 'none',
        flexShrink: 0,
      }}
    >{on ? '★' : '☆'}</span>
  )
}
