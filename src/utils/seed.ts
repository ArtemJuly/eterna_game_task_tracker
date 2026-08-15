import type { Character, HistoryEntry, Project, Reward, Task, Track } from '../types';
import { generateId } from './ids';
import { STORAGE_KEYS, writeStorage } from './storage';

export function seedIfEmpty(): void {
  if (localStorage.getItem(STORAGE_KEYS.character)) return;

  const now = Date.now();
  const iso = (offsetDays: number) => new Date(now - offsetDays * 86400000).toISOString();

  const projIdDirector = generateId();
  const projIdThesis = generateId();
  const projIdHealth = generateId();

  const character: Character = { totalXp: 420, eternas: 85 };

  const projects: Project[] = [
    {
      id: projIdDirector,
      title: 'Исполнительный директор',
      goal: 'Получить должность',
      deadline: null,
      status: 'active',
      xp: 200,
      eternas: 80,
      createdAt: iso(20),
      completedAt: null,
      isSprint: true,
      isActive: true,
      priority: 0,
    },
    {
      id: projIdThesis,
      title: 'Диссертация',
      goal: 'Защититься',
      deadline: null,
      status: 'active',
      xp: 300,
      eternas: 120,
      createdAt: iso(18),
      completedAt: null,
      isSprint: false,
      isActive: true,
      priority: 1,
    },
    {
      id: projIdHealth,
      title: 'Здоровье',
      goal: 'Регулярные тренировки',
      deadline: null,
      status: 'active',
      xp: 150,
      eternas: 60,
      createdAt: iso(15),
      completedAt: null,
      isSprint: false,
      isActive: false,
      priority: 2,
    },
  ];

  const todayStr = new Date(now).toISOString().slice(0, 10);

  const mathStageId = generateId();
  const quantTrackId = generateId();

  const tracks: Track[] = [
    {
      id: quantTrackId,
      title: 'Квант',
      goal: 'Стать квантовым аналитиком',
      createdAt: iso(30),
      currentStageIndex: 0,
      status: 'active',
      completedAt: null,
      stages: [
        { id: mathStageId, title: 'Математик', description: '', xp: 130, level: 2, projectId: null },
        { id: generateId(), title: 'Программирование', description: '', xp: 0, level: 1, projectId: null },
        { id: generateId(), title: 'Финансы', description: '', xp: 0, level: 1, projectId: null },
      ],
    },
    {
      id: generateId(),
      title: 'Английский язык',
      goal: '',
      createdAt: iso(25),
      currentStageIndex: 0,
      status: 'active',
      completedAt: null,
      stages: [{ id: generateId(), title: 'Разговорный', description: '', xp: 40, level: 1, projectId: null }],
    },
  ];

  const doneTask: Task = {
    id: generateId(),
    title: 'Отправить пакет документов по диссертации',
    description: '',
    projectId: projIdThesis,
    parentTaskId: null,
    status: 'done',
    xp: 30,
    eternas: 15,
    createdAt: iso(5),
    completedAt: iso(2),
    focusDate: null,
    recurrenceIntervalDays: null,
    nextDueDate: null,
    streakCount: 0,
    trackLinks: [],
  };

  const conceptTaskId = generateId();

  const tasks: Task[] = [
    {
      id: conceptTaskId,
      title: 'Подготовить концепцию проекта для руководителя',
      description:
        'Нужно предложить руководителю альтернативный подход к текущей модели: короткая концепция на 2-3 страницы, с акцентом на риски и ожидаемый эффект.',
      projectId: projIdDirector,
      parentTaskId: null,
      status: 'planned',
      xp: 50,
      eternas: 20,
      createdAt: iso(4),
      completedAt: null,
      focusDate: null,
      recurrenceIntervalDays: null,
      nextDueDate: null,
      streakCount: 0,
      trackLinks: [],
    },
    {
      id: generateId(),
      title: 'Собрать примеры аналогичных проектов',
      description: '',
      projectId: projIdDirector,
      parentTaskId: conceptTaskId,
      status: 'done',
      xp: 15,
      eternas: 5,
      createdAt: iso(4),
      completedAt: iso(3),
      focusDate: null,
      recurrenceIntervalDays: null,
      nextDueDate: null,
      streakCount: 0,
      trackLinks: [],
    },
    {
      id: generateId(),
      title: 'Набросать структуру презентации',
      description: '',
      projectId: projIdDirector,
      parentTaskId: conceptTaskId,
      status: 'planned',
      xp: 20,
      eternas: 5,
      createdAt: iso(4),
      completedAt: null,
      focusDate: null,
      recurrenceIntervalDays: null,
      nextDueDate: null,
      streakCount: 0,
      trackLinks: [],
    },
    {
      id: generateId(),
      title: 'Собрать данные для альтернативной модели',
      description: '',
      projectId: projIdDirector,
      parentTaskId: null,
      status: 'planned',
      xp: 40,
      eternas: 10,
      createdAt: iso(3),
      completedAt: null,
      focusDate: null,
      recurrenceIntervalDays: null,
      nextDueDate: null,
      streakCount: 0,
      trackLinks: [{ trackId: quantTrackId, stageId: mathStageId }],
    },
    {
      id: generateId(),
      title: 'Сходить в зал',
      description: 'Силовая тренировка, 40-60 минут.',
      projectId: projIdHealth,
      parentTaskId: null,
      status: 'planned',
      xp: 20,
      eternas: 5,
      createdAt: iso(2),
      completedAt: null,
      focusDate: null,
      recurrenceIntervalDays: 1,
      nextDueDate: todayStr,
      streakCount: 3,
      trackLinks: [],
    },
    {
      id: generateId(),
      title: 'Написать пост',
      description: '',
      projectId: null,
      parentTaskId: null,
      status: 'planned',
      xp: 25,
      eternas: 5,
      createdAt: iso(1),
      completedAt: null,
      focusDate: null,
      recurrenceIntervalDays: null,
      nextDueDate: null,
      streakCount: 0,
      trackLinks: [],
    },
    doneTask,
  ];

  const rewards: Reward[] = [
    {
      id: generateId(),
      title: 'Стейк',
      costEternas: 40,
      costMoney: null,
      status: 'wanted',
      createdAt: iso(10),
      purchasedAt: null,
    },
    {
      id: generateId(),
      title: 'Книга',
      costEternas: 50,
      costMoney: null,
      status: 'saving',
      createdAt: iso(9),
      purchasedAt: null,
    },
    {
      id: generateId(),
      title: 'День игры',
      costEternas: 120,
      costMoney: null,
      status: 'wanted',
      createdAt: iso(8),
      purchasedAt: null,
    },
    {
      id: generateId(),
      title: 'Новая игра',
      costEternas: 150,
      costMoney: null,
      status: 'wanted',
      createdAt: iso(7),
      purchasedAt: null,
    },
    {
      id: generateId(),
      title: 'Гаджет',
      costEternas: 600,
      costMoney: null,
      status: 'wanted',
      createdAt: iso(6),
      purchasedAt: null,
    },
  ];

  const history: HistoryEntry[] = [
    {
      id: generateId(),
      type: 'task_done',
      label: doneTask.title,
      xpDelta: doneTask.xp,
      eternasDelta: doneTask.eternas,
      createdAt: iso(2),
    },
    {
      id: generateId(),
      type: 'task_done',
      label: 'Провести встречу с командой',
      xpDelta: 35,
      eternasDelta: 10,
      createdAt: iso(4),
    },
    {
      id: generateId(),
      type: 'task_done',
      label: 'Сходить в зал',
      xpDelta: 20,
      eternasDelta: 5,
      createdAt: iso(6),
    },
    {
      id: generateId(),
      type: 'reward_purchased',
      label: 'Кофе навынос',
      xpDelta: 0,
      eternasDelta: -15,
      createdAt: iso(9),
    },
  ];

  writeStorage(STORAGE_KEYS.character, character);
  writeStorage(STORAGE_KEYS.projects, projects);
  writeStorage(STORAGE_KEYS.tasks, tasks);
  writeStorage(STORAGE_KEYS.rewards, rewards);
  writeStorage(STORAGE_KEYS.history, history);
  writeStorage(STORAGE_KEYS.tracks, tracks);
}
