import type { HistoryEntry, PomodoroSession } from '../types';

export interface ChartPoint {
  label: string;
  value: number;
}

function formatDayLabel(date: Date): string {
  return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
}

export function buildCumulativeSeries(
  history: HistoryEntry[],
  deltaKey: 'xpDelta' | 'eternasDelta',
  currentTotal: number,
  days: number,
): ChartPoint[] {
  const sorted = [...history].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  const totalDelta = sorted.reduce((sum, e) => sum + e[deltaKey], 0);
  const baseline = currentTotal - totalDelta;

  const today = new Date();
  today.setHours(23, 59, 59, 999);

  const points: ChartPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const dayEnd = new Date(today);
    dayEnd.setDate(dayEnd.getDate() - i);
    const cutoff = dayEnd.getTime();
    const sumUpToDay = sorted
      .filter((e) => new Date(e.createdAt).getTime() <= cutoff)
      .reduce((sum, e) => sum + e[deltaKey], 0);
    points.push({ label: formatDayLabel(dayEnd), value: baseline + sumUpToDay });
  }
  return points;
}

export function buildTaskCompletionSeries(history: HistoryEntry[], days: number): ChartPoint[] {
  const doneEntries = history.filter((e) => e.type === 'task_done');
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const points: ChartPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const dayStart = new Date(today);
    dayStart.setDate(dayStart.getDate() - i);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);
    const count = doneEntries.filter((e) => {
      const completedTime = new Date(e.createdAt).getTime();
      return completedTime >= dayStart.getTime() && completedTime < dayEnd.getTime();
    }).length;
    points.push({ label: formatDayLabel(dayStart), value: count });
  }
  return points;
}

export function buildPomodoroSeries(sessions: PomodoroSession[], days: number): ChartPoint[] {
  const completed = sessions.filter((s) => s.status === 'completed');
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const points: ChartPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const dayStart = new Date(today);
    dayStart.setDate(dayStart.getDate() - i);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);
    const count = completed.filter((s) => {
      const t = new Date(s.endedAt).getTime();
      return t >= dayStart.getTime() && t < dayEnd.getTime();
    }).length;
    points.push({ label: formatDayLabel(dayStart), value: count });
  }
  return points;
}
