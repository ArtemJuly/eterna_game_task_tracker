import type { ReactNode } from 'react';

type Tone = 'default' | 'xp' | 'eternas' | 'success' | 'danger' | 'muted';

interface BadgeProps {
  children: ReactNode;
  tone?: Tone;
}

const toneClasses: Record<Tone, string> = {
  default: 'bg-white/5 text-text-primary border-border',
  xp: 'bg-accent-xp/10 text-accent-xp border-accent-xp/30',
  eternas: 'bg-accent-eternas/10 text-accent-eternas border-accent-eternas/30',
  success: 'bg-success/10 text-success border-success/30',
  danger: 'bg-danger/10 text-danger border-danger/30',
  muted: 'bg-white/5 text-text-muted border-border',
};

export default function Badge({ children, tone = 'default' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-[4px] border px-2 py-0.5 text-xs font-medium ${toneClasses[tone]}`}
    >
      {children}
    </span>
  );
}
