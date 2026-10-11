import { useState } from 'react';
import { useTimeCategories } from '../hooks/useTimeCategories';
import { useConfirm } from '../hooks/useConfirm';
import Button from '../components/ui/Button';
import DonutChart from '../components/ui/DonutChart';

export default function TimeTracker() {
  const { categories, addCategory, renameCategory, setCategoryHours, deleteCategory } = useTimeCategories();
  const { confirm, dialog } = useConfirm();
  const [addingCategory, setAddingCategory] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newHours, setNewHours] = useState('0');

  const totalHours = categories.reduce((sum, c) => sum + c.hours, 0);
  const maxHours = Math.max(1, ...categories.map((c) => c.hours));

  function submitNewCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    addCategory(newTitle.trim(), Number(newHours) || 0);
    setNewTitle('');
    setNewHours('0');
    setAddingCategory(false);
  }

  function handleDelete(id: string, title: string) {
    confirm({
      title: 'Удалить категорию?',
      message: `«${title}» будет удалена без возможности восстановления.`,
      confirmLabel: 'Удалить',
      danger: true,
      onConfirm: () => deleteCategory(id),
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">TimeTracker</h1>
        <Button variant="primary" onClick={() => setAddingCategory(true)}>
          + Категория
        </Button>
      </div>

      {categories.length === 0 && !addingCategory ? (
        <div className="rounded-lg border border-border bg-surface p-4 text-sm text-text-muted">
          Пока нет категорий. Добавь первую, чтобы начать учитывать время.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="flex flex-col items-center gap-4 rounded-lg border border-border bg-surface p-5">
              <h2 className="self-start text-sm font-semibold text-text-muted">Доля времени, %</h2>
              <DonutChart
                segments={categories.map((c) => ({ id: c.id, label: c.title, value: c.hours, color: c.color }))}
              />
              <div className="flex w-full flex-col gap-1.5">
                {categories.map((c) => (
                  <div key={c.id} className="flex items-center gap-2 text-sm">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: c.color }} />
                    <span className="flex-1 truncate text-text-primary">{c.title}</span>
                    <span className="tabular-nums text-text-muted">
                      {totalHours > 0 ? Math.round((c.hours / totalHours) * 1000) / 10 : 0}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-5">
              <h2 className="text-sm font-semibold text-text-muted">Часы по категориям</h2>
              <div className="flex flex-col gap-3">
                {categories.map((c) => (
                  <div key={c.id} className="flex flex-col gap-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="truncate text-text-primary">{c.title}</span>
                      <span className="tabular-nums text-text-muted">{c.hours} ч</span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-overlay/5">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${(c.hours / maxHours) * 100}%`, backgroundColor: c.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-2 border-t border-border pt-3 text-sm text-text-muted">
                Всего: <span className="font-semibold text-text-primary tabular-nums">{totalHours} ч</span>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-border bg-surface">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-text-muted">
                  <th className="w-8 px-4 py-2"></th>
                  <th className="px-2 py-2 font-medium">Категория</th>
                  <th className="w-32 px-4 py-2 font-medium">Часы</th>
                  <th className="w-20 px-4 py-2 font-medium">%</th>
                  <th className="w-10 px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {categories.map((c) => (
                  <tr key={c.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-2">
                      <span className="block h-3 w-3 rounded-full" style={{ backgroundColor: c.color }} />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        value={c.title}
                        onChange={(e) => renameCategory(c.id, e.target.value)}
                        className="w-full rounded border border-transparent bg-transparent px-1 py-1 text-text-primary outline-none hover:border-border focus:border-accent-xp"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        min={0}
                        value={c.hours}
                        onChange={(e) => setCategoryHours(c.id, Number(e.target.value) || 0)}
                        className="w-24 rounded border border-border bg-bg px-2 py-1 text-text-primary tabular-nums outline-none focus:border-accent-xp"
                      />
                    </td>
                    <td className="px-4 py-2 tabular-nums text-text-muted">
                      {totalHours > 0 ? Math.round((c.hours / totalHours) * 1000) / 10 : 0}%
                    </td>
                    <td className="px-4 py-2">
                      <button
                        type="button"
                        onClick={() => handleDelete(c.id, c.title)}
                        className="text-text-muted hover:text-danger"
                        title="Удалить категорию"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {addingCategory && (
        <form
          onSubmit={submitNewCategory}
          className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-surface p-4"
        >
          <div className="flex flex-col gap-1">
            <label className="text-xs text-text-muted">Название категории</label>
            <input
              autoFocus
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Например, Работа"
              className="w-56 rounded border border-border bg-bg px-3 py-2 text-sm text-text-primary outline-none focus:border-accent-xp"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-text-muted">Часы</label>
            <input
              type="number"
              min={0}
              value={newHours}
              onChange={(e) => setNewHours(e.target.value)}
              className="w-28 rounded border border-border bg-bg px-3 py-2 text-sm text-text-primary tabular-nums outline-none focus:border-accent-xp"
            />
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={() => setAddingCategory(false)}>
              Отмена
            </Button>
            <Button type="submit" variant="primary">
              Добавить
            </Button>
          </div>
        </form>
      )}

      {dialog}
    </div>
  );
}
