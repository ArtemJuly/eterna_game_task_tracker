import { timeCategoriesStore } from './stores';
import type { TimeCategory } from '../types';
import { generateId } from '../utils/ids';
import { nextTimeCategoryColor } from '../utils/timeTrackerColors';

function normalizeCategory(c: TimeCategory): TimeCategory {
  return {
    ...c,
    hours: c.hours ?? 0,
    color: c.color ?? nextTimeCategoryColor(0),
  };
}

export function useTimeCategories(): {
  categories: TimeCategory[];
  addCategory: (title: string, hours: number) => void;
  renameCategory: (id: string, title: string) => void;
  setCategoryHours: (id: string, hours: number) => void;
  deleteCategory: (id: string) => void;
} {
  const [rawCategories, setCategories] = timeCategoriesStore.useStore();
  const categories = rawCategories.map(normalizeCategory);

  function addCategory(title: string, hours: number) {
    const category: TimeCategory = {
      id: generateId(),
      title,
      hours: Math.max(0, hours),
      color: nextTimeCategoryColor(categories.length),
      createdAt: new Date().toISOString(),
    };
    setCategories((prev) => [...prev, category]);
  }

  function renameCategory(id: string, title: string) {
    setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, title } : c)));
  }

  function setCategoryHours(id: string, hours: number) {
    setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, hours: Math.max(0, hours) } : c)));
  }

  function deleteCategory(id: string) {
    setCategories((prev) => prev.filter((c) => c.id !== id));
  }

  return { categories, addCategory, renameCategory, setCategoryHours, deleteCategory };
}
