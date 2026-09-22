/**
 * RenderMenu — the render button (R1).
 *
 * Rendering used to live in three buried places: a `render clip` chip inside
 * the console header, a `preview film` chip beside it, and a clipboard-only
 * "copy render command" in the Inspector. The cached parallel master path —
 * the one you actually want — was not reachable from the UI at all, and you
 * learned a render had finished by watching stdout scroll past.
 *
 * So: one button, in the top bar, that is the source of truth. It launches;
 * the console stays the log sink it already was; the result is playable in
 * place because vite already serves `out/` with byte ranges.
 *
 * TWO THINGS THIS DELIBERATELY DOES NOT DO:
 *
 *  1. It does not send a command line. It sends a request — "this clip" —
 *     and the server builds the argv (see buildRenderJob in vite.config.ts).
 *  2. "Render this clip" does not map to `render:act <key>`. A per-scene
 *     composition's length is the manifest's `durationSec`, and six of the
 *     master's 25 slots are LONGER than their scene, so that call fails
 *     outright on 4.3/4.4/4.6/4.7/4.9/4.10. Everything routes through
 *     render-fast, which renders the slot's frames out of the film and
 *     honours slot duration by construction.
 *
 * The advanced knobs carry CLAUDE.md's warnings verbatim, because they are
 * the difference between a four-minute segment and a two-hour one.
 */
import { useEffect, useRef, useState } from 'react'
import { getAnimTime, setAnimPlaying } from '../../hooks/useAnimTime'
import { fmtClock } from '../frames'
import { T, btnStyle, chipStyle, panelHeaderStyle } from '../ui/theme'
import { getPrefs, setPrefs, useStudioPrefs } from '../state/prefs'
import {
  isActive, killJob, progressOf, refreshJobs, startRender, useJobs, watchJob,
  type Job, type RenderRequest,
} from '../state/jobs'
import { devApiAvailable } from '../devApi'
import type { Film } from '../films'
import type { TimelineItem } from '../../remotion/timeline'
import type { Selection, ViewTarget } from '../types'

export function RenderMenu({ film, items, view, selection }: {
  film: Film
  items: TimelineItem[]
  view: ViewTarget
  selection: Selection
}) {
  const [open, setOpen] = useState(false)
  const { jobs, error } = useJobs()
  const active = jobs.filter(isActive)
  const latest = jobs[jobs.length - 1] ?? null

  const clip = selection?.type === 'clip' ? items[selection.index] : null

  const send = (req: Omit<RenderRequest, 'filmId'>) => {
    setOpen(false)
    setAnimPlaying(false)
    void startRender({ ...req, filmId: film.id, quality: getPrefs().renderQuality })
  }

  return (
    <span style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        title={active.length
          ? `${active.length} render${active.length > 1 ? 's' : ''} in flight — click for the log`
          : 'Render this clip, a range, or the whole film'}
        style={{
          ...btnStyle,
          padding: '4px 10px',
          fontWeight: 700,
          letterSpacing: '0.06em',
          color: error ? T.danger : active.length ? T.play : T.text,
          border: `1px solid ${active.length ? T.play : T.borderSoft}`,
        }}
      >
        RENDER{active.length ? <RunningPill jobs={active} /> : ' ▾'}
      </button>
      {open && (
        <Menu
          film={film}
          items={items}
          clip={clip}
          view={view}
          latest={latest}
          onClose={() => setOpen(false)}
          onSend={send}
        />
      )}
    </span>
  )
}

/** The progress number, in the button, where you can see it without opening
 *  anything. Reads the watched job's log, which the poll keeps current. */
function RunningPill({ jobs }: { jobs: Job[] }) {
  const { log, logFor } = useJobs()
  const mine = jobs.find(j => j.id === logFor)
  const { pct } = progressOf(mine ? log : '')
  return (
    <span style={{ marginLeft: 6, fontVariantNumeric: 'tabular-nums' }}>
      {pct == null ? '···' : `${pct}%`}
      {jobs.length > 1 ? ` +${jobs.length - 1}` : ''}
    </span>
  )
}

