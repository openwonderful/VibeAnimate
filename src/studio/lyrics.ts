/**
 * LRC parsing — the lyric track's source format.
 *
 * LRC is one line per cue, `[mm:ss.xx] text`, and a cue may carry SEVERAL
 * timestamps when the same line recurs (`[00:44.99][01:20.11] I need some
 * body to body`) — those expand to one entry each, which is why the parser
 * returns more lines than the file has. Bracketed metadata (`[ar:]`, `[ti:]`,
 * `[offset:]`) is not a cue; `offset` is honoured because it is the one tag
 * that changes timing (positive = the file runs ahead of the audio).
 *
 * The project's own lyric anchors live in flight.ts and are ~0.4s later than
 * the LRC's marks (see the note there on vocal onset vs. written cue) — this
 * parser does NOT apply that correction. It reports what the file says.
 *
 * Cue time IS film time for the master film: the song is the untouched
 * recording and the timeline is 1:1 with it, so nothing between this parser
 * and the ruler has to shift anything. (There was a spliced-song period when
 * that was false and the sheet was generated; FILM.md keeps the history.)
 */

export type LyricLine = {
  /** Seconds from the start of the song. */
  t: number
  text: string
}

/** A timestamp anchored at the start of what is left of the line — cues
 *  only ever lead, so a `[` inside the lyric text stays text. */
const CUE = /^\[(\d{1,3}):(\d{1,2}(?:[.:]\d{1,3})?)\]/
const META = /^\[([a-z]+):(.*)\]$/i

/**
 * Parse an .lrc file into time-sorted cues. Blank lines and unparseable
 * lines are dropped; a cue with empty text is kept, because in LRC that is
 * how an instrumental gap or a line's end is marked.
 */
export function parseLrc(src: string): LyricLine[] {
  const out: LyricLine[] = []
  let offset = 0

  for (const raw of src.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line) continue

    const meta = line.match(META)
    if (meta && !/^\d/.test(meta[1])) {
      if (meta[1].toLowerCase() === 'offset') {
        const ms = parseFloat(meta[2])
        if (Number.isFinite(ms)) offset = ms / 1000
      }
      continue
    }

    // Peel leading `[mm:ss.xx]` stamps off; whatever remains is the lyric.
    const stamps: number[] = []
    let rest = line
    for (let m = rest.match(CUE); m; m = rest.match(CUE)) {
      stamps.push(parseInt(m[1], 10) * 60 + parseFloat(m[2].replace(':', '.')))
      rest = rest.slice(m[0].length)
    }
    if (stamps.length === 0) continue

    const text = rest.trim()
    for (const t of stamps) out.push({ t: Math.max(0, t - offset), text })
  }

  return out.sort((a, b) => a.t - b.t)
}

/**
 * Index of the cue playing at time `t`, or -1 before the first one.
 * Binary search: the overlay calls this every frame.
 */
export function lyricIndexAt(lines: LyricLine[], t: number): number {
  let lo = 0
  let hi = lines.length - 1
  let found = -1
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    if (lines[mid].t <= t) { found = mid; lo = mid + 1 }
    else hi = mid - 1
  }
  return found
}

/** The cue playing at `t`, or null before the first one. */
export function lyricAt(lines: LyricLine[], t: number): LyricLine | null {
  const i = lyricIndexAt(lines, t)
  return i < 0 ? null : lines[i]
}

/**
 * When a cue ends: the next cue's start, or `fallback` seconds later for the
 * last one. Used to size the blocks on the lyric lane and to blank the
 * on-screen overlay after a trailing line.
 */
export function lyricEnd(lines: LyricLine[], index: number, fallback = 4): number {
  const next = lines[index + 1]
  return next ? next.t : lines[index].t + fallback
}
