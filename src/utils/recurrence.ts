import type { Task } from '../types';

export const RECURRENCE_PRESETS: { label: string; days: number }[] = [
  { label: 'Ежедневно', days: 1 },
  { label: 'Через день', days: 2 },
  { label: 'Раз в неделю', days: 7 },
];

export function isTaskOverdue(task: Task, today: string): boolean {
  if (task.status === 'done' || task.status === 'cancelled') return false;
  // A recurring task's own dueDate freezes at whatever it was set to when the task was
  // created, so it must not keep flagging the task overdue once nextDueDate has moved on.
  if (task.recurrenceIntervalDays !== null) return task.nextDueDate !== null && task.nextDueDate < today;
  return task.dueDate !== null && task.dueDate < today;
}

export function formatRecurrence(intervalDays: number): string {
  if (intervalDays === 1) return 'ежедневно';
  if (intervalDays === 7) return 'раз в неделю';
  return `каждые ${intervalDays} дн.`;
}

export function getStreakBonus(
  newStreak: number,
  stepXp: number,
  stepEternas: number,
): { xp: number; eternas: number } {
  const steps = Math.max(0, newStreak - 1);
  return { xp: steps * stepXp, eternas: steps * stepEternas };
}

export const STREAK_MILESTONES = [3, 7, 14, 30];

export function getStreakStars(streakCount: number): number {
  return STREAK_MILESTONES.filter((m) => streakCount >= m).length;
}

export function getNextStreakMilestone(streakCount: number): number | null {
  return STREAK_MILESTONES.find((m) => streakCount < m) ?? null;
}
