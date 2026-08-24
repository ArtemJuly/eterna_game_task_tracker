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
import TopPriorityToggle from '../components/TopPriorityToggle';
import ActiveStatusToggle from '../components/ActiveStatusToggle';
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

function getAncestorIds(nodeId: string, allNodes: GoalNode[]): string[] {
  const ids: string[] = [];
  let current = allNodes.find((n) => n.id === nodeId);
  while (current && current.parentId !== null) {
    ids.push(current.parentId);
    current = allNodes.find((n) => n.id === current!.parentId);
  }
  return ids;
}

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
  const { nodes, addNode, renameNode, deleteNode, togglePin, toggleNodeDone, toggleNodeActive } = useGoalMap();
  const { projects } = useProjects();
  const { tracks } = useTracks();
  const { tasks } = useTasks();
  const { sessions } = usePomodoros();
  const { confirm, dialog } = useConfirm();
  const [modalOpen, setModalOpen] = useState(false);
  const [modalParentId, setModalParentId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [collapseOverrides, setCollapseOverrides] = useState<Set<string>>(new Set());

  const pinnedOrdered = [...nodes]
    .filter((n) => n.pinnedAt !== null)
    .sort((a, b) => new Date(a.pinnedAt!).getTime() - new Date(b.pinnedAt!).getTime());

  const forceOpenIds = (() => {
    const set = new Set<string>();
    for (const p of nodes.filter((n) => n.pinnedAt !== null)) {
      set.add(p.id);
      getAncestorIds(p.id, nodes).forEach((id) => set.add(id));
    }
    return set;
  })();

  function resolveNode(node: GoalNode): ResolvedNode {
    if (node.type === 'goal') {
      const isDone = node.completedAt !== null;
      const isActive = node.isActive ?? true;
      return {
        label: node.title || 'Без названия',
        linkTo: null,
        priorityRank: null,
        colorVariant: isDone || !isActive ? 'gray' : null,
        statusBadge: isDone
          ? { text: '✓ Выполнено', tone: 'success' }
          : !isActive
            ? { text: '💤 Неактивна', tone: 'muted' }
            : null,
      };
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

  function sortNodes(list: GoalNode[]): GoalNode[] {
    function weight(n: GoalNode): number {
      if (n.pinnedAt !== null) return 0;
      if (forceOpenIds.has(n.id)) return 0.5;
      const { colorVariant } = resolveNode(n);
      if (colorVariant === 'gold') return 1;
      if (colorVariant === 'green') return 2;
      if (colorVariant === 'gray') return 4;
      return 3;
    }
    return [...list].sort((a, b) => {
      const wa = weight(a);
      const wb = weight(b);
      if (wa !== wb) return wa - wb;
      if (a.pinnedAt !== null && b.pinnedAt !== null) {
        return new Date(a.pinnedAt).getTime() - new Date(b.pinnedAt).getTime();
      }
      const ra = resolveNode(a).priorityRank;
      const rb = resolveNode(b).priorityRank;
      if (ra !== null && rb !== null && ra !== rb) return ra - rb;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
  }

  function toggleExpanded(id: string) {
    setCollapseOverrides((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const roots = sortNodes(nodes.filter((n) => n.parentId === null));

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
    const children = sortNodes(nodes.filter((n) => n.parentId === node.id));
    const { label, linkTo, priorityRank, colorVariant, statusBadge } = resolveNode(node);
    const isRenaming = renamingId === node.id;
    const isTopPriority = priorityRank === 1;
    const completedCount = getTotalCompletedCount(node);
    const isPinned = node.pinnedAt !== null;
    const isAncestorOfPinned = !isPinned && forceOpenIds.has(node.id);
    const pinnedRank = isPinned ? pinnedOrdered.findIndex((n) => n.id === node.id) + 1 : null;
    const defaultExpanded = colorVariant !== 'gray' || forceOpenIds.has(node.id);
    const isExpanded = collapseOverrides.has(node.id) ? !defaultExpanded : defaultExpanded;
    const isDoneGoal = node.type === 'goal' && node.completedAt !== null;
    const isGoalActive = node.isActive ?? true;

    return (
      <li key={node.id}>
        <div
          className={`inline-flex flex-wrap items-center gap-2 rounded-lg border px-3 py-1.5 ${
            colorVariant ? HIGHLIGHT_CLASSES[colorVariant] : 'border-border bg-surface'
          } ${isPinned ? 'ring-2 ring-accent-xp/60' : isAncestorOfPinned ? 'ring-1 ring-accent-xp/30' : ''}`}
        >
          {children.length > 0 && (
            <button
              type="button"
              onClick={() => toggleExpanded(node.id)}
              className="text-text-muted hover:text-text-primary"
              title={isExpanded ? 'Свернуть' : 'Развернуть'}
            >
              {isExpanded ? '▾' : '▸'}
            </button>
          )}
          <Badge tone={TYPE_TONE[node.type]}>{TYPE_ICON[node.type]}</Badge>
          {pinnedRank !== null && <Badge tone="xp">🎯 Топ #{pinnedRank}</Badge>}
          {isAncestorOfPinned && <Badge tone="xp">🎯 путь к топ-3</Badge>}
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
            <span
              className={`text-sm font-medium ${isDoneGoal ? 'text-text-muted line-through' : 'text-text-primary'}`}
            >
              {label}
            </span>
          )}
          {completedCount > 0 && <Badge tone="success">✓ {completedCount}</Badge>}
          <TopPriorityToggle active={isPinned} onClick={() => togglePin(node.id)} />
          <Button variant="ghost" onClick={() => openAddModal(node.id)}>
            + Добавить
          </Button>
          {node.type === 'goal' && (
            <>
              <Button variant="ghost" onClick={() => toggleNodeDone(node.id)}>
                {isDoneGoal ? 'Вернуть' : 'Выполнить'}
              </Button>
              {!isDoneGoal && (
                <ActiveStatusToggle active={isGoalActive} onClick={() => toggleNodeActive(node.id)} />
              )}
              <Button variant="ghost" onClick={() => startRename(node)}>
                Переименовать
              </Button>
            </>
          )}
          <Button variant="ghost" onClick={() => handleDelete(node)}>
            Удалить
          </Button>
        </div>
        {children.length > 0 && isExpanded && <ul>{children.map((child) => renderNode(child))}</ul>}
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
        идеям. Отметьте до 3 самых важных направлений кнопкой «🎯 В топ-3» — они поднимутся наверх и останутся
        развёрнутыми, а неактивные ветки свернутся сами.
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
