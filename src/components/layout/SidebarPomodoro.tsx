import { useEffect, useLayoutEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { usePomodoros } from '../../hooks/usePomodoros';
import { useBreak } from '../../hooks/useBreak';
import { useTasks } from '../../hooks/useTasks';
import { useProjects } from '../../hooks/useProjects';
import { formatRemaining } from '../../utils/formatTime';

export default function SidebarPomodoro() {
  const { active, startPomodoro, completePomodoro, cancelPomodoro } = usePomodoros();
  const { activeBreak, startBreak, completeBreak, cancelBreak } = useBreak();
  const { tasks } = useTasks();
  const { projects } = useProjects();
  const [now, setNow] = useState(Date.now());

  const isRunning = active?.status === 'running';

  useLayoutEffect(() => {
    if (!isRunning && !activeBreak) return;
    setNow(Date.now());
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [isRunning, activeBreak]);

  const endTime = isRunning && active?.endsAt ? new Date(active.endsAt).getTime() : null;

  useEffect(() => {
    if (!isRunning || endTime === null) return;
    if (now >= endTime) {
      completePomodoro();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now, isRunning, endTime]);

  const breakEndTime = activeBreak ? new Date(activeBreak.endsAt).getTime() : null;

  useEffect(() => {
    if (breakEndTime === null) return;
    if (now >= breakEndTime) {
      completeBreak();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now, breakEndTime]);

  // Show the countdown in the tab title so it's visible without switching back
  // to this tab — only while something is actually ticking (not while paused).
  // SidebarPomodoro is always mounted (part of the persistent sidebar), so this
  // branching alone is enough to always leave the title in the right state —
  // no unmount cleanup needed.
  useEffect(() => {
    if (activeBreak && breakEndTime !== null) {
      document.title = `☕ ${formatRemaining(Math.max(0, breakEndTime - now))} — eterna`;
    } else if (isRunning && endTime !== null) {
      document.title = `🍅 ${formatRemaining(Math.max(0, endTime - now))} — eterna`;
    } else {
      document.title = 'eterna';
    }
  }, [now, isRunning, endTime, activeBreak, breakEndTime]);

  if (activeBreak) {
    const remainingMs = Math.max(0, (breakEndTime ?? 0) - now);
    return (
      <div className="border-t border-border px-4 py-3">
        <div className="text-xs text-text-muted">☕ Перерыв идёт</div>
        <div className="mt-1 text-lg font-semibold tabular-nums text-accent-eternas">{formatRemaining(remainingMs)}</div>
        <div className="mt-2 flex gap-2">
          <button
            onClick={cancelBreak}
            className="rounded px-2 py-1 text-xs text-text-muted hover:bg-overlay/[0.04] hover:text-text-primary"
          >
            Прервать
          </button>
        </div>
      </div>
    );
  }

  if (!active) {
    return (
      <div className="flex gap-2 border-t border-border px-4 py-3">
        <button
          onClick={() => startPomodoro()}
          className="flex-1 rounded border border-border px-2 py-1.5 text-xs text-text-muted hover:bg-overlay/[0.04] hover:text-text-primary"
        >
          🍅 Начать помидор
        </button>
        <button
          onClick={startBreak}
          className="flex-1 rounded border border-border px-2 py-1.5 text-xs text-text-muted hover:bg-overlay/[0.04] hover:text-text-primary"
        >
          ☕ Начать перерыв
        </button>
      </div>
    );
  }

  const task = active.taskId ? tasks.find((t) => t.id === active.taskId) : undefined;
  const project = active.projectId ? projects.find((p) => p.id === active.projectId) : undefined;
  const remainingMs =
    isRunning && active.endsAt ? new Date(active.endsAt).getTime() - now : (active.remainingMs ?? 0);

  const linkTo = active.taskId ? `/tasks/${active.taskId}` : active.projectId ? `/projects/${active.projectId}` : null;
  const label = active.taskId
    ? (task?.title ?? 'Задача удалена')
    : active.projectId
      ? (project?.title ?? 'Проект удалён')
      : 'Свободный помидор';

  return (
    <div className="border-t border-border px-4 py-3">
      <div className="text-xs text-text-muted">{isRunning ? '🍅 Помидор идёт' : '⏸ Помидор на паузе'}</div>
      {linkTo ? (
        <Link to={linkTo} className="mt-1 block truncate text-sm font-medium text-text-primary hover:underline">
          {label}
        </Link>
      ) : (
        <div className="mt-1 truncate text-sm font-medium text-text-primary">{label}</div>
      )}
      <div
        className={`mt-1 text-lg font-semibold tabular-nums ${isRunning ? 'text-accent-xp' : 'text-text-muted'}`}
      >
        {formatRemaining(remainingMs)}
      </div>
      <div className="mt-2 flex gap-2">
        {isRunning ? (
          <button
            onClick={cancelPomodoro}
            className="rounded px-2 py-1 text-xs text-text-muted hover:bg-overlay/[0.04] hover:text-text-primary"
          >
            Прервать
          </button>
        ) : (
          <>
            <button
              onClick={completePomodoro}
              className="rounded px-2 py-1 text-xs text-text-muted hover:bg-overlay/[0.04] hover:text-text-primary"
            >
              Завершить
            </button>
            <button
              onClick={cancelPomodoro}
              className="rounded px-2 py-1 text-xs text-text-muted hover:bg-overlay/[0.04] hover:text-text-primary"
            >
              Отменить
            </button>
          </>
        )}
      </div>
    </div>
  );
}
