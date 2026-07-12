import { activePomodoroStore, characterStore, historyStore, pomodorosStore, settingsStore, tasksStore } from './stores';
import type { ActivePomodoro, PomodoroSession } from '../types';
import { generateId } from '../utils/ids';
import { pushToast } from './useToast';
import { playDing } from '../utils/sound';
import { triggerXpPulse } from './useXpPulse';
import { getCompletedCountForTask, getTotalMinutesForTask } from '../utils/pomodoroStats';

function normalizeActive(raw: ActivePomodoro | null): ActivePomodoro | null {
  if (!raw) return null;
  if (raw.status !== 'running' && raw.status !== 'paused') return null;
  return raw;
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

export function usePomodoros(): {
  sessions: PomodoroSession[];
  active: ActivePomodoro | null;
  startPomodoro: (taskId: string) => void;
  resumePomodoro: (taskId: string) => void;
  completePomodoro: () => void;
  cancelPomodoro: () => void;
  countCompletedForTask: (taskId: string) => number;
  totalMinutesForTask: (taskId: string) => number;
} {
  const [sessions, setSessions] = pomodorosStore.useStore();
  const [rawActive, setActive] = activePomodoroStore.useStore();
  const active = normalizeActive(rawActive);

  function startPomodoro(taskId: string) {
    if (active) return;
    const durationMinutes = settingsStore.getSnapshot().pomodoroDurationMinutes;
    const now = new Date();
    setActive({
      taskId,
      durationMinutes,
      status: 'running',
      startedAt: now.toISOString(),
      endsAt: new Date(now.getTime() + durationMinutes * 60000).toISOString(),
      remainingMs: null,
    });
  }

  function resumePomodoro(taskId: string) {
    if (!active || active.status !== 'paused') return;
    const remainingMs = active.remainingMs ?? 0;
    setActive({
      ...active,
      taskId,
      status: 'running',
      endsAt: new Date(Date.now() + remainingMs).toISOString(),
      remainingMs: null,
    });
  }

  function finishActive(status: 'completed' | 'interrupted') {
    if (!active) return;
    const task = tasksStore.getSnapshot().find((t) => t.id === active.taskId);
    const session: PomodoroSession = {
      id: generateId(),
      taskId: active.taskId,
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

      historyStore.set((prev) => [
        {
          id: generateId(),
          type: 'pomodoro_completed',
          label: task?.title ?? 'Задача удалена',
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
