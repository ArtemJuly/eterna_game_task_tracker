import { useEffect, useState } from 'react';
import type { NewProjectInput } from '../hooks/useProjects';
import type { Project } from '../types';
import Modal from './ui/Modal';
import Button from './ui/Button';

interface ProjectModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: NewProjectInput) => void;
  initialProject?: Project | null;
}

function toDateInputValue(iso: string | null): string {
  if (!iso) return '';
  return iso.slice(0, 10);
}

export default function ProjectModal({ open, onClose, onSubmit, initialProject }: ProjectModalProps) {
  const [title, setTitle] = useState('');
  const [goal, setGoal] = useState('');
  const [deadline, setDeadline] = useState('');
  const [xp, setXp] = useState(100);
  const [eternas, setEternas] = useState(40);

  useEffect(() => {
    if (!open) return;
    setTitle(initialProject?.title ?? '');
    setGoal(initialProject?.goal ?? '');
    setDeadline(toDateInputValue(initialProject?.deadline ?? null));
    setXp(initialProject?.xp ?? 100);
    setEternas(initialProject?.eternas ?? 40);
  }, [open, initialProject]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    onSubmit({
      title: title.trim(),
      goal: goal.trim(),
      deadline: deadline ? new Date(deadline).toISOString() : null,
      xp,
      eternas,
    });
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={initialProject ? 'Редактировать проект' : 'Новый проект'}>
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
          <label className="mb-1 block text-sm text-text-muted">Цель</label>
          <textarea
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            rows={3}
            className="w-full rounded border border-border bg-bg px-3 py-2 text-sm text-text-primary outline-none focus:border-accent-xp"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm text-text-muted">Дедлайн</label>
          <input
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className="w-full rounded border border-border bg-bg px-3 py-2 text-sm text-text-primary outline-none focus:border-accent-xp"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm text-text-muted">XP за проект</label>
            <input
              type="number"
              min={0}
              value={xp}
              onChange={(e) => setXp(Number(e.target.value))}
              className="w-full rounded border border-border bg-bg px-3 py-2 text-sm text-text-primary tabular-nums outline-none focus:border-accent-xp"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-text-muted">Этерны за проект</label>
            <input
              type="number"
              min={0}
              value={eternas}
              onChange={(e) => setEternas(Number(e.target.value))}
              className="w-full rounded border border-border bg-bg px-3 py-2 text-sm text-text-primary tabular-nums outline-none focus:border-accent-xp"
            />
          </div>
        </div>

        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Отмена
          </Button>
          <Button type="submit" variant="primary">
            {initialProject ? 'Сохранить' : 'Создать'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
