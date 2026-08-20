import { useEffect, useRef, useState } from 'react';
import { getTodayDateString, addDaysToDateString } from '../utils/today';
import { RECURRENCE_PRESETS } from '../utils/recurrence';
import {
  MONTH_NAMES,
  MONTH_SHORT,
  WEEKDAY_HEADERS,
  WEEKDAY_SHORT_BY_DOW,
  buildMonthCells,
  formatDueDateLabel,
  nextWeekday,
  parseDateStr,
} from '../utils/dueDateFormat';

interface DueDatePickerProps {
  dueDate: string | null;
  onDueDateChange: (date: string | null) => void;
  recurrenceMode: string;
  onRecurrenceModeChange: (mode: string) => void;
  customDays: number;
  onCustomDaysChange: (days: number) => void;
  compact?: boolean;
}

const POPOVER_WIDTH = 288;
const POPOVER_HEIGHT = 470;

export default function DueDatePicker({
  dueDate,
  onDueDateChange,
  recurrenceMode,
  onRecurrenceModeChange,
  customDays,
  onCustomDaysChange,
  compact = false,
}: DueDatePickerProps) {
  const today = getTodayDateString();
  const [open, setOpen] = useState(false);
  const [recurrenceOpen, setRecurrenceOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => parseDateStr(dueDate ?? today));
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      if (popoverRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  function openPicker() {
    setViewDate(parseDateStr(dueDate ?? today));
    setRecurrenceOpen(false);
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) {
      let left = rect.left;
      if (left + POPOVER_WIDTH > window.innerWidth - 8) left = window.innerWidth - POPOVER_WIDTH - 8;
      left = Math.max(8, left);
      let top = rect.bottom + 4;
      if (top + POPOVER_HEIGHT > window.innerHeight - 8) top = rect.top - POPOVER_HEIGHT - 4;
      top = Math.max(8, top);
      setPosition({ top, left });
    }
    setOpen(true);
  }

  const year = viewDate.getFullYear();
  const monthIdx = viewDate.getMonth();
  const cells = buildMonthCells(year, monthIdx);

  const quickOptions = [
    { label: 'Сегодня', date: today },
    { label: 'Завтра', date: addDaysToDateString(today, 1) },
    { label: 'На выходных', date: nextWeekday(today, 5, 0) },
    { label: 'След. неделя', date: nextWeekday(today, 0, 1) },
  ];

  const recurrenceLabel =
    recurrenceMode === 'none'
      ? null
      : recurrenceMode === 'custom'
        ? `каждые ${customDays} дн.`
        : (RECURRENCE_PRESETS.find((p) => String(p.days) === recurrenceMode)?.label ?? null);

  const isOverdue = dueDate !== null && dueDate < today;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => (open ? setOpen(false) : openPicker())}
        className={`inline-flex items-center gap-1 outline-none ${
          compact ? 'rounded-[4px] border px-2 py-0.5 text-xs font-medium' : 'w-full gap-1.5 rounded border px-3 py-2 text-sm'
        } ${
          isOverdue
            ? 'border-danger/40 bg-danger/[0.06] text-danger'
            : dueDate || recurrenceLabel
              ? 'border-accent-xp/40 bg-accent-xp/[0.06] text-text-primary'
              : 'border-border bg-bg text-text-muted hover:text-text-primary'
        }`}
      >
        {dueDate ? (
          <>
            📅 {formatDueDateLabel(dueDate, today)}
            {recurrenceLabel && ' 🔁'}
          </>
        ) : recurrenceLabel ? (
          <>🔁 {recurrenceLabel}</>
        ) : (
          '📅 Срок +'
        )}
      </button>

      {open && position && (
        <div
          ref={popoverRef}
          style={{ top: position.top, left: position.left }}
          className="fixed z-[60] w-72 rounded-lg border border-border bg-surface p-3 shadow-xl"
        >
          <div className="flex flex-col gap-0.5">
            {quickOptions.map((opt) => (
              <button
                key={opt.label}
                type="button"
                onClick={() => {
                  onDueDateChange(opt.date);
                  setOpen(false);
                }}
                className="flex items-center justify-between rounded px-2 py-1.5 text-sm text-text-primary hover:bg-overlay/[0.05]"
              >
                <span>{opt.label}</span>
                <span className="text-xs text-text-muted">
                  {opt.label === 'След. неделя'
                    ? `${WEEKDAY_SHORT_BY_DOW[parseDateStr(opt.date).getDay()]} ${parseDateStr(opt.date).getDate()} ${
                        MONTH_SHORT[parseDateStr(opt.date).getMonth()]
                      }`
                    : WEEKDAY_SHORT_BY_DOW[parseDateStr(opt.date).getDay()]}
                </span>
              </button>
            ))}
          </div>

          <div className="my-2 border-t border-border" />

          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setViewDate(new Date(year, monthIdx - 1, 1))}
              className="rounded px-2 py-1 text-text-muted hover:bg-overlay/[0.05] hover:text-text-primary"
            >
              ‹
            </button>
            <span className="text-sm font-medium text-text-primary">
              {MONTH_NAMES[monthIdx]} {year}
            </span>
            <button
              type="button"
              onClick={() => setViewDate(new Date(year, monthIdx + 1, 1))}
              className="rounded px-2 py-1 text-text-muted hover:bg-overlay/[0.05] hover:text-text-primary"
            >
              ›
            </button>
          </div>

          <div className="grid grid-cols-7 gap-y-1 text-center">
            {WEEKDAY_HEADERS.map((w) => (
              <span key={w} className="text-xs text-text-muted">
                {w}
              </span>
            ))}
            {cells.map((cellDate, i) =>
              cellDate ? (
                <button
                  key={cellDate}
                  type="button"
                  onClick={() => {
                    onDueDateChange(cellDate);
                    setOpen(false);
                  }}
                  className={`mx-auto flex h-7 w-7 items-center justify-center rounded-full text-xs tabular-nums ${
                    cellDate === dueDate
                      ? 'bg-accent-xp text-white'
                      : cellDate === today
                        ? 'border border-accent-xp text-accent-xp'
                        : 'text-text-primary hover:bg-overlay/[0.05]'
                  }`}
                >
                  {parseDateStr(cellDate).getDate()}
                </button>
              ) : (
                <span key={`blank-${i}`} />
              ),
            )}
          </div>

          <div className="mt-2 border-t border-border pt-2">
            {dueDate && (
              <button
                type="button"
                onClick={() => {
                  onDueDateChange(null);
                  setOpen(false);
                }}
                className="mb-1 block w-full rounded px-2 py-1.5 text-left text-sm text-danger hover:bg-danger/10"
              >
                ✕ Убрать срок
              </button>
            )}
            {recurrenceOpen ? (
              <div className="flex flex-col gap-2">
                <select
                  value={recurrenceMode}
                  onChange={(e) => onRecurrenceModeChange(e.target.value)}
                  className="w-full rounded border border-border bg-bg px-2 py-1.5 text-sm text-text-primary outline-none focus:border-accent-xp"
                >
                  <option value="none">Нет повтора</option>
                  {RECURRENCE_PRESETS.map((p) => (
                    <option key={p.days} value={p.days}>
                      {p.label}
                    </option>
                  ))}
                  <option value="custom">Свой интервал</option>
                </select>
                {recurrenceMode === 'custom' && (
                  <input
                    type="number"
                    min={1}
                    value={customDays}
                    onChange={(e) => onCustomDaysChange(Number(e.target.value))}
                    placeholder="Каждые сколько дней"
                    className="w-full rounded border border-border bg-bg px-2 py-1.5 text-sm text-text-primary tabular-nums outline-none focus:border-accent-xp"
                  />
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setRecurrenceOpen(true)}
                className="flex w-full items-center gap-1.5 rounded px-2 py-1.5 text-left text-sm text-text-muted hover:bg-overlay/[0.05] hover:text-text-primary"
              >
                🔁 {recurrenceLabel ? recurrenceLabel : 'Повтор'}
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
