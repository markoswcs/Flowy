import { localDateKey } from "@/features/tasks/date-utils";

/** "YYYY-MM-DD" n days after a date key. */
export function addDaysKey(key: string, days: number): string {
  const [year, month, day] = key.split("-").map(Number);
  return localDateKey(new Date(year!, month! - 1, day! + days));
}

/**
 * The days shown for a month, Sunday first, padded with null so the 1st falls
 * on its weekday. `month` is 0-based.
 */
export function monthGrid(year: number, month: number): (string | null)[] {
  const first = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();
  const cells: (string | null)[] = Array.from({ length: first }, () => null);
  for (let day = 1; day <= days; day++) cells.push(localDateKey(new Date(year, month, day)));
  while (cells.length % 7) cells.push(null);
  return cells;
}

/** One-tap dates: today, tomorrow, the coming Saturday and Monday, in a week. */
export function quickDates(today: string): { label: string; value: string }[] {
  const weekday = new Date(`${today}T12:00:00`).getDay();
  const toSaturday = (6 - weekday + 7) % 7 || 7;
  const toMonday = (1 - weekday + 7) % 7 || 7;
  return [
    { label: "Hoje", value: today },
    { label: "Amanhã", value: addDaysKey(today, 1) },
    { label: "Sábado", value: addDaysKey(today, toSaturday) },
    { label: "Segunda", value: addDaysKey(today, toMonday) },
    { label: "Em 1 semana", value: addDaysKey(today, 7) },
  ].filter((option, index, all) => all.findIndex((other) => other.value === option.value) === index);
}

/** "HH:MM" an hour from now, rounded up to 5 minutes. */
export function inOneHour(now: Date): string {
  const date = new Date(now.getTime() + 60 * 60 * 1000);
  const minutes = Math.ceil(date.getMinutes() / 5) * 5;
  date.setMinutes(minutes, 0, 0);
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

export const QUICK_TIMES = ["08:00", "12:00", "14:00", "18:00", "20:00"];
export const HOURS = Array.from({ length: 24 }, (_, index) => String(index).padStart(2, "0"));
