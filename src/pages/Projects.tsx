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
import ProjectStatusSelect from '../components/ProjectStatusSelect';
import ShowCompletedToggle from '../components/ShowCompletedToggle';

export default function Projects() {
  const { projects, addProject, toggleSprint, toggleActive, moveProjectPriority, reorderProjects, setProjectStatus } =
    useProjects();
  const { tasks } = useTasks();
  const [modalOpen, setModalOpen] = useState(false);
  const [showDone, setShowDone] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const activeProjects = projects.filter((p) => p.status !== 'done');

  function handleDrop(sourceId: string, targetId: string) {
    if (sourceId && sourceId !== targetId) {
      const ids = activeProjects.map((p) => p.id);
      const fromIndex = ids.indexOf(sourceId);
      const toIndex = ids.indexOf(targetId);
      if (fromIndex !== -1 && toIndex !== -1) {
        ids.splice(fromIndex, 1);
        ids.splice(toIndex, 0, sourceId);
        reorderProjects(ids);
      }
    }
    setDraggedId(null);
    setDragOverId(null);
  }
  const doneProjects = projects
    .filter((p) => p.status === 'done')
    .sort((a, b) => new Date(b.completedAt ?? 0).getTime() - new Date(a.completedAt ?? 0).getTime());

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">Проекты</h1>
        <div className="flex items-center gap-2">
          <ShowCompletedToggle show={showDone} onClick={() => setShowDone((prev) => !prev)} />
          <Button variant="primary" onClick={() => setModalOpen(true)}>
            + Новый проект
          </Button>
        </div>
      </div>

      {activeProjects.length === 0 ? (
        <div className="rounded-lg border border-border bg-surface p-4 text-sm text-text-muted">
          {projects.length === 0 ? 'Проектов пока нет' : 'Активных проектов нет'}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {activeProjects.map((project, index) => {
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
                draggable={false}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                  if (dragOverId !== project.id) setDragOverId(project.id);
                }}
                onDragLeave={(e) => {
                  if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                  setDragOverId((prev) => (prev === project.id ? null : prev));
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const sourceId = e.dataTransfer.getData('text/plain') || draggedId;
                  if (sourceId) handleDrop(sourceId, project.id);
                }}
                className={`flex gap-4 rounded-lg border p-4 transition-colors hover:bg-overlay/[0.04] ${
                  draggedId === project.id ? 'opacity-40' : ''
                } ${dragOverId === project.id && draggedId !== project.id ? 'border-accent-xp' : ''} ${
                  project.isSprint
                    ? 'border-accent-xp bg-accent-xp/[0.06] ring-2 ring-accent-xp'
                    : project.isActive
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
                  <div
                    draggable
                    onDragStart={(e) => {
                      setDraggedId(project.id);
                      e.dataTransfer.effectAllowed = 'move';
                      e.dataTransfer.setData('text/plain', project.id);
                    }}
                    onDragEnd={() => {
                      setDraggedId(null);
                      setDragOverId(null);
                    }}
                    title="Перетащить, чтобы изменить порядок"
                    className="cursor-grab select-none text-text-muted hover:text-text-primary active:cursor-grabbing"
                  >
                    ⠿
                  </div>
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
                      disabled={index === activeProjects.length - 1}
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
                      {project.isSprint && <Badge tone="xp">🚀 Спринт ×1.2</Badge>}
                      <ProjectStatusSelect status={project.status} onChange={(status) => setProjectStatus(project.id, status)} />
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

      {showDone && (
        <div className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-text-primary">Завершённые проекты</h2>
          {doneProjects.length === 0 ? (
            <div className="rounded-lg border border-border bg-surface p-4 text-sm text-text-muted">
              Пока ничего не завершено
            </div>
          ) : (
            doneProjects.map((project) => {
              const projectTasks = tasks.filter((t) => t.projectId === project.id && t.status !== 'cancelled');
              const done = projectTasks.filter((t) => t.status === 'done').length;
              const total = projectTasks.length;
              const percent = total === 0 ? 0 : Math.round((done / total) * 100);

              return (
                <Link
                  key={project.id}
                  to={`/projects/${project.id}`}
                  className="flex gap-4 rounded-lg border border-border bg-surface p-4 opacity-70 transition-colors hover:bg-overlay/[0.04] hover:opacity-100"
                >
                  <div className="flex flex-1 flex-col gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="font-semibold text-text-muted line-through">{project.title}</div>
                        <ProjectStatusSelect
                          status={project.status}
                          onChange={(status) => setProjectStatus(project.id, status)}
                        />
                      </div>
                      {project.completedAt && (
                        <div className="mt-1 text-xs text-text-muted">
                          Завершён {new Date(project.completedAt).toLocaleDateString('ru-RU')}
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="mb-1 text-sm text-text-muted tabular-nums">
                        {done} / {total} задач
                      </div>
                      <ProgressBar percent={percent} />
                    </div>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      )}

      <ProjectModal open={modalOpen} onClose={() => setModalOpen(false)} onSubmit={addProject} />
    </div>
  );
}
