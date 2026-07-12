export interface LevelDef {
  level: number;
  name: string;
  minXp: number;
}

export const LEVELS: LevelDef[] = [
  { level: 1, name: 'Новичок', minXp: 0 },
  { level: 2, name: 'Аналитик', minXp: 300 },
  { level: 3, name: 'Исследователь', minXp: 700 },
  { level: 4, name: 'Архитектор', minXp: 1200 },
  { level: 5, name: 'Ведущий архитектор', minXp: 2000 },
  { level: 6, name: 'Директор', minXp: 3000 },
  { level: 7, name: 'Исполнительный директор', minXp: 5000 },
  { level: 8, name: 'Создатель систем', minXp: 8000 },
];

export function getLevel(totalXp: number): LevelDef {
  let current = LEVELS[0];
  for (const def of LEVELS) {
    if (totalXp >= def.minXp) current = def;
  }
  return current;
}

export function getNextLevel(totalXp: number): LevelDef | null {
  const current = getLevel(totalXp);
  const idx = LEVELS.findIndex((l) => l.level === current.level);
  return LEVELS[idx + 1] ?? null;
}

export function getLevelProgress(totalXp: number): {
  level: LevelDef;
  next: LevelDef | null;
  xpIntoLevel: number;
  xpForLevel: number;
  percent: number;
} {
  const level = getLevel(totalXp);
  const next = getNextLevel(totalXp);
  if (!next) {
    return { level, next: null, xpIntoLevel: totalXp - level.minXp, xpForLevel: 0, percent: 100 };
  }
  const xpIntoLevel = totalXp - level.minXp;
  const xpForLevel = next.minXp - level.minXp;
  const percent = Math.min(100, Math.round((xpIntoLevel / xpForLevel) * 100));
  return { level, next, xpIntoLevel, xpForLevel, percent };
}
