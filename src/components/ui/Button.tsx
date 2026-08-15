import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

const variantClasses: Record<Variant, string> = {
  primary: 'bg-accent-xp text-white hover:opacity-90',
  secondary: 'bg-transparent border border-border text-text-primary hover:bg-overlay/[0.04]',
  danger: 'bg-transparent border border-border text-danger hover:bg-danger/10',
  ghost: 'bg-transparent text-text-muted hover:bg-overlay/[0.04] hover:text-text-primary',
};

export default function Button({ variant = 'primary', className = '', ...props }: ButtonProps) {
  return (
    <button
      className={`px-3 py-1.5 rounded text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:pointer-events-none disabled:opacity-40 ${variantClasses[variant]} ${className}`}
      {...props}
    />
  );
}
