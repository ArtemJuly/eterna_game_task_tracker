import { goalNodesStore } from './stores';
import type { GoalNode, GoalNodeType } from '../types';
import { generateId } from '../utils/ids';

export interface NewGoalNodeInput {
  type: GoalNodeType;
  parentId: string | null;
  title: string;
  projectId: string | null;
  trackId: string | null;
  stageId: string | null;
  taskId: string | null;
}

function normalizeNode(n: GoalNode): GoalNode {
  return {
    ...n,
    title: n.title ?? '',
    projectId: n.projectId ?? null,
    trackId: n.trackId ?? null,
    stageId: n.stageId ?? null,
    taskId: n.taskId ?? null,
    parentId: n.parentId ?? null,
  };
}

export function useGoalMap(): {
  nodes: GoalNode[];
  addNode: (input: NewGoalNodeInput) => void;
  renameNode: (id: string, title: string) => void;
  deleteNode: (id: string) => void;
} {
  const [rawNodes, setNodes] = goalNodesStore.useStore();
  const nodes = rawNodes.map(normalizeNode);

  function addNode(input: NewGoalNodeInput) {
    const node: GoalNode = {
      id: generateId(),
      type: input.type,
      parentId: input.parentId,
      title: input.title,
      projectId: input.projectId,
      trackId: input.trackId,
      stageId: input.stageId,
      taskId: input.taskId,
      createdAt: new Date().toISOString(),
    };
    setNodes((prev) => [...prev, node]);
  }

  function renameNode(id: string, title: string) {
    setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, title } : n)));
  }

  function deleteNode(id: string) {
    setNodes((prev) => {
      const target = prev.find((n) => n.id === id);
      if (!target) return prev;
      return prev.filter((n) => n.id !== id).map((n) => (n.parentId === id ? { ...n, parentId: target.parentId } : n));
    });
  }

  return { nodes, addNode, renameNode, deleteNode };
}