function Menu({ film, items, clip, view, latest, onClose, onSend }: {
  film: Film
  items: TimelineItem[]
  clip: TimelineItem | null
  view: ViewTarget
  latest: Job | null
  onClose: () => void
  onSend: (req: Omit<RenderRequest, 'filmId'>) => void
}) {
  const prefs = useStudioPrefs()
  const ref = useRef<HTMLDivElement>(null)
  const [advanced, setAdvanced] = useState(false)

  // Click-away, on the document so it also closes when the click lands in a
  // scene canvas (which swallows its own pointer events).
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [onClose])

  useEffect(() => { void refreshJobs() }, [])

  const clipRange = clip ? { from: clip.from, to: clip.from + clip.duration } : null
  // A range around the playhead, snapped OUT to clip boundaries — render-fast
  // requires segment alignment and refuses anything else, so offering an
  // arbitrary window would just produce a confusing error.
  const here = view.masterFrom == null ? null : view.masterFrom + getAnimTime()
  const last = items[items.length - 1]
  const filmEnd = last ? last.from + last.duration : 0
  const clipStart = (t: number) => {
    let best = 0
    for (const it of items) if (it.from <= t + 1e-6) best = it.from
    return best
  }

  return (
    <div
      ref={ref}
      style={{
        position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 60,
        width: 340, background: T.panel, border: `1px solid ${T.borderSoft}`,
        borderRadius: 6, boxShadow: '0 10px 30px #00000090', overflow: 'hidden',
        fontFamily: T.font,
      }}
    >
      <div style={panelHeaderStyle}>
        <span>render</span>
        <span style={{ flex: 1 }} />
        <span style={{ ...chipStyle, textTransform: 'none' }}>{film.name}</span>
      </div>

      <Item
        label="This clip"
        note={clipRange
          ? `${clip!.key} · ${fmtClock(clipRange.from)}–${fmtClock(clipRange.to)} · ${clip!.duration}s`
          : 'select a clip first'}
        disabled={!clipRange}
        onClick={() => clipRange && onSend({ kind: 'clip', key: clip!.key, ...clipRange })}
      />
      <Item
        label="From here to the end"
        note={here == null
          ? 'attach to the timeline first'
          : `${fmtClock(clipStart(here))} → end`}
        disabled={here == null}
        onClick={() => here != null && onSend({ kind: 'range', from: clipStart(here), to: filmEnd })}
      />
      <Item
        label="Whole film"
        note={`${film.name} · cached segments, only what changed re-renders`}
        onClick={() => onSend({ kind: 'film' })}
      />
      <Item
        label="Whole film, from scratch"
        note="ignores the segment cache — minutes to an hour"
        onClick={() => onSend({ kind: 'film', force: true })}
      />

      <div style={{ borderTop: `1px solid ${T.borderSoft}`, padding: '6px 10px', display: 'flex', gap: 6, alignItems: 'center' }}>
        <span style={{ fontSize: 10, color: T.textFaint }}>quality</span>
        {(['draft', 'full'] as const).map(q => (
          <button
            key={q}
            onClick={() => setPrefs({ renderQuality: q })}
            title={q === 'draft' ? '1280×720 — the working tier' : '1920×1080 — delivery'}
            style={{
              ...btnStyle, padding: '2px 8px', fontSize: 10,
              border: `1px solid ${prefs.renderQuality === q ? T.accent : T.borderSoft}`,
              color: prefs.renderQuality === q ? T.select : T.textDim,
            }}
          >{q === 'draft' ? '720p' : '1080p'}</button>
        ))}
        <span style={{ flex: 1 }} />
        <button
          onClick={() => setAdvanced(a => !a)}
          style={{ ...chipStyle, cursor: 'pointer' }}
        >{advanced ? 'advanced ▴' : 'advanced ▾'}</button>
      </div>

      {advanced && <Advanced />}

      {latest && <Result job={latest} />}

      {!devApiAvailable() && (
        <div style={{ padding: '8px 10px', fontSize: 11, color: T.danger }}>
          No dev server. Renders need <code>npm run dev</code> — this page was
          served from a static build.
        </div>
      )}
    </div>
  )
}

function Item({ label, note, onClick, disabled }: {
  label: string
  note: string
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'block', width: '100%', textAlign: 'left', background: 'transparent',
        border: 'none', borderBottom: `1px solid ${T.border}`, cursor: disabled ? 'default' : 'pointer',
        padding: '8px 10px', fontFamily: T.font, opacity: disabled ? 0.45 : 1,
      }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = T.panelAlt }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
    >
      <div style={{ fontSize: 12, color: T.text }}>{label}</div>
      <div style={{ fontSize: 10, color: T.textFaint, fontFamily: T.mono, marginTop: 2 }}>{note}</div>
    </button>
  )
}

/**
 * The knobs that can cost you two hours. Every warning here is CLAUDE.md's,
 * kept verbatim rather than summarised, because the summary is what makes
 * someone turn shards up to 8 "to go faster".
 */
