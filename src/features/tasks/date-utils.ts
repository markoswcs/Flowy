export function localDateKey(value = new Date()): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function tomorrowDateKey(value = new Date()): string {
  const tomorrow = new Date(value);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return localDateKey(tomorrow);
}

export function formatTaskDate(value: string | null): string | null {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return value;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
  }).format(new Date(year, month - 1, day));
}

export function isOverdueDate(value: string | null): boolean {
  return Boolean(value && value < localDateKey());
}

export function isToday(value: string | null): boolean {
  return Boolean(value && value === localDateKey());
}

export type DateTone = "overdue" | "today" | "soon" | "later";

/**
 * Human date for a task card: "Hoje", "Amanhã", "Sexta", "Atrasada · 2 dias"
 * or a short date, plus a tone the card uses for colour.
 */
export function relativeTaskDate(
  value: string | null,
  now = new Date(),
): { label: string; tone: DateTone } | null {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  const target = new Date(year, month - 1, day);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = Math.round((target.getTime() - today.getTime()) / 86_400_000);

  if (diff < 0) {
    const days = -diff;
    return { label: days === 1 ? "Ontem" : `Atrasada · ${days} dias`, tone: "overdue" };
  }
  if (diff === 0) return { label: "Hoje", tone: "today" };
  if (diff === 1) return { label: "Amanhã", tone: "soon" };
  if (diff < 7) {
    const weekday = new Intl.DateTimeFormat("pt-BR", { weekday: "long" })
      .format(target)
      .replace("-feira", "");
    return { label: weekday.charAt(0).toUpperCase() + weekday.slice(1), tone: "soon" };
  }
  return { label: formatTaskDate(value) ?? value, tone: "later" };
}
