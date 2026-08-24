import type { Task } from '../types';
import { AiEstimateError, callAiForText, extractJson } from './aiTaskEstimate';

const MAX_SUGGESTIONS = 8;

export interface DayPlanCandidate {
  task: Task;
  projectTitle: string | null;
  trackLabel: string | null;
  isOverdue: boolean;
  isInSprint: boolean;
}

export interface PriorityProjectInfo {
  title: string;
  goal: string;
  deadline: string | null;
  isSprint: boolean;
}

export interface PriorityTrackInfo {
  title: string;
  goal: string;
  currentStageTitle: string | null;
}

export interface DayPlanSuggestion {
  task: Task;
  reason: string;
}

function buildSystemPrompt(): string {
  return [
    'Ты помогаешь спланировать день в личном RPG-трекере продуктивности.',
    'Тебе дан пронумерованный список открытых задач пользователя и список его приоритетных проектов/треков.',
    'Собери план на сегодня: смесь (а) ключевых задач, относящихся к самым приоритетным проектам/трекам, и (б) задач, у которых наступил или скоро наступает срок выполнения.',
    'Если у пользователя есть задачи из текущего недельного спринта (помечены [СПРИНТ]) — им отдавай предпочтение в первую очередь, при прочих равных выбирай их раньше задач вне спринта.',
    'Учитывай, будний сегодня день или выходной (дано в промпте) — на выходных будь аккуратнее с чисто рабочими задачами, если только они не единственные срочные.',
    'Не включай задачи без явной причины — план должен быть реалистичным на один день (обычно 3-6 задач, максимум 8), а не полным списком всего открытого.',
    'Если задач мало или ни одна не выделяется — верни столько, сколько оправдано, вплоть до пустого списка.',
    'Для каждой выбранной задачи укажи короткую (одно предложение) причину — например "из недельного спринта" или "просрочена на 3 дня".',
    'Ссылайся на задачи ТОЛЬКО по их номеру (index) из списка, ничего не выдумывай.',
    'Ответь СТРОГО валидным JSON-массивом без пояснений и без markdown-разметки, в формате [{"index": <целое число>, "reason": "..."}].',
  ].join(' ');
}

function buildUserPrompt(
  candidates: DayPlanCandidate[],
  topProjects: PriorityProjectInfo[],
  topTracks: PriorityTrackInfo[],
  today: string,
  isWeekend: boolean,
): string {
  const lines: string[] = [];
  lines.push(`Сегодня: ${today} (${isWeekend ? 'выходной день' : 'будний день'})`);
  lines.push('');

  if (topProjects.length > 0) {
    lines.push('Проекты по приоритету (первый — самый приоритетный):');
    for (const p of topProjects) {
      const parts = [p.title];
      if (p.goal) parts.push(`цель: ${p.goal}`);
      if (p.deadline) parts.push(`дедлайн: ${p.deadline.slice(0, 10)}`);
      if (p.isSprint) parts.push('спринт');
      lines.push(`- ${parts.join(', ')}`);
    }
    lines.push('');
  }

  if (topTracks.length > 0) {
    lines.push('Треки развития по приоритету (первый — самый приоритетный):');
    for (const t of topTracks) {
      const parts = [t.title];
      if (t.goal) parts.push(`цель: ${t.goal}`);
      if (t.currentStageTitle) parts.push(`текущий этап: ${t.currentStageTitle}`);
      lines.push(`- ${parts.join(', ')}`);
    }
    lines.push('');
  }

  lines.push('Открытые задачи:');
  candidates.forEach((c, i) => {
    const parts = [`"${c.task.title}"`];
    if (c.isInSprint) parts.push('[СПРИНТ]');
    if (c.projectTitle) parts.push(`проект: ${c.projectTitle}`);
    if (c.trackLabel) parts.push(`трек: ${c.trackLabel}`);
    if (c.task.dueDate) parts.push(`срок: ${c.task.dueDate.slice(0, 10)}${c.isOverdue ? ' (ПРОСРОЧЕНА)' : ''}`);
    parts.push(`xp=${c.task.xp}`, `eternas=${c.task.eternas}`);
    lines.push(`${i + 1}. ${parts.join(', ')}`);
  });

  return lines.join('\n');
}

export async function planDay(
  candidates: DayPlanCandidate[],
  topProjects: PriorityProjectInfo[],
  topTracks: PriorityTrackInfo[],
  today: string,
  isWeekend: boolean,
  apiKey: string,
): Promise<DayPlanSuggestion[]> {
  if (candidates.length === 0) {
    throw new AiEstimateError('Нет открытых задач для планирования');
  }

  const text = await callAiForText(
    buildSystemPrompt(),
    buildUserPrompt(candidates, topProjects, topTracks, today, isWeekend),
    1200,
    apiKey,
  );

  let parsed: unknown;
  try {
    parsed = JSON.parse(extractJson(text));
  } catch {
    throw new AiEstimateError('Не удалось распознать ответ AI-сервиса');
  }

  if (!Array.isArray(parsed)) {
    throw new AiEstimateError('AI-сервис вернул некорректный формат плана');
  }

  const suggestions: DayPlanSuggestion[] = [];
  for (const item of parsed) {
    const index = (item as { index?: unknown })?.index;
    const reason = (item as { reason?: unknown })?.reason;
    if (typeof index !== 'number' || !Number.isInteger(index)) continue;
    const candidate = candidates[index - 1];
    if (!candidate) continue;
    suggestions.push({ task: candidate.task, reason: typeof reason === 'string' ? reason.trim() : '' });
    if (suggestions.length >= MAX_SUGGESTIONS) break;
  }

  return suggestions;
}
