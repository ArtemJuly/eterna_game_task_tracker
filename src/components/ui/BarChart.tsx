import type { ChartPoint } from '../../utils/chartData';

interface BarChartProps {
  data: ChartPoint[];
  color: string;
  height?: number;
}

const WIDTH = 400;
const PADDING = 4;
const GAP = 3;

export default function BarChart({ data, color, height = 100 }: BarChartProps) {
  if (data.length === 0) {
    return (
      <div style={{ height }} className="flex items-center justify-center text-sm text-text-muted">
        Нет данных
      </div>
    );
  }

  const max = Math.max(...data.map((d) => d.value), 1);
  const barWidth = (WIDTH - PADDING * 2 - GAP * (data.length - 1)) / data.length;

  return (
    <svg viewBox={`0 0 ${WIDTH} ${height}`} className="w-full" style={{ height }} preserveAspectRatio="none">
      {data.map((d, i) => {
        const barHeight = d.value === 0 ? 1 : (d.value / max) * (height - PADDING * 2);
        const x = PADDING + i * (barWidth + GAP);
        const y = height - PADDING - barHeight;
        const isLast = i === data.length - 1;
        return (
          <rect
            key={i}
            x={x}
            y={y}
            width={barWidth}
            height={barHeight}
            rx={2}
            fill={color}
            opacity={isLast ? 1 : 0.5}
          >
            <title>{`${d.label}: ${d.value}`}</title>
          </rect>
        );
      })}
    </svg>
  );
}
