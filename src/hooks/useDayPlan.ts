import { dayPlanStore } from './stores';
import type { DayPlanItem } from '../types';
import { getTodayDateString } from '../utils/today';

export function useDayPlan(): {
  todayPlan: DayPlanItem[];
  hasPlanToday: boolean;
  setDayPlan: (items: DayPlanItem[]) => void;
} {
  const [plan, setPlan] = dayPlanStore.useStore();
  const today = getTodayDateString();
  const hasPlanToday = plan !== null && plan.date === today;
  const todayPlan = hasPlanToday ? plan!.items : [];

  function setDayPlan(items: DayPlanItem[]) {
    setPlan({ date: today, items });
  }

  return { todayPlan, hasPlanToday, setDayPlan };
}
