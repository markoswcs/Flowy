/** Streak levels: a name and a colour for each stretch of days. */
export const LEVELS = [
  { min: 0, name: "Começando", color: "#94a3b8" },
  { min: 1, name: "Faísca", color: "#fbbf24" },
  { min: 3, name: "Chama", color: "#fb923c" },
  { min: 7, name: "Fogueira", color: "#f97316" },
  { min: 14, name: "Vulcão", color: "#ef4444" },
  { min: 30, name: "Lenda", color: "#a855f7" },
] as const;

export function levelOf(days: number) {
  let index = 0;
  LEVELS.forEach((level, position) => {
    if (days >= level.min) index = position;
  });
  const current = LEVELS[index]!;
  const next = LEVELS[index + 1] ?? null;
  const progress = next ? (days - current.min) / (next.min - current.min) : 1;
  return { ...current, next, toNext: next ? next.min - days : 0, progress };
}

/** The longest run among the given days, with the same one-missed-day rule. */
export function longestStreak(doneDays: string[]) {
  const days = [...new Set(doneDays)].sort();
  let best = 0;
  let run = 0;
  let previous: number | null = null;
  for (const day of days) {
    const time = Date.parse(`${day}T12:00:00`) / 86_400_000;
    const gap = previous === null ? 1 : Math.round(time - previous);
    run = gap <= 2 ? run + 1 : 1;
    best = Math.max(best, run);
    previous = time;
  }
  return best;
}

/** "6 h", "45 min", "1 h 30". */
export function hours(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const whole = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${whole} h ${rest}` : `${whole} h`;
}
