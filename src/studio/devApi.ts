/**
 * Client half of the studio's dev-server endpoints.
 *
 * The two write-capable ones (`/__studio/exec`, `/__studio/apply-timeline`)
 * are gated — see `guardStudioWrite` in vite.config.ts for why. Every caller
 * must go through here so the token and content-type stay in one place; a
 * hand-rolled `fetch` to those paths will 403.
 *
 * `/__studio/media` is GET and read-only, so it needs none of this.
 */

declare global {
  interface Window {
    /** Injected into the dev HTML by the `studio-auth` plugin. */
    __STUDIO_TOKEN?: string
  }
}

/** Is the dev server (and therefore the write path) available at all? */
export function devApiAvailable(): boolean {
  return typeof window.__STUDIO_TOKEN === 'string'
}

/**
 * POST JSON to a gated studio endpoint. Returns the raw Response so callers
 * can stream the body (`exec`) or read it as JSON (`apply-timeline`).
 *
 * The token is read at call time, not module load: a dev-server restart mints
 * a new one, and the reload that follows re-injects it.
 */
export function studioPost(
  path: string,
  body: unknown,
  init: { signal?: AbortSignal } = {},
): Promise<Response> {
  return fetch(path, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-studio-token': window.__STUDIO_TOKEN ?? '',
    },
    body: JSON.stringify(body),
    signal: init.signal,
  })
}

/**
 * GET a gated studio endpoint (the job registry). Carries the token but no
 * content-type — a GET has no body. The token header is what keeps this from
 * being a CORS-simple request, so a foreign page still cannot read it.
 */
export function studioGet(path: string, init: { signal?: AbortSignal } = {}): Promise<Response> {
  return fetch(path, {
    headers: { 'x-studio-token': window.__STUDIO_TOKEN ?? '' },
    signal: init.signal,
  })
}
