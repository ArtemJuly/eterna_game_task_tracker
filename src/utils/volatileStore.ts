import { useSyncExternalStore } from 'react';

export function createVolatileStore<T>(initial: T) {
  let state: T = initial;
  const listeners = new Set<() => void>();

  function set(next: T | ((prev: T) => T)) {
    state = typeof next === 'function' ? (next as (prev: T) => T)(state) : next;
    listeners.forEach((l) => l());
  }

  function subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  function getSnapshot() {
    return state;
  }

  function useStore(): T {
    return useSyncExternalStore(subscribe, getSnapshot);
  }

  return { useStore, set, getSnapshot };
}
