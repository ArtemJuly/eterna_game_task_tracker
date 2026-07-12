import type { PomodoroSession } from '../types';

export function getCompletedCountForTask(sessions: PomodoroSession[], taskId: string): number {
  return sessions.filter((s) => s.taskId === taskId && s.status === 'completed').length;
}

export function getTotalMinutesForTask(sessions: PomodoroSession[], taskId: string): number {
  return sessions
    .filter((s) => s.taskId === taskId && s.status === 'completed')
    .reduce((sum, s) => sum + s.durationMinutes, 0);
}

export function getTotalMinutes(sessions: PomodoroSession[]): number {
  return sessions.filter((s) => s.status === 'completed').reduce((sum, s) => sum + s.durationMinutes, 0);
}
