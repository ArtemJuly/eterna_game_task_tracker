import { useSyncExternalStore } from 'react';
import { readStorage, writeStorage } from './storage';
import { pushToServer, registerStoreKey } from './syncClient';

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
    pushToServer(key, state);
    listeners.forEach((l) => l());
  }

  // Applied when the local sync server has a newer value from another browser —
  // skips re-pushing it back (that would just echo it to the server pointlessly).
  function applyExternal(value: T) {
    ensureInitialized();
    state = value;
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

  registerStoreKey(key, {
    applyExternal: (value) => applyExternal(value as T),
    getCurrent: getSnapshot,
    fallback,
  });

  return { useStore, set, getSnapshot };
}
