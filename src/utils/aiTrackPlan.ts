import { AiEstimateError, callAiForText, extractJson } from './aiTaskEstimate';

const MAX_STAGES = 10;

export interface TrackPlanStage {
  title: string;
  description: string;
}

function buildSystemPrompt(): string {
  return [
    'Ты помогаешь спланировать личный трек развития в RPG-трекере продуктивности.',
    'Трек — это путь к цели/рангу (например "Исполнительный директор"), разбитый на последовательные этапы.',
    'Предложи от 4 до 8 следующих этапов между текущим состоянием пользователя и его целью — конкретных, реалистичных, в логическом порядке возрастания.',
    'Если уже даны существующие этапы — не повторяй их, продолжай план после них.',
    'Если цель не указана — предложи разумный общий путь развития по названию трека.',
    'Для каждого этапа дай короткое (1-2 предложения) описание — что конкретно значит его пройти.',
    'Ответь СТРОГО валидным JSON-массивом без пояснений, без markdown-разметки, в формате [{"title": "...", "description": "..."}].',
  ].join(' ');
}

function buildUserPrompt(trackTitle: string, trackGoal: string, existingStageTitles: string[]): string {
  const lines: string[] = [];
  lines.push(`Название трека: "${trackTitle}"`);
  lines.push(`Цель: "${trackGoal || '(не указана)'}"`);
  if (existingStageTitles.length > 0) {
    lines.push('Уже существующие этапы по порядку:');
    for (const title of existingStageTitles) lines.push(`- ${title}`);
  } else {
    lines.push('Существующих этапов пока нет — план начинается с нуля.');
  }
  return lines.join('\n');
}

export async function generateTrackPlan(
  trackTitle: string,
  trackGoal: string,
  existingStageTitles: string[],
  apiKey: string,
): Promise<TrackPlanStage[]> {
  const text = await callAiForText(buildSystemPrompt(), buildUserPrompt(trackTitle, trackGoal, existingStageTitles), 1000, apiKey);

  let parsed: unknown;
  try {
    parsed = JSON.parse(extractJson(text));
  } catch {
    throw new AiEstimateError('Не удалось распознать ответ AI-сервиса');
  }

  if (!Array.isArray(parsed)) {
    throw new AiEstimateError('AI-сервис вернул некорректный формат плана');
  }

  const stages = parsed
    .filter(
      (s): s is TrackPlanStage =>
        typeof s?.title === 'string' && s.title.trim().length > 0 && typeof s?.description === 'string',
    )
    .map((s) => ({ title: s.title.trim(), description: s.description.trim() }))
    .slice(0, MAX_STAGES);

  if (stages.length === 0) {
    throw new AiEstimateError('AI-сервис не предложил ни одного этапа');
  }

  return stages;
}
