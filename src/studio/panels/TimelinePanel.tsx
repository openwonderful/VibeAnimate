/**
 * TimelinePanel — the Scenebuilder: a visual track view of the master
 * timeline (src/remotion/timeline.ts). Clips are laid out in master-video
 * seconds; the playhead is bound to the global anim clock plus the active
 * clip's master offset. Click/drag seeks; clicking a clip loads its scene.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import type { TimelineItem } from '../../remotion/timeline'
import { FILMS, type Film } from '../films'
import { sceneByKey } from '../../scenes/manifest'
import { getAnimTime, seekAnimTime, setAnimPlaying } from '../../hooks/useAnimTime'
import { ClockChip, PlayheadLayer } from '../ui/clock'
import { trimDuration } from '../edit'
import { applyDrop, lengthBudget, planDrop, snapTargets, type DropPlan } from '../drag'
import { fmtTime as fmtFrames, frameOf, FPS } from '../frames'
import { thumbUrl } from '../thumbs'
import { getPrefs, setPrefs, useStudioPrefs } from '../state/prefs'
import { T, clipColor, fmtTime, panelStyle, panelHeaderStyle, btnStyle, btnActiveStyle, chipStyle } from '../ui/theme'
import { WaveformLane, LyricLane, AUDIO_LANE_H, LYRIC_LANE_H } from './tracks'
import { AudioTrackHeader, LaneLabel, LyricTrackHeader } from './TrackHeaders'
import { CameraLane, CAMERA_LANE_H } from './CameraLane'
import { placeCameraKeys } from '../cameraTrack'
import { useStudioMedia } from '../state/useStudioMedia'
import type { LyricLine } from '../lyrics'
import type { Selection, SoundtrackState, ViewTarget } from '../types'

const RULER_H = 22
const TRACK_H = 52

/** The track-header gutter (C1). Wide enough for a picker and a level
 *  slider, narrow enough that the film keeps the space. */
const HEADER_W = 132

type Props = {
  film: Film
  /** Edited working copy of the film's timeline (FlowStudio owns it). */
  items: TimelineItem[]
  onItemsChange: (items: TimelineItem[]) => void
  view: ViewTarget
  selection: Selection
  onSelectClip: (index: number, item: TimelineItem, atMasterTime?: number) => void
  onSelectFilm: (film: Film) => void
  /** Seek by MASTER time — owned by the shell so the ruler drag and the top
   *  bar's frame chip cannot disagree about which clip a time belongs to. */
  onSeekMaster: (t: number) => void
  /** Soundtrack + lyric state lives in FlowStudio (SongTrack mounts there,
   *  above the panel, so it survives a re-render of the timeline). */
  soundtrack: SoundtrackState
  onSoundtrackChange: (next: Partial<SoundtrackState>) => void
  lyrics: LyricLine[]
  lyricName: string
  onLyricsLoad: (name: string, text: string) => void
  showLyrics: boolean
  onShowLyrics: (show: boolean) => void
}

/** Trim quantises to whole FRAMES now, not to half-seconds: a cut lands on a
 *  frame, and a 0.5s grid could not express most of Act 4 (its measures are
 *  1.7s). Hold Alt to defeat snapping entirely. */
const MIN_DUR = 0.5

/** How far a drag must travel before it is a drag and not a click. */
const DRAG_THRESHOLD_PX = 4

