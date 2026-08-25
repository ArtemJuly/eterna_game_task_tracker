import { AiEstimateError, callAiForText, extractJson } from './aiTaskEstimate';

const MAX_ITEMS = 30;

export interface StageCandidate {
  trackId: string;
  stageId: string;
  trackTitle: string;
  stageTitle: string;
  trackGoal: string;
  stageDescription: string;
}

export interface ProjectCandidate {
  id: string;
  title: string;
  goal: string;
}

export interface ProjectStageMatch {
  project: ProjectCandidate;
  stage: StageCandidate | null;
  reason: string;
}

function buildSystemPrompt(): string {
  return [
    'Ты помогаешь распределить проекты пользователя по этапам треков развития в личном RPG-трекере продуктивности.',
    'Тебе даны пронумерованный список этапов треков (кандидаты) и пронумерованный список проектов без трека.',
    'Для каждого проекта определи, какому этапу он лучше всего соответствует по смыслу — исходя из названия и цели проекта, названия и цели трека, описания этапа.',
    'Указывай этап только при явном, недвусмысленном смысловом соответствии. Если ни один этап не подходит — верни null для этого проекта вместо stageIndex, не притягивай за уши.',
    'Ссылайся на этапы ТОЛЬКО по их номеру (stageIndex) из списка этапов, на проекты — по их номеру (projectIndex) из списка проектов. Не выдумывай.',
    'Верни ровно один элемент на каждый проект из списка проектов.',
    'Ответь СТРОГО валидным JSON-массивом без пояснений и без markdown-разметки, в формате [{"projectIndex": <целое число>, "stageIndex": <целое число или null>, "reason": "..."}].',
  ].join(' ');
}

function buildUserPrompt(stages: StageCandidate[], projects: ProjectCandidate[]): string {
  const lines: string[] = [];
  lines.push('Этапы треков (кандидаты):');
  stages.forEach((s, i) => {
    const parts = [`трек "${s.trackTitle}"`, `этап "${s.stageTitle}"`];
    if (s.trackGoal) parts.push(`цель трека: ${s.trackGoal}`);
    if (s.stageDescription) parts.push(`описание этапа: ${s.stageDescription}`);
    lines.push(`${i + 1}. ${parts.join(', ')}`);
  });
  lines.push('');
  lines.push('Проекты без трека:');
  projects.forEach((p, i) => {
    const parts = [`"${p.title}"`];
    if (p.goal) parts.push(`цель: ${p.goal}`);
    lines.push(`${i + 1}. ${parts.join(', ')}`);
  });
  return lines.join('\n');
}

export async function matchProjectsToStages(
  stages: StageCandidate[],
  projects: ProjectCandidate[],
  apiKey: string,
): Promise<ProjectStageMatch[]> {
  if (projects.length === 0) {
    throw new AiEstimateError('Нет проектов без трека для распределения');
  }
  if (stages.length === 0) {
    throw new AiEstimateError('В треках пока нет ни одного этапа');
  }

  const text = await callAiForText(buildSystemPrompt(), buildUserPrompt(stages, projects), 2000, apiKey);

  let parsed: unknown;
  try {
    parsed = JSON.parse(extractJson(text));
  } catch {
    throw new AiEstimateError('Не удалось распознать ответ AI-сервиса');
  }
  if (!Array.isArray(parsed)) {
    throw new AiEstimateError('AI-сервис вернул некорректный формат распределения');
  }

  const results: ProjectStageMatch[] = [];
  const seenProjectIndices = new Set<number>();
  for (const item of parsed) {
    const projectIndex = (item as { projectIndex?: unknown })?.projectIndex;
    const stageIndex = (item as { stageIndex?: unknown })?.stageIndex;
    const reason = (item as { reason?: unknown })?.reason;
    if (typeof projectIndex !== 'number' || !Number.isInteger(projectIndex) || seenProjectIndices.has(projectIndex)) {
      continue;
    }
    const project = projects[projectIndex - 1];
    if (!project) continue;
    seenProjectIndices.add(projectIndex);

    const stage =
      typeof stageIndex === 'number' && Number.isInteger(stageIndex) ? (stages[stageIndex - 1] ?? null) : null;
    results.push({ project, stage, reason: typeof reason === 'string' ? reason.trim() : '' });
  }

  // A project the model never mentioned at all is treated the same as an explicit "no match".
  for (const project of projects) {
    if (!results.some((r) => r.project.id === project.id)) {
      results.push({ project, stage: null, reason: '' });
    }
  }

  return results.slice(0, MAX_ITEMS);
}
