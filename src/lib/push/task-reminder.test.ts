import { describe, expect, it } from "vitest";

import { buildTaskReminder } from "./task-reminder";

const base = { task_id: "t1", title: "Pagar conta", due_time: "09:30:00" };

describe("buildTaskReminder", () => {
  it("says the task is now, on its time", () => {
    expect(buildTaskReminder(base)).toEqual({
      title: "⏰ Pagar conta",
      body: "Sua tarefa é agora, às 09:30.",
      url: "/app?view=today",
      tag: "task-t1",
    });
  });

  it("opens Atrasadas for a repeating task left open on an earlier day", () => {
    expect(buildTaskReminder({ ...base, overdue: true, late_days: 0 }).url).toBe("/app?view=overdue");
  });

  it("says how late a task is, one day and many days", () => {
    expect(buildTaskReminder({ ...base, overdue: true, late_days: 1 })).toMatchObject({
      title: "⚠️ Pagar conta",
      body: "Atrasada há 1 dia (era às 09:30). Conclua ou escolha uma nova data.",
      url: "/app?view=today",
    });
    expect(buildTaskReminder({ ...base, overdue: true, late_days: 3 }).body).toBe(
      "Atrasada há 3 dias (era às 09:30). Conclua ou escolha uma nova data.",
    );
  });
});
