/**
 * Render jobs — the client half of `/__studio/jobs` (R1 / R3).
 *
 * A render is owned by the DEV SERVER, not by the tab that asked for it. That
 * is the whole point of the registry: a render that had been going for ten
 * minutes used to die the moment you reloaded the studio. So this store does
 * not hold the render — it holds a VIEW of the server's list, refreshed by a
 * poll, and everything about "is one running" is answered by the server.
 *
 * Which means reattaching is not a feature that needed building. Load the
 * page, poll once, and a job that was already running is simply there.
 *
 * Polling rather than streaming, deliberately: a stream has to be re-opened
 * on reload anyway, and a render emits a progress line every second or so —
 * there is nothing to be gained from pushing them. The log is fetched from a
 * byte offset, so a poll transfers only what is new.
 */
import { useEffect, useSyncExternalStore } from 'react'
import { devApiAvailable, studioGet, studioPost } from '../devApi'

export type JobStatus = 'queued' | 'running' | 'done' | 'failed' | 'killed'

export type Job = {
  id: string
  label: string
  argv: string[]
  out: string | null
  status: JobStatus
  createdAt: number
  startedAt: number | null
  endedAt: number | null
  exitCode: number | null
  logBytes: number
  pid: number | null
}

export type RenderRequest = {
  kind: 'film' | 'range' | 'clip'
  filmId: string
  key?: string
  from?: number
  to?: number
  quality?: 'draft' | 'full'
  force?: boolean
  gl?: string
  shards?: number
  concurrency?: number
  proxy?: boolean
}

export function isActive(j: Job): boolean {
  return j.status === 'queued' || j.status === 'running'
}

type State = {
  jobs: Job[]
  /** Last error from the server, shown instead of failing silently. */
  error: string | null
  /** Log of the job the render panel is looking at. */
  logFor: string | null
  log: string
  logFrom: number
}

let state: State = { jobs: [], error: null, logFor: null, log: '', logFrom: 0 }
const listeners = new Set<() => void>()

function emit(patch: Partial<State>) {
  state = { ...state, ...patch }
  for (const l of listeners) l()
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb)
  return () => { listeners.delete(cb) }
}

export function useJobs(): State {
  return useSyncExternalStore(subscribe, () => state, () => state)
}

export async function refreshJobs() {
  if (!devApiAvailable()) return
  try {
    const res = await studioGet('/__studio/jobs')
    if (!res.ok) { emit({ error: `jobs: ${res.status} ${await res.text()}` }); return }
    const body = await res.json() as { jobs: Job[] }
    emit({ jobs: body.jobs, error: null })
  } catch (e) {
    emit({ error: String(e) })
  }
}

/** Point the log view at a job. Resets the cursor so the whole tail arrives. */
export function watchJob(id: string | null) {
  emit({ logFor: id, log: '', logFrom: 0 })
  if (id) void pollLog()
}

async function pollLog() {
  const id = state.logFor
  if (!id || !devApiAvailable()) return
  try {
    const res = await studioGet(`/__studio/jobs/${encodeURIComponent(id)}?from=${state.logFrom}`)
    if (!res.ok) return
    const body = await res.json() as { job: Job; from: number; log: string }
    if (state.logFor !== id) return   // switched away mid-flight
    // The server echoes back the offset it ACTUALLY served, which is later
    // than the one we asked for once the capped tail has rolled past it.
    // Appending on that would splice the log at the wrong point and lose the
    // gap silently, so a mismatch means "start over from what you were sent".
    const contiguous = body.from === state.logFrom
    emit({
      log: contiguous ? state.log + body.log : body.log,
      logFrom: body.from + body.log.length,
    })
  } catch { /* the poll will come round again */ }
}

export async function startRender(req: RenderRequest): Promise<Job | null> {
  if (!devApiAvailable()) {
    emit({ error: 'no dev server — renders need `npm run dev`' })
    return null
  }
  try {
    const res = await studioPost('/__studio/jobs', req)
    const body = await res.json() as { job?: Job; error?: string }
    if (!res.ok || !body.job) { emit({ error: body.error ?? `render refused (${res.status})` }); return null }
    emit({ error: null })
    await refreshJobs()
    watchJob(body.job.id)
    return body.job
  } catch (e) {
    emit({ error: String(e) })
    return null
  }
}

export async function killJob(id: string) {
  if (!devApiAvailable()) return
  try {
    await studioPost(`/__studio/jobs/${encodeURIComponent(id)}/kill`, {})
  } catch { /* it may already be gone */ }
  await refreshJobs()
}

/**
 * Poll while the studio is open. Fast while something is running, lazy when
 * nothing is — a render takes minutes, so a 1s poll during one is cheap and a
 * 1s poll during the other 99% of the session is just noise in the log.
 */
export function useJobPolling() {
  const { jobs, logFor } = useJobs()
  const busy = jobs.some(isActive)
  useEffect(() => {
    void refreshJobs()
    const every = busy ? 1000 : 8000
    const t = window.setInterval(() => {
      void refreshJobs()
      if (logFor) void pollLog()
    }, every)
    return () => window.clearInterval(t)
  }, [busy, logFor])
}

/**
 * Remotion prints `Rendered 123/456` and a percentage; render-fast prints its
 * own per-segment ticks. Pull whichever is latest out of the tail so the
 * button can carry a number instead of a spinner.
 */
export function progressOf(log: string): { pct: number | null; note: string } {
  const tail = log.slice(-4000)
  const lines = tail.split('\n').filter(l => l.trim())
  const note = lines.length ? lines[lines.length - 1].slice(0, 90) : ''
  let pct: number | null = null
  for (const line of lines) {
    const frac = /(\d+)\s*\/\s*(\d+)/.exec(line)
    if (frac && +frac[2] > 0) pct = Math.min(100, Math.round((+frac[1] / +frac[2]) * 100))
    const p = /(\d{1,3})%/.exec(line)
    if (p) pct = Math.min(100, +p[1])
  }
  return { pct, note }
}
