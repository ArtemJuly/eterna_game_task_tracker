interface ActiveStatusToggleProps {
  active: boolean;
  onClick: () => void;
}

export default function ActiveStatusToggle({ active, onClick }: ActiveStatusToggleProps) {
  return (
    <button
      onClick={onClick}
      title={active ? 'Сделать неактивным' : 'Сделать активным (максимум 5 одновременно)'}
      className={`inline-flex items-center rounded-[4px] border px-2 py-0.5 text-xs font-medium transition-colors ${
        active
          ? 'border-success/30 bg-success/10 text-success hover:bg-success/20'
          : 'border-border bg-white/5 text-text-muted hover:bg-white/10'
      }`}
    >
      {active ? '⚡ Активен' : '💤 Неактивен'}
    </button>
  );
}
