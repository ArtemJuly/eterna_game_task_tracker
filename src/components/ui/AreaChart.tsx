import { useId } from 'react';
import type { ChartPoint } from '../../utils/chartData';

interface AreaChartProps {
  data: ChartPoint[];
  color: string;
  height?: number;
}

const WIDTH = 400;
const PADDING = 8;

export default function AreaChart({ data, color, height = 100 }: AreaChartProps) {
  const gradientId = useId();

  if (data.length === 0) {
    return (
      <div style={{ height }} className="flex items-center justify-center text-sm text-text-muted">
        Нет данных
      </div>
    );
  }

  const values = data.map((d) => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const points = data.map((d, i) => {
    const x = data.length === 1 ? WIDTH / 2 : (i / (data.length - 1)) * (WIDTH - PADDING * 2) + PADDING;
    const y = height - PADDING - ((d.value - min) / range) * (height - PADDING * 2);
    return { x, y, label: d.label, value: d.value };
  });

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1].x.toFixed(1)},${height} L ${points[0].x.toFixed(1)},${height} Z`;
  const last = points[points.length - 1];

  return (
    <svg viewBox={`0 0 ${WIDTH} ${height}`} className="w-full" style={{ height }} preserveAspectRatio="none">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>

      <path d={areaPath} fill={`url(#${gradientId})`} />
      <path d={linePath} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={8} fill="transparent">
          <title>{`${p.label}: ${p.value}`}</title>
        </circle>
      ))}

      <circle cx={last.x} cy={last.y} r={3.5} fill={color} />
    </svg>
  );
}
