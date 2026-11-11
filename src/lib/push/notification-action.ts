/**
 * What each button under a task reminder changes. `now` is the person's own
 * clock (see wallClock): its local getters read their time zone.
 */
export type NotificationAction = "done" | "later" | "tomorrow";

export function isNotificationAction(value: unknown): value is NotificationAction {
  return value === "done" || value === "later" || value === "tomorrow";
}

interface ActionTask {
  due_date: string | null;
  due_time: string | null;
  recurrence: string | null;
}

export type TaskChange =
  | { kind: "update"; values: Record<string, string | null> }
  /** Cannot be done from the notification: open the app on the task. */
  | { kind: "open" };

const pad = (value: number) => String(value).padStart(2, "0");
const dateKey = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const timeKey = (date: Date) => `${pad(date.getHours())}:${pad(date.getMinutes())}:00`;

export function changeFor(action: NotificationAction, task: ActionTask, now: Date, isoNow: string): TaskChange {
  if (action === "done") {
    // A repeating task moves to its next day in the database trigger.
    return { kind: "update", values: { status: "completed", completed_at: isoNow } };
  }
  // Moving one day of a repeating task would move the whole series.
  if (task.recurrence) return { kind: "open" };

  if (action === "later") {
    const later = new Date(now);
    later.setMinutes(later.getMinutes() + 60);
    // Round up to 5 minutes: 14:07 → 15:10.
    later.setMinutes(Math.ceil(later.getMinutes() / 5) * 5, 0, 0);
    return { kind: "update", values: { due_date: dateKey(later), due_time: timeKey(later) } };
  }

  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return { kind: "update", values: { due_date: dateKey(tomorrow), due_time: task.due_time } };
}

/**
 * The person's clock: a Date whose local getters read the time in their time
 * zone. The server runs in UTC.
 */
export function wallClock(timeZone: string, at = new Date()): Date {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(at);
    const get = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
    return new Date(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"));
  } catch {
    return timeZone === "America/Sao_Paulo" ? at : wallClock("America/Sao_Paulo", at);
  }
}
