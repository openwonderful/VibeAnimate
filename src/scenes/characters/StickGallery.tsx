/**
 * StickGallery — Stick-figure variants side-by-side.
 * Each variant renders in its own iframe for an independent WebGL context.
 */

const CHARS = [
  { key: 'char-stick-gold', label: 'Gold' },
  { key: 'char-stick-gold2', label: 'Gold 2' },
  { key: 'char-stick-gold3', label: 'Gold 3 (short legs)' },
  { key: 'char-stick-gold4', label: 'Gold 4 (Yeats)' },
  { key: 'char-stick-gold5', label: 'Gold 5 (Yeats + dance)' },
  { key: 'char-stick-gold5k', label: 'Gold 5K (keyframe)' },
  { key: 'char-stick-gold5r', label: 'Gold 5R (rigged)' },
  { key: 'char-stick-gold5g', label: 'Gold 5G (glowing)' },
]

export default function StickGallery() {
  return (
    <div style={{
      display: 'flex',
      width: '100vw',
      height: '100vh',
      background: '#050A14',
      overflow: 'hidden',
    }}>
      {CHARS.map((char, i) => (
        <div
          key={char.key}
          style={{
            flex: 1,
            height: '100%',
            position: 'relative',
            borderRight: i < CHARS.length - 1 ? '1px solid #D4A84320' : 'none',
          }}
        >
          <iframe
            src={`/?act=${char.key}`}
            style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
            title={char.label}
          />
          <div style={{
            position: 'absolute',
            bottom: 12,
            left: 0,
            right: 0,
            textAlign: 'center',
            color: '#D4A843',
            fontSize: 12,
            fontFamily: 'system-ui, sans-serif',
            fontWeight: 600,
            textShadow: '0 1px 4px #000, 0 0 8px #000',
            pointerEvents: 'none',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
          }}>
            {char.label}
          </div>
        </div>
      ))}
    </div>
  )
}
