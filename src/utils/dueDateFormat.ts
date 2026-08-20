import { addDaysToDateString } from './today';

export const WEEKDAY_HEADERS = ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'];
export const MONTH_NAMES = [
  'Январь',
  'Февраль',
  'Март',
  'Апрель',
  'Май',
  'Июнь',
  'Июль',
  'Август',
  'Сентябрь',
  'Октябрь',
  'Ноябрь',
  'Декабрь',
];
export const MONTH_SHORT = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
export const WEEKDAY_SHORT_BY_DOW = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];

export function parseDateStr(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function toDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function mondayIndex(date: Date): number {
  return (date.getDay() + 6) % 7;
}

export function nextWeekday(fromDateStr: string, targetMondayIdx: number, minOffsetDays: number): string {
  const d = parseDateStr(fromDateStr);
  d.setDate(d.getDate() + minOffsetDays);
  while (mondayIndex(d) !== targetMondayIdx) d.setDate(d.getDate() + 1);
  return toDateStr(d);
}

export function formatDueDateLabel(dateStr: string, today: string): string {
  if (dateStr === today) return 'Сегодня';
  if (dateStr === addDaysToDateString(today, 1)) return 'Завтра';
  if (dateStr === addDaysToDateString(today, -1)) return 'Вчера';
  const d = parseDateStr(dateStr);
  return `${d.getDate()} ${MONTH_SHORT[d.getMonth()]}`;
}

export function buildMonthCells(year: number, monthIdx: number): (string | null)[] {
  const first = new Date(year, monthIdx, 1);
  const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();
  const leading = mondayIndex(first);
  const cells: (string | null)[] = Array(leading).fill(null);
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(toDateStr(new Date(year, monthIdx, day)));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}
