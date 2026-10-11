import { projectsStore, tasksStore, timeCategoriesStore, timeEntriesStore } from './stores';
import type { TimeCategory } from '../types';
import { generateId } from '../utils/ids';
import { nextTimeCategoryColor } from '../utils/timeTrackerColors';

function normalizeCategory(c: TimeCategory): TimeCategory {
  return {
    ...c,
    color: c.color ?? nextTimeCategoryColor(0),
  };
}

export function useTimeCategories(): {
  categories: TimeCategory[];
  addCategory: (title: string) => void;
  renameCategory: (id: string, title: string) => void;
  deleteCategory: (id: string) => void;
} {
  const [rawCategories, setCategories] = timeCategoriesStore.useStore();
  const categories = rawCategories.map(normalizeCategory);

  function addCategory(title: string) {
    const category: TimeCategory = {
      id: generateId(),
      title,
      color: nextTimeCategoryColor(categories.length),
      createdAt: new Date().toISOString(),
    };
    setCategories((prev) => [...prev, category]);
  }

  function renameCategory(id: string, title: string) {
    setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, title } : c)));
  }

  function deleteCategory(id: string) {
    setCategories((prev) => prev.filter((c) => c.id !== id));
    tasksStore.set((prev) =>
      prev.map((t) => ({ ...t, timeCategoryIds: (t.timeCategoryIds ?? []).filter((cid) => cid !== id) })),
    );
    projectsStore.set((prev) =>
      prev.map((p) => ({ ...p, timeCategoryIds: (p.timeCategoryIds ?? []).filter((cid) => cid !== id) })),
    );
    timeEntriesStore.set((prev) => prev.filter((e) => e.categoryId !== id));
  }

  return { categories, addCategory, renameCategory, deleteCategory };
}
