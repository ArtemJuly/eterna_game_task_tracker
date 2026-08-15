import { useEffect, useState } from 'react';
import type { TrackStage } from '../types';
import { useProjects } from '../hooks/useProjects';
import Modal from './ui/Modal';
import Button from './ui/Button';

interface TrackStageModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (title: string, description: string, projectId: string | null) => void;
  initialStage?: TrackStage | null;
}

export default function TrackStageModal({ open, onClose, onSubmit, initialStage }: TrackStageModalProps) {
  const { projects } = useProjects();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [projectId, setProjectId] = useState('');

  useEffect(() => {
    if (!open) return;
    setTitle(initialStage?.title ?? '');
    setDescription(initialStage?.description ?? '');
    setProjectId(initialStage?.projectId ?? '');
  }, [open, initialStage]);

  const inProgressProjects = projects.filter((p) => p.status !== 'done');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    onSubmit(title.trim(), description.trim(), projectId || null);
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
          <label className="mb-1 block text-sm text-text-muted">Связанный проект (в работе)</label>
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="w-full rounded border border-border bg-bg px-3 py-2 text-sm text-text-primary outline-none focus:border-accent-xp"
          >
            <option value="">Без проекта</option>
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
