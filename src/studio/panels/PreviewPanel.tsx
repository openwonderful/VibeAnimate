/**
 * PreviewPanel — the third workspace (R2): the film as a VIDEO FILE, chasing
 * the same clock as everything else.
 *
 * The measured problem it exists for: the master film in the studio runs at
 * 59 fps decaying to 23.9 by 0:07, with a 265 ms stall at the 0:26 cut, and
 * ~22 fps through Act 2. The same scenes in the plain viewer do exactly the
 * same, so the editor chrome is not the tax — Acts 1–3 are. No amount of
 * optimisation makes a 2.27M-triangle scene scrub, and it should not have to:
 * once a slot is rendered, the honest thing to watch is the render.
 *
 * ── Staleness is free, and that is the whole design ────────────────────
 * `render-fast` names each cached segment `<key>@<from>+<duration>.mp4`, so
 * a retimed slot misses the cache BY CONSTRUCTION. The same filenames tell
 * this panel exactly which slots the file on disk still represents — no
 * timestamps, no hashing, just set membership against the timeline the
 * studio currently holds. A slot whose name is absent is drawn hatched, and
 * what you are watching there is stale or missing rather than quietly wrong.
 *
 * ── One clock, still ───────────────────────────────────────────────────
 * The <video> follows via `useMediaFollow`, the same loop the song has used
 * all along — media chases, never leads. So the transport, the scrubber, the
 * frame chips and the Scenebuilder playhead all still address one number,
 * and switching to this tab changes what you are LOOKING at rather than what
 * time it is.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { getAnimTime, setAnimPlaying } from '../../hooks/useAnimTime'
import { useMediaFollow } from '../../components/useMediaFollow'
import type { TimelineItem } from '../../remotion/timeline'
import { devApiAvailable, studioGet } from '../devApi'
import { fmtClock } from '../frames'
import { startRender, useJobs, isActive } from '../state/jobs'
import { segmentName } from '../segments'
import { useStudioPrefs } from '../state/prefs'
import { T, btnStyle, chipStyle, panelStyle, panelHeaderStyle } from '../ui/theme'
import { aspectCss, type Aspect } from '../aspect'
import type { Film } from '../films'
import type { ViewTarget } from '../types'

type Segments = {
  comp: string
  segments: string[]
  master: { file: string; bytes: number; mtime: number } | null
  proxy: { file: string; bytes: number; mtime: number } | null
}

export function PreviewPanel({ film, items, view, aspect, onSeekMaster }: {
  film: Film
  items: TimelineItem[]
  view: ViewTarget
  aspect: Aspect
  onSeekMaster: (t: number) => void
}) {
  const prefs = useStudioPrefs()
  const comp = prefs.renderQuality === 'full' ? film.composition : `${film.composition}720`
  const [info, setInfo] = useState<Segments | null>(null)
  const { jobs } = useJobs()
  const busy = jobs.some(isActive)
  const videoRef = useRef<HTMLVideoElement>(null)

  // Re-read when a render finishes: the whole point of the panel is that the
  // file on disk is the thing being watched, so it has to notice the file
  // changing. `busy` flipping false is exactly that moment.
  useEffect(() => {
    if (!devApiAvailable()) return
    let live = true
    studioGet(`/__studio/segments?comp=${encodeURIComponent(comp)}`)
      .then(r => (r.ok ? r.json() : null))
      .then((s: Segments | null) => { if (live && s) setInfo(s) })
      .catch(() => { /* no dev server — the panel says so */ })
    return () => { live = false }
  }, [comp, busy])

  const have = useMemo(() => new Set(info?.segments ?? []), [info])
  const coverage = useMemo(() => items.map(it => ({
    item: it,
    fresh: have.has(segmentName(it)),
  })), [items, have])
  const freshCount = coverage.filter(c => c.fresh).length
  const filmEnd = items.length ? items[items.length - 1].from + items[items.length - 1].duration : 0

  // Prefer the proxy: 384×216@12 is about 5% of the bytes, which is the
  // difference between a seek landing instantly and a seek decoding half a
  // second of 1280×720. Quality is not the question this tab answers.
  const source = info?.proxy ?? info?.master ?? null
  const src = source ? `/${source.file}` : ''

  // Film time, from the same clock as everything else. Null when the shot is
  // detached, which pauses the video rather than guessing a position.
  const filmTime = useMemo(() => () => (
    view.masterFrom == null ? null : view.masterFrom + getAnimTime()
  ), [view.masterFrom])

  useMediaFollow(videoRef, { src, time: filmTime, maxDuration: film.durationSec })

  /**
   * Does the file actually SPAN the film?
   *
   * The panel maps film seconds straight onto file seconds, which is right
   * for a whole-film render and silently wrong for anything else — a master
   * rendered before the film was retimed, or a ranged output that landed on
   * the whole-film name. The symptom is the nastiest kind: the video clamps
   * to its last frame and just sits there looking like a still, while every
   * readout says the playhead is moving.
   *
   * Caught by measurement rather than by trust: the element reports its own
   * duration once metadata loads, and a second of disagreement is a second
   * of the film this file cannot show.
   */
  // Stamped with the src it was measured from, so switching files makes the
  // old measurement stale by comparison rather than by an effect that resets
  // it — which would be a cascading render, and would also leave one frame
  // in which the NEW file is on screen wearing the OLD file's verdict.
  const [measured, setMeasured] = useState<{ src: string; duration: number } | null>(null)
  const fileDuration = measured?.src === src ? measured.duration : null
  const spanShort = fileDuration != null && film.durationSec - fileDuration > 1

  const stale = coverage.length - freshCount

  return (
    <div style={{ ...panelStyle, flex: 1 }}>
      <div style={panelHeaderStyle}>
        <span>Preview</span>
        <span style={chipStyle}>{comp}</span>
        {source && (
          <span style={chipStyle} title={`${source.file} — ${(source.bytes / 1e6).toFixed(1)} MB`}>
            {info?.proxy ? 'proxy 384×216@12' : 'master'}
          </span>
        )}
        <span style={{ flex: 1 }} />
        {spanShort && (
          <span
            style={{ ...chipStyle, color: T.danger, borderColor: T.danger }}
            title={`This file is ${fmtClock(fileDuration ?? 0)} long but the film is ${fmtClock(film.durationSec)}. Film time is mapped straight onto file time, so past the end the video clamps to its last frame while every readout keeps moving — it would look like a still, not like a bug. Render the whole film.`}
          >covers {fmtClock(fileDuration ?? 0)} of {fmtClock(film.durationSec)}</span>
        )}
        <span
          style={{ ...chipStyle, color: stale ? T.danger : T.play, borderColor: stale ? T.danger : undefined }}
          title={stale
            ? `${stale} slot(s) have no segment matching their current timing. render-fast keys the cache on <key>@<from>+<duration>, so a retimed slot misses by construction — what you see across those ranges is old.`
            : 'Every slot on the timeline has a segment at its current timing.'}
        >{freshCount} / {coverage.length} slots current</span>
        <button
          style={{ ...btnStyle, padding: '2px 8px', fontSize: 10 }}
          disabled={busy}
          title="Render the missing and retimed slots — cached ones are reused"
          onClick={() => { setAnimPlaying(false); void startRender({ kind: 'film', filmId: film.id, quality: prefs.renderQuality }) }}
        >{busy ? 'rendering…' : 'refresh'}</button>
      </div>

      <div style={{
        flex: 1, minHeight: 0, display: 'flex', alignItems: 'center',
        justifyContent: 'center', padding: 10, background: T.inset,
      }}>
        {src ? (
          <video
            ref={videoRef}
            src={src}
            // MUTED, always. The song is already playing under the studio via
            // SongTrack; letting the file's own audio through would give you
            // the same track twice, a few frames apart.
            muted
            playsInline
            preload="auto"
            onLoadedMetadata={e => setMeasured({ src, duration: e.currentTarget.duration })}
            style={{
              maxWidth: '100%', maxHeight: '100%', aspectRatio: aspectCss(aspect),
              background: '#000', borderRadius: 4, boxShadow: '0 4px 24px #00000080',
            }}
          />
        ) : (
          <div style={{ textAlign: 'center', color: T.textFaint, fontSize: 12, maxWidth: 460, lineHeight: 1.6 }}>
            {devApiAvailable()
              ? <>Nothing rendered for <b style={{ color: T.textDim }}>{comp}</b> yet.
                  Hit <b style={{ color: T.textDim }}>refresh</b>, or RENDER ▾ → whole film.
                  Cached segments are reused, so this is only slow the first time.</>
              : <>No dev server — the preview plays files from <code>out/renders</code>,
                  which need <code>npm run dev</code>.</>}
          </div>
        )}
      </div>

      {/* Coverage strip. Click to seek, exactly like the film player's, and
          hatched where the file does not represent the current timing. */}
      <div style={{
        height: 26, flexShrink: 0, display: 'flex', gap: 1, padding: '4px 10px 6px',
        alignItems: 'stretch', userSelect: 'none',
      }}>
        {coverage.map(({ item, fresh }) => (
          <div
            key={`${item.key}@${item.from}`}
            onClick={() => onSeekMaster(item.from)}
            title={fresh
              ? `${item.key} — rendered at ${fmtClock(item.from)}, ${item.duration}s`
              : `${item.key} — no segment for ${item.from}s +${item.duration}s. Retimed or never rendered; this stretch is not current.`}
            style={{
              width: `${(item.duration / Math.max(1, filmEnd)) * 100}%`,
              borderRadius: 2, cursor: 'pointer',
              background: fresh
                ? '#6fbf7355'
                : 'repeating-linear-gradient(45deg,#c4574d33,#c4574d33 3px,transparent 3px,transparent 6px)',
              border: `1px solid ${fresh ? '#6fbf7388' : '#c4574d66'}`,
              // The clip you are on, so the strip is also a locator.
              outline: view.key === item.key && view.masterFrom === item.from
                ? `1px solid ${T.gold}` : undefined,
            }}
          />
        ))}
      </div>
    </div>
  )
}
