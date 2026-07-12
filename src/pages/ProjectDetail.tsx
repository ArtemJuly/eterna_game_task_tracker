import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useProjects } from '../hooks/useProjects';
import { useTasks } from '../hooks/useTasks';
import { useConfirm } from '../hooks/useConfirm';
import type { Project, Task, TaskStatus } from '../types';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import ProgressBar from '../components/ui/ProgressBar';
import ProjectModal from '../components/ProjectModal';
import PomodoroTimer from '../components/PomodoroTimer';
import TodayFocusButton from '../components/TodayFocusButton';
import { getTodayDateString } from '../utils/today';

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
  const { projects, updateProject, deleteProject, completeProject } = useProjects();
  const { tasks, startTask, completeTask, cancelTask, deleteTask, toggleFocus } = useTasks();
  const { confirm, dialog } = useConfirm();
  const [editModalOpen, setEditModalOpen] = useState(false);
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

  const projectTasks = tasks
    .filter((t) => t.projectId === project.id)
    .sort((a, b) => {
      const aFocused = a.focusDate === today ? 1 : 0;
      const bFocused = b.focusDate === today ? 1 : 0;
      if (aFocused !== bFocused) return bFocused - aFocused;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  const active = projectTasks.filter((t) => t.status !== 'cancelled');
  const done = active.filter((t) => t.status === 'done').length;
  const total = active.length;
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);

  const projectTaskIds = new Set(projectTasks.map((t) => t.id));
  const topLevelTasks = projectTasks.filter((t) => !t.parentTaskId || !projectTaskIds.has(t.parentTaskId));

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

  function renderRow(task: Task) {
    const isTerminal = task.status === 'done' || task.status === 'cancelled';
    const isFocused = task.focusDate === today;
    const children = tasks.filter((t) => t.parentTaskId === task.id && t.status !== 'cancelled');
    const doneChildren = children.filter((t) => t.status === 'done').length;

    return (
      <div
        key={task.id}
        className={`flex items-center gap-3 rounded-lg border px-4 py-3 ${
          task.status === 'cancelled' ? 'opacity-60' : ''
        } ${isFocused ? 'border-accent-xp/50 bg-accent-xp/[0.04]' : 'border-border bg-surface'}`}
      >
        <TodayFocusButton active={isFocused} onClick={() => toggleFocus(task.id)} />
        <div className="flex flex-1 flex-col gap-1.5">
          <div className={`font-medium ${isTerminal ? 'text-text-muted line-through' : 'text-text-primary'}`}>
            {task.title}
          </div>
          <div className="flex items-center gap-2">
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
            <Button variant="danger" onClick={() => handleCancelTask(task)}>
              Отменить
            </Button>
          )}
          <Button variant="ghost" onClick={() => handleDeleteTask(task)}>
            Удалить
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Link to="/projects" className="text-sm text-accent-xp hover:underline">
        ← Все проекты
      </Link>

      <div className="rounded-lg border border-border bg-surface p-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1
                className={`text-2xl font-bold ${
                  project.status === 'done' ? 'text-text-muted line-through' : 'text-text-primary'
                }`}
              >
                {project.title}
              </h1>
              <Badge tone={project.status === 'done' ? 'success' : 'muted'}>
                {project.status === 'done' ? 'Завершён' : 'Активен'}
              </Badge>
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

      <div className="flex flex-col gap-2">
        {topLevelTasks.length === 0 ? (
          <div className="rounded-lg border border-border bg-surface p-4 text-sm text-text-muted">
            В этом проекте пока нет задач
          </div>
        ) : (
          topLevelTasks.map((task) => {
            const children = projectTasks.filter((t) => t.parentTaskId === task.id);
            return (
              <div key={task.id} className="flex flex-col gap-2">
                {renderRow(task)}
                {children.length > 0 && !collapsed.has(task.id) && (
                  <div className="ml-10 flex flex-col gap-2 border-l border-border pl-4">
                    {children.map((child) => renderRow(child))}
                  </div>
                )}
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
      {dialog}
    </div>
  );
}
