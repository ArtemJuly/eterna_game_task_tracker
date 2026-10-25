import { activeBreakStore, settingsStore } from './stores';
import type { ActiveBreak } from '../types';
import { playChime } from '../utils/sound';
import { notify, requestNotificationPermission } from '../utils/notify';
import { pushToast } from './useToast';

export function useBreak(): {
  activeBreak: ActiveBreak | null;
  startBreak: () => void;
  completeBreak: () => void;
  cancelBreak: () => void;
} {
  const [activeBreak, setActiveBreak] = activeBreakStore.useStore();

  function startBreak() {
    if (activeBreak) return;
    requestNotificationPermission();
    const durationMinutes = settingsStore.getSnapshot().breakDurationMinutes ?? 5;
    const now = new Date();
    setActiveBreak({
      startedAt: now.toISOString(),
      endsAt: new Date(now.getTime() + durationMinutes * 60000).toISOString(),
      durationMinutes,
    });
  }

  function completeBreak() {
    if (!activeBreak) return;
    setActiveBreak(null);
    playChime();
    notify('Перерыв закончен ☕', 'Пора возвращаться к делам');
    pushToast('Перерыв закончен ☕', 'success');
  }

  function cancelBreak() {
    if (!activeBreak) return;
    setActiveBreak(null);
  }

  return { activeBreak, startBreak, completeBreak, cancelBreak };
}
