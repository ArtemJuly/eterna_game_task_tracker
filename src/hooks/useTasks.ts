import {
  characterStore,
  goalNodesStore,
  historyStore,
  projectsStore,
  settingsStore,
  taskBoardColumnsStore,
  tasksStore,
} from './stores';
import type { BoardColumn, Task, TaskStatus, TrackLink } from '../types';
import { generateId } from '../utils/ids';
import { pushToast } from './useToast';
import { triggerXpPulse } from './useXpPulse';
import { addDaysToDateString, getTodayDateString } from '../utils/today';
import { playDing } from '../utils/sound';
import { pausePomodoroIfRunningForTask } from './usePomodoros';
import { formatMultiplier, getMultiplierIcon, getTaskRewardMultiplier, isSprintTask } from '../utils/taskRewards';
import { getStreakBonus, getStreakStars } from '../utils/recurrence';
import { applyTrackXp, getProjectTrackLink } from './useTracks';

const MAX_FOCUS_TASKS_PER_DAY = 3;

export interface NewTaskInput {
  title: string;
  description: string;
  projectId: string | null;
  parentTaskId: string | null;
  xp: number;
  eternas: number;
  status: TaskStatus;
  dueDate: string | null;
  recurrenceIntervalDays: number | null;
  trackLinks: TrackLink[];
  boardColumnId: string | null;
  taskBoardColumnId: string | null;
}

function normalizeTask(t: Task): Task {
  return {
    ...t,
    dueDate: t.dueDate ?? null,
    recurrenceIntervalDays: t.recurrenceIntervalDays ?? null,
    nextDueDate: t.nextDueDate ?? null,
    streakCount: t.streakCount ?? 0,
    trackLinks: t.trackLinks ?? [],
    boardColumnId: t.boardColumnId ?? null,
    taskBoardColumnId: t.taskBoardColumnId ?? null,
  };
}

function getStreakBonusSteps(): { streakBonusStepXp: number; streakBonusStepEternas: number } {
  const settings = settingsStore.getSnapshot();
  return {
    streakBonusStepXp: settings.streakBonusStepXp ?? 5,
    streakBonusStepEternas: settings.streakBonusStepEternas ?? 5,
  };
}

