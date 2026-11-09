"use client";

import { Check, ChevronRight, Dumbbell } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { localDateKey } from "@/features/tasks/date-utils";
import { notify } from "@/providers/notification-provider";

import { buildSession, sessionKeyFor } from "../plan";
import { FEELING_LABELS, type Feeling } from "../types";
import { useLogWorkout, useWorkoutLogs, useWorkoutProfile, useWorkoutsEnabled } from "../use-workouts";

/**
 * Today's workout on the "Hoje" list, for people who turned Treinos on. Nothing
 * shows on rest days or before the plan exists; once done it shrinks to a line.
 */
export function TodayWorkoutCard() {
  const { enabled } = useWorkoutsEnabled();
  const profileQuery = useWorkoutProfile(enabled);
  const logsQuery = useWorkoutLogs(enabled);
  const logWorkout = useLogWorkout();
  const [askFeeling, setAskFeeling] = useState(false);

  const profile = profileQuery.data;
  if (!enabled || !profile || !logsQuery.data) return null;
  const today = localDateKey();
  const key = sessionKeyFor(profile, today);
  if (!key) return null;
  const session = buildSession(profile, key);
  const log = logsQuery.data.find((item) => item.day === today);

  if (log) {
    return (
      <Link
        href="/app/workouts"
        className="flex items-center gap-2 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-2.5 text-sm font-medium text-emerald-400"
      >
        <Check className="size-4" aria-hidden="true" />
        {log.status === "done" ? "Treino de hoje concluído" : "Treino de hoje pulado"}
        <ChevronRight className="ml-auto size-4" aria-hidden="true" />
      </Link>
    );
  }

  function finish(feeling: Feeling) {
    if (!profile || !key) return;
    logWorkout.mutate(
      { profile, day: today, session: key, status: "done", feeling },
      { onSuccess: () => notify("Treino concluído") },
    );
  }

  return (
    <section
      aria-label="Treino de hoje"
      className="flex flex-col gap-3 rounded-2xl border border-violet-500/30 bg-violet-500/[0.07] p-3.5 animate-in fade-in slide-in-from-top-2 sm:flex-row sm:items-center sm:p-4"
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl flowy-active">
          <Dumbbell className="size-5" aria-hidden="true" />
        </span>
        <p className="min-w-0 text-sm leading-5">
          <span className="block text-xs font-semibold uppercase tracking-widest flowy-ink">Treino de hoje</span>
          <strong className="block truncate font-semibold">{session.name}</strong>
          <span className="block text-muted-foreground">
            ~{profile.minutes} min · {session.exercises.length} exercícios
          </span>
        </p>
      </div>
      {askFeeling ? (
        <div className="flex shrink-0 gap-1.5" role="group" aria-label="Como foi?">
          {(Object.keys(FEELING_LABELS) as Feeling[]).map((feeling) => (
            <Button
              key={feeling}
              type="button"
              size="sm"
              variant="outline"
              disabled={logWorkout.isPending}
              onClick={() => finish(feeling)}
            >
              {FEELING_LABELS[feeling]}
            </Button>
          ))}
        </div>
      ) : (
        <div className="flex shrink-0 gap-1.5">
          <Link
            href="/app/workouts"
            className="inline-flex h-9 items-center rounded-md px-3 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            Ver treino
          </Link>
          <Button type="button" size="sm" onClick={() => setAskFeeling(true)} className="gap-1.5">
            <Check className="size-4" />
            Concluí
          </Button>
        </div>
      )}
    </section>
  );
}
