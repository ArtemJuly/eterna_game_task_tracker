import type { TaskStatus } from '../types';

const STATUS_LABEL: Record<TaskStatus, string> = {
  planned: 'Запланирована',
  in_progress: 'В работе',
  done: 'Выполнена',
  cancelled: 'Отменена',
};

const STATUS_CLASSES: Record<TaskStatus, string> = {
  planned: 'bg-overlay/5 text-text-muted border-border',
  in_progress: 'bg-accent-xp/10 text-accent-xp border-accent-xp/30',
  done: 'bg-success/10 text-success border-success/30',
  cancelled: 'bg-danger/10 text-danger border-danger/30',
};

interface TaskStatusSelectProps {
  status: TaskStatus;
  onChange: (status: TaskStatus) => void;
}

export default function TaskStatusSelect({ status, onChange }: TaskStatusSelectProps) {
  return (
    <select
      value={status}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onChange={(e) => onChange(e.target.value as TaskStatus)}
      title="Изменить статус задачи"
      className={`cursor-pointer rounded-[4px] border px-2 py-0.5 text-xs font-medium outline-none ${STATUS_CLASSES[status]}`}
    >
      {(Object.keys(STATUS_LABEL) as TaskStatus[]).map((key) => (
        <option key={key} value={key}>
          {STATUS_LABEL[key]}
        </option>
      ))}
    </select>
  );
}
