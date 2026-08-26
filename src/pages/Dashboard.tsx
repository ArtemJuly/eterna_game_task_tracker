import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCharacter } from '../hooks/useCharacter';
import { useTasks } from '../hooks/useTasks';
import { useProjects } from '../hooks/useProjects';
import { useTracks } from '../hooks/useTracks';
import { useGoalMap } from '../hooks/useGoalMap';
import { useHistory } from '../hooks/useHistory';
import { usePomodoros } from '../hooks/usePomodoros';
import { useDayPlan } from '../hooks/useDayPlan';
import { getLevelProgress } from '../utils/levels';
import { formatStageLevel, getStageLevelProgress } from '../utils/trackLevels';
import { useXpPulse } from '../hooks/useXpPulse';
import { buildCumulativeSeries, buildPomodoroSeries, buildTaskCompletionSeries } from '../utils/chartData';
import ProgressBar from '../components/ui/ProgressBar';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import AreaChart from '../components/ui/AreaChart';
import BarChart from '../components/ui/BarChart';
import TodayFocusButton from '../components/TodayFocusButton';
import { getTodayDateString } from '../utils/today';
import { formatMultiplier, getMultiplierIcon, getTaskRewardMultiplier } from '../utils/taskRewards';
import { formatRecurrence, getStreakStars, isTaskOverdue } from '../utils/recurrence';
import { findEnclosingGoalTitle } from '../utils/goalMap';
import { compareTasks } from '../utils/taskSort';

