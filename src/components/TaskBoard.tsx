import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Project, Task } from '../types';
import { useTasks } from '../hooks/useTasks';
import { useConfirm } from '../hooks/useConfirm';
import { getTodayDateString } from '../utils/today';
import { getTaskRewardMultiplier, getMultiplierIcon, getMultiplierTooltip, formatMultiplier } from '../utils/taskRewards';
import { getStreakStars, isTaskOverdue } from '../utils/recurrence';
import Button from './ui/Button';
import Badge from './ui/Badge';
import TaskDueDateControl from './TaskDueDateControl';
import TaskProjectSelect from './TaskProjectSelect';
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

interface TaskBoardProps {
  tasks: Task[];
  projects: Project[];
}

export default function TaskBoard({ tasks, projects }: TaskBoardProps) {
  const {
    addTask,
    updateTask,
    setTaskStatus,
    deleteTask,
    taskBoardColumns,
    addTaskBoardColumn,
    renameTaskBoardColumn,
    deleteTaskBoardColumn,
  } = useTasks();
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
    updateTask(taskId, { taskBoardColumnId: columnId === UNASSIGNED ? null : columnId });
  }

  function submitNewColumn(e: React.FormEvent) {
    e.preventDefault();
    if (!newColumnTitle.trim()) return;
    addTaskBoardColumn(newColumnTitle.trim());
    setNewColumnTitle('');
    setAddingColumn(false);
  }

  function startRename(columnId: string, title: string) {
    setRenamingColumnId(columnId);
    setRenameValue(title);
  }

  function commitRename(columnId: string) {
    if (renameValue.trim()) renameTaskBoardColumn(columnId, renameValue.trim());
    setRenamingColumnId(null);
  }

  function handleDeleteColumn(columnId: string, title: string) {
    const count = tasks.filter((t) => t.taskBoardColumnId === columnId).length;
    confirm({
      title: 'Удалить столбец?',
      message:
        count > 0
          ? `Столбец «${title}» будет удалён. Его ${count} задач(и) переместятся в «Без столбца».`
          : `Столбец «${title}» будет удалён.`,
      confirmLabel: 'Удалить',
      danger: true,
      onConfirm: () => deleteTaskBoardColumn(columnId),
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
    setTaskStatus(task.id, task.status === 'done' ? 'planned' : 'done');
  }

  const columns = [{ id: UNASSIGNED, title: 'Без столбца' }, ...taskBoardColumns];
  const unassignedCount = tasks.filter((t) => t.taskBoardColumnId === null).length;
  const visibleColumns = columns.filter((col) => col.id !== UNASSIGNED || unassignedCount > 0);

  return (
    <div className="overflow-x-auto">
      <div className="flex items-start gap-3 pb-2">
        {visibleColumns.map((col) => {
          const colTasks = tasks.filter((t) =>
            col.id === UNASSIGNED ? t.taskBoardColumnId === null : t.taskBoardColumnId === col.id,
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
                dragOverColumnId === col.id ? 'border-accent-xp bg-accent-xp/[0.06]' : 'border-border bg-surface'
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
                      title="Удалить столбец"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                {colTasks.map((task) => {
                  const isTerminal = task.status === 'done';
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
                      className={`flex min-w-0 cursor-grab flex-col gap-1.5 overflow-hidden rounded-lg border border-border bg-bg p-2.5 active:cursor-grabbing ${
                        draggedTaskId === task.id ? 'opacity-40' : ''
                      }`}
                    >
                      <div className="flex min-w-0 items-start gap-2">
                        <TaskDoneCircle done={isTerminal} onToggle={() => toggleTaskDone(task)} />
                        <Link
                          to={`/tasks/${task.id}`}
                          className={`min-w-0 flex-1 break-words text-sm font-medium hover:underline ${
                            isTerminal ? 'text-text-muted line-through' : 'text-text-primary'
                          }`}
                        >
                          {task.title}
                        </Link>
                      </div>
                      <div className="flex min-w-0 flex-wrap items-center gap-1.5 pl-8">
                        <TaskProjectSelect
                          projectId={task.projectId}
                          projects={projects}
                          onChange={(projectId) => updateTask(task.id, { projectId })}
                        />
                        <TaskDueDateControl task={task} onUpdate={(patch) => updateTask(task.id, patch)} />
                        {task.streakCount > 0 && <Badge tone="eternas">🔥 ×{task.streakCount}</Badge>}
                        {getStreakStars(task.streakCount) > 0 && (
                          <Badge tone="xp">{'⭐'.repeat(getStreakStars(task.streakCount))}</Badge>
                        )}
                        {isTaskOverdue(task, today) && <Badge tone="danger">Просрочено</Badge>}
                        {rewardMultiplier !== 1 && !isTerminal ? (
                          <span
                            title={getMultiplierTooltip(task, projects, today)}
                            className="text-xs text-accent-xp tabular-nums"
                          >
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
                placeholder="Название столбца"
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
              + Столбец
            </button>
          )}
        </div>
      </div>

      <TaskModal
        open={taskModalOpen}
        onClose={() => setTaskModalOpen(false)}
        onSubmit={handleTaskSubmit}
        defaultTaskBoardColumnId={createInColumnId}
      />
      {dialog}
    </div>
  );
}
