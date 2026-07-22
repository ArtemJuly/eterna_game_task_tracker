import type { Project, Task } from '../types';

export const FOCUS_XP_MULTIPLIER = 2;
export const SPRINT_XP_MULTIPLIER = 1.2;

export function isSprintTask(task: Task, projects: Project[]): boolean {
  if (!task.projectId) return false;
  const project = projects.find((p) => p.id === task.projectId);
  return project?.isSprint ?? false;
}

export function getTaskRewardMultiplier(task: Task, projects: Project[], today: string): number {
  let multiplier = 1;
  if (task.focusDate === today) multiplier *= FOCUS_XP_MULTIPLIER;
  if (isSprintTask(task, projects)) multiplier *= SPRINT_XP_MULTIPLIER;
  return multiplier;
}

export function formatMultiplier(multiplier: number): string {
  return Number.isInteger(multiplier) ? String(multiplier) : multiplier.toFixed(1);
}

export function getMultiplierIcon(task: Task, projects: Project[], today: string): string {
  const icons = [];
  if (task.focusDate === today) icons.push('⭐');
  if (isSprintTask(task, projects)) icons.push('🚀');
  return icons.join('');
}
