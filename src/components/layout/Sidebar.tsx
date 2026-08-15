import { Link, NavLink } from 'react-router-dom';
import { useCharacter } from '../../hooks/useCharacter';
import { useTracks } from '../../hooks/useTracks';
import { getLevelProgress } from '../../utils/levels';
import { formatStageLevel, getStageLevelProgress } from '../../utils/trackLevels';
import SidebarPomodoro from './SidebarPomodoro';

const navItems = [
  { to: '/', label: 'Главная' },
  { to: '/tasks', label: 'Задачи' },
  { to: '/projects', label: 'Проекты' },
  { to: '/tracks', label: 'Треки' },
  { to: '/rewards', label: 'Магазин' },
  { to: '/history', label: 'История' },
  { to: '/settings', label: 'Настройки' },
];

export default function Sidebar() {
  const character = useCharacter();
  const { tracks } = useTracks();
  const { level } = getLevelProgress(character.totalXp);
  const mainTrack = tracks.find((t) => t.status !== 'done') ?? tracks[0] ?? null;
  const mainStage = mainTrack ? mainTrack.stages[mainTrack.currentStageIndex] ?? null : null;
  const mainStageProgress = mainStage ? getStageLevelProgress(mainStage.xp) : null;

  return (
    <aside className="fixed left-0 top-0 flex h-screen w-[220px] flex-col border-r border-border bg-surface">
      <div className="px-5 py-6">
        <span className="text-lg font-bold tracking-tight text-text-primary">Этерна</span>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 px-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `rounded px-3 py-2 text-sm font-medium transition-colors border-l-2 ${
                isActive
                  ? 'border-accent-xp bg-overlay/[0.04] text-text-primary'
                  : 'border-transparent text-text-muted hover:bg-overlay/[0.04] hover:text-text-primary'
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      <SidebarPomodoro />

      <div className="border-t border-border px-4 py-4">
        {mainTrack ? (
          <Link to={`/tracks/${mainTrack.id}`} className="block hover:underline">
            <div className="truncate text-sm font-semibold text-text-primary">{mainTrack.title}</div>
            <div className="mt-0.5 truncate text-xs text-text-muted">
              {mainStage && mainStageProgress
                ? `${mainStage.title} · ${formatStageLevel(mainStageProgress.level)}`
                : 'Этапов пока нет'}
            </div>
          </Link>
        ) : (
          <div className="text-sm font-semibold text-text-primary">{level.name}</div>
        )}
        <div className="mt-1 text-xs text-text-muted tabular-nums">{character.totalXp} XP</div>
        <div className="mt-1 text-xs text-accent-eternas tabular-nums">
          ✦ {character.eternas}
        </div>
      </div>
    </aside>
  );
}
