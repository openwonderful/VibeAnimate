/**
 * ViewportPanel — mounts the active scene directly (same tab, same global
 * anim clock) inside a caged stage, in whatever shape the film is.
 *
 * Scenes are written for the full viewport and many use position:fixed —
 * the stage applies a `transform`, which per CSS makes it the containing
 * block for fixed-position descendants, so scenes render inside the panel
 * instead of escaping over the editor. vw/vh-sized elements may still
 * overshoot; `overflow: hidden` clips them (accepted v1 tradeoff — the
 * ⧉ button opens the true full-viewport view in a new tab).
 *
 * That caging rule is why fullscreen (S1) grows the SAME transformed wrapper
 * rather than promoting the scene to the document: drop the transform and
 * every fixed-position layer in every DOM scene escapes over the chrome.
 * It is also why the zoom wrapper is a second transform inside it — the
 * scenes cage to the zoom wrapper and magnify with it, while the camera
 * tooling and the toolbars sit outside it and stay their own size.
 */
import { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { SCENES, preloadScene } from '../../scenes/manifest'
import { DebugCameraToggleButton, CameraShotPanel } from '../../scenes/DebugCamera'
import { T, chipStyle } from '../ui/theme'
import { ClockChip } from '../ui/clock'
import { setEditableSceneContext } from '../editable/store'
import { captureShotRef, copyShotRef, shotRefToClaude } from '../shotref'
import { ObjectToolbar, TransformSidebar, PerfChip } from '../editable/ViewportOverlays'
import { LyricOverlay } from '../ui/LyricOverlay'
import { FrameGuides } from '../ui/FrameGuides'
import { LiveOverlay, LiveToggle } from '../live/LiveOverlay'
import { ASPECTS, STAGE_FIT, stageBoxCss, type Aspect } from '../aspect'
import { setPrefs, useStudioPrefs, type Guides, type StudioPrefs } from '../state/prefs'
import type { LyricLine } from '../lyrics'
import type { ViewTarget } from '../types'

// One lazy component per manifest entry (mirrors App.tsx's route map).
const sceneComponents: Record<string, React.LazyExoticComponent<React.ComponentType>> = {}
for (const s of SCENES) sceneComponents[s.key] = lazy(s.load)

/** Give up holding the old scene after this and show the new one anyway —
 *  DOM/SVG scenes never grow a canvas, so there is nothing to wait for. */
const HANDOVER_TIMEOUT_MS = 900

export function ViewportPanel({
  view, lyrics = [], prefetchKey = null, aspect = ASPECTS[0], filmAspect = ASPECTS[0],
  fit = false,
}: {
  view: ViewTarget
  lyrics?: LyricLine[]
  /** The clip AFTER this one — mounted hidden so the cut can be instant. */
  prefetchKey?: string | null
  /** The shape the stage is showing. One value drives the cage AND the stage
   *  box — they used to be two hardcoded 16:9s kept in agreement by hand. */
  aspect?: Aspect
  /** The shape the FILM is, so the picker can say when you are overriding it. */
  filmAspect?: Aspect
  /** Fill the panel instead of letterboxing to `aspect`. Deliberately a
   *  separate flag rather than a sixth Aspect: it is not a shape, and every
   *  consumer that reasons about the delivered frame must keep using
   *  `aspect`. See aspect.ts. */
  fit?: boolean
}) {
  const prefs = useStudioPrefs()
  const zoom = prefs.stageZoom
  const panRef = useRef<HTMLDivElement>(null)

  // Zooming in should put you in the MIDDLE of the frame, not its top-left
  // corner — the subject is almost never in the corner, and starting there
  // means every zoom begins with a scroll to undo it.
  //
  // Re-centred on the stage's SHAPE and SIZE too, not just on zoom: scroll
  // position is stored in pixels, so going fullscreen at 1.5× kept the offset
  // from the small stage and landed you in the top-left of a much bigger one.
  // Not on every resize, though — a window drag must not yank a deliberate
  // pan back to the middle.
  useLayoutEffect(() => {
    const el = panRef.current
    if (!el) return
    el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2
    el.scrollTop = (el.scrollHeight - el.clientHeight) / 2
  }, [zoom, prefs.stageMode, aspect.id, fit])

  /*
   * Double-buffered stage.
   *
   * Swapping the scene outright leaves the stage EMPTY for ~18 frames:
   * React unmounts the old <Canvas> immediately, and R3F does not create
   * the new canvas element until it has measured its container, so the cut
   * flashes black. Suspense does not help — by the time the playhead gets
   * here the module is already loaded, so nothing suspends.
   *
   * So the incoming scene mounts UNDERNEATH the outgoing one and only takes
   * over once it has actually drawn. Both are rendered from one keyed list,
   * which matters: promoting must not move the incoming element to a
   * different slot, or React remounts it and we pay the whole cost again.
   *
   * `prefetchKey` is what makes this work during PLAYBACK, and it is not
   * an optimisation — it is a correctness fix. A cut moves the clock to the
   * next clip's local time (≈0) at the same moment it changes the scene. If
   * the outgoing scene is still on top waiting for the incoming one to
   * draw, it spends that third of a second rendering ITSELF at t≈0 — the
   * shot visibly rewinds and replays its own opening before the cut lands.
   * Mounting the next clip during the tail of the current one means the
   * promotion happens in the same frame as the clock jump, so there is no
   * window for that to be seen.
   *
   * Cost is two live WebGL contexts (three while a handover overlaps a
   * prefetch). Bounded and small, deliberately — see CLAUDE.md on what
   * happens when a page holds many at once.
   */
  const [shown, setShown] = useState(view.key)
  const [incoming, setIncoming] = useState<string | null>(null)
  const stageRef = useRef<HTMLDivElement>(null)

  // Queried off the DOM rather than kept in a ref map: an inline ref
  // callback is re-registered on every render, so the map was transiently
  // empty exactly when this is asked — which sent every cut down the slow
  // polling path instead of promoting immediately.
  const hasDrawn = (key: string) => {
    const c = stageRef.current?.querySelector<HTMLCanvasElement>(
      `[data-scene="${CSS.escape(key)}"] canvas`)
    return !!c && c.width > 0
  }

  // Layout effect, not effect: when the next scene was prefetched it has
  // already drawn, so this promotes BEFORE paint and the wrong-clock frame
  // never reaches the screen.
  useLayoutEffect(() => {
    if (view.key === shown) { setIncoming(null); return }
    // Prefetched scenes have already drawn, so this promotes in the same
    // frame the request arrives and the wrong-clock frame never paints.
    if (hasDrawn(view.key)) { setShown(view.key); setIncoming(null); return }
    setIncoming(view.key)
  }, [view.key, shown])

  useEffect(() => {
    if (!incoming) return
    let raf = 0
    let frames = 0
    const promote = () => { setShown(incoming); setIncoming(null) }
    const give = window.setTimeout(promote, HANDOVER_TIMEOUT_MS)
    const check = () => {
      // Two drawn frames, not one: the first is often the clear colour.
      if (hasDrawn(incoming) && ++frames >= 2) { clearTimeout(give); promote(); return }
      raf = requestAnimationFrame(check)
    }
    raf = requestAnimationFrame(check)
    return () => { cancelAnimationFrame(raf); clearTimeout(give) }
  }, [incoming])

  // Belt and braces for entry points the timeline's lead-time preload does
  // not cover — clicking a cold shot in the Shots panel or on the board.
  useEffect(() => { void preloadScene(view.key) }, [view.key])

  // Object edits are scoped (and persisted) per scene; naming the scene
  // here is also what enables them at all — plain ?act= pages stay pure.
  // Keyed on what is actually on top, not what was requested.
  useEffect(() => {
    setEditableSceneContext(shown)
    return () => setEditableSceneContext('')
  }, [shown])

  /*
   * At most TWO scenes are ever mounted, and that ceiling is not
   * negotiable: each one is a live WebGL context, and letting four coexist
   * (visible + requested + handover + prefetch) made the GPU start evicting
   * them — "THREE.WebGLRenderer: Context Lost" — which blanks a scene
   * outright. Two is what a double buffer needs and nothing more.
   *
   * The partner slot is whichever matters most right now:
   *   mid-cut  → the REQUESTED scene, so it can draw and be promoted.
   *              (view.key must be here in its own right: at a cut it stops
   *              being the prefetch and becomes the request, while
   *              prefetchKey advances to the clip after it. Leaving it out
   *              unmounted the incoming scene in the very commit that
   *              needed it, and every cut fell back to the slow path.)
   *   settled  → the NEXT clip, warming for the cut ahead.
   */
  const partner = view.key !== shown ? view.key : prefetchKey
  const slots = [...new Set([shown, partner].filter((k): k is string => !!k))]
  const stage = slots.map(key => {
    const Scene = sceneComponents[key]
    return (
      <div
        key={key}
        // Which scene is actually on the stage (vs merely requested) —
        // addressable for tooling: [data-scene][data-on-top="1"].
        data-scene={key}
        data-on-top={key === shown ? '1' : '0'}
        style={{
          position: 'absolute', inset: 0,
          zIndex: key === shown ? 1 : 0,
          // Hidden with opacity, NOT display:none and not off-screen: the
          // element must keep its layout box (R3F sizes the canvas off it)
          // and stay in the paint path, or the prefetch never draws and is
          // not a prefetch at all.
          opacity: key === shown ? 1 : 0,
          pointerEvents: key === shown ? undefined : 'none',
        }}
      >
        <Suspense fallback={null}>{Scene ? <Scene /> : null}</Suspense>
      </div>
    )
  })

  return (
    <div style={{
      flex: 1, minHeight: 0, minWidth: 0, display: 'flex', flexDirection: 'column',
      background: T.inset, border: `1px solid ${T.border}`, borderRadius: 8, overflow: 'hidden',
    }}>
      {/* Stage header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '5px 10px',
        borderBottom: `1px solid ${T.borderSoft}`, flexShrink: 0,
      }}>
        <span style={{ fontSize: 12, fontFamily: T.mono, fontWeight: 700, color: T.gold }}>{view.key}</span>
        <ClockChip />
        {view.masterFrom != null && <ClockChip masterFrom={view.masterFrom} />}
        <span style={{ flex: 1 }} />

        <StageControls aspect={aspect} filmAspect={filmAspect} fit={fit} prefs={prefs} />

        <ShotRefButtons view={view} />

        <LiveToggle />

        <a
          href={`?act=${view.key}`}
          target="_blank"
          rel="noreferrer"
          title="Open full-viewport view in a new tab"
          style={{ ...chipStyle, color: T.textDim, textDecoration: 'none', cursor: 'pointer' }}
        >⧉ open</a>
      </div>

      {/* Letterboxed stage. The wrapper's transform cages fixed-position scene
          layers; `containerType: size` is what lets the box below size itself
          against THIS panel rather than the window — see stageBoxCss. */}
      <div style={{
        flex: 1, minHeight: 0, minWidth: 0, padding: 10,
        containerType: 'size',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div ref={stageRef} style={{
          position: 'relative',
          ...stageBoxCss(aspect, fit),
          transform: 'translateZ(0)',
          overflow: 'hidden',
          borderRadius: 4,
          background: '#000',
          boxShadow: '0 4px 24px #00000080',
        }}>
          {/*
           * Zoom is a MAGNIFIER, not a higher-resolution render, and that is
           * the right answer for what it is for: you are checking the frame
           * as it will be DELIVERED — a 20-pixel figure on a dark road —
           * and re-rendering the stage at 4× would show you detail the film
           * is never going to have. It also costs nothing: laying the scene
           * out four times larger would hand R3F a drawing buffer sixteen
           * times the pixels, on the acts that are already the slowest.
           *
           * Pan is native scrolling rather than a drag, because a drag on
           * the stage already means "orbit the debug camera".
           */}
          <div
            ref={panRef}
            // Addressable for tooling: the pan/zoom scroll container.
            data-stage-pan=""
            style={{
              position: 'absolute', inset: 0,
              overflow: zoom > 1 ? 'auto' : 'hidden',
              // Chrome paints scrollbars over the picture otherwise.
              scrollbarWidth: 'thin',
            }}
          >
            <div style={{ width: `${zoom * 100}%`, height: `${zoom * 100}%`, position: 'relative' }}>
              <div style={{
                position: 'absolute', top: 0, left: 0,
                width: `${100 / zoom}%`, height: `${100 / zoom}%`,
                transform: `scale(${zoom})`, transformOrigin: '0 0',
              }}>
                {stage}
              </div>
            </div>
          </div>

          {/* Live AI render: the stylised frame over the picture, with its wipe
              and prompt. Studio-only; never in a render. */}
          <LiveOverlay />
          <FrameGuides mode={prefs.guides} />
          {/* Lyrics over the picture — studio-only, never in a render. */}
          <LyricOverlay lines={lyrics} masterFrom={view.masterFrom} />
          {/* Camera tooling: the stage's transform cages these fixed-
              position panels to the viewport. ● Camera enables the debug
              orbit; the shot panel captures A/B poses and exports
              <CameraMove /> code — same tools as the plain viewer.
              Outside the zoom wrapper on purpose: they are chrome, and
              chrome that grows to 4× is unusable. */}
          <DebugCameraToggleButton style={{ top: 10, right: 232 }} />
          {/* The shot-ref chips are in the stage header too, but the header is
              not where you are looking after you have flown a framing — this
              panel is. Same buttons, second home. */}
          <CameraShotPanel extra={<ShotRefButtons view={view} compact />} />
          {/* Blender mode: object tools, N-panel, viewport stats. */}
          <ObjectToolbar />
          <TransformSidebar />
          <PerfChip />
          {/* Fullscreen has no top bar, so the way out has to be on the
              picture — Esc works too, but only if you know it does. */}
          {prefs.stageMode === 'full' && (
            <button
              onClick={() => setPrefs({ stageMode: 'normal' })}
              title="Leave fullscreen (Esc)"
              style={{
                position: 'absolute', top: 10, left: 10, zIndex: 20,
                ...chipStyle, cursor: 'pointer', background: '#000000a0',
              }}
            >✕ esc</button>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Shot refs — capture the current framing (clock + camera pose + a PNG of
 * the stage) as one pasteable token. `⌖ copy` puts it on the clipboard;
 * `⌖ → Claude` types it onto the sidebar terminal's prompt. The capture and
 * the token format live in ../shotref.ts; this is only the two chips and
 * their "done" feedback.
 */
function ShotRefButtons({ view, compact = false }: { view: ViewTarget; compact?: boolean }) {
  const [flash, setFlash] = useState<'copied' | 'sent' | 'failed' | null>(null)
  const timer = useRef<number>(0)
  const done = (state: 'copied' | 'sent' | 'failed') => {
    setFlash(state)
    clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setFlash(null), 1600)
  }

  // Tooling entry point: `window.__shotref()` captures without touching the
  // clipboard (headless Chrome has none) and returns the token. The header
  // copy owns it — the camera panel's copy is a second pair of buttons for
  // the same capture, not a second global.
  useEffect(() => {
    if (compact) return
    window.__shotref = () => captureShotRef(view).then(r => r.text)
    return () => { delete window.__shotref }
  }, [view, compact])

  // In the camera panel these sit among 11px monospace controls; in the
  // stage header they are chips like their neighbours.
  const base: React.CSSProperties = compact
    ? {
      padding: '4px 8px', background: '#0A1628cc', border: '1px solid #D4A84340',
      borderRadius: 4, fontSize: 11, fontFamily: 'system-ui, sans-serif',
    }
    : chipStyle

  return (
    <>
      <button
        onClick={() => copyShotRef(view).then(() => done('copied'), () => done('failed'))}
        title={'Copy a shot ref — scene, time, film frame, full camera orientation and a saved PNG of this exact framing, as one token to paste to a model. Fly the debug camera first (● Camera) to capture a framing the shot does not have yet.'}
        style={{ ...base, cursor: 'pointer', color: flash === 'copied' ? T.play : T.textDim }}
      >{flash === 'copied' ? '⌖ copied ✓' : compact ? '⌖ ref' : '⌖ copy ref'}</button>
      <button
        onClick={() => shotRefToClaude(view).then(r => done(r ? 'sent' : 'failed'), () => done('failed'))}
        title="Capture the same shot ref and type it onto the sidebar Claude's prompt — you finish the sentence with what you want done."
        style={{
          ...base, cursor: 'pointer',
          color: flash === 'sent' ? T.play : flash === 'failed' ? T.danger : T.textDim,
        }}
      >{flash === 'sent' ? '⌖ sent ✓' : flash === 'failed' ? '⌖ failed' : compact ? '⌖ →' : '⌖ → claude'}</button>
    </>
  )
}

/**
 * Stage controls — aspect, guides, zoom, and the two layout modes.
 *
 * The aspect picker is a SESSION OVERRIDE, not an edit. The film declares its
 * own shape in films.ts and that is what renders; this changes what you are
 * looking at, so you can check a 9:16 crop before deciding the film should be
 * one. The chip says `16:9 ⟲` when it is overriding, because a stage silently
 * showing a different shape from the film is exactly the kind of thing you
 * discover after cutting eight shots to it.
 */
function StageControls({ aspect, filmAspect, fit, prefs }: {
  aspect: Aspect
  filmAspect: Aspect
  fit: boolean
  prefs: StudioPrefs
}) {
  const overriding = prefs.aspectOverride != null && prefs.aspectOverride !== filmAspect.id
  const cycleGuides = () => {
    const order: Guides[] = ['off', 'thirds', 'safe', 'both']
    setPrefs({ guides: order[(order.indexOf(prefs.guides) + 1) % order.length] })
  }
  return (
    <>
      <select
        value={prefs.aspectOverride ?? 'film'}
        onChange={e => setPrefs({
          aspectOverride: e.target.value === 'film' ? null : e.target.value as StudioPrefs['aspectOverride'],
        })}
        title={fit
          ? `Fit — the picture is filling the panel, so what you see is NOT the delivered frame. The film is ${filmAspect.label} (${filmAspect.width}×${filmAspect.height}).`
          : overriding
            ? `Stage is ${aspect.label}; the film is ${filmAspect.label}. This is a preview override — it does not change what renders.`
            : `Stage aspect. The film is ${filmAspect.label} (${filmAspect.width}×${filmAspect.height}) and that is exactly what is on the stage.`}
        style={{
          ...chipStyle,
          cursor: 'pointer',
          color: overriding ? T.select : T.textDim,
          borderColor: overriding ? T.accent : undefined,
        }}
      >
        <option value="film">{filmAspect.label} · film</option>
        {ASPECTS.map(a => <option key={a.id} value={a.id}>{a.label} · {a.note}</option>)}
        {/* Last, and separated: it is the one entry that is not a shape. */}
        <option value={STAGE_FIT}>fit · fill the panel</option>
      </select>

      <button
        onClick={cycleGuides}
        title="Frame guides: off → thirds → safe areas → both"
        style={{
          ...chipStyle, cursor: 'pointer',
          color: prefs.guides === 'off' ? T.textFaint : T.select,
          borderColor: prefs.guides === 'off' ? undefined : T.accent,
        }}
      >⊞ {prefs.guides}</button>

      <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <button
          onClick={() => setPrefs({ stageZoom: Math.max(1, Math.round((prefs.stageZoom - 0.5) * 4) / 4) })}
          disabled={prefs.stageZoom <= 1}
          title="Zoom out"
          style={{ ...chipStyle, cursor: 'pointer', opacity: prefs.stageZoom <= 1 ? 0.4 : 1 }}
        >−</button>
        <button
          onClick={() => setPrefs({ stageZoom: 1 })}
          title="Magnify the delivered frame — this shows the pixels the render will have, not a higher-resolution redraw."
          style={{
            ...chipStyle, cursor: 'pointer', minWidth: 34, textAlign: 'center',
            color: prefs.stageZoom > 1 ? T.select : T.textFaint,
          }}
        >{prefs.stageZoom}×</button>
        <button
          onClick={() => setPrefs({ stageZoom: Math.min(6, prefs.stageZoom + 0.5) })}
          disabled={prefs.stageZoom >= 6}
          title="Zoom in"
          style={{ ...chipStyle, cursor: 'pointer', opacity: prefs.stageZoom >= 6 ? 0.4 : 1 }}
        >+</button>
      </span>

      <button
        onClick={() => setPrefs({ stageMode: prefs.stageMode === 'focus' ? 'normal' : 'focus' })}
        title="Focus — collapse both rails (Ctrl+\)"
        style={{
          ...chipStyle, cursor: 'pointer',
          color: prefs.stageMode === 'focus' ? T.select : T.textDim,
          borderColor: prefs.stageMode === 'focus' ? T.accent : undefined,
        }}
      >◱ focus</button>
      <button
        onClick={() => setPrefs({ stageMode: 'full' })}
        title="Fullscreen stage (\) — Esc to leave"
        style={{ ...chipStyle, cursor: 'pointer', color: T.textDim }}
      >⛶</button>
    </>
  )
}
