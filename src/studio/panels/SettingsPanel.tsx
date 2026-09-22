/**
 * SettingsPanel — C4.
 *
 * Settings were spread across ~40 URL params, hardcoded constants per panel,
 * three sessionStorage keys and four env vars, and there was no way to see
 * any of them. This is one place, riding the one persisted store.
 *
 * It ABSORBS rather than duplicates: where a live control already exists in a
 * panel (the audio level, the timeline zoom presets), this holds the DEFAULT
 * and the explanation, not a second copy of the control. The one thing it
 * adds outright is the keymap — until now the only in-app documentation of
 * the keys was the Inspector's cheat-sheet, visible only when nothing was
 * selected.
 *
 * TWO HARD RULES, both from SPEC:
 *
 *  1. Nothing here writes `location.search`. The shot.mjs contract is
 *     `?act=KEY` + appended `ui=0` + `?t=` freezing; a settings panel that
 *     persisted through the URL would break every deterministic screenshot
 *     and every cached URL in the docs. Storage only — "copy link" is an
 *     explicit action, and `?prefs=0` is how tooling asks for a clean state.
 *  2. No toggle can enable master write-back. vite.config.ts refuses it by
 *     design: the master timeline's hand-written beat comments are
 *     source-of-truth documentation, so it stays copy/paste.
 */
import { useState } from 'react'
import { ASPECTS, STAGE_FIT } from '../aspect'
import { FPS } from '../frames'
import { T, btnStyle, chipStyle, panelHeaderStyle } from '../ui/theme'
import { DEFAULT_PREFS, getPrefs, resetPrefs, setPrefs, useStudioPrefs, type StudioPrefs } from '../state/prefs'
import { KEYMAP } from '../state/useStudioKeys'
import { clearAllObjectEdits, countObjectEdits } from '../editable/store'

type Section = 'playback' | 'viewport' | 'timeline' | 'render' | 'keyboard' | 'advanced'

const SECTIONS: { id: Section; label: string }[] = [
  { id: 'playback', label: 'playback' },
  { id: 'viewport', label: 'viewport' },
  { id: 'timeline', label: 'timeline' },
  { id: 'render', label: 'render' },
  { id: 'keyboard', label: 'keyboard' },
  { id: 'advanced', label: 'advanced' },
]

export function SettingsPanel({ onClose }: { onClose: () => void }) {
  const prefs = useStudioPrefs()
  const [section, setSection] = useState<Section>('playback')

  return (
    <div
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 200, background: '#000000a0',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: T.font,
      }}
    >
      <div style={{
        width: 720, maxWidth: '92vw', height: 520, maxHeight: '88vh',
        background: T.panel, border: `1px solid ${T.borderSoft}`, borderRadius: 8,
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        boxShadow: '0 20px 60px #000000b0',
      }}>
        <div style={panelHeaderStyle}>
          <span>settings</span>
          <span style={{ flex: 1 }} />
          <button style={{ ...chipStyle, cursor: 'pointer' }} onClick={() => resetPrefs()}>
            reset all
          </button>
          <button style={{ ...chipStyle, cursor: 'pointer' }} onClick={onClose}>close</button>
        </div>

        <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
          <div style={{
            width: 130, flexShrink: 0, borderRight: `1px solid ${T.border}`,
            display: 'flex', flexDirection: 'column', padding: 6, gap: 2,
          }}>
            {SECTIONS.map(s => (
              <button
                key={s.id}
                onClick={() => setSection(s.id)}
                style={{
                  ...btnStyle, textAlign: 'left', fontSize: 11, padding: '5px 8px',
                  background: section === s.id ? '#5b96e826' : 'transparent',
                  border: `1px solid ${section === s.id ? T.accent : 'transparent'}`,
                  color: section === s.id ? T.select : T.textDim,
                  textTransform: 'uppercase', letterSpacing: '0.06em',
                }}
              >{s.label}</button>
            ))}
          </div>

          <div style={{ flex: 1, minWidth: 0, overflowY: 'auto', padding: '10px 14px' }}>
            {section === 'playback' && <Playback prefs={prefs} />}
            {section === 'viewport' && <Viewport prefs={prefs} />}
            {section === 'timeline' && <Timeline prefs={prefs} />}
            {section === 'render' && <Render prefs={prefs} />}
            {section === 'keyboard' && <Keyboard />}
            {section === 'advanced' && <Advanced />}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── field primitives ──────────────────────────────────────────────────── */

