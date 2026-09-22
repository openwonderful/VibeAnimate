/**
 * FlowStudio — the editor shell (`?app=studio`).
 *
 * Layout: top bar (brand + transport + readouts) · left ShotList · center
 * Viewport · right Inspector · bottom Scenebuilder. One global anim clock
 * drives everything (see src/hooks/useAnimTime.tsx); the studio never
 * introduces a second time source.
 *
 * This file used to be 672 lines holding the film state, the undo stacks,
 * the rAF cut loop, the whole keymap, the soundtrack and the layout. Each of
 * those now lives in its own module under `state/` (F1); what is left here is
 * the part that genuinely is the shell — WHAT IS SELECTED, and how the
 * pieces are wired to each other:
 *
 *   state/useTimelineEdit    the working copy of the film + undo/redo
 *   state/usePlaybackCursor  the cut loop and its scene warming
 *   state/useSoundtrack      score and lyric sheet, following the film
 *   state/useStudioKeys      one keymap, one place to see the conflicts
 *   state/prefs              one persisted store for every user choice
 *   ui/StudioLayout          rails and splits as one state machine
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { AnimTimeProvider, seekAnimTime, setAnimPlaying } from '../hooks/useAnimTime'
import { DEFAULT_DURATION_SEC, sceneByKey, type SceneEntry } from '../scenes/manifest'
import type { TimelineItem } from '../remotion/timeline'
import { FILMS, type Film } from './films'
import { aspectById, isStageFit } from './aspect'
import { timeOfFrame } from './frames'
import { T } from './ui/theme'
import { RightRail, StudioLayout, TimelineRail, TIMELINE_MIN_H } from './ui/StudioLayout'
import { TopBar } from './panels/TopBar'
import { TimelinePanel } from './panels/TimelinePanel'
import { ShotList } from './panels/ShotList'
import { Storyboard } from './panels/Storyboard'
import { PreviewPanel } from './panels/PreviewPanel'
import { AssetBrowser } from './panels/AssetBrowser'
import { ViewportPanel } from './panels/ViewportPanel'
import { Inspector } from './panels/Inspector'
import { Outliner } from './panels/Outliner'
import { TerminalPanel } from './panels/TerminalPanel'
import { SettingsPanel } from './panels/SettingsPanel'
import { useBlenderKeys } from './editable/keys'
import { SongTrack } from '../components/SongTrack'
import { useTimelineEdit } from './state/useTimelineEdit'
import { useLatest } from './state/useLatest'
import { usePlaybackCursor, useScenePreload } from './state/usePlaybackCursor'
import { EMPTY_LYRICS, useSoundtrack } from './state/useSoundtrack'
import { useStudioKeys } from './state/useStudioKeys'
import { getPrefs, setPrefs, useStudioPrefs, type RightTab } from './state/prefs'
import { useJobPolling } from './state/jobs'
import type { Selection, ViewTarget } from './types'

// ?film=story preselects a film (handy for tooling screenshots); with no
// URL param the last session choice is restored from sessionStorage.
const initialFilm =
  FILMS.find(f => f.id === new URLSearchParams(window.location.search).get('film')) ??
  FILMS.find(f => f.id === sessionStorage.getItem('studioFilm')) ??
  FILMS[0]
const initialClip = initialFilm.items[0]

/** ?act=<key> deep-links the studio straight to a shot (detached from the
 *  timeline, same as clicking it in the Shots panel) — used by tooling
 *  screenshots and by "open this scene in the studio" links. */
const initialShot = (() => {
  const key = new URLSearchParams(window.location.search).get('act')
  return key ? sceneByKey(key) : undefined
})()

export default function FlowStudio() {
  return (
    <AnimTimeProvider>
      <StudioShell />
    </AnimTimeProvider>
  )
}

