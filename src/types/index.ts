export interface Character {
  totalXp: number;
  eternas: number;
}

export type TaskStatus = 'planned' | 'in_progress' | 'done' | 'cancelled';

export interface Task {
  id: string;
  title: string;
  projectId: string | null;
  parentTaskId: string | null;
  status: TaskStatus;
  xp: number;
  eternas: number;
  createdAt: string;
  completedAt: string | null;
  focusDate: string | null;
}

export type ProjectStatus = 'active' | 'done';

export interface Project {
  id: string;
  title: string;
  goal: string;
  deadline: string | null;
  status: ProjectStatus;
  xp: number;
  eternas: number;
  createdAt: string;
  completedAt: string | null;
}

export type RewardStatus = 'wanted' | 'saving' | 'available' | 'purchased' | 'cancelled';

export interface Reward {
  id: string;
  title: string;
  costEternas: number;
  costMoney: number | null;
  status: RewardStatus;
  createdAt: string;
  purchasedAt: string | null;
}

export type HistoryType = 'task_done' | 'reward_purchased' | 'task_cancelled' | 'project_done' | 'pomodoro_completed';

export interface HistoryEntry {
  id: string;
  type: HistoryType;
  label: string;
  xpDelta: number;
  eternasDelta: number;
  createdAt: string;
}

export type PomodoroStatus = 'completed' | 'interrupted';

export interface PomodoroSession {
  id: string;
  taskId: string;
  startedAt: string;
  endedAt: string;
  durationMinutes: number;
  status: PomodoroStatus;
}

export type ActivePomodoroPhase = 'running' | 'paused';

export interface ActivePomodoro {
  taskId: string;
  durationMinutes: number;
  status: ActivePomodoroPhase;
  startedAt: string;
  endsAt: string | null;
  remainingMs: number | null;
}

export interface Settings {
  pomodoroDurationMinutes: number;
  pomodoroBonusXp: number;
  pomodoroBonusEternas: number;
}
