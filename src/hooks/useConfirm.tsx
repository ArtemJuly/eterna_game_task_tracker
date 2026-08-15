import { useState } from 'react';
import type { ReactNode } from 'react';
import ConfirmDialog from '../components/ui/ConfirmDialog';

interface ConfirmOptions {
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
}

export function useConfirm(): { confirm: (options: ConfirmOptions) => void; dialog: React.ReactNode } {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);

  function confirm(opts: ConfirmOptions) {
    setOptions(opts);
  }

  function handleConfirm() {
    if (!options) return;
    options.onConfirm();
    setOptions(null);
  }

  const dialog = (
    <ConfirmDialog
      open={options !== null}
      title={options?.title ?? ''}
      message={options?.message ?? ''}
      confirmLabel={options?.confirmLabel}
      danger={options?.danger}
      onConfirm={handleConfirm}
      onClose={() => setOptions(null)}
    />
  );

  return { confirm, dialog };
}
