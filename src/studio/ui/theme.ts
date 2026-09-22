/**
 * Flow Studio design tokens — one visual language for every panel.
 * Lifted from the existing dev-chrome palette (gold on deep navy) so the
 * studio reads as the same product as the viewer.
 *
 * NOTE: studio chrome must not use CSS keyframe animations — the global
 * anim clock pins all document animations when paused (syncCssAnimations).
 */
import type { CSSProperties } from 'react'

export const T = {
  // Surfaces — neutral near-black greys (professional NLE convention:
  // the chrome must never compete with the footage for color).
  bg: '#161616',        // app background / deepest
  panel: '#212122',     // panel surface
  panelAlt: '#2a2a2b',  // raised surface (cards, clips)
  inset: '#101011',     // wells (timeline track bed, viewport letterbox)
  // Lines — near-black separators between panels, subtle hairlines within
  border: '#0b0b0c',
  borderSoft: '#2e2e30',
  // Single restrained accent (steel blue) — `gold` kept as the legacy
  // token name so every consumer repoints automatically.
  gold: '#5b96e8',
  goldDim: '#5b96e833',
  // Text
  text: '#c9cbce',
  textDim: '#8e9296',
  textFaint: '#5d6165',
  // Accents
  accent: '#5b96e8',
  select: '#7fb0f2',
  play: '#6fbf73',
  danger: '#c4574d',
  // Stars need a colour of their own. `gold` is a legacy ALIAS of `accent`
  // (both #5b96e8, see above), and the active row is already drawn in it —
  // so a "gold star" would be invisible on exactly the row you are looking
  // at. Warm amber, the one thing in this chrome that is not blue.
  star: '#d8a34a',
  // Type
  font: 'system-ui, -apple-system, sans-serif',
  mono: 'ui-monospace, SFMono-Regular, Menlo, monospace',
} as const

/** Act-group → clip color. Keyed on the leading token of a scene key. */
export function clipColor(key: string): { bg: string; border: string } {
  const act = key.split(/[.-]/)[0]
  const map: Record<string, string> = {
    '1': '#4a5b73', '2': '#5d5375', '3': '#75604a', '4': '#4f6b58',
    '5': '#6e5560', '6': '#4f6a70', '7': '#6e6350', '8': '#575377',
    '9': '#71504f', story: '#4f6b66', lab: '#6b6b4f', fx: '#6e5560',
  }
  const c = map[act] ?? '#54575c'
  return { bg: c + '59', border: c }
}

export const panelStyle: CSSProperties = {
  background: T.panel,
  border: `1px solid ${T.border}`,
  borderRadius: 4,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  minHeight: 0,
  minWidth: 0,
}

export const panelHeaderStyle: CSSProperties = {
  padding: '7px 12px',
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: T.textDim,
  borderBottom: `1px solid ${T.borderSoft}`,
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  flexShrink: 0,
  userSelect: 'none',
}

export const btnStyle: CSSProperties = {
  background: T.panelAlt,
  border: `1px solid ${T.borderSoft}`,
  borderRadius: 3,
  color: T.text,
  fontSize: 12,
  fontFamily: T.font,
  padding: '5px 10px',
  cursor: 'pointer',
  userSelect: 'none',
}

export const btnActiveStyle: CSSProperties = {
  ...btnStyle,
  border: `1px solid ${T.accent}`,
  color: '#dce9fb',
  background: '#5b96e826',
}

export const inputStyle: CSSProperties = {
  background: T.inset,
  border: `1px solid ${T.borderSoft}`,
  borderRadius: 3,
  color: T.text,
  fontSize: 12,
  fontFamily: T.mono,
  padding: '5px 8px',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
}

export const chipStyle: CSSProperties = {
  fontSize: 10,
  fontFamily: T.mono,
  color: T.textDim,
  background: T.inset,
  border: `1px solid ${T.borderSoft}`,
  borderRadius: 3,
  padding: '2px 6px',
}

/**
 * Timecode moved to `studio/frames.ts` when the frame readouts (C3) needed
 * the other four coordinates alongside these two. Re-exported here so the
 * dozen `from '../ui/theme'` imports keep working — there is still exactly
 * one implementation, and it defaults to the manifest's FPS rather than to
 * a fourth hardcoded 30.
 */
export { frameOf, fmtTime } from '../frames'
