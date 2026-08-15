export interface Character {
  totalXp: number;
  eternas: number;
}

export type TaskStatus = 'planned' | 'in_progress' | 'done' | 'cancelled';

export interface TrackLink {
  trackId: string;
  stageId: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  projectId: string | null;
  parentTaskId: string | null;
  status: TaskStatus;
  xp: number;
  eternas: number;
  createdAt: string;
  completedAt: string | null;
  focusDate: string | null;
  recurrenceIntervalDays: number | null;
  nextDueDate: string | null;
  streakCount: number;
  trackLinks: TrackLink[];
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
  isSprint: boolean;
  isActive: boolean;
  priority: number;
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
  taskId: string | null;
  projectId: string | null;
  startedAt: string;
  endedAt: string;
  durationMinutes: number;
  status: PomodoroStatus;
}

export type ActivePomodoroPhase = 'running' | 'paused';

export interface ActivePomodoro {
  taskId: string | null;
  projectId: string | null;
  durationMinutes: number;
  status: ActivePomodoroPhase;
  startedAt: string;
  endsAt: string | null;
  remainingMs: number | null;
}

export type ThemeName = 'dark' | 'black-gold' | 'white-gold';

export interface Settings {
  pomodoroDurationMinutes: number;
  pomodoroBonusXp: number;
  pomodoroBonusEternas: number;
  streakBonusStepXp: number;
  streakBonusStepEternas: number;
  theme: ThemeName;
  aiApiKey: string;
}

export interface TrackStage {
  id: string;
  title: string;
  description: string;
  xp: number;
  level: number;
  projectId: string | null;
}

export type TrackStatus = 'active' | 'done';

export interface Track {
  id: string;
  title: string;
  goal: string;
  createdAt: string;
  stages: TrackStage[];
  currentStageIndex: number;
  status: TrackStatus;
  completedAt: string | null;
}
