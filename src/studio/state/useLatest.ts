/**
 * useLatest — "read the current value from inside a callback that was
 * registered once".
 *
 * The studio has three consumers that need this: the keymap (one listener
 * for the life of the page), the playback cursor (a rAF loop), and the song
 * clock (an accessor handed to SongTrack). All three would otherwise capture
 * whatever `view`/`items`/`selection` was at registration time.
 *
 * A GETTER rather than the ref itself, deliberately. Passing a ref object
 * around as a prop or a hook argument is reading a ref during render as far
 * as the React compiler is concerned — and it is right to say so, because a
 * ref's whole contract is that its contents are not render-safe. Handing out
 * `() => ref.current` keeps the ref private to the hook that owns it and
 * makes the read happen where it is legal: inside the callback.
 */
import { useCallback, useEffect, useRef } from 'react'

export function useLatest<T>(value: T): () => T {
  const ref = useRef(value)
  // After commit, matching the timing the shell has always had: the rAF loop
  // and the keymap both run after paint, so there is nothing to gain from a
  // layout effect and one more synchronous pass to pay for it.
  useEffect(() => { ref.current = value })
  return useCallback(() => ref.current, [])
}
