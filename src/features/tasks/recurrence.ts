import type { TaskRecurrence } from "@/types/productivity";

/** Weekdays in the order Brazilian calendars show them; value = getDay() / extract(dow). */
export const WEEKDAYS = [
  { value: 0, letter: "D", short: "Dom", label: "Domingo" },
  { value: 1, letter: "S", short: "Seg", label: "Segunda" },
  { value: 2, letter: "T", short: "Ter", label: "Terça" },
  { value: 3, letter: "Q", short: "Qua", label: "Quarta" },
  { value: 4, letter: "Q", short: "Qui", label: "Quinta" },
  { value: 5, letter: "S", short: "Sex", label: "Sexta" },
  { value: 6, letter: "S", short: "Sáb", label: "Sábado" },
] as const;

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

function parseDateKey(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year!, month! - 1, day!);
}

function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function weekdayOf(dateKey: string): number {
  return parseDateKey(dateKey).getDay();
}

/** Only daily and weekly repeats can be limited to some weekdays. */
export function supportsDays(recurrence: TaskRecurrence | "none" | null): boolean {
  return recurrence === "daily" || recurrence === "weekly";
}

function sameDays(a: number[], b: number[]) {
  return a.length === b.length && a.every((day, index) => day === b[index]);
}

function sortedDays(days: number[]) {
  return [...new Set(days)].filter((day) => day >= 0 && day <= 6).sort((a, b) => a - b);
}

/** Weekdays highlighted in the picker, including what NULL means for each repeat. */
export function selectedDays(
  recurrence: TaskRecurrence | "none" | null,
  days: number[] | null,
  dueDate: string,
): number[] {
  if (!supportsDays(recurrence)) return [];
  if (days?.length) return sortedDays(days);
  if (recurrence === "daily") return ALL_DAYS;
  return dueDate ? [weekdayOf(dueDate)] : [];
}

/**
 * What gets saved: NULL when the choice equals the plain repeat (every day, or
 * the due date's weekday for a weekly task), so those keep following the date.
 */
export function daysToStore(
  recurrence: TaskRecurrence | "none" | null,
  days: number[],
  dueDate: string,
): number[] | null {
  if (!supportsDays(recurrence)) return null;
  const sorted = sortedDays(days);
  if (sorted.length === 0) return null;
  if (recurrence === "daily" && sameDays(sorted, ALL_DAYS)) return null;
  if (recurrence === "weekly" && dueDate && sameDays(sorted, [weekdayOf(dueDate)])) return null;
  return sorted;
}

/** First date on or after `dateKey` that falls on one of `days`. */
export function alignToDays(dateKey: string, days: number[] | null): string {
  if (!dateKey || !days?.length) return dateKey;
  const date = parseDateKey(dateKey);
  for (let offset = 0; offset < 7; offset += 1) {
    if (days.includes(date.getDay())) return toDateKey(date);
    date.setDate(date.getDate() + 1);
  }
  return dateKey;
}

function joinPt(items: string[]) {
  return items.length > 1 ? `${items.slice(0, -1).join(", ")} e ${items.at(-1)}` : (items[0] ?? "");
}

const plainLabels: Record<TaskRecurrence, string> = {
  daily: "Diariamente",
  weekly: "Semanalmente",
  monthly: "Mensalmente",
};

/** "Diariamente", "Dias úteis", "Seg, Qua e Sex"… */
export function recurrenceLabel(recurrence: TaskRecurrence, days: number[] | null): string {
  if (!supportsDays(recurrence) || !days?.length) return plainLabels[recurrence];
  const sorted = sortedDays(days);
  if (sameDays(sorted, ALL_DAYS)) return plainLabels.daily;
  if (sameDays(sorted, [1, 2, 3, 4, 5])) return "Dias úteis";
  if (sameDays(sorted, [0, 6])) return "Fins de semana";
  // Monday first, Sunday last, as people say the week.
  const ordered = [...sorted.filter((day) => day !== 0), ...sorted.filter((day) => day === 0)];
  return joinPt(ordered.map((day) => WEEKDAYS[day]!.short));
}
