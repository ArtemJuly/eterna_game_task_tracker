import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTasks } from '../hooks/useTasks';
import type { NewTaskInput } from '../hooks/useTasks';
import { useProjects } from '../hooks/useProjects';
import { useConfirm } from '../hooks/useConfirm';
import type { Task, TaskStatus } from '../types';
import { getDirectChildren } from '../utils/taskTree';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import TaskModal from '../components/TaskModal';
import TaskIntakeModal from '../components/TaskIntakeModal';
import TaskStatusSelect from '../components/TaskStatusSelect';
import PomodoroTimer from '../components/PomodoroTimer';
import TodayFocusButton from '../components/TodayFocusButton';
import { getTodayDateString } from '../utils/today';
import { formatMultiplier, getMultiplierIcon, getTaskRewardMultiplier } from '../utils/taskRewards';
import { formatRecurrence, getStreakStars, isTaskOverdue } from '../utils/recurrence';

type FilterTab = 'all' | TaskStatus;

const TABS: { key: FilterTab; label: string }[] = [
  { key: 'all', label: 'Все' },
  { key: 'planned', label: 'Запланированы' },
  { key: 'in_progress', label: 'В работе' },
  { key: 'done', label: 'Выполнены' },
];

export default function Tasks() {
  const navigate = useNavigate();
  const { tasks, addTask, updateTask, startTask, completeTask, cancelTask, setTaskStatus, deleteTask, toggleFocus } =
    useTasks();
  const { projects } = useProjects();
  const { confirm, dialog } = useConfirm();
  const [tab, setTab] = useState<FilterTab>('all');
  const [projectFilter, setProjectFilter] = useState<string>('');
  const [modalOpen, setModalOpen] = useState(false);
  const [intakeOpen, setIntakeOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const today = getTodayDateString();

  const filtered = useMemo(() => {
    return tasks
      .filter((t) => (tab === 'all' ? t.status !== 'done' && t.status !== 'cancelled' : t.status === tab))
      .filter((t) => (projectFilter ? t.projectId === projectFilter : true))
      .sort((a, b) => {
        const aFocused = a.focusDate === today ? 1 : 0;
        const bFocused = b.focusDate === today ? 1 : 0;
        if (aFocused !== bFocused) return bFocused - aFocused;
        const aInProgress = a.status === 'in_progress' ? 1 : 0;
        const bInProgress = b.status === 'in_progress' ? 1 : 0;
        if (aInProgress !== bInProgress) return bInProgress - aInProgress;
        const aImportance = a.xp + a.eternas;
        const bImportance = b.xp + b.eternas;
        if (aImportance !== bImportance) return bImportance - aImportance;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [tasks, tab, projectFilter, today]);

  function openCreate() {
    setEditingTask(null);
    setModalOpen(true);
  }

  function openEdit(task: Task) {
    setEditingTask(task);
    setModalOpen(true);
  }

  function handleSubmit(input: NewTaskInput) {
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
    const childCount = getDirectChildren(tasks, task.id).length;
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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">Задачи</h1>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setIntakeOpen(true)}>
            🤖 Добавить список
          </Button>
          <Button variant="primary" onClick={openCreate}>
            + Новая задача
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="flex gap-1 rounded-lg border border-border bg-surface p-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${
                tab === t.key
                  ? 'bg-overlay/[0.06] text-text-primary'
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
        {filtered.length === 0 ? (
          <div className="rounded-lg border border-border bg-surface p-4 text-sm text-text-muted">
            Задач не найдено
          </div>
        ) : (
          filtered.map((task) => {
            const project = projects.find((p) => p.id === task.projectId);
            const parentTask = task.parentTaskId ? tasks.find((t) => t.id === task.parentTaskId) : undefined;
            const isTerminal = task.status === 'done' || task.status === 'cancelled';
            const isFocused = task.focusDate === today;
            const children = getDirectChildren(tasks, task.id).filter((t) => t.status !== 'cancelled');
            const doneChildren = children.filter((t) => t.status === 'done').length;
            const rewardMultiplier = getTaskRewardMultiplier(task, projects, today);
            const multiplierIcon = getMultiplierIcon(task, projects, today);

            return (
              <div
                key={task.id}
                onClick={() => navigate(`/tasks/${task.id}`)}
                className={`group flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 transition-colors hover:bg-overlay/[0.03] ${
                  task.status === 'cancelled' ? 'opacity-60' : ''
                } ${isFocused ? 'border-accent-xp/50 bg-accent-xp/[0.04]' : 'border-border bg-surface'}`}
              >
                <div onClick={(e) => e.stopPropagation()}>
                  <TodayFocusButton active={isFocused} onClick={() => toggleFocus(task.id)} />
                </div>
                <div className="flex flex-1 flex-col gap-1.5">
                  <span
                    className={`font-medium group-hover:underline ${
                      isTerminal ? 'text-text-muted line-through' : 'text-text-primary'
                    }`}
                  >
                    {task.title}
                  </span>
                  <div className="flex items-center gap-2">
                    {project && <Badge tone="default">{project.title}</Badge>}
                    {parentTask && <Badge tone="muted">↳ {parentTask.title}</Badge>}
                    <TaskStatusSelect status={task.status} onChange={(status) => setTaskStatus(task.id, status)} />
                    {task.recurrenceIntervalDays !== null && (
                      <Badge tone="muted">🔁 {formatRecurrence(task.recurrenceIntervalDays)}</Badge>
                    )}
                    {task.streakCount > 0 && <Badge tone="eternas">🔥 ×{task.streakCount}</Badge>}
                    {getStreakStars(task.streakCount) > 0 && (
                      <Badge tone="xp">{'⭐'.repeat(getStreakStars(task.streakCount))}</Badge>
                    )}
                    {isTaskOverdue(task, today) && <Badge tone="danger">Просрочено</Badge>}
                    {rewardMultiplier !== 1 && (task.status === 'planned' || task.status === 'in_progress') ? (
                      <span className="text-sm text-accent-xp tabular-nums">
                        {multiplierIcon}×{formatMultiplier(rewardMultiplier)} {Math.round(task.xp * rewardMultiplier)} XP ·{' '}
                        {Math.round(task.eternas * rewardMultiplier)} ✦
                      </span>
                    ) : (
                      <span className="text-sm text-text-muted tabular-nums">
                        {task.xp} XP · {task.eternas} ✦
                      </span>
                    )}
                    {children.length > 0 && (
                      <span className="text-xs text-text-muted tabular-nums">
                        {doneChildren}/{children.length} подзадач
                      </span>
                    )}
                  </div>
                  <div onClick={(e) => e.stopPropagation()}>
                    <PomodoroTimer
                      taskId={task.id}
                      active={task.status === 'planned' || task.status === 'in_progress'}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
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
                  <Button variant="secondary" onClick={() => openEdit(task)}>
                    Редактировать
                  </Button>
                  <Button variant="ghost" onClick={() => handleDelete(task)}>
                    Удалить
                  </Button>
                </div>
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
      <TaskIntakeModal open={intakeOpen} onClose={() => setIntakeOpen(false)} />
      {dialog}
    </div>
  );
}
