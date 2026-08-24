import type { GoalNode } from '../types';

/** Walks up the goal tree from a node to find the nearest ancestor of type "goal". */
export function findEnclosingGoalTitle(nodes: GoalNode[], node: GoalNode | undefined): string | null {
  if (!node) return null;
  let current = nodes.find((n) => n.id === node.parentId);
  while (current) {
    if (current.type === 'goal') return current.title;
    current = nodes.find((n) => n.id === current!.parentId);
  }
  return null;
}
