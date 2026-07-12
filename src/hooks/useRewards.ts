import { characterStore, historyStore, rewardsStore } from './stores';
import type { Reward, RewardStatus } from '../types';
import { generateId } from '../utils/ids';
import { pushToast } from './useToast';

export interface NewRewardInput {
  title: string;
  costEternas: number;
  costMoney: number | null;
  status: RewardStatus;
}

export function useRewards(): {
  rewards: Reward[];
  addReward: (input: NewRewardInput) => void;
  updateReward: (id: string, patch: Partial<NewRewardInput>) => void;
  deleteReward: (id: string) => void;
  purchaseReward: (id: string) => void;
} {
  const [rewards, setRewards] = rewardsStore.useStore();

  function addReward(input: NewRewardInput) {
    const reward: Reward = {
      id: generateId(),
      title: input.title,
      costEternas: input.costEternas,
      costMoney: input.costMoney,
      status: input.status,
      createdAt: new Date().toISOString(),
      purchasedAt: null,
    };
    setRewards((prev) => [...prev, reward]);
  }

  function updateReward(id: string, patch: Partial<NewRewardInput>) {
    setRewards((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function deleteReward(id: string) {
    setRewards((prev) => prev.filter((r) => r.id !== id));
  }

  function purchaseReward(id: string) {
    const reward = rewards.find((r) => r.id === id);
    if (!reward) return;

    const current = characterStore.getSnapshot();
    if (current.eternas < reward.costEternas) {
      pushToast('Недостаточно этерн для этой награды', 'error');
      return;
    }

    const purchasedAt = new Date().toISOString();
    characterStore.set((prev) => ({ ...prev, eternas: prev.eternas - reward.costEternas }));
    setRewards((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: 'purchased', purchasedAt } : r)),
    );

    historyStore.set((prev) => [
      {
        id: generateId(),
        type: 'reward_purchased',
        label: reward.title,
        xpDelta: 0,
        eternasDelta: -reward.costEternas,
        createdAt: purchasedAt,
      },
      ...prev,
    ]);

    pushToast(`Награда получена: ${reward.title}`, 'success');
  }

  return { rewards, addReward, updateReward, deleteReward, purchaseReward };
}
