import { historyStore } from './stores';
import type { HistoryEntry } from '../types';

export function useHistory(): HistoryEntry[] {
  const [history] = historyStore.useStore();
  return history;
}
