/**
 * CharGallery — All 7 character variations side by side in a horizontal strip.
 * Each character renders in its own iframe for independent WebGL contexts.
 * Characters have subtle idle animations (vibing in place, not walking).
 */

const CHARS = [
  { key: 'char-crystal', label: 'Crystal' },
  { key: 'char-silhouette', label: 'Silhouette' },
  { key: 'char-particle', label: 'Particle' },
  { key: 'char-wireframe', label: 'Wireframe' },
  { key: 'char-brushstroke', label: 'Brush' },
  { key: 'char-human-a', label: 'Human A' },
  { key: 'char-human-b', label: 'Human B' },
  { key: 'char-stick-gold', label: 'Stick Gold' },
  { key: 'char-stick-gold2', label: 'Stick Gold 2' },
  { key: 'char-stick-neon', label: 'Stick Neon' },
]

export default function CharGallery() {
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
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              display: 'block',
            }}
            title={char.label}
          />
          {/* Label overlay */}
          <div style={{
            position: 'absolute',
            bottom: 12,
            left: 0,
            right: 0,
            textAlign: 'center',
            color: '#D4A843',
            fontSize: 11,
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
