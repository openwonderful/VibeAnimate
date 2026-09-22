/**
 * The films this project can build — each is a named timeline over
 * manifest scenes. The Scenebuilder edits whichever film is active.
 */
import { TIMELINE, TOTAL_DURATION_SEC, type TimelineItem } from '../remotion/timeline'
import { STORY_TIMELINE, STORY_ANIME_TIMELINE, STORY_OVERLAYS, STORY_DURATION_SEC } from './story/timeline'
import type { AspectId } from './aspect'

export type FilmId = 'master' | 'arirang' | 'arirang-bed' | 'story' | 'story-anime'

export type Film = {
  id: FilmId
  name: string
  items: TimelineItem[]
  durationSec: number
  /** Remotion composition id that renders this film. */
  composition: string
  /** Which timeline file the Inspector's exported lines belong in. */
  sourcePath: string
  /**
   * The Inspector may COPY edited lines for this film but never write
   * `sourcePath` itself. True for any film standing on
   * `src/remotion/timeline.ts`: that array's beat comments are hand-written
   * (and FILM.md is pinned to them), so a wholesale rewrite loses the
   * reasoning. It is also how the alt-audio cuts stay safe — they SHARE the
   * master's timeline, so an apply from one of them would silently retime
   * the master.
   */
  timelineReadOnly?: boolean
  /** Optional score, as a staticFile path under public/ (SPEC §12.5). */
  audio?: string
  /** Optional .lrc lyric sheet, as a path under public/. Drives the
   *  Scenebuilder's lyric lane and the viewport's on-screen lyrics. */
  lyrics?: string
  /**
   * The shape the film IS, not just the shape it is previewed in — the
   * decision on record is that a film can genuinely be 9:16 or 1:1, and the
   * render honours this (see `studio/aspect.ts`). Absent = 16:9. The stage
   * picker overrides it for a session without changing the film.
   */
  aspect?: AspectId
  /** Overlay track: stacked above the base track by the film factory. */
  overlays?: TimelineItem[]
}

export const FILMS: Film[] = [
  {
    id: 'master',
    name: 'Body to Body',
    items: TIMELINE,
    durationSec: TOTAL_DURATION_SEC,
    composition: 'FullVideo',
    sourcePath: 'src/remotion/timeline.ts',
    // The song FullVideo.tsx muxes at render time, so the studio plays the
    // same thing the render will. It is the untouched recording (189.768s
    // under a 190s film), so the ruler, the lyric lane and the waveform all
    // share ONE clock: film time == song time == cue time, no conversion
    // anywhere. That was not true while the mp3 was a spliced cut — the sheet
    // then had to be generated through the splice. See FILM.md.
    audio: 'audio/body-to-body.mp3',
    lyrics: 'lyrics/body-to-body.lrc',
    timelineReadOnly: true,
  },

  // ── Alt-audio cuts ────────────────────────────────────────────────────
  // Same picture as the master, frame for frame — they reuse TIMELINE and
  // TOTAL_DURATION_SEC rather than copying them, so a retime of the master
  // moves all three and they cannot drift apart. What differs is ONLY the
  // score: both drop the closing "I need the whole stadium to jump" verse
  // so the song ends on the Arirang.
  //
  // The cut point is 176.40s and it is a truncation, not a splice — the
  // Arirang's last hit lands at 176.00 and its reverb decays to near
  // silence by 176.46, with the outro starting after that, so there is a
  // real structural gap to cut in. Null-tested sample-aligned with the
  // master from t=0 (residual 27dB under program = transcode noise), which
  // is what keeps `film time == song time` true here too: every lyric cue,
  // every scene `from`, and FILM.md's beat numbers read the same on all
  // three films. Do not "fix" that by regenerating a shifted sheet.
  //
  // The open question these two exist to answer is what the picture does
  // over the last 13.6s — act 8.55's jump (T_DROP, film 176.26) and the
  // ascension into the constellations — now that the song has stopped
  // under it. Both keep the shot; they differ in what you hear over it.
  {
    id: 'arirang',
    name: 'Body to Body — Arirang (silent tail)',
    items: TIMELINE,
    durationSec: TOTAL_DURATION_SEC,
    composition: 'FullVideoArirang',
    sourcePath: 'src/remotion/timeline.ts',
    // 176.424s under a 190s film: the ascension plays in silence. Read as a
    // deliberate drop-out — the music lets go and you just watch them go.
    audio: 'audio/body-to-body-arirang.mp3',
    lyrics: 'lyrics/body-to-body-arirang.lrc',
    timelineReadOnly: true,
  },
  {
    id: 'arirang-bed',
    name: 'Body to Body — Arirang (bed)',
    items: TIMELINE,
    durationSec: TOTAL_DURATION_SEC,
    composition: 'FullVideoArirangBed',
    sourcePath: 'src/remotion/timeline.ts',
    // Same cut, then a wash under the ascension so it is not silent: the
    // Arirang's own last 16s, slowed to 0.85, low-passed at 750Hz and
    // smeared with echo until the vocal reads as texture rather than
    // words. Fades in at 175.0 UNDER the live Arirang tail (so there is no
    // seam at the cut), sits ~7dB below the program, gone by 189.8.
    // We have no stems, so this is a wash built from the mix, not a real
    // instrumental — that is the honest limit of it. This one IS a splice;
    // it is the only file here that is.
    audio: 'audio/body-to-body-arirang-bed.mp3',
    lyrics: 'lyrics/body-to-body-arirang.lrc',
    timelineReadOnly: true,
  },

  {
    id: 'story',
    name: 'The Lantern Keeper',
    items: STORY_TIMELINE,
    durationSec: STORY_DURATION_SEC,
    composition: 'StoryFilm',
    sourcePath: 'src/studio/story/timeline.ts',
    audio: 'audio/lantern-keeper-theme.mp3',
    overlays: STORY_OVERLAYS,
  },
  {
    id: 'story-anime',
    name: 'Lantern Keeper — Anime',
    items: STORY_ANIME_TIMELINE,
    durationSec: STORY_DURATION_SEC,
    composition: 'StoryFilmAnime',
    sourcePath: 'src/studio/story/timeline.ts',
    audio: 'audio/lantern-keeper-theme.mp3',
    overlays: STORY_OVERLAYS,
  },
]

export const filmById = (id: FilmId): Film => FILMS.find(f => f.id === id)!
