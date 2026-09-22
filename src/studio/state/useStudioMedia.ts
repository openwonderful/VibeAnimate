/**
 * What media the dev server can see — `public/audio` and `public/lyrics`,
 * listed by `/__studio/media`.
 *
 * One fetch shared by both track headers rather than one each: it is the
 * same endpoint, and two components mounting side by side would otherwise
 * ask twice on every mount. In a built preview (no dev server) the lists are
 * simply empty and the file pickers still work — nothing here is required
 * for the studio to run, only for it to offer a menu.
 */
import { useEffect, useState } from 'react'

export type StudioMedia = { audio: string[]; lyrics: string[] }

const EMPTY: StudioMedia = { audio: [], lyrics: [] }

export function useStudioMedia(): StudioMedia {
  const [media, setMedia] = useState<StudioMedia>(EMPTY)
  useEffect(() => {
    let live = true
    fetch('/__studio/media')
      .then(r => (r.ok ? r.json() : EMPTY))
      .then((m: StudioMedia) => { if (live) setMedia({ audio: m.audio ?? [], lyrics: m.lyrics ?? [] }) })
      .catch(() => { /* not running under vite dev — pickers still work */ })
    return () => { live = false }
  }, [])
  return media
}
