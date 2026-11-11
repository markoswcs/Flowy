import { describe, expect, it } from "vitest";

import { todayIsClear } from "./day-cleared";

const task = (id: string, status: string, due_date: string | null) => ({ id, status, due_date, deleted_at: null }) as never;

describe("day cleared", () => {
  it("is clear only when every task of today, late ones included, is done", () => {
    expect(todayIsClear([[task("a", "completed", "2026-11-11"), task("b", "todo", "2026-11-12")]], "2026-11-11")).toBe(true);
    expect(todayIsClear([[task("a", "completed", "2026-11-11"), task("c", "todo", "2026-11-09")]], "2026-11-11")).toBe(false);
  });

  it("uses the newest copy of a task across lists and stays quiet without data", () => {
    expect(todayIsClear([[task("a", "todo", "2026-11-11")], [task("a", "completed", "2026-11-11")]], "2026-11-11")).toBe(true);
    expect(todayIsClear([[task("b", "todo", null)]], "2026-11-11")).toBeNull();
    expect(todayIsClear([undefined], "2026-11-11")).toBeNull();
  });
});
