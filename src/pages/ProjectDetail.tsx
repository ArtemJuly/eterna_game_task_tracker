import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useProjects } from '../hooks/useProjects';
import { useTasks } from '../hooks/useTasks';
import type { NewTaskInput } from '../hooks/useTasks';
import { useConfirm } from '../hooks/useConfirm';
import type { Project, Task, TaskStatus } from '../types';
import { getDirectChildren } from '../utils/taskTree';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import ProgressBar from '../components/ui/ProgressBar';
import ProjectModal from '../components/ProjectModal';
import TaskModal from '../components/TaskModal';
import PomodoroTimer from '../components/PomodoroTimer';
import TodayFocusButton from '../components/TodayFocusButton';
import SprintToggleButton from '../components/SprintToggleButton';
import ActiveStatusToggle from '../components/ActiveStatusToggle';
import { getTodayDateString } from '../utils/today';
import { formatMultiplier, getMultiplierIcon, getTaskRewardMultiplier } from '../utils/taskRewards';
import { formatRecurrence, getStreakStars, isTaskOverdue } from '../utils/recurrence';

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

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { projects, updateProject, deleteProject, completeProject, toggleSprint, toggleActive } = useProjects();
  const { tasks, addTask, updateTask, startTask, completeTask, cancelTask, deleteTask, toggleFocus } = useTasks();
  const { confirm, dialog } = useConfirm();
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const today = getTodayDateString();

  const foundProject = projects.find((p) => p.id === id);

  if (!foundProject) {
    return (
      <div className="flex flex-col gap-4">
        <Link to="/projects" className="text-sm text-accent-xp hover:underline">
          ← Все проекты
        </Link>
        <div className="rounded-lg border border-border bg-surface p-4 text-sm text-text-muted">
          Проект не найден
        </div>
      </div>
    );
  }

  const project: Project = foundProject;

  const projectTasks = tasks.filter((t) => t.projectId === project.id);
  const active = projectTasks.filter((t) => t.status !== 'cancelled');
  const done = active.filter((t) => t.status === 'done').length;
  const total = active.length;
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);

  const topLevelTasks = projectTasks
    .filter((t) => t.parentTaskId === null)
    .sort((a, b) => {
      const aFocused = a.focusDate === today ? 1 : 0;
      const bFocused = b.focusDate === today ? 1 : 0;
      if (aFocused !== bFocused) return bFocused - aFocused;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  function handleDeleteProject() {
    confirm({
      title: 'Удалить проект?',
      message: `«${project.title}» будет удалён. Задачи проекта не удалятся, но станут задачами без проекта.`,
      confirmLabel: 'Удалить проект',
      danger: true,
      onConfirm: () => {
        deleteProject(project.id);
        navigate('/projects');
      },
    });
  }

  function openCreateTask() {
    setEditingTask(null);
    setTaskModalOpen(true);
  }

  function openEditTask(task: Task) {
    setEditingTask(task);
    setTaskModalOpen(true);
  }

  function handleTaskSubmit(input: NewTaskInput) {
    if (editingTask) {
      updateTask(editingTask.id, input);
    } else {
      addTask(input);
    }
  }

  function handleCancelTask(task: Task) {
    confirm({
      title: 'Отменить задачу?',
      message: `«${task.title}» будет помечена как отменённая. XP и этерны за неё не начислятся.`,
      confirmLabel: 'Отменить задачу',
      danger: true,
      onConfirm: () => cancelTask(task.id),
    });
  }

  function handleDeleteTask(task: Task) {
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
      <Link to="/projects" className="text-sm text-accent-xp hover:underline">
        ← Все проекты
      </Link>

      <div className={`rounded-lg border border-border bg-surface p-5 ${!project.isActive ? 'opacity-60' : ''}`}>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <SprintToggleButton active={project.isSprint} onClick={() => toggleSprint(project.id)} />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1
                  className={`text-2xl font-bold ${
                    project.status === 'done' ? 'text-text-muted line-through' : 'text-text-primary'
                  }`}
                >
                  {project.title}
                </h1>
                <Badge tone={project.status === 'done' ? 'success' : 'muted'}>
                  {project.status === 'done' ? 'Завершён' : 'В процессе'}
                </Badge>
                {project.isSprint && <Badge tone="eternas">🚀 Спринт ×1.2</Badge>}
                {project.status !== 'done' && (
                  <ActiveStatusToggle active={project.isActive} onClick={() => toggleActive(project.id)} />
                )}
              </div>
              {project.goal && <p className="mt-2 text-sm text-text-muted">{project.goal}</p>}
              {project.deadline && (
                <p className="mt-1 text-xs text-text-muted">
                  До {new Date(project.deadline).toLocaleDateString('ru-RU')}
                </p>
              )}
              <p className="mt-1 text-sm text-text-muted tabular-nums">
                Награда за проект: {project.xp} XP · {project.eternas} ✦
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {project.status === 'active' && (
              <Button variant="primary" onClick={() => completeProject(project.id)}>
                Выполнить проект
              </Button>
            )}
            <Button variant="secondary" onClick={() => setEditModalOpen(true)}>
              Редактировать
            </Button>
            <Button variant="danger" onClick={handleDeleteProject}>
              Удалить
            </Button>
          </div>
        </div>
        <div className="mt-4">
          <div className="mb-1 text-sm text-text-muted tabular-nums">
            {done} / {total} задач
          </div>
          <ProgressBar percent={percent} />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-text-primary">Задачи</h2>
        <Button variant="primary" onClick={openCreateTask}>
          + Новая задача
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        {topLevelTasks.length === 0 ? (
          <div className="rounded-lg border border-border bg-surface p-4 text-sm text-text-muted">
            В этом проекте пока нет задач
          </div>
        ) : (
          topLevelTasks.map((task) => {
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
                className={`group flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 transition-colors hover:bg-white/[0.03] ${
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
                    <Badge tone={STATUS_TONE[task.status]}>{STATUS_LABEL[task.status]}</Badge>
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
                    <PomodoroTimer taskId={task.id} active={task.status === 'planned' || task.status === 'in_progress'} />
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
                    <Button variant="danger" onClick={() => handleCancelTask(task)}>
                      Отменить
                    </Button>
                  )}
                  <Button variant="secondary" onClick={() => openEditTask(task)}>
                    Редактировать
                  </Button>
                  <Button variant="ghost" onClick={() => handleDeleteTask(task)}>
                    Удалить
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <ProjectModal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        onSubmit={(input) => updateProject(project.id, input)}
        initialProject={project}
      />
      <TaskModal
        open={taskModalOpen}
        onClose={() => setTaskModalOpen(false)}
        onSubmit={handleTaskSubmit}
        initialTask={editingTask}
        defaultProjectId={project.id}
      />
      {dialog}
    </div>
  );
}
