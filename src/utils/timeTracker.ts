import type { PomodoroSession, Project, Task, TimeCategory, TimeEntry } from '../types';
import { addDaysToDateString, getTodayDateString } from './today';

export type TimeRangeKey = 'week' | 'twoWeeks' | 'month' | 'all';

export const TIME_RANGE_OPTIONS: { key: TimeRangeKey; label: string }[] = [
  { key: 'week', label: 'Неделя' },
  { key: 'twoWeeks', label: '2 недели' },
  { key: 'month', label: 'Месяц' },
  { key: 'all', label: 'Всё время' },
];

export function getRangeStartDate(range: TimeRangeKey, today: string): string | null {
  switch (range) {
    case 'week':
      return addDaysToDateString(today, -6);
    case 'twoWeeks':
      return addDaysToDateString(today, -13);
    case 'month':
      return addDaysToDateString(today, -29);
    case 'all':
      return null;
  }
}

function isDateInRange(date: string, start: string | null, end: string): boolean {
  if (date > end) return false;
  return start === null || date >= start;
}

// A task with no categories of its own inherits its project's categories by default —
// its own tags, once set, fully take over (no merging with the project's).
export function getEffectiveTaskCategoryIds(task: Task, projects: Project[]): string[] {
  if (task.timeCategoryIds.length > 0) return task.timeCategoryIds;
  if (!task.projectId) return [];
  const project = projects.find((p) => p.id === task.projectId);
  return project?.timeCategoryIds ?? [];
}

export function getPomodoroCategoryIds(session: PomodoroSession, tasks: Task[], projects: Project[]): string[] {
  if (session.taskId) {
    const task = tasks.find((t) => t.id === session.taskId);
    return task ? getEffectiveTaskCategoryIds(task, projects) : [];
  }
  if (session.projectId) {
    const project = projects.find((p) => p.id === session.projectId);
    return project?.timeCategoryIds ?? [];
  }
  return [];
}

export interface TimeCategoryReport {
  categoryId: string;
  manualMinutes: number;
  pomodoroMinutes: number;
  totalMinutes: number;
}

export function buildTimeReport(
  categories: TimeCategory[],
  entries: TimeEntry[],
  sessions: PomodoroSession[],
  tasks: Task[],
  projects: Project[],
  range: TimeRangeKey,
): TimeCategoryReport[] {
  const today = getTodayDateString();
  const start = getRangeStartDate(range, today);

  const manualByCategory = new Map<string, number>();
  for (const e of entries) {
    if (!isDateInRange(e.date, start, today)) continue;
    manualByCategory.set(e.categoryId, (manualByCategory.get(e.categoryId) ?? 0) + e.durationMinutes);
  }

  const pomodoroByCategory = new Map<string, number>();
  for (const s of sessions) {
    if (s.status !== 'completed') continue;
    const date = s.endedAt.slice(0, 10);
    if (!isDateInRange(date, start, today)) continue;
    for (const id of getPomodoroCategoryIds(s, tasks, projects)) {
      pomodoroByCategory.set(id, (pomodoroByCategory.get(id) ?? 0) + s.durationMinutes);
    }
  }

  return categories.map((c) => {
    const manualMinutes = manualByCategory.get(c.id) ?? 0;
    const pomodoroMinutes = pomodoroByCategory.get(c.id) ?? 0;
    return { categoryId: c.id, manualMinutes, pomodoroMinutes, totalMinutes: manualMinutes + pomodoroMinutes };
  });
}

export function formatMinutesAsHours(minutes: number): string {
  const hours = minutes / 60;
  return Number.isInteger(hours) ? String(hours) : hours.toFixed(1);
}
