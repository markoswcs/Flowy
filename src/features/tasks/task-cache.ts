"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import type { Task, TaskFilters } from "@/types/productivity";

import { localDateKey } from "./date-utils";
import { taskKeys } from "./query-keys";

const PREFIX = "flowy:tasks-cache:";

interface CachedList {
  day: string;
  savedAt: number;
  tasks: Task[];
}

function storageKey(userId: string, filters: TaskFilters) {
  return `${PREFIX}${userId}:${JSON.stringify(filters)}`;
}

/** Only the plain period lists are kept: searches and extra filters change too often. */
function cacheable(filters: TaskFilters) {
  return Object.entries(filters).every(
    ([key, value]) => key === "scope" || value === undefined,
  );
}

function read(key: string): CachedList | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const cached = JSON.parse(raw) as CachedList;
    // "Hoje", "Atrasadas" and "Próximas" depend on the date: yesterday's copy is wrong.
    return cached.day === localDateKey() && Array.isArray(cached.tasks) ? cached : null;
  } catch {
    return null;
  }
}

function write(key: string, tasks: Task[]) {
  try {
    const value: CachedList = {
      day: localDateKey(),
      savedAt: Date.now(),
      tasks: tasks.filter((task) => !task.id.startsWith("optimistic-")),
    };
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or blocked: the list simply loads from the network next time.
  }
}

/**
 * Shows the last list seen on this device the moment the app opens, while the
 * fresh one loads. The copy is marked with the time it was saved, so React
 * Query treats it as stale and the network result replaces it right away.
 */
export function useTaskListCache(
  userId: string | undefined,
  filters: TaskFilters,
  tasks: Task[] | undefined,
) {
  const queryClient = useQueryClient();
  const enabled = Boolean(userId) && cacheable(filters);
  const key = enabled ? storageKey(userId!, filters) : null;
  const queryKeyHash = JSON.stringify(filters);

  useEffect(() => {
    if (!key) return;
    const queryKey = taskKeys.list(JSON.parse(queryKeyHash) as TaskFilters);
    if (queryClient.getQueryData(queryKey)) return;
    const cached = read(key);
    if (cached) {
      queryClient.setQueryData(queryKey, cached.tasks, { updatedAt: cached.savedAt });
    }
  }, [key, queryClient, queryKeyHash]);

  useEffect(() => {
    if (key && tasks) write(key, tasks);
  }, [key, tasks]);
}

/** Removes every cached list, so the next person on this device sees nothing. */
export function clearTaskCache() {
  try {
    Object.keys(window.localStorage)
      .filter((key) => key.startsWith(PREFIX))
      .forEach((key) => window.localStorage.removeItem(key));
  } catch {
    // Nothing to clear when storage is blocked.
  }
}
