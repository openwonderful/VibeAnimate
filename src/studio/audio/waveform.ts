/**
 * Waveform peaks for the Scenebuilder's audio lane.
 *
 * Decoding a 3MB mp3 costs a second or so and a chunk of memory, so it
 * happens ONCE per URL and the result is a small Float32Array of peaks —
 * not the decoded buffer, which is dropped as soon as the peaks are out.
 * The lane redraws from peaks on every zoom change; re-decoding there would
 * be unusable.
 *
 * `decodeAudioData` needs an AudioContext, which browsers only let you
 * create after a user gesture — but a *suspended* one is fine for decoding,
 * so this never calls resume() and never makes a sound. Playback is the
 * <audio> element's job (src/components/SongTrack.tsx).
 */

export type Waveform = {
  /** Peak absolute amplitude (0..1) per bucket, left to right. */
  peaks: Float32Array
  /** Source duration in seconds — the lane maps peaks onto the timeline with it. */
  duration: number
}

/** Buckets across the whole file. ~2k is plenty for a 190s song at any zoom. */
const BUCKETS = 2048

const cache = new Map<string, Promise<Waveform | null>>()

export function loadWaveform(url: string): Promise<Waveform | null> {
  const hit = cache.get(url)
  if (hit) return hit
  const job = decode(url).catch(() => null)
  cache.set(url, job)
  return job
}

async function decode(url: string): Promise<Waveform | null> {
  const Ctx: typeof AudioContext | undefined =
    window.AudioContext ?? (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctx) return null

  const res = await fetch(url)
  if (!res.ok) return null
  const bytes = await res.arrayBuffer()

  const ctx = new Ctx()
  try {
    const buf = await ctx.decodeAudioData(bytes)
    // Mono-sum the channels, then take the max magnitude per bucket —
    // max, not mean, because an RMS-ish average flattens transients and
    // the whole point of the lane is seeing where the hits are.
    const peaks = new Float32Array(BUCKETS)
    const per = Math.max(1, Math.floor(buf.length / BUCKETS))
    for (let ch = 0; ch < buf.numberOfChannels; ch++) {
      const data = buf.getChannelData(ch)
      for (let b = 0; b < BUCKETS; b++) {
        const start = b * per
        const end = Math.min(data.length, start + per)
        let peak = 0
        for (let i = start; i < end; i++) {
          const v = data[i] < 0 ? -data[i] : data[i]
          if (v > peak) peak = v
        }
        if (peak > peaks[b]) peaks[b] = peak
      }
    }
    return { peaks, duration: buf.duration }
  } finally {
    // Free the decoder immediately; we only kept the peaks.
    void ctx.close()
  }
}
