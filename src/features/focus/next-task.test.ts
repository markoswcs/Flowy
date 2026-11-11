import type { Task } from "@/types/productivity";
import { describe, expect, it } from "vitest";

import { clock, focusQueue, nextTask, remaining } from "./next-task";

const task = (id: string, priority: string, due_date: string | null, due_time: string | null = null, status = "todo") =>
  ({ id, priority, due_date, due_time, status, position: 0, deleted_at: null }) as unknown as Task;

describe("one thing at a time", () => {
  const tasks = [
    task("normal-late", "normal", "2026-11-09"),
    task("normal-today-9", "normal", "2026-11-11", "09:00:00"),
    task("high-today", "high", "2026-11-11"),
    task("tomorrow", "high", "2026-11-12"),
    task("done", "high", "2026-11-11", null, "completed"),
  ];

  it("puts important first, then late, then by time, leaving out tomorrow and done", () => {
    expect(focusQueue(tasks, "2026-11-11").map(({ id }) => id)).toEqual(["high-today", "normal-late", "normal-today-9"]);
  });

  it("skips what the person passed, coming back to it at the end", () => {
    expect(nextTask(tasks, "2026-11-11", ["high-today"])?.id).toBe("normal-late");
    expect(nextTask(tasks, "2026-11-11", ["high-today", "normal-late", "normal-today-9"])?.id).toBe("high-today");
    expect(nextTask([], "2026-11-11", [])).toBeNull();
  });

  it("shows the time left", () => {
    expect(remaining({ taskId: null, mode: "focus", endsAt: 90_500 }, 0)).toBe(91);
    expect(remaining({ taskId: null, mode: "focus", endsAt: 0 }, 5000)).toBe(0);
    expect(clock(25 * 60)).toBe("25:00");
    expect(clock(61)).toBe("01:01");
  });
});
