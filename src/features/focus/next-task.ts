import type { Task } from "@/types/productivity";

type FocusTask = Pick<Task, "id" | "status" | "priority" | "due_date" | "due_time" | "position" | "deleted_at">;

const PRIORITY = { high: 0, normal: 1, low: 2 } as const;

/**
 * Tasks of today, in the order to face them: important first, then the
 * oldest (late ones before today's), then the earliest time, then the
 * person's own order.
 */
export function focusQueue<T extends FocusTask>(tasks: T[], today: string): T[] {
  return tasks
    .filter((task) => !task.deleted_at && task.status !== "completed" && task.due_date && task.due_date <= today)
    .sort(
      (a, b) =>
        PRIORITY[a.priority] - PRIORITY[b.priority] ||
        (a.due_date ?? "").localeCompare(b.due_date ?? "") ||
        (a.due_time ?? "99").localeCompare(b.due_time ?? "99") ||
        a.position - b.position,
    );
}

/** The next one, leaving out those skipped for now (they come back at the end). */
export function nextTask<T extends FocusTask>(tasks: T[], today: string, skipped: string[]): T | null {
  const queue = focusQueue(tasks, today);
  return queue.find((task) => !skipped.includes(task.id)) ?? queue[0] ?? null;
}

export const FOCUS_MINUTES = 25;
export const BREAK_MINUTES = 5;

export interface FocusTimer {
  taskId: string | null;
  mode: "focus" | "break";
  /** When it ends, in ms since epoch. */
  endsAt: number;
}

export function remaining(timer: FocusTimer, now: number) {
  return Math.max(0, Math.round((timer.endsAt - now) / 1000));
}

export function clock(seconds: number) {
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}
