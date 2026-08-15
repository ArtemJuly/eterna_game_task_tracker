import type { Task } from '../types';

const AI_ENDPOINT = 'https://api.proxyapi.ru/anthropic/v1/messages';
const AI_MODEL = 'claude-haiku-4-5';
const MAX_EXAMPLES = 6;
const MAX_EXAMPLE_DESCRIPTION_LENGTH = 150;

export interface TaskEstimate {
  xp: number;
  eternas: number;
  projectTitle: string | null;
  trackTitle: string | null;
}

export interface EstimateExample {
  title: string;
  description: string;
  xp: number;
  eternas: number;
}

export interface TrackCandidate {
  title: string;
  goal: string;
  currentStageTitle: string | null;
}

export interface EstimateTaskRewardInput {
  title: string;
  description: string;
  examples: EstimateExample[];
  projectTitles: string[];
  trackCandidates: TrackCandidate[];
  apiKey: string;
}

export class AiEstimateError extends Error {}

export function pickFewShotExamples(tasks: Task[], projectId: string | null): EstimateExample[] {
  const done = tasks
    .filter((t) => t.status === 'done')
    .sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''));

  const sameProject = projectId ? done.filter((t) => t.projectId === projectId) : [];
  const rest = done.filter((t) => !sameProject.includes(t));
  const picked = [...sameProject, ...rest].slice(0, MAX_EXAMPLES);

  return picked.map((t) => ({
    title: t.title,
    description: (t.description ?? '').slice(0, MAX_EXAMPLE_DESCRIPTION_LENGTH),
    xp: t.xp,
    eternas: t.eternas,
  }));
}

/**
 * Shared reward-estimation + project/track-matching rules, reused by both the single-task
 * estimate prompt and the bulk task-intake prompt so behavior stays consistent between them.
 */
export function buildRewardRubricLines(): string[] {
  return [
    'Шкала XP ориентируется на пороги уровней персонажа: 300/700/1200/2000/3000/5000/8000 суммарного XP на уровень.',
    'Ориентиры за одну задачу: мелкая (15-30 минут) — 10-30 XP; средняя (несколько часов) — 30-80 XP; крупная (день и больше) — 80-150 XP.',
    'Этерны обычно составляют около четверти от XP (например, 20 XP -> 5 этерн), округляй разумно.',
    'Дополнительно определи, к какому существующему проекту и/или треку развития явно относится задача — по спискам кандидатов из промпта.',
    'В списке треков после названия через запятую может идти цель и текущий этап — это только справочная информация для тебя, в ответ её включать нельзя.',
    'В trackTitle и projectTitle возвращай ТОЛЬКО голое название кандидата (то, что до первой запятой в списке), точно как оно написано, либо null, если однозначной связи нет. Не выдумывай проекты/треки, которых нет в списке.',
    'По умолчанию возвращай null для projectTitle и trackTitle. Ставь конкретное название только если задача явно и недвусмысленно описывает работу именно над этим проектом/треком (например, совпадает тема, объект или контекст). Простое формальное сходство или общая категория (например бытовая задача рядом с проектом про здоровье) — недостаточное основание, в этом случае верни null. Лучше вернуть null, чем притянутое за уши совпадение.',
  ];
}

/** Case-insensitive title match that also tolerates the AI echoing extra text after the bare title. */
export function titleMatches(candidateTitle: string, aiValue: string): boolean {
  const a = candidateTitle.trim().toLowerCase();
  const b = aiValue.trim().toLowerCase();
  return a === b || b.startsWith(a);
}

function buildSystemPrompt(): string {
  return [
    'Ты помогаешь оценить награду за задачу в личном RPG-трекере продуктивности.',
    ...buildRewardRubricLines(),
    'Если даны примеры уже оценённых задач пользователя — калибруйся по ним в первую очередь, они важнее общих ориентиров.',
    'Ответь СТРОГО валидным JSON без пояснений, без markdown-разметки, в формате {"xp": <целое число>, "eternas": <целое число>, "projectTitle": <строка из списка или null>, "trackTitle": <строка из списка или null>}.',
  ].join(' ');
}

