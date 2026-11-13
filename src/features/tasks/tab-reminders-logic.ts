import { localDateKey } from "@/features/tasks/date-utils";
import type { Task } from "@/types/productivity";

/** A reminder found a little late (the tab was asleep) still shows. */
const LATE_MS = 10 * 60 * 1000;

export type DueTask = Pick<Task, "id" | "title" | "status" | "due_date" | "due_time">;

/** The moment a task is due on this device's clock, or null without a time. */
function dueAt(task: DueTask) {
  if (!task.due_date || !task.due_time) return null;
  return new Date(`${task.due_date}T${task.due_time.slice(0, 5)}:00`);
}

/** Tasks of today whose time came in the last 10 minutes and were not shown yet. */
export function dueInTab(tasks: DueTask[], now: Date, fired: Set<string>) {
  const today = localDateKey(now);
  return tasks.filter((task) => {
    const at = dueAt(task);
    if (!at || task.status === "completed" || task.due_date !== today) return false;
    const late = now.getTime() - at.getTime();
    return late >= 0 && late < LATE_MS && !fired.has(firedId(task));
  });
}

export function firedId(task: DueTask) {
  return `${task.id}@${task.due_date}T${task.due_time?.slice(0, 5)}`;
}
