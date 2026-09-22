/**
 * useSoundtrack — the score and the lyric sheet, following the active film.
 *
 * Both default to whatever the film declares (films.ts) and both follow a
 * film switch. The <audio> element itself stays mounted in the shell rather
 * than in the Scenebuilder, so it survives panel re-renders and keeps playing
 * while you are over on the storyboard.
 *
 * DERIVED, not synchronised. "The film's score" is a function of the film, so
 * it is computed during render and the user's own choice is an override
 * stamped with the film it was made for. The obvious shape — effects that
 * setState when `film.audio` changes — is a cascading render, and worse, it
 * leaves a frame in which the new film is on screen with the old film's song
 * still declared. There is no effect here that fires on a film switch at all.
 *
 * `songTime()` is the other interesting part: the studio's anim clock is
 * scene LOCAL, and the active clip's `masterFrom` is what converts it to song
 * position. A shot opened off the timeline has no song position at all —
 * null tells SongTrack to pause rather than play from some arbitrary point.
 */
import { useCallback, useEffect, useState } from 'react'
import { getAnimTime } from '../../hooks/useAnimTime'
import { parseLrc, type LyricLine } from '../lyrics'
import { setPrefs, useStudioPrefs } from './prefs'
import type { Film } from '../films'
import type { SoundtrackState, ViewTarget } from '../types'

/** Stable empty array so toggling lyrics off doesn't remount the viewport. */
export const EMPTY_LYRICS: LyricLine[] = []

export type Soundtrack = {
  soundtrack: SoundtrackState
  changeSoundtrack: (next: Partial<SoundtrackState>) => void
  lyrics: LyricLine[]
  lyricName: string
  loadLyrics: (name: string, text: string) => void
  showLyrics: boolean
  setShowLyrics: (show: boolean) => void
  /** Song position in seconds, or null when the shot is detached. */
  songTime: () => number | null
}

/** A user-supplied file, and which film they supplied it for. Dropping a
 *  reference track on the master film should not follow you to the story
 *  film — that is a different score. */
type Override<T> = { filmId: string; value: T } | null

export function useSoundtrack(film: Film, getView: () => ViewTarget): Soundtrack {
  const prefs = useStudioPrefs()

  const [audioOverride, setAudioOverride] = useState<Override<{ src: string; name: string }>>(null)
  const [lyricOverride, setLyricOverride] = useState<Override<{ name: string; lines: LyricLine[] }>>(null)
  /** The parsed contents of whichever sheet path we last fetched. Written
   *  only from the fetch callback, which is a genuine external system. */
  const [sheet, setSheet] = useState<{ path: string; name: string; lines: LyricLine[] }>(
    { path: '', name: '', lines: EMPTY_LYRICS })

  const declared = film.audio
    ? { src: `/${film.audio}`, name: film.audio.split('/').pop() ?? film.audio }
    : { src: '', name: 'none' }
  const source = audioOverride?.filmId === film.id ? audioOverride.value : declared

  // Level and mute are PREFERENCES (they survive a reload and a film switch);
  // source and name are film state. Keeping them in different places is what
  // stops "I muted it once" becoming "the film has no audio".
  const soundtrack: SoundtrackState = {
    ...source,
    volume: prefs.volume,
    muted: prefs.muted,
  }

  const changeSoundtrack = useCallback((next: Partial<SoundtrackState>) => {
    if (next.volume !== undefined || next.muted !== undefined) {
      setPrefs({
        ...(next.volume !== undefined ? { volume: next.volume } : {}),
        ...(next.muted !== undefined ? { muted: next.muted } : {}),
      })
    }
    if (next.src !== undefined || next.name !== undefined) {
      setAudioOverride(o => ({
        filmId: film.id,
        value: {
          src: next.src ?? o?.value.src ?? '',
          name: next.name ?? o?.value.name ?? '',
        },
      }))
    }
  }, [film.id])

  const loadLyrics = useCallback((name: string, text: string) => {
    setLyricOverride({ filmId: film.id, value: { name, lines: parseLrc(text) } })
  }, [film.id])

  // The film's declared sheet. The only effect in here, and it is the right
  // kind: a fetch against an external resource, with setState in the
  // callback rather than in the effect body.
  useEffect(() => {
    const path = film.lyrics
    if (!path) return
    let live = true
    fetch(`/${path}`)
      .then(r => (r.ok ? r.text() : ''))
      .then(text => {
        if (!live || !text) return
        setSheet({ path, name: path.split('/').pop() ?? path, lines: parseLrc(text) })
      })
      .catch(() => { /* no sheet — the lane and overlay just stay empty */ })
    return () => { live = false }
  }, [film.lyrics])

  // Precedence: what you loaded for THIS film, else this film's own sheet,
  // else nothing. The `sheet.path === film.lyrics` guard is what stops the
  // previous film's lyrics showing for the one frame before the fetch lands.
  const lyricSource = lyricOverride?.filmId === film.id
    ? lyricOverride.value
    : sheet.path && sheet.path === film.lyrics
      ? { name: sheet.name, lines: sheet.lines }
      : { name: '', lines: EMPTY_LYRICS }

  const songTime = useCallback((): number | null => {
    const v = getView()
    return v.masterFrom == null ? null : v.masterFrom + getAnimTime()
  }, [getView])

  const setShowLyrics = useCallback((show: boolean) => setPrefs({ showLyrics: show }), [])

  return {
    soundtrack,
    changeSoundtrack,
    lyrics: lyricSource.lines,
    lyricName: lyricSource.name,
    loadLyrics,
    // On screen by default — the usual question is whether a cut lands on a
    // line, and you cannot answer that with the lyrics turned off.
    showLyrics: prefs.showLyrics,
    setShowLyrics,
    songTime,
  }
}