function Field({ label, note, children }: {
  label: string; note?: string; children: React.ReactNode
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 12, color: T.text, flex: 1 }}>{label}</span>
        {children}
      </div>
      {note && (
        <div style={{ fontSize: 10.5, color: T.textFaint, lineHeight: 1.5, marginTop: 3, maxWidth: 520 }}>
          {note}
        </div>
      )}
    </div>
  )
}

function Toggle({ on, onChange, labels = ['off', 'on'] }: {
  on: boolean; onChange: (v: boolean) => void; labels?: [string, string] | string[]
}) {
  return (
    <button
      onClick={() => onChange(!on)}
      style={{
        ...btnStyle, padding: '3px 10px', fontSize: 11, minWidth: 54,
        border: `1px solid ${on ? T.accent : T.borderSoft}`,
        color: on ? T.select : T.textDim,
      }}
    >{on ? labels[1] : labels[0]}</button>
  )
}

function Choice<V extends string | number>({ value, options, onChange }: {
  value: V
  options: { v: V; label: string; title?: string }[]
  onChange: (v: V) => void
}) {
  return (
    <span style={{ display: 'flex', gap: 3 }}>
      {options.map(o => (
        <button
          key={String(o.v)}
          title={o.title}
          onClick={() => onChange(o.v)}
          style={{
            ...btnStyle, padding: '3px 9px', fontSize: 11,
            border: `1px solid ${value === o.v ? T.accent : T.borderSoft}`,
            color: value === o.v ? T.select : T.textDim,
          }}
        >{o.label}</button>
      ))}
    </span>
  )
}

function Slider({ value, min, max, step, onChange, format }: {
  value: number; min: number; max: number; step: number
  onChange: (v: number) => void
  format: (v: number) => string
}) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <input
        type="range"
        min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        style={{ width: 130, accentColor: T.accent }}
      />
      <span style={{ ...chipStyle, minWidth: 46, textAlign: 'center' }}>{format(value)}</span>
    </span>
  )
}

/* ── sections ──────────────────────────────────────────────────────────── */

function Playback({ prefs }: { prefs: StudioPrefs }) {
  return (
    <>
      <Field
        label="Default soundtrack level"
        note="The level the studio starts at. The live control is on the audio track header — this is what it resets to."
      >
        <Slider
          value={prefs.volume} min={0} max={1} step={0.05}
          onChange={v => setPrefs({ volume: v })}
          format={v => `${Math.round(v * 100)}%`}
        />
      </Field>
      <Field label="Start muted" note="Useful when the same machine is rendering — the render has its own audio and the two fight.">
        <Toggle on={prefs.muted} onChange={v => setPrefs({ muted: v })} />
      </Field>
      <Field
        label="Lyrics on the picture"
        note="On by default: the usual question is whether a cut lands ON a line, and you cannot answer that with the lyrics off. `?lyrics=0` turns them off for a clean screenshot without changing this."
      >
        <Toggle on={prefs.showLyrics} onChange={v => setPrefs({ showLyrics: v })} />
      </Field>
      <Field
        label="Frame rate"
        note={`Declared once, in src/scenes/manifest.ts, and uniform by construction — every Remotion composition is registered with it and the render clock derives t = frame / fps from the same value. Not editable here because changing it is a change to the film, not to the editor.`}
      >
        <span style={chipStyle}>{FPS} fps</span>
      </Field>
    </>
  )
}

