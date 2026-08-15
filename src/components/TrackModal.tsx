import { useEffect, useState } from 'react';
import type { Track } from '../types';
import Modal from './ui/Modal';
import Button from './ui/Button';

interface TrackModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: { title: string; goal: string }) => void;
  initialTrack?: Track | null;
}

export default function TrackModal({ open, onClose, onSubmit, initialTrack }: TrackModalProps) {
  const [title, setTitle] = useState('');
  const [goal, setGoal] = useState('');

  useEffect(() => {
    if (!open) return;
    setTitle(initialTrack?.title ?? '');
    setGoal(initialTrack?.goal ?? '');
  }, [open, initialTrack]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    onSubmit({ title: title.trim(), goal: goal.trim() });
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={initialTrack ? 'Переименовать трек' : 'Новый трек развития'}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="mb-1 block text-sm text-text-muted">Название</label>
          <input
            autoFocus
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Например, Карьера"
            className="w-full rounded border border-border bg-bg px-3 py-2 text-sm text-text-primary outline-none focus:border-accent-xp"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm text-text-muted">Цель</label>
          <textarea
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            rows={3}
            placeholder="Например, стать исполнительным директором отдела разработки"
            className="w-full rounded border border-border bg-bg px-3 py-2 text-sm text-text-primary outline-none focus:border-accent-xp"
          />
        </div>

        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Отмена
          </Button>
          <Button type="submit" variant="primary">
            {initialTrack ? 'Сохранить' : 'Создать'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
