import { usePomodoros } from '../hooks/usePomodoros';
import { formatRemaining } from '../utils/formatTime';
import Button from './ui/Button';

export default function PausedPomodoroBar() {
  const { active, completePomodoro, cancelPomodoro } = usePomodoros();

  if (!active || active.status !== 'paused') return null;

  return (
    <div className="fixed bottom-5 left-[calc(220px+20px)] z-[90] flex items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3">
      <span className="text-sm font-medium text-text-primary tabular-nums">
        ⏸ Помидор на паузе · {formatRemaining(active.remainingMs ?? 0)}
      </span>
      <Button variant="ghost" onClick={completePomodoro}>
        Завершить
      </Button>
      <Button variant="ghost" onClick={cancelPomodoro}>
        Отменить
      </Button>
    </div>
  );
}
