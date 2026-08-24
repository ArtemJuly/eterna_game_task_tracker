import { useEffect, useState } from 'react';
import type { Task, TaskStatus, TrackLink } from '../types';
import type { NewTaskInput } from '../hooks/useTasks';
import { useProjects } from '../hooks/useProjects';
import { useTasks } from '../hooks/useTasks';
import { useTracks } from '../hooks/useTracks';
import { useSettings } from '../hooks/useSettings';
import { pushToast } from '../hooks/useToast';
import { isDescendantOf } from '../utils/taskTree';
import { RECURRENCE_PRESETS } from '../utils/recurrence';
import {
  AiEstimateError,
  estimateTaskReward,
  pickFewShotExamples,
  titleMatches,
  type TaskEstimate,
} from '../utils/aiTaskEstimate';
import Modal from './ui/Modal';
import Button from './ui/Button';
import DueDatePicker from './DueDatePicker';

const PRESET_DAYS = RECURRENCE_PRESETS.map((p) => p.days);

// select value is 'none', 'custom', or the interval as a string (e.g. '1', '7')
function modeForInterval(intervalDays: number | null): string {
  if (intervalDays === null) return 'none';
  if (PRESET_DAYS.includes(intervalDays)) return String(intervalDays);
  return 'custom';
}

interface TaskModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: NewTaskInput) => void;
  initialTask?: Task | null;
  defaultProjectId?: string | null;
  defaultParentTaskId?: string | null;
  defaultBoardColumnId?: string | null;
}

