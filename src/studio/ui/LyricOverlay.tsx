/**
 * On-screen lyrics over the viewport stage — a leaf clock consumer (SPEC
 * §12.1), so the line changing 60×/s costs one small re-render and never
 * touches the panel tree above it.
 *
 * This is an EDITING aid, not part of the film: it draws over the studio's
 * stage and is absent from every Remotion composition. Burning lyrics into
 * the render would be a change to the cut, not to the editor.
 *
 * Positioned in the lower third and letterbox-safe, because the thing you
 * are usually checking is whether a cut lands on the line — so the line has
 * to sit where it does not cover the subject.
 */
import { useAnimTime } from '../../hooks/useAnimTime'
import { lyricIndexAt, lyricEnd, type LyricLine } from '../lyrics'
import { T } from './theme'

/** How long a trailing cue stays up before the overlay blanks. */
const TAIL_HOLD_SEC = 6

export function LyricOverlay({ lines, masterFrom }: {
  lines: LyricLine[]
  /** Master time at scene-local 0; null when the clip is detached from the
   *  timeline, in which case there is no song time to look a lyric up by. */
  masterFrom: number | null
}) {
  const time = useAnimTime()
  if (!lines.length || masterFrom == null) return null

  const master = masterFrom + time
  const i = lyricIndexAt(lines, master)
  if (i < 0) return null
  // Blank after the last cue instead of leaving it frozen on screen forever.
  if (master > lyricEnd(lines, i, TAIL_HOLD_SEC)) return null
  const text = lines[i].text
  if (!text) return null

  return (
    <div style={{
      position: 'absolute', left: 0, right: 0, bottom: '8%',
      display: 'flex', justifyContent: 'center',
      pointerEvents: 'none', zIndex: 40, padding: '0 6%',
    }}>
      <span style={{
        fontFamily: T.font, fontSize: 'clamp(13px, 1.5vw, 28px)',
        fontWeight: 600, letterSpacing: '0.01em', textAlign: 'center',
        color: '#f4f2ee',
        // A shadow rather than a plate: the lyric has to sit over whatever
        // the shot is without boxing off part of the frame you're judging.
        textShadow: '0 2px 10px #000000cc, 0 0 3px #000000e6',
        lineHeight: 1.25,
      }}>{text}</span>
    </div>
  )
}
