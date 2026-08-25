import { STORAGE_KEYS } from './storage';

const BACKUP_APP_ID = 'eterna';

interface BackupFile {
  app: string;
  exportedAt: string;
  data: Record<string, unknown>;
}

export function exportBackup(): void {
  const data: Record<string, unknown> = {};
  for (const key of Object.values(STORAGE_KEYS)) {
    const raw = localStorage.getItem(key);
    if (raw === null) continue;
    try {
      data[key] = JSON.parse(raw);
    } catch {
      // skip unparseable entries rather than corrupting the backup
    }
  }

  const backup: BackupFile = {
    app: BACKUP_APP_ID,
    exportedAt: new Date().toISOString(),
    data,
  };

  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `eterna-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function parseBackupFile(text: string): Record<string, unknown> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('Файл повреждён или не является корректным JSON');
  }
  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    (parsed as BackupFile).app !== BACKUP_APP_ID ||
    typeof (parsed as BackupFile).data !== 'object' ||
    (parsed as BackupFile).data === null
  ) {
    throw new Error('Это не похоже на файл бэкапа Этерны');
  }
  return (parsed as BackupFile).data;
}

export function applyBackup(data: Record<string, unknown>): void {
  const knownKeys = new Set<string>(Object.values(STORAGE_KEYS));
  for (const [key, value] of Object.entries(data)) {
    if (!knownKeys.has(key)) continue;
    localStorage.setItem(key, JSON.stringify(value));
  }
}
