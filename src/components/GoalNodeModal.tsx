import { useEffect, useMemo, useState } from 'react';
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
  const [taskSearch, setTaskSearch] = useState('');

  useEffect(() => {
    if (!open) return;
    setType('goal');
    setTitle('');
    setProjectId('');
    setTrackId('');
    setStageId('');
    setTaskId('');
    setTaskSearch('');
  }, [open]);

  const stagesForTrack = tracks.find((t) => t.id === trackId)?.stages ?? [];

  const taskSearchResults = useMemo(() => {
    const query = taskSearch.trim().toLowerCase();
    if (!query) return [];
    return tasks
      .filter((t) => t.status === 'planned' || t.status === 'in_progress')
      .filter((t) => {
        const projectTitle = t.projectId ? (projects.find((p) => p.id === t.projectId)?.title ?? '') : '';
        return t.title.toLowerCase().includes(query) || projectTitle.toLowerCase().includes(query);
      })
      .slice(0, 8);
  }, [tasks, taskSearch, projects]);
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
            {taskId ? (
              <div className="flex items-center justify-between rounded border border-border bg-bg px-3 py-2 text-sm">
                <span className="truncate text-text-primary">{tasks.find((t) => t.id === taskId)?.title ?? '—'}</span>
                <button
                  type="button"
                  onClick={() => {
                    setTaskId('');
                    setTaskSearch('');
                  }}
                  className="text-text-muted hover:text-danger"
                >
                  ✕
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                <input
                  type="text"
                  autoFocus
                  value={taskSearch}
                  onChange={(e) => setTaskSearch(e.target.value)}
                  placeholder="Начни вводить название невыполненной задачи..."
                  className="w-full rounded border border-border bg-bg px-3 py-2 text-sm text-text-primary outline-none focus:border-accent-xp"
                />
                {taskSearch.trim() && (
                  <div className="flex max-h-48 flex-col gap-0.5 overflow-y-auto rounded border border-border bg-bg p-1">
                    {taskSearchResults.length === 0 ? (
                      <div className="px-2 py-1.5 text-xs text-text-muted">Ничего не найдено</div>
                    ) : (
                      taskSearchResults.map((t) => {
                        const project = t.projectId ? projects.find((p) => p.id === t.projectId) : undefined;
                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => {
                              setTaskId(t.id);
                              setTaskSearch('');
                            }}
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
