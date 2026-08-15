import { settingsStore } from './stores';
import type { Settings, ThemeName } from '../types';

function normalizeSettings(raw: Settings): Settings {
  return {
    ...raw,
    pomodoroDurationMinutes: raw.pomodoroDurationMinutes ?? 25,
    pomodoroBonusXp: raw.pomodoroBonusXp ?? 5,
    pomodoroBonusEternas: raw.pomodoroBonusEternas ?? 5,
    streakBonusStepXp: raw.streakBonusStepXp ?? 5,
    streakBonusStepEternas: raw.streakBonusStepEternas ?? 5,
    theme: raw.theme ?? 'dark',
    aiApiKey: raw.aiApiKey ?? '',
  };
}

export function useSettings(): {
  settings: Settings;
  setPomodoroDuration: (minutes: number) => void;
  setPomodoroBonusXp: (xp: number) => void;
  setPomodoroBonusEternas: (eternas: number) => void;
  setStreakBonusStepXp: (xp: number) => void;
  setStreakBonusStepEternas: (eternas: number) => void;
  setTheme: (theme: ThemeName) => void;
  setAiApiKey: (key: string) => void;
} {
  const [rawSettings, setSettings] = settingsStore.useStore();
  const settings = normalizeSettings(rawSettings);

  function setPomodoroDuration(minutes: number) {
    setSettings((prev) => ({ ...prev, pomodoroDurationMinutes: minutes }));
  }

  function setPomodoroBonusXp(xp: number) {
    setSettings((prev) => ({ ...prev, pomodoroBonusXp: xp }));
  }

  function setPomodoroBonusEternas(eternas: number) {
    setSettings((prev) => ({ ...prev, pomodoroBonusEternas: eternas }));
  }

  function setStreakBonusStepXp(xp: number) {
    setSettings((prev) => ({ ...prev, streakBonusStepXp: xp }));
  }

  function setStreakBonusStepEternas(eternas: number) {
    setSettings((prev) => ({ ...prev, streakBonusStepEternas: eternas }));
  }

  function setTheme(theme: ThemeName) {
    setSettings((prev) => ({ ...prev, theme }));
  }

  function setAiApiKey(key: string) {
    setSettings((prev) => ({ ...prev, aiApiKey: key }));
  }

  return {
    settings,
    setPomodoroDuration,
    setPomodoroBonusXp,
    setPomodoroBonusEternas,
    setStreakBonusStepXp,
    setStreakBonusStepEternas,
    setTheme,
    setAiApiKey,
  };
}
