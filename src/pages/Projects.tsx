import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useProjects } from '../hooks/useProjects';
import { useTasks } from '../hooks/useTasks';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import ProgressBar from '../components/ui/ProgressBar';
import ProjectModal from '../components/ProjectModal';
import SprintToggleButton from '../components/SprintToggleButton';
import ActiveStatusToggle from '../components/ActiveStatusToggle';

export default function Projects() {
  const { projects, addProject, toggleSprint, toggleActive, moveProjectPriority } = useProjects();
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
        <div className="flex flex-col gap-3">
          {projects.map((project, index) => {
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
                className={`flex gap-4 rounded-lg border p-4 transition-colors hover:bg-overlay/[0.04] ${
                  project.isActive
                    ? 'border-accent-eternas/50 bg-accent-eternas/[0.04]'
                    : 'border-border bg-surface'
                }`}
              >
                <div
                  className="flex flex-col items-center gap-1 pt-0.5"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                >
                  <span className="text-lg font-bold text-text-muted tabular-nums">#{index + 1}</span>
                  <div className="flex flex-col">
                    <Button
                      variant="ghost"
                      disabled={index === 0}
                      onClick={() => moveProjectPriority(project.id, 'up')}
                    >
                      ▲
                    </Button>
                    <Button
                      variant="ghost"
                      disabled={index === projects.length - 1}
                      onClick={() => moveProjectPriority(project.id, 'down')}
                    >
                      ▼
                    </Button>
                  </div>
                </div>

                <div className="flex flex-1 flex-col gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                        <SprintToggleButton active={project.isSprint} onClick={() => toggleSprint(project.id)} />
                      </div>
                      <div
                        className={`font-semibold ${
                          project.status === 'done' ? 'text-text-muted line-through' : 'text-text-primary'
                        }`}
                      >
                        {project.title}
                      </div>
                      <Badge tone={project.status === 'done' ? 'success' : 'muted'}>
                        {project.status === 'done' ? 'Завершён' : 'В процессе'}
                      </Badge>
                      {project.status !== 'done' && (
                        <div onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                          <ActiveStatusToggle active={project.isActive} onClick={() => toggleActive(project.id)} />
                        </div>
                      )}
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
