import { useEffect, useState } from 'react';
import type { Task, TaskStatus } from '../types';
import type { NewTaskInput } from '../hooks/useTasks';
import { useProjects } from '../hooks/useProjects';
import { useTasks } from '../hooks/useTasks';
import Modal from './ui/Modal';
import Button from './ui/Button';

interface TaskModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: NewTaskInput) => void;
  initialTask?: Task | null;
}

export default function TaskModal({ open, onClose, onSubmit, initialTask }: TaskModalProps) {
  const { projects } = useProjects();
  const { tasks } = useTasks();
  const [title, setTitle] = useState('');
  const [projectId, setProjectId] = useState<string>('');
  const [parentTaskId, setParentTaskId] = useState<string>('');
  const [xp, setXp] = useState(20);
  const [eternas, setEternas] = useState(5);
  const [status, setStatus] = useState<TaskStatus>('planned');

  useEffect(() => {
    if (!open) return;
    setTitle(initialTask?.title ?? '');
    setProjectId(initialTask?.projectId ?? '');
    setParentTaskId(initialTask?.parentTaskId ?? '');
    setXp(initialTask?.xp ?? 20);
    setEternas(initialTask?.eternas ?? 5);
    setStatus(initialTask?.status ?? 'planned');
  }, [open, initialTask]);

  const hasChildren = initialTask ? tasks.some((t) => t.parentTaskId === initialTask.id) : false;
  const parentOptions = tasks.filter((t) => !t.parentTaskId && t.id !== initialTask?.id);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    onSubmit({
      title: title.trim(),
      projectId: projectId || null,
      parentTaskId: hasChildren ? null : parentTaskId || null,
      xp,
      eternas,
      status,
    });
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={initialTask ? 'Редактировать задачу' : 'Новая задача'}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="mb-1 block text-sm text-text-muted">Название</label>
          <input
            autoFocus
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded border border-border bg-bg px-3 py-2 text-sm text-text-primary outline-none focus:border-accent-xp"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm text-text-muted">Проект</label>
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
          <label className="mb-1 block text-sm text-text-muted">Родительская задача</label>
          {hasChildren ? (
            <p className="text-sm text-text-muted">
              У этой задачи уже есть подзадачи, поэтому она не может сама быть подзадачей.
            </p>
          ) : (
            <select
              value={parentTaskId}
              onChange={(e) => setParentTaskId(e.target.value)}
              className="w-full rounded border border-border bg-bg px-3 py-2 text-sm text-text-primary outline-none focus:border-accent-xp"
            >
              <option value="">Нет — самостоятельная задача</option>
              {parentOptions.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm text-text-muted">XP</label>
            <input
              type="number"
              min={0}
              value={xp}
              onChange={(e) => setXp(Number(e.target.value))}
              className="w-full rounded border border-border bg-bg px-3 py-2 text-sm text-text-primary tabular-nums outline-none focus:border-accent-xp"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-text-muted">Этерны</label>
            <input
              type="number"
              min={0}
              value={eternas}
              onChange={(e) => setEternas(Number(e.target.value))}
              className="w-full rounded border border-border bg-bg px-3 py-2 text-sm text-text-primary tabular-nums outline-none focus:border-accent-xp"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm text-text-muted">Статус</label>
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

        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Отмена
          </Button>
          <Button type="submit" variant="primary">
            Сохранить
          </Button>
        </div>
      </form>
    </Modal>
  );
}
