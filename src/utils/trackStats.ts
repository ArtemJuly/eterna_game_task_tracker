import type { PomodoroSession, Task } from '../types';

export function getStageStats(
  tasks: Task[],
  sessions: PomodoroSession[],
  trackId: string,
  stageId: string,
  projectId: string | null = null,
): { completedTasks: number; studyMinutes: number } {
  const linkedTaskIds = tasks
    .filter(
      (t) =>
        t.trackLinks.some((l) => l.trackId === trackId && l.stageId === stageId) ||
        (projectId !== null && t.projectId === projectId),
    )
    .map((t) => t.id);

  const completedTasks = tasks.filter((t) => linkedTaskIds.includes(t.id) && t.status === 'done').length;
  const studyMinutes = sessions
    .filter((s) => s.status === 'completed' && s.taskId !== null && linkedTaskIds.includes(s.taskId))
    .reduce((sum, s) => sum + s.durationMinutes, 0);

  return { completedTasks, studyMinutes };
}
