"use client";

import { useQuery } from "@tanstack/react-query";
import {
  BookOpen,
  CalendarClock,
  Check,
  Flame,
  Moon,
  Target,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { localDateKey } from "@/features/tasks/date-utils";
import { taskKeys } from "@/features/tasks/query-keys";
import { useCreateTask, useTasks } from "@/features/tasks/use-tasks";
import { notify } from "@/providers/notification-provider";
import { cn } from "@/lib/utils";
import { listCompletionDays } from "@/services/tasks";

import { ClassNowCard } from "@/features/classes/class-now-card";

import { OPEN_DUMP_EVENT } from "./brain-dump";
import {
  countdownLabel,
  countdowns,
  hasStudyPlan,
  streak,
  studyPlan,
} from "./engagement";

function since(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return localDateKey(date);
}

/** Days in a row with at least one task done; says so in plain words. */
function StreakChip() {
  const today = localDateKey();
  const times = useQuery({
    queryKey: [...taskKeys.all, "completion-days"],
    queryFn: () => listCompletionDays(since(60)),
    staleTime: 60_000,
  });
  if (!times.data) return null;
  const days = streak(times.data, today);

  return (
    <p
      className={cn(
        "inline-flex items-center gap-2 text-sm",
        days ? "text-foreground" : "text-muted-foreground",
      )}
      title="Dias seguidos em que você concluiu pelo menos uma tarefa"
    >
      <span
        className={cn(
          "grid size-8 shrink-0 place-items-center rounded-full",
          days ? "bg-orange-500/15 text-orange-400" : "bg-muted/60 text-muted-foreground",
        )}
      >
        <Flame className="size-4" aria-hidden="true" />
      </span>
      {days ? (
        <span>
          <span className="font-semibold">{days} {days === 1 ? "dia" : "dias"}</span>{" "}
          <span className="text-muted-foreground">seguidos concluindo tarefas</span>
        </span>
      ) : (
        <span>Conclua uma tarefa para começar sua sequência</span>
      )}
    </p>
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
        await create.mutateAsync({
          ...session,
          folder_id: task.folder_id,
          priority: "normal",
        });
      }
      notify(
        `Plano criado: ${sessions.length} ${sessions.length === 1 ? "sessão" : "sessões"} de estudo`,
      );
    } finally {
      setCreating(null);
    }
  }

  return (
    <section
      className="rounded-3xl border border-border/60 bg-card/50 p-4"
      aria-label="Provas e entregas"
    >
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        <CalendarClock className="size-4 flowy-ink" aria-hidden="true" />
        Provas e entregas
      </h2>
      <ul className="mt-3 space-y-2">
        {list.map(({ task, days }) => {
          const planned = hasStudyPlan(task.title, all);
          return (
            <li
              key={task.id}
              className="flex flex-wrap items-center gap-3 rounded-2xl bg-background/40 p-3"
            >
              <span
                className={cn(
                  "grid size-12 shrink-0 place-items-center rounded-2xl text-center leading-none",
                  days <= 2
                    ? "bg-destructive/15 text-destructive"
                    : "bg-violet-500/15 flowy-ink",
                )}
              >
                <span>
                  <span className="block text-lg font-bold tabular-nums">
                    {days}
                  </span>
                  <span className="block text-[10px] font-medium">
                    {days === 1 ? "dia" : "dias"}
                  </span>
                </span>
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{task.title}</p>
                <p className="text-xs text-muted-foreground">
                  {countdownLabel(days)}
                </p>
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

// Both shortcuts look alike and plain: they open something, they are not a state.
const shortcut =
  "inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-border/60 px-3.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground";

/** Extras of the "Hoje" view: the streak, the way into Foco and tests coming up. */
export function TodayBoosts() {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <StreakChip />
        <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event(OPEN_DUMP_EVENT))}
            className={shortcut}
          >
            <Moon className="size-4 shrink-0" aria-hidden="true" />
            Esvaziar a cabeça
          </button>
          <Link href="/app/focus" className={shortcut}>
            <Target className="size-4 shrink-0" aria-hidden="true" />
            Modo foco
          </Link>
        </div>
      </div>
      <ClassNowCard />
      <Deadlines />
    </div>
  );
}
