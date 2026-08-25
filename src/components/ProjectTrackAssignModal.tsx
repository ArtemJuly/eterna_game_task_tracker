import { useMemo, useState } from 'react';
import { useProjects } from '../hooks/useProjects';
import { useTracks } from '../hooks/useTracks';
import { useSettings } from '../hooks/useSettings';
import { pushToast } from '../hooks/useToast';
import { AiEstimateError } from '../utils/aiTaskEstimate';
import { matchProjectsToStages, type ProjectStageMatch, type StageCandidate } from '../utils/aiProjectTrackAssign';
import Modal from './ui/Modal';
import Button from './ui/Button';
import Badge from './ui/Badge';

interface ProjectTrackAssignModalProps {
  open: boolean;
  onClose: () => void;
}

export default function ProjectTrackAssignModal({ open, onClose }: ProjectTrackAssignModalProps) {
  const { projects } = useProjects();
  const { tracks, assignProjectsToStages } = useTracks();
  const { settings } = useSettings();
  const [planning, setPlanning] = useState(false);
  const [matches, setMatches] = useState<ProjectStageMatch[] | null>(null);
  const [selections, setSelections] = useState<Record<string, string>>({});

  const stageCandidates: StageCandidate[] = useMemo(
    () =>
      tracks
        .filter((t) => t.status !== 'done')
        .flatMap((t) =>
          t.stages.map((s) => ({
            trackId: t.id,
            stageId: s.id,
            trackTitle: t.title,
            stageTitle: s.title,
            trackGoal: t.goal,
            stageDescription: s.description,
          })),
        ),
    [tracks],
  );

  const assignedProjectIds = useMemo(
    () => new Set(tracks.flatMap((t) => t.stages.flatMap((s) => s.projectIds))),
    [tracks],
  );
  const unassignedProjects = useMemo(
    () => projects.filter((p) => p.status !== 'done' && !assignedProjectIds.has(p.id)),
    [projects, assignedProjectIds],
  );

  function handleClose() {
    setMatches(null);
    setSelections({});
    onClose();
  }

  async function handleMatch() {
    if (!settings.aiApiKey) {
      pushToast('Добавьте API-ключ в Настройках', 'error');
      return;
    }
    setPlanning(true);
    try {
      const result = await matchProjectsToStages(
        stageCandidates,
        unassignedProjects.map((p) => ({ id: p.id, title: p.title, goal: p.goal })),
        settings.aiApiKey,
      );
      setMatches(result);
      const initialSelections: Record<string, string> = {};
      for (const m of result) initialSelections[m.project.id] = m.stage?.stageId ?? '';
      setSelections(initialSelections);
    } catch (err) {
      console.error('AI project-track assign failed:', err);
      const message = err instanceof AiEstimateError ? err.message : 'Не удалось распределить проекты';
      pushToast(message, 'error');
    } finally {
      setPlanning(false);
    }
  }

  function removeRow(projectId: string) {
    setMatches((prev) => prev?.filter((m) => m.project.id !== projectId) ?? null);
    setSelections((prev) => {
      const next = { ...prev };
      delete next[projectId];
      return next;
    });
  }

  function handleApply() {
    if (!matches) return;
    const assignments = matches
      .map((m) => {
        const stageId = selections[m.project.id];
        if (!stageId) return null;
        const stage = stageCandidates.find((s) => s.stageId === stageId);
        if (!stage) return null;
        return { projectId: m.project.id, trackId: stage.trackId, stageId: stage.stageId };
      })
      .filter((a): a is { projectId: string; trackId: string; stageId: string } => a !== null);

    if (assignments.length === 0) {
      pushToast('Ни один проект не выбран для назначения', 'error');
      return;
    }

    assignProjectsToStages(assignments);
    pushToast(`Распределено проектов: ${assignments.length}`);
    handleClose();
  }

  const matchedCount = matches?.filter((m) => selections[m.project.id]).length ?? 0;
  const unmatchedCount = matches ? matches.length - matchedCount : 0;

  return (
    <Modal open={open} onClose={handleClose} title="Распределить проекты по трекам">
      <div className="flex flex-col gap-4">
        {matches === null ? (
          <p className="text-sm text-text-muted">
            {unassignedProjects.length === 0
              ? 'Все активные проекты уже привязаны к какому-нибудь треку.'
              : `AI предложит, к какому этапу трека отнести каждый из ${unassignedProjects.length} проектов без трека — по названию и цели. Ничего не применится, пока не подтвердишь.`}
          </p>
        ) : (
          <div className="flex max-h-[60vh] flex-col gap-2 overflow-y-auto pr-1">
            {matches.length === 0 ? (
              <div className="rounded-lg border border-border bg-bg p-4 text-center text-sm text-text-muted">
                Список пуст
              </div>
            ) : (
              matches.map((m) => {
                const hasSuggestion = m.stage !== null;
                return (
                  <div key={m.project.id} className="flex items-start gap-3 rounded-lg border border-border bg-bg p-3">
                    <div className="flex flex-1 flex-col gap-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-text-primary">{m.project.title}</span>
                        {!hasSuggestion && <Badge tone="muted">🗑️ Без подходящего трека</Badge>}
                      </div>
                      {m.reason && <p className="text-xs text-text-muted">{m.reason}</p>}
                      <select
                        value={selections[m.project.id] ?? ''}
                        onChange={(e) => setSelections((prev) => ({ ...prev, [m.project.id]: e.target.value }))}
                        className="rounded border border-border bg-surface px-2 py-1 text-xs text-text-primary outline-none focus:border-accent-xp"
                      >
                        <option value="">Не назначать (оставить без трека)</option>
                        {tracks
                          .filter((t) => t.status !== 'done')
                          .map((t) => (
                            <optgroup key={t.id} label={t.title}>
                              {t.stages.map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.title}
                                </option>
                              ))}
                            </optgroup>
                          ))}
                      </select>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeRow(m.project.id)}
                      title="Убрать из списка"
                      className="rounded px-2 py-1 text-text-muted hover:bg-overlay/[0.04] hover:text-danger"
                    >
                      ✕
                    </button>
                  </div>
                );
              })
            )}
          </div>
        )}

        {matches !== null && matches.length > 0 && (
          <p className="text-xs text-text-muted">
            Будет назначено: {matchedCount} · останется без трека: {unmatchedCount}
          </p>
        )}

        <div className="flex justify-between gap-2">
          <Button
            type="button"
            variant="ghost"
            disabled={planning || unassignedProjects.length === 0}
            onClick={handleMatch}
          >
            {planning ? 'Распределяю...' : matches === null ? '🤖 Предложить распределение' : '🔄 Предложить заново'}
          </Button>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={handleClose}>
              Закрыть
            </Button>
            {matches !== null && matches.length > 0 && (
              <Button type="button" variant="primary" onClick={handleApply}>
                Применить
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
