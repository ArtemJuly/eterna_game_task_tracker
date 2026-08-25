import { useEffect, useState } from 'react';
import type { TrackStage } from '../types';
import { useProjects } from '../hooks/useProjects';
import { useTracks } from '../hooks/useTracks';
import Modal from './ui/Modal';
import Button from './ui/Button';

interface TrackStageModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (title: string, description: string, projectIds: string[]) => void;
  initialStage?: TrackStage | null;
}

export default function TrackStageModal({ open, onClose, onSubmit, initialStage }: TrackStageModalProps) {
  const { projects } = useProjects();
  const { tracks } = useTracks();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [projectIds, setProjectIds] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    setTitle(initialStage?.title ?? '');
    setDescription(initialStage?.description ?? '');
    setProjectIds(initialStage?.projectIds ?? []);
  }, [open, initialStage]);

  // A project can only power one stage app-wide, so hide ones already claimed elsewhere.
  const projectIdsUsedElsewhere = new Set(
    tracks.flatMap((t) => t.stages.filter((s) => s.id !== initialStage?.id).flatMap((s) => s.projectIds)),
  );
  const inProgressProjects = projects.filter(
    (p) => p.status !== 'done' && !projectIds.includes(p.id) && !projectIdsUsedElsewhere.has(p.id),
  );

  function addProject(projectId: string) {
    if (!projectId) return;
    setProjectIds((prev) => [...prev, projectId]);
  }

  function removeProject(id: string) {
    setProjectIds((prev) => prev.filter((pid) => pid !== id));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    onSubmit(title.trim(), description.trim(), projectIds);
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={initialStage ? 'Переименовать этап' : 'Новый этап'}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="mb-1 block text-sm text-text-muted">Название этапа</label>
          <input
            autoFocus
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Например, Математик"
            className="w-full rounded border border-border bg-bg px-3 py-2 text-sm text-text-primary outline-none focus:border-accent-xp"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm text-text-muted">Описание (необязательно)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="Что значит пройти этот этап?"
            className="w-full rounded border border-border bg-bg px-3 py-2 text-sm text-text-primary outline-none focus:border-accent-xp"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm text-text-muted">
            Проекты этапа — задачи в них будут засчитывать XP в этот трек
          </label>
          {projectIds.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {projectIds.map((id) => {
                const p = projects.find((proj) => proj.id === id);
                return (
                  <span
                    key={id}
                    className="inline-flex items-center gap-1.5 rounded-[4px] border border-border bg-overlay/5 px-2 py-1 text-xs text-text-primary"
                  >
                    📁 {p?.title ?? '—'}
                    <button
                      type="button"
                      onClick={() => removeProject(id)}
                      className="text-text-muted hover:text-danger"
                    >
                      ✕
                    </button>
                  </span>
                );
              })}
            </div>
          )}
          <select
            value=""
            onChange={(e) => addProject(e.target.value)}
            disabled={inProgressProjects.length === 0}
            className="w-full rounded border border-border bg-bg px-3 py-2 text-sm text-text-primary outline-none focus:border-accent-xp disabled:opacity-50"
          >
            <option value="" disabled>
              {inProgressProjects.length === 0 ? 'Нет доступных проектов' : '+ Выбрать проект, чтобы добавить'}
            </option>
            {inProgressProjects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Отмена
          </Button>
          <Button type="submit" variant="primary">
            {initialStage ? 'Сохранить' : 'Добавить'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
