import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useGoalMap } from '../hooks/useGoalMap';
import type { NewGoalNodeInput } from '../hooks/useGoalMap';
import { useProjects } from '../hooks/useProjects';
import { useTracks } from '../hooks/useTracks';
import { useTasks } from '../hooks/useTasks';
import { usePomodoros } from '../hooks/usePomodoros';
import { useConfirm } from '../hooks/useConfirm';
import type { GoalNode } from '../types';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import GoalNodeModal from '../components/GoalNodeModal';
import { getStageStats } from '../utils/trackStats';

const TYPE_ICON: Record<GoalNode['type'], string> = {
  goal: '💭',
  project: '📁',
  track: '🧭',
  trackStage: '🧭',
  task: '✅',
};

const TYPE_TONE: Record<GoalNode['type'], 'default' | 'xp' | 'eternas'> = {
  goal: 'default',
  project: 'eternas',
  track: 'xp',
  trackStage: 'xp',
  task: 'default',
};

type ColorVariant = 'gold' | 'green' | 'gray' | null;

const HIGHLIGHT_CLASSES: Record<'gold' | 'green' | 'gray', string> = {
  gold: 'border-accent-eternas/50 bg-accent-eternas/[0.06]',
  green: 'border-success/50 bg-success/[0.06]',
  gray: 'border-border bg-overlay/[0.02] opacity-60',
};

interface ResolvedNode {
  label: string;
  linkTo: string | null;
  priorityRank: number | null;
  colorVariant: ColorVariant;
  statusBadge: { text: string; tone: 'success' | 'muted' | 'eternas' } | null;
}

