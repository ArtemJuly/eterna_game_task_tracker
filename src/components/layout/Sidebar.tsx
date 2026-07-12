import { NavLink } from 'react-router-dom';
import { useCharacter } from '../../hooks/useCharacter';
import { getLevelProgress } from '../../utils/levels';

const navItems = [
  { to: '/', label: 'Главная' },
  { to: '/tasks', label: 'Задачи' },
  { to: '/projects', label: 'Проекты' },
  { to: '/rewards', label: 'Магазин' },
  { to: '/history', label: 'История' },
  { to: '/settings', label: 'Настройки' },
];

export default function Sidebar() {
  const character = useCharacter();
  const { level } = getLevelProgress(character.totalXp);

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
                  ? 'border-accent-xp bg-white/[0.04] text-text-primary'
                  : 'border-transparent text-text-muted hover:bg-white/[0.04] hover:text-text-primary'
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-border px-4 py-4">
        <div className="text-sm font-semibold text-text-primary">{level.name}</div>
        <div className="mt-1 text-xs text-text-muted tabular-nums">{character.totalXp} XP</div>
        <div className="mt-1 text-xs text-accent-eternas tabular-nums">
          ✦ {character.eternas}
        </div>
      </div>
    </aside>
  );
}
