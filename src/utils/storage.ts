export const STORAGE_KEYS = {
  character: 'eterna_character',
  tasks: 'eterna_tasks',
  projects: 'eterna_projects',
  rewards: 'eterna_rewards',
  history: 'eterna_history',
  pomodoros: 'eterna_pomodoros',
  activePomodoro: 'eterna_active_pomodoro',
  settings: 'eterna_settings',
  tracks: 'eterna_tracks',
  goalNodes: 'eterna_goal_nodes',
  dayPlan: 'eterna_day_plan',
  weekSprint: 'eterna_week_sprint',
} as const;

export function readStorage<T>(key: string, fallback: T): T {
  const raw = localStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeStorage<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}
