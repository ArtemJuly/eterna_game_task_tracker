import { useEffect, useState } from 'react';
import type { GoalNodeType } from '../types';
import type { NewGoalNodeInput } from '../hooks/useGoalMap';
import { useProjects } from '../hooks/useProjects';
import { useTracks } from '../hooks/useTracks';
import { useTasks } from '../hooks/useTasks';
import Modal from './ui/Modal';
import Button from './ui/Button';

interface GoalNodeModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: NewGoalNodeInput) => void;
  parentId: string | null;
}

export default function GoalNodeModal({ open, onClose, onSubmit, parentId }: GoalNodeModalProps) {
  const { projects } = useProjects();
  const { tracks } = useTracks();
  const { tasks } = useTasks();
  const [type, setType] = useState<GoalNodeType>('goal');
  const [title, setTitle] = useState('');
  const [projectId, setProjectId] = useState('');
  const [trackId, setTrackId] = useState('');
  const [stageId, setStageId] = useState('');
  const [taskId, setTaskId] = useState('');

  useEffect(() => {
    if (!open) return;
    setType('goal');
    setTitle('');
    setProjectId('');
    setTrackId('');
    setStageId('');
    setTaskId('');
  }, [open]);

  const stagesForTrack = tracks.find((t) => t.id === trackId)?.stages ?? [];
  const emptyInput = { title: '', projectId: null, trackId: null, stageId: null, taskId: null };

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (type === 'goal') {
      if (!title.trim()) return;
      onSubmit({ type, parentId, ...emptyInput, title: title.trim() });
    } else if (type === 'project') {
      if (!projectId) return;
      onSubmit({ type, parentId, ...emptyInput, projectId });
    } else if (type === 'track') {
      if (!trackId) return;
      onSubmit({ type, parentId, ...emptyInput, trackId });
    } else if (type === 'trackStage') {
      if (!trackId || !stageId) return;
      onSubmit({ type, parentId, ...emptyInput, trackId, stageId });
    } else {
      if (!taskId) return;
      onSubmit({ type, parentId, ...emptyInput, taskId });
    }
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={parentId ? 'Добавить ответвление' : 'Добавить цель'}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="mb-1 block text-sm text-text-muted">Тип узла</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as GoalNodeType)}
            className="w-full rounded border border-border bg-bg px-3 py-2 text-sm text-text-primary outline-none focus:border-accent-xp"
          >
            <option value="goal">💭 Идея / цель (пока без проекта)</option>
            <option value="project">📁 Проект</option>
            <option value="track">🧭 Трек</option>
            <option value="trackStage">🧭 Этап трека</option>
            <option value="task">✅ Задача</option>
          </select>
        </div>

        {type === 'goal' && (
          <div>
            <label className="mb-1 block text-sm text-text-muted">Название</label>
            <input
              autoFocus
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Например, Свобода от аренды"
              className="w-full rounded border border-border bg-bg px-3 py-2 text-sm text-text-primary outline-none focus:border-accent-xp"
            />
          </div>
        )}

        {type === 'project' && (
          <div>
            <label className="mb-1 block text-sm text-text-muted">Проект</label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full rounded border border-border bg-bg px-3 py-2 text-sm text-text-primary outline-none focus:border-accent-xp"
            >
              <option value="">Выбрать проект</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </div>
        )}

        {(type === 'track' || type === 'trackStage') && (
          <div>
            <label className="mb-1 block text-sm text-text-muted">Трек</label>
            <select
              value={trackId}
              onChange={(e) => {
                setTrackId(e.target.value);
                setStageId('');
              }}
              className="w-full rounded border border-border bg-bg px-3 py-2 text-sm text-text-primary outline-none focus:border-accent-xp"
            >
              <option value="">Выбрать трек</option>
              {tracks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          </div>
        )}

        {type === 'trackStage' && trackId && (
          <div>
            <label className="mb-1 block text-sm text-text-muted">Этап</label>
            <select
              value={stageId}
              onChange={(e) => setStageId(e.target.value)}
              className="w-full rounded border border-border bg-bg px-3 py-2 text-sm text-text-primary outline-none focus:border-accent-xp"
            >
              <option value="">Выбрать этап</option>
              {stagesForTrack.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </select>
          </div>
        )}

        {type === 'task' && (
          <div>
            <label className="mb-1 block text-sm text-text-muted">Задача</label>
            <select
              value={taskId}
              onChange={(e) => setTaskId(e.target.value)}
              className="w-full rounded border border-border bg-bg px-3 py-2 text-sm text-text-primary outline-none focus:border-accent-xp"
            >
              <option value="">Выбрать задачу</option>
              {tasks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Отмена
          </Button>
          <Button type="submit" variant="primary">
            Добавить
          </Button>
        </div>
      </form>
    </Modal>
  );
}
