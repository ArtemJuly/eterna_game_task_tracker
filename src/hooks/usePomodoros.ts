import {
  activePomodoroStore,
  characterStore,
  historyStore,
  pomodorosStore,
  projectsStore,
  settingsStore,
  tasksStore,
} from './stores';
import type { ActivePomodoro, PomodoroSession } from '../types';
import { generateId } from '../utils/ids';
import { pushToast } from './useToast';
import { playDing } from '../utils/sound';
import { triggerXpPulse } from './useXpPulse';
import { getCompletedCountForTask, getTotalMinutesForTask } from '../utils/pomodoroStats';

export interface PomodoroTarget {
  taskId?: string;
  projectId?: string;
}

function normalizeActive(raw: ActivePomodoro | null): ActivePomodoro | null {
  if (!raw) return null;
  if (raw.status !== 'running' && raw.status !== 'paused') return null;
  return { ...raw, taskId: raw.taskId ?? null, projectId: raw.projectId ?? null };
}

function getPomodoroBonus(): { pomodoroBonusXp: number; pomodoroBonusEternas: number } {
  const settings = settingsStore.getSnapshot();
  return {
    pomodoroBonusXp: settings.pomodoroBonusXp ?? 5,
    pomodoroBonusEternas: settings.pomodoroBonusEternas ?? 5,
  };
}

export function pausePomodoroIfRunningForTask(taskId: string): void {
  const active = normalizeActive(activePomodoroStore.getSnapshot());
  if (!active || active.status !== 'running' || active.taskId !== taskId) return;

  const endsAtMs = active.endsAt ? new Date(active.endsAt).getTime() : Date.now();
  const remainingMs = Math.max(0, endsAtMs - Date.now());
  activePomodoroStore.set({ ...active, status: 'paused', endsAt: null, remainingMs });
}

export function pausePomodoroIfRunningForProject(projectId: string): void {
  const active = normalizeActive(activePomodoroStore.getSnapshot());
  if (!active || active.status !== 'running' || active.projectId !== projectId) return;

  const endsAtMs = active.endsAt ? new Date(active.endsAt).getTime() : Date.now();
  const remainingMs = Math.max(0, endsAtMs - Date.now());
  activePomodoroStore.set({ ...active, status: 'paused', endsAt: null, remainingMs });
}

export function usePomodoros(): {
  sessions: PomodoroSession[];
  active: ActivePomodoro | null;
  startPomodoro: (target?: PomodoroTarget) => void;
  resumePomodoro: (target?: PomodoroTarget) => void;
  completePomodoro: () => void;
  cancelPomodoro: () => void;
  countCompletedForTask: (taskId: string) => number;
  totalMinutesForTask: (taskId: string) => number;
} {
  const [sessions, setSessions] = pomodorosStore.useStore();
  const [rawActive, setActive] = activePomodoroStore.useStore();
  const active = normalizeActive(rawActive);

  function startPomodoro(target: PomodoroTarget = {}) {
    if (active) return;
    const durationMinutes = settingsStore.getSnapshot().pomodoroDurationMinutes;
    const now = new Date();
    setActive({
      taskId: target.taskId ?? null,
      projectId: target.projectId ?? null,
      durationMinutes,
      status: 'running',
      startedAt: now.toISOString(),
      endsAt: new Date(now.getTime() + durationMinutes * 60000).toISOString(),
      remainingMs: null,
    });
  }

  function resumePomodoro(target: PomodoroTarget = {}) {
    if (!active || active.status !== 'paused') return;
    const remainingMs = active.remainingMs ?? 0;
    setActive({
      ...active,
      taskId: target.taskId ?? null,
      projectId: target.projectId ?? null,
      status: 'running',
      endsAt: new Date(Date.now() + remainingMs).toISOString(),
      remainingMs: null,
    });
  }

  function finishActive(status: 'completed' | 'interrupted') {
    if (!active) return;
    const task = active.taskId ? tasksStore.getSnapshot().find((t) => t.id === active.taskId) : undefined;
    const project = active.projectId ? projectsStore.getSnapshot().find((p) => p.id === active.projectId) : undefined;
    const session: PomodoroSession = {
      id: generateId(),
      taskId: active.taskId,
      projectId: active.projectId,
      startedAt: active.startedAt,
      endedAt: new Date().toISOString(),
      durationMinutes: active.durationMinutes,
      status,
    };
    setSessions((prev) => [...prev, session]);
    setActive(null);

    if (status === 'completed') {
      const { pomodoroBonusXp, pomodoroBonusEternas } = getPomodoroBonus();

      characterStore.set((prev) => ({
        totalXp: prev.totalXp + pomodoroBonusXp,
        eternas: prev.eternas + pomodoroBonusEternas,
      }));

      const label = active.taskId
        ? (task?.title ?? 'Задача удалена')
        : active.projectId
          ? (project?.title ?? 'Проект удалён')
          : 'Свободный помидор';

      historyStore.set((prev) => [
        {
          id: generateId(),
          type: 'pomodoro_completed',
          label,
          xpDelta: pomodoroBonusXp,
          eternasDelta: pomodoroBonusEternas,
          createdAt: session.endedAt,
        },
        ...prev,
      ]);

      triggerXpPulse();
    }
  }

  function completePomodoro() {
    if (!active) return;
    const { pomodoroBonusXp, pomodoroBonusEternas } = getPomodoroBonus();
    finishActive('completed');
    playDing();
    pushToast(`Помидор завершён 🍅 +${pomodoroBonusXp} XP · +${pomodoroBonusEternas} ✦`, 'success');
  }

  function cancelPomodoro() {
    finishActive('interrupted');
  }

  function countCompletedForTask(taskId: string): number {
    return getCompletedCountForTask(sessions, taskId);
  }

  function totalMinutesForTask(taskId: string): number {
    return getTotalMinutesForTask(sessions, taskId);
  }

  return {
    sessions,
    active,
    startPomodoro,
    resumePomodoro,
    completePomodoro,
    cancelPomodoro,
    countCompletedForTask,
    totalMinutesForTask,
  };
}
