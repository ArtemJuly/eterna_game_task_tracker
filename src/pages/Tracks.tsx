import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTracks } from '../hooks/useTracks';
import { useProjects } from '../hooks/useProjects';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import ProgressBar from '../components/ui/ProgressBar';
import TrackModal from '../components/TrackModal';
import ProjectTrackAssignModal from '../components/ProjectTrackAssignModal';
import { formatStageLevel, getStageLevelProgress } from '../utils/trackLevels';

export default function Tracks() {
  const { tracks, addTrack, moveTrackPriority } = useTracks();
  const { projects } = useProjects();
  const [modalOpen, setModalOpen] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);

  const assignedProjectIds = useMemo(
    () => new Set(tracks.flatMap((t) => t.stages.flatMap((s) => s.projectIds))),
    [tracks],
  );
  const unassignedProjects = useMemo(
    () => projects.filter((p) => p.status !== 'done' && !assignedProjectIds.has(p.id)),
    [projects, assignedProjectIds],
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">Треки развития</h1>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setAssignModalOpen(true)}>
            🤖 Распределить проекты
          </Button>
          <Button variant="primary" onClick={() => setModalOpen(true)}>
            + Новый трек
          </Button>
        </div>
      </div>

      {tracks.length === 0 ? (
        <div className="rounded-lg border border-border bg-surface p-4 text-sm text-text-muted">
          Треков пока нет
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {tracks.map((track, index) => {
            const currentStage = track.stages[track.currentStageIndex] ?? null;
            const progress = currentStage ? getStageLevelProgress(currentStage.xp) : null;

            return (
              <Link
                key={track.id}
                to={`/tracks/${track.id}`}
                className="flex gap-4 rounded-lg border border-border bg-surface p-4 hover:bg-overlay/[0.04] transition-colors"
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
                    <Button variant="ghost" disabled={index === 0} onClick={() => moveTrackPriority(track.id, 'up')}>
                      ▲
                    </Button>
                    <Button
                      variant="ghost"
                      disabled={index === tracks.length - 1}
                      onClick={() => moveTrackPriority(track.id, 'down')}
                    >
                      ▼
                    </Button>
                  </div>
                </div>

                <div className="flex flex-1 flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <div className="font-semibold text-text-primary">{track.title}</div>
                    {track.status === 'done' && <Badge tone="success">Завершён</Badge>}
                  </div>

                  {currentStage && progress ? (
                    <>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-text-primary">{currentStage.title}</span>
                        <Badge tone="xp">{formatStageLevel(progress.level)}</Badge>
                        {progress.isMaxLevel && <Badge tone="success">Готов к переходу</Badge>}
                      </div>
                      <ProgressBar percent={progress.percent} />
                      <div className="text-xs text-text-muted tabular-nums">
                        Этап {track.currentStageIndex + 1} / {track.stages.length}
                      </div>
                    </>
                  ) : (
                    <div className="text-sm text-text-muted">Этапов пока нет</div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <div>
        <h2 className="mb-3 text-lg font-semibold text-text-primary">🗑️ Проекты без трека</h2>
        {unassignedProjects.length === 0 ? (
          <div className="rounded-lg border border-border bg-surface p-4 text-sm text-text-muted">
            Все активные проекты привязаны к какому-нибудь треку.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-text-muted">
              Эти проекты не относятся ни к одному этапу — их XP не попадает ни в один трек. Нажми
              "🤖 Распределить проекты" выше, чтобы AI предложил, куда их пристроить.
            </p>
            <div className="flex flex-wrap gap-2">
              {unassignedProjects.map((p) => (
                <Link
                  key={p.id}
                  to={`/projects/${p.id}`}
                  className="rounded-[4px] border border-border bg-surface px-2 py-1 text-xs text-text-primary hover:border-accent-xp/50"
                >
                  {p.title}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      <TrackModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={({ title, goal }) => addTrack(title, goal)}
      />
      <ProjectTrackAssignModal open={assignModalOpen} onClose={() => setAssignModalOpen(false)} />
    </div>
  );
}
