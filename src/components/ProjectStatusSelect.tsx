import type { ProjectStatus } from '../types';

const STATUS_LABEL: Record<ProjectStatus, string> = {
  active: 'В процессе',
  done: 'Завершён',
};

const STATUS_CLASSES: Record<ProjectStatus, string> = {
  active: 'bg-overlay/5 text-text-muted border-border',
  done: 'bg-success/10 text-success border-success/30',
};

interface ProjectStatusSelectProps {
  status: ProjectStatus;
  onChange: (status: ProjectStatus) => void;
}

export default function ProjectStatusSelect({ status, onChange }: ProjectStatusSelectProps) {
  return (
    <select
      value={status}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onChange={(e) => onChange(e.target.value as ProjectStatus)}
      title="Изменить статус проекта"
      className={`cursor-pointer rounded-[4px] border px-2 py-0.5 text-xs font-medium outline-none ${STATUS_CLASSES[status]}`}
    >
      {(Object.keys(STATUS_LABEL) as ProjectStatus[]).map((key) => (
        <option key={key} value={key}>
          {STATUS_LABEL[key]}
        </option>
      ))}
    </select>
  );
}
