import type { Character, HistoryEntry, Project, Reward, Task } from '../types';
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
    },
  ];

  const doneTask: Task = {
    id: generateId(),
    title: 'Отправить пакет документов по диссертации',
    projectId: projIdThesis,
    parentTaskId: null,
    status: 'done',
    xp: 30,
    eternas: 15,
    createdAt: iso(5),
    completedAt: iso(2),
    focusDate: null,
  };

  const conceptTaskId = generateId();

  const tasks: Task[] = [
    {
      id: conceptTaskId,
      title: 'Подготовить концепцию проекта для руководителя',
      projectId: projIdDirector,
      parentTaskId: null,
      status: 'planned',
      xp: 50,
      eternas: 20,
      createdAt: iso(4),
      completedAt: null,
      focusDate: null,
    },
    {
      id: generateId(),
      title: 'Собрать примеры аналогичных проектов',
      projectId: projIdDirector,
      parentTaskId: conceptTaskId,
      status: 'done',
      xp: 15,
      eternas: 5,
      createdAt: iso(4),
      completedAt: iso(3),
      focusDate: null,
    },
    {
      id: generateId(),
      title: 'Набросать структуру презентации',
      projectId: projIdDirector,
      parentTaskId: conceptTaskId,
      status: 'planned',
      xp: 20,
      eternas: 5,
      createdAt: iso(4),
      completedAt: null,
      focusDate: null,
    },
    {
      id: generateId(),
      title: 'Собрать данные для альтернативной модели',
      projectId: projIdDirector,
      parentTaskId: null,
      status: 'planned',
      xp: 40,
      eternas: 10,
      createdAt: iso(3),
      completedAt: null,
      focusDate: null,
    },
    {
      id: generateId(),
      title: 'Сходить в зал',
      projectId: projIdHealth,
      parentTaskId: null,
      status: 'planned',
      xp: 20,
      eternas: 5,
      createdAt: iso(2),
      completedAt: null,
      focusDate: null,
    },
    {
      id: generateId(),
      title: 'Написать пост',
      projectId: null,
      parentTaskId: null,
      status: 'planned',
      xp: 25,
      eternas: 5,
      createdAt: iso(1),
      completedAt: null,
      focusDate: null,
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
}
