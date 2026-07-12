interface ProgressBarProps {
  percent: number;
  gradient?: boolean;
  pulse?: boolean;
  height?: number;
}

export default function ProgressBar({ percent, gradient = false, pulse = false, height = 6 }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <div
      className="w-full rounded-full bg-white/5 overflow-hidden"
      style={{ height }}
    >
      <div
        className={`h-full rounded-full transition-[width] duration-300 ${pulse ? 'xp-bar-pulse' : ''} ${
          gradient ? '' : 'bg-accent-eternas'
        }`}
        style={{
          width: `${clamped}%`,
          background: gradient
            ? 'linear-gradient(90deg, var(--accent-xp), var(--accent-eternas))'
            : undefined,
        }}
      />
    </div>
  );
}
