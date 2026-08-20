import { useEffect, useState } from 'react';
import type { Task } from '../types';
import { RECURRENCE_PRESETS } from '../utils/recurrence';
import DueDatePicker from './DueDatePicker';

const PRESET_DAYS = RECURRENCE_PRESETS.map((p) => p.days);

function modeForInterval(intervalDays: number | null): string {
  if (intervalDays === null) return 'none';
  if (PRESET_DAYS.includes(intervalDays)) return String(intervalDays);
  return 'custom';
}

interface TaskDueDateControlProps {
  task: Task;
  onUpdate: (patch: { dueDate?: string | null; recurrenceIntervalDays?: number | null }) => void;
}

export default function TaskDueDateControl({ task, onUpdate }: TaskDueDateControlProps) {
  const [recurrenceMode, setRecurrenceMode] = useState(() => modeForInterval(task.recurrenceIntervalDays));
  const [customDays, setCustomDays] = useState(() =>
    task.recurrenceIntervalDays !== null && !PRESET_DAYS.includes(task.recurrenceIntervalDays)
      ? task.recurrenceIntervalDays
      : 3,
  );

  useEffect(() => {
    setRecurrenceMode(modeForInterval(task.recurrenceIntervalDays));
    if (task.recurrenceIntervalDays !== null && !PRESET_DAYS.includes(task.recurrenceIntervalDays)) {
      setCustomDays(task.recurrenceIntervalDays);
    }
  }, [task.recurrenceIntervalDays]);

  function handleRecurrenceModeChange(mode: string) {
    setRecurrenceMode(mode);
    const days = mode === 'none' ? null : mode === 'custom' ? Math.max(1, customDays) : Number(mode);
    onUpdate({ recurrenceIntervalDays: days });
  }

  function handleCustomDaysChange(days: number) {
    setCustomDays(days);
    if (recurrenceMode === 'custom') onUpdate({ recurrenceIntervalDays: Math.max(1, days) });
  }

  return (
    <DueDatePicker
      compact
      dueDate={task.dueDate}
      onDueDateChange={(date) => onUpdate({ dueDate: date })}
      recurrenceMode={recurrenceMode}
      onRecurrenceModeChange={handleRecurrenceModeChange}
      customDays={customDays}
      onCustomDaysChange={handleCustomDaysChange}
    />
  );
}
