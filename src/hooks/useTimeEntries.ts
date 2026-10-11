import { timeEntriesStore } from './stores';
import type { TimeEntry } from '../types';
import { generateId } from '../utils/ids';

export interface NewTimeEntryInput {
  categoryId: string;
  date: string;
  durationMinutes: number;
  note: string;
}

function normalizeEntry(e: TimeEntry): TimeEntry {
  return {
    ...e,
    note: e.note ?? '',
  };
}

export function useTimeEntries(): {
  entries: TimeEntry[];
  addEntry: (input: NewTimeEntryInput) => void;
  deleteEntry: (id: string) => void;
} {
  const [rawEntries, setEntries] = timeEntriesStore.useStore();
  const entries = rawEntries.map(normalizeEntry);

  function addEntry(input: NewTimeEntryInput) {
    const entry: TimeEntry = {
      id: generateId(),
      categoryId: input.categoryId,
      date: input.date,
      durationMinutes: Math.max(0, input.durationMinutes),
      note: input.note,
      createdAt: new Date().toISOString(),
    };
    setEntries((prev) => [...prev, entry]);
  }

  function deleteEntry(id: string) {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  return { entries, addEntry, deleteEntry };
}