export default function TaskModal({
  open,
  onClose,
  onSubmit,
  initialTask,
  defaultProjectId,
  defaultParentTaskId,
  defaultBoardColumnId,
}: TaskModalProps) {
  const { projects } = useProjects();
  const { tasks } = useTasks();
  const { tracks } = useTracks();
  const { settings } = useSettings();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [projectId, setProjectId] = useState<string>('');
  const [parentTaskId, setParentTaskId] = useState<string>('');
  const [xp, setXp] = useState(20);
  const [eternas, setEternas] = useState(5);
  const [status, setStatus] = useState<TaskStatus>('planned');
  const [dueDate, setDueDate] = useState<string | null>(null);
  const [boardColumnId, setBoardColumnId] = useState<string | null>(null);
  const [recurrenceMode, setRecurrenceMode] = useState('none');
  const [customDays, setCustomDays] = useState(3);
  const [trackLinks, setTrackLinks] = useState<TrackLink[]>([]);
  const [pickerTrackId, setPickerTrackId] = useState('');
  const [pickerStageId, setPickerStageId] = useState('');
  const [trackPickerOpen, setTrackPickerOpen] = useState(false);
  const [estimating, setEstimating] = useState(false);
  const [lastEstimate, setLastEstimate] = useState<({ key: string } & TaskEstimate) | null>(null);

  useEffect(() => {
    if (!open) return;
    setTitle(initialTask?.title ?? '');
    setDescription(initialTask?.description ?? '');
    setProjectId(initialTask?.projectId ?? defaultProjectId ?? '');
    setParentTaskId(initialTask?.parentTaskId ?? defaultParentTaskId ?? '');
    setXp(initialTask?.xp ?? 20);
    setEternas(initialTask?.eternas ?? 5);
    setStatus(initialTask?.status ?? 'planned');
    setDueDate(initialTask?.dueDate ?? null);
    setBoardColumnId(initialTask?.boardColumnId ?? defaultBoardColumnId ?? null);
    const intervalDays = initialTask?.recurrenceIntervalDays ?? null;
    setRecurrenceMode(modeForInterval(intervalDays));
    if (intervalDays !== null && !PRESET_DAYS.includes(intervalDays)) setCustomDays(intervalDays);
    setTrackLinks(initialTask?.trackLinks ?? []);
    setPickerTrackId('');
    setPickerStageId('');
    setTrackPickerOpen(false);
    setLastEstimate(null);
  }, [open, initialTask, defaultProjectId, defaultParentTaskId, defaultBoardColumnId]);

  const availableTracks = tracks.filter((t) => !trackLinks.some((l) => l.trackId === t.id));
  const pickerStages = tracks.find((t) => t.id === pickerTrackId)?.stages ?? [];

  function addTrackLink() {
    if (!pickerTrackId || !pickerStageId) return;
    setTrackLinks((prev) => [...prev, { trackId: pickerTrackId, stageId: pickerStageId }]);
    setPickerTrackId('');
    setPickerStageId('');
  }

  function removeTrackLink(trackId: string) {
    setTrackLinks((prev) => prev.filter((l) => l.trackId !== trackId));
  }

  const parentOptions = tasks.filter((t) => {
    if (!initialTask) return true;
    if (t.id === initialTask.id) return false;
    if (isDescendantOf(tasks, t.id, initialTask.id)) return false;
    return true;
  });

  function applyEstimateResult(result: TaskEstimate): string {
    setXp(result.xp);
    setEternas(result.eternas);

    let matchedProjectTitle: string | null = null;
    if (result.projectTitle) {
      const matched = projects.find((p) => titleMatches(p.title, result.projectTitle!));
      if (matched) {
        setProjectId(matched.id);
        matchedProjectTitle = matched.title;
      }
    }

    let matchedTrackLabel: string | null = null;
    if (result.trackTitle) {
      const matchedTrack = tracks.find((t) => titleMatches(t.title, result.trackTitle!));
      const matchedStage = matchedTrack?.stages[matchedTrack.currentStageIndex] ?? null;
      if (matchedTrack && matchedStage) {
        setTrackLinks((prev) => [
          ...prev.filter((l) => l.trackId !== matchedTrack.id),
          { trackId: matchedTrack.id, stageId: matchedStage.id },
        ]);
        matchedTrackLabel = `${matchedTrack.title} → ${matchedStage.title}`;
      }
    }

    const parts = [`${result.xp} XP · ${result.eternas} ✦`];
    if (matchedProjectTitle) parts.push(`проект «${matchedProjectTitle}»`);
    if (matchedTrackLabel) parts.push(`трек «${matchedTrackLabel}»`);
    return `AI: ${parts.join(' · ')}`;
  }

  async function handleAiEstimate() {
    if (!settings.aiApiKey) {
      pushToast('Добавьте API-ключ в Настройках', 'error');
      return;
    }
    const key = `${title.trim()} ${description.trim()}`;
    if (lastEstimate && lastEstimate.key === key) {
      pushToast(applyEstimateResult(lastEstimate));
      return;
    }
    setEstimating(true);
    try {
      const examples = pickFewShotExamples(tasks, projectId || null);
      const projectTitles = projects.filter((p) => p.status === 'active').map((p) => p.title);
      const trackCandidates = tracks
        .filter((t) => t.stages.length > 0)
        .map((t) => ({ title: t.title, goal: t.goal, currentStageTitle: t.stages[t.currentStageIndex]?.title ?? null }));
      const result = await estimateTaskReward({
        title: title.trim(),
        description: description.trim(),
        examples,
        projectTitles,
        trackCandidates,
        apiKey: settings.aiApiKey,
      });
      setLastEstimate({ key, ...result });
      pushToast(applyEstimateResult(result));
    } catch (err) {
      if (!(err instanceof AiEstimateError)) console.error('AI estimate failed:', err);
      const message = err instanceof AiEstimateError ? err.message : 'Не удалось получить оценку AI';
      pushToast(message, 'error');
    } finally {
      setEstimating(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    const recurrenceIntervalDays =
      recurrenceMode === 'none' ? null : recurrenceMode === 'custom' ? Math.max(1, customDays) : Number(recurrenceMode);
    onSubmit({
      title: title.trim(),
      description: description.trim(),
      projectId: projectId || null,
      parentTaskId: parentTaskId || null,
      xp,
      eternas,
      status,
      dueDate,
      recurrenceIntervalDays,
      trackLinks,
      boardColumnId,
    });
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initialTask ? 'Редактировать задачу' : defaultParentTaskId ? 'Новая подзадача' : 'Новая задача'}
      size="lg"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Отмена
          </Button>
          <Button type="submit" form="task-form" variant="primary">
            Сохранить
          </Button>
        </>
      }
    >
      <form id="task-form" onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          autoFocus
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Название задачи"
          className="w-full rounded border border-border bg-bg px-3 py-2 text-base font-medium text-text-primary outline-none focus:border-accent-xp"
        />

        <div className="flex items-start gap-2">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="Описание..."
            className="w-full rounded border border-border bg-bg px-3 py-2 text-sm text-text-primary outline-none focus:border-accent-xp"
          />
          <Button
            type="button"
            variant="secondary"
            disabled={!title.trim() || estimating}
            onClick={handleAiEstimate}
            className="shrink-0 whitespace-nowrap"
          >
            {estimating ? '...' : '🤖 AI'}
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs text-text-muted">Проект</label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full rounded border border-border bg-bg px-3 py-2 text-sm text-text-primary outline-none focus:border-accent-xp"
            >
              <option value="">Без проекта</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-text-muted">Родительская задача</label>
            <select
              value={parentTaskId}
              onChange={(e) => setParentTaskId(e.target.value)}
              className="w-full rounded border border-border bg-bg px-3 py-2 text-sm text-text-primary outline-none focus:border-accent-xp"
            >
              <option value="">Нет</option>
              {parentOptions.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs text-text-muted">XP</label>
            <input
              type="number"
              min={0}
              value={xp}
              onChange={(e) => setXp(Number(e.target.value))}
              className="w-full rounded border border-border bg-bg px-3 py-2 text-sm text-text-primary tabular-nums outline-none focus:border-accent-xp"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-text-muted">Этерны</label>
            <input
              type="number"
              min={0}
              value={eternas}
              onChange={(e) => setEternas(Number(e.target.value))}
              className="w-full rounded border border-border bg-bg px-3 py-2 text-sm text-text-primary tabular-nums outline-none focus:border-accent-xp"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-text-muted">Статус</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as TaskStatus)}
              className="w-full rounded border border-border bg-bg px-3 py-2 text-sm text-text-primary outline-none focus:border-accent-xp"
            >
              <option value="planned">Запланирована</option>
              <option value="in_progress">В работе</option>
              <option value="done">Выполнена</option>
              <option value="cancelled">Отменена</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-text-muted">Срок</label>
            <DueDatePicker
              dueDate={dueDate}
              onDueDateChange={setDueDate}
              recurrenceMode={recurrenceMode}
              onRecurrenceModeChange={setRecurrenceMode}
              customDays={customDays}
              onCustomDaysChange={setCustomDays}
            />
          </div>
        </div>

        <div>
          {trackLinks.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {trackLinks.map((link) => {
                const linkTrack = tracks.find((t) => t.id === link.trackId);
                const linkStage = linkTrack?.stages.find((s) => s.id === link.stageId);
                return (
                  <span
                    key={link.trackId}
                    className="inline-flex items-center gap-1.5 rounded-[4px] border border-border bg-overlay/5 px-2 py-1 text-xs text-text-primary"
                  >
                    {linkTrack?.title ?? '—'} → {linkStage?.title ?? '—'}
                    <button
                      type="button"
                      onClick={() => removeTrackLink(link.trackId)}
                      className="text-text-muted hover:text-danger"
                    >
                      ✕
                    </button>
                  </span>
                );
              })}
            </div>
          )}
          {trackPickerOpen ? (
            <div className="flex gap-2">
              <select
                value={pickerTrackId}
                onChange={(e) => {
                  setPickerTrackId(e.target.value);
                  setPickerStageId('');
                }}
                className="flex-1 rounded border border-border bg-bg px-3 py-2 text-sm text-text-primary outline-none focus:border-accent-xp"
              >
                <option value="">Выбрать трек</option>
                {availableTracks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </select>
              <select
                value={pickerStageId}
                onChange={(e) => setPickerStageId(e.target.value)}
                disabled={!pickerTrackId}
                className="flex-1 rounded border border-border bg-bg px-3 py-2 text-sm text-text-primary outline-none focus:border-accent-xp disabled:opacity-50"
              >
                <option value="">Этап</option>
                {pickerStages.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                variant="secondary"
                disabled={!pickerTrackId || !pickerStageId}
                onClick={addTrackLink}
              >
                Ок
              </Button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setTrackPickerOpen(true)}
              className="text-sm text-text-muted hover:text-text-primary"
            >
              + Привязать к треку
            </button>
          )}
        </div>
      </form>
    </Modal>
  );
}
