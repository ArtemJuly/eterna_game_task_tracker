import { createVolatileStore } from '../utils/volatileStore';

const pulseStore = createVolatileStore<number>(0);

export function triggerXpPulse(): void {
  pulseStore.set(Date.now());
}

export function useXpPulse(): number {
  return pulseStore.useStore();
}
