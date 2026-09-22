import { useAnimTime } from './useAnimTime';
import {
  getSongTime,
  getCurrentSection,
  getIntensity,
  getDropShake,
  getArirangFactor,
  type SongSection,
} from '../utils/beatMap';

export interface BeatState {
  time: number;
  songTime: number;
  intensity: number;
  section: SongSection;
  shakeX: number;
  shakeY: number;
  arirangFactor: number;
  waveSpeed: number;
}

/** Derives beat-synced state from animation time */
export function useBeatSync(): BeatState {
  const time = useAnimTime();
  const songTime = getSongTime(time);
  const section = getCurrentSection(songTime);
  const intensity = getIntensity(songTime);
  const { x: shakeX, y: shakeY } = getDropShake(songTime);
  const arirangFactor = getArirangFactor(songTime);

  return {
    time,
    songTime,
    intensity,
    section,
    shakeX,
    shakeY,
    arirangFactor,
    waveSpeed: section.waveSpeed,
  };
}
