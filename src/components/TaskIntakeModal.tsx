import { useState } from 'react';
import { useProjects } from '../hooks/useProjects';
import { useTasks } from '../hooks/useTasks';
import { useTracks } from '../hooks/useTracks';
import { useSettings } from '../hooks/useSettings';
import { pushToast } from '../hooks/useToast';
import { generateId } from '../utils/ids';
import { AiEstimateError, titleMatches } from '../utils/aiTaskEstimate';
import { parseTaskList } from '../utils/aiTaskIntake';
import Modal from './ui/Modal';
import Button from './ui/Button';
import Badge from './ui/Badge';

interface DraftRow {
  id: string;
  title: string;
  description: string;
  xp: number;
  eternas: number;
  projectId: string | null;
  trackId: string | null;
  stageId: string | null;
  trackLabel: string | null;
}

interface TaskIntakeModalProps {
  open: boolean;
  onClose: () => void;
}

export default function TaskIntakeModal({ open, onClose }: TaskIntakeModalProps) {
  const { projects } = useProjects();
  const { tracks } = useTracks();
  const { addTask } = useTasks();
  const { settings } = useSettings();
  const [step, setStep] = useState<'input' | 'review'>('input');
  const [rawText, setRawText] = useState('');
  const [parsing, setParsing] = useState(false);
  const [drafts, setDrafts] = useState<DraftRow[]>([]);

  function reset() {
    setStep('input');
    setRawText('');
    setDrafts([]);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleParse() {
    if (!settings.aiApiKey) {
      pushToast('Добавьте API-ключ в Настройках', 'error');
      return;
    }
    if (!rawText.trim()) return;

    setParsing(true);
    try {
      const projectTitles = projects.filter((p) => p.status === 'active').map((p) => p.title);
      const trackCandidates = tracks
        .filter((t) => t.stages.length > 0)
        .map((t) => ({ title: t.title, goal: t.goal, currentStageTitle: t.stages[t.currentStageIndex]?.title ?? null }));

      const parsedDrafts = await parseTaskList(rawText, projectTitles, trackCandidates, settings.aiApiKey);

      const rows: DraftRow[] = parsedDrafts.map((d) => {
        const matchedProject = d.projectTitle ? projects.find((p) => titleMatches(p.title, d.projectTitle!)) : undefined;
        const matchedTrack = d.trackTitle ? tracks.find((t) => titleMatches(t.title, d.trackTitle!)) : undefined;
        const matchedStage = matchedTrack?.stages[matchedTrack.currentStageIndex];

        return {
          id: generateId(),
          title: d.title,
          description: d.description,
          xp: d.xp,
          eternas: d.eternas,
          projectId: matchedProject?.id ?? null,
          trackId: matchedTrack && matchedStage ? matchedTrack.id : null,
          stageId: matchedTrack && matchedStage ? matchedStage.id : null,
          trackLabel: matchedTrack && matchedStage ? `${matchedTrack.title} → ${matchedStage.title}` : null,
        };
      });

      setDrafts(rows);
      setStep('review');
    } catch (err) {
      if (!(err instanceof AiEstimateError)) console.error('AI task intake failed:', err);
      const message = err instanceof AiEstimateError ? err.message : 'Не удалось разобрать список';
      pushToast(message, 'error');
    } finally {
      setParsing(false);
    }
  }

  function updateDraft(id: string, patch: Partial<DraftRow>) {
    setDrafts((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  }

  function removeDraft(id: string) {
    setDrafts((prev) => prev.filter((d) => d.id !== id));
  }

  function handleCreateAll() {
    for (const d of drafts) {
      addTask({
        title: d.title,
        description: d.description,
        projectId: d.projectId,
        parentTaskId: null,
        xp: d.xp,
        eternas: d.eternas,
        status: 'planned',
        dueDate: null,
        recurrenceIntervalDays: null,
        trackLinks: d.trackId && d.stageId ? [{ trackId: d.trackId, stageId: d.stageId }] : [],
        boardColumnId: null,
        taskBoardColumnId: null,
      });
    }
    pushToast(`Создано задач: ${drafts.length}`);
    reset();
    onClose();
  }

  return (
    <Modal open={open} onClose={handleClose} title="Добавить список задач">
      {step === 'input' ? (
        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-sm text-text-muted">Вставьте список задач</label>
            <textarea
              autoFocus
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              rows={10}
              placeholder={'Например:\n- Написать письмо клиенту\n- Проверить правки от научного руководителя\n- Разобрать почту'}
              className="w-full rounded border border-border bg-bg px-3 py-2 text-sm text-text-primary outline-none focus:border-accent-xp"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={handleClose}>
              Отмена
            </Button>
            <Button type="button" variant="primary" disabled={!rawText.trim() || parsing} onClick={handleParse}>
              {parsing ? 'Разбираю...' : '🤖 Разобрать список'}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex max-h-[60vh] flex-col gap-3 overflow-y-auto pr-1">
            {drafts.map((d) => (
              <div key={d.id} className="rounded-lg border border-border bg-bg p-3">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <input
                    value={d.title}
                    onChange={(e) => updateDraft(d.id, { title: e.target.value })}
                    className="flex-1 rounded border border-border bg-surface px-2 py-1 text-sm font-medium text-text-primary outline-none focus:border-accent-xp"
                  />
                  <button
                    type="button"
                    onClick={() => removeDraft(d.id)}
                    className="rounded px-2 py-1 text-text-muted hover:bg-overlay/[0.04] hover:text-danger"
                  >
                    ✕
                  </button>
                </div>

                <textarea
                  value={d.description}
                  onChange={(e) => updateDraft(d.id, { description: e.target.value })}
                  rows={2}
                  placeholder="Описание (необязательно)"
                  className="mb-2 w-full rounded border border-border bg-surface px-2 py-1 text-xs text-text-primary outline-none focus:border-accent-xp"
                />

                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={d.projectId ?? ''}
                    onChange={(e) => updateDraft(d.id, { projectId: e.target.value || null })}
                    className="rounded border border-border bg-surface px-2 py-1 text-xs text-text-primary outline-none focus:border-accent-xp"
                  >
                    <option value="">Без проекта</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title}
                      </option>
                    ))}
                  </select>

                  {d.trackLabel && <Badge tone="xp">{d.trackLabel}</Badge>}

                  <input
                    type="number"
                    min={0}
                    value={d.xp}
                    onChange={(e) => updateDraft(d.id, { xp: Number(e.target.value) })}
                    className="w-16 rounded border border-border bg-surface px-2 py-1 text-xs text-text-primary tabular-nums outline-none focus:border-accent-xp"
                  />
                  <span className="text-xs text-text-muted">XP</span>

                  <input
                    type="number"
                    min={0}
                    value={d.eternas}
                    onChange={(e) => updateDraft(d.id, { eternas: Number(e.target.value) })}
                    className="w-16 rounded border border-border bg-surface px-2 py-1 text-xs text-text-primary tabular-nums outline-none focus:border-accent-xp"
                  />
                  <span className="text-xs text-text-muted">✦</span>
                </div>
              </div>
            ))}
            {drafts.length === 0 && (
              <div className="rounded-lg border border-border bg-bg p-4 text-center text-sm text-text-muted">
                Все черновики убраны
              </div>
            )}
          </div>

          <div className="flex justify-between gap-2">
            <Button type="button" variant="secondary" onClick={() => setStep('input')}>
              ← Назад
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={handleClose}>
                Отмена
              </Button>
              <Button type="button" variant="primary" disabled={drafts.length === 0} onClick={handleCreateAll}>
                Создать {drafts.length > 0 ? drafts.length : ''} задач
              </Button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