export function TimelinePanel({
  film, items, onItemsChange, view, selection, onSelectClip, onSelectFilm, onSeekMaster,
  soundtrack, onSoundtrackChange, lyrics, lyricName, onLyricsLoad, showLyrics, onShowLyrics,
}: Props) {
  const prefs = useStudioPrefs()
  const TIMELINE = items
  const TOTAL_DURATION_SEC = Math.max(film.durationSec, ...items.map(i => i.from + i.duration))
  const pps = prefs.pps                 // pixels per second (zoom)
  const ripple = prefs.ripple
  const scrollRef = useRef<HTMLDivElement>(null)
  const draggingRef = useRef(false)
  const budget = lengthBudget(items, film.durationSec)
  // Trim-drag state: which clip, pointer-x origin, original duration.
  const trimRef = useRef<{ index: number; startX: number; origDur: number } | null>(null)

  const onTrimDown = (e: React.PointerEvent, index: number) => {
    e.stopPropagation()
    setAnimPlaying(false)
    trimRef.current = { index, startX: e.clientX, origDur: TIMELINE[index].duration }
    ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
  }
  const onTrimMove = (e: React.PointerEvent) => {
    const trim = trimRef.current
    if (!trim) return
    e.stopPropagation()
    const deltaSec = (e.clientX - trim.startX) / pps
    const raw = trim.origDur + deltaSec
    // Frames, not half-seconds. The old 0.5s grid could not express most of
    // Act 4 — its measures are 1.7s apiece — so trimming one always moved it
    // somewhere it had never been. Alt gives you the raw value.
    const next = Math.max(MIN_DUR, e.altKey ? raw : Math.round(raw * FPS) / FPS)
    if (next === TIMELINE[trim.index].duration) return
    onItemsChange(trimDuration(TIMELINE, trim.index, next, ripple))
  }
  const onTrimUp = (e: React.PointerEvent) => {
    if (trimRef.current) e.stopPropagation()
    trimRef.current = null
  }

  /*
   * Clip drag (T1).
   *
   * The old version moved the REAL clip by raw pixels while you dragged and
   * resolved a destination only on release, from wherever the centre had
   * ended up. Nothing said where it would land, nothing snapped, and Esc
   * could not cancel — "I can't tell where it's gonna land" was a fair
   * description of the code.
   *
   * Now the drag is a PLAN (see drag.ts). Every pointer-move recomputes it,
   * the ghost and the drop indicator draw it, and the release commits the
   * same plan the indicator was showing. Nothing in `items` changes until
   * then, so Esc is just "throw the plan away".
   *
   * Plain drag INSERTS — between two shots, nothing split. Hold Ctrl to
   * SPLICE it in exactly where you point, which splits the clip underneath.
   * The indicator draws the resolved destination either way, so the
   * difference is visible before you let go rather than after.
   */
  const moveRef = useRef<{ index: number; startX: number; active: boolean } | null>(null)
  const [drag, setDrag] = useState<{ index: number; dx: number; plan: DropPlan } | null>(null)

  const makePlan = useCallback((index: number, dxPx: number, e: { ctrlKey: boolean; metaKey: boolean; altKey: boolean }) => {
    // Alt defeats snapping for one drag — Premiere's modifier, and the one
    // you want when a cut has to sit a single frame off a beat.
    const snap = getPrefs().snap && !e.altKey
    return planDrop(TIMELINE, index, dxPx / pps, {
      // Plain drag INSERTS — the clip goes between two shots and nothing is
      // split, which is the edit you make constantly. Ctrl/Cmd SPLICES: the
      // clip lands exactly where you point and the clip under it splits in
      // two. Turning one shot into two should be asked for.
      mode: (e.ctrlKey || e.metaKey) ? 'splice' : 'insert',
      snapTo: snap ? snapTargets(TIMELINE, index, [view.masterFrom != null ? view.masterFrom + getAnimTime() : 0, ...lyrics.map(l => l.t)]) : [],
      pps,
    })
  }, [TIMELINE, pps, view.masterFrom, lyrics])

  const onClipMove = (e: React.PointerEvent) => {
    const mv = moveRef.current
    if (!mv) return
    const dx = e.clientX - mv.startX
    if (!mv.active && Math.abs(dx) > DRAG_THRESHOLD_PX) mv.active = true
    if (!mv.active) return
    e.stopPropagation()
    const plan = makePlan(mv.index, dx, e)
    if (plan) setDrag({ index: mv.index, dx, plan })
  }

  const onClipUp = (e: React.PointerEvent) => {
    const mv = moveRef.current
    moveRef.current = null
    const pending = drag
    setDrag(null)
    if (!mv?.active || !pending) return
    e.stopPropagation()
    const { items: next, index } = applyDrop(TIMELINE, pending.index, pending.plan)
    if (next === TIMELINE) return
    onItemsChange(next)
    onSelectClip(index, next[index])
  }

  // Esc cancels a drag in flight. On the window, not the clip, because
  // pointer capture means the clip has focus but the key does not go there.
  useEffect(() => {
    if (!drag) return
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key !== 'Escape') return
      ev.preventDefault()
      ev.stopPropagation()
      moveRef.current = null
      setDrag(null)
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [drag])

  // Playhead + master clock render in leaf components (SPEC §12.1) so
  // this panel doesn't re-render 60×/s.

  const timeAtClientX = useCallback((clientX: number): number => {
    const el = scrollRef.current
    if (!el) return 0
    const rect = el.getBoundingClientRect()
    const x = clientX - rect.left + el.scrollLeft
    return Math.max(0, Math.min(TOTAL_DURATION_SEC, x / pps))
  }, [pps, TOTAL_DURATION_SEC])

  const onPointerDown = (e: React.PointerEvent) => {
    draggingRef.current = true
    setAnimPlaying(false)
    onSeekMaster(timeAtClientX(e.clientX))
    ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (draggingRef.current) onSeekMaster(timeAtClientX(e.clientX))
  }
  const onPointerUp = () => { draggingRef.current = false }

  /*
   * Continuous zoom (T3), anchored on the PLAYHEAD rather than the pointer
   * or the scroll origin.
   *
   * The playhead is where you are working. Anchoring on the scroll origin
   * means every zoom step walks the thing you are looking at off the side of
   * the panel and you spend the next second scrolling it back; anchoring on
   * the pointer is the file-manager convention and is wrong here for the
   * same reason a camera zooms on its subject.
   */
  const zoomTo = useCallback((next: number) => {
    const el = scrollRef.current
    const clamped = Math.max(2, Math.min(120, next))
    if (el) {
      const anchor = view.masterFrom != null ? view.masterFrom + getAnimTime() : el.scrollLeft / pps
      const offset = anchor * pps - el.scrollLeft          // where it sits on screen
      requestAnimationFrame(() => {
        if (scrollRef.current) scrollRef.current.scrollLeft = anchor * clamped - offset
      })
    }
    setPrefs({ pps: clamped })
  }, [pps, view.masterFrom])

  const onWheel = (e: React.WheelEvent) => {
    if (!e.ctrlKey && !e.metaKey) return
    e.preventDefault()
    // Exponential, so a step feels the same at 4 px/s as at 64.
    zoomTo(pps * (e.deltaY < 0 ? 1.15 : 1 / 1.15))
  }

  const width = TOTAL_DURATION_SEC * pps
  const tickEvery = pps >= 24 ? 1 : pps >= 12 ? 2 : pps >= 6 ? 5 : 10
  const ticks: number[] = []
  for (let s = 0; s <= TOTAL_DURATION_SEC; s += tickEvery) ticks.push(s)

  /** The clip the drag would produce, laid out for the indicator. */
  const dragged = drag ? TIMELINE[drag.index] : null

  const media = useStudioMedia()

  /**
   * The lane stack, declared once. The gutter and the scrolling lanes both
   * read it, so a film that has no lyric sheet or an extra overlay track
   * cannot leave the headers one row out of step with what they label.
   */
  // Only when the film's clips actually carry keys — an empty lane is a row
  // of chrome saying nothing, and this stack is already five deep.
  const hasCameraKeys = placeCameraKeys(TIMELINE).length > 0

  const lanes: { id: string; h: number; mt: number }[] = [
    { id: 'ruler', h: RULER_H, mt: 0 },
    ...(lyrics.length > 0 ? [{ id: 'lyrics', h: LYRIC_LANE_H, mt: 4 }] : []),
    ...(hasCameraKeys ? [{ id: 'camera', h: CAMERA_LANE_H, mt: 4 }] : []),
    ...(film.overlays && film.overlays.length > 0 ? [{ id: 'fx', h: 18, mt: 4 }] : []),
    { id: 'video', h: TRACK_H, mt: 8 },
    { id: 'audio', h: AUDIO_LANE_H, mt: 6 },
  ]

  return (
    <div style={{ ...panelStyle, flex: 1 }}>
      <div style={panelHeaderStyle}>
        <span>Scenebuilder</span>
        {FILMS.map(f => (
          <button
            key={f.id}
            style={{ ...(film.id === f.id ? btnActiveStyle : btnStyle), padding: '2px 10px', fontSize: 10 }}
            onClick={() => onSelectFilm(f)}
          >{f.name}</button>
        ))}
        <span style={chipStyle}>{TIMELINE.length} clips</span>

        {/*
          The length budget. The master film is LENGTH-LOCKED — timeline.ts
          throws at module load on a total that is not 3:10, on a gap, or on
          an overlap — so until now the first thing that told you an edit had
          made the film unbuildable was the build. You redistribute cut
          points here; you do not extend.
        */}
        <span
          title={budget.ok
            ? `${fmtFrames(budget.total)} — contiguous, and exactly the film's length. Exportable.`
            : [
              budget.overSec > 1e-6 ? `${budget.overSec.toFixed(2)}s OVER the film's length` : '',
              budget.overSec < -1e-6 ? `${(-budget.overSec).toFixed(2)}s UNDER the film's length` : '',
              budget.gaps.length ? `${budget.gaps.length} gap(s)` : '',
              budget.overlaps.length ? `${budget.overlaps.length} overlap(s)` : '',
              '— timeline.ts refuses to load like this.',
            ].filter(Boolean).join(' · ')}
          style={{
            ...chipStyle,
            color: budget.ok ? T.play : T.danger,
            borderColor: budget.ok ? undefined : T.danger,
          }}
        >
          {fmtFrames(budget.total)} / {fmtFrames(budget.target)}
          {budget.ok ? ' ✓' : budget.gaps.length || budget.overlaps.length
            ? ' ✕'
            : ` ${budget.overSec > 0 ? '+' : '−'}${Math.abs(budget.overSec).toFixed(2)}s`}
        </span>

        <button
          style={{ ...(ripple ? btnActiveStyle : btnStyle), padding: '2px 8px', fontSize: 10 }}
          title="Ripple: trimming a clip shifts every later clip to keep the timeline contiguous. Off, a trim leaves a GAP — and a gap makes the film unexportable."
          onClick={() => setPrefs({ ripple: !ripple })}
        >ripple</button>
        <button
          style={{ ...(prefs.snap ? btnActiveStyle : btnStyle), padding: '2px 8px', fontSize: 10 }}
          title="Snapping (S) — clip edges, the playhead and lyric cues. Hold Alt to defeat it for one drag."
          onClick={() => setPrefs({ snap: !prefs.snap })}
        >snap</button>
        {items !== film.items && (
          <button
            style={{ ...btnStyle, padding: '2px 8px', fontSize: 10, color: T.danger }}
            title="Discard timeline edits (restore the committed timeline)"
            onClick={() => onItemsChange(film.items)}
          >modified · reset</button>
        )}
        <span style={{ flex: 1 }} />
        {view.masterFrom != null && (
          <ClockChip masterFrom={view.masterFrom} style={{ color: T.gold, borderColor: T.goldDim }} />
        )}
        {/* Presets kept — they were explicitly worth keeping — with
            continuous zoom underneath them (Ctrl+wheel, and the ± chips). */}
        <button style={{ ...btnStyle, padding: '2px 7px', fontSize: 10 }} title="Zoom out (Ctrl+wheel)" onClick={() => zoomTo(pps / 1.4)}>−</button>
        {[4, 8, 16, 32].map(z => (
          <button
            key={z}
            style={{ ...(Math.abs(pps - z) < 0.51 ? btnActiveStyle : btnStyle), padding: '2px 8px', fontSize: 10 }}
            onClick={() => zoomTo(z)}
          >{z === 4 ? 'fit' : `${z / 8}×`}</button>
        ))}
        <button style={{ ...btnStyle, padding: '2px 7px', fontSize: 10 }} title="Zoom in (Ctrl+wheel)" onClick={() => zoomTo(pps * 1.4)}>+</button>
        <button
          style={{ ...btnStyle, padding: '2px 8px', fontSize: 10 }}
          title="Collapse the Scenebuilder to a rail that still shows the playhead"
          onClick={() => setPrefs({ timelineCollapsed: true })}
        >▾</button>
      </div>

      <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
      {/*
        The track-header gutter (C1). It does NOT scroll with the lanes —
        that fixed column is most of what makes a timeline read as an NLE —
        so the rows here mirror the lane stack's heights and margins exactly.
        One list drives both, which is the only way they stay aligned when a
        film adds an overlay track or drops its lyric sheet.
      */}
      <div style={{
        width: HEADER_W, flexShrink: 0, background: '#1c1c1d',
        borderRight: `1px solid ${T.border}`, userSelect: 'none',
        overflow: 'hidden',
      }}>
        {lanes.map(lane => (
          <div
            key={lane.id}
            style={{
              height: lane.h, marginTop: lane.mt, boxSizing: 'border-box',
              padding: '0 6px', display: 'flex', flexDirection: 'column',
              justifyContent: 'center', gap: 2, minWidth: 0,
              borderBottom: lane.id === 'ruler' ? `1px solid ${T.borderSoft}` : undefined,
            }}
          >
            {lane.id === 'ruler' && <LaneLabel color={T.textFaint}>TRACKS</LaneLabel>}
            {lane.id === 'lyrics' && (
              <LyricTrackHeader
                lyricName={lyricName}
                lyricCount={lyrics.length}
                onLyricsLoad={onLyricsLoad}
                showLyrics={showLyrics}
                onShowLyrics={onShowLyrics}
                media={media}
              />
            )}
            {lane.id === 'camera' && (
              <LaneLabel color="#c9a227">CAMERA</LaneLabel>
            )}
            {lane.id === 'fx' && <LaneLabel color="#6e5560">FX</LaneLabel>}
            {lane.id === 'video' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <LaneLabel color={T.gold}>VIDEO</LaneLabel>
                <span style={{ ...chipStyle, padding: '0 4px', fontSize: 9 }}>{TIMELINE.length}</span>
              </div>
            )}
            {lane.id === 'audio' && (
              <AudioTrackHeader
                soundtrack={soundtrack}
                onSoundtrackChange={onSoundtrackChange}
                media={media}
              />
            )}
          </div>
        ))}
      </div>

      <div
        ref={scrollRef}
        onWheel={onWheel}
        style={{ flex: 1, minWidth: 0, overflowX: 'auto', overflowY: 'auto', background: T.inset, position: 'relative' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <div style={{
          width, position: 'relative',
          minHeight: RULER_H + TRACK_H + LYRIC_LANE_H + AUDIO_LANE_H + CAMERA_LANE_H + 28,
        }}>
          {/* Ruler */}
          <div style={{ height: RULER_H, borderBottom: `1px solid ${T.borderSoft}`, position: 'relative', userSelect: 'none' }}>
            {ticks.map(s => (
              <div key={s} style={{ position: 'absolute', left: s * pps, top: 0, bottom: 0 }}>
                <div style={{ width: 1, height: 6, background: T.textFaint, position: 'absolute', bottom: 0 }} />
                <span style={{ fontSize: 9, fontFamily: T.mono, color: T.textFaint, position: 'absolute', top: 2, left: 3 }}>
                  {s % 60 === 0 ? `${s / 60}:00` : s % 10 === 0 || tickEvery <= 2 ? `${s}s` : ''}
                </span>
              </div>
            ))}
          </div>

          {/* Lyric lane — above the clips, because what you are checking is
              whether a cut lands ON a line. */}
          {lyrics.length > 0 && (
            <LyricLane lines={lyrics} pps={pps} onSeek={onSeekMaster} />
          )}

          {/* Camera keys (S4) — above the clips and below the lyrics, because
              the keys are anchored to the vocals and "does this still land on
              that word" is a question about the two rows together. */}
          {hasCameraKeys && (
            <CameraLane items={TIMELINE} pps={pps} onSeek={onSeekMaster} />
          )}

          {/* Overlay (FX) lane — read-only compositor track above the clips */}
          {film.overlays && film.overlays.length > 0 && (
            <div style={{ position: 'relative', height: 18, marginTop: 4 }}>
              {film.overlays.map(ov => (
                <div
                  key={`${ov.key}@${ov.from}`}
                  title={`overlay: ${ov.key} (${fmtTime(ov.from)} → ${fmtTime(ov.from + ov.duration)})`}
                  style={{
                    position: 'absolute',
                    left: ov.from * pps,
                    width: Math.max(2, ov.duration * pps - 2),
                    top: 0, height: 16,
                    background: '#6e556033',
                    border: '1px dashed #6e5560',
                    borderRadius: 4,
                    fontSize: 9, fontFamily: T.mono, color: T.textDim,
                    padding: '1px 6px', overflow: 'hidden', whiteSpace: 'nowrap',
                    boxSizing: 'border-box', userSelect: 'none',
                  }}
                >{ov.key}</div>
              ))}
            </div>
          )}

          {/* Clip track */}
          <div style={{ position: 'relative', height: TRACK_H, marginTop: 8 }}>
            {/* Gaps, drawn rather than silently repacked. A gap means the
                film will not build (timeline.ts throws), so it has to be
                visible at the place it exists, not just counted in a chip. */}
            {budget.gaps.map(g => (
              <div
                key={`gap${g.from}`}
                title={`GAP ${fmtFrames(g.from)} → ${fmtFrames(g.to)} — the film will not build with this in it.`}
                style={{
                  position: 'absolute', left: g.from * pps, width: Math.max(2, (g.to - g.from) * pps),
                  top: 0, height: TRACK_H, zIndex: 3,
                  background: '#c4574d33', border: `1px dashed ${T.danger}`, borderRadius: 4,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 9, fontFamily: T.mono, color: T.danger, userSelect: 'none',
                }}
              >GAP</div>
            ))}
            {TIMELINE.map((item, i) => {
              const c = clipColor(item.key)
              const isSel = selection?.type === 'clip' && selection.index === i
              const isActive = view.key === item.key && view.masterFrom === item.from
              const entry = sceneByKey(item.key)
              const dragging = drag?.index === i
              return (
                <div
                  key={`${item.key}@${item.from}`}
                  onPointerDown={e => {
                    e.stopPropagation()
                    setAnimPlaying(false)
                    onSelectClip(i, item, item.from)
                    seekAnimTime(item.offsetSec ?? 0)
                    moveRef.current = { index: i, startX: e.clientX, active: false }
                    ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
                  }}
                  onPointerMove={onClipMove}
                  onPointerUp={onClipUp}
                  title={`${item.key} — ${entry?.title ?? ''}\n${fmtTime(item.from)} → ${fmtTime(item.from + item.duration)} · ${Math.round(item.duration * FPS)} frames${item.offsetSec ? `\nin-point ${frameOf(item.offsetSec)}f into the scene` : ''}${item.props ? `\nprops: ${JSON.stringify(item.props)}` : ''}`}
                  style={{
                    position: 'absolute',
                    left: item.from * pps,
                    width: Math.max(2, item.duration * pps - 2),
                    top: 0,
                    height: TRACK_H,
                    background: c.bg,
                    border: `1px solid ${isSel ? T.select : isActive ? T.gold : c.border}`,
                    boxShadow: isSel ? `0 0 0 1px ${T.select}` : 'none',
                    borderRadius: 5,
                    overflow: 'hidden',
                    padding: 0,
                    boxSizing: 'border-box',
                    userSelect: 'none',
                    // The dragged clip becomes a GHOST — it stays where it
                    // is and the indicator shows the destination, because
                    // moving the real clip is what made the old drag
                    // impossible to read.
                    opacity: dragging ? 0.35 : 1,
                    cursor: isSel ? 'grab' : 'pointer',
                  }}
                >
                  {/* X1 — the thumbnail. Already generated (npm run thumbs,
                      155 of them in public/thumbs/); the timeline was the
                      last surface still drawing plain rectangles. Faded
                      under the label so the label stays readable, and gone
                      below the width where it would just be noise. */}
                  {prefs.clipThumbs && item.duration * pps > 40 && (
                    <img
                      src={thumbUrl(item.key)}
                      alt=""
                      draggable={false}
                      onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                      style={{
                        position: 'absolute', inset: 0, width: '100%', height: '100%',
                        objectFit: 'cover', opacity: 0.5, pointerEvents: 'none',
                      }}
                    />
                  )}
                  <div style={{
                    position: 'absolute', inset: 0, padding: '4px 6px',
                    background: prefs.clipThumbs ? 'linear-gradient(180deg,#000000b0,#00000030 60%)' : undefined,
                  }}>
                    <div style={{ fontSize: 11, fontWeight: 700, fontFamily: T.mono, color: T.text, whiteSpace: 'nowrap' }}>
                      {item.key}
                    </div>
                    {item.duration * pps > 56 && (
                      <div style={{ fontSize: 9, color: T.textDim, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {entry?.title ?? ''}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
            {/*
              The drop indicator — the whole reason T1 exists. This is drawn
              from the SAME plan the release commits, so what you see is what
              happens; there is no second code path that resolves the
              destination differently on mouse-up.
            */}
            {drag && dragged && (
              <>
                <div
                  style={{
                    position: 'absolute',
                    // landsAt, not from: in insert mode the clip goes to a
                    // BOUNDARY, not to the pointer, and drawing the pointer
                    // would be the original "I can't tell where it's gonna
                    // land" complaint reintroduced by the back door.
                    left: drag.plan.landsAt * pps,
                    width: Math.max(2, dragged.duration * pps - 2),
                    top: -2, height: TRACK_H + 4, zIndex: 8,
                    // Splice is the one that costs a neighbour, so it is the
                    // one that looks different.
                    border: `2px solid ${drag.plan.mode === 'splice' ? T.play : T.select}`,
                    borderRadius: 5,
                    background: drag.plan.mode === 'splice' ? '#6fbf7322' : '#7fb0f222',
                    pointerEvents: 'none',
                  }}
                />
                {/* The snap line, at the edge that locked — so "why did it
                    stop there" is answerable at a glance. */}
                {drag.plan.snappedTo != null && (
                  <div style={{
                    position: 'absolute', left: drag.plan.snappedTo * pps,
                    top: -TRACK_H, bottom: -TRACK_H, width: 1,
                    background: T.gold, zIndex: 9, pointerEvents: 'none',
                  }} />
                )}
                {/* The offset, on the drag, in both units that matter. */}
                <div style={{
                  position: 'absolute',
                  left: drag.plan.landsAt * pps + 4,
                  top: -20, zIndex: 10, pointerEvents: 'none',
                  ...chipStyle,
                  background: '#000000d0',
                  color: drag.plan.mode === 'splice' ? T.play : T.select,
                  whiteSpace: 'nowrap',
                }}>
                  {/* The offset quoted is the one that HAPPENS, measured to
                      where the clip lands — not to where the pointer is. */}
                  {(() => {
                    const moved = drag.plan.landsAt - TIMELINE[drag.index].from
                    return <>
                      {moved >= 0 ? '+' : '−'}{Math.abs(moved).toFixed(2)}s
                      {' · '}{moved >= 0 ? '+' : '−'}{Math.abs(Math.round(moved * FPS))}f
                      {' · '}{fmtFrames(drag.plan.landsAt)}
                    </>
                  })()}
                  {drag.plan.mode === 'splice' ? ' · splice' : ''}
                  {drag.plan.snappedTo != null ? ' ⊣' : ''}
                </div>
              </>
            )}

            {/* Trim handle on the selected clip's out-point. Hit area is
                ~3× the visible bar (research: handles need 2×+ their
                visual size). Drag = trim duration, frame-quantised. */}
            {selection?.type === 'clip' && TIMELINE[selection.index] && (() => {
              const sel = TIMELINE[selection.index]
              return (
                <div
                  onPointerDown={e => onTrimDown(e, selection.index)}
                  onPointerMove={onTrimMove}
                  onPointerUp={onTrimUp}
                  title={`trim ${sel.key} — drag to change its out-point (frame-quantised; Alt for free${ripple ? ', ripple on' : ', ripple OFF: this leaves a gap'})`}
                  style={{
                    position: 'absolute',
                    left: (sel.from + sel.duration) * pps - 7,
                    top: -2,
                    width: 14,
                    height: TRACK_H + 4,
                    cursor: 'ew-resize',
                    zIndex: 6,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <div style={{ width: 4, height: TRACK_H - 14, borderRadius: 2, background: T.select }} />
                </div>
              )
            })()}
          </div>

          {/* Soundtrack, under the picture — NLE convention, and it puts the
              waveform directly below the clip that plays on it. */}
          <WaveformLane src={soundtrack.src} pps={pps} width={width} muted={soundtrack.muted} />

          {/* Playhead — leaf clock consumer, repositions without re-rendering the clip track */}
          <PlayheadLayer masterFrom={view.masterFrom} pps={pps} />
        </div>
      </div>
      </div>
    </div>
  )
}