export default function GoalMap() {
  const { nodes, addNode, renameNode, deleteNode } = useGoalMap();
  const { projects } = useProjects();
  const { tracks } = useTracks();
  const { tasks } = useTasks();
  const { sessions } = usePomodoros();
  const { confirm, dialog } = useConfirm();
  const [modalOpen, setModalOpen] = useState(false);
  const [modalParentId, setModalParentId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const roots = nodes.filter((n) => n.parentId === null);

  function resolveNode(node: GoalNode): ResolvedNode {
    if (node.type === 'goal') {
      return { label: node.title || 'Без названия', linkTo: null, priorityRank: null, colorVariant: null, statusBadge: null };
    }
    if (node.type === 'project') {
      const project = projects.find((p) => p.id === node.projectId);
      if (!project) {
        return { label: 'Проект удалён', linkTo: null, priorityRank: null, colorVariant: null, statusBadge: null };
      }
      const priorityRank = projects.findIndex((p) => p.id === project.id) + 1;
      const isTopPriority = priorityRank === 1;
      return {
        label: project.title,
        linkTo: `/projects/${project.id}`,
        priorityRank,
        colorVariant: isTopPriority ? 'gold' : project.isActive ? 'green' : 'gray',
        statusBadge: isTopPriority
          ? null
          : { text: project.isActive ? '⚡ Активен' : '💤 Неактивен', tone: project.isActive ? 'success' : 'muted' },
      };
    }
    if (node.type === 'track') {
      const track = tracks.find((t) => t.id === node.trackId);
      return {
        label: track?.title ?? 'Трек удалён',
        linkTo: track ? `/tracks/${track.id}` : null,
        priorityRank: null,
        colorVariant: null,
        statusBadge: null,
      };
    }
    if (node.type === 'trackStage') {
      const track = tracks.find((t) => t.id === node.trackId);
      const stage = track?.stages.find((s) => s.id === node.stageId);
      return {
        label: track && stage ? `${track.title} → ${stage.title}` : 'Этап удалён',
        linkTo: track ? `/tracks/${track.id}` : null,
        priorityRank: null,
        colorVariant: null,
        statusBadge: null,
      };
    }
    const task = tasks.find((t) => t.id === node.taskId);
    if (!task) {
      return { label: 'Задача удалена', linkTo: null, priorityRank: null, colorVariant: null, statusBadge: null };
    }
    const isActiveTask = task.status === 'planned' || task.status === 'in_progress';
    return {
      label: task.title,
      linkTo: `/tasks/${task.id}`,
      priorityRank: null,
      colorVariant: isActiveTask ? 'gold' : null,
      statusBadge: isActiveTask ? { text: '⚡ Активна', tone: 'eternas' } : null,
    };
  }

  function getOwnCompletedCount(node: GoalNode): number {
    if (node.type === 'project') {
      const project = projects.find((p) => p.id === node.projectId);
      if (!project) return 0;
      return tasks.filter((t) => t.projectId === project.id && t.status === 'done').length;
    }
    if (node.type === 'track') {
      const track = tracks.find((t) => t.id === node.trackId);
      if (!track) return 0;
      return track.stages.reduce(
        (sum, s) => sum + getStageStats(tasks, sessions, track.id, s.id, s.projectId).completedTasks,
        0,
      );
    }
    if (node.type === 'trackStage') {
      const track = tracks.find((t) => t.id === node.trackId);
      const stage = track?.stages.find((s) => s.id === node.stageId);
      if (!track || !stage) return 0;
      return getStageStats(tasks, sessions, track.id, stage.id, stage.projectId).completedTasks;
    }
    if (node.type === 'task') {
      const task = tasks.find((t) => t.id === node.taskId);
      if (!task) return 0;
      return task.recurrenceIntervalDays !== null ? task.streakCount : task.status === 'done' ? 1 : 0;
    }
    return 0;
  }

  function getTotalCompletedCount(node: GoalNode): number {
    const children = nodes.filter((n) => n.parentId === node.id);
    return getOwnCompletedCount(node) + children.reduce((sum, child) => sum + getTotalCompletedCount(child), 0);
  }

  function openAddModal(parentId: string | null) {
    setModalParentId(parentId);
    setModalOpen(true);
  }

  function handleAddSubmit(input: NewGoalNodeInput) {
    addNode(input);
  }

  function startRename(node: GoalNode) {
    setRenamingId(node.id);
    setRenameValue(node.title);
  }

  function commitRename(id: string) {
    if (renameValue.trim()) renameNode(id, renameValue.trim());
    setRenamingId(null);
  }

  function handleDelete(node: GoalNode) {
    const childCount = nodes.filter((n) => n.parentId === node.id).length;
    confirm({
      title: 'Удалить узел?',
      message:
        childCount > 0
          ? `Узел будет удалён. Его ${childCount} дочерних узлов не удалятся, а поднимутся на уровень выше.`
          : 'Узел будет удалён без возможности восстановления.',
      confirmLabel: 'Удалить',
      danger: true,
      onConfirm: () => deleteNode(node.id),
    });
  }

  function renderNode(node: GoalNode) {
    const children = nodes.filter((n) => n.parentId === node.id);
    const { label, linkTo, priorityRank, colorVariant, statusBadge } = resolveNode(node);
    const isRenaming = renamingId === node.id;
    const isTopPriority = priorityRank === 1;
    const completedCount = getTotalCompletedCount(node);

    return (
      <li key={node.id}>
        <div
          className={`inline-flex flex-wrap items-center gap-2 rounded-lg border px-3 py-1.5 ${
            colorVariant ? HIGHLIGHT_CLASSES[colorVariant] : 'border-border bg-surface'
          }`}
        >
          <Badge tone={TYPE_TONE[node.type]}>{TYPE_ICON[node.type]}</Badge>
          {isTopPriority && <Badge tone="eternas">🏆 Приоритет #1</Badge>}
          {!isTopPriority && priorityRank !== null && <Badge tone="muted">#{priorityRank}</Badge>}
          {statusBadge && <Badge tone={statusBadge.tone}>{statusBadge.text}</Badge>}
          {isRenaming ? (
            <input
              autoFocus
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={() => commitRename(node.id)}
              onKeyDown={(e) => e.key === 'Enter' && commitRename(node.id)}
              className="rounded border border-border bg-bg px-2 py-0.5 text-sm text-text-primary outline-none focus:border-accent-xp"
            />
          ) : linkTo ? (
            <Link to={linkTo} className="text-sm font-medium text-text-primary hover:underline">
              {label}
            </Link>
          ) : (
            <span className="text-sm font-medium text-text-primary">{label}</span>
          )}
          {completedCount > 0 && <Badge tone="success">✓ {completedCount}</Badge>}
          <Button variant="ghost" onClick={() => openAddModal(node.id)}>
            + Добавить
          </Button>
          {node.type === 'goal' && (
            <Button variant="ghost" onClick={() => startRename(node)}>
              Переименовать
            </Button>
          )}
          <Button variant="ghost" onClick={() => handleDelete(node)}>
            Удалить
          </Button>
        </div>
        {children.length > 0 && <ul>{children.map((child) => renderNode(child))}</ul>}
      </li>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">Карта целей</h1>
        <Button variant="primary" onClick={() => openAddModal(null)}>
          + Добавить цель
        </Button>
      </div>
      <p className="text-sm text-text-muted">
        Постройте дерево от глобальной цели к конкретным шагам — трекам, проектам или пока ещё ничем не подкреплённым
        идеям.
      </p>

      {roots.length === 0 ? (
        <div className="rounded-lg border border-border bg-surface p-4 text-sm text-text-muted">
          Пока пусто. Добавьте первую цель — например, «Стать свободным».
        </div>
      ) : (
        <div className="overflow-x-auto">
          <ul className="goal-tree">{roots.map((node) => renderNode(node))}</ul>
        </div>
      )}

      <GoalNodeModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleAddSubmit}
        parentId={modalParentId}
      />
      {dialog}
    </div>
  );
}
