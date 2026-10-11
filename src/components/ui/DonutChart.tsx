interface DonutChartSegment {
  id: string;
  label: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  segments: DonutChartSegment[];
}

const RADIUS = 40;
const STROKE_WIDTH = 16;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function DonutChart({ segments }: DonutChartProps) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);

  if (total === 0) {
    return (
      <div className="flex aspect-square w-full max-w-[220px] items-center justify-center rounded-full border border-dashed border-border text-sm text-text-muted">
        Нет данных
      </div>
    );
  }

  let cumulative = 0;

  return (
    <svg viewBox="0 0 100 100" className="w-full max-w-[220px] -rotate-90">
      <circle cx={50} cy={50} r={RADIUS} fill="none" stroke="currentColor" strokeWidth={STROKE_WIDTH} className="text-border" />
      {segments.map((s) => {
        const fraction = s.value / total;
        const dash = fraction * CIRCUMFERENCE;
        const offset = -(cumulative * CIRCUMFERENCE);
        cumulative += fraction;
        return (
          <circle
            key={s.id}
            cx={50}
            cy={50}
            r={RADIUS}
            fill="none"
            stroke={s.color}
            strokeWidth={STROKE_WIDTH}
            strokeDasharray={`${dash} ${CIRCUMFERENCE - dash}`}
            strokeDashoffset={offset}
          >
            <title>
              {s.label}: {Math.round(fraction * 1000) / 10}%
            </title>
          </circle>
        );
      })}
    </svg>
  );
}
