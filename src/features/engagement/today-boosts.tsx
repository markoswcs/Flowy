"use client";

import { useQuery } from "@tanstack/react-query";
import { BookOpen, CalendarClock, Check } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { localDateKey } from "@/features/tasks/date-utils";
import { taskKeys } from "@/features/tasks/query-keys";
import { useCreateTask, useTasks } from "@/features/tasks/use-tasks";
import { notify } from "@/providers/notification-provider";
import { cn } from "@/lib/utils";
import { listCompletionDays } from "@/services/tasks";

import { ClassNowCard } from "@/features/classes/class-now-card";

import { FlameArt } from "./flame-art";
import { StreakSheet } from "./streak-sheet";
import { levelOf } from "./streak-levels";
import {
  countdownLabel,
  countdowns,
  hasStudyPlan,
  streakState,
  studyPlan,
} from "./engagement";

function since(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return localDateKey(date);
}

/**
 * The streak as a small flame button next to the calendar: the flame of the
 * level and the number; a tap opens the streak and the ranking.
 */
export function StreakButton() {
  const today = localDateKey();
  const [open, setOpen] = useState(false);
  const times = useQuery({
    queryKey: [...taskKeys.all, "completion-days"],
    queryFn: () => listCompletionDays(since(120)),
    staleTime: 60_000,
  });
  const days = times.data ?? [];
  const { count, status } = streakState(days, today);
  const level = levelOf(count);
  const frozen = status === "frozen";
  const pending = status === "waiting" || frozen;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        data-no-glow
        title="Sua sequência de dias concluindo tarefas"
        aria-label={`${count} ${count === 1 ? "dia seguido" : "dias seguidos"} concluindo tarefas. Ver sequência e ranking`}
        className="relative flex h-11 shrink-0 items-center gap-1 rounded-2xl border pl-1.5 pr-2.5 transition-transform active:scale-95"
        style={{
          borderColor: frozen ? "rgb(56 189 248 / 0.4)" : `${level.color}66`,
          background: frozen ? "rgb(56 189 248 / 0.1)" : `${level.color}1a`,
        }}
      >
        <FlameArt days={count} size={30} frozen={frozen} />
        <span
          key={count}
          className="font-brand text-lg font-extrabold tabular-nums animate-in zoom-in-50 fade-in duration-500"
          style={{ color: frozen ? "#7dd3fc" : level.color }}
        >
          {count}
        </span>
        {/* Today still open: a small dot asks for one task. */}
        {pending ? (
          <span
            className="absolute -right-1 -top-1 size-3 rounded-full border-2 border-background bg-orange-500"
            aria-hidden="true"
          />
        ) : null}
      </button>
      {open ? (
        <StreakSheet doneDays={days} onClose={() => setOpen(false)} />
      ) : null}
    </>
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

/** Extras of the "Hoje" view: the streak, the class now and tests coming up. */
export function TodayBoosts() {
  return (
    <div className="space-y-3">
      <ClassNowCard />
      <Deadlines />
    </div>
  );
}
