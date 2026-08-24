interface ShowCompletedToggleProps {
  show: boolean;
  onClick: () => void;
}

export default function ShowCompletedToggle({ show, onClick }: ShowCompletedToggleProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={show ? 'Скрыть выполненные задачи' : 'Показывать выполненные задачи'}
      className={`inline-flex items-center rounded border px-3 py-2 text-sm font-medium transition-colors ${
        show
          ? 'border-accent-xp/40 bg-accent-xp/[0.06] text-text-primary'
          : 'border-border bg-surface text-text-muted hover:text-text-primary'
      }`}
    >
      {show ? '👁 Выполненные показаны' : '🙈 Выполненные скрыты'}
    </button>
  );
}
