import Modal from './ui/Modal';

export type SkillKey = 'intake' | 'dayplan' | 'sprint';

interface Skill {
  key: SkillKey;
  icon: string;
  title: string;
  description: string;
}

const SKILLS: Skill[] = [
  {
    key: 'intake',
    icon: '📋',
    title: 'Разобрать список задач',
    description: 'Вставьте текст со списком задач — AI разобьёт его на отдельные задачи, оценит XP/этерны и подберёт проект/трек.',
  },
  {
    key: 'dayplan',
    icon: '🗓️',
    title: 'Спланировать день',
    description:
      'AI подберёт задачи на сегодня — ключевые по приоритетным проектам/трекам и те, у которых подошёл срок. Учитывает текущий недельный спринт и будний/выходной день.',
  },
  {
    key: 'sprint',
    icon: '📅',
    title: 'Недельный спринт',
    description: 'AI соберёт список задач на текущую неделю по иерархии приоритета проектов/треков и целям из Карты целей.',
  },
];

interface AiAssistantModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (skill: SkillKey) => void;
}

export default function AiAssistantModal({ open, onClose, onSelect }: AiAssistantModalProps) {
  return (
    <Modal open={open} onClose={onClose} title="🤖 AI-агент">
      <div className="flex flex-col gap-2">
        {SKILLS.map((skill) => (
          <button
            key={skill.key}
            type="button"
            onClick={() => onSelect(skill.key)}
            className="flex flex-col items-start gap-1 rounded-lg border border-border bg-bg p-3 text-left transition-colors hover:border-accent-xp/50 hover:bg-accent-xp/[0.04]"
          >
            <span className="text-sm font-medium text-text-primary">
              {skill.icon} {skill.title}
            </span>
            <span className="text-xs text-text-muted">{skill.description}</span>
          </button>
        ))}
      </div>
    </Modal>
  );
}
