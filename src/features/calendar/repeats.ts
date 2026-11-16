import type { Task } from "@/types/productivity";

type Repeating = Pick<Task, "due_date" | "recurrence" | "recurrence_days" | "status">;

/** Whether a repeating task also falls on a later day (its next date is due_date). */
export function repeatsOn(task: Repeating, date: string): boolean {
  if (!task.recurrence || !task.due_date || date <= task.due_date || task.status === "completed") return false;
  const day = new Date(`${date}T12:00:00`);
  if (task.recurrence_days?.length) return task.recurrence_days.includes(day.getDay());
  if (task.recurrence === "daily") return true;
  const first = new Date(`${task.due_date}T12:00:00`);
  if (task.recurrence === "weekly") return day.getDay() === first.getDay();
  return day.getDate() === first.getDate();
}
