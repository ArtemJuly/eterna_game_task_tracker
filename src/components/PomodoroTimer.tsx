import { useEffect, useLayoutEffect, useState } from 'react';
import { usePomodoros } from '../hooks/usePomodoros';
import { formatRemaining } from '../utils/formatTime';
import Button from './ui/Button';

interface PomodoroTimerProps {
  taskId: string;
  active: boolean;
}

export default function PomodoroTimer({ taskId, active }: PomodoroTimerProps) {
  const {
    active: activePomodoro,
    startPomodoro,
    resumePomodoro,
    completePomodoro,
    cancelPomodoro,
    countCompletedForTask,
    totalMinutesForTask,
  } = usePomodoros();
  const [now, setNow] = useState(Date.now());

  const isRunningHere = activePomodoro?.status === 'running' && activePomodoro.taskId === taskId;
  const isPausedHere = activePomodoro?.status === 'paused' && activePomodoro.taskId === taskId;
  const canResumeElsewhere = activePomodoro?.status === 'paused' && activePomodoro.taskId !== taskId && active;
  const isBlockedByOther = activePomodoro !== null && !isRunningHere && !isPausedHere && !canResumeElsewhere;
  const count = countCompletedForTask(taskId);
  const totalMinutes = totalMinutesForTask(taskId);

  const endTime = isRunningHere && activePomodoro?.endsAt ? new Date(activePomodoro.endsAt).getTime() : null;
  const pausedRemainingMs = isPausedHere || canResumeElsewhere ? (activePomodoro?.remainingMs ?? 0) : null;

  useLayoutEffect(() => {
    if (!isRunningHere) return;
    setNow(Date.now());
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [isRunningHere]);

  useEffect(() => {
    if (!isRunningHere || endTime === null) return;
    if (now >= endTime) {
      completePomodoro();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now, isRunningHere, endTime]);

  return (
    <div className="flex items-center gap-2">
      {count > 0 && (
        <span className="text-sm text-text-muted tabular-nums">
          🍅 × {count} · {totalMinutes} мин
        </span>
      )}

      {isRunningHere && endTime !== null && (
        <>
          <span className="text-sm font-medium text-accent-xp tabular-nums">{formatRemaining(endTime - now)}</span>
          <Button variant="ghost" onClick={cancelPomodoro}>
            Прервать
          </Button>
        </>
      )}

      {isPausedHere && (
        <>
          <span className="text-sm font-medium text-text-muted tabular-nums">
            ⏸ {formatRemaining(pausedRemainingMs ?? 0)}
          </span>
          <Button variant="ghost" onClick={completePomodoro}>
            Завершить
          </Button>
          <Button variant="ghost" onClick={cancelPomodoro}>
            Отменить
          </Button>
        </>
      )}

      {canResumeElsewhere && (
        <Button variant="secondary" onClick={() => resumePomodoro(taskId)}>
          ▶ Продолжить {formatRemaining(pausedRemainingMs ?? 0)}
        </Button>
      )}

      {!isRunningHere && !isPausedHere && !canResumeElsewhere && active && (
        <Button variant="secondary" disabled={isBlockedByOther} onClick={() => startPomodoro(taskId)}>
          🍅 Начать помидор
        </Button>
      )}
    </div>
  );
}
