"use client";

import { useQuery } from "@tanstack/react-query";
import { BookOpen, CalendarClock, Check, Flame, Sparkles, Target } from "lucide-react";
import Link from "next/link";
import { useState, useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import { localDateKey } from "@/features/tasks/date-utils";
import { taskKeys } from "@/features/tasks/query-keys";
import { useCreateTask, useTasks } from "@/features/tasks/use-tasks";
import { notify } from "@/providers/notification-provider";
import { cn } from "@/lib/utils";
import { listCompletionTimes } from "@/services/tasks";

import {
  AURORA_STREAK,
  countdownLabel,
  countdowns,
  hasStudyPlan,
  streak,
  studyPlan,
} from "./engagement";

export const AURORA_KEY = "flowy:aurora";
const auroraListeners = new Set<() => void>();

function auroraOn() {
  try {
    return window.localStorage.getItem(AURORA_KEY) === "1";
  } catch {
    return false;
  }
}

function setAurora(on: boolean) {
  try {
    window.localStorage.setItem(AURORA_KEY, on ? "1" : "0");
  } catch {
    // Private mode: it lasts until the page reloads.
  }
  document.documentElement.classList.toggle("flowy-aurora", on);
  auroraListeners.forEach((listener) => listener());
}

function useAurora() {
  return useSyncExternalStore(
    (listener) => {
      auroraListeners.add(listener);
      return () => auroraListeners.delete(listener);
    },
    auroraOn,
    () => false,
  );
}

function since(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return localDateKey(date);
}

function StreakChip() {
  const today = localDateKey();
  const times = useQuery({
    queryKey: [...taskKeys.all, "completion-times"],
    queryFn: () => listCompletionTimes(since(60)),
    staleTime: 60_000,
  });
  const aurora = useAurora();
  if (!times.data) return null;
  const days = streak(times.data, today);
  const golden = days >= AURORA_STREAK;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold",
          golden
            ? "bg-gradient-to-r from-amber-400/25 via-pink-500/25 to-violet-500/25 text-amber-300 ring-1 ring-amber-400/40"
            : "bg-orange-500/15 text-orange-400",
        )}
        title="Dias seguidos com pelo menos uma tarefa concluída"
      >
        <Flame className="size-4" aria-hidden="true" />
        {days === 0
          ? "Comece sua sequência hoje"
          : `${days} ${days === 1 ? "dia seguido" : "dias seguidos"}`}
      </span>
      {golden ? (
        <button
          type="button"
          onClick={() => {
            setAurora(!aurora);
            if (!aurora) notify("Cores Aurora ativadas 🌈");
          }}
          className="inline-flex items-center gap-1.5 rounded-full border border-pink-400/40 px-3 py-1.5 text-xs font-semibold text-pink-300 hover:bg-pink-500/10"
        >
          <Sparkles className="size-3.5" aria-hidden="true" />
          {aurora ? "Desligar cores Aurora" : "Você ganhou as cores Aurora: usar"}
        </button>
      ) : days > 0 ? (
        <span className="text-xs text-muted-foreground">
          Mais {AURORA_STREAK - days} {AURORA_STREAK - days === 1 ? "dia" : "dias"} para ganhar as cores Aurora 🌈
        </span>
      ) : null}
    </div>
  );
}

function Deadlines() {
  const today = localDateKey();
  const todayTasks = useTasks({ scope: "today" });
  const upcoming = useTasks({ scope: "upcoming" });
  const create = useCreateTask();
  const [creating, setCreating] = useState<string | null>(null);
  const all = [...(todayTasks.data ?? []), ...(upcoming.data ?? [])];
  const list = countdowns(all, today).slice(0, 3);
  if (!list.length) return null;

  async function plan(task: (typeof list)[number]["task"]) {
    const sessions = studyPlan(task.title, today, task.due_date!);
    setCreating(task.id);
    try {
      for (const session of sessions) {
        await create.mutateAsync({ ...session, folder_id: task.folder_id, priority: "normal" });
      }
      notify(`Plano criado: ${sessions.length} ${sessions.length === 1 ? "sessão" : "sessões"} de estudo`);
    } finally {
      setCreating(null);
    }
  }

  return (
    <section className="rounded-3xl border border-border/60 bg-card/50 p-4" aria-label="Provas e entregas">
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        <CalendarClock className="size-4 flowy-ink" aria-hidden="true" />
        Provas e entregas
      </h2>
      <ul className="mt-3 space-y-2">
        {list.map(({ task, days }) => {
          const planned = hasStudyPlan(task.title, all);
          return (
            <li key={task.id} className="flex flex-wrap items-center gap-3 rounded-2xl bg-background/40 p-3">
              <span
                className={cn(
                  "grid size-12 shrink-0 place-items-center rounded-2xl text-center leading-none",
                  days <= 2 ? "bg-destructive/15 text-destructive" : "bg-violet-500/15 flowy-ink",
                )}
              >
                <span>
                  <span className="block text-lg font-bold tabular-nums">{days}</span>
                  <span className="block text-[10px] font-medium">{days === 1 ? "dia" : "dias"}</span>
                </span>
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{task.title}</p>
                <p className="text-xs text-muted-foreground">{countdownLabel(days)}</p>
              </div>
              {days >= 1 ? (
                planned ? (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400">
                    <Check className="size-3.5" aria-hidden="true" />
                    Plano de estudo criado
                  </span>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    loading={creating === task.id}
                    disabled={Boolean(creating)}
                    onClick={() => void plan(task)}
                  >
                    <BookOpen className="size-3.5" />
                    Montar plano de estudo
                  </Button>
                )
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Extras of the "Hoje" view: the streak, the way into Foco and tests coming up. */
export function TodayBoosts() {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <StreakChip />
        <Link
          href="/app/focus"
          className="inline-flex items-center gap-1.5 rounded-full bg-violet-500/15 px-3.5 py-1.5 text-sm font-semibold flowy-ink transition-colors hover:bg-violet-500/25"
        >
          <Target className="size-4" aria-hidden="true" />
          Modo foco
        </Link>
      </div>
      <Deadlines />
    </div>
  );
}
