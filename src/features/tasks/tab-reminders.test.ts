import { describe, expect, it } from "vitest";

import { dueInTab, firedId } from "./tab-reminders";

const task = (over: Partial<Parameters<typeof firedId>[0]> = {}) => ({
  id: "a",
  title: "Reunião",
  status: "todo" as const,
  due_date: "2026-11-13",
  due_time: "15:00:00",
  ...over,
});

describe("dueInTab", () => {
  const at = (time: string) => new Date(`2026-11-13T${time}`);

  it("shows a task at its time", () => {
    expect(dueInTab([task()], at("15:00:10"), new Set())).toHaveLength(1);
  });

  it("waits until the time comes", () => {
    expect(dueInTab([task()], at("14:59:00"), new Set())).toHaveLength(0);
  });

  it("still shows a few minutes late, not much later", () => {
    expect(dueInTab([task()], at("15:08:00"), new Set())).toHaveLength(1);
    expect(dueInTab([task()], at("15:20:00"), new Set())).toHaveLength(0);
  });

  it("shows once", () => {
    expect(dueInTab([task()], at("15:01:00"), new Set([firedId(task())]))).toHaveLength(0);
  });

  it("skips done tasks, tasks without time and other days", () => {
    const now = at("15:01:00");
    expect(dueInTab([task({ status: "completed" })], now, new Set())).toHaveLength(0);
    expect(dueInTab([task({ due_time: null })], now, new Set())).toHaveLength(0);
    expect(dueInTab([task({ due_date: "2026-11-12" })], now, new Set())).toHaveLength(0);
  });

  it("fires again when the time changes", () => {
    const fired = new Set([firedId(task())]);
    expect(dueInTab([task({ due_time: "15:30:00" })], at("15:31:00"), fired)).toHaveLength(1);
  });
});
