import { useEffect, useRef, useState, type ReactNode } from 'react';

interface TaskCardMenuProps {
  onEdit: () => void;
  onDelete: () => void;
  children?: ReactNode;
}

const MENU_WIDTH = 224;

export default function TaskCardMenu({ onEdit, onDelete, children }: TaskCardMenuProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      if (menuRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  function openMenu() {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) {
      let left = rect.right - MENU_WIDTH;
      left = Math.max(8, Math.min(left, window.innerWidth - MENU_WIDTH - 8));
      const top = Math.min(rect.bottom + 4, window.innerHeight - 8);
      setPosition({ top, left });
    }
    setOpen(true);
  }

  return (
    <div className="relative shrink-0">
      <button
        ref={triggerRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          if (open) setOpen(false);
          else openMenu();
        }}
        title="Действия"
        className={`flex h-6 w-6 items-center justify-center rounded text-text-muted transition-opacity hover:bg-overlay/[0.06] hover:text-text-primary ${
          open ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        }`}
      >
        •••
      </button>
      {open && position && (
        <div
          ref={menuRef}
          style={{ top: position.top, left: position.left, width: MENU_WIDTH }}
          className="fixed z-[60] flex flex-col gap-0.5 rounded-lg border border-border bg-surface p-1.5 text-sm shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onEdit();
            }}
            className="flex items-center gap-2 rounded px-2 py-1.5 text-left text-text-primary hover:bg-overlay/[0.06]"
          >
            ✏️ Редактировать
          </button>
          {children}
          <div className="my-1 border-t border-border" />
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onDelete();
            }}
            className="flex items-center gap-2 rounded px-2 py-1.5 text-left text-danger hover:bg-danger/10"
          >
            🗑 Удалить
          </button>
        </div>
      )}
    </div>
  );
}
