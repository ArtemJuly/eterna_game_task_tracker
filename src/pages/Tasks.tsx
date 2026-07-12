import { useMemo, useState } from 'react';
import { useTasks } from '../hooks/useTasks';
import { useProjects } from '../hooks/useProjects';
import { useConfirm } from '../hooks/useConfirm';
import type { Task, TaskStatus } from '../types';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import ProgressBar from '../components/ui/ProgressBar';
import TaskModal from '../components/TaskModal';
import PomodoroTimer from '../components/PomodoroTimer';
import TodayFocusButton from '../components/TodayFocusButton';
import { getTodayDateString } from '../utils/today';

type FilterTab = 'all' | TaskStatus;

const TABS: { key: FilterTab; label: string }[] = [
  { key: 'all', label: 'Все' },
  { key: 'planned', label: 'Запланированы' },
  { key: 'in_progress', label: 'В работе' },
  { key: 'done', label: 'Выполнены' },
];

const STATUS_LABEL: Record<TaskStatus, string> = {
  planned: 'Запланирована',
  in_progress: 'В работе',
  done: 'Выполнена',
  cancelled: 'Отменена',
};

const STATUS_TONE: Record<TaskStatus, 'muted' | 'xp' | 'success' | 'danger'> = {
  planned: 'muted',
  in_progress: 'xp',
  done: 'success',
  cancelled: 'danger',
};

