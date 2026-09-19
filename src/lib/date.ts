const DAY_IN_MS = 86_400_000;

export function startOfLocalDay(value = new Date()): Date {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function endOfLocalDay(value = new Date()): Date {
  const date = new Date(value);
  date.setHours(23, 59, 59, 999);
  return date;
}

export function isToday(value: string | Date | null): boolean {
  if (!value) return false;
  const date = new Date(value);
  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

export function daysUntilPermanentDeletion(
  deletedAt: string,
  now = new Date(),
): number {
  const deletionDate = new Date(deletedAt).getTime() + 7 * DAY_IN_MS;
  return Math.max(0, Math.ceil((deletionDate - now.getTime()) / DAY_IN_MS));
}

export function toDateInputValue(value: string | null): string {
  if (!value) return "";
  return value.slice(0, 10);
}

export function combineDateAndTime(
  date: string,
  time?: string | null,
): string | null {
  if (!date) return null;
  const local = new Date(`${date}T${time || "23:59"}:00`);
  return Number.isNaN(local.getTime()) ? null : local.toISOString();
}