function Viewport({ prefs }: { prefs: StudioPrefs }) {
  return (
    <>
      <Field
        label="Stage shape"
        note="What the stage is for THIS session. The film's own aspect is declared in films.ts and is what renders; a shape here only changes what you are looking at, so use it to check a reframe before committing to one. `fit` is the odd one out — it fills the panel, so the frame you see is NOT the frame that renders."
      >
        <Choice
          value={prefs.aspectOverride ?? 'film'}
          options={[
            { v: 'film', label: 'film', title: 'whatever the film declares, letterboxed exactly' },
            ...ASPECTS.map(a => ({ v: a.id, label: a.label, title: `${a.width}×${a.height} — ${a.note}` })),
            { v: STAGE_FIT, label: 'fit', title: 'fill the panel — not the delivered shape' },
          ]}
          onChange={v => setPrefs({ aspectOverride: v === 'film' ? null : v as StudioPrefs['aspectOverride'] })}
        />
      </Field>
      <Field
        label="Prefetch the next clip"
        note="Mounts the next clip early so a cut is instant instead of flashing black. It is also the only place two scenes are mounted at once, and some scenes keep their world clock in a module global that assumes exactly one is — 6.85's valley jumps twenty seconds while 7.4 is warming behind it. Turn this off when you are judging the seconds before a cut; leave it on to watch."
      >
        <Toggle on={prefs.prefetch} onChange={v => setPrefs({ prefetch: v })} labels={['off — exact', 'on — smooth']} />
      </Field>
      <Field label="Frame guides" note="Drawn over the picture, never in a render.">
        <Choice
          value={prefs.guides}
          options={[
            { v: 'off', label: 'off' },
            { v: 'thirds', label: 'thirds' },
            { v: 'safe', label: 'safe' },
            { v: 'both', label: 'both' },
          ]}
          onChange={v => setPrefs({ guides: v })}
        />
      </Field>
      <Field
        label="Stage zoom"
        note="Above 1× the stage is scrolled inside its cage — for checking a 20-pixel figure on a dark road without opening a second tab."
      >
        <Slider
          value={prefs.stageZoom} min={1} max={6} step={0.25}
          onChange={v => setPrefs({ stageZoom: v })}
          format={v => `${v}×`}
        />
      </Field>
    </>
  )
}

function Timeline({ prefs }: { prefs: StudioPrefs }) {
  return (
    <>
      <Field
        label="Snapping"
        note="Clip edges, the playhead and lyric cues. S toggles it; holding Alt defeats it for one drag, Premiere-style."
      >
        <Toggle on={prefs.snap} onChange={v => setPrefs({ snap: v })} />
      </Field>
      <Field
        label="Ripple"
        note="Trimming a clip shifts every later clip so the timeline stays contiguous. Turning it OFF can leave a gap, and a gap makes the film unexportable — timeline.ts throws at module load on one."
      >
        <Toggle on={prefs.ripple} onChange={v => setPrefs({ ripple: v })} />
      </Field>
      <Field label="Thumbnails on clips" note="From public/thumbs/, generated by `npm run thumbs`. Off if the strip feels busy.">
        <Toggle on={prefs.clipThumbs} onChange={v => setPrefs({ clipThumbs: v })} />
      </Field>
      <Field label="Default zoom" note="Pixels per second the Scenebuilder opens at. Ctrl+wheel and +/− change it live.">
        <Slider
          value={prefs.pps} min={2} max={64} step={1}
          onChange={v => setPrefs({ pps: v })}
          format={v => `${v} px/s`}
        />
      </Field>
    </>
  )
}

function Render({ prefs }: { prefs: StudioPrefs }) {
  return (
    <>
      <Field label="Default quality" note="720p is the working tier and what the segment cache mostly holds; 1080p is delivery.">
        <Choice
          value={prefs.renderQuality}
          options={[{ v: 'draft', label: '720p' }, { v: 'full', label: '1080p' }]}
          onChange={v => setPrefs({ renderQuality: v })}
        />
      </Field>
      <Field
        label="GL backend"
        note="The single biggest speed lever. vulkan (ANGLE-over-Vulkan) is the only backend that gets a HARDWARE WebGL context in headless Chrome here — measured on 30 frames of scene 3.2: 7s vulkan, 37s angle-egl, 196s swangle. angle/egl silently fall back to software. Machines with no GPU get swangle whatever this says."
      >
        <Choice
          value={prefs.renderGl}
          options={[
            { v: 'vulkan', label: 'vulkan' },
            { v: 'angle-egl', label: 'angle-egl' },
            { v: 'swangle', label: 'swangle' },
          ]}
          onChange={v => setPrefs({ renderGl: v })}
        />
      </Field>
      <Field
        label="Shards"
        note="Parallel render processes. Above 4 they contend for the GPU."
      >
        <Slider value={prefs.renderShards} min={1} max={8} step={1}
          onChange={v => setPrefs({ renderShards: v })} format={v => String(v)} />
      </Field>
      <Field
        label="Concurrency"
        note="Tabs per render process. This is PER TAB and each tab pays for every WebGL canvas the scene mounts: a scene mounting two canvases at concurrency 4 is 6–8 live contexts plus the GPU process, and once the driver starts evicting them the page falls back to software — measured 263s on a good run and OVER TWO HOURS on a bad one, for the same 14 seconds of film. shards × concurrency is the real worker count; keep it near the core count."
      >
        <Slider value={prefs.renderConcurrency} min={1} max={8} step={1}
          onChange={v => setPrefs({ renderConcurrency: v })} format={v => String(v)} />
      </Field>
      <div style={{
        fontSize: 10.5, color: T.textFaint, lineHeight: 1.55, borderTop: `1px solid ${T.border}`,
        paddingTop: 10, maxWidth: 520,
      }}>
        <b style={{ color: T.textDim }}>The failure the blank check will not catch.</b>{' '}
        Under that pressure a segment can come back <i>rendering</i> — correct camera,
        correct geometry, correct grade — with every additively-blended point cloud
        simply missing, and cache clean, because the blank check only rejects SOLID
        WHITE. Act 3's whole sky was absent for four seconds and every check passed.
        The symptom is a stretch that is dark and <i>empty</i> rather than dark and
        detailed; check it with a per-frame luminance scan, not by eye on a
        thumbnail, and re-render at 1&nbsp;×&nbsp;1.
      </div>
    </>
  )
}

