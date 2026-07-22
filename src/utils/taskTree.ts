import type { Task } from '../types';

export function isDescendantOf(tasks: Task[], candidateId: string, ancestorId: string): boolean {
  const visited = new Set<string>();
  let current = tasks.find((t) => t.id === candidateId);

  while (current?.parentTaskId && !visited.has(current.id)) {
    visited.add(current.id);
    if (current.parentTaskId === ancestorId) return true;
    current = tasks.find((t) => t.id === current!.parentTaskId);
  }

  return false;
}

export function getAncestorChain(tasks: Task[], taskId: string): Task[] {
  const chain: Task[] = [];
  const visited = new Set<string>();
  let current = tasks.find((t) => t.id === taskId);

  while (current?.parentTaskId && !visited.has(current.id)) {
    visited.add(current.id);
    const parent = tasks.find((t) => t.id === current!.parentTaskId);
    if (!parent) break;
    chain.unshift(parent);
    current = parent;
  }

  return chain;
}

export function getDirectChildren(tasks: Task[], taskId: string): Task[] {
  return tasks.filter((t) => t.parentTaskId === taskId);
}
