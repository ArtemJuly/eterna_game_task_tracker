import { useRef, useState } from 'react';
import { useSettings } from '../hooks/useSettings';
import { useConfirm } from '../hooks/useConfirm';
import {
  activePomodoroStore,
  characterStore,
  historyStore,
  pomodorosStore,
  projectsStore,
  rewardsStore,
  tasksStore,
} from '../hooks/stores';
import { pushToast } from '../hooks/useToast';
import { applyBackup, exportBackup, parseBackupFile } from '../utils/backup';
import Button from '../components/ui/Button';
import type { ThemeName } from '../types';

const THEME_OPTIONS: { value: ThemeName; label: string; bg: string; surface: string; accent: string }[] = [
  { value: 'dark', label: 'Тёмная (по умолчанию)', bg: '#0f1117', surface: '#181c25', accent: '#7c6ff7' },
  { value: 'black-gold', label: 'Чёрно-золотая', bg: '#0a0a0a', surface: '#161514', accent: '#e8c468' },
  { value: 'white-gold', label: 'Бело-золотая', bg: '#faf7ef', surface: '#ffffff', accent: '#b8860b' },
];

export default function Settings() {
  const {
    settings,
    setPomodoroDuration,
    setPomodoroBonusXp,
    setPomodoroBonusEternas,
    setStreakBonusStepXp,
    setStreakBonusStepEternas,
    setTheme,
    setAiApiKey,
  } = useSettings();
  const { confirm, dialog } = useConfirm();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [durationInput, setDurationInput] = useState(String(settings.pomodoroDurationMinutes));
  const [bonusXpInput, setBonusXpInput] = useState(String(settings.pomodoroBonusXp));
  const [bonusEternasInput, setBonusEternasInput] = useState(String(settings.pomodoroBonusEternas));
  const [streakStepXpInput, setStreakStepXpInput] = useState(String(settings.streakBonusStepXp));
  const [streakStepEternasInput, setStreakStepEternasInput] = useState(String(settings.streakBonusStepEternas));
  const [aiApiKeyInput, setAiApiKeyInput] = useState(settings.aiApiKey);

  function handleDurationBlur() {
    const minutes = Math.max(1, Math.min(180, Number(durationInput) || settings.pomodoroDurationMinutes));
    setPomodoroDuration(minutes);
    setDurationInput(String(minutes));
  }

  function handleBonusXpBlur() {
    const xp = Math.max(0, Number(bonusXpInput) || 0);
    setPomodoroBonusXp(xp);
    setBonusXpInput(String(xp));
  }

  function handleBonusEternasBlur() {
    const eternas = Math.max(0, Number(bonusEternasInput) || 0);
    setPomodoroBonusEternas(eternas);
    setBonusEternasInput(String(eternas));
  }

  function handleStreakStepXpBlur() {
    const xp = Math.max(0, Number(streakStepXpInput) || 0);
    setStreakBonusStepXp(xp);
    setStreakStepXpInput(String(xp));
  }

  function handleStreakStepEternasBlur() {
    const eternas = Math.max(0, Number(streakStepEternasInput) || 0);
    setStreakBonusStepEternas(eternas);
    setStreakStepEternasInput(String(eternas));
  }

  function handleAiApiKeyBlur() {
    setAiApiKey(aiApiKeyInput.trim());
  }

  function handleExport() {
    exportBackup();
    pushToast('Бэкап скачан', 'success');
  }

  function handleImportClick() {
    fileInputRef.current?.click();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      let data: Record<string, unknown>;
      try {
        data = parseBackupFile(String(reader.result));
      } catch (err) {
        pushToast(err instanceof Error ? err.message : 'Не удалось прочитать файл', 'error');
        return;
      }
      confirm({
        title: 'Восстановить из бэкапа?',
        message: 'Все текущие данные приложения будут заменены содержимым файла. Это нельзя отменить.',
        confirmLabel: 'Да, восстановить',
        danger: true,
        onConfirm: () => {
          applyBackup(data);
          window.location.reload();
        },
      });
    };
    reader.readAsText(file);
  }

  function resetWith(title: string, message: string, action: () => void, doneMessage: string) {
    confirm({
      title,
      message,
      confirmLabel: 'Да, сбросить',
      danger: true,
      onConfirm: () => {
        action();
        pushToast(doneMessage, 'success');
      },
    });
  }

  function resetXpAndEternas() {
    resetWith(
      'Сбросить XP и этерны?',
      'Уровень и баланс этерн вернутся к нулю. Задачи, проекты и история останутся нетронутыми.',
      () => characterStore.set({ totalXp: 0, eternas: 0 }),
      'XP и этерны сброшены',
    );
  }

  function resetTasks() {
    resetWith(
      'Удалить все задачи?',
      'Все задачи будут удалены без возможности восстановления. Проекты и награды не пострадают.',
      () => tasksStore.set([]),
      'Все задачи удалены',
    );
  }

  function resetProjects() {
    resetWith(
      'Удалить все проекты?',
      'Все проекты будут удалены. Задачи не удалятся, но станут задачами без проекта.',
      () => {
        projectsStore.set([]);
        tasksStore.set((prev) => prev.map((t) => ({ ...t, projectId: null })));
      },
      'Все проекты удалены',
    );
  }

  function resetRewards() {
    resetWith(
      'Удалить все награды?',
      'Все награды будут удалены без возможности восстановления.',
      () => rewardsStore.set([]),
      'Все награды удалены',
    );
  }

  function resetHistory() {
    resetWith(
      'Очистить историю?',
      'Лента событий будет очищена полностью. На XP, этерны и задачи это не повлияет.',
      () => historyStore.set([]),
      'История очищена',
    );
  }

  function resetPomodoros() {
    resetWith(
      'Очистить данные помидоров?',
      'Счётчики завершённых помидоров у всех задач обнулятся. Текущий активный таймер тоже остановится.',
      () => {
        pomodorosStore.set([]);
        activePomodoroStore.set(null);
      },
      'Данные помидоров очищены',
    );
  }

  function resetEverything() {
    resetWith(
      'Полный сброс приложения?',
      'Абсолютно все данные — персонаж, задачи, проекты, награды, история, помидоры — будут удалены безвозвратно. Это нельзя отменить.',
      () => {
        characterStore.set({ totalXp: 0, eternas: 0 });
        tasksStore.set([]);
        projectsStore.set([]);
        rewardsStore.set([]);
        historyStore.set([]);
        pomodorosStore.set([]);
        activePomodoroStore.set(null);
      },
      'Приложение сброшено к пустому состоянию',
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-text-primary">Настройки</h1>

      <section className="rounded-lg border border-border bg-surface p-5">
        <h2 className="mb-3 text-lg font-semibold text-text-primary">Оформление</h2>
        <div className="grid grid-cols-3 gap-3">
          {THEME_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setTheme(opt.value)}
              className={`flex flex-col gap-2 rounded-lg border p-3 text-left transition-colors ${
                settings.theme === opt.value
                  ? 'border-accent-xp'
                  : 'border-border hover:border-text-muted'
              }`}
            >
              <div className="flex h-10 overflow-hidden rounded border border-border">
                <div className="flex-1" style={{ background: opt.bg }} />
                <div className="w-3" style={{ background: opt.accent }} />
              </div>
              <span className="text-sm text-text-primary">{opt.label}</span>
              <span className="text-xs text-accent-xp">{settings.theme === opt.value ? '✓ Выбрана' : ''}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-border bg-surface p-5">
        <h2 className="mb-3 text-lg font-semibold text-text-primary">Помидоро-таймер</h2>

        <label className="mb-1 block text-sm text-text-muted">Длительность одного помидора, минут</label>
        <input
          type="number"
          min={1}
          max={180}
          value={durationInput}
          onChange={(e) => setDurationInput(e.target.value)}
          onBlur={handleDurationBlur}
          className="w-32 rounded border border-border bg-bg px-3 py-2 text-sm text-text-primary tabular-nums outline-none focus:border-accent-xp"
        />

        <div className="mt-4 grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm text-text-muted">Бонус за помидор, XP</label>
            <input
              type="number"
              min={0}
              value={bonusXpInput}
              onChange={(e) => setBonusXpInput(e.target.value)}
              onBlur={handleBonusXpBlur}
              className="w-32 rounded border border-border bg-bg px-3 py-2 text-sm text-text-primary tabular-nums outline-none focus:border-accent-xp"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-text-muted">Бонус за помидор, этерны</label>
            <input
              type="number"
              min={0}
              value={bonusEternasInput}
              onChange={(e) => setBonusEternasInput(e.target.value)}
              onBlur={handleBonusEternasBlur}
              className="w-32 rounded border border-border bg-bg px-3 py-2 text-sm text-text-primary tabular-nums outline-none focus:border-accent-xp"
            />
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-surface p-5">
        <h2 className="mb-3 text-lg font-semibold text-text-primary">Серии повторяющихся задач</h2>
        <p className="mb-4 text-sm text-text-muted">
          За каждое выполнение повторяющейся задачи подряд (без пропуска срока) бонус растёт: шаг × (длина серии − 1).
        </p>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm text-text-muted">Шаг бонуса за серию, XP</label>
            <input
              type="number"
              min={0}
              value={streakStepXpInput}
              onChange={(e) => setStreakStepXpInput(e.target.value)}
              onBlur={handleStreakStepXpBlur}
              className="w-32 rounded border border-border bg-bg px-3 py-2 text-sm text-text-primary tabular-nums outline-none focus:border-accent-xp"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-text-muted">Шаг бонуса за серию, этерны</label>
            <input
              type="number"
              min={0}
              value={streakStepEternasInput}
              onChange={(e) => setStreakStepEternasInput(e.target.value)}
              onBlur={handleStreakStepEternasBlur}
              className="w-32 rounded border border-border bg-bg px-3 py-2 text-sm text-text-primary tabular-nums outline-none focus:border-accent-xp"
            />
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-surface p-5">
        <h2 className="mb-3 text-lg font-semibold text-text-primary">AI-оценка задач</h2>
        <p className="mb-4 text-sm text-text-muted">
          Ключ для кнопки «Оценить AI» в карточке задачи (модель claude-haiku-4-5 через proxyapi.ru). Хранится
          только локально в этом браузере и никуда, кроме proxyapi.ru, не отправляется.
        </p>
        <label className="mb-1 block text-sm text-text-muted">API-ключ</label>
        <input
          type="password"
          autoComplete="off"
          placeholder="sk-..."
          value={aiApiKeyInput}
          onChange={(e) => setAiApiKeyInput(e.target.value)}
          onBlur={handleAiApiKeyBlur}
          className="w-full max-w-md rounded border border-border bg-bg px-3 py-2 text-sm text-text-primary outline-none focus:border-accent-xp"
        />
      </section>

      <section className="rounded-lg border border-border bg-surface p-5">
        <h2 className="mb-3 text-lg font-semibold text-text-primary">Резервная копия</h2>
        <p className="mb-4 text-sm text-text-muted">
          Все данные хранятся только в этом браузере. Скачайте бэкап, чтобы не потерять прогресс при очистке
          браузера или переходе на другое устройство.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={handleExport}>
            📥 Скачать бэкап
          </Button>
          <Button variant="secondary" onClick={handleImportClick}>
            📤 Восстановить из файла
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      </section>

      <section className="rounded-lg border border-danger/30 bg-surface p-5">
        <h2 className="mb-1 text-lg font-semibold text-danger">Опасная зона</h2>
        <p className="mb-4 text-sm text-text-muted">
          Каждое действие ниже необратимо и потребует подтверждения.
        </p>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between rounded border border-border px-4 py-3">
            <span className="text-sm text-text-primary">Сбросить XP и этерны</span>
            <Button variant="danger" onClick={resetXpAndEternas}>
              Сбросить
            </Button>
          </div>
          <div className="flex items-center justify-between rounded border border-border px-4 py-3">
            <span className="text-sm text-text-primary">Удалить все задачи</span>
            <Button variant="danger" onClick={resetTasks}>
              Удалить
            </Button>
          </div>
          <div className="flex items-center justify-between rounded border border-border px-4 py-3">
            <span className="text-sm text-text-primary">Удалить все проекты</span>
            <Button variant="danger" onClick={resetProjects}>
              Удалить
            </Button>
          </div>
          <div className="flex items-center justify-between rounded border border-border px-4 py-3">
            <span className="text-sm text-text-primary">Удалить все награды</span>
            <Button variant="danger" onClick={resetRewards}>
              Удалить
            </Button>
          </div>
          <div className="flex items-center justify-between rounded border border-border px-4 py-3">
            <span className="text-sm text-text-primary">Очистить историю</span>
            <Button variant="danger" onClick={resetHistory}>
              Очистить
            </Button>
          </div>
          <div className="flex items-center justify-between rounded border border-border px-4 py-3">
            <span className="text-sm text-text-primary">Очистить данные помидоров</span>
            <Button variant="danger" onClick={resetPomodoros}>
              Очистить
            </Button>
          </div>
          <div className="flex items-center justify-between rounded border border-danger/50 bg-danger/5 px-4 py-3">
            <span className="text-sm font-medium text-danger">Полный сброс приложения</span>
            <Button variant="danger" onClick={resetEverything}>
              Сбросить всё
            </Button>
          </div>
        </div>
      </section>

      {dialog}
    </div>
  );
}
