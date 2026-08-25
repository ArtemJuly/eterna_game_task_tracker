import type {
  ActivePomodoro,
  Character,
  DayPlan,
  GoalNode,
  HistoryEntry,
  PomodoroSession,
  Project,
  Reward,
  Settings,
  Task,
  Track,
  WeekSprint,
} from '../types';
import { STORAGE_KEYS } from '../utils/storage';
import { createStore } from '../utils/store';

export const characterStore = createStore<Character>(STORAGE_KEYS.character, {
  totalXp: 0,
  eternas: 0,
});

export const tasksStore = createStore<Task[]>(STORAGE_KEYS.tasks, []);

export const projectsStore = createStore<Project[]>(STORAGE_KEYS.projects, []);

export const rewardsStore = createStore<Reward[]>(STORAGE_KEYS.rewards, []);

export const historyStore = createStore<HistoryEntry[]>(STORAGE_KEYS.history, []);

export const pomodorosStore = createStore<PomodoroSession[]>(STORAGE_KEYS.pomodoros, []);

export const activePomodoroStore = createStore<ActivePomodoro | null>(STORAGE_KEYS.activePomodoro, null);

export const settingsStore = createStore<Settings>(STORAGE_KEYS.settings, {
  pomodoroDurationMinutes: 25,
  pomodoroBonusXp: 5,
  pomodoroBonusEternas: 5,
  streakBonusStepXp: 5,
  streakBonusStepEternas: 5,
  theme: 'dark',
  aiApiKey: '',
});

export const tracksStore = createStore<Track[]>(STORAGE_KEYS.tracks, []);

export const goalNodesStore = createStore<GoalNode[]>(STORAGE_KEYS.goalNodes, []);

export const dayPlanStore = createStore<DayPlan | null>(STORAGE_KEYS.dayPlan, null);

export const weekSprintStore = createStore<WeekSprint | null>(STORAGE_KEYS.weekSprint, null);

export const projectViewModeStore = createStore<'list' | 'board'>(STORAGE_KEYS.projectViewMode, 'list');
