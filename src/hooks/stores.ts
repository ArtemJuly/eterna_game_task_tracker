import type {
  ActivePomodoro,
  Character,
  HistoryEntry,
  PomodoroSession,
  Project,
  Reward,
  Settings,
  Task,
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
});
