import { goalNodesStore } from './stores';
import type { GoalNode, GoalNodeType } from '../types';
import { generateId } from '../utils/ids';
import { pushToast } from './useToast';

const MAX_PINNED_NODES = 3;

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
    pinnedAt: n.pinnedAt ?? null,
    completedAt: n.completedAt ?? null,
    isActive: n.isActive ?? true,
  };
}

export function useGoalMap(): {
  nodes: GoalNode[];
  addNode: (input: NewGoalNodeInput) => void;
  renameNode: (id: string, title: string) => void;
  deleteNode: (id: string) => void;
  togglePin: (id: string) => void;
  toggleNodeDone: (id: string) => void;
  toggleNodeActive: (id: string) => void;
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
      pinnedAt: null,
      completedAt: null,
      isActive: true,
    };
    setNodes((prev) => [...prev, node]);
  }

  function toggleNodeDone(id: string) {
    const target = nodes.find((n) => n.id === id);
    if (!target) return;
    const nextCompletedAt = target.completedAt !== null ? null : new Date().toISOString();
    setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, completedAt: nextCompletedAt } : n)));
  }

  function toggleNodeActive(id: string) {
    setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, isActive: !(n.isActive ?? true) } : n)));
  }

  function togglePin(id: string) {
    const target = nodes.find((n) => n.id === id);
    if (!target) return;

    if (target.pinnedAt !== null) {
      setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, pinnedAt: null } : n)));
      return;
    }

    const pinnedCount = nodes.filter((n) => n.pinnedAt !== null).length;
    if (pinnedCount >= MAX_PINNED_NODES) {
      pushToast('Уже выбрано 3 направления — снимите отметку с одного, чтобы выбрать другое', 'error');
      return;
    }

    setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, pinnedAt: new Date().toISOString() } : n)));
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

  return { nodes, addNode, renameNode, deleteNode, togglePin, toggleNodeDone, toggleNodeActive };
}
