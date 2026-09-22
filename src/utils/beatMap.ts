/**
 * Beat map for BTS "Body to Body" — 120 BPM, 190 seconds.
 * Pure functions that map animation time → song state.
 * Loops every SONG_DURATION seconds.
 */

export const SONG_DURATION = 190;
export const BPM = 120;
export const BEAT_INTERVAL = 60 / BPM; // 0.5s

export interface SongSection {
  startTime: number;
  endTime: number;
  label: string;
  intensity: number; // 0.0–1.0
  waveSpeed: number; // px/s for ARMY bomb wave
}

export const SONG_SECTIONS: SongSection[] = [
  { startTime: 0,   endTime: 7,   label: 'silence',    intensity: 0.0,  waveSpeed: 100 },
  { startTime: 7,   endTime: 18,  label: 'intro',      intensity: 0.3,  waveSpeed: 200 },
  { startTime: 18,  endTime: 29,  label: 'verse1',     intensity: 0.6,  waveSpeed: 400 },
  { startTime: 29,  endTime: 44,  label: 'rap',        intensity: 0.7,  waveSpeed: 350 },
  { startTime: 44,  endTime: 58,  label: 'chorus1',    intensity: 1.0,  waveSpeed: 600 },
  { startTime: 58,  endTime: 78,  label: 'post-chor1', intensity: 0.8,  waveSpeed: 450 },
  { startTime: 78,  endTime: 96,  label: 'verse2',     intensity: 0.6,  waveSpeed: 300 },
  { startTime: 96,  endTime: 111, label: 'chorus2',    intensity: 1.0,  waveSpeed: 600 },
  { startTime: 111, endTime: 143, label: 'post-chor2', intensity: 0.85, waveSpeed: 500 },
  { startTime: 143, endTime: 176, label: 'arirang',    intensity: 0.4,  waveSpeed: 150 },
  { startTime: 176, endTime: 190, label: 'final-drop', intensity: 1.0,  waveSpeed: 600 },
];

/** Drop timestamps — moments of peak energy / bass hit */
export const DROP_TIMESTAMPS = [20.2, 44, 96, 176];

/** Wrap raw time into song position (loops every 190s) */
export function getSongTime(time: number): number {
  return time % SONG_DURATION;
}

/** Find the current section for a given song time */
export function getCurrentSection(songTime: number): SongSection {
  for (let i = SONG_SECTIONS.length - 1; i >= 0; i--) {
    if (songTime >= SONG_SECTIONS[i].startTime) return SONG_SECTIONS[i];
  }
  return SONG_SECTIONS[0];
}

/** Get intensity with smooth crossfade at section boundaries (0.5s ramp) */
export function getIntensity(songTime: number): number {
  const section = getCurrentSection(songTime);
  const nextIdx = SONG_SECTIONS.indexOf(section) + 1;
  const next = SONG_SECTIONS[nextIdx];

  if (!next) return section.intensity;

  // Smooth ramp in last 0.5s of section
  const timeToEnd = section.endTime - songTime;
  if (timeToEnd < 0.5) {
    const t = 1 - timeToEnd / 0.5;
    return section.intensity + (next.intensity - section.intensity) * t;
  }
  return section.intensity;
}

/** Camera shake at drop timestamps — repeats on each beat for DROP_BEAT_COUNT beats */
export function getDropShake(songTime: number): { x: number; y: number } {
  const SHAKE_DURATION = 0.3;
  const SHAKE_FREQ = 25;
  const SHAKE_AMP = 6;
  const DROP_BEAT_COUNT = 10;
  const DROP_WINDOW = DROP_BEAT_COUNT * BEAT_INTERVAL; // 10 beats × 0.5s = 5s

  for (const dropTime of DROP_TIMESTAMPS) {
    const elapsed = songTime - dropTime;
    if (elapsed >= 0 && elapsed < DROP_WINDOW) {
      // Time within current beat
      const beatT = elapsed % BEAT_INTERVAL;
      if (beatT < SHAKE_DURATION) {
        const decay = 1 - beatT / SHAKE_DURATION;
        const x = Math.sin(beatT * SHAKE_FREQ * Math.PI * 2) * SHAKE_AMP * decay;
        const y = Math.sin(beatT * SHAKE_FREQ * Math.PI * 2 + Math.PI * 0.7) * SHAKE_AMP * decay * 0.6;
        return { x, y };
      }
    }
  }
  return { x: 0, y: 0 };
}

/** Arirang bridge factor — smooth 0→1→0 ramp during bridge section */
export function getArirangFactor(songTime: number): number {
  const BRIDGE_START = 143;
  const BRIDGE_END = 176;
  const RAMP = 1.0; // 1 second ramp in/out

  if (songTime < BRIDGE_START || songTime > BRIDGE_END) return 0;
  if (songTime < BRIDGE_START + RAMP) return (songTime - BRIDGE_START) / RAMP;
  if (songTime > BRIDGE_END - RAMP) return (BRIDGE_END - songTime) / RAMP;
  return 1;
}
