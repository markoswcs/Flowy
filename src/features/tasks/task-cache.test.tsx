import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { Task } from "@/types/productivity";

import { localDateKey } from "./date-utils";
import { taskKeys } from "./query-keys";
import { clearTaskCache, useTaskListCache } from "./task-cache";

const task = { id: "t1", title: "Pagar conta" } as Task;

function setup() {
  const queryClient = new QueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { queryClient, wrapper };
}

function seed(userId: string, day: string, savedAt = Date.now()) {
  window.localStorage.setItem(
    `flowy:tasks-cache:${userId}:${JSON.stringify({ scope: "today" })}`,
    JSON.stringify({ day, savedAt, tasks: [task] }),
  );
}

afterEach(() => {
  window.localStorage.clear();
  vi.useRealTimers();
});

describe("useTaskListCache", () => {
  it("fills an empty query with today's saved list, marked as stale", () => {
    seed("u1", localDateKey(), 1000);
    const { queryClient, wrapper } = setup();

    renderHook(() => useTaskListCache("u1", { scope: "today" }, undefined), { wrapper });

    const key = taskKeys.list({ scope: "today" });
    expect(queryClient.getQueryData(key)).toEqual([task]);
    expect(queryClient.getQueryState(key)?.dataUpdatedAt).toBe(1000);
  });

  it("ignores a list saved on another day or by another account", () => {
    seed("u1", "2000-01-01");
    seed("u2", localDateKey());
    const { queryClient, wrapper } = setup();

    renderHook(() => useTaskListCache("u1", { scope: "today" }, undefined), { wrapper });

    expect(queryClient.getQueryData(taskKeys.list({ scope: "today" }))).toBeUndefined();
  });

  it("saves plain period lists without optimistic tasks, but not searches", () => {
    const { wrapper } = setup();
    const optimistic = { id: "optimistic-1", title: "Nova" } as Task;

    renderHook(() => useTaskListCache("u1", { scope: "all" }, [task, optimistic]), { wrapper });
    renderHook(() => useTaskListCache("u1", { scope: "all", search: "conta" }, [task]), { wrapper });

    const keys = Object.keys(window.localStorage);
    expect(keys).toEqual([`flowy:tasks-cache:u1:${JSON.stringify({ scope: "all" })}`]);
    expect(JSON.parse(window.localStorage.getItem(keys[0]!)!).tasks).toEqual([task]);
  });

  it("clearTaskCache removes every saved list", () => {
    seed("u1", localDateKey());
    window.localStorage.setItem("flowy:theme", "purple");

    clearTaskCache();

    expect(Object.keys(window.localStorage)).toEqual(["flowy:theme"]);
  });
});