export default function Dashboard() {
  const navigate = useNavigate();
  const character = useCharacter();
  const { tasks, completeTask, toggleFocus } = useTasks();
  const today = getTodayDateString();
  const { projects } = useProjects();
  const { tracks } = useTracks();
  const { nodes } = useGoalMap();
  const history = useHistory();
  const { sessions } = usePomodoros();
  const { todayPlan } = useDayPlan();
  const planReasonByTaskId = useMemo(() => new Map(todayPlan.map((item) => [item.taskId, item.reason])), [todayPlan]);
  const dayPlanTaskIds = useMemo(() => new Set(todayPlan.map((item) => item.taskId)), [todayPlan]);
  const pulseTs = useXpPulse();

  const { level, next, xpIntoLevel, xpForLevel, percent } = getLevelProgress(character.totalXp);
  const pulse = pulseTs > 0 && Date.now() - pulseTs < 3000;

  const topTrack = tracks.find((t) => t.status !== 'done') ?? tracks[0] ?? null;
  const topStage = topTrack ? topTrack.stages[topTrack.currentStageIndex] ?? null : null;
  const stageProgress = topStage ? getStageLevelProgress(topStage.xp) : null;
  const nextTrackStage = topTrack && topStage ? topTrack.stages[topTrack.currentStageIndex + 1] ?? null : null;

  const topPriorityProject = projects[0];
  const priorityProjectNode = topPriorityProject
    ? nodes.find((n) => n.type === 'project' && n.projectId === topPriorityProject.id)
    : undefined;
  const enclosingGoalTitle = findEnclosingGoalTitle(nodes, priorityProjectNode);

  const taskCompletionSeries = buildTaskCompletionSeries(history, 14);
  const taskCompletionTotal = taskCompletionSeries.reduce((sum, p) => sum + p.value, 0);

  const pomodoroSeries = buildPomodoroSeries(sessions, 14);
  const pomodoroTotal = pomodoroSeries.reduce((sum, p) => sum + p.value, 0);
  const fourteenDaysAgo = Date.now() - 14 * 86400000;
  const pomodoroMinutesTotal = sessions
    .filter((s) => s.status === 'completed' && new Date(s.endedAt).getTime() >= fourteenDaysAgo)
    .reduce((sum, s) => sum + s.durationMinutes, 0);

  const xpSeries = buildCumulativeSeries(history, 'xpDelta', character.totalXp, 30);
  const xpDeltaPeriod = xpSeries[xpSeries.length - 1].value - xpSeries[0].value;

  const eternasSeries = buildCumulativeSeries(history, 'eternasDelta', character.eternas, 30);
  const eternasDeltaPeriod = eternasSeries[eternasSeries.length - 1].value - eternasSeries[0].value;

  const activeProjects = projects
    .filter((p) => p.status !== 'done')
    .slice(0, 3)
    .map((p) => {
      const projectTasks = tasks.filter((t) => t.projectId === p.id && t.status !== 'cancelled');
      const done = projectTasks.filter((t) => t.status === 'done').length;
      return { project: p, done, total: projectTasks.length };
    });

  const todayTasks = tasks
    .filter((t) => t.status === 'planned' || t.status === 'in_progress')
    .filter((t) => {
      const effectiveDue = t.dueDate ?? (t.recurrenceIntervalDays !== null ? t.nextDueDate : null);
      return t.focusDate === today || effectiveDue === today || dayPlanTaskIds.has(t.id);
    })
    .sort((a, b) => compareTasks(a, b, 'urgency', today, dayPlanTaskIds));

  return (
    <div className="flex flex-col gap-8">
      {(enclosingGoalTitle || topPriorityProject) && (
        <Link
          to="/goal-map"
          className="flex items-center gap-2 rounded-lg border border-accent-eternas/40 bg-accent-eternas/[0.06] px-4 py-2.5 text-sm hover:bg-accent-eternas/[0.1]"
        >
          {enclosingGoalTitle && (
            <>
              <span>🎯</span>
              <span className="font-medium text-text-primary">{enclosingGoalTitle}</span>
              {topPriorityProject && <span className="text-text-muted">→</span>}
            </>
          )}
          {topPriorityProject && (
            <>
              <span>🏆</span>
              <span className="font-medium text-text-primary">{topPriorityProject.title}</span>
            </>
          )}
        </Link>
      )}

      <section className="rounded-lg border border-border bg-surface p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">{topStage ? topStage.title : level.name}</h1>
            <div className="mt-1 text-sm text-text-muted tabular-nums">
              {topTrack && topStage && stageProgress ? (
                <>
                  {topTrack.title} · {formatStageLevel(stageProgress.level)} · {character.totalXp} XP
                </>
              ) : (
                <>{character.totalXp} XP</>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-text-muted">Этерны</div>
            <div className="text-xl font-semibold text-accent-eternas tabular-nums">
              ✦ {character.eternas}
            </div>
          </div>
        </div>

        <div className="mt-5">
          <ProgressBar percent={stageProgress ? stageProgress.percent : percent} gradient pulse={pulse} height={8} />
          <div className="mt-2 text-sm text-text-muted tabular-nums">
            {stageProgress ? (
              stageProgress.isMaxLevel ? (
                nextTrackStage ? (
                  <>Этап «{topStage!.title}» пройден на максимум · впереди «{nextTrackStage.title}»</>
                ) : (
                  'Финальный этап трека пройден на максимум!'
                )
              ) : (
                <>
                  {stageProgress.xpIntoLevel} / {stageProgress.xpForLevel} XP · до уровня{' '}
                  {formatStageLevel(stageProgress.level + 1)}
                </>
              )
            ) : next ? (
              <>
                {xpIntoLevel} / {xpForLevel} XP · до уровня «{next.name}»
              </>
            ) : (
              'Максимальный уровень достигнут'
            )}
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-text-primary">Прогресс</h2>
        <div className="grid grid-cols-4 gap-4">
          <div className="rounded-lg border border-border bg-surface p-4">
            <div className="text-sm text-text-muted">Задачи выполнено</div>
            <div className="mt-1 text-2xl font-bold text-accent-xp tabular-nums">{taskCompletionTotal}</div>
            <div className="text-xs text-text-muted">за 14 дней</div>
            <div className="mt-3">
              <BarChart data={taskCompletionSeries} color="var(--accent-xp)" height={80} />
            </div>
          </div>

          <div className="rounded-lg border border-border bg-surface p-4">
            <div className="text-sm text-text-muted">Помидоры</div>
            <div className="mt-1 text-2xl font-bold text-success tabular-nums">{pomodoroTotal}</div>
            <div className="text-xs text-text-muted tabular-nums">за 14 дней · {pomodoroMinutesTotal} мин</div>
            <div className="mt-3">
              <BarChart data={pomodoroSeries} color="var(--success)" height={80} />
            </div>
          </div>

          <div className="rounded-lg border border-border bg-surface p-4">
            <div className="text-sm text-text-muted">Опыт</div>
            <div className="mt-1 text-2xl font-bold text-accent-xp tabular-nums">{character.totalXp} XP</div>
            <div className="text-xs text-text-muted tabular-nums">
              {xpDeltaPeriod >= 0 ? '+' : ''}
              {xpDeltaPeriod} за 30 дней
            </div>
            <div className="mt-3">
              <AreaChart data={xpSeries} color="var(--accent-xp)" height={80} />
            </div>
          </div>

          <div className="rounded-lg border border-border bg-surface p-4">
            <div className="text-sm text-text-muted">Этерны на счету</div>
            <div className="mt-1 text-2xl font-bold text-accent-eternas tabular-nums">✦ {character.eternas}</div>
            <div className="text-xs text-text-muted tabular-nums">
              {eternasDeltaPeriod >= 0 ? '+' : ''}
              {eternasDeltaPeriod} за 30 дней
            </div>
            <div className="mt-3">
              <AreaChart data={eternasSeries} color="var(--accent-eternas)" height={80} />
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text-primary">Активные проекты</h2>
          <Link to="/projects" className="text-sm text-accent-xp hover:underline">
            Все проекты →
          </Link>
        </div>
        {activeProjects.length === 0 ? (
          <div className="rounded-lg border border-border bg-surface p-4 text-sm text-text-muted">
            Нет активных проектов
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {activeProjects.map(({ project, done, total }) => (
              <Link
                key={project.id}
                to={`/projects/${project.id}`}
                className={`rounded-lg border p-4 transition-colors hover:bg-overlay/[0.04] ${
                  project.isSprint
                    ? 'border-accent-xp bg-accent-xp/[0.06] ring-2 ring-accent-xp'
                    : project.isActive
                      ? 'border-accent-eternas/50 bg-accent-eternas/[0.04]'
                      : 'border-border bg-surface'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  {project.isSprint ? (
                    <span title="Проект-спринт: задачи дают ×1.2 к XP и этернам">🚀</span>
                  ) : (
                    <span title="Не входит в топ-3 проектов-спринтов">⭐</span>
                  )}
                  <div className="font-medium text-text-primary">{project.title}</div>
                </div>
                <div className="mt-1 text-sm text-text-muted tabular-nums">
                  {done}/{total} задач
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-text-primary">Задачи на сегодня</h2>
        {todayTasks.length === 0 ? (
          <div className="rounded-lg border border-border bg-surface p-4 text-sm text-text-muted">
            На сегодня ничего не запланировано
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {todayTasks.map((task) => {
              const project = projects.find((p) => p.id === task.projectId);
              const parentTask = task.parentTaskId ? tasks.find((t) => t.id === task.parentTaskId) : undefined;
              const isFocused = task.focusDate === today;
              const dayPlanReason = planReasonByTaskId.get(task.id);
              const isInDayPlan = dayPlanReason !== undefined;
              const rewardMultiplier = getTaskRewardMultiplier(task, projects, today);
              const multiplierIcon = getMultiplierIcon(task, projects, today);
              const rowTone = isFocused
                ? 'border-accent-xp/50 bg-accent-xp/[0.04]'
                : isInDayPlan
                  ? 'border-accent-eternas/40 bg-accent-eternas/[0.03]'
                  : 'border-border bg-surface';
              return (
                <div
                  key={task.id}
                  onClick={() => navigate(`/tasks/${task.id}`)}
                  className={`group flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 transition-colors hover:bg-overlay/[0.03] ${rowTone}`}
                >
                  <div onClick={(e) => e.stopPropagation()}>
                    <TodayFocusButton active={isFocused} onClick={() => toggleFocus(task.id)} />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-text-primary group-hover:underline">{task.title}</div>
                    <div className="mt-1 flex items-center gap-2 text-sm text-text-muted">
                      {project && <span>{project.title}</span>}
                      {parentTask && <Badge tone="muted">↳ {parentTask.title}</Badge>}
                      {isInDayPlan && (
                        <span title={dayPlanReason}>
                          <Badge tone="eternas">🤖 План дня</Badge>
                        </span>
                      )}
                      {task.recurrenceIntervalDays !== null && (
                        <Badge tone="muted">🔁 {formatRecurrence(task.recurrenceIntervalDays)}</Badge>
                      )}
                      {task.streakCount > 0 && <Badge tone="eternas">🔥 ×{task.streakCount}</Badge>}
                      {getStreakStars(task.streakCount) > 0 && (
                        <Badge tone="xp">{'⭐'.repeat(getStreakStars(task.streakCount))}</Badge>
                      )}
                      {isTaskOverdue(task, today) && <Badge tone="danger">Просрочено</Badge>}
                      {rewardMultiplier !== 1 ? (
                        <span className="text-accent-xp tabular-nums">
                          {multiplierIcon}×{formatMultiplier(rewardMultiplier)} +{Math.round(task.xp * rewardMultiplier)} XP · +
                          {Math.round(task.eternas * rewardMultiplier)} ✦
                        </span>
                      ) : (
                        <span className="tabular-nums">
                          +{task.xp} XP · +{task.eternas} ✦
                        </span>
                      )}
                    </div>
                  </div>
                  <div onClick={(e) => e.stopPropagation()}>
                    <Button variant="primary" onClick={() => completeTask(task.id)}>
                      Выполнить
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
