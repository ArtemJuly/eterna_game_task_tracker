import { useMemo, useState } from 'react';
import { useTimeCategories } from '../hooks/useTimeCategories';
import { useTimeEntries } from '../hooks/useTimeEntries';
import { useTasks } from '../hooks/useTasks';
import { useProjects } from '../hooks/useProjects';
import { usePomodoros } from '../hooks/usePomodoros';
import { useConfirm } from '../hooks/useConfirm';
import { getTodayDateString } from '../utils/today';
import {
  TIME_RANGE_OPTIONS,
  buildTimeReport,
  formatMinutesAsHours,
  getPomodoroTimeEntries,
  getRangeStartDate,
  isDateInRange,
  type TimeRangeKey,
} from '../utils/timeTracker';
import Button from '../components/ui/Button';
import DonutChart from '../components/ui/DonutChart';

export default function TimeTracker() {
  const { categories, addCategory, renameCategory, deleteCategory } = useTimeCategories();
  const { entries, addEntry, deleteEntry } = useTimeEntries();
  const { tasks } = useTasks();
  const { projects } = useProjects();
  const { sessions } = usePomodoros();
  const { confirm, dialog } = useConfirm();

  const [range, setRange] = useState<TimeRangeKey>('week');
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategoryTitle, setNewCategoryTitle] = useState('');
  const [addingEntry, setAddingEntry] = useState(false);
  const [entryCategoryId, setEntryCategoryId] = useState('');
  const [entryDate, setEntryDate] = useState(getTodayDateString());
  const [entryHours, setEntryHours] = useState('1');
  const [entryNote, setEntryNote] = useState('');

  const report = useMemo(
    () => buildTimeReport(categories, entries, sessions, tasks, projects, range),
    [categories, entries, sessions, tasks, projects, range],
  );
  const reportByCategory = useMemo(() => new Map(report.map((r) => [r.categoryId, r])), [report]);

  const totalMinutes = report.reduce((sum, r) => sum + r.totalMinutes, 0);
  const totalPomodoroMinutes = report.reduce((sum, r) => sum + r.pomodoroMinutes, 0);
  const maxMinutes = Math.max(1, ...report.map((r) => r.totalMinutes));

  const today = getTodayDateString();

  interface DisplayRow {
    id: string;
    date: string;
    categoryId: string;
    durationMinutes: number;
    note: string;
    source: 'manual' | 'pomodoro';
  }

  const combinedRows = useMemo<DisplayRow[]>(() => {
    const start = getRangeStartDate(range, today);
    const manualRows: DisplayRow[] = entries
      .filter((e) => isDateInRange(e.date, start, today))
      .map((e) => ({
        id: e.id,
        date: e.date,
        categoryId: e.categoryId,
        durationMinutes: e.durationMinutes,
        note: e.note,
        source: 'manual',
      }));
    const pomodoroRows: DisplayRow[] = getPomodoroTimeEntries(sessions, tasks, projects)
      .filter((p) => isDateInRange(p.date, start, today))
      .map((p) => ({
        id: p.id,
        date: p.date,
        categoryId: p.categoryId,
        durationMinutes: p.durationMinutes,
        note: `🍅 ${p.label}`,
        source: 'pomodoro',
      }));
    return [...manualRows, ...pomodoroRows].sort((a, b) => b.date.localeCompare(a.date));
  }, [entries, sessions, tasks, projects, range, today]);

  function submitNewCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!newCategoryTitle.trim()) return;
    addCategory(newCategoryTitle.trim());
    setNewCategoryTitle('');
    setAddingCategory(false);
  }

  function submitNewEntry(e: React.FormEvent) {
    e.preventDefault();
    if (!entryCategoryId || !entryDate) return;
    const hours = Number(entryHours);
    if (!hours || hours <= 0) return;
    addEntry({ categoryId: entryCategoryId, date: entryDate, durationMinutes: Math.round(hours * 60), note: entryNote.trim() });
    setEntryHours('1');
    setEntryNote('');
    setAddingEntry(false);
  }

  function handleDeleteCategory(id: string, title: string) {
    confirm({
      title: 'Удалить категорию?',
      message: `«${title}» будет удалена, а записи времени в ней — вместе с ней. Теги у задач и проектов тоже снимутся.`,
      confirmLabel: 'Удалить',
      danger: true,
      onConfirm: () => deleteCategory(id),
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-text-primary">TimeTracker</h1>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 rounded-lg border border-border bg-surface p-1">
            {TIME_RANGE_OPTIONS.map((o) => (
              <button
                key={o.key}
                onClick={() => setRange(o.key)}
                className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${
                  range === o.key ? 'bg-overlay/[0.06] text-text-primary' : 'text-text-muted hover:text-text-primary'
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
          <Button variant="secondary" onClick={() => setAddingEntry(true)}>
            + Запись
          </Button>
          <Button variant="primary" onClick={() => setAddingCategory(true)}>
            + Категория
          </Button>
        </div>
      </div>

      {categories.length === 0 && !addingCategory ? (
        <div className="rounded-lg border border-border bg-surface p-4 text-sm text-text-muted">
          Пока нет категорий. Добавь первую — её можно будет присвоить задачам и проектам как тег, а сюда будет
          стекаться время из помидоров и ручных записей.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="flex flex-col items-center gap-4 rounded-lg border border-border bg-surface p-5">
              <h2 className="self-start text-sm font-semibold text-text-muted">Доля времени, %</h2>
              <DonutChart
                segments={report.map((r) => {
                  const c = categories.find((cat) => cat.id === r.categoryId)!;
                  return { id: c.id, label: c.title, value: r.totalMinutes, color: c.color };
                })}
              />
              <div className="flex w-full flex-col gap-1.5">
                {categories.map((c) => {
                  const r = reportByCategory.get(c.id);
                  const minutes = r?.totalMinutes ?? 0;
                  return (
                    <div key={c.id} className="flex items-center gap-2 text-sm">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: c.color }} />
                      <span className="flex-1 truncate text-text-primary">{c.title}</span>
                      <span className="tabular-nums text-text-muted">
                        {totalMinutes > 0 ? Math.round((minutes / totalMinutes) * 1000) / 10 : 0}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-5">
              <h2 className="text-sm font-semibold text-text-muted">Часы по категориям</h2>
              <div className="flex flex-col gap-3">
                {categories.map((c) => {
                  const r = reportByCategory.get(c.id);
                  const minutes = r?.totalMinutes ?? 0;
                  return (
                    <div key={c.id} className="flex flex-col gap-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="truncate text-text-primary">{c.title}</span>
                        <span className="tabular-nums text-text-muted">{formatMinutesAsHours(minutes)} ч</span>
                      </div>
                      <div className="h-2.5 w-full overflow-hidden rounded-full bg-overlay/5">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${(minutes / maxMinutes) * 100}%`, backgroundColor: c.color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-2 border-t border-border pt-3 text-sm text-text-muted">
                Всего: <span className="font-semibold text-text-primary tabular-nums">{formatMinutesAsHours(totalMinutes)} ч</span>
                {totalPomodoroMinutes > 0 && (
                  <span> · из них {formatMinutesAsHours(totalPomodoroMinutes)} ч из помидоров</span>
                )}
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-border bg-surface">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-text-muted">
                  <th className="w-8 px-4 py-2"></th>
                  <th className="px-2 py-2 font-medium">Категория</th>
                  <th className="w-28 px-4 py-2 font-medium">Часы</th>
                  <th className="w-20 px-4 py-2 font-medium">%</th>
                  <th className="w-10 px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {categories.map((c) => {
                  const r = reportByCategory.get(c.id);
                  const minutes = r?.totalMinutes ?? 0;
                  return (
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
                      <td className="px-4 py-2 tabular-nums text-text-primary">{formatMinutesAsHours(minutes)} ч</td>
                      <td className="px-4 py-2 tabular-nums text-text-muted">
                        {totalMinutes > 0 ? Math.round((minutes / totalMinutes) * 1000) / 10 : 0}%
                      </td>
                      <td className="px-4 py-2">
                        <button
                          type="button"
                          onClick={() => handleDeleteCategory(c.id, c.title)}
                          className="text-text-muted hover:text-danger"
                          title="Удалить категорию"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div>
            <h2 className="mb-2 text-sm font-semibold text-text-muted">Записи за период</h2>
            {combinedRows.length === 0 ? (
              <div className="rounded-lg border border-border bg-surface p-4 text-sm text-text-muted">
                Записей нет — тут появятся завершённые помидоры с подходящей категорией и записи, внесённые вручную.
              </div>
            ) : (
              <div className="overflow-hidden rounded-lg border border-border bg-surface">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-text-muted">
                      <th className="px-4 py-2 font-medium">Дата</th>
                      <th className="px-4 py-2 font-medium">Категория</th>
                      <th className="px-2 py-2 font-medium">Заметка</th>
                      <th className="w-20 px-4 py-2 font-medium">Часы</th>
                      <th className="w-10 px-4 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {combinedRows.map((row) => {
                      const category = categories.find((c) => c.id === row.categoryId);
                      return (
                        <tr key={row.id} className="border-b border-border last:border-0">
                          <td className="px-4 py-2 tabular-nums text-text-muted">{row.date}</td>
                          <td className="px-4 py-2">
                            <span className="inline-flex items-center gap-1.5 text-text-primary">
                              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: category?.color }} />
                              {category?.title ?? '—'}
                            </span>
                          </td>
                          <td className="px-2 py-2 text-text-muted">{row.note || '—'}</td>
                          <td className="px-4 py-2 tabular-nums text-text-primary">
                            {formatMinutesAsHours(row.durationMinutes)} ч
                          </td>
                          <td className="px-4 py-2">
                            {row.source === 'manual' && (
                              <button
                                type="button"
                                onClick={() => deleteEntry(row.id)}
                                className="text-text-muted hover:text-danger"
                                title="Удалить запись"
                              >
                                ✕
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
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
              value={newCategoryTitle}
              onChange={(e) => setNewCategoryTitle(e.target.value)}
              placeholder="Например, Работа"
              className="w-56 rounded border border-border bg-bg px-3 py-2 text-sm text-text-primary outline-none focus:border-accent-xp"
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

      {addingEntry && (
        <form
          onSubmit={submitNewEntry}
          className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-surface p-4"
        >
          <div className="flex flex-col gap-1">
            <label className="text-xs text-text-muted">Категория</label>
            <select
              autoFocus
              value={entryCategoryId}
              onChange={(e) => setEntryCategoryId(e.target.value)}
              className="w-44 rounded border border-border bg-bg px-3 py-2 text-sm text-text-primary outline-none focus:border-accent-xp"
            >
              <option value="" disabled>
                Выбрать категорию
              </option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-text-muted">Дата</label>
            <input
              type="date"
              value={entryDate}
              onChange={(e) => setEntryDate(e.target.value)}
              className="rounded border border-border bg-bg px-3 py-2 text-sm text-text-primary outline-none focus:border-accent-xp"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-text-muted">Часы</label>
            <input
              type="number"
              min={0}
              step={0.25}
              value={entryHours}
              onChange={(e) => setEntryHours(e.target.value)}
              className="w-24 rounded border border-border bg-bg px-3 py-2 text-sm text-text-primary tabular-nums outline-none focus:border-accent-xp"
            />
          </div>
          <div className="flex flex-1 flex-col gap-1">
            <label className="text-xs text-text-muted">Заметка (необязательно)</label>
            <input
              value={entryNote}
              onChange={(e) => setEntryNote(e.target.value)}
              placeholder="Чем занимался"
              className="w-full rounded border border-border bg-bg px-3 py-2 text-sm text-text-primary outline-none focus:border-accent-xp"
            />
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={() => setAddingEntry(false)}>
              Отмена
            </Button>
            <Button type="submit" variant="primary" disabled={!entryCategoryId}>
              Добавить
            </Button>
          </div>
        </form>
      )}

      {dialog}
    </div>
  );
}
