import { characterStore, historyStore, projectsStore, tasksStore, tracksStore } from './stores';
import type { Project } from '../types';
import { generateId } from '../utils/ids';
import { pushToast } from './useToast';
import { triggerXpPulse } from './useXpPulse';
import { pausePomodoroIfRunningForProject } from './usePomodoros';

const MAX_SPRINT_PROJECTS = 3;
const MAX_ACTIVE_PROJECTS = 5;

export interface NewProjectInput {
  title: string;
  goal: string;
  deadline: string | null;
  xp: number;
  eternas: number;
}

function normalizeProject(p: Project, fallbackPriority: number): Project {
  return {
    ...p,
    status: p.status ?? 'active',
    xp: p.xp ?? 0,
    eternas: p.eternas ?? 0,
    completedAt: p.completedAt ?? null,
    isSprint: p.isSprint ?? false,
    isActive: p.isActive ?? true,
    priority: p.priority ?? fallbackPriority,
  };
}

export function useProjects(): {
  projects: Project[];
  addProject: (input: NewProjectInput) => void;
  updateProject: (id: string, patch: Partial<NewProjectInput>) => void;
  deleteProject: (id: string) => void;
  completeProject: (id: string) => void;
  toggleSprint: (id: string) => void;
  toggleActive: (id: string) => void;
  moveProjectPriority: (id: string, direction: 'up' | 'down') => void;
} {
  const [rawProjects, setProjects] = projectsStore.useStore();
  const projects = rawProjects
    .map((p, index) => normalizeProject(p, index))
    .sort((a, b) => a.priority - b.priority);

  function addProject(input: NewProjectInput) {
    const activeCount = projects.filter((p) => p.isActive && p.status !== 'done').length;
    const isActive = activeCount < MAX_ACTIVE_PROJECTS;
    if (!isActive) {
      pushToast('Уже 5 активных проектов — новый проект добавлен как неактивный', 'error');
    }
    const priority = projects.length > 0 ? Math.max(...projects.map((p) => p.priority)) + 1 : 0;

    const project: Project = {
      id: generateId(),
      title: input.title,
      goal: input.goal,
      deadline: input.deadline,
      status: 'active',
      xp: input.xp,
      eternas: input.eternas,
      createdAt: new Date().toISOString(),
      completedAt: null,
      isSprint: false,
      isActive,
      priority,
    };
    setProjects((prev) => [...prev, project]);
  }

  function updateProject(id: string, patch: Partial<NewProjectInput>) {
    setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }

  function deleteProject(id: string) {
    pausePomodoroIfRunningForProject(id);
    setProjects((prev) => prev.filter((p) => p.id !== id));
    tasksStore.set((prev) => prev.map((t) => (t.projectId === id ? { ...t, projectId: null } : t)));
    tracksStore.set((prev) =>
      prev.map((track) => ({
        ...track,
        stages: track.stages.map((s) => (s.projectId === id ? { ...s, projectId: null } : s)),
      })),
    );
  }

  function completeProject(id: string) {
    const project = projects.find((p) => p.id === id);
    if (!project || project.status === 'done') return;

    pausePomodoroIfRunningForProject(id);
    const completedAt = new Date().toISOString();
    setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, status: 'done', completedAt } : p)));

    characterStore.set((prev) => ({
      totalXp: prev.totalXp + project.xp,
      eternas: prev.eternas + project.eternas,
    }));

    historyStore.set((prev) => [
      {
        id: generateId(),
        type: 'project_done',
        label: project.title,
        xpDelta: project.xp,
        eternasDelta: project.eternas,
        createdAt: completedAt,
      },
      ...prev,
    ]);

    triggerXpPulse();
    pushToast(`Проект завершён: +${project.xp} XP · +${project.eternas} ✦`, 'success');
  }

  function toggleSprint(id: string) {
    const project = projects.find((p) => p.id === id);
    if (!project) return;

    if (project.isSprint) {
      setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, isSprint: false } : p)));
      return;
    }

    const sprintCount = projects.filter((p) => p.isSprint).length;
    if (sprintCount >= MAX_SPRINT_PROJECTS) {
      pushToast('Уже выбрано 3 проекта-спринта — снимите отметку с одного, чтобы выбрать другой', 'error');
      return;
    }

    setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, isSprint: true } : p)));
  }

  function toggleActive(id: string) {
    const project = projects.find((p) => p.id === id);
    if (!project) return;

    if (project.isActive) {
      setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, isActive: false } : p)));
      return;
    }

    const activeCount = projects.filter((p) => p.isActive && p.status !== 'done').length;
    if (activeCount >= MAX_ACTIVE_PROJECTS) {
      pushToast('Уже выбрано 5 активных проектов — переведите один в неактивные, чтобы выбрать другой', 'error');
      return;
    }

    setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, isActive: true } : p)));
  }

  function moveProjectPriority(id: string, direction: 'up' | 'down') {
    const idx = projects.findIndex((p) => p.id === id);
    const swapWith = direction === 'up' ? idx - 1 : idx + 1;
    if (idx === -1 || swapWith < 0 || swapWith >= projects.length) return;

    const a = projects[idx];
    const b = projects[swapWith];
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id === a.id) return { ...p, priority: b.priority };
        if (p.id === b.id) return { ...p, priority: a.priority };
        return p;
      }),
    );
  }

  return {
    projects,
    addProject,
    updateProject,
    deleteProject,
    completeProject,
    toggleSprint,
    toggleActive,
    moveProjectPriority,
  };
}
