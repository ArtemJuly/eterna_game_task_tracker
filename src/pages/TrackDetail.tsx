import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTracks } from '../hooks/useTracks';
import { useTasks } from '../hooks/useTasks';
import { useProjects } from '../hooks/useProjects';
import { usePomodoros } from '../hooks/usePomodoros';
import { useConfirm } from '../hooks/useConfirm';
import { useSettings } from '../hooks/useSettings';
import { pushToast } from '../hooks/useToast';
import type { Track, TrackStage } from '../types';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import ProgressBar from '../components/ui/ProgressBar';
import TrackModal from '../components/TrackModal';
import TrackStageModal from '../components/TrackStageModal';
import { formatStageLevel, getStageLevelProgress } from '../utils/trackLevels';
import { getStageStats } from '../utils/trackStats';
import { AiEstimateError } from '../utils/aiTaskEstimate';
import { generateTrackPlan } from '../utils/aiTrackPlan';

export default function TrackDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    tracks,
    renameTrack,
    setTrackGoal,
    deleteTrack,
    addStage,
    addStages,
    renameStage,
    deleteStage,
    moveStage,
    advanceStage,
    completeTrack,
  } = useTracks();
  const { tasks } = useTasks();
  const { projects } = useProjects();
  const { sessions } = usePomodoros();
  const { confirm, dialog } = useConfirm();
  const { settings } = useSettings();
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [stageModalOpen, setStageModalOpen] = useState(false);
  const [editingStage, setEditingStage] = useState<TrackStage | null>(null);
  const [planning, setPlanning] = useState(false);

  const foundTrack = tracks.find((t) => t.id === id);

  if (!foundTrack) {
    return (
      <div className="flex flex-col gap-4">
        <Link to="/tracks" className="text-sm text-accent-xp hover:underline">
          ← Все треки
        </Link>
        <div className="rounded-lg border border-border bg-surface p-4 text-sm text-text-muted">
          Трек не найден
        </div>
      </div>
    );
  }

  const track: Track = foundTrack;

  function handleDeleteTrack() {
    confirm({
      title: 'Удалить трек?',
      message: `«${track.title}» вместе со всеми этапами будет удалён без возможности восстановления. Задачи, привязанные к этому треку, потеряют эту привязку.`,
      confirmLabel: 'Удалить трек',
      danger: true,
      onConfirm: () => {
        deleteTrack(track.id);
        navigate('/tracks');
      },
    });
  }

  function handleDeleteStage(stage: TrackStage) {
    confirm({
      title: 'Удалить этап?',
      message: `«${stage.title}» будет удалён без возможности восстановления. Задачи, привязанные к нему, потеряют эту привязку.`,
      confirmLabel: 'Удалить этап',
      danger: true,
      onConfirm: () => deleteStage(track.id, stage.id),
    });
  }

  function openCreateStage() {
    setEditingStage(null);
    setStageModalOpen(true);
  }

  function openEditStage(stage: TrackStage) {
    setEditingStage(stage);
    setStageModalOpen(true);
  }

  function handleStageSubmit(title: string, description: string, projectIds: string[]) {
    if (editingStage) {
      renameStage(track.id, editingStage.id, title, description, projectIds);
    } else {
      addStage(track.id, title, description, projectIds);
    }
  }

  async function handleAiPlan() {
    if (!settings.aiApiKey) {
      pushToast('Добавьте API-ключ в Настройках', 'error');
      return;
    }
    setPlanning(true);
    try {
      const stages = await generateTrackPlan(
        track.title,
        track.goal,
        track.stages.map((s) => s.title),
        settings.aiApiKey,
      );
      addStages(track.id, stages);
      pushToast(`AI добавил этапов: ${stages.length}`);
    } catch (err) {
      if (!(err instanceof AiEstimateError)) console.error('AI track plan failed:', err);
      const message = err instanceof AiEstimateError ? err.message : 'Не удалось получить план AI';
      pushToast(message, 'error');
    } finally {
      setPlanning(false);
    }
  }

  function handleAdvanceStage(stage: TrackStage, nextStage: TrackStage) {
    const stats = getStageStats(tasks, sessions, track.id, stage.id, stage.projectIds);
    confirm({
      title: 'Перейти на следующий этап?',
      message: (
        <div className="flex flex-col gap-1">
          <p>
            Статистика по этапу «{stage.title}»:
          </p>
          <p>XP в этапе: {stage.xp}</p>
          <p>Выполнено задач: {stats.completedTasks}</p>
          <p>Время обучения: {stats.studyMinutes} мин</p>
          <p className="mt-2">Открыть этап «{nextStage.title}»?</p>
        </div>
      ),
      confirmLabel: 'Перейти',
      onConfirm: () => advanceStage(track.id),
    });
  }

  function handleCompleteTrack(stage: TrackStage) {
    const stats = getStageStats(tasks, sessions, track.id, stage.id, stage.projectIds);
    confirm({
      title: 'Завершить трек?',
      message: (
        <div className="flex flex-col gap-1">
          <p>
            Статистика по этапу «{stage.title}»:
          </p>
          <p>XP в этапе: {stage.xp}</p>
          <p>Выполнено задач: {stats.completedTasks}</p>
          <p>Время обучения: {stats.studyMinutes} мин</p>
          <p className="mt-2">Это последний этап трека «{track.title}». Отметить трек полностью пройденным?</p>
        </div>
      ),
      confirmLabel: 'Завершить трек',
      onConfirm: () => completeTrack(track.id),
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <Link to="/tracks" className="text-sm text-accent-xp hover:underline">
        ← Все треки
      </Link>

      <div className="rounded-lg border border-border bg-surface p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-text-primary">{track.title}</h1>
            {track.status === 'done' && <Badge tone="success">Завершён</Badge>}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => setEditModalOpen(true)}>
              Редактировать
            </Button>
            <Button variant="danger" onClick={handleDeleteTrack}>
              Удалить
            </Button>
          </div>
        </div>
        {track.goal && <p className="mt-2 text-sm text-text-muted">{track.goal}</p>}
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-text-primary">Этапы</h2>
        <div className="flex items-center gap-2">
          <Button variant="secondary" disabled={planning} onClick={handleAiPlan}>
            {planning ? 'Планирую...' : '🤖 Предложить план'}
          </Button>
          <Button variant="primary" onClick={openCreateStage}>
            + Добавить этап
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {track.stages.length === 0 ? (
          <div className="rounded-lg border border-border bg-surface p-4 text-sm text-text-muted">
            В этом треке пока нет этапов
          </div>
        ) : (
          track.stages.map((stage, index) => {
            const isCompleted = index < track.currentStageIndex;
            const isCurrent = index === track.currentStageIndex;
            const isLocked = index > track.currentStageIndex;
            const progress = getStageLevelProgress(stage.xp);
            const nextStage = track.stages[index + 1];
            const linkedProjects = stage.projectIds
              .map((id) => projects.find((p) => p.id === id))
              .filter((p): p is NonNullable<typeof p> => p !== undefined);
            // A locked stage can still accumulate XP ahead of time via an attached project's tasks —
            // show its progress once it has any, not just once it becomes the current/completed stage.
            const showProgress = isCompleted || isCurrent || stage.xp > 0;

            return (
              <div
                key={stage.id}
                className={`rounded-lg border px-4 py-3 ${
                  isCurrent ? 'border-accent-xp/50 bg-accent-xp/[0.04]' : 'border-border bg-surface'
                } ${isLocked ? 'opacity-60' : ''}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex flex-1 items-center gap-2">
                    <span className="text-xs text-text-muted tabular-nums">{index + 1}.</span>
                    <span className="font-medium text-text-primary">{stage.title}</span>
                    {isCompleted && <Badge tone="success">Пройден</Badge>}
                    {isCurrent && <Badge tone="xp">Текущий</Badge>}
                    {isLocked && <Badge tone="muted">Заблокирован</Badge>}
                    {showProgress && <Badge tone="default">{formatStageLevel(progress.level)}</Badge>}
                    {linkedProjects.map((p) => (
                      <Link key={p.id} to={`/projects/${p.id}`} onClick={(e) => e.stopPropagation()}>
                        <Badge tone="eternas">📁 {p.title}</Badge>
                      </Link>
                    ))}
                  </div>

                  <div className="flex items-center gap-1">
                    <Button variant="ghost" disabled={index === 0} onClick={() => moveStage(track.id, stage.id, 'up')}>
                      ▲
                    </Button>
                    <Button
                      variant="ghost"
                      disabled={index === track.stages.length - 1}
                      onClick={() => moveStage(track.id, stage.id, 'down')}
                    >
                      ▼
                    </Button>
                    <Button variant="secondary" onClick={() => openEditStage(stage)}>
                      Редактировать
                    </Button>
                    <Button variant="ghost" onClick={() => handleDeleteStage(stage)}>
                      Удалить
                    </Button>
                  </div>
                </div>

                {stage.description && <p className="mt-1 pl-5 text-sm text-text-muted">{stage.description}</p>}

                {showProgress && (
                  <div className="mt-2">
                    <ProgressBar percent={progress.percent} />
                    <div className="mt-1 text-xs text-text-muted tabular-nums">
                      {stage.xp} XP {!progress.isMaxLevel && `· ${progress.xpIntoLevel} / ${progress.xpForLevel} до уровня ${formatStageLevel(progress.level + 1)}`}
                    </div>
                  </div>
                )}

                {isCurrent && (
                  <div className="mt-3">
                    {nextStage ? (
                      <Button
                        variant={progress.isMaxLevel ? 'primary' : 'secondary'}
                        onClick={() => handleAdvanceStage(stage, nextStage)}
                      >
                        {progress.isMaxLevel ? 'Перейти на следующий этап' : 'Отметить пройденным и перейти дальше'}
                      </Button>
                    ) : (
                      track.status !== 'done' && (
                        <Button
                          variant={progress.isMaxLevel ? 'primary' : 'secondary'}
                          onClick={() => handleCompleteTrack(stage)}
                        >
                          Завершить трек
                        </Button>
                      )
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <TrackModal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        onSubmit={({ title, goal }) => {
          renameTrack(track.id, title);
          setTrackGoal(track.id, goal);
        }}
        initialTrack={track}
      />
      <TrackStageModal
        open={stageModalOpen}
        onClose={() => setStageModalOpen(false)}
        onSubmit={handleStageSubmit}
        initialStage={editingStage}
      />
      {dialog}
    </div>
  );
}
