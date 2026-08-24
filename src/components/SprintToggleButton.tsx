interface SprintToggleButtonProps {
  active: boolean;
  onClick: () => void;
}

export default function SprintToggleButton({ active, onClick }: SprintToggleButtonProps) {
  return (
    <button
      onClick={onClick}
      title={active ? 'Убрать из проектов-спринтов' : 'Сделать одним из 3 главных проектов-спринтов (×1.2 к наградам за задачи)'}
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded border text-base transition-colors ${
        active
          ? 'border-accent-xp bg-accent-xp/15 text-accent-xp'
          : 'border-border text-text-muted hover:bg-overlay/[0.04] hover:text-text-primary'
      }`}
    >
      🚀
    </button>
  );
}
