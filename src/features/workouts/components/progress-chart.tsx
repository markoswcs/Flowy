"use client";

import { useId } from "react";

/**
 * A small line chart (dates along the bottom, values on the side), drawn in
 * SVG with the Flowy gradient. An optional dashed line marks a goal.
 */
export function ProgressChart({
  points,
  unit,
  goal,
  height = 140,
}: {
  points: { day: string; value: number }[];
  unit: string;
  goal?: number | null;
  height?: number;
}) {
  const id = useId().replace(/:/g, "");
  if (points.length < 2) {
    return (
      <p className="rounded-2xl bg-muted/30 px-3 py-6 text-center text-xs text-muted-foreground">
        O gráfico aparece a partir do segundo registro.
      </p>
    );
  }
  const width = 320;
  const pad = { top: 12, right: 12, bottom: 22, left: 36 };
  const values = points.map((point) => point.value).concat(goal ? [goal] : []);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const low = min - span * 0.15;
  const high = max + span * 0.15;
  const times = points.map((point) => Date.parse(`${point.day}T12:00:00`));
  const t0 = times[0]!;
  const t1 = times[times.length - 1]!;
  const x = (time: number) => pad.left + ((time - t0) / (t1 - t0 || 1)) * (width - pad.left - pad.right);
  const y = (value: number) => pad.top + (1 - (value - low) / (high - low)) * (height - pad.top - pad.bottom);
  const line = points.map((point, index) => `${x(times[index]!)},${y(point.value)}`).join(" ");
  const area = `${pad.left},${height - pad.bottom} ${line} ${x(t1)},${height - pad.bottom}`;
  const label = (day: string) => `${day.slice(8)}/${day.slice(5, 7)}`;
  const format = (value: number) => value.toLocaleString("pt-BR", { maximumFractionDigits: 1 });

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label={`Evolução: de ${format(points[0]!.value)} para ${format(points[points.length - 1]!.value)} ${unit}`}>
      <defs>
        <linearGradient id={`${id}-line`} x1="0" x2="1">
          <stop offset="0" stopColor="#8b5cf6" />
          <stop offset="1" stopColor="#ec4899" />
        </linearGradient>
        <linearGradient id={`${id}-fill`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#8b5cf6" stopOpacity="0.3" />
          <stop offset="1" stopColor="#8b5cf6" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[high, (high + low) / 2, low].map((value) => (
        <g key={value}>
          <line x1={pad.left} x2={width - pad.right} y1={y(value)} y2={y(value)} stroke="currentColor" strokeOpacity="0.08" />
          <text x={pad.left - 6} y={y(value) + 3} textAnchor="end" fontSize="9" fill="currentColor" opacity="0.5">
            {format(value)}
          </text>
        </g>
      ))}
      {goal ? (
        <g>
          <line x1={pad.left} x2={width - pad.right} y1={y(goal)} y2={y(goal)} stroke="#34d399" strokeDasharray="4 4" strokeWidth="1.5" />
          <text x={width - pad.right} y={y(goal) - 4} textAnchor="end" fontSize="9" fill="#34d399">
            meta {format(goal)}
          </text>
        </g>
      ) : null}
      <polygon points={area} fill={`url(#${id}-fill)`} />
      <polyline points={line} fill="none" stroke={`url(#${id}-line)`} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {points.map((point, index) => (
        <circle key={point.day} cx={x(times[index]!)} cy={y(point.value)} r="3" fill="#c4b5fd" />
      ))}
      <text x={pad.left} y={height - 6} fontSize="9" fill="currentColor" opacity="0.5">
        {label(points[0]!.day)}
      </text>
      <text x={width - pad.right} y={height - 6} textAnchor="end" fontSize="9" fill="currentColor" opacity="0.5">
        {label(points[points.length - 1]!.day)}
      </text>
    </svg>
  );
}
