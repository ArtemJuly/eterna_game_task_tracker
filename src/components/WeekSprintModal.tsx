import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProjects } from '../hooks/useProjects';
import { useTasks } from '../hooks/useTasks';
import { useTracks } from '../hooks/useTracks';
import { useGoalMap } from '../hooks/useGoalMap';
import { useSettings } from '../hooks/useSettings';
import { useWeekSprint } from '../hooks/useWeekSprint';
import { pushToast } from '../hooks/useToast';
import { getTodayDateString } from '../utils/today';
import { isTaskOverdue } from '../utils/recurrence';
import { findEnclosingGoalTitle } from '../utils/goalMap';
import { AiEstimateError } from '../utils/aiTaskEstimate';
import { planWeekSprint, type SprintSuggestion } from '../utils/aiWeekSprint';
import Modal from './ui/Modal';
import Button from './ui/Button';
import Badge from './ui/Badge';

const TOP_PROJECTS_COUNT = 5;
const TOP_TRACKS_COUNT = 3;

interface WeekSprintModalProps {
  open: boolean;
  onClose: () => void;
}

export default function WeekSprintModal({ open, onClose }: WeekSprintModalProps) {
  const navigate = useNavigate();
  const { projects } = useProjects();
  const { tracks } = useTracks();
  const { tasks } = useTasks();
  const { nodes } = useGoalMap();
  const { settings } = useSettings();
  const { weekSprint, hasSprintThisWeek, setWeekSprint } = useWeekSprint();
  const [planning, setPlanning] = useState(false);
  const [taskSearch, setTaskSearch] = useState('');
  const today = getTodayDateString();

  const suggestions = useMemo<SprintSuggestion[]>(() => {
    return weekSprint
      .map((item) => {
        const task = tasks.find((t) => t.id === item.taskId);
        if (!task || (task.status !== 'planned' && task.status !== 'in_progress')) return null;
        return { task, reason: item.reason };
      })
      .filter((s): s is SprintSuggestion => s !== null);
  }, [weekSprint, tasks]);

  const addableTasks = useMemo(() => {
    const sprintTaskIds = new Set(weekSprint.map((item) => item.taskId));
    return tasks.filter((t) => (t.status === 'planned' || t.status === 'in_progress') && !sprintTaskIds.has(t.id));
  }, [tasks, weekSprint]);

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

  function removeFromSprint(taskId: string) {
    setWeekSprint(weekSprint.filter((item) => item.taskId !== taskId));
  }

  function addToSprint(taskId: string) {
    setWeekSprint([...weekSprint, { taskId, reason: 'Добавлено вручную' }]);
    setTaskSearch('');
  }

  async function handlePlan() {
    if (!settings.aiApiKey) {
      pushToast('Добавьте API-ключ в Настройках', 'error');
      return;
    }

    setPlanning(true);
    try {
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
        };
      });

      const topProjects = projects
        .filter((p) => p.status !== 'done')
        .slice(0, TOP_PROJECTS_COUNT)
        .map((p) => ({
          title: p.title,
          goal: p.goal,
          deadline: p.deadline,
          isSprint: p.isSprint,
          enclosingGoalTitle: findEnclosingGoalTitle(
            nodes,
            nodes.find((n) => n.type === 'project' && n.projectId === p.id),
          ),
        }));

      const topTracks = tracks
        .filter((t) => t.status !== 'done' && t.stages.length > 0)
        .slice(0, TOP_TRACKS_COUNT)
        .map((t) => ({
          title: t.title,
          goal: t.goal,
          currentStageTitle: t.stages[t.currentStageIndex]?.title ?? null,
          enclosingGoalTitle: findEnclosingGoalTitle(
            nodes,
            nodes.find((n) => n.type === 'track' && n.trackId === t.id),
          ),
        }));

      const result = await planWeekSprint(candidates, topProjects, topTracks, today, settings.aiApiKey);
      setWeekSprint(result.map((s) => ({ taskId: s.task.id, reason: s.reason })));
      if (result.length === 0) pushToast('AI не выделил задач для спринта — возможно, всё уже разобрано', 'success');
    } catch (err) {
      console.error('AI week sprint failed:', err);
      const message = err instanceof AiEstimateError ? err.message : 'Не удалось составить спринт';
      pushToast(message, 'error');
    } finally {
      setPlanning(false);
    }
  }

  const allDone = hasSprintThisWeek && weekSprint.length > 0 && suggestions.length === 0;

  return (
    <Modal open={open} onClose={onClose} title="Недельный спринт">
      <div className="flex flex-col gap-4">
        {!hasSprintThisWeek ? (
          <p className="text-sm text-text-muted">
            AI подберёт задачи на текущую неделю — исходя из того, какие проекты/треки сейчас приоритетнее и к
            каким целям в Карте целей они относятся. Спринт сохранится и будет виден до конца недели.
          </p>
        ) : (
          <div className="flex max-h-[60vh] flex-col gap-2 overflow-y-auto pr-1">
            {suggestions.length === 0 ? (
              <div className="rounded-lg border border-border bg-bg p-4 text-center text-sm text-text-muted">
                {allDone ? '🎉 Все задачи спринта выполнены' : 'AI не нашёл задач, которые стоило бы выделить на эту неделю'}
              </div>
            ) : (
              suggestions.map((s) => (
                <div key={s.task.id} className="flex items-start gap-3 rounded-lg border border-border bg-bg p-3">
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
                    onClick={() => removeFromSprint(s.task.id)}
                    title="Убрать из спринта"
                    className="rounded px-2 py-1 text-text-muted hover:bg-overlay/[0.04] hover:text-danger"
                  >
                    ✕
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {hasSprintThisWeek && addableTasks.length > 0 && (
          <div className="flex flex-col gap-1">
            <input
              type="text"
              value={taskSearch}
              onChange={(e) => setTaskSearch(e.target.value)}
              placeholder="Найти задачу, чтобы добавить в спринт..."
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
                        onClick={() => addToSprint(t.id)}
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

        <div className="flex justify-between gap-2">
          <Button type="button" variant="ghost" disabled={planning} onClick={handlePlan}>
            {planning ? 'Планирую...' : hasSprintThisWeek ? '🔄 Обновить спринт' : '🤖 Составить спринт'}
          </Button>
          <Button type="button" variant="secondary" onClick={onClose}>
            Закрыть
          </Button>
        </div>
      </div>
    </Modal>
  );
}
