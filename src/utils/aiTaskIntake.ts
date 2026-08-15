import {
  AiEstimateError,
  buildRewardRubricLines,
  callAiForText,
  extractJson,
  type TrackCandidate,
} from './aiTaskEstimate';

const MAX_TASKS = 30;

export interface TaskDraft {
  title: string;
  description: string;
  xp: number;
  eternas: number;
  projectTitle: string | null;
  trackTitle: string | null;
}

function buildSystemPrompt(): string {
  return [
    'Ты помогаешь разобрать вставленный пользователем текст со списком задач в личном RPG-трекере продуктивности.',
    'Раздели текст на отдельные задачи: каждый пункт списка, строка или явно отдельная мысль — одна задача.',
    'Для каждой задачи придумай короткое title и, если в исходном тексте есть детали — короткое description (иначе пустая строка).',
    'Для каждой задачи оцени награду по тем же правилам:',
    ...buildRewardRubricLines(),
    'Ответь СТРОГО валидным JSON-массивом без пояснений и без markdown-разметки, в формате [{"title": "...", "description": "...", "xp": <целое число>, "eternas": <целое число>, "projectTitle": <строка из списка или null>, "trackTitle": <строка из списка или null>}].',
  ].join(' ');
}

function buildUserPrompt(rawText: string, projectTitles: string[], trackCandidates: TrackCandidate[]): string {
  const lines: string[] = [];
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
  lines.push('Разбери на задачи следующий текст:');
  lines.push(rawText);
  return lines.join('\n');
}

export async function parseTaskList(
  rawText: string,
  projectTitles: string[],
  trackCandidates: TrackCandidate[],
  apiKey: string,
): Promise<TaskDraft[]> {
  const text = await callAiForText(buildSystemPrompt(), buildUserPrompt(rawText, projectTitles, trackCandidates), 2000, apiKey);

  let parsed: unknown;
  try {
    parsed = JSON.parse(extractJson(text));
  } catch {
    throw new AiEstimateError('Не удалось распознать ответ AI-сервиса');
  }

  if (!Array.isArray(parsed)) {
    throw new AiEstimateError('AI-сервис вернул некорректный формат списка задач');
  }

  const drafts = parsed
    .filter((item): item is Record<string, unknown> => typeof item?.title === 'string' && item.title.trim().length > 0)
    .map((item) => {
      const xp = typeof item.xp === 'number' && Number.isFinite(item.xp) ? Math.max(0, Math.round(item.xp)) : 20;
      const eternas =
        typeof item.eternas === 'number' && Number.isFinite(item.eternas) ? Math.max(0, Math.round(item.eternas)) : 5;
      const projectTitle = typeof item.projectTitle === 'string' && item.projectTitle.trim() ? item.projectTitle.trim() : null;
      const trackTitle = typeof item.trackTitle === 'string' && item.trackTitle.trim() ? item.trackTitle.trim() : null;
      return {
        title: (item.title as string).trim(),
        description: typeof item.description === 'string' ? item.description.trim() : '',
        xp,
        eternas,
        projectTitle,
        trackTitle,
      };
    })
    .slice(0, MAX_TASKS);

  if (drafts.length === 0) {
    throw new AiEstimateError('AI не нашёл в тексте ни одной задачи');
  }

  return drafts;
}
