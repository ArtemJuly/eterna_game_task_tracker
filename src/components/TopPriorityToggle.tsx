interface TopPriorityToggleProps {
  active: boolean;
  onClick: () => void;
}

export default function TopPriorityToggle({ active, onClick }: TopPriorityToggleProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={active ? 'Убрать из топ-3' : 'Отметить как одно из 3 главных направлений'}
      className={`inline-flex items-center gap-1 rounded-[4px] border px-2 py-0.5 text-xs font-medium transition-colors ${
        active
          ? 'border-accent-xp bg-accent-xp/15 text-accent-xp'
          : 'border-border bg-overlay/5 text-text-muted hover:bg-overlay/10'
      }`}
    >
      🎯 Топ-3
    </button>
  );
}
