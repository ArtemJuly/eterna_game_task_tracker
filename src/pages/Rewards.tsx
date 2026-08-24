import { useState } from 'react';
import { useCharacter } from '../hooks/useCharacter';
import { useRewards } from '../hooks/useRewards';
import type { NewRewardInput } from '../hooks/useRewards';
import { useConfirm } from '../hooks/useConfirm';
import type { Reward, RewardStatus } from '../types';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import ProgressBar from '../components/ui/ProgressBar';
import RewardModal from '../components/RewardModal';

const STATUS_LABEL: Record<RewardStatus, string> = {
  wanted: 'Хочу',
  saving: 'Коплю',
  available: 'Доступна',
  purchased: 'Куплена',
  cancelled: 'Отменена',
};

interface RewardCardProps {
  reward: Reward;
  eternas: number;
  onPurchase?: () => void;
  onEdit?: () => void;
  onDelete: () => void;
}

function RewardCard({ reward, eternas, onPurchase, onEdit, onDelete }: RewardCardProps) {
  const affordable = eternas >= reward.costEternas;
  const percent = reward.costEternas === 0 ? 100 : Math.round((Math.min(eternas, reward.costEternas) / reward.costEternas) * 100);

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
      <div className="flex items-start justify-between">
        <button
          disabled={!onEdit}
          onClick={onEdit}
          className={`text-left font-semibold text-text-primary ${onEdit ? 'hover:underline' : ''}`}
        >
          {reward.title}
        </button>
        <div className="flex items-center gap-1.5">
          {reward.isEternal && <Badge tone="eternas">♾ Вечная</Badge>}
          <Badge tone="muted">{STATUS_LABEL[reward.status]}</Badge>
        </div>
      </div>

      <div className="text-sm tabular-nums">
        <span className="text-accent-eternas">{reward.costEternas} ✦</span>
        {reward.costMoney != null && <span className="ml-2 text-text-muted">{reward.costMoney} ₽</span>}
      </div>

      {onPurchase ? (
        <>
          <div>
            <div className="mb-1 text-xs text-text-muted tabular-nums">
              {Math.min(eternas, reward.costEternas)} / {reward.costEternas} ✦
            </div>
            <ProgressBar percent={percent} />
          </div>
          {reward.isEternal && reward.purchasedAt && (
            <div className="text-xs text-text-muted">
              Последний раз: {new Date(reward.purchasedAt).toLocaleDateString('ru-RU')}
            </div>
          )}
          <div className="flex gap-2">
            <Button variant="primary" disabled={!affordable} onClick={onPurchase} className="flex-1">
              Получить
            </Button>
            <Button variant="ghost" onClick={onDelete}>
              Удалить
            </Button>
          </div>
        </>
      ) : (
        <div className="flex items-center justify-between">
          <span className="text-xs text-text-muted tabular-nums">
            {reward.purchasedAt && new Date(reward.purchasedAt).toLocaleDateString('ru-RU')}
          </span>
          <Button variant="ghost" onClick={onDelete}>
            Удалить
          </Button>
        </div>
      )}
    </div>
  );
}

export default function Rewards() {
  const character = useCharacter();
  const { rewards, addReward, updateReward, deleteReward, purchaseReward } = useRewards();
  const { confirm, dialog } = useConfirm();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingReward, setEditingReward] = useState<Reward | null>(null);

  const active = rewards.filter((r) => r.status !== 'purchased' && r.status !== 'cancelled');
  const availableRewards = active.filter((r) => character.eternas >= r.costEternas);
  const restRewards = active.filter((r) => character.eternas < r.costEternas);
  const purchasedRewards = rewards
    .filter((r) => r.status === 'purchased')
    .sort((a, b) => new Date(b.purchasedAt ?? 0).getTime() - new Date(a.purchasedAt ?? 0).getTime());

  function openCreate() {
    setEditingReward(null);
    setModalOpen(true);
  }

  function openEdit(reward: Reward) {
    setEditingReward(reward);
    setModalOpen(true);
  }

  function handleSubmit(input: NewRewardInput) {
    if (editingReward) {
      updateReward(editingReward.id, input);
    } else {
      addReward(input);
    }
  }

  function handlePurchase(reward: Reward) {
    confirm({
      title: 'Получить награду?',
      message: `С баланса спишется ${reward.costEternas} ✦ за «${reward.title}».`,
      confirmLabel: 'Получить',
      onConfirm: () => purchaseReward(reward.id),
    });
  }

  function handleDelete(reward: Reward) {
    confirm({
      title: 'Удалить награду?',
      message: `«${reward.title}» будет удалена без возможности восстановления.`,
      confirmLabel: 'Удалить',
      danger: true,
      onConfirm: () => deleteReward(reward.id),
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">Магазин</h1>
        <Button variant="primary" onClick={openCreate}>
          + Новая награда
        </Button>
      </div>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-text-primary">Доступные</h2>
        {availableRewards.length === 0 ? (
          <div className="rounded-lg border border-border bg-surface p-4 text-sm text-text-muted">
            Пока нет доступных наград
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {availableRewards.map((reward) => (
              <RewardCard
                key={reward.id}
                reward={reward}
                eternas={character.eternas}
                onPurchase={() => handlePurchase(reward)}
                onEdit={() => openEdit(reward)}
                onDelete={() => handleDelete(reward)}
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-text-primary">Коплю / Хочу</h2>
        {restRewards.length === 0 ? (
          <div className="rounded-lg border border-border bg-surface p-4 text-sm text-text-muted">
            Пусто
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {restRewards.map((reward) => (
              <RewardCard
                key={reward.id}
                reward={reward}
                eternas={character.eternas}
                onPurchase={() => handlePurchase(reward)}
                onEdit={() => openEdit(reward)}
                onDelete={() => handleDelete(reward)}
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-text-primary">Куплено</h2>
        {purchasedRewards.length === 0 ? (
          <div className="rounded-lg border border-border bg-surface p-4 text-sm text-text-muted">
            Пока ничего не куплено
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {purchasedRewards.map((reward) => (
              <RewardCard
                key={reward.id}
                reward={reward}
                eternas={character.eternas}
                onDelete={() => handleDelete(reward)}
              />
            ))}
          </div>
        )}
      </section>

      <RewardModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        initialReward={editingReward}
      />
      {dialog}
    </div>
  );
}
