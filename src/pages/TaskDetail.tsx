import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTasks } from '../hooks/useTasks';
import type { NewTaskInput } from '../hooks/useTasks';
import { useProjects } from '../hooks/useProjects';
import { useConfirm } from '../hooks/useConfirm';
import type { Task } from '../types';
import { getAncestorChain, getDirectChildren } from '../utils/taskTree';
import { getTodayDateString } from '../utils/today';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import ProgressBar from '../components/ui/ProgressBar';
import PomodoroTimer from '../components/PomodoroTimer';
import TodayFocusButton from '../components/TodayFocusButton';
import TaskModal from '../components/TaskModal';
import TaskStatusSelect from '../components/TaskStatusSelect';
import TaskDueDateControl from '../components/TaskDueDateControl';
import { formatMultiplier, getMultiplierIcon, getTaskRewardMultiplier } from '../utils/taskRewards';
import { getStreakStars, isTaskOverdue } from '../utils/recurrence';

export default function TaskDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { tasks, addTask, updateTask, startTask, completeTask, cancelTask, setTaskStatus, deleteTask, toggleFocus } =
    useTasks();
  const { projects } = useProjects();
  const { confirm, dialog } = useConfirm();
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [subtaskModalOpen, setSubtaskModalOpen] = useState(false);
  const [editingChild, setEditingChild] = useState<Task | null>(null);
  const [descriptionDraft, setDescriptionDraft] = useState('');
  const today = getTodayDateString();

  const foundTask = tasks.find((t) => t.id === id);

  useEffect(() => {
    setDescriptionDraft(foundTask?.description ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [foundTask?.id]);

  if (!foundTask) {
    return (
      <div className="flex flex-col gap-4">
        <Link to="/tasks" className="text-sm text-accent-xp hover:underline">
          ← Все задачи
        </Link>
        <div className="rounded-lg border border-border bg-surface p-4 text-sm text-text-muted">
          Задача не найдена
        </div>
      </div>
    );
  }

  const task: Task = foundTask;
  const project = task.projectId ? projects.find((p) => p.id === task.projectId) : undefined;
  const ancestors = getAncestorChain(tasks, task.id);
  const children = getDirectChildren(tasks, task.id).sort((a, b) => {
    const aFocused = a.focusDate === today ? 1 : 0;
    const bFocused = b.focusDate === today ? 1 : 0;
    if (aFocused !== bFocused) return bFocused - aFocused;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
  const activeChildren = children.filter((t) => t.status !== 'cancelled');
  const doneChildren = activeChildren.filter((t) => t.status === 'done').length;
  const totalChildren = activeChildren.length;
  const percent = totalChildren === 0 ? 0 : Math.round((doneChildren / totalChildren) * 100);

  const backTo = task.parentTaskId ? `/tasks/${task.parentTaskId}` : project ? `/projects/${project.id}` : '/tasks';
  const backLabel = task.parentTaskId ? '← Назад' : project ? `← ${project.title}` : '← Все задачи';

  const isTerminal = task.status === 'done' || task.status === 'cancelled';
  const isFocused = task.focusDate === today;
  const rewardMultiplier = getTaskRewardMultiplier(task, projects, today);
  const multiplierIcon = getMultiplierIcon(task, projects, today);

  function handleDescriptionBlur() {
    if (descriptionDraft !== task.description) {
      updateTask(task.id, { description: descriptionDraft });
    }
  }

  function handleCancelSelf() {
    confirm({
      title: 'Отменить задачу?',
      message: `«${task.title}» будет помечена как отменённая. XP и этерны за неё не начислятся.`,
      confirmLabel: 'Отменить задачу',
      danger: true,
      onConfirm: () => cancelTask(task.id),
    });
  }

  function handleDeleteSelf() {
    const childCount = children.length;
    confirm({
      title: 'Удалить задачу?',
      message:
        childCount > 0
          ? `«${task.title}» будет удалена без возможности восстановления. Её ${childCount} подзадач(и) не удалятся, а перейдут на уровень выше.`
          : `«${task.title}» будет удалена без возможности восстановления.`,
      confirmLabel: 'Удалить',
      danger: true,
      onConfirm: () => {
        deleteTask(task.id);
        navigate(backTo);
      },
    });
  }

  function openCreateSubtask() {
    setEditingChild(null);
    setSubtaskModalOpen(true);
  }

  function openEditChild(child: Task) {
    setEditingChild(child);
    setSubtaskModalOpen(true);
  }

  function handleSubtaskSubmit(input: NewTaskInput) {
    if (editingChild) {
      updateTask(editingChild.id, input);
    } else {
      addTask(input);
    }
  }

  function handleCancelChild(child: Task) {
    confirm({
      title: 'Отменить задачу?',
      message: `«${child.title}» будет помечена как отменённая. XP и этерны за неё не начислятся.`,
      confirmLabel: 'Отменить задачу',
      danger: true,
      onConfirm: () => cancelTask(child.id),
    });
  }

  function handleDeleteChild(child: Task) {
    const childCount = getDirectChildren(tasks, child.id).length;
    confirm({
      title: 'Удалить задачу?',
      message:
        childCount > 0
          ? `«${child.title}» будет удалена без возможности восстановления. Её ${childCount} подзадач(и) не удалятся, а перейдут на уровень выше.`
          : `«${child.title}» будет удалена без возможности восстановления.`,
      confirmLabel: 'Удалить',
      danger: true,
      onConfirm: () => deleteTask(child.id),
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2 text-sm">
        <Link to={backTo} className="text-accent-xp hover:underline">
          {backLabel}
        </Link>
        {ancestors.length > 0 && (
          <>
            <span className="text-text-muted">/</span>
            {ancestors.map((ancestor) => (
              <span key={ancestor.id} className="flex items-center gap-2">
                <Link to={`/tasks/${ancestor.id}`} className="text-accent-xp hover:underline">
                  {ancestor.title}
                </Link>
                <span className="text-text-muted">/</span>
              </span>
            ))}
          </>
        )}
      </div>

      <div className="rounded-lg border border-border bg-surface p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <TodayFocusButton active={isFocused} onClick={() => toggleFocus(task.id)} />
            <div>
              <div className="flex items-center gap-2">
                <h1 className={`text-2xl font-bold ${isTerminal ? 'text-text-muted line-through' : 'text-text-primary'}`}>
                  {task.title}
                </h1>
                <TaskStatusSelect status={task.status} onChange={(status) => setTaskStatus(task.id, status)} />
              </div>
              <div className="mt-2 flex items-center gap-2">
                {project && <Badge tone="default">{project.title}</Badge>}
                <TaskDueDateControl task={task} onUpdate={(patch) => updateTask(task.id, patch)} />
                {task.streakCount > 0 && <Badge tone="eternas">🔥 ×{task.streakCount}</Badge>}
                {getStreakStars(task.streakCount) > 0 && (
                  <Badge tone="xp">{'⭐'.repeat(getStreakStars(task.streakCount))}</Badge>
                )}
                {isTaskOverdue(task, today) && <Badge tone="danger">Просрочено</Badge>}
                {rewardMultiplier !== 1 && !isTerminal ? (
                  <span className="text-sm text-accent-xp tabular-nums">
                    {multiplierIcon}×{formatMultiplier(rewardMultiplier)} {Math.round(task.xp * rewardMultiplier)} XP ·{' '}
                    {Math.round(task.eternas * rewardMultiplier)} ✦
                  </span>
                ) : (
                  <span className="text-sm text-text-muted tabular-nums">
                    {task.xp} XP · {task.eternas} ✦
                  </span>
                )}
              </div>
              <div className="mt-2">
                <PomodoroTimer taskId={task.id} active={task.status === 'planned' || task.status === 'in_progress'} />
              </div>
            </div>
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
              <Button variant="danger" onClick={handleCancelSelf}>
                Отменить
              </Button>
            )}
            <Button variant="secondary" onClick={() => setEditModalOpen(true)}>
              Редактировать
            </Button>
            <Button variant="ghost" onClick={handleDeleteSelf}>
              Удалить
            </Button>
          </div>
        </div>

        <div className="mt-4">
          <label className="mb-1 block text-sm text-text-muted">Описание</label>
          <textarea
            value={descriptionDraft}
            onChange={(e) => setDescriptionDraft(e.target.value)}
            onBlur={handleDescriptionBlur}
            rows={3}
            placeholder="Опишите, что нужно сделать..."
            className="w-full rounded border border-border bg-bg px-3 py-2 text-sm text-text-primary outline-none focus:border-accent-xp"
          />
        </div>

        {totalChildren > 0 && (
          <div className="mt-4">
            <div className="mb-1 text-sm text-text-muted tabular-nums">
              {doneChildren} / {totalChildren} подзадач
            </div>
            <ProgressBar percent={percent} />
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-text-primary">Подзадачи</h2>
        <Button variant="primary" onClick={openCreateSubtask}>
          + Новая подзадача
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        {children.length === 0 ? (
          <div className="rounded-lg border border-border bg-surface p-4 text-sm text-text-muted">
            Пока нет подзадач
          </div>
        ) : (
          children.map((child) => {
            const childTerminal = child.status === 'done' || child.status === 'cancelled';
            const childFocused = child.focusDate === today;
            const grandchildren = getDirectChildren(tasks, child.id).filter((t) => t.status !== 'cancelled');
            const doneGrandchildren = grandchildren.filter((t) => t.status === 'done').length;
            const childRewardMultiplier = getTaskRewardMultiplier(child, projects, today);
            const childMultiplierIcon = getMultiplierIcon(child, projects, today);

            return (
              <div
                key={child.id}
                onClick={() => navigate(`/tasks/${child.id}`)}
                className={`group flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 transition-colors hover:bg-overlay/[0.03] ${
                  child.status === 'cancelled' ? 'opacity-60' : ''
                } ${childFocused ? 'border-accent-xp/50 bg-accent-xp/[0.04]' : 'border-border bg-surface'}`}
              >
                <div onClick={(e) => e.stopPropagation()}>
                  <TodayFocusButton active={childFocused} onClick={() => toggleFocus(child.id)} />
                </div>
                <div className="flex flex-1 flex-col gap-1.5">
                  <span
                    className={`font-medium group-hover:underline ${
                      childTerminal ? 'text-text-muted line-through' : 'text-text-primary'
                    }`}
                  >
                    {child.title}
                  </span>
                  <div className="flex items-center gap-2">
                    <TaskStatusSelect status={child.status} onChange={(status) => setTaskStatus(child.id, status)} />
                    <div onClick={(e) => e.stopPropagation()}>
                      <TaskDueDateControl task={child} onUpdate={(patch) => updateTask(child.id, patch)} />
                    </div>
                    {child.streakCount > 0 && <Badge tone="eternas">🔥 ×{child.streakCount}</Badge>}
                    {getStreakStars(child.streakCount) > 0 && (
                      <Badge tone="xp">{'⭐'.repeat(getStreakStars(child.streakCount))}</Badge>
                    )}
                    {isTaskOverdue(child, today) && <Badge tone="danger">Просрочено</Badge>}
                    {childRewardMultiplier !== 1 && !childTerminal ? (
                      <span className="text-sm text-accent-xp tabular-nums">
                        {childMultiplierIcon}×{formatMultiplier(childRewardMultiplier)}{' '}
                        {Math.round(child.xp * childRewardMultiplier)} XP · {Math.round(child.eternas * childRewardMultiplier)} ✦
                      </span>
                    ) : (
                      <span className="text-sm text-text-muted tabular-nums">
                        {child.xp} XP · {child.eternas} ✦
                      </span>
                    )}
                    {grandchildren.length > 0 && (
                      <span className="text-xs text-text-muted tabular-nums">
                        {doneGrandchildren}/{grandchildren.length} подзадач
                      </span>
                    )}
                  </div>
                  <div onClick={(e) => e.stopPropagation()}>
                    <PomodoroTimer taskId={child.id} active={child.status === 'planned' || child.status === 'in_progress'} />
                  </div>
                </div>

                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  {child.status === 'planned' && (
                    <Button variant="secondary" onClick={() => startTask(child.id)}>
                      В работу
                    </Button>
                  )}
                  {(child.status === 'planned' || child.status === 'in_progress') && (
                    <Button variant="primary" onClick={() => completeTask(child.id)}>
                      Выполнить
                    </Button>
                  )}
                  {(child.status === 'planned' || child.status === 'in_progress') && (
                    <Button variant="danger" onClick={() => handleCancelChild(child)}>
                      Отменить
                    </Button>
                  )}
                  <Button variant="secondary" onClick={() => openEditChild(child)}>
                    Редактировать
                  </Button>
                  <Button variant="ghost" onClick={() => handleDeleteChild(child)}>
                    Удалить
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <TaskModal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        onSubmit={(input) => updateTask(task.id, input)}
        initialTask={task}
      />
      <TaskModal
        open={subtaskModalOpen}
        onClose={() => setSubtaskModalOpen(false)}
        onSubmit={handleSubtaskSubmit}
        initialTask={editingChild}
        defaultProjectId={task.projectId}
        defaultParentTaskId={task.id}
      />
      {dialog}
    </div>
  );
}