function Advanced() {
  const prefs = useStudioPrefs()
  return (
    <div style={{ padding: '8px 10px', borderTop: `1px solid ${T.border}`, background: T.inset }}>
      <Knob
        label="GL backend"
        note="vulkan is the only backend that gets a HARDWARE context here — measured on 30 frames of 3.2: 7s vulkan / 37s angle-egl / 196s swangle."
      >
        <select
          value={prefs.renderGl}
          onChange={e => setPrefs({ renderGl: e.target.value })}
          style={{ ...btnStyle, padding: '2px 6px', fontSize: 11, fontFamily: T.mono }}
        >
          {['vulkan', 'angle-egl', 'swangle'].map(g => <option key={g} value={g}>{g}</option>)}
        </select>
      </Knob>
      <Knob
        label="shards × concurrency"
        note="the real worker count; keep it near the core count. Concurrency is PER TAB and each tab pays for every canvas the scene mounts — a two-canvas scene at concurrency 4 measured 263s on a good run and over two hours on a bad one, for the same 14s."
      >
        <Num value={prefs.renderShards} min={1} max={8} onChange={v => setPrefs({ renderShards: v })} />
        <span style={{ color: T.textFaint }}>×</span>
        <Num value={prefs.renderConcurrency} min={1} max={8} onChange={v => setPrefs({ renderConcurrency: v })} />
      </Knob>
      <div style={{ fontSize: 10, color: T.textFaint, lineHeight: 1.5, marginTop: 6 }}>
        Under GPU pressure a segment can come back <i>rendering</i> — right camera,
        right geometry, right grade — with every additively-blended point cloud
        simply missing, and cache clean. Act 3 lost its whole sky for four
        seconds that way. If a stretch looks dark and <i>empty</i> rather than dark
        and detailed, re-render it at 1 × 1.
      </div>
    </div>
  )
}

function Knob({ label, note, children }: { label: string; note: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 11, color: T.textDim, flex: 1 }}>{label}</span>
        {children}
      </div>
      <div style={{ fontSize: 10, color: T.textFaint, lineHeight: 1.45, marginTop: 2 }}>{note}</div>
    </div>
  )
}

function Num({ value, min, max, onChange }: {
  value: number; min: number; max: number; onChange: (v: number) => void
}) {
  return (
    <input
      type="number"
      value={value}
      min={min}
      max={max}
      onChange={e => onChange(Math.max(min, Math.min(max, parseInt(e.target.value, 10) || min)))}
      style={{
        width: 44, background: T.inset, border: `1px solid ${T.borderSoft}`, borderRadius: 3,
        color: T.text, fontSize: 11, fontFamily: T.mono, padding: '2px 4px', outline: 'none',
      }}
    />
  )
}

/**
 * The result, playable. No new endpoint: vite already serves `out/` with
 * byte ranges (verified — 200 on a plain GET, 206 on a Range request), so a
 * <video src="/out/renders/…"> is a scrubbable player for free.
 */
function Result({ job }: { job: Job }) {
  const { log, logFor } = useJobs()
  useEffect(() => { if (logFor !== job.id) watchJob(job.id) }, [job.id, logFor])
  const { pct, note } = progressOf(log)
  const running = isActive(job)

  return (
    <div style={{ borderTop: `1px solid ${T.borderSoft}`, padding: '8px 10px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{
          fontSize: 11,
          color: job.status === 'failed' ? T.danger : job.status === 'done' ? T.play : T.textDim,
        }}>{job.status}</span>
        <span style={{ fontSize: 10, color: T.textFaint, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {job.label}
        </span>
        {running && (
          <button
            onClick={() => void killJob(job.id)}
            style={{ ...chipStyle, cursor: 'pointer', color: T.danger }}
          >kill</button>
        )}
      </div>

      {running && (
        <div style={{ height: 3, background: T.inset, borderRadius: 2, margin: '6px 0', overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: pct == null ? '30%' : `${pct}%`,
            background: pct == null ? T.borderSoft : T.play,
          }} />
        </div>
      )}

      <div style={{
        fontSize: 10, fontFamily: T.mono, color: T.textFaint, marginTop: 4,
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      }}>{note || '…'}</div>

      {job.status === 'done' && job.out && (
        <video
          src={`/${job.out}`}
          controls
          style={{ width: '100%', marginTop: 8, borderRadius: 4, background: '#000' }}
        />
      )}
    </div>
  )
}
