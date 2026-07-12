import { useToasts } from '../../hooks/useToast';

export default function ToastContainer() {
  const toasts = useToasts();

  return (
    <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`toast-enter rounded-lg border bg-surface px-4 py-3 text-sm font-medium shadow-none ${
            toast.variant === 'error'
              ? 'border-danger/40 text-danger'
              : 'border-border text-text-primary'
          }`}
        >
          {toast.variant === 'error' ? '✕' : '✓'} {toast.message}
        </div>
      ))}
    </div>
  );
}
