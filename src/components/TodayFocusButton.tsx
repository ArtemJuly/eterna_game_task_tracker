interface TodayFocusButtonProps {
  active: boolean;
  onClick: () => void;
}

export default function TodayFocusButton({ active, onClick }: TodayFocusButtonProps) {
  return (
    <button
      onClick={onClick}
      title={active ? 'Убрать из главных на сегодня' : 'Сделать одной из 3 главных задач на сегодня'}
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded border text-base transition-colors ${
        active
          ? 'border-accent-xp bg-accent-xp/15 text-accent-xp'
          : 'border-border text-text-muted hover:bg-white/[0.04] hover:text-text-primary'
      }`}
    >
      {active ? '★' : '☆'}
    </button>
  );
}