function buildUserPrompt(
  title: string,
  description: string,
  examples: EstimateExample[],
  projectTitles: string[],
  trackCandidates: TrackCandidate[],
): string {
  const lines: string[] = [];
  if (examples.length > 0) {
    lines.push('Примеры уже оценённых задач этого пользователя (title / description / xp / eternas):');
    for (const ex of examples) {
      lines.push(`- "${ex.title}" / "${ex.description}" / xp=${ex.xp} / eternas=${ex.eternas}`);
    }
    lines.push('');
  }
  if (projectTitles.length > 0) {
    lines.push('Активные проекты (кандидаты для projectTitle):');
    for (const p of projectTitles) lines.push(`- ${p}`);
    lines.push('');
  }
  if (trackCandidates.length > 0) {
    lines.push('Треки развития (кандидаты для trackTitle):');
    for (const t of trackCandidates) {
      const goalPart = t.goal ? `, цель: ${t.goal}` : '';
      const stagePart = t.currentStageTitle ? `, текущий этап: ${t.currentStageTitle}` : '';
      lines.push(`- ${t.title}${goalPart}${stagePart}`);
    }
    lines.push('');
  }
  lines.push('Оцени новую задачу:');
  lines.push(`Название: "${title}"`);
  lines.push(`Описание: "${description || '(без описания)'}"`);
  return lines.join('\n');
}

export function extractJson(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  return fenced ? fenced[1].trim() : trimmed;
}

/** Calls Claude via the proxy and returns the raw text of its reply. Shared by all AI features. */
export async function callAiForText(
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number,
  apiKey: string,
): Promise<string> {
  let response: Response;
  try {
    response = await fetch(AI_ENDPOINT, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: AI_MODEL,
        max_tokens: maxTokens,
        temperature: 0,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });
  } catch {
    throw new AiEstimateError('Не удалось связаться с AI-сервисом — проверьте подключение к интернету');
  }

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new AiEstimateError('AI-сервис отклонил ключ — проверьте его в Настройках');
    }
    throw new AiEstimateError(`AI-сервис вернул ошибку (${response.status})`);
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new AiEstimateError('AI-сервис вернул повреждённый ответ — попробуйте ещё раз');
  }

  const text = (data as { content?: { text?: unknown }[] })?.content?.[0]?.text;
  if (typeof text !== 'string') {
    throw new AiEstimateError('AI-сервис вернул неожиданный формат ответа');
  }
  return text;
}

export async function estimateTaskReward(input: EstimateTaskRewardInput): Promise<TaskEstimate> {
  const { title, description, examples, projectTitles, trackCandidates, apiKey } = input;
  const text = await callAiForText(
    buildSystemPrompt(),
    buildUserPrompt(title, description, examples, projectTitles, trackCandidates),
    200,
    apiKey,
  );

  let parsed: unknown;
  try {
    parsed = JSON.parse(extractJson(text));
  } catch {
    throw new AiEstimateError('Не удалось распознать ответ AI-сервиса');
  }

  const xp = (parsed as { xp?: unknown })?.xp;
  const eternas = (parsed as { eternas?: unknown })?.eternas;
  if (typeof xp !== 'number' || typeof eternas !== 'number' || !Number.isFinite(xp) || !Number.isFinite(eternas)) {
    throw new AiEstimateError('AI-сервис вернул некорректные числа');
  }

  const projectTitle = (parsed as { projectTitle?: unknown })?.projectTitle;
  const trackTitle = (parsed as { trackTitle?: unknown })?.trackTitle;

  return {
    xp: Math.max(0, Math.round(xp)),
    eternas: Math.max(0, Math.round(eternas)),
    projectTitle: typeof projectTitle === 'string' && projectTitle.trim() ? projectTitle.trim() : null,
    trackTitle: typeof trackTitle === 'string' && trackTitle.trim() ? trackTitle.trim() : null,
  };
}
