import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Project, Task } from '../types';
import { useProjects } from '../hooks/useProjects';
import { useTasks } from '../hooks/useTasks';
import { useConfirm } from '../hooks/useConfirm';
import { getTodayDateString } from '../utils/today';
import { getTaskRewardMultiplier, getMultiplierIcon, formatMultiplier } from '../utils/taskRewards';
import Button from './ui/Button';
import Badge from './ui/Badge';
import TaskDueDateControl from './TaskDueDateControl';
import TaskModal from './TaskModal';
import type { NewTaskInput } from '../hooks/useTasks';

const UNASSIGNED = '__unassigned__';

function TaskDoneCircle({ done, onToggle }: { done: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      title={done ? 'Вернуть в работу' : 'Отметить выполненной'}
      className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold leading-none transition-colors ${
        done
          ? 'border-success bg-success text-white'
          : 'border-text-muted text-transparent hover:border-accent-xp hover:bg-accent-xp/10'
      }`}
    >
      ✓
    </button>
  );
}

interface ProjectBoardProps {
  project: Project;
  tasks: Task[];
  projects: Project[];
}

export default function ProjectBoard({ project, tasks, projects }: ProjectBoardProps) {
  const { addBoardColumn, renameBoardColumn, deleteBoardColumn } = useProjects();
  const { addTask, updateTask, completeTask, setTaskStatus, deleteTask } = useTasks();
  const { confirm, dialog } = useConfirm();
  const today = getTodayDateString();

  const [addingColumn, setAddingColumn] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState('');
  const [renamingColumnId, setRenamingColumnId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [createInColumnId, setCreateInColumnId] = useState<string | null>(null);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverColumnId, setDragOverColumnId] = useState<string | null>(null);

  function moveTaskToColumn(taskId: string, columnId: string) {
    updateTask(taskId, { boardColumnId: columnId === UNASSIGNED ? null : columnId });
  }

  function submitNewColumn(e: React.FormEvent) {
    e.preventDefault();
    if (!newColumnTitle.trim()) return;
    addBoardColumn(project.id, newColumnTitle.trim());
    setNewColumnTitle('');
    setAddingColumn(false);
  }

  function startRename(columnId: string, title: string) {
    setRenamingColumnId(columnId);
    setRenameValue(title);
  }

  function commitRename(columnId: string) {
    if (renameValue.trim()) renameBoardColumn(project.id, columnId, renameValue.trim());
    setRenamingColumnId(null);
  }

  function handleDeleteColumn(columnId: string, title: string) {
    const count = tasks.filter((t) => t.boardColumnId === columnId).length;
    confirm({
      title: 'Удалить колонку?',
      message:
        count > 0
          ? `Колонка «${title}» будет удалена. Её ${count} задач(и) переместятся в «Без колонки».`
          : `Колонка «${title}» будет удалена.`,
      confirmLabel: 'Удалить',
      danger: true,
      onConfirm: () => deleteBoardColumn(project.id, columnId),
    });
  }

  function openCreateTask(columnId: string | null) {
    setCreateInColumnId(columnId);
    setTaskModalOpen(true);
  }

  function handleTaskSubmit(input: NewTaskInput) {
    addTask(input);
  }

  function handleDeleteTask(task: Task) {
    confirm({
      title: 'Удалить задачу?',
      message: `«${task.title}» будет удалена без возможности восстановления.`,
      confirmLabel: 'Удалить',
      danger: true,
      onConfirm: () => deleteTask(task.id),
    });
  }

  function toggleTaskDone(task: Task) {
    if (task.status === 'done') {
      setTaskStatus(task.id, 'planned');
    } else {
      completeTask(task.id);
    }
  }

  const columns = [{ id: UNASSIGNED, title: 'Без колонки' }, ...project.boardColumns];
  const unassignedCount = tasks.filter((t) => t.boardColumnId === null).length;
  const visibleColumns = columns.filter((col) => col.id !== UNASSIGNED || unassignedCount > 0);

  return (
    <div className="overflow-x-auto">
      <div className="flex items-start gap-3 pb-2">
        {visibleColumns.map((col) => {
          const colTasks = tasks.filter((t) =>
            col.id === UNASSIGNED ? t.boardColumnId === null : t.boardColumnId === col.id,
          );
          const isUnassigned = col.id === UNASSIGNED;

          return (
            <div
              key={col.id}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                if (dragOverColumnId !== col.id) setDragOverColumnId(col.id);
              }}
              onDragLeave={(e) => {
                if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                setDragOverColumnId((prev) => (prev === col.id ? null : prev));
              }}
              onDrop={(e) => {
                e.preventDefault();
                const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
                if (taskId) moveTaskToColumn(taskId, col.id);
                setDraggedTaskId(null);
                setDragOverColumnId(null);
              }}
              className={`flex w-72 shrink-0 flex-col gap-2 rounded-lg border p-3 transition-colors ${
                dragOverColumnId === col.id
                  ? 'border-accent-xp bg-accent-xp/[0.06]'
                  : 'border-border bg-surface'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                {renamingColumnId === col.id ? (
                  <input
                    autoFocus
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onBlur={() => commitRename(col.id)}
                    onKeyDown={(e) => e.key === 'Enter' && commitRename(col.id)}
                    className="w-full rounded border border-border bg-bg px-2 py-1 text-sm font-semibold text-text-primary outline-none focus:border-accent-xp"
                  />
                ) : (
                  <span
                    className={`text-sm font-semibold text-text-primary ${!isUnassigned ? 'cursor-pointer hover:underline' : ''}`}
                    onClick={() => !isUnassigned && startRename(col.id, col.title)}
                  >
                    {col.title}
                  </span>
                )}
                <div className="flex items-center gap-1">
                  <span className="text-xs text-text-muted tabular-nums">{colTasks.length}</span>
                  {!isUnassigned && (
                    <button
                      type="button"
                      onClick={() => handleDeleteColumn(col.id, col.title)}
                      className="text-text-muted hover:text-danger"
                      title="Удалить колонку"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                {colTasks.map((task) => {
                  const isTerminal = task.status === 'done' || task.status === 'cancelled';
                  const rewardMultiplier = getTaskRewardMultiplier(task, projects, today);
                  const multiplierIcon = getMultiplierIcon(task, projects, today);

                  return (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={(e) => {
                        setDraggedTaskId(task.id);
                        e.dataTransfer.effectAllowed = 'move';
                        e.dataTransfer.setData('text/plain', task.id);
                      }}
                      onDragEnd={() => {
                        setDraggedTaskId(null);
                        setDragOverColumnId(null);
                      }}
                      className={`flex cursor-grab flex-col gap-1.5 rounded-lg border border-border bg-bg p-2.5 active:cursor-grabbing ${
                        draggedTaskId === task.id ? 'opacity-40' : ''
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <TaskDoneCircle done={task.status === 'done'} onToggle={() => toggleTaskDone(task)} />
                        <Link
                          to={`/tasks/${task.id}`}
                          className={`flex-1 text-sm font-medium hover:underline ${
                            isTerminal ? 'text-text-muted line-through' : 'text-text-primary'
                          }`}
                        >
                          {task.title}
                        </Link>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 pl-8">
                        {task.status === 'in_progress' && <Badge tone="xp">В работе</Badge>}
                        {task.status === 'cancelled' && <Badge tone="danger">Отменена</Badge>}
                        <TaskDueDateControl task={task} onUpdate={(patch) => updateTask(task.id, patch)} />
                        {rewardMultiplier !== 1 && !isTerminal ? (
                          <span className="text-xs text-accent-xp tabular-nums">
                            {multiplierIcon}×{formatMultiplier(rewardMultiplier)}{' '}
                            {Math.round(task.xp * rewardMultiplier)} XP · {Math.round(task.eternas * rewardMultiplier)} ✦
                          </span>
                        ) : (
                          <span className="text-xs text-text-muted tabular-nums">
                            {task.xp} XP · {task.eternas} ✦
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 pl-8">
                        <button
                          type="button"
                          onClick={() => handleDeleteTask(task)}
                          className="text-xs text-text-muted hover:text-danger"
                        >
                          Удалить
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <Button
                variant="ghost"
                onClick={() => openCreateTask(isUnassigned ? null : col.id)}
                className="w-full justify-center"
              >
                + Добавить
              </Button>
            </div>
          );
        })}

        <div className="w-72 shrink-0">
          {addingColumn ? (
            <form onSubmit={submitNewColumn} className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-3">
              <input
                autoFocus
                value={newColumnTitle}
                onChange={(e) => setNewColumnTitle(e.target.value)}
                placeholder="Название колонки"
                className="w-full rounded border border-border bg-bg px-3 py-2 text-sm text-text-primary outline-none focus:border-accent-xp"
              />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="secondary" onClick={() => setAddingColumn(false)}>
                  Отмена
                </Button>
                <Button type="submit" variant="primary">
                  Добавить
                </Button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setAddingColumn(true)}
              className="w-full rounded-lg border border-dashed border-border p-3 text-sm text-text-muted hover:border-accent-xp hover:text-text-primary"
            >
              + Колонка
            </button>
          )}
        </div>
      </div>

      <TaskModal
        open={taskModalOpen}
        onClose={() => setTaskModalOpen(false)}
        onSubmit={handleTaskSubmit}
        defaultProjectId={project.id}
        defaultBoardColumnId={createInColumnId}
      />
      {dialog}
    </div>
  );
}
