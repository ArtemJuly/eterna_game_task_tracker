import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTasks } from '../hooks/useTasks';
import type { NewTaskInput } from '../hooks/useTasks';
import { useProjects } from '../hooks/useProjects';
import { useConfirm } from '../hooks/useConfirm';
import { useDayPlan } from '../hooks/useDayPlan';
import { useWeekSprint } from '../hooks/useWeekSprint';
import type { Task, TaskStatus } from '../types';
import { getDirectChildren } from '../utils/taskTree';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import TaskModal from '../components/TaskModal';
import TaskBoard from '../components/TaskBoard';
import TaskIntakeModal from '../components/TaskIntakeModal';
import DayPlanModal from '../components/DayPlanModal';
import WeekSprintModal from '../components/WeekSprintModal';
import AiAssistantModal from '../components/AiAssistantModal';
import TaskStatusSelect from '../components/TaskStatusSelect';
import TaskProjectSelect from '../components/TaskProjectSelect';
import TaskDueDateControl from '../components/TaskDueDateControl';
import PomodoroTimer from '../components/PomodoroTimer';
import TodayFocusButton from '../components/TodayFocusButton';
import { getTodayDateString } from '../utils/today';
import { formatMultiplier, getMultiplierIcon, getTaskRewardMultiplier } from '../utils/taskRewards';
import { getStreakStars, isTaskOverdue } from '../utils/recurrence';
import { TASK_SORT_OPTIONS, compareTasks, type TaskSortMode } from '../utils/taskSort';
import { taskViewModeStore } from '../hooks/stores';

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
  const { todayPlan } = useDayPlan();
  const planReasonByTaskId = useMemo(() => new Map(todayPlan.map((item) => [item.taskId, item.reason])), [todayPlan]);
  const dayPlanTaskIds = useMemo(() => new Set(todayPlan.map((item) => item.taskId)), [todayPlan]);
  const { weekSprint } = useWeekSprint();
  const sprintTaskIds = useMemo(() => new Set(weekSprint.map((item) => item.taskId)), [weekSprint]);
  const [tab, setTab] = useState<FilterTab>('all');
  const [projectFilter, setProjectFilter] = useState<string>('');
  const [sortMode, setSortMode] = useState<TaskSortMode>('urgency');
  const [viewMode, setViewMode] = taskViewModeStore.useStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [aiHubOpen, setAiHubOpen] = useState(false);
  const [intakeOpen, setIntakeOpen] = useState(false);
  const [dayPlanOpen, setDayPlanOpen] = useState(false);
  const [sprintOpen, setSprintOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const today = getTodayDateString();

  const filtered = useMemo(() => {
    return tasks
      .filter((t) => (tab === 'all' ? t.status !== 'done' && t.status !== 'cancelled' : t.status === tab))
      .filter((t) => (projectFilter ? t.projectId === projectFilter : true))
      .sort((a, b) => compareTasks(a, b, sortMode, today, dayPlanTaskIds));
  }, [tasks, tab, projectFilter, sortMode, today, dayPlanTaskIds]);

  const boardTasks = useMemo(() => {
    return tasks
      .filter((t) => t.status !== 'cancelled')
      .filter((t) => (projectFilter ? t.projectId === projectFilter : true))
      .sort((a, b) => compareTasks(a, b, sortMode, today, dayPlanTaskIds));
  }, [tasks, projectFilter, sortMode, today, dayPlanTaskIds]);

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
          <Button variant="secondary" onClick={() => setAiHubOpen(true)}>
            🤖 AI-агент
          </Button>
          <Button variant="primary" onClick={openCreate}>
            + Новая задача
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="flex gap-1 rounded-lg border border-border bg-surface p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${
                viewMode === 'list' ? 'bg-overlay/[0.06] text-text-primary' : 'text-text-muted hover:text-text-primary'
              }`}
            >
              Список
            </button>
            <button
              onClick={() => setViewMode('board')}
              className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${
                viewMode === 'board' ? 'bg-overlay/[0.06] text-text-primary' : 'text-text-muted hover:text-text-primary'
              }`}
            >
              Доска
            </button>
          </div>
          {viewMode === 'list' && (
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
          )}
        </div>

        <div className="flex gap-2">
          <select
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as TaskSortMode)}
            className="rounded border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-accent-xp"
          >
            {TASK_SORT_OPTIONS.map((o) => (
              <option key={o.key} value={o.key}>
                {o.label}
              </option>
            ))}
          </select>
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
      </div>

      {viewMode === 'board' ? (
        <TaskBoard tasks={boardTasks} projects={projects} />
      ) : (
      <div className="flex flex-col gap-2">
        {filtered.length === 0 ? (
          <div className="rounded-lg border border-border bg-surface p-4 text-sm text-text-muted">
            Задач не найдено
          </div>
        ) : (
          filtered.map((task) => {
            const parentTask = task.parentTaskId ? tasks.find((t) => t.id === task.parentTaskId) : undefined;
            const isTerminal = task.status === 'done' || task.status === 'cancelled';
            const isFocused = task.focusDate === today;
            const dayPlanReason = planReasonByTaskId.get(task.id);
            const isInDayPlan = dayPlanReason !== undefined;
            const isInSprint = sprintTaskIds.has(task.id);
            const children = getDirectChildren(tasks, task.id).filter((t) => t.status !== 'cancelled');
            const doneChildren = children.filter((t) => t.status === 'done').length;
            const rewardMultiplier = getTaskRewardMultiplier(task, projects, today);
            const multiplierIcon = getMultiplierIcon(task, projects, today);
            const rowTone = isFocused
              ? 'border-accent-xp/50 bg-accent-xp/[0.04]'
              : isInDayPlan
                ? 'border-accent-eternas/40 bg-accent-eternas/[0.03]'
                : 'border-border bg-surface';

            return (
              <div
                key={task.id}
                onClick={() => navigate(`/tasks/${task.id}`)}
                className={`group flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 transition-colors hover:bg-overlay/[0.03] ${
                  task.status === 'cancelled' ? 'opacity-60' : ''
                } ${rowTone}`}
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
                    <TaskProjectSelect
                      projectId={task.projectId}
                      projects={projects}
                      onChange={(projectId) => updateTask(task.id, { projectId })}
                    />
                    {parentTask && <Badge tone="muted">↳ {parentTask.title}</Badge>}
                    {isInDayPlan && (
                      <span title={dayPlanReason}>
                        <Badge tone="eternas">🤖 План дня</Badge>
                      </span>
                    )}
                    {isInSprint && <Badge tone="xp">📌 Спринт</Badge>}
                    <TaskStatusSelect status={task.status} onChange={(status) => setTaskStatus(task.id, status)} />
                    <div onClick={(e) => e.stopPropagation()}>
                      <TaskDueDateControl task={task} onUpdate={(patch) => updateTask(task.id, patch)} />
                    </div>
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
      )}

      <TaskModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        initialTask={editingTask}
      />
      <AiAssistantModal
        open={aiHubOpen}
        onClose={() => setAiHubOpen(false)}
        onSelect={(skill) => {
          setAiHubOpen(false);
          if (skill === 'intake') setIntakeOpen(true);
          if (skill === 'dayplan') setDayPlanOpen(true);
          if (skill === 'sprint') setSprintOpen(true);
        }}
      />
      <TaskIntakeModal open={intakeOpen} onClose={() => setIntakeOpen(false)} />
      <DayPlanModal open={dayPlanOpen} onClose={() => setDayPlanOpen(false)} />
      <WeekSprintModal open={sprintOpen} onClose={() => setSprintOpen(false)} />
      {dialog}
    </div>
  );
}
