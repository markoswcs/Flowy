import type { Slot } from "./exercises";

/** One logged set. `amount` is reps, or seconds/minutes for timed exercises. */
export interface LoggedSet {
  day: string;
  exercise_id: string;
  set_number: number;
  amount: number;
  weight_kg: number | null;
  /** Aquecimento, drop ou até a falha; ausente = normal. */
  kind?: "normal" | "warmup" | "drop" | "failure";
  /** Repetições na reserva (0–5), se a pessoa marcou. */
  rir?: number | null;
}

export interface BodyWeight {
  day: string;
  weight_kg: number;
}

/** Estimated one-rep max (Epley). A single rep is the weight itself. */
export function estimateOneRepMax(weight: number, reps: number): number {
  if (weight <= 0 || reps <= 0) return 0;
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30) * 10) / 10;
}

/**
 * A new record: the best estimated max with load, or (body weight only) the
 * most reps in a set. Nothing counts as a record the first time.
 */
export function isPersonalRecord(set: Pick<LoggedSet, "amount" | "weight_kg">, previous: Pick<LoggedSet, "amount" | "weight_kg">[]): boolean {
  if (!previous.length) return false;
  if (set.weight_kg && set.weight_kg > 0) {
    const best = Math.max(0, ...previous.map((item) => estimateOneRepMax(item.weight_kg ?? 0, item.amount)));
    return estimateOneRepMax(set.weight_kg, set.amount) > best;
  }
  if (previous.some((item) => item.weight_kg && item.weight_kg > 0)) return false;
  return set.amount > Math.max(0, ...previous.map((item) => item.amount));
}

/** Sets of the last day before `day` on which the exercise was logged. */
export function lastSession(history: LoggedSet[], exerciseId: string, day: string): LoggedSet[] {
  const earlier = history.filter((item) => item.exercise_id === exerciseId && item.day < day && item.kind !== "warmup");
  const last = earlier.reduce<string | null>((latest, item) => (!latest || item.day > latest ? item.day : latest), null);
  return last ? earlier.filter((item) => item.day === last).sort((a, b) => a.set_number - b.set_number) : [];
}

export interface Suggestion {
  weight: number | null;
  reason: string;
}

/** Smallest jump: 2,5 kg on heavier lifts, 1 kg on light ones. */
function step(weight: number) {
  return weight >= 20 ? 2.5 : 1;
}

/**
 * Double progression: when every set of last time reached the target reps,
 * add a little load; otherwise keep it and aim for the reps.
 */
export function suggestNext(last: LoggedSet[], targetReps: number): Suggestion | null {
  const loaded = last.filter((item) => item.weight_kg && item.weight_kg > 0);
  if (!loaded.length) return null;
  const weight = Math.max(...loaded.map((item) => item.weight_kg!));
  const top = loaded.filter((item) => item.weight_kg === weight);
  if (top.every((item) => item.amount >= targetReps)) {
    const next = Math.round((weight + step(weight)) * 10) / 10;
    return { weight: next, reason: `Você fez todas as repetições com ${formatKg(weight)}: suba para ${formatKg(next)}.` };
  }
  return { weight, reason: `Mantenha ${formatKg(weight)} até fazer ${targetReps} repetições em todas as séries.` };
}

export function formatKg(weight: number) {
  return `${weight.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} kg`;
}

/** Best estimated max per day, oldest first, for the history chart. */
export function progressByDay(history: LoggedSet[], exerciseId: string): { day: string; value: number }[] {
  const byDay = new Map<string, number>();
  for (const item of history) {
    if (item.exercise_id !== exerciseId || item.kind === "warmup") continue;
    const value = item.weight_kg ? estimateOneRepMax(item.weight_kg, item.amount) : item.amount;
    byDay.set(item.day, Math.max(byDay.get(item.day) ?? 0, value));
  }
  return [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([day, value]) => ({ day, value }));
}

/** Sets per muscle group (by the exercise's slot) between two days, inclusive. */
export function setsPerSlot(history: LoggedSet[], slotOf: (exerciseId: string) => Slot | undefined, from: string, to: string) {
  const counts: Partial<Record<Slot, number>> = {};
  for (const item of history) {
    if (item.day < from || item.day > to || item.kind === "warmup") continue;
    const slot = slotOf(item.exercise_id);
    if (slot) counts[slot] = (counts[slot] ?? 0) + 1;
  }
  return counts;
}

/** kg per week between the first and last weigh-in of the list (null with fewer than two). */
export function weeklyRate(entries: BodyWeight[]): number | null {
  if (entries.length < 2) return null;
  const sorted = [...entries].sort((a, b) => a.day.localeCompare(b.day));
  const first = sorted[0]!;
  const last = sorted[sorted.length - 1]!;
  const days = (Date.parse(`${last.day}T12:00:00`) - Date.parse(`${first.day}T12:00:00`)) / 86_400_000;
  if (days < 1) return null;
  return Math.round(((last.weight_kg - first.weight_kg) / days) * 7 * 100) / 100;
}