function StudioShell() {
  const prefs = useStudioPrefs()
  const [film, setFilm] = useState<Film>(initialFilm)
  const edit = useTimelineEdit(film)

  const [view, setView] = useState<ViewTarget>(initialShot
    ? {
      key: initialShot.key,
      masterFrom: null,
      durationSec: initialShot.durationSec ?? DEFAULT_DURATION_SEC,
      offsetSec: 0,
    }
    : {
      key: initialClip.key,
      masterFrom: initialClip.from - (initialClip.offsetSec ?? 0),
      durationSec: initialClip.duration,
      offsetSec: initialClip.offsetSec ?? 0,
    })
  const [selection, setSelection] = useState<Selection>(initialShot
    ? { type: 'shot', key: initialShot.key }
    : { type: 'clip', index: 0, item: initialClip })

  /**
   * The console is a RIGHT-RAIL TAB now (C2), not a drawer between the
   * viewport and the timeline — the one panel you open to look something up
   * was also the one that shoved everything you were looking at. `?console=1`
   * still selects it, through prefs.
   *
   * Backtick returns you to whichever tab you came from rather than to a
   * fixed one, so it is a peek rather than a mode change.
   */
  const lastRightTab = useRef<RightTab>(prefs.rightTab === 'console' ? 'inspector' : prefs.rightTab)
  useEffect(() => {
    if (prefs.rightTab !== 'console') lastRightTab.current = prefs.rightTab
  }, [prefs.rightTab])
  const consoleOpen = prefs.rightTab === 'console'
  const toggleConsole = useCallback(() => {
    setPrefs({ rightTab: getPrefs().rightTab === 'console' ? lastRightTab.current : 'console' })
  }, [])
  const [settingsOpen, setSettingsOpen] = useState(false)

  // A render is owned by the dev server, so this poll is also how a reloaded
  // tab rediscovers one that was already running (R3).
  useJobPolling()

  useEffect(() => { sessionStorage.setItem('studioFilm', film.id) }, [film.id])

  // Latest view/selection for the consumers registered once (the keymap) or
  // running inside rAF (the cut loop). Accessors, not refs — a ref handed
  // across a component boundary is a ref read during render.
  const getView = useLatest(view)
  const getSelection = useLatest(selection)
  const isConsoleOpen = useLatest(consoleOpen)

  const sound = useSoundtrack(film, getView)

  const openShot = useCallback((entry: SceneEntry) => {
    // Opening from the shot list detaches from the master timeline.
    setView({ key: entry.key, masterFrom: null, durationSec: entry.durationSec ?? DEFAULT_DURATION_SEC, offsetSec: 0 })
    setSelection({ type: 'shot', key: entry.key })
    setAnimPlaying(false)
    seekAnimTime(0)
  }, [])

  const selectClip = useCallback((index: number, item: TimelineItem) => {
    // masterFrom = master time at scene-local 0, so in-points keep the
    // master/local mapping linear (master = masterFrom + localTime).
    setView({ key: item.key, masterFrom: item.from - (item.offsetSec ?? 0), durationSec: item.duration, offsetSec: item.offsetSec ?? 0 })
    setSelection({ type: 'clip', index, item })
  }, [])

  const selectFilm = useCallback((next: Film) => {
    setFilm(next)
    edit.resetTo(next.items)
    const first = next.items[0]
    setView({ key: first.key, masterFrom: first.from - (first.offsetSec ?? 0), durationSec: first.duration, offsetSec: first.offsetSec ?? 0 })
    setSelection({ type: 'clip', index: 0, item: first })
    setAnimPlaying(false)
    seekAnimTime(0)
  }, [edit])

  /**
   * Seek by MASTER time: pick the clip that owns it, then place the clock at
   * the scene-local equivalent. The one place both the ruler drag and the
   * frame chip go through, so "type 2025" and "click at 1:07.5" cannot
   * disagree about which clip that is.
   *
   * Commit the scene change BEFORE moving the clock, or the outgoing scene
   * renders a frame or two at the incoming clip's time and the shot visibly
   * jumps — the same ordering rule as the cut in usePlaybackCursor.
   */
  const getItems = edit.getItems
  const seekMaster = useCallback((t: number) => {
    const items = getItems()
    const idx = items.findIndex(c => t >= c.from && t < c.from + c.duration)
    if (idx === -1) return
    const clip = items[idx]
    flushSync(() => selectClip(idx, clip))
    seekAnimTime(t - clip.from + (clip.offsetSec ?? 0))
  }, [selectClip, getItems])

  const seekMasterFrame = useCallback((frame: number) => {
    setAnimPlaying(false)
    seekMaster(Math.max(0, timeOfFrame(frame)))
  }, [seekMaster])

  const prefetchKey = usePlaybackCursor({ getView, getItems, getSelection, selectClip })
  useScenePreload(film.id, edit.items, view.key)

  // Blender mode's object keys (G/R/S · X/Y/Z · H · Tab · Esc) run in the
  // capture phase, so they win over the transport keys while an object is
  // selected and stand down entirely when nothing is.
  useBlenderKeys(true)

  useStudioKeys({
    films: FILMS,
    getView,
    getItems,
    getSelection,
    isConsoleOpen,
    undo: edit.undo,
    redo: edit.redo,
    changeItems: edit.changeItems,
    selectClip,
    selectFilm,
    toggleConsole,
  })

  // The Inspector wants the LIVE item, not the one captured at selection
  // time — a trim moves the clip under it.
  const liveSelection: Selection = selection?.type === 'clip'
    ? { ...selection, item: edit.items[selection.index] ?? selection.item }
    : selection

  // Which scenes the open film uses — the filter's "in film / shelf" split
  // and the Storyboard's shelf both ask this.
  const usedKeys = useMemo(() => new Set(edit.items.map(i => i.key)), [edit.items])

  const filmAspect = aspectById(film.aspect)
  // `fit` is the one picker value that is not a shape — it says "fill the
  // panel" and leaves the film's own shape as the answer to every question
  // about the delivered frame (the readouts, the guides, the render).
  const stageFit = isStageFit(prefs.aspectOverride)
  const aspect = aspectById(stageFit ? film.aspect : prefs.aspectOverride ?? film.aspect)
  const inspector = <Inspector selection={liveSelection} film={film} editedItems={edit.items} />

  return (
    <StudioLayout
      mode={prefs.stageMode}
      timelineHeight={prefs.timelineCollapsed ? 22 : prefs.timelineHeight}
      onTimelineHeight={h => setPrefs(
        // Dragging it below the useful minimum IS the collapse gesture —
        // one motion, no separate button to find.
        h < TIMELINE_MIN_H ? { timelineCollapsed: true } : { timelineHeight: h, timelineCollapsed: false })}
      leftWidth={prefs.leftRailWidth}
      onLeftWidth={w => setPrefs({ leftRailWidth: w })}
      rightWidth={prefs.rightRailWidth}
      onRightWidth={w => setPrefs({ rightRailWidth: w })}
      topBar={
        <TopBar
          view={view}
          film={film}
          items={edit.items}
          selection={selection}
          aspectLabel={stageFit ? `${aspect.label} · fit` : aspect.label}
          viewMode={prefs.viewMode}
          onViewMode={m => setPrefs({ viewMode: m })}
          onOpenSettings={() => setSettingsOpen(true)}
          onSeekMasterFrame={seekMasterFrame}
        />
      }
      left={prefs.viewMode !== 'edit' ? undefined : (
        <>
          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
            {(['shots', 'ingredients'] as const).map(tab => (
              <button
                key={tab}
                style={{
                  flex: 1, padding: '5px 0', fontSize: 11, fontWeight: 700,
                  letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer',
                  background: prefs.leftTab === tab ? T.panel : 'transparent',
                  color: prefs.leftTab === tab ? T.gold : T.textFaint,
                  border: `1px solid ${prefs.leftTab === tab ? T.border : 'transparent'}`,
                  borderRadius: 6, fontFamily: T.font, userSelect: 'none',
                }}
                onClick={() => setPrefs({ leftTab: tab })}
              >{tab}</button>
            ))}
          </div>
          {prefs.leftTab === 'shots'
            ? <ShotList activeKey={view.key} selection={selection} onOpenShot={openShot} usedKeys={usedKeys} />
            : <AssetBrowser selection={selection} onSelectIngredient={id => setSelection({ type: 'ingredient', id })} />}
        </>
      )}
      center={prefs.viewMode === 'preview' ? (
        <PreviewPanel
          film={film}
          items={edit.items}
          view={view}
          aspect={aspect}
          onSeekMaster={seekMaster}
        />
      ) : prefs.viewMode === 'board' ? (
        <Storyboard
          film={film}
          items={edit.items}
          onItemsChange={edit.changeItems}
          selection={selection}
          activeKey={view.key}
          onSelectClip={selectClip}
          onOpenShot={openShot}
        />
      ) : (
        <ViewportPanel
          view={view}
          lyrics={sound.showLyrics ? sound.lyrics : EMPTY_LYRICS}
          // Gated here rather than in usePlaybackCursor so the module PRELOAD
          // still happens either way — what this turns off is the second
          // mounted scene, not the loading of it, so a cut with prefetch off
          // is a black flash and not a stall.
          prefetchKey={prefs.prefetch ? prefetchKey : null}
          aspect={aspect}
          filmAspect={filmAspect}
          fit={stageFit}
        />
      )}
      right={prefs.viewMode === 'preview' ? undefined : prefs.viewMode === 'board' ? inspector : (
        <RightRail
          tab={prefs.rightTab}
          stacked={prefs.rightStacked}
          onTab={t => setPrefs({ rightTab: t })}
          onStacked={v => setPrefs({ rightStacked: v })}
          outliner={<Outliner />}
          inspector={inspector}
          console={<TerminalPanel view={view} onClose={toggleConsole} />}
        />
      )}
      timeline={prefs.timelineCollapsed ? (
        <TimelineRail
          progress={view.masterFrom == null ? null : (view.masterFrom + view.offsetSec) / film.durationSec}
          label={`${film.name} · ${edit.items.length} clips`}
          onExpand={() => setPrefs({ timelineCollapsed: false })}
        />
      ) : (
        <TimelinePanel
          film={film}
          items={edit.items}
          onItemsChange={edit.changeItems}
          view={view}
          selection={selection}
          onSelectClip={selectClip}
          onSelectFilm={selectFilm}
          onSeekMaster={seekMaster}
          soundtrack={sound.soundtrack}
          onSoundtrackChange={sound.changeSoundtrack}
          lyrics={sound.lyrics}
          lyricName={sound.lyricName}
          onLyricsLoad={sound.loadLyrics}
          showLyrics={sound.showLyrics}
          onShowLyrics={sound.setShowLyrics}
        />
      )}
      ambient={<>
        {settingsOpen && <SettingsPanel onClose={() => setSettingsOpen(false)} />}
        {/* The song, chasing the anim clock. Mounted once, outside the panels. */}
        <SongTrack
          src={sound.soundtrack.src}
          time={sound.songTime}
          volume={sound.soundtrack.volume}
          muted={sound.soundtrack.muted}
          maxDuration={film.durationSec}
        />
      </>}
    />
  )
}
