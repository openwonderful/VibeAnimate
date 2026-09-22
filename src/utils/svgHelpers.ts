export function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export interface StarData {
  cx: number;
  cy: number;
  r: number;
  opacity: number;
  animClass: string;
  delay: number;
}

export function generateStarPositions(
  count: number,
  seed: number,
  width: number,
  height: number
): StarData[] {
  const rand = seededRandom(seed);
  const classes = ['twinkle-slow', 'twinkle-medium', 'twinkle-fast'];
  const stars: StarData[] = [];
  for (let i = 0; i < count; i++) {
    stars.push({
      cx: rand() * width,
      cy: rand() * height * 0.6,
      r: 0.5 + rand() * 1.8,
      opacity: 0.3 + rand() * 0.6,
      animClass: classes[Math.floor(rand() * 3)],
      delay: rand() * 5,
    });
  }
  return stars;
}

export interface BlossomData {
  x: number;
  scale: number;
  opacity: number;
  fallDuration: number;
  swayDuration: number;
  spinDuration: number;
  delay: number;
  color: string;
  rotation: number;
}

export function generateBlossomPositions(
  count: number,
  seed: number,
  colors: string[]
): BlossomData[] {
  const rand = seededRandom(seed);
  const blossoms: BlossomData[] = [];
  for (let i = 0; i < count; i++) {
    blossoms.push({
      x: rand() * 100,
      scale: 0.4 + rand() * 1.2,
      opacity: 0.3 + rand() * 0.6,
      fallDuration: 8 + rand() * 10,
      swayDuration: 3 + rand() * 4,
      spinDuration: 5 + rand() * 8,
      delay: -(rand() * 18),
      color: colors[Math.floor(rand() * colors.length)],
      rotation: rand() * 360,
    });
  }
  return blossoms;
}

export function createWavePath(
  width: number,
  amplitude: number,
  frequency: number,
  phase: number,
  baseY: number
): string {
  const points: string[] = [`M 0 ${baseY + amplitude}`];
  const step = width / (frequency * 4);
  for (let x = 0; x <= width + step; x += step) {
    const y = baseY + Math.sin((x / width) * frequency * Math.PI * 2 + phase) * amplitude;
    if (x === 0) {
      points.push(`L 0 ${y}`);
    } else {
      const cx1 = x - step * 0.66;
      const cx2 = x - step * 0.33;
      const prevY = baseY + Math.sin(((x - step) / width) * frequency * Math.PI * 2 + phase) * amplitude;
      const midY1 = prevY + (y - prevY) * 0.33;
      const midY2 = prevY + (y - prevY) * 0.66;
      points.push(`C ${cx1} ${midY1} ${cx2} ${midY2} ${x} ${y}`);
    }
  }
  points.push(`L ${width + step} ${baseY + amplitude + 200}`);
  points.push(`L 0 ${baseY + amplitude + 200} Z`);
  return points.join(' ');
}

export function createMountainPath(
  peaks: { x: number; y: number }[],
  baseY: number,
  width: number
): string {
  if (peaks.length === 0) return '';
  const parts: string[] = [`M 0 ${baseY}`];

  // Start from bottom-left, go up to first peak
  const first = peaks[0];
  parts.push(`Q ${first.x * 0.5} ${baseY - (baseY - first.y) * 0.3} ${first.x} ${first.y}`);

  for (let i = 1; i < peaks.length; i++) {
    const prev = peaks[i - 1];
    const curr = peaks[i];
    const midX = (prev.x + curr.x) / 2;
    const valleyY = baseY - (baseY - Math.max(prev.y, curr.y)) * 0.15;
    parts.push(`Q ${(prev.x + midX) / 2} ${valleyY} ${midX} ${valleyY}`);
    parts.push(`Q ${(midX + curr.x) / 2} ${valleyY} ${curr.x} ${curr.y}`);
  }

  // End at bottom-right
  const last = peaks[peaks.length - 1];
  parts.push(`Q ${(last.x + width) / 2} ${baseY - (baseY - last.y) * 0.2} ${width} ${baseY}`);
  parts.push(`L ${width} ${baseY + 100} L 0 ${baseY + 100} Z`);

  return parts.join(' ');
}

