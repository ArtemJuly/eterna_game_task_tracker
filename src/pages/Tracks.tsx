import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTracks } from '../hooks/useTracks';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import ProgressBar from '../components/ui/ProgressBar';
import TrackModal from '../components/TrackModal';
import { formatStageLevel, getStageLevelProgress } from '../utils/trackLevels';

export default function Tracks() {
  const { tracks, addTrack } = useTracks();
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">Треки развития</h1>
        <Button variant="primary" onClick={() => setModalOpen(true)}>
          + Новый трек
        </Button>
      </div>

      {tracks.length === 0 ? (
        <div className="rounded-lg border border-border bg-surface p-4 text-sm text-text-muted">
          Треков пока нет
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {tracks.map((track) => {
            const currentStage = track.stages[track.currentStageIndex] ?? null;
            const progress = currentStage ? getStageLevelProgress(currentStage.xp) : null;

            return (
              <Link
                key={track.id}
                to={`/tracks/${track.id}`}
                className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4 hover:bg-overlay/[0.04] transition-colors"
              >
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
              </Link>
            );
          })}
        </div>
      )}

      <TrackModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={({ title, goal }) => addTrack(title, goal)}
      />
    </div>
  );
}