export default function Tasks() {
  const { tasks, addTask, updateTask, startTask, completeTask, cancelTask, deleteTask, toggleFocus } = useTasks();
  const { projects } = useProjects();
  const { confirm, dialog } = useConfirm();
  const [tab, setTab] = useState<FilterTab>('all');
  const [projectFilter, setProjectFilter] = useState<string>('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const today = getTodayDateString();

  function toggleCollapsed(id: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  const filtered = useMemo(() => {
    return tasks
      .filter((t) => (tab === 'all' ? t.status !== 'done' : t.status === tab))
      .filter((t) => (projectFilter ? t.projectId === projectFilter : true))
      .sort((a, b) => {
        const aFocused = a.focusDate === today ? 1 : 0;
        const bFocused = b.focusDate === today ? 1 : 0;
        if (aFocused !== bFocused) return bFocused - aFocused;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [tasks, tab, projectFilter, today]);

  const filteredIds = useMemo(() => new Set(filtered.map((t) => t.id)), [filtered]);
  const topLevelRows = filtered.filter((t) => !t.parentTaskId || !filteredIds.has(t.parentTaskId));

  function openCreate() {
    setEditingTask(null);
    setModalOpen(true);
  }

  function openEdit(task: Task) {
    setEditingTask(task);
    setModalOpen(true);
  }

  function handleSubmit(input: {
    title: string;
    projectId: string | null;
    parentTaskId: string | null;
    xp: number;
    eternas: number;
    status: TaskStatus;
  }) {
    if (editingTask) {
      updateTask(editingTask.id, input);
    } else {
      addTask(input);
    }
  }

  function handleCancel(task: Task) {
    confirm({
      title: 'Отменить задачу?',
      message: `«${task.title}» будет помечена как отменённая. XP и этерны за неё не начислятся.`,
      confirmLabel: 'Отменить задачу',
      danger: true,
      onConfirm: () => cancelTask(task.id),
    });
  }

  function handleDelete(task: Task) {
    const childCount = tasks.filter((t) => t.parentTaskId === task.id).length;
    confirm({
      title: 'Удалить задачу?',
      message:
        childCount > 0
          ? `«${task.title}» будет удалена без возможности восстановления. Её ${childCount} подзадач(и) не удалятся, а станут самостоятельными задачами.`
          : `«${task.title}» будет удалена без возможности восстановления.`,
      confirmLabel: 'Удалить',
      danger: true,
      onConfirm: () => deleteTask(task.id),
    });
  }

  function renderRow(task: Task, isSubtask: boolean) {
    const project = projects.find((p) => p.id === task.projectId);
    const isTerminal = task.status === 'done' || task.status === 'cancelled';
    const isFocused = task.focusDate === today;
    const children = tasks.filter((t) => t.parentTaskId === task.id && t.status !== 'cancelled');
    const doneChildren = children.filter((t) => t.status === 'done').length;
    const orphanParent =
      !isSubtask && task.parentTaskId ? tasks.find((t) => t.id === task.parentTaskId) : undefined;

    return (
      <div
        key={task.id}
        className={`flex items-center gap-3 rounded-lg border px-4 py-3 ${
          task.status === 'cancelled' ? 'opacity-60' : ''
        } ${isFocused ? 'border-accent-xp/50 bg-accent-xp/[0.04]' : 'border-border bg-surface'}`}
      >
        <TodayFocusButton active={isFocused} onClick={() => toggleFocus(task.id)} />
        <div className="flex flex-1 flex-col gap-1.5">
          <button
            onClick={() => openEdit(task)}
            className={`text-left font-medium hover:underline ${
              isTerminal ? 'text-text-muted line-through' : 'text-text-primary'
            }`}
          >
            {task.title}
          </button>
          <div className="flex items-center gap-2">
            {project && <Badge tone="default">{project.title}</Badge>}
            {orphanParent && <Badge tone="muted">↳ {orphanParent.title}</Badge>}
            <Badge tone={STATUS_TONE[task.status]}>{STATUS_LABEL[task.status]}</Badge>
            {isFocused && (task.status === 'planned' || task.status === 'in_progress') ? (
              <span className="text-sm text-accent-xp tabular-nums">
                ⭐×2 {task.xp * 2} XP · {task.eternas * 2} ✦
              </span>
            ) : (
              <span className="text-sm text-text-muted tabular-nums">
                {task.xp} XP · {task.eternas} ✦
              </span>
            )}
          </div>
          {children.length > 0 && (
            <button
              onClick={() => toggleCollapsed(task.id)}
              className="flex items-center gap-2 text-left hover:opacity-80"
            >
              <span className="text-xs text-text-muted">{collapsed.has(task.id) ? '▸' : '▾'}</span>
              <span className="text-xs text-text-muted tabular-nums">
                {doneChildren}/{children.length} подзадач
              </span>
              <div className="w-24">
                <ProgressBar percent={Math.round((doneChildren / children.length) * 100)} />
              </div>
            </button>
          )}
          <PomodoroTimer taskId={task.id} active={task.status === 'planned' || task.status === 'in_progress'} />
        </div>

        <div className="flex items-center gap-2">
          {task.status === 'planned' && (
            <Button variant="secondary" onClick={() => startTask(task.id)}>
              В работу
            </Button>
          )}
          {(task.status === 'planned' || task.status === 'in_progress') && (
            <Button variant="primary" onClick={() => completeTask(task.id)}>
              Выполнить
            </Button>
          )}
          {(task.status === 'planned' || task.status === 'in_progress') && (
            <Button variant="danger" onClick={() => handleCancel(task)}>
              Отменить
            </Button>
          )}
          <Button variant="ghost" onClick={() => handleDelete(task)}>
            Удалить
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">Задачи</h1>
        <Button variant="primary" onClick={openCreate}>
          + Новая задача
        </Button>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="flex gap-1 rounded-lg border border-border bg-surface p-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${
                tab === t.key
                  ? 'bg-white/[0.06] text-text-primary'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <select
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
          className="rounded border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-accent-xp"
        >
          <option value="">Все проекты</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-2">
        {topLevelRows.length === 0 ? (
          <div className="rounded-lg border border-border bg-surface p-4 text-sm text-text-muted">
            Задач не найдено
          </div>
        ) : (
          topLevelRows.map((task) => {
            const children = filtered.filter((t) => t.parentTaskId === task.id);
            return (
              <div key={task.id} className="flex flex-col gap-2">
                {renderRow(task, false)}
                {children.length > 0 && !collapsed.has(task.id) && (
                  <div className="ml-10 flex flex-col gap-2 border-l border-border pl-4">
                    {children.map((child) => renderRow(child, true))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <TaskModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        initialTask={editingTask}
      />
      {dialog}
    </div>
  );
}
