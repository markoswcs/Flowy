import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const calls: Array<[string, unknown[]]> = [];

// Records every filter listTasks adds and resolves with no rows.
function builder() {
  const chain: Record<string, unknown> = {};
  for (const method of ["from", "select", "eq", "is", "or", "lt", "gt", "order"]) {
    chain[method] = (...args: unknown[]) => {
      calls.push([method, args]);
      return chain;
    };
  }
  chain.limit = () => Promise.resolve({ data: [], error: null });
  return chain;
}

vi.mock("@/services/authenticated-client", () => ({
  getAuthenticatedClient: async () => ({ supabase: builder(), userId: "u1" }),
  messageFromUnknownError: () => "",
}));

import { listTasks } from "./tasks";

beforeEach(() => {
  calls.length = 0;
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 10, 3, 10, 0));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("listTasks", () => {
  it("'Hoje' brings today's tasks and the late ones still to do", async () => {
    await listTasks({ scope: "today" });

    expect(calls).toContainEqual([
      "or",
      ["due_date.eq.2026-11-03,and(due_date.lt.2026-11-03,status.neq.completed)"],
    ]);
    expect(calls.some(([method, args]) => method === "eq" && args[0] === "due_date")).toBe(false);
  });

  it("'Atrasadas' still lists only late tasks", async () => {
    await listTasks({ scope: "overdue" });

    expect(calls).toContainEqual(["lt", ["due_date", "2026-11-03"]]);
  });
});
