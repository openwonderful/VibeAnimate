import { lazy, Suspense, useEffect, useRef } from 'react'
import { SCENES, SCENE_GROUPS, type SceneEntry } from './scenes/manifest'
import DepthComposition from './scenes/zoom/DepthComposition'
import TopDownDebug from './scenes/zoom/TopDownDebug'
import { AnimTimeProvider } from './hooks/useAnimTime'
import { DebugCameraToggleButton, CameraShotPanel } from './scenes/DebugCamera'
import { TimeScrubber } from './scenes/TimeScrubber'

const FlowStudio = lazy(() => import('./studio/FlowStudio'))

// ?act= route map — derived entirely from the scene manifest.
// Add scenes in src/scenes/manifest.ts, not here.
const acts: Record<string, React.FC> = {}
for (const s of SCENES) acts[s.key] = lazy(s.load)

export default function App() {
  const params = new URLSearchParams(window.location.search)

  // ?app=studio → Flow Studio editor (owns its own AnimTimeProvider + chrome)
  if (params.get('app') === 'studio') {
    return (
      <Suspense fallback={<div style={{ background: '#050A14', width: '100%', height: '100%' }} />}>
        <FlowStudio />
      </Suspense>
    )
  }

  // ?mode=zoom → depth camera zoom mode (legacy alias for ?act=1.2; needs the
  // provider because the scene runs off the shared anim clock)
  if (params.get('mode') === 'zoom') {
    return (
      <AnimTimeProvider>
        <DepthComposition />
      </AnimTimeProvider>
    )
  }

  // ?mode=topdown → bird's-eye debug view of building layout + camera path
  if (params.get('mode') === 'topdown') {
    return <TopDownDebug />
  }

  // Support both ?act= (new) and ?scene= (legacy)
  const actKey = params.get('act') || params.get('scene')

  // No act specified → show navigation page
  if (!actKey) {
    return <ActNav />
  }

  const ActiveScene = acts[actKey] ?? acts['1.1']

  // ?ui=0 hides all dev chrome (nav link, camera/time panels) — used by
  // scripts/shot.mjs so screenshots capture only the scene.
  const hideUi = params.get('ui') === '0'

  return (
    <AnimTimeProvider>
      <Suspense fallback={<div style={{ background: '#050A14', width: '100%', height: '100%' }} />}>
        <ActiveScene />
      </Suspense>
      {!hideUi && <AppChrome />}
    </AnimTimeProvider>
  )
}

function AppChrome() {
  return (
    <>
      <a
        href="/"
        style={{
          position: 'fixed',
          top: 16,
          right: 16,
          zIndex: 99999,
          padding: '6px 14px',
          background: '#0A1628cc',
          border: '1px solid #D4A84340',
          borderRadius: 6,
          color: '#D4A843',
          textDecoration: 'none',
          fontSize: 13,
          fontFamily: 'system-ui, sans-serif',
          backdropFilter: 'blur(8px)',
          transition: 'border-color 0.2s',
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = '#D4A843' }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = '#D4A84340' }}
      >
        ← Home
      </a>
      <DebugCameraToggleButton />
      <CameraShotPanel />
      <TimeScrubber />
    </>
  )
}

// ── Navigation Page ─────────────────────────────────────────────
// Rows and sections derive from the manifest: SCENE_GROUPS gives the row
// order/titles, each row lists the nav-visible scenes of that group.

const navGroups = SCENE_GROUPS.map(group => ({
  group,
  items: SCENES.filter(s => s.group === group.name && s.nav !== false),
})).filter(g => g.items.length > 0)

function ActCard({ entry }: { entry: SceneEntry }) {
  return (
    <a
      href={`?act=${entry.key}`}
      style={{
        display: 'block',
        padding: '16px 14px',
        minWidth: 140,
        background: entry.transition
          ? 'linear-gradient(135deg, #1A1025 0%, #0F1F3E 100%)'
          : entry.key.includes('-B')
            ? 'linear-gradient(135deg, #0F1F3E 0%, #1A1025 100%)'
            : 'linear-gradient(135deg, #1A2840 0%, #0F1F3E 100%)',
        borderRadius: 8,
        textDecoration: 'none',
        color: '#E8D5B5',
        border: `1px solid ${entry.transition ? '#9B59B630' : '#D4A84330'}`,
        transition: 'border-color 0.2s, transform 0.2s',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = entry.transition ? '#9B59B6' : '#D4A843'
        e.currentTarget.style.transform = 'translateY(-2px)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = entry.transition ? '#9B59B630' : '#D4A84330'
        e.currentTarget.style.transform = 'translateY(0)'
      }}
    >
      <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 3 }}>{entry.label ?? entry.key}</div>
      {entry.title && <div style={{ fontSize: 11, opacity: 0.55 }}>{entry.title}</div>}
    </a>
  )
}

function ActNav() {
  const scrollRef = useRef<HTMLDivElement>(null)

  // Restore scroll position from sessionStorage
  useEffect(() => {
    const saved = sessionStorage.getItem('actNavScroll')
    if (saved && scrollRef.current) {
      scrollRef.current.scrollTop = parseInt(saved, 10)
    }
  }, [])

  // Save scroll position on scroll
  const handleScroll = () => {
    if (scrollRef.current) {
      sessionStorage.setItem('actNavScroll', String(scrollRef.current.scrollTop))
    }
  }

  const mainRows = navGroups.filter(g => !g.group.section)
  const sections = navGroups.filter(g => g.group.section)

  return (
    <div ref={scrollRef} onScroll={handleScroll} style={{
      background: '#050A14',
      minHeight: '100vh',
      padding: '40px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      color: '#E8D5B5',
      overflow: 'auto',
      position: 'fixed',
      inset: 0,
    }}>
      <h1 style={{ fontSize: 28, fontWeight: 300, marginBottom: 8, color: '#D4A843' }}>
        Body to Body — Act Navigator
      </h1>
      <p style={{ fontSize: 14, opacity: 0.5, marginBottom: 36 }}>
        Each act has A (default) and B (alt) proposals. Transitions shown in purple.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {mainRows.map(({ group, items }) => (
          <div key={group.name}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#D4A843', opacity: 0.8, minWidth: 52 }}>
                {group.name}
              </span>
              <span style={{ fontSize: 12, opacity: 0.35 }}>{group.title}</span>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', paddingLeft: 4 }}>
              {items.map(entry => (
                <ActCard key={entry.key} entry={entry} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {sections.map(({ group, items }) => (
        <div key={group.name} style={{ marginTop: 48, borderTop: '1px solid #ffffff10', paddingTop: 20 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#D4A843', opacity: 0.8 }}>
              {group.name}
            </span>
            <span style={{ fontSize: 12, opacity: 0.35 }}>{group.title}</span>
          </div>
          {group.name === 'Legacy' ? (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {items.map(entry => (
                <a key={entry.key} href={`?scene=${entry.key}`} style={{
                  fontSize: 11, padding: '4px 10px', background: '#ffffff08',
                  borderRadius: 4, color: '#ffffff50', textDecoration: 'none',
                }}>{entry.key}</a>
              ))}
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', paddingLeft: 4 }}>
              {items.map(entry => (
                <ActCard key={entry.key} entry={entry} />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
