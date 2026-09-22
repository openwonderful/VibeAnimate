/**
 * Cheap page-context flag: true when running inside the Flow Studio app
 * (`?app=studio`). Kept dependency-free so SceneCanvas can import it
 * without pulling studio modules into plain viewer/render bundles.
 */
export const IS_STUDIO_APP = typeof window !== 'undefined' &&
  new URLSearchParams(window.location.search).get('app') === 'studio'
