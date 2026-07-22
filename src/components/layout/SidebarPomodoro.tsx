import { useLayoutEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { usePomodoros } from '../../hooks/usePomodoros';
import { useTasks } from '../../hooks/useTasks';
import { formatRemaining } from '../../utils/formatTime';

export default function SidebarPomodoro() {
  const { active, completePomodoro, cancelPomodoro } = usePomodoros();
  const { tasks } = useTasks();
  const [now, setNow] = useState(Date.now());

  const isRunning = active?.status === 'running';

  useLayoutEffect(() => {
    if (!isRunning) return;
    setNow(Date.now());
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [isRunning]);

  if (!active) return null;

  const task = tasks.find((t) => t.id === active.taskId);
  const remainingMs =
    isRunning && active.endsAt ? new Date(active.endsAt).getTime() - now : (active.remainingMs ?? 0);

  return (
    <div className="border-t border-border px-4 py-3">
      <div className="text-xs text-text-muted">{isRunning ? '🍅 Помидор идёт' : '⏸ Помидор на паузе'}</div>
      <Link
        to={task ? `/tasks/${task.id}` : '/tasks'}
        className="mt-1 block truncate text-sm font-medium text-text-primary hover:underline"
      >
        {task?.title ?? 'Задача удалена'}
      </Link>
      <div
        className={`mt-1 text-lg font-semibold tabular-nums ${isRunning ? 'text-accent-xp' : 'text-text-muted'}`}
      >
        {formatRemaining(remainingMs)}
      </div>
      <div className="mt-2 flex gap-2">
        {isRunning ? (
          <button
            onClick={cancelPomodoro}
            className="rounded px-2 py-1 text-xs text-text-muted hover:bg-white/[0.04] hover:text-text-primary"
          >
            Прервать
          </button>
        ) : (
          <>
            <button
              onClick={completePomodoro}
              className="rounded px-2 py-1 text-xs text-text-muted hover:bg-white/[0.04] hover:text-text-primary"
            >
              Завершить
            </button>
            <button
              onClick={cancelPomodoro}
              className="rounded px-2 py-1 text-xs text-text-muted hover:bg-white/[0.04] hover:text-text-primary"
            >
              Отменить
            </button>
          </>
        )}
      </div>
    </div>
  );
}
