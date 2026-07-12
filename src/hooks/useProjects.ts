import { characterStore, historyStore, projectsStore, tasksStore } from './stores';
import type { Project } from '../types';
import { generateId } from '../utils/ids';
import { pushToast } from './useToast';
import { triggerXpPulse } from './useXpPulse';

export interface NewProjectInput {
  title: string;
  goal: string;
  deadline: string | null;
  xp: number;
  eternas: number;
}

function normalizeProject(p: Project): Project {
  return {
    ...p,
    status: p.status ?? 'active',
    xp: p.xp ?? 0,
    eternas: p.eternas ?? 0,
    completedAt: p.completedAt ?? null,
  };
}

export function useProjects(): {
  projects: Project[];
  addProject: (input: NewProjectInput) => void;
  updateProject: (id: string, patch: Partial<NewProjectInput>) => void;
  deleteProject: (id: string) => void;
  completeProject: (id: string) => void;
} {
  const [rawProjects, setProjects] = projectsStore.useStore();
  const projects = rawProjects.map(normalizeProject);

  function addProject(input: NewProjectInput) {
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
    };
    setProjects((prev) => [...prev, project]);
  }

  function updateProject(id: string, patch: Partial<NewProjectInput>) {
    setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }

  function deleteProject(id: string) {
    setProjects((prev) => prev.filter((p) => p.id !== id));
    tasksStore.set((prev) => prev.map((t) => (t.projectId === id ? { ...t, projectId: null } : t)));
  }

  function completeProject(id: string) {
    const project = projects.find((p) => p.id === id);
    if (!project || project.status === 'done') return;

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

  return { projects, addProject, updateProject, deleteProject, completeProject };
}
