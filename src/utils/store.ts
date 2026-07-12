import { useSyncExternalStore } from 'react';
import { readStorage, writeStorage } from './storage';

export function createStore<T>(key: string, fallback: T) {
  let state: T;
  let initialized = false;
  const listeners = new Set<() => void>();

  function ensureInitialized() {
    if (!initialized) {
      state = readStorage<T>(key, fallback);
      initialized = true;
    }
  }

  function set(next: T | ((prev: T) => T)) {
    ensureInitialized();
    state = typeof next === 'function' ? (next as (prev: T) => T)(state) : next;
    writeStorage(key, state);
    listeners.forEach((l) => l());
  }

  function subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('storage', (e) => {
      if (e.key !== key) return;
      state = readStorage<T>(key, fallback);
      initialized = true;
      listeners.forEach((l) => l());
    });
  }

  function getSnapshot() {
    ensureInitialized();
    return state;
  }

  function useStore(): [T, (next: T | ((prev: T) => T)) => void] {
    const snapshot = useSyncExternalStore(subscribe, getSnapshot);
    return [snapshot, set];
  }

  return { useStore, set, getSnapshot };
}