export function useTasks(): {
  tasks: Task[];
  addTask: (input: NewTaskInput) => void;
  updateTask: (id: string, patch: Partial<NewTaskInput>) => void;
  startTask: (id: string) => void;
  completeTask: (id: string) => void;
  cancelTask: (id: string) => void;
  setTaskStatus: (id: string, status: TaskStatus) => void;
  deleteTask: (id: string) => void;
  toggleFocus: (id: string) => void;
  taskBoardColumns: BoardColumn[];
  addTaskBoardColumn: (title: string) => void;
  renameTaskBoardColumn: (id: string, title: string) => void;
  deleteTaskBoardColumn: (id: string) => void;
} {
  const [rawTasks, setTasks] = tasksStore.useStore();
  const tasks = rawTasks.map(normalizeTask);
  const [taskBoardColumns, setTaskBoardColumns] = taskBoardColumnsStore.useStore();

  function addTask(input: NewTaskInput) {
    const today = getTodayDateString();
    const task: Task = {
      id: generateId(),
      title: input.title,
      description: input.description,
      projectId: input.projectId,
      parentTaskId: input.parentTaskId,
      status: input.status,
      xp: input.xp,
      eternas: input.eternas,
      createdAt: new Date().toISOString(),
      completedAt: null,
      focusDate: null,
      dueDate: input.dueDate,
      recurrenceIntervalDays: input.recurrenceIntervalDays,
      nextDueDate: input.recurrenceIntervalDays !== null ? today : null,
      streakCount: 0,
      trackLinks: input.trackLinks,
      boardColumnId: input.boardColumnId,
      taskBoardColumnId: input.taskBoardColumnId,
    };
    setTasks((prev) => [...prev, task]);
  }

  function addTaskBoardColumn(title: string) {
    const column: BoardColumn = { id: generateId(), title };
    setTaskBoardColumns((prev) => [...prev, column]);
  }

  function renameTaskBoardColumn(id: string, title: string) {
    setTaskBoardColumns((prev) => prev.map((c) => (c.id === id ? { ...c, title } : c)));
  }

  function deleteTaskBoardColumn(id: string) {
    setTaskBoardColumns((prev) => prev.filter((c) => c.id !== id));
    setTasks((prev) => prev.map((t) => (t.taskBoardColumnId === id ? { ...t, taskBoardColumnId: null } : t)));
  }

  function updateTask(id: string, patch: Partial<NewTaskInput>) {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        const next = { ...t, ...patch };
        if (patch.recurrenceIntervalDays !== undefined) {
          if (patch.recurrenceIntervalDays === null) {
            next.nextDueDate = null;
            next.streakCount = 0;
          } else if ((t.recurrenceIntervalDays ?? null) === null) {
            next.nextDueDate = t.nextDueDate ?? getTodayDateString();
            next.streakCount = t.streakCount ?? 0;
          }
        }
        return next;
      }),
    );
  }

  function startTask(id: string) {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status: 'in_progress' } : t)));
  }

  function completeTask(id: string) {
    const task = tasks.find((t) => t.id === id);
    if (!task || task.status === 'done') return;

    const today = getTodayDateString();
    const projects = projectsStore.getSnapshot();
    const isFocusedToday = task.focusDate === today;
    const isSprint = isSprintTask(task, projects);
    const multiplier = getTaskRewardMultiplier(task, projects, today);
    const baseXp = Math.round(task.xp * multiplier);
    const baseEternas = Math.round(task.eternas * multiplier);

    const isRecurring = task.recurrenceIntervalDays !== null;
    const wasOnTime = !task.nextDueDate || today <= task.nextDueDate;
    const newStreak = isRecurring ? (wasOnTime ? task.streakCount + 1 : 1) : 0;
    const { streakBonusStepXp, streakBonusStepEternas } = getStreakBonusSteps();
    const streakBonus = isRecurring ? getStreakBonus(newStreak, streakBonusStepXp, streakBonusStepEternas) : { xp: 0, eternas: 0 };

    const awardedXp = baseXp + streakBonus.xp;
    const awardedEternas = baseEternas + streakBonus.eternas;

    const completedAt = new Date().toISOString();
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        if (isRecurring) {
          return {
            ...t,
            status: 'planned',
            focusDate: null,
            streakCount: newStreak,
            nextDueDate: addDaysToDateString(today, task.recurrenceIntervalDays as number),
          };
        }
        return { ...t, status: 'done', completedAt };
      }),
    );
    pausePomodoroIfRunningForTask(id);

    characterStore.set((prev) => ({
      totalXp: prev.totalXp + awardedXp,
      eternas: prev.eternas + awardedEternas,
    }));
    const projectTrackLink = task.projectId ? getProjectTrackLink(task.projectId) : null;
    const hasManualLinkAlready = projectTrackLink
      ? task.trackLinks.some((l) => l.trackId === projectTrackLink.trackId && l.stageId === projectTrackLink.stageId)
      : false;
    const effectiveTrackLinks =
      projectTrackLink && !hasManualLinkAlready ? [...task.trackLinks, projectTrackLink] : task.trackLinks;
    applyTrackXp(effectiveTrackLinks, awardedXp);

    const labelSuffixes: string[] = [];
    if (isFocusedToday) labelSuffixes.push('×2 за топ дня');
    if (isSprint) labelSuffixes.push('×1.2 спринт');
    if (streakBonus.xp > 0 || streakBonus.eternas > 0) labelSuffixes.push(`🔥 серия ×${newStreak}`);
    const label = labelSuffixes.length > 0 ? `${task.title} (${labelSuffixes.join(', ')})` : task.title;

    historyStore.set((prev) => [
      {
        id: generateId(),
        type: 'task_done',
        label,
        xpDelta: awardedXp,
        eternasDelta: awardedEternas,
        createdAt: completedAt,
      },
      ...prev,
    ]);

    triggerXpPulse();
    playDing();
    const icon = getMultiplierIcon(task, projects, today);
    const baseMessage =
      multiplier !== 1
        ? `${icon} ×${formatMultiplier(multiplier)} +${baseXp} XP · +${baseEternas} ✦`
        : `+${baseXp} XP · +${baseEternas} ✦`;
    const bonusMessage =
      streakBonus.xp > 0 || streakBonus.eternas > 0
        ? ` · 🔥 серия ×${newStreak} +${streakBonus.xp} XP · +${streakBonus.eternas} ✦`
        : '';
    pushToast(baseMessage + bonusMessage);

    if (isRecurring) {
      const starsBefore = getStreakStars(task.streakCount);
      const starsAfter = getStreakStars(newStreak);
      if (starsAfter > starsBefore) {
        pushToast(`🌟 Новая веха: серия «${task.title}» ×${newStreak}!`, 'success');
      }
    }
  }

  function deleteTask(id: string) {
    pausePomodoroIfRunningForTask(id);
    const task = tasks.find((t) => t.id === id);
    const newParentId = task?.parentTaskId ?? null;
    setTasks((prev) =>
      prev.filter((t) => t.id !== id).map((t) => (t.parentTaskId === id ? { ...t, parentTaskId: newParentId } : t)),
    );
    goalNodesStore.set((prev) =>
      prev.map((n) =>
        n.type === 'task' && n.taskId === id
          ? { ...n, type: 'goal', title: task?.title ?? 'Задача удалена', taskId: null }
          : n,
      ),
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

  function setTaskStatus(id: string, status: TaskStatus) {
    const task = tasks.find((t) => t.id === id);
    if (!task || task.status === status) return;

    if (status === 'done') {
      completeTask(id);
      return;
    }
    if (status === 'cancelled' && task.status !== 'done') {
      cancelTask(id);
      return;
    }
    // Reward-neutral transitions: reverting to planned/in_progress, or reopening a
    // done/cancelled task. No history/reward changes — those only happen via
    // completeTask/cancelTask above.
    pausePomodoroIfRunningForTask(id);
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));
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

  return {
    tasks,
    addTask,
    updateTask,
    startTask,
    completeTask,
    cancelTask,
    setTaskStatus,
    deleteTask,
    toggleFocus,
    taskBoardColumns,
    addTaskBoardColumn,
    renameTaskBoardColumn,
    deleteTaskBoardColumn,
  };
}
