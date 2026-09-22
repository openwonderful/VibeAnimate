/**
 * CameraLane — the camera keyframes, as diamonds on the master ruler (S4).
 *
 * Until now the only way to know where a camera key sat was to read
 * `flight.ts` and do the story→film conversion in your head. The keys are
 * anchored to the vocals — the punch through the stars at 0:07.24, the
 * wordmark at 0:13.05, the facade filling frame on 0:18.65 — so "does this
 * key still land on that word" is a question about the lyric lane two rows
 * up, and it was unanswerable without arithmetic.
 *
 * Click a diamond to put the playhead on it. Drag to retime; the panel
 * collects the result as paste-ready `flight.ts` lines.
 *
 * ── Why paste and not write-back ───────────────────────────────────────
 * The same reason the master timeline is paste-only: `KEYS` is hand-written
 * and its comments ARE the documentation — each one names the vocal the key
 * is anchored to. A rewriting endpoint would regenerate the array and throw
 * them away, and they are the reason anyone can retime this act at all.
 *
 * ── Why a cut key is drawn differently ─────────────────────────────────
 * `cut: true` starts a new segment and NOTHING interpolates across it. A cut
 * that has been dragged past its neighbour is not a slightly-wrong camera
 * move, it is a different edit — so cuts are drawn as bars rather than
 * diamonds, and they read as boundaries at a glance.
 */
import { useState } from 'react'
import { WARP_LAG } from '../../scenes/actB/flight'
import { fmtTime } from '../frames'
import { keyToSource, masterTimeToKey, placeCameraKeys, cameraTrackFor, type PlacedKey } from '../cameraTrack'
import { T, chipStyle } from '../ui/theme'
import type { TimelineItem } from '../../remotion/timeline'

export const CAMERA_LANE_H = 20

const KEY_COLOR = '#c9a227'

export function CameraLane({ items, pps, onSeek }: {
  items: TimelineItem[]
  pps: number
  onSeek: (masterTime: number) => void
}) {
  const placed = placeCameraKeys(items)
  const [drag, setDrag] = useState<{ id: string; at: number } | null>(null)
  const [edits, setEdits] = useState<Record<string, { placed: PlacedKey; t: number }>>({})

  if (!placed.length) return null

  const idOf = (p: PlacedKey) => `${p.clip.key}@${p.clip.from}#${p.index}`
  const editList = Object.values(edits)

  return (
    <div style={{ position: 'relative', height: CAMERA_LANE_H, marginTop: 4 }}>
      {placed.map(p => {
        const id = idOf(p)
        const at = drag?.id === id ? drag.at : (edits[id]?.placed === p ? p.at : p.at)
        const moved = edits[id] != null
        const x = (drag?.id === id ? drag.at : at) * pps
        const isCut = p.key.cut === true
        return (
          <div
            key={id}
            onPointerDown={e => {
              e.stopPropagation()
              ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
              setDrag({ id, at: p.at })
              onSeek(p.at)
            }}
            onPointerMove={e => {
              if (drag?.id !== id) return
              e.stopPropagation()
              const rect = (e.currentTarget as HTMLElement).parentElement!.getBoundingClientRect()
              const next = Math.max(p.clip.from, Math.min(
                p.clip.from + p.clip.duration,
                (e.clientX - rect.left) / pps,
              ))
              setDrag({ id, at: next })
            }}
            onPointerUp={e => {
              if (drag?.id !== id) return
              e.stopPropagation()
              const track = cameraTrackFor(p.clip.key)
              if (track && Math.abs(drag.at - p.at) > 1e-3) {
                setEdits(prev => ({
                  ...prev,
                  [id]: { placed: p, t: masterTimeToKey(drag.at, p.clip, track) },
                }))
              }
              setDrag(null)
            }}
            title={[
              `camera key ${p.index} — ${p.clip.key}`,
              `film ${fmtTime(p.at)}`,
              // The lag is READ, not quoted: it was 21.5 when this tooltip was
              // written and became 23.5 one merge later, and a tooltip that
              // states a wrong constant next to a correct number is worse than
              // one that states nothing.
              `source t: ${p.key.t}${cameraTrackFor(p.clip.key)?.timebase.kind === 'story'
                ? ` (STORY time — the flight is authored up to ${WARP_LAG}s ahead of the film here)` : ''}`,
              `fov ${p.key.fov}`,
              isCut ? 'CUT — nothing interpolates across this key' : '',
              'drag to retime · click to jump the playhead here',
            ].filter(Boolean).join('\n')}
            style={{
              position: 'absolute', left: x - 5, top: 2,
              width: 10, height: CAMERA_LANE_H - 6,
              cursor: 'ew-resize', zIndex: drag?.id === id ? 6 : 3,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <span style={isCut ? {
              width: 3, height: CAMERA_LANE_H - 8,
              background: moved ? T.select : KEY_COLOR,
            } : {
              width: 7, height: 7,
              transform: 'rotate(45deg)',
              background: moved ? T.select : KEY_COLOR,
              boxShadow: drag?.id === id ? `0 0 0 2px ${T.select}` : undefined,
            }} />
          </div>
        )
      })}

      {/* The export. It appears only once something has moved — a chip that
          is always there is a chip nobody reads. */}
      {editList.length > 0 && (
        <div style={{
          position: 'absolute', right: 4, top: -1, zIndex: 7,
          display: 'flex', gap: 4, alignItems: 'center',
        }}>
          <span style={{ ...chipStyle, color: T.select, borderColor: T.accent }}>
            {editList.length} key{editList.length > 1 ? 's' : ''} retimed
          </span>
          <button
            onClick={() => {
              void navigator.clipboard.writeText(
                editList
                  .sort((a, b) => a.t - b.t)
                  .map(e => keyToSource(e.placed.key, e.t))
                  .join('\n'),
              )
            }}
            title="Copy the retimed keys as flight.ts lines. Paste them over the matching entries in KEYS — the comments there name the vocal each key is anchored to, which is why this is paste and not write-back."
            style={{ ...chipStyle, cursor: 'pointer' }}
          >copy lines</button>
          <button
            onClick={() => setEdits({})}
            title="Discard the retiming"
            style={{ ...chipStyle, cursor: 'pointer', color: T.danger }}
          >reset</button>
        </div>
      )}
    </div>
  )
}