// ═══════════ Scene 2 & 3 generators ═══════════

export type CrowdSection = 'upper-left' | 'upper-right' | 'lower-left' | 'lower-right' | 'floor';

export interface CrowdFigureData {
  x: number;
  y: number;
  type: number;       // 0-3 silhouette variant
  scale: number;
  jumpDelay: number;   // seconds, computed from position for wave effect
  jumpHeight: number;  // 6-12px
  section: CrowdSection;
}

export function generatePerspectiveCrowdPositions(seed: number): CrowdFigureData[] {
  const rand = seededRandom(seed);
  const figures: CrowdFigureData[] = [];
  const stageX = 960, stageY = 280;

  const addBand = (
    count: number,
    yMin: number, yMax: number,
    scaleMin: number, scaleMax: number,
    section: CrowdSection,
    typeWeightFn?: (x: number) => number,
  ) => {
    for (let i = 0; i < count; i++) {
      const x = 50 + rand() * 1820;
      const y = yMin + rand() * (yMax - yMin);
      // Skip area flanking the stage (equipment/backstage zone)
      if (y < 280 && x > 250 && x < 1670) continue;
      const dist = Math.sqrt((x - stageX) ** 2 + (y - stageY) ** 2);
      // Weighted type: left side more arms-up, right side more standing
      let type: number;
      if (typeWeightFn) {
        type = rand() < 0.7 ? typeWeightFn(x) : Math.floor(rand() * 4);
      } else {
        type = Math.floor(rand() * 4);
      }
      figures.push({
        x, y, type,
        scale: scaleMin + rand() * (scaleMax - scaleMin),
        jumpDelay: (dist / 800) * 2 + rand() * 0.3,
        jumpHeight: 4 + rand() * 6 * ((scaleMin + scaleMax) / 2),
        section,
      });
    }
  };

  // Far crowd (near stage, tiny, very dense)
  addBand(220, 140, 350, 0.15, 0.25, 'floor');
  // Mid crowd (medium distance)
  addBand(200, 350, 600, 0.25, 0.45, 'lower-left',
    (x) => x < 700 ? 0 : x > 1200 ? 1 : Math.floor(Math.random() * 4));
  // Near crowd (closer to viewer)
  addBand(160, 600, 790, 0.45, 0.7, 'lower-right');

  return figures;
}

/** @deprecated Use generatePerspectiveCrowdPositions instead */
export function generateCrowdPositions(seed: number): CrowdFigureData[] {
  const rand = seededRandom(seed);
  const figures: CrowdFigureData[] = [];

  const addFigures = (
    count: number,
    section: CrowdSection,
    xMin: number, xMax: number,
    yMin: number, yMax: number,
    scaleMin: number, scaleMax: number,
    delayFn: (x: number, y: number) => number,
  ) => {
    for (let i = 0; i < count; i++) {
      const x = xMin + rand() * (xMax - xMin);
      const y = yMin + rand() * (yMax - yMin);
      figures.push({
        x, y,
        type: Math.floor(rand() * 4),
        scale: scaleMin + rand() * (scaleMax - scaleMin),
        jumpDelay: delayFn(x, y),
        jumpHeight: 6 + rand() * 6,
        section,
      });
    }
  };

  // Upper-left tier: L→R wave
  addFigures(60, 'upper-left', 30, 290, 370, 640, 0.3, 0.5,
    (x) => (x / 300) * 2);
  // Upper-right tier: R→L wave
  addFigures(60, 'upper-right', 1630, 1890, 370, 640, 0.3, 0.5,
    (x) => ((1920 - x) / 300) * 2);
  // Lower-left tier: radial from center
  addFigures(50, 'lower-left', 30, 580, 660, 840, 0.4, 0.6,
    (x, y) => Math.sqrt((x - 960) ** 2 + (y - 950) ** 2) / 500 * 2);
  // Lower-right tier: radial from center
  addFigures(50, 'lower-right', 1340, 1890, 660, 840, 0.4, 0.6,
    (x, y) => Math.sqrt((x - 960) ** 2 + (y - 950) ** 2) / 500 * 2);
  // Floor/pit: radial from center-bottom, densest
  addFigures(80, 'floor', 420, 1500, 855, 940, 0.5, 0.8,
    (x, y) => Math.sqrt((x - 960) ** 2 + (y - 950) ** 2) / 600 * 2);

  return figures;
}

