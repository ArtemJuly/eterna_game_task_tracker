// Bridges each createStore() to the local sync server (server/index.js) so every
// browser on this computer shares the same data instead of each one keeping its
// own isolated localStorage. localStorage stays as the instant local cache and
// offline fallback — if the server isn't running, the app keeps working exactly
// as before, just without cross-browser sync.
const API_BASE = 'http://localhost:4310';
const PUSH_DEBOUNCE_MS = 300;
const POLL_INTERVAL_MS = 4000;

interface RegisteredStore {
  applyExternal: (value: unknown) => void;
  getCurrent: () => unknown;
  fallback: unknown;
}

const registry = new Map<string, RegisteredStore>();
const pushTimers = new Map<string, ReturnType<typeof setTimeout>>();

export function registerStoreKey(key: string, store: RegisteredStore): void {
  registry.set(key, store);
}

export function pushToServer(key: string, value: unknown): void {
  const existing = pushTimers.get(key);
  if (existing) clearTimeout(existing);
  pushTimers.set(
    key,
    setTimeout(() => {
      pushTimers.delete(key);
      fetch(`${API_BASE}/api/store/${encodeURIComponent(key)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(value),
      }).catch(() => {
        // Sync server not running — this browser keeps working from localStorage alone.
      });
    }, PUSH_DEBOUNCE_MS),
  );
}

async function hydrateOnce(isFirstRun: boolean): Promise<void> {
  try {
    const res = await fetch(`${API_BASE}/api/store`);
    if (!res.ok) return;
    const data = (await res.json()) as Record<string, unknown>;
    for (const [key, entry] of registry.entries()) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        entry.applyExternal(data[key]);
        continue;
      }
      // The server has never seen this key. On first run only, seed it from
      // this browser's existing localStorage — but only when that local value
      // actually differs from the store's own empty/default fallback. A freshly
      // opened browser with nothing in it must never "seed" its emptiness and
      // clobber another browser's real data that just hasn't synced yet.
      if (isFirstRun) {
        const current = entry.getCurrent();
        if (JSON.stringify(current) !== JSON.stringify(entry.fallback)) {
          pushToServer(key, current);
        }
      }
    }
  } catch {
    // Sync server not running — nothing to hydrate from.
  }
}

// Called once at app startup: an immediate hydrate (plus first-run seeding of
// any real local data the server doesn't have yet) so other browsers' changes
// show up on load, then light polling so they keep showing up while the tab
// stays open (no server push/WebSocket needed for a single-user, same-machine
// setup).
export function startSync(): void {
  hydrateOnce(true);
  setInterval(() => hydrateOnce(false), POLL_INTERVAL_MS);
}
