import type { PushAction, PushPayload } from "@/lib/push/web-push";

export interface TaskReminder {
  task_id: string;
  title: string;
  due_time: string;
  /** A repeating task left open on an earlier day: it shows under "Atrasadas". */
  overdue?: boolean;
  /** Days since the task's moment for the every-24-hours late reminder; 0 otherwise. */
  late_days?: number | null;
}

/** Solve it from the notification: done, a bit later or tomorrow. */
export const TASK_ACTIONS: PushAction[] = [
  { action: "done", title: "✅ Concluir" },
  { action: "later", title: "⏰ +1 hora" },
  { action: "tomorrow", title: "📅 Amanhã" },
];

/** Text of one task reminder: on its time, on a later repeat day, or N days late. */
export function buildTaskReminder(reminder: TaskReminder): PushPayload {
  const time = reminder.due_time.slice(0, 5);
  const late = reminder.late_days ?? 0;
  if (late > 0) {
    return {
      title: `⚠️ ${reminder.title}`,
      body: `Atrasada há ${late === 1 ? "1 dia" : `${late} dias`} (era às ${time}). Conclua ou escolha uma nova data.`,
      url: "/app?view=today",
      tag: `task-${reminder.task_id}`,
      taskId: reminder.task_id,
      actions: TASK_ACTIONS,
    };
  }
  return {
    title: `⏰ ${reminder.title}`,
    body: `Sua tarefa é agora, às ${time}.`,
    url: reminder.overdue ? "/app?view=overdue" : "/app?view=today",
    tag: `task-${reminder.task_id}`,
    taskId: reminder.task_id,
    actions: TASK_ACTIONS,
  };
}