export interface ArmyBombData {
  cx: number;
  cy: number;
  r: number;
  color: string;
  animClass: string;
  delay: number;
}

export function generateArmyBombPositions(
  count: number,
  seed: number,
  colors: string[],
): ArmyBombData[] {
  const rand = seededRandom(seed);
  const classes = ['army-bomb-glow', 'army-bomb-glow-fast', 'army-bomb-glow-slow'];
  const bombs: ArmyBombData[] = [];
  // Weighted sections: more in floor/pit area
  for (let i = 0; i < count; i++) {
    const section = rand();
    let cx: number, cy: number;
    if (section < 0.35) {
      // Floor/pit (densest)
      cx = 420 + rand() * 1080;
      cy = 855 + rand() * 85;
    } else if (section < 0.55) {
      // Lower-left
      cx = 30 + rand() * 550;
      cy = 660 + rand() * 180;
    } else if (section < 0.75) {
      // Lower-right
      cx = 1340 + rand() * 550;
      cy = 660 + rand() * 180;
    } else if (section < 0.88) {
      // Upper-left
      cx = 30 + rand() * 260;
      cy = 370 + rand() * 270;
    } else {
      // Upper-right
      cx = 1630 + rand() * 260;
      cy = 370 + rand() * 270;
    }
    bombs.push({
      cx, cy,
      r: 1 + rand() * 2,
      color: colors[Math.floor(rand() * colors.length)],
      animClass: classes[Math.floor(rand() * 3)],
      delay: rand() * 4,
    });
  }
  return bombs;
}

export interface ConfettiData {
  x: number;
  scale: number;
  color: string;
  fallDuration: number;
  swayDuration: number;
  spinDuration: number;
  delay: number;
  width: number;
  height: number;
}

export function generateConfettiPositions(
  count: number,
  seed: number,
  colors: string[],
): ConfettiData[] {
  const rand = seededRandom(seed);
  const confetti: ConfettiData[] = [];
  for (let i = 0; i < count; i++) {
    confetti.push({
      x: rand() * 100,
      scale: 0.5 + rand() * 1.0,
      color: colors[Math.floor(rand() * colors.length)],
      fallDuration: 6 + rand() * 8,
      swayDuration: 2 + rand() * 3,
      spinDuration: 2 + rand() * 4,
      delay: -(rand() * 14),
      width: 2 + rand() * 3,
      height: 6 + rand() * 8,
    });
  }
  return confetti;
}

export interface SparkData {
  x: number;
  y: number;
  r: number;
  color: string;
  riseDuration: number;
  delay: number;
}

export function generateSparkPositions(
  count: number,
  seed: number,
  origins: { x: number; y: number }[],
  colors: string[],
): SparkData[] {
  const rand = seededRandom(seed);
  const sparks: SparkData[] = [];
  for (let i = 0; i < count; i++) {
    const origin = origins[Math.floor(rand() * origins.length)];
    sparks.push({
      x: origin.x + (rand() - 0.5) * 40,
      y: origin.y - rand() * 30,
      r: 1 + rand() * 1.5,
      color: colors[Math.floor(rand() * colors.length)],
      riseDuration: 1.5 + rand() * 2,
      delay: -(rand() * 3),
    });
  }
  return sparks;
}
