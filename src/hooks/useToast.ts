import { createVolatileStore } from '../utils/volatileStore';
import { generateId } from '../utils/ids';

export type ToastVariant = 'success' | 'error';

export interface ToastItem {
  id: string;
  message: string;
  variant: ToastVariant;
}

const toastStore = createVolatileStore<ToastItem[]>([]);

export function pushToast(message: string, variant: ToastVariant = 'success', durationMs = 3000): void {
  const id = generateId();
  toastStore.set((prev) => [...prev, { id, message, variant }]);
  setTimeout(() => {
    toastStore.set((prev) => prev.filter((t) => t.id !== id));
  }, durationMs);
}

export function useToasts(): ToastItem[] {
  return toastStore.useStore();
}