function Keyboard() {
  const groups = [...new Set(KEYMAP.map(k => k.group))]
  return (
    <>
      <div style={{ fontSize: 10.5, color: T.textFaint, marginBottom: 12, lineHeight: 1.5, maxWidth: 520 }}>
        Four consumers share this keyboard: the transport below, Blender mode's
        object keys (capture phase, so they win while an object is selected),
        the debug camera's WASD/QERF, and the time scrubber's <code>,</code>{' '}
        <code>.</code> <code>P</code>. That is why <code>F</code> is not free.
      </div>
      {groups.map(g => (
        <div key={g} style={{ marginBottom: 14 }}>
          <div style={{
            fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em',
            color: T.textDim, marginBottom: 5,
          }}>{g}</div>
          {KEYMAP.filter(k => k.group === g).map(k => (
            <div key={k.keys} style={{ display: 'flex', gap: 10, fontSize: 11.5, padding: '2px 0' }}>
              <span style={{ ...chipStyle, minWidth: 150, textAlign: 'center' }}>{k.keys}</span>
              <span style={{ color: T.textDim }}>{k.what}</span>
            </div>
          ))}
        </div>
      ))}
    </>
  )
}

function Advanced() {
  const edits = countObjectEdits()
  return (
    <>
      <Field
        label="Object edits, all scenes"
        note="Blender-mode poses are stored per scene and are non-destructive — plain ?act= pages and renders ignore them. The per-scene reset in the viewport toolbar cannot see the others; this can."
      >
        <button
          onClick={() => { clearAllObjectEdits() }}
          disabled={edits === 0}
          style={{
            ...btnStyle, padding: '3px 10px', fontSize: 11,
            color: edits ? T.danger : T.textFaint, opacity: edits ? 1 : 0.5,
          }}
        >clear {edits || 'none'}</button>
      </Field>

      <Field
        label="Copy a link with these settings"
        note="The explicit alternative to persisting through the URL. Paste it to hand someone the exact view; it carries only the params tooling already understands."
      >
        <button
          onClick={() => {
            const q = new URLSearchParams(window.location.search)
            const p = DEFAULT_PREFS
            const cur = getPrefs()
            q.set('view', cur.viewMode)
            q.set('tab', cur.leftTab)
            if (cur.showLyrics !== p.showLyrics) q.set('lyrics', cur.showLyrics ? '1' : '0')
            q.set('zoom', String(cur.pps))
            void navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}?${q}`)
          }}
          style={{ ...btnStyle, padding: '3px 10px', fontSize: 11 }}
        >copy link</button>
      </Field>

      <div style={{
        fontSize: 10.5, color: T.textFaint, lineHeight: 1.55, borderTop: `1px solid ${T.border}`,
        paddingTop: 10, maxWidth: 520,
      }}>
        <b style={{ color: T.textDim }}>Not offered, on purpose.</b> There is no toggle
        for master write-back: the dev server refuses to rewrite
        <code> src/remotion/timeline.ts</code> because its beat comments are
        source-of-truth documentation, so the master stays copy/paste. There is
        no toggle for the two-scene viewport ceiling either — a third live WebGL
        context makes the driver start evicting them, which blanks a scene
        outright. And nothing here writes the URL: that would break every
        deterministic screenshot. Pass <code>?prefs=0</code> to ignore everything
        stored here.
      </div>
    </>
  )
}
