import type { Task } from '../types';

export type TaskSortMode = 'urgency' | 'xp';

export const TASK_SORT_OPTIONS: { key: TaskSortMode; label: string }[] = [
  { key: 'urgency', label: 'По срочности' },
  { key: 'xp', label: 'По опыту' },
];

function effectiveDueDate(task: Task): string | null {
  if (task.dueDate !== null) return task.dueDate;
  if (task.recurrenceIntervalDays !== null) return task.nextDueDate;
  return null;
}

function daysBetween(fromStr: string, toStr: string): number {
  const [fy, fm, fd] = fromStr.split('-').map(Number);
  const [ty, tm, td] = toStr.split('-').map(Number);
  const from = new Date(fy, fm - 1, fd);
  const to = new Date(ty, tm - 1, td);
  return Math.round((to.getTime() - from.getTime()) / 86400000);
}

function urgencyRank(task: Task, today: string): number {
  const due = effectiveDueDate(task);
  if (due === null) return Infinity;
  return daysBetween(today, due);
}

function importance(task: Task): number {
  return task.xp + task.eternas;
}

function byCreatedAtDesc(a: Task, b: Task): number {
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

function compareByMode(a: Task, b: Task, mode: TaskSortMode, today: string): number {
  if (mode === 'xp') {
    const diff = importance(b) - importance(a);
    if (diff !== 0) return diff;
    return byCreatedAtDesc(a, b);
  }
  const aInProgress = a.status === 'in_progress' ? 1 : 0;
  const bInProgress = b.status === 'in_progress' ? 1 : 0;
  if (aInProgress !== bInProgress) return bInProgress - aInProgress;
  const urgencyDiff = urgencyRank(a, today) - urgencyRank(b, today);
  if (urgencyDiff !== 0) return urgencyDiff;
  const importanceDiff = importance(b) - importance(a);
  if (importanceDiff !== 0) return importanceDiff;
  return byCreatedAtDesc(a, b);
}

export function compareTasks(a: Task, b: Task, mode: TaskSortMode, today: string): number {
  const aFocused = a.focusDate === today ? 1 : 0;
  const bFocused = b.focusDate === today ? 1 : 0;
  if (aFocused !== bFocused) return bFocused - aFocused;
  return compareByMode(a, b, mode, today);
}
