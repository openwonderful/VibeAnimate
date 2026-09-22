/**
 * AssetBrowser — the Ingredients panel: live 3D preview cards for every
 * registered ingredient. Each card is a tiny demand-frameloop Canvas
 * (static preview; cheap), selectable to inspect usage snippets.
 */
import { Suspense, useMemo, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { INGREDIENTS, INGREDIENT_CATEGORIES, type Ingredient, type IngredientCategory } from '../ingredients/registry'
import { T, panelStyle, panelHeaderStyle, inputStyle, chipStyle } from '../ui/theme'
import type { Selection } from '../types'

const CAT_COLORS: Record<IngredientCategory, string> = {
  character: '#75604a',
  prop: '#5d5375',
  environment: '#4f6b58',
  style: '#6b6b4f',
  fx: '#6e5560',
}

function PreviewCard({ ing, selected, onSelect }: {
  ing: Ingredient
  selected: boolean
  onSelect: () => void
}) {
  return (
    <div
      onClick={onSelect}
      style={{
        background: T.panelAlt,
        border: `1px solid ${selected ? T.gold : T.border}`,
        borderRadius: 7,
        overflow: 'hidden',
        cursor: 'pointer',
        userSelect: 'none',
      }}
    >
      <div style={{ height: 92, background: '#131316', position: 'relative' }}>
        <Canvas
          frameloop="demand"
          dpr={1}
          camera={{ position: [0, 0, 3.4], fov: 40 }}
          gl={{ antialias: true }}
          style={{ pointerEvents: 'none' }}
        >
          <Suspense fallback={null}>
            <ing.Preview />
          </Suspense>
        </Canvas>
        <span style={{
          position: 'absolute', top: 5, left: 5, fontSize: 8, fontWeight: 700,
          letterSpacing: '0.06em', textTransform: 'uppercase', color: '#fff',
          background: CAT_COLORS[ing.category] + 'CC', borderRadius: 3, padding: '1px 5px',
        }}>{ing.category}</span>
      </div>
      <div style={{ padding: '6px 8px' }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: selected ? T.gold : T.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {ing.name}
        </div>
        <div style={{ fontSize: 9, fontFamily: T.mono, color: T.textFaint, marginTop: 2 }}>{ing.id}</div>
      </div>
    </div>
  )
}

export function AssetBrowser({ selection, onSelectIngredient }: {
  selection: Selection
  onSelectIngredient: (id: string) => void
}) {
  const [filter, setFilter] = useState('')
  const [category, setCategory] = useState<IngredientCategory | null>(null)

  const counts = useMemo(() => {
    const c = new Map<IngredientCategory, number>()
    for (const i of INGREDIENTS) c.set(i.category, (c.get(i.category) ?? 0) + 1)
    return c
  }, [])

  const items = useMemo(() => {
    const q = filter.trim().toLowerCase()
    return INGREDIENTS.filter(i =>
      (!category || i.category === category) &&
      (!q ||
        i.id.toLowerCase().includes(q) ||
        i.name.toLowerCase().includes(q) ||
        i.tags.some(t => t.includes(q))),
    )
  }, [filter, category])

  return (
    <div style={{ ...panelStyle, flex: 1 }}>
      <div style={panelHeaderStyle}>
        <span>Ingredients</span>
        <span style={chipStyle}>{INGREDIENTS.length}</span>
      </div>
      <div style={{ padding: 8, borderBottom: `1px solid ${T.borderSoft}`, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <input
          style={inputStyle}
          placeholder="filter ingredients…"
          value={filter}
          onChange={e => setFilter(e.target.value)}
          spellCheck={false}
        />
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {INGREDIENT_CATEGORIES.filter(c => counts.has(c)).map(c => {
            const active = category === c
            return (
              <button
                key={c}
                onClick={() => setCategory(active ? null : c)}
                style={{
                  fontSize: 9, fontWeight: 700, letterSpacing: '0.05em',
                  textTransform: 'uppercase', cursor: 'pointer', userSelect: 'none',
                  padding: '2px 7px', borderRadius: 9,
                  background: active ? CAT_COLORS[c] + '55' : 'transparent',
                  color: active ? T.text : T.textFaint,
                  border: `1px solid ${active ? CAT_COLORS[c] : T.border}`,
                  fontFamily: T.font,
                }}
              >{c} {counts.get(c)}</button>
            )
          })}
        </div>
      </div>
      <div style={{
        flex: 1, overflowY: 'auto', padding: 8,
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, alignContent: 'start',
      }}>
        {items.map(ing => (
          <PreviewCard
            key={ing.id}
            ing={ing}
            selected={selection?.type === 'ingredient' && selection.id === ing.id}
            onSelect={() => onSelectIngredient(ing.id)}
          />
        ))}
      </div>
    </div>
  )
}
