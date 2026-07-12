import { settingsStore } from './stores';
import type { Settings } from '../types';

function normalizeSettings(raw: Settings): Settings {
  return {
    ...raw,
    pomodoroDurationMinutes: raw.pomodoroDurationMinutes ?? 25,
    pomodoroBonusXp: raw.pomodoroBonusXp ?? 5,
    pomodoroBonusEternas: raw.pomodoroBonusEternas ?? 5,
  };
}

export function useSettings(): {
  settings: Settings;
  setPomodoroDuration: (minutes: number) => void;
  setPomodoroBonusXp: (xp: number) => void;
  setPomodoroBonusEternas: (eternas: number) => void;
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

  return { settings, setPomodoroDuration, setPomodoroBonusXp, setPomodoroBonusEternas };
}
