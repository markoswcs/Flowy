"use client";

import type { QueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { localDateKey } from "@/features/tasks/date-utils";
import { taskKeys } from "@/features/tasks/query-keys";
import type { Task } from "@/types/productivity";

const EVENT = "flowy:day-cleared";

type DayTask = Pick<Task, "id" | "status" | "due_date" | "deleted_at">;

/**
 * Whether nothing is left for today (late tasks included) in the lists the
 * app already has. Null when no list with today's tasks is loaded: then we
 * cannot tell and stay quiet.
 */
export function todayIsClear(lists: (DayTask[] | undefined)[], today = localDateKey()): boolean | null {
  const byId = new Map<string, DayTask>();
  for (const list of lists) for (const task of list ?? []) byId.set(task.id, task);
  const forToday = [...byId.values()].filter((task) => !task.deleted_at && task.due_date && task.due_date <= today);
  if (!forToday.length) return null;
  return forToday.every((task) => task.status === "completed");
}

/** Called after a task of today is completed: celebrates when it was the last one. */
export function celebrateIfDayCleared(queryClient: QueryClient, completed: Pick<Task, "due_date">) {
  const today = localDateKey();
  if (!completed.due_date || completed.due_date > today) return;
  const lists = queryClient.getQueriesData<DayTask[]>({ queryKey: taskKeys.lists() }).map(([, data]) => data);
  if (todayIsClear(lists, today)) window.dispatchEvent(new Event(EVENT));
}

const PIECES = Array.from({ length: 28 }, (_, index) => index);
const COLORS = ["#a78bfa", "#8b5cf6", "#f472b6", "#34d399", "#fbbf24", "#60a5fa"];

/** "Dia limpo!": a short burst of confetti when the last task of the day is done. */
export function DayClearedCelebration() {
  const [shown, setShown] = useState(0);

  useEffect(() => {
    const show = () => setShown(Date.now());
    window.addEventListener(EVENT, show);
    return () => window.removeEventListener(EVENT, show);
  }, []);

  useEffect(() => {
    if (!shown) return;
    const timer = window.setTimeout(() => setShown(0), 2800);
    return () => window.clearTimeout(timer);
  }, [shown]);

  if (!shown) return null;
  return (
    <div
      key={shown}
      className="pointer-events-none fixed inset-0 z-[290] grid place-items-center overflow-hidden"
      role="status"
      aria-live="polite"
    >
      {PIECES.map((index) => (
        <span
          key={index}
          className="absolute top-1/2 left-1/2 block h-2.5 w-1.5 rounded-sm"
          style={
            {
              background: COLORS[index % COLORS.length],
              "--dx": `${Math.cos((index / PIECES.length) * 2 * Math.PI) * (120 + (index % 5) * 30)}px`,
              "--dy": `${Math.sin((index / PIECES.length) * 2 * Math.PI) * (120 + (index % 4) * 35) - 80}px`,
              "--rot": `${index * 47}deg`,
              animation: `flowy-confetti 1.4s cubic-bezier(0.16, 1, 0.3, 1) ${(index % 6) * 25}ms both`,
            } as React.CSSProperties
          }
        />
      ))}
      <div className="flowy-check-pop flowy-glass flowy-glass-strong rounded-3xl border px-7 py-5 text-center shadow-soft">
        <p className="text-3xl" aria-hidden="true">🎉</p>
        <p className="mt-1 text-lg font-bold">Dia limpo!</p>
        <p className="text-sm text-muted-foreground">Tudo de hoje está feito.</p>
      </div>
    </div>
  );
}
