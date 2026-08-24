import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProjects } from '../hooks/useProjects';
import { useTasks } from '../hooks/useTasks';
import { useTracks } from '../hooks/useTracks';
import { useSettings } from '../hooks/useSettings';
import { useDayPlan } from '../hooks/useDayPlan';
import { useWeekSprint } from '../hooks/useWeekSprint';
import { pushToast } from '../hooks/useToast';
import { getTodayDateString, isWeekendDateString } from '../utils/today';
import { isTaskOverdue } from '../utils/recurrence';
import { AiEstimateError } from '../utils/aiTaskEstimate';
import { planDay, type DayPlanSuggestion } from '../utils/aiDayPlan';
import Modal from './ui/Modal';
import Button from './ui/Button';
import Badge from './ui/Badge';
import TodayFocusButton from './TodayFocusButton';

const TOP_PROJECTS_COUNT = 3;
const TOP_TRACKS_COUNT = 2;

interface DayPlanModalProps {
  open: boolean;
  onClose: () => void;
}

export default function DayPlanModal({ open, onClose }: DayPlanModalProps) {
  const navigate = useNavigate();
  const { projects } = useProjects();
  const { tracks } = useTracks();
  const { tasks, toggleFocus } = useTasks();
  const { settings } = useSettings();
  const { todayPlan, hasPlanToday, setDayPlan } = useDayPlan();
  const { weekSprint } = useWeekSprint();
  const [planning, setPlanning] = useState(false);
  const [taskSearch, setTaskSearch] = useState('');
  const today = getTodayDateString();

  const suggestions = useMemo<DayPlanSuggestion[]>(() => {
    return todayPlan
      .map((item) => {
        const task = tasks.find((t) => t.id === item.taskId);
        if (!task || (task.status !== 'planned' && task.status !== 'in_progress')) return null;
        return { task, reason: item.reason };
      })
      .filter((s): s is DayPlanSuggestion => s !== null);
  }, [todayPlan, tasks]);

  const addableTasks = useMemo(() => {
    const planTaskIds = new Set(todayPlan.map((item) => item.taskId));
    return tasks.filter((t) => (t.status === 'planned' || t.status === 'in_progress') && !planTaskIds.has(t.id));
  }, [tasks, todayPlan]);

  const taskSearchResults = useMemo(() => {
    const query = taskSearch.trim().toLowerCase();
    if (!query) return [];
    return addableTasks
      .filter((t) => {
        const projectTitle = t.projectId ? (projects.find((p) => p.id === t.projectId)?.title ?? '') : '';
        return t.title.toLowerCase().includes(query) || projectTitle.toLowerCase().includes(query);
      })
      .slice(0, 8);
  }, [addableTasks, taskSearch, projects]);

  function removeFromPlan(taskId: string) {
    setDayPlan(todayPlan.filter((item) => item.taskId !== taskId));
  }

  function addToPlan(taskId: string) {
    setDayPlan([...todayPlan, { taskId, reason: 'Добавлено вручную' }]);
    setTaskSearch('');
  }

  async function handlePlan() {
    if (!settings.aiApiKey) {
      pushToast('Добавьте API-ключ в Настройках', 'error');
      return;
    }

    setPlanning(true);
    try {
      const sprintTaskIds = new Set(weekSprint.map((item) => item.taskId));
      const openTasks = tasks.filter((t) => t.status === 'planned' || t.status === 'in_progress');
      const candidates = openTasks.map((task) => {
        const project = task.projectId ? projects.find((p) => p.id === task.projectId) : undefined;
        const trackLabel =
          task.trackLinks.length > 0
            ? task.trackLinks
                .map((l) => {
                  const track = tracks.find((t) => t.id === l.trackId);
                  const stage = track?.stages.find((s) => s.id === l.stageId);
                  return track && stage ? `${track.title} → ${stage.title}` : null;
                })
                .filter((s): s is string => s !== null)
                .join(', ') || null
            : null;
        return {
          task,
          projectTitle: project?.title ?? null,
          trackLabel,
          isOverdue: isTaskOverdue(task, today),
          isInSprint: sprintTaskIds.has(task.id),
        };
      });

      const topProjects = projects
        .filter((p) => p.status !== 'done')
        .slice(0, TOP_PROJECTS_COUNT)
        .map((p) => ({ title: p.title, goal: p.goal, deadline: p.deadline, isSprint: p.isSprint }));

      const topTracks = tracks
        .filter((t) => t.status !== 'done' && t.stages.length > 0)
        .slice(0, TOP_TRACKS_COUNT)
        .map((t) => ({ title: t.title, goal: t.goal, currentStageTitle: t.stages[t.currentStageIndex]?.title ?? null }));

      const result = await planDay(candidates, topProjects, topTracks, today, isWeekendDateString(today), settings.aiApiKey);
      setDayPlan(result.map((s) => ({ taskId: s.task.id, reason: s.reason })));
      if (result.length === 0) pushToast('AI не выделил задач для сегодня — возможно, всё уже разобрано', 'success');
    } catch (err) {
      console.error('AI day plan failed:', err);
      const message = err instanceof AiEstimateError ? err.message : 'Не удалось составить план';
      pushToast(message, 'error');
    } finally {
      setPlanning(false);
    }
  }

  const allDone = hasPlanToday && todayPlan.length > 0 && suggestions.length === 0;

  return (
    <Modal open={open} onClose={onClose} title="План на день">
      <div className="flex flex-col gap-4">
        {!hasPlanToday ? (
          <p className="text-sm text-text-muted">
            AI подберёт задачи на сегодня — ключевые по самым приоритетным проектам/трекам и те, у которых
            подошёл срок. План сохранится и будет виден в списке задач до конца дня.
          </p>
        ) : (
          <div className="flex max-h-[60vh] flex-col gap-2 overflow-y-auto pr-1">
            {suggestions.length === 0 ? (
              <div className="rounded-lg border border-border bg-bg p-4 text-center text-sm text-text-muted">
                {allDone ? '🎉 Все задачи из плана на сегодня выполнены' : 'AI не нашёл задач, которые стоило бы выделить на сегодня'}
              </div>
            ) : (
              suggestions.map((s) => (
                <div
                  key={s.task.id}
                  className="flex items-start gap-3 rounded-lg border border-border bg-bg p-3"
                >
                  <TodayFocusButton active={s.task.focusDate === today} onClick={() => toggleFocus(s.task.id)} />
                  <div className="flex flex-1 flex-col gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        navigate(`/tasks/${s.task.id}`);
                        onClose();
                      }}
                      className="text-left text-sm font-medium text-text-primary hover:underline"
                    >
                      {s.task.title}
                    </button>
                    {s.reason && <p className="text-xs text-text-muted">{s.reason}</p>}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-xs text-text-muted tabular-nums">
                        {s.task.xp} XP · {s.task.eternas} ✦
                      </span>
                      {s.task.dueDate && isTaskOverdue(s.task, today) && <Badge tone="danger">Просрочено</Badge>}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFromPlan(s.task.id)}
                    title="Убрать из плана"
                    className="rounded px-2 py-1 text-text-muted hover:bg-overlay/[0.04] hover:text-danger"
                  >
                    ✕
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {hasPlanToday && addableTasks.length > 0 && (
          <div className="flex flex-col gap-1">
            <input
              type="text"
              value={taskSearch}
              onChange={(e) => setTaskSearch(e.target.value)}
              placeholder="Найти задачу, чтобы добавить в план..."
              className="w-full rounded border border-border bg-bg px-3 py-2 text-sm text-text-primary outline-none focus:border-accent-xp"
            />
            {taskSearch.trim() && (
              <div className="flex max-h-40 flex-col gap-0.5 overflow-y-auto rounded border border-border bg-bg p-1">
                {taskSearchResults.length === 0 ? (
                  <div className="px-2 py-1.5 text-xs text-text-muted">Ничего не найдено</div>
                ) : (
                  taskSearchResults.map((t) => {
                    const project = t.projectId ? projects.find((p) => p.id === t.projectId) : undefined;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => addToPlan(t.id)}
                        className="flex flex-col items-start rounded px-2 py-1.5 text-left hover:bg-overlay/[0.06]"
                      >
                        <span className="text-sm text-text-primary">{t.title}</span>
                        {project && <span className="text-xs text-text-muted">{project.title}</span>}
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Закрыть
          </Button>
          <Button type="button" variant="primary" disabled={planning} onClick={handlePlan}>
            {planning ? 'Планирую...' : hasPlanToday ? '🔄 Обновить план' : '🤖 Составить план'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
