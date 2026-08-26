import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Project, Task, TaskStatus } from '../types';
import { useTasks } from '../hooks/useTasks';
import { useConfirm } from '../hooks/useConfirm';
import { getTodayDateString } from '../utils/today';
import { getTaskRewardMultiplier, getMultiplierIcon, formatMultiplier } from '../utils/taskRewards';
import { getStreakStars, isTaskOverdue } from '../utils/recurrence';
import Button from './ui/Button';
import Badge from './ui/Badge';
import TaskDueDateControl from './TaskDueDateControl';
import TaskProjectSelect from './TaskProjectSelect';
import TaskModal from './TaskModal';
import type { NewTaskInput } from '../hooks/useTasks';

const COLUMNS: { status: TaskStatus; title: string }[] = [
  { status: 'planned', title: 'Запланированы' },
  { status: 'in_progress', title: 'В работе' },
  { status: 'done', title: 'Выполнены' },
];

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
  const { addTask, updateTask, setTaskStatus, deleteTask } = useTasks();
  const { confirm, dialog } = useConfirm();
  const today = getTodayDateString();

  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [createStatus, setCreateStatus] = useState<TaskStatus>('planned');
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<TaskStatus | null>(null);

  function openCreateTask(status: TaskStatus) {
    setCreateStatus(status);
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

  return (
    <div className="overflow-x-auto">
      <div className="flex items-start gap-3 pb-2">
        {COLUMNS.map((col) => {
          const colTasks = tasks.filter((t) => t.status === col.status);

          return (
            <div
              key={col.status}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                if (dragOverStatus !== col.status) setDragOverStatus(col.status);
              }}
              onDragLeave={(e) => {
                if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                setDragOverStatus((prev) => (prev === col.status ? null : prev));
              }}
              onDrop={(e) => {
                e.preventDefault();
                const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
                if (taskId) setTaskStatus(taskId, col.status);
                setDraggedTaskId(null);
                setDragOverStatus(null);
              }}
              className={`flex w-72 shrink-0 flex-col gap-2 rounded-lg border p-3 transition-colors ${
                dragOverStatus === col.status ? 'border-accent-xp bg-accent-xp/[0.06]' : 'border-border bg-surface'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-text-primary">{col.title}</span>
                <span className="text-xs text-text-muted tabular-nums">{colTasks.length}</span>
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
                        setDragOverStatus(null);
                      }}
                      className={`flex cursor-grab flex-col gap-1.5 rounded-lg border border-border bg-bg p-2.5 active:cursor-grabbing ${
                        draggedTaskId === task.id ? 'opacity-40' : ''
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <TaskDoneCircle
                          done={isTerminal}
                          onToggle={() => setTaskStatus(task.id, isTerminal ? 'planned' : 'done')}
                        />
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

              <Button variant="ghost" onClick={() => openCreateTask(col.status)} className="w-full justify-center">
                + Добавить
              </Button>
            </div>
          );
        })}
      </div>

      <TaskModal
        open={taskModalOpen}
        onClose={() => setTaskModalOpen(false)}
        onSubmit={handleTaskSubmit}
        defaultStatus={createStatus}
      />
      {dialog}
    </div>
  );
}
