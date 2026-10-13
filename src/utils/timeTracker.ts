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

export function isDateInRange(date: string, start: string | null, end: string): boolean {
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

function getPomodoroCategoryIds(session: PomodoroSession, tasks: Task[], projects: Project[]): string[] {
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

// Divides `total` whole minutes evenly across `count` categories so the parts sum back
// to exactly `total` — the first `total % count` categories get one extra minute.
function splitEvenly(total: number, count: number): number[] {
  if (count <= 0) return [];
  const base = Math.floor(total / count);
  const remainder = total - base * count;
  return Array.from({ length: count }, (_, i) => base + (i < remainder ? 1 : 0));
}

export interface CategoryMinutesSplit {
  categoryId: string;
  minutes: number;
}

// A pomodoro tagged with several categories splits its duration proportionally (evenly)
// across them instead of counting the full duration under each one.
export function getPomodoroCategorySplit(
  session: PomodoroSession,
  tasks: Task[],
  projects: Project[],
): CategoryMinutesSplit[] {
  const categoryIds = getPomodoroCategoryIds(session, tasks, projects);
  if (categoryIds.length === 0) return [];
  const parts = splitEvenly(session.durationMinutes, categoryIds.length);
  return categoryIds.map((categoryId, i) => ({ categoryId, minutes: parts[i] }));
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
    for (const { categoryId, minutes } of getPomodoroCategorySplit(s, tasks, projects)) {
      pomodoroByCategory.set(categoryId, (pomodoroByCategory.get(categoryId) ?? 0) + minutes);
    }
  }

  return categories.map((c) => {
    const manualMinutes = manualByCategory.get(c.id) ?? 0;
    const pomodoroMinutes = pomodoroByCategory.get(c.id) ?? 0;
    return { categoryId: c.id, manualMinutes, pomodoroMinutes, totalMinutes: manualMinutes + pomodoroMinutes };
  });
}

export interface PomodoroTimeEntry {
  id: string;
  categoryId: string;
  date: string;
  durationMinutes: number;
  label: string;
}

// One row per (completed pomodoro, matching category) — a session tagged with several
// categories shows up once under each, with its duration split evenly between them (so
// the rows sum back to the session's real length instead of over-counting).
export function getPomodoroTimeEntries(
  sessions: PomodoroSession[],
  tasks: Task[],
  projects: Project[],
): PomodoroTimeEntry[] {
  const result: PomodoroTimeEntry[] = [];
  for (const s of sessions) {
    if (s.status !== 'completed') continue;
    const split = getPomodoroCategorySplit(s, tasks, projects);
    if (split.length === 0) continue;

    const label = s.taskId
      ? (tasks.find((t) => t.id === s.taskId)?.title ?? 'Задача удалена')
      : s.projectId
        ? (projects.find((p) => p.id === s.projectId)?.title ?? 'Проект удалён')
        : '';
    const date = s.endedAt.slice(0, 10);

    for (const { categoryId, minutes } of split) {
      if (minutes === 0) continue;
      result.push({ id: `${s.id}-${categoryId}`, categoryId, date, durationMinutes: minutes, label });
    }
  }
  return result;
}

export function formatMinutesAsHours(minutes: number): string {
  const hours = minutes / 60;
  return Number.isInteger(hours) ? String(hours) : hours.toFixed(1);
}
