import { useEffect, useState } from 'react';
import type { NewRewardInput } from '../hooks/useRewards';
import type { Reward, RewardStatus } from '../types';
import Modal from './ui/Modal';
import Button from './ui/Button';

interface RewardModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: NewRewardInput) => void;
  initialReward?: Reward | null;
}

export default function RewardModal({ open, onClose, onSubmit, initialReward }: RewardModalProps) {
  const [title, setTitle] = useState('');
  const [costEternas, setCostEternas] = useState(50);
  const [costMoney, setCostMoney] = useState('');
  const [status, setStatus] = useState<RewardStatus>('wanted');
  const [isEternal, setIsEternal] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(initialReward?.title ?? '');
    setCostEternas(initialReward?.costEternas ?? 50);
    setCostMoney(initialReward?.costMoney != null ? String(initialReward.costMoney) : '');
    setStatus(initialReward?.status ?? 'wanted');
    setIsEternal(initialReward?.isEternal ?? false);
  }, [open, initialReward]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    onSubmit({
      title: title.trim(),
      costEternas,
      costMoney: costMoney ? Number(costMoney) : null,
      status,
      isEternal,
    });
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={initialReward ? 'Редактировать награду' : 'Новая награда'}>
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

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm text-text-muted">Цена, ✦</label>
            <input
              type="number"
              min={0}
              required
              value={costEternas}
              onChange={(e) => setCostEternas(Number(e.target.value))}
              className="w-full rounded border border-border bg-bg px-3 py-2 text-sm text-text-primary tabular-nums outline-none focus:border-accent-xp"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-text-muted">Цена, ₽ (опц.)</label>
            <input
              type="number"
              min={0}
              value={costMoney}
              onChange={(e) => setCostMoney(e.target.value)}
              className="w-full rounded border border-border bg-bg px-3 py-2 text-sm text-text-primary tabular-nums outline-none focus:border-accent-xp"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm text-text-muted">Статус</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as RewardStatus)}
            className="w-full rounded border border-border bg-bg px-3 py-2 text-sm text-text-primary outline-none focus:border-accent-xp"
          >
            <option value="wanted">Хочу</option>
            <option value="saving">Коплю</option>
          </select>
        </div>

        <label className="flex cursor-pointer items-center gap-2 text-sm text-text-primary">
          <input
            type="checkbox"
            checked={isEternal}
            onChange={(e) => setIsEternal(e.target.checked)}
            className="h-4 w-4 accent-accent-xp"
          />
          ♾ Вечная награда — не пропадает после получения, можно покупать снова
        </label>

        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Отмена
          </Button>
          <Button type="submit" variant="primary">
            {initialReward ? 'Сохранить' : 'Создать'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
