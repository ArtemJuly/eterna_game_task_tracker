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
  dueDate: string | null;
  recurrenceIntervalDays: number | null;
  nextDueDate: string | null;
  streakCount: number;
  trackLinks: TrackLink[];
  boardColumnId: string | null;
  taskBoardColumnId: string | null;
}

export type ProjectStatus = 'active' | 'done';

export interface BoardColumn {
  id: string;
  title: string;
}

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
  boardColumns: BoardColumn[];
  showCompletedTasks: boolean;
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
  isEternal: boolean;
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
  projectIds: string[];
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
  priority: number;
}

export interface DayPlanItem {
  taskId: string;
  reason: string;
}

export interface DayPlan {
  date: string;
  items: DayPlanItem[];
}

export interface SprintItem {
  taskId: string;
  reason: string;
}

export interface WeekSprint {
  weekStart: string;
  items: SprintItem[];
}

export type GoalNodeType = 'goal' | 'project' | 'track' | 'trackStage' | 'task';

export interface GoalNode {
  id: string;
  type: GoalNodeType;
  parentId: string | null;
  title: string;
  projectId: string | null;
  trackId: string | null;
  stageId: string | null;
  taskId: string | null;
  createdAt: string;
  pinnedAt: string | null;
  completedAt: string | null;
  isActive: boolean;
}
