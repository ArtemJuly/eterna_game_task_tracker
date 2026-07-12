import { characterStore, historyStore, tasksStore } from './stores';
import type { Task, TaskStatus } from '../types';
import { generateId } from '../utils/ids';
import { pushToast } from './useToast';
import { triggerXpPulse } from './useXpPulse';
import { getTodayDateString } from '../utils/today';
import { playDing } from '../utils/sound';
import { pausePomodoroIfRunningForTask } from './usePomodoros';

const MAX_FOCUS_TASKS_PER_DAY = 3;
const FOCUS_XP_MULTIPLIER = 2;

export interface NewTaskInput {
  title: string;
  projectId: string | null;
  parentTaskId: string | null;
  xp: number;
  eternas: number;
  status: TaskStatus;
}

export function useTasks(): {
  tasks: Task[];
  addTask: (input: NewTaskInput) => void;
  updateTask: (id: string, patch: Partial<NewTaskInput>) => void;
  startTask: (id: string) => void;
  completeTask: (id: string) => void;
  cancelTask: (id: string) => void;
  deleteTask: (id: string) => void;
  toggleFocus: (id: string) => void;
} {
  const [tasks, setTasks] = tasksStore.useStore();

  function addTask(input: NewTaskInput) {
    const task: Task = {
      id: generateId(),
      title: input.title,
      projectId: input.projectId,
      parentTaskId: input.parentTaskId,
      status: input.status,
      xp: input.xp,
      eternas: input.eternas,
      createdAt: new Date().toISOString(),
      completedAt: null,
      focusDate: null,
    };
    setTasks((prev) => [...prev, task]);
  }

  function updateTask(id: string, patch: Partial<NewTaskInput>) {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }

  function startTask(id: string) {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status: 'in_progress' } : t)));
  }

  function completeTask(id: string) {
    const task = tasks.find((t) => t.id === id);
    if (!task || task.status === 'done') return;

    const isFocusedToday = task.focusDate === getTodayDateString();
    const multiplier = isFocusedToday ? FOCUS_XP_MULTIPLIER : 1;
    const awardedXp = task.xp * multiplier;
    const awardedEternas = task.eternas * multiplier;

    const completedAt = new Date().toISOString();
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status: 'done', completedAt } : t)));
    pausePomodoroIfRunningForTask(id);

    characterStore.set((prev) => ({
      totalXp: prev.totalXp + awardedXp,
      eternas: prev.eternas + awardedEternas,
    }));

    historyStore.set((prev) => [
      {
        id: generateId(),
        type: 'task_done',
        label: isFocusedToday ? `${task.title} (×${FOCUS_XP_MULTIPLIER} за топ дня)` : task.title,
        xpDelta: awardedXp,
        eternasDelta: awardedEternas,
        createdAt: completedAt,
      },
      ...prev,
    ]);

    triggerXpPulse();
    playDing();
    pushToast(
      isFocusedToday
        ? `⭐ ×${FOCUS_XP_MULTIPLIER} +${awardedXp} XP · +${awardedEternas} ✦`
        : `+${awardedXp} XP · +${awardedEternas} ✦`,
    );
  }

  function deleteTask(id: string) {
    pausePomodoroIfRunningForTask(id);
    setTasks((prev) =>
      prev.filter((t) => t.id !== id).map((t) => (t.parentTaskId === id ? { ...t, parentTaskId: null } : t)),
    );
  }

  function cancelTask(id: string) {
    const task = tasks.find((t) => t.id === id);
    if (!task || task.status === 'cancelled' || task.status === 'done') return;

    pausePomodoroIfRunningForTask(id);
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status: 'cancelled' } : t)));

    historyStore.set((prev) => [
      {
        id: generateId(),
        type: 'task_cancelled',
        label: task.title,
        xpDelta: 0,
        eternasDelta: 0,
        createdAt: new Date().toISOString(),
      },
      ...prev,
    ]);
  }

  function toggleFocus(id: string) {
    const today = getTodayDateString();
    const task = tasks.find((t) => t.id === id);
    if (!task) return;

    const isFocused = task.focusDate === today;
    if (isFocused) {
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, focusDate: null } : t)));
      return;
    }

    const focusedCount = tasks.filter((t) => t.focusDate === today).length;
    if (focusedCount >= MAX_FOCUS_TASKS_PER_DAY) {
      pushToast('Уже выбрано 3 задачи на сегодня — снимите отметку с одной, чтобы выбрать другую', 'error');
      return;
    }

    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, focusDate: today } : t)));
  }

  return { tasks, addTask, updateTask, startTask, completeTask, cancelTask, deleteTask, toggleFocus };
}
