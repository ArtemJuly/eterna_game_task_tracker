export const STAGE_LEVEL_THRESHOLDS = [0, 100, 250];
export const STAGE_MAX_LEVEL = STAGE_LEVEL_THRESHOLDS.length;

export function getStageLevel(xp: number): number {
  let level = 1;
  for (let i = 0; i < STAGE_LEVEL_THRESHOLDS.length; i++) {
    if (xp >= STAGE_LEVEL_THRESHOLDS[i]) level = i + 1;
  }
  return Math.min(level, STAGE_MAX_LEVEL);
}

export function getStageLevelProgress(xp: number): {
  level: number;
  xpIntoLevel: number;
  xpForLevel: number;
  percent: number;
  isMaxLevel: boolean;
} {
  const level = getStageLevel(xp);
  const isMaxLevel = level >= STAGE_MAX_LEVEL;
  if (isMaxLevel) {
    return {
      level,
      xpIntoLevel: xp - STAGE_LEVEL_THRESHOLDS[STAGE_MAX_LEVEL - 1],
      xpForLevel: 0,
      percent: 100,
      isMaxLevel: true,
    };
  }
  const currentThreshold = STAGE_LEVEL_THRESHOLDS[level - 1];
  const nextThreshold = STAGE_LEVEL_THRESHOLDS[level];
  const xpIntoLevel = xp - currentThreshold;
  const xpForLevel = nextThreshold - currentThreshold;
  const percent = Math.min(100, Math.round((xpIntoLevel / xpForLevel) * 100));
  return { level, xpIntoLevel, xpForLevel, percent, isMaxLevel: false };
}

export function formatStageLevel(level: number): string {
  const roman = ['I', 'II', 'III', 'IV', 'V'];
  return roman[level - 1] ?? String(level);
}
