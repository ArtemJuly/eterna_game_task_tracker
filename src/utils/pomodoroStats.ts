import type { PomodoroSession, Task } from '../types';

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

export function getProjectPomodoroStats(
  sessions: PomodoroSession[],
  tasks: Task[],
  projectId: string,
): { count: number; totalMinutes: number } {
  const projectTaskIds = new Set(tasks.filter((t) => t.projectId === projectId).map((t) => t.id));
  const relevant = sessions.filter(
    (s) =>
      s.status === 'completed' &&
      (s.projectId === projectId || (s.taskId !== null && projectTaskIds.has(s.taskId))),
  );
  return {
    count: relevant.length,
    totalMinutes: relevant.reduce((sum, s) => sum + s.durationMinutes, 0),
  };
}
