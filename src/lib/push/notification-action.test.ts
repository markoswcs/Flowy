import { describe, expect, it } from "vitest";

import { changeFor, isNotificationAction, wallClock } from "./notification-action";

const now = new Date(2026, 10, 11, 14, 7);
const task = { due_date: "2026-11-11", due_time: "14:00:00", recurrence: null };

describe("buttons under a reminder", () => {
  it("knows its three buttons", () => {
    expect(["done", "later", "tomorrow"].every(isNotificationAction)).toBe(true);
    expect(isNotificationAction("delete")).toBe(false);
  });

  it("completes the task", () => {
    expect(changeFor("done", task, now, "2026-11-11T17:07:00.000Z")).toEqual({
      kind: "update",
      values: { status: "completed", completed_at: "2026-11-11T17:07:00.000Z" },
    });
  });

  it("moves it one hour ahead, rounded to 5 minutes", () => {
    expect(changeFor("later", task, now, "")).toEqual({
      kind: "update",
      values: { due_date: "2026-11-11", due_time: "15:10:00" },
    });
    // Late at night it goes to the next day.
    expect(changeFor("later", task, new Date(2026, 10, 11, 23, 30), "")).toMatchObject({
      values: { due_date: "2026-11-12", due_time: "00:30:00" },
    });
  });

  it("moves it to tomorrow at the same time", () => {
    expect(changeFor("tomorrow", task, now, "")).toEqual({
      kind: "update",
      values: { due_date: "2026-11-12", due_time: "14:00:00" },
    });
  });

  it("opens the app instead of moving a whole repeating series", () => {
    expect(changeFor("later", { ...task, recurrence: "daily" }, now, "")).toEqual({ kind: "open" });
    expect(changeFor("done", { ...task, recurrence: "daily" }, now, "x").kind).toBe("update");
  });

  it("reads the clock in the person's time zone", () => {
    const local = wallClock("America/Sao_Paulo", new Date("2026-11-12T02:30:00Z"));
    expect([local.getDate(), local.getHours()]).toEqual([11, 23]);
  });
});
