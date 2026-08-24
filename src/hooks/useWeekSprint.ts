import { weekSprintStore } from './stores';
import type { SprintItem } from '../types';
import { getWeekStartDateString } from '../utils/today';

export function useWeekSprint(): {
  weekSprint: SprintItem[];
  hasSprintThisWeek: boolean;
  setWeekSprint: (items: SprintItem[]) => void;
} {
  const [sprint, setSprint] = weekSprintStore.useStore();
  const weekStart = getWeekStartDateString();
  const hasSprintThisWeek = sprint !== null && sprint.weekStart === weekStart;
  const weekSprint = hasSprintThisWeek ? sprint!.items : [];

  function setWeekSprint(items: SprintItem[]) {
    setSprint({ weekStart, items });
  }

  return { weekSprint, hasSprintThisWeek, setWeekSprint };
}
