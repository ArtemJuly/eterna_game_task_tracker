import type { Task } from '../types';
import { AiEstimateError, callAiForText, extractJson } from './aiTaskEstimate';

const MAX_SUGGESTIONS = 15;

export interface SprintCandidate {
  task: Task;
  projectTitle: string | null;
  trackLabel: string | null;
  isOverdue: boolean;
}

export interface SprintProjectInfo {
  title: string;
  goal: string;
  deadline: string | null;
  isSprint: boolean;
  enclosingGoalTitle: string | null;
}

export interface SprintTrackInfo {
  title: string;
  goal: string;
  currentStageTitle: string | null;
  enclosingGoalTitle: string | null;
}

export interface SprintSuggestion {
  task: Task;
  reason: string;
}

function buildSystemPrompt(): string {
  return [
    'Ты помогаешь спланировать недельный спринт задач в личном RPG-трекере продуктивности.',
    'Тебе дан пронумерованный список открытых задач пользователя и список его приоритетных проектов/треков — с целями, частью которых они являются, если есть.',
    'Собери спринт на текущую неделю: ключевые задачи, которые двигают самые приоритетные проекты/треки к их целям. Ориентируйся в первую очередь на иерархию приоритета проектов/треков и на то, к какой более крупной цели они относятся — это главный критерий, а не сроки.',
    'Задачи с близким сроком выполнения на этой неделе тоже стоит включить, но это вторичный критерий.',
    'Разумный размер спринта — обычно 5-12 задач, максимум 15. Не пытайся включить всё открытое.',
    'Если задач мало или ни одна не выделяется — верни столько, сколько оправдано, вплоть до пустого списка.',
    'Для каждой выбранной задачи укажи короткую (одно предложение) причину — например "двигает цель «X» через топ-проект" или "ближайший срок на этой неделе".',
    'Ссылайся на задачи ТОЛЬКО по их номеру (index) из списка, ничего не выдумывай.',
    'Ответь СТРОГО валидным JSON-массивом без пояснений и без markdown-разметки, в формате [{"index": <целое число>, "reason": "..."}].',
  ].join(' ');
}

function buildUserPrompt(
  candidates: SprintCandidate[],
  topProjects: SprintProjectInfo[],
  topTracks: SprintTrackInfo[],
  weekStart: string,
): string {
  const lines: string[] = [];
  lines.push(`Неделя начинается: ${weekStart}`);
  lines.push('');

  if (topProjects.length > 0) {
    lines.push('Проекты по приоритету (первый — самый приоритетный):');
    for (const p of topProjects) {
      const parts = [p.title];
      if (p.enclosingGoalTitle) parts.push(`часть цели: ${p.enclosingGoalTitle}`);
      if (p.goal) parts.push(`цель проекта: ${p.goal}`);
      if (p.deadline) parts.push(`дедлайн: ${p.deadline.slice(0, 10)}`);
      if (p.isSprint) parts.push('отмечен как спринт-проект');
      lines.push(`- ${parts.join(', ')}`);
    }
    lines.push('');
  }

  if (topTracks.length > 0) {
    lines.push('Треки развития по приоритету (первый — самый приоритетный):');
    for (const t of topTracks) {
      const parts = [t.title];
      if (t.enclosingGoalTitle) parts.push(`часть цели: ${t.enclosingGoalTitle}`);
      if (t.goal) parts.push(`цель трека: ${t.goal}`);
      if (t.currentStageTitle) parts.push(`текущий этап: ${t.currentStageTitle}`);
      lines.push(`- ${parts.join(', ')}`);
    }
    lines.push('');
  }

  lines.push('Открытые задачи:');
  candidates.forEach((c, i) => {
    const parts = [`"${c.task.title}"`];
    if (c.projectTitle) parts.push(`проект: ${c.projectTitle}`);
    if (c.trackLabel) parts.push(`трек: ${c.trackLabel}`);
    if (c.task.dueDate) parts.push(`срок: ${c.task.dueDate.slice(0, 10)}${c.isOverdue ? ' (ПРОСРОЧЕНА)' : ''}`);
    parts.push(`xp=${c.task.xp}`, `eternas=${c.task.eternas}`);
    lines.push(`${i + 1}. ${parts.join(', ')}`);
  });

  return lines.join('\n');
}

export async function planWeekSprint(
  candidates: SprintCandidate[],
  topProjects: SprintProjectInfo[],
  topTracks: SprintTrackInfo[],
  weekStart: string,
  apiKey: string,
): Promise<SprintSuggestion[]> {
  if (candidates.length === 0) {
    throw new AiEstimateError('Нет открытых задач для планирования спринта');
  }

  const text = await callAiForText(
    buildSystemPrompt(),
    buildUserPrompt(candidates, topProjects, topTracks, weekStart),
    1800,
    apiKey,
  );

  let parsed: unknown;
  try {
    parsed = JSON.parse(extractJson(text));
  } catch {
    throw new AiEstimateError('Не удалось распознать ответ AI-сервиса');
  }

  if (!Array.isArray(parsed)) {
    throw new AiEstimateError('AI-сервис вернул некорректный формат спринта');
  }

  const suggestions: SprintSuggestion[] = [];
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
