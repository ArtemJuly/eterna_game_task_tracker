import { Link, useNavigate } from 'react-router-dom';
import { useCharacter } from '../hooks/useCharacter';
import { useTasks } from '../hooks/useTasks';
import { useProjects } from '../hooks/useProjects';
import { useHistory } from '../hooks/useHistory';
import { usePomodoros } from '../hooks/usePomodoros';
import { getLevelProgress } from '../utils/levels';
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

export default function Dashboard() {
  const navigate = useNavigate();
  const character = useCharacter();
  const { tasks, completeTask, toggleFocus } = useTasks();
  const today = getTodayDateString();
  const { projects } = useProjects();
  const history = useHistory();
  const { sessions } = usePomodoros();
  const pulseTs = useXpPulse();

  const { level, next, xpIntoLevel, xpForLevel, percent } = getLevelProgress(character.totalXp);
  const pulse = pulseTs > 0 && Date.now() - pulseTs < 3000;

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

  const upcomingTasks = tasks
    .filter((t) => t.status === 'planned' || t.status === 'in_progress')
    .sort((a, b) => {
      const aFocused = a.focusDate === today ? 1 : 0;
      const bFocused = b.focusDate === today ? 1 : 0;
      if (aFocused !== bFocused) return bFocused - aFocused;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    })
    .slice(0, 5);

  return (
    <div className="flex flex-col gap-8">
      <section className="rounded-lg border border-border bg-surface p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">{level.name}</h1>
            <div className="mt-1 text-sm text-text-muted tabular-nums">
              {character.totalXp} XP
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
          <ProgressBar percent={percent} gradient pulse={pulse} height={8} />
          <div className="mt-2 text-sm text-text-muted tabular-nums">
            {next ? (
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
                  project.isActive ? 'border-accent-eternas/50 bg-accent-eternas/[0.04]' : 'border-border bg-surface'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  {project.isSprint && <span>🚀</span>}
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
        <h2 className="mb-3 text-lg font-semibold text-text-primary">Ближайшие задачи</h2>
        {upcomingTasks.length === 0 ? (
          <div className="rounded-lg border border-border bg-surface p-4 text-sm text-text-muted">
            Нет запланированных задач
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {upcomingTasks.map((task) => {
              const project = projects.find((p) => p.id === task.projectId);
              const parentTask = task.parentTaskId ? tasks.find((t) => t.id === task.parentTaskId) : undefined;
              const isFocused = task.focusDate === today;
              const rewardMultiplier = getTaskRewardMultiplier(task, projects, today);
              const multiplierIcon = getMultiplierIcon(task, projects, today);
              return (
                <div
                  key={task.id}
                  onClick={() => navigate(`/tasks/${task.id}`)}
                  className={`group flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 transition-colors hover:bg-overlay/[0.03] ${
                    isFocused ? 'border-accent-xp/50 bg-accent-xp/[0.04]' : 'border-border bg-surface'
                  }`}
                >
                  <div onClick={(e) => e.stopPropagation()}>
                    <TodayFocusButton active={isFocused} onClick={() => toggleFocus(task.id)} />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-text-primary group-hover:underline">{task.title}</div>
                    <div className="mt-1 flex items-center gap-2 text-sm text-text-muted">
                      {project && <span>{project.title}</span>}
                      {parentTask && <Badge tone="muted">↳ {parentTask.title}</Badge>}
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
