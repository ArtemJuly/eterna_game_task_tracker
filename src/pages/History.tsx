import { useMemo, useState } from 'react';
import { useHistory } from '../hooks/useHistory';
import type { HistoryEntry } from '../types';

const PAGE_SIZE = 20;

const TYPE_PREFIX: Record<HistoryEntry['type'], string> = {
  task_done: 'Выполнил',
  reward_purchased: 'Купил награду',
  task_cancelled: 'Отменил',
  project_done: 'Завершил проект',
  pomodoro_completed: 'Помидор',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function History() {
  const history = useHistory();
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const sorted = useMemo(
    () => [...history].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [history],
  );
  const visible = sorted.slice(0, visibleCount);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-text-primary">История</h1>

      {sorted.length === 0 ? (
        <div className="rounded-lg border border-border bg-surface p-4 text-sm text-text-muted">
          Записей пока нет
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {visible.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center justify-between rounded-lg border border-border bg-surface px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <span className="text-xs text-text-muted tabular-nums">{formatDate(entry.createdAt)}</span>
                <span className="text-sm text-text-primary">
                  {TYPE_PREFIX[entry.type]}: «{entry.label}»
                </span>
              </div>
              <div className="flex items-center gap-3 text-sm tabular-nums">
                {entry.xpDelta !== 0 && (
                  <span className="text-accent-xp">+{entry.xpDelta} XP</span>
                )}
                {entry.eternasDelta !== 0 && (
                  <span className={entry.eternasDelta < 0 ? 'text-danger' : 'text-accent-eternas'}>
                    {entry.eternasDelta > 0 ? '+' : ''}
                    {entry.eternasDelta} ✦
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {visibleCount < sorted.length && (
        <button
          onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
          className="self-center rounded border border-border px-4 py-2 text-sm text-text-muted hover:bg-overlay/[0.04] hover:text-text-primary"
        >
          Показать ещё
        </button>
      )}
    </div>
  );
}
