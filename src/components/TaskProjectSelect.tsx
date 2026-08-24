import type { Project } from '../types';

interface TaskProjectSelectProps {
  projectId: string | null;
  projects: Project[];
  onChange: (projectId: string | null) => void;
}

export default function TaskProjectSelect({ projectId, projects, onChange }: TaskProjectSelectProps) {
  return (
    <select
      value={projectId ?? ''}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onChange={(e) => onChange(e.target.value || null)}
      title="Перенести в другой проект"
      className="cursor-pointer rounded-[4px] border border-border bg-overlay/5 px-2 py-0.5 text-xs font-medium text-text-primary outline-none"
    >
      <option value="">Без проекта</option>
      {projects.map((p) => (
        <option key={p.id} value={p.id}>
          {p.title}
        </option>
      ))}
    </select>
  );
}
