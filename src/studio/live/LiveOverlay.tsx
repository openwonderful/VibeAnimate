/**
 * LiveOverlay — the stylised frame on top of the stage, with an A/B wipe,
 * the status chip (model · fps · ms) and the prompt box (features_1.md §7b).
 *
 * The overlay is an <img> of the latest reply, stretched to the stage box
 * (it is the same 16:9 the capture took). `liveWipe` clips it from the
 * left: 1 = all AI, 0 = all raw, drag the handle to compare. Mounted only
 * while the pref is on; the chip is what tells you the server is still
 * loading its model, which takes a minute the first time.
 */
import { setPrefs, useStudioPrefs } from '../state/prefs'
import { T, chipStyle } from '../ui/theme'
import { toggleLive, useLive } from './store'

/** Header chip: the on/off switch. */
export function LiveToggle() {
  const on = useStudioPrefs().liveRender
  const live = useLive()
  const color = !on ? T.textDim : live.status === 'open' ? T.play : live.status === 'error' ? T.danger : '#d0a24c'
  return (
    <button
      onClick={toggleLive}
      title={on
        ? 'Live AI render is ON — the stage is pushed through a turbo diffusion model on the local GPU (depth-guided img2img). Click to stop.'
        : 'Live AI render — see the frame through a turbo diffusion model, live, with a prompt. Starts scripts/live-render/server.py on the dev box if it is not up.'}
      style={{ ...chipStyle, cursor: 'pointer', color, borderColor: on ? T.accent : undefined }}
    >✦ {on ? (live.status === 'open' ? 'live' : live.status) : 'live'}</button>
  )
}

export function LiveOverlay() {
  const prefs = useStudioPrefs()
  const live = useLive()
  if (!prefs.liveRender) return null

  const wipe = prefs.liveWipe
  const ready = live.status === 'open'
  const statusText = live.status === 'open'
    ? `${live.model || 'model'}${live.controlnet ? '+depth' : ''} · ${live.fps ? live.fps.toFixed(1) : '–'} fps · ${live.ms ? Math.round(live.ms) : '–'} ms`
    : live.status === 'starting' ? 'starting server — loading model…'
      : live.status === 'connecting' ? 'connecting…'
        : live.status

  return (
    <>
      {live.url && (
        <img
          src={live.url}
          alt=""
          draggable={false}
          data-live-frame=""
          style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 3,
            pointerEvents: 'none', objectFit: 'fill',
            clipPath: `inset(0 ${(1 - wipe) * 100}% 0 0)`,
            imageRendering: 'auto',
          }}
        />
      )}
      {/* wipe handle */}
      {live.url && wipe > 0 && wipe < 1 && (
        <div style={{
          position: 'absolute', top: 0, bottom: 0, left: `${wipe * 100}%`, width: 1,
          background: T.accent, zIndex: 4, pointerEvents: 'none',
        }} />
      )}

      {/* status + controls, bottom-right, above the picture */}
      <div
        data-live-chip=""
        style={{
          position: 'absolute', right: 10, bottom: 10, zIndex: 21,
          display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end',
          maxWidth: '60%',
        }}
      >
        <div style={{ ...chipStyle, background: '#000000b0', color: ready ? T.play : '#d0a24c', fontFamily: T.mono }}>
          ✦ {statusText}
        </div>
        {live.error && (
          <div style={{ ...chipStyle, background: '#000000b0', color: T.danger, whiteSpace: 'pre-wrap', textAlign: 'right' }}>
            {live.error}
          </div>
        )}
        {!ready && live.log && (
          <div style={{
            ...chipStyle, background: '#000000b0', color: T.textFaint, fontFamily: T.mono, fontSize: 10,
            whiteSpace: 'pre-wrap', textAlign: 'left', maxHeight: 90, overflow: 'hidden',
          }}>{live.log}</div>
        )}
        <div style={{
          display: 'flex', gap: 6, alignItems: 'center', background: '#000000b0',
          border: `1px solid ${T.border}`, borderRadius: 4, padding: '4px 6px',
        }}>
          <input
            value={prefs.livePrompt}
            onChange={e => setPrefs({ livePrompt: e.target.value })}
            placeholder="prompt"
            title="The look. Sent with every frame; edits apply on the next one."
            style={{
              width: 320, fontSize: 11, background: 'transparent', color: T.text,
              border: 'none', outline: 'none', fontFamily: 'system-ui, sans-serif',
            }}
          />
        </div>
        <div style={{
          display: 'flex', gap: 8, alignItems: 'center', background: '#000000b0',
          border: `1px solid ${T.border}`, borderRadius: 4, padding: '3px 6px', fontSize: 10,
          color: T.textDim, fontFamily: T.mono,
        }}>
          <Knob label="wipe" value={prefs.liveWipe} min={0} max={1} onChange={v => setPrefs({ liveWipe: v })} title="A/B: 0 = raw render, 1 = all AI" />
          <Knob label="str" value={prefs.liveStrength} min={0.2} max={0.95} onChange={v => setPrefs({ liveStrength: v })} title="img2img strength — how far the model may leave the render" />
          <Knob label="depth" value={prefs.liveControl} min={0} max={1.5} onChange={v => setPrefs({ liveControl: v })} title="depth ControlNet weight" />
          <Knob label="hold" value={prefs.liveBlend} min={0} max={0.8} onChange={v => setPrefs({ liveBlend: v })} title="blend of the previous AI frame into the next — less flicker, more smear" />
        </div>
      </div>
    </>
  )
}

function Knob({ label, value, min, max, onChange, title }: {
  label: string; value: number; min: number; max: number; onChange: (v: number) => void; title: string
}) {
  return (
    <label title={title} style={{ display: 'flex', alignItems: 'center', gap: 3, cursor: 'ew-resize' }}>
      <span>{label}</span>
      <input
        type="range" min={min} max={max} step={0.01} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        style={{ width: 56, accentColor: T.accent }}
      />
      <span style={{ minWidth: 26, textAlign: 'right' }}>{value.toFixed(2)}</span>
    </label>
  )
}
