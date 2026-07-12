import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useProjects } from '../hooks/useProjects';
import { useTasks } from '../hooks/useTasks';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import ProgressBar from '../components/ui/ProgressBar';
import ProjectModal from '../components/ProjectModal';

export default function Projects() {
  const { projects, addProject } = useProjects();
  const { tasks } = useTasks();
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">Проекты</h1>
        <Button variant="primary" onClick={() => setModalOpen(true)}>
          + Новый проект
        </Button>
      </div>

      {projects.length === 0 ? (
        <div className="rounded-lg border border-border bg-surface p-4 text-sm text-text-muted">
          Проектов пока нет
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {projects.map((project) => {
            const projectTasks = tasks.filter((t) => t.projectId === project.id && t.status !== 'cancelled');
            const done = projectTasks.filter((t) => t.status === 'done').length;
            const total = projectTasks.length;
            const percent = total === 0 ? 0 : Math.round((done / total) * 100);
            const totalXp = projectTasks.reduce((sum, t) => sum + t.xp, 0);
            const totalEternas = projectTasks.reduce((sum, t) => sum + t.eternas, 0);

            return (
              <Link
                key={project.id}
                to={`/projects/${project.id}`}
                className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4 hover:bg-white/[0.04] transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <div
                      className={`font-semibold ${
                        project.status === 'done' ? 'text-text-muted line-through' : 'text-text-primary'
                      }`}
                    >
                      {project.title}
                    </div>
                    <Badge tone={project.status === 'done' ? 'success' : 'muted'}>
                      {project.status === 'done' ? 'Завершён' : 'Активен'}
                    </Badge>
                  </div>
                  {project.goal && <div className="mt-1 text-sm text-text-muted">{project.goal}</div>}
                  {project.deadline && (
                    <div className="mt-1 text-xs text-text-muted">
                      До {new Date(project.deadline).toLocaleDateString('ru-RU')}
                    </div>
                  )}
                </div>

                <div>
                  <div className="mb-1 text-sm text-text-muted tabular-nums">
                    {done} / {total} задач
                  </div>
                  <ProgressBar percent={percent} />
                </div>

                <div className="flex flex-col gap-0.5 text-sm text-text-muted tabular-nums">
                  <span>{totalXp} XP · {totalEternas} ✦ от задач</span>
                  <span>Награда за проект: {project.xp} XP · {project.eternas} ✦</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <ProjectModal open={modalOpen} onClose={() => setModalOpen(false)} onSubmit={addProject} />
    </div>
  );
}
