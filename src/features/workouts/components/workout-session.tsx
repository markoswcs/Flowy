"use client";

import { Check, ChevronDown, Pencil, RefreshCw, SkipForward, Timer, Undo2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { notify } from "@/providers/notification-provider";
import { cn } from "@/lib/utils";

import { ExerciseFigure } from "../figure/exercise-figure";
import { alternativesFor, formatDose, type PlannedExercise, type Session } from "../plan";
import { FEELING_LABELS, type Feeling, type WorkoutLog, type WorkoutProfile } from "../types";
import { useLogWorkout, useSaveCustomSession, useSwapExercise, useUndoWorkoutLog } from "../use-workouts";

const FEELING_MESSAGES: Record<Feeling, string> = {
  easy: "Boa! O próximo treino vai ser um pouco mais puxado.",
  ok: "Na medida: o próximo segue no mesmo ritmo.",
  hard: "Anotado: o próximo treino vai ser mais leve.",
};

function ExerciseRow({
  item,
  profile,
  index,
  session,
}: {
  item: PlannedExercise;
  profile: WorkoutProfile;
  index: number;
  session: Session;
}) {
  const [open, setOpen] = useState(false);
  const [swapping, setSwapping] = useState(false);
  const swap = useSwapExercise();
  const saveCustom = useSaveCustomSession();
  const pending = swap.isPending || saveCustom.isPending;
  const alternatives = alternativesFor(item.exercise, profile);
  // The original exercise of this position, so swapping twice replaces the first swap.
  const original =
    Object.entries(profile.swaps).find(([, to]) => to === item.exercise.id)?.[0] ?? item.exercise.id;

  function replaceWith(id: string) {
    const done = { onSuccess: () => setSwapping(false) };
    if (!session.custom) {
      swap.mutate({ profile, from: original, to: id }, done);
      return;
    }
    // An edited workout keeps its own list: change only this position.
    const exercises = session.exercises.map(({ exercise, sets, amount, rest }, position) => ({
      id: position === index ? id : exercise.id,
      sets,
      amount,
      rest,
    }));
    saveCustom.mutate({ profile, key: session.key, exercises }, done);
  }

  return (
    <li className="rounded-2xl border border-border/50 bg-background/40 p-3.5">
      <div className="flex items-start gap-3">
        <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-muted text-xs font-bold tabular-nums">
          {index + 1}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-medium leading-snug">{item.exercise.name}</p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{formatDose(item)}</span>
            {item.rest ? <span> · descanso {item.rest} s</span> : null}
          </p>
        </div>
      </div>

      <div className="mt-2.5 flex flex-wrap gap-1.5 pl-11">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          className="inline-flex items-center gap-1 rounded-full border border-border/60 px-3 py-1 text-xs font-medium text-muted-foreground hover:bg-muted/40 hover:text-foreground"
        >
          Como fazer
          <ChevronDown className={cn("size-3.5 transition-transform", open && "rotate-180")} aria-hidden="true" />
        </button>
        {alternatives.length ? (
          <button
            type="button"
            onClick={() => setSwapping((value) => !value)}
            aria-expanded={swapping}
            className="inline-flex items-center gap-1 rounded-full border border-border/60 px-3 py-1 text-xs font-medium text-muted-foreground hover:bg-muted/40 hover:text-foreground"
          >
            <RefreshCw className="size-3.5" aria-hidden="true" />
            Trocar
          </button>
        ) : null}
      </div>

      {open ? (
        <div className="mt-3 space-y-2 text-sm animate-in fade-in slide-in-from-top-1 sm:pl-11">
          <ExerciseFigure exerciseId={item.exercise.id} name={item.exercise.name} className="mx-auto max-w-xs" />
          <ol className="list-decimal space-y-1 pl-4 text-muted-foreground">
            {item.exercise.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <p className="rounded-xl bg-primary/10 px-3 py-2 text-xs flowy-ink">Dica: {item.exercise.tip}</p>
        </div>
      ) : null}

      {swapping ? (
        <div className="mt-3 space-y-1.5 pl-11 animate-in fade-in slide-in-from-top-1">
          <p className="text-xs text-muted-foreground">Trocar por:</p>
          <div className="flex flex-wrap gap-1.5">
            {alternatives.map((alternative) => (
              <button
                key={alternative.id}
                type="button"
                disabled={pending}
                onClick={() => replaceWith(alternative.id)}
                className="rounded-full border border-border/60 px-3 py-1 text-xs font-medium hover:border-violet-400/60 hover:bg-violet-500/10"
              >
                {alternative.name}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </li>
  );
}

/** One day's workout: what to do, how to do it, and marking it done or skipped. */
export function WorkoutSession({
  session,
  profile,
  day,
  log,
  title = "Treino de hoje",
  onEdit,
}: {
  session: Session;
  profile: WorkoutProfile;
  day: string;
  log?: WorkoutLog;
  title?: string;
  onEdit?: () => void;
}) {
  const [askFeeling, setAskFeeling] = useState(false);
  const logWorkout = useLogWorkout();
  const undo = useUndoWorkoutLog();

  function finish(feeling: Feeling) {
    logWorkout.mutate(
      { profile, day, session: session.key, status: "done", feeling },
      {
        onSuccess: () => {
          setAskFeeling(false);
          // Confirmations show a title only, so the adjustment is the title.
          notify(FEELING_MESSAGES[feeling]);
        },
      },
    );
  }

  return (
    <section className="rounded-3xl border border-border/60 bg-card/50 p-4 sm:p-6" aria-label={title}>
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest flowy-ink">{title}</p>
          <h2 className="mt-1 text-xl font-semibold">{session.name}</h2>
          <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
            <Timer className="size-4" aria-hidden="true" />
            ~{profile.minutes} min · {session.exercises.length} exercícios
            {session.custom ? " · editado por você" : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
        {onEdit && !log ? (
          <Button type="button" variant="outline" size="sm" onClick={onEdit} className="gap-1.5">
            <Pencil className="size-3.5" />
            Editar
          </Button>
        ) : null}
        {log ? (
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold",
              log.status === "done" ? "bg-emerald-500/15 text-emerald-400" : "bg-muted text-muted-foreground",
            )}
          >
            {log.status === "done" ? <Check className="size-3.5" /> : <SkipForward className="size-3.5" />}
            {log.status === "done"
              ? `Concluído${log.feeling ? ` · ${FEELING_LABELS[log.feeling]}` : ""}`
              : "Pulado"}
          </span>
        ) : null}
        </div>
      </header>

      <p className="mt-4 rounded-2xl bg-muted/40 px-4 py-2.5 text-sm text-muted-foreground">
        Aquecimento: 5 minutos de caminhada no lugar, giros de braço e quadril.
      </p>

      <ol className="mt-3 space-y-2">
        {session.exercises.map((item, index) => (
          <ExerciseRow key={`${item.exercise.id}-${index}`} item={item} profile={profile} index={index} session={session} />
        ))}
      </ol>

      <div className="mt-5">
        {log ? (
          <Button type="button" variant="ghost" onClick={() => undo.mutate(day)} loading={undo.isPending} className="gap-2">
            <Undo2 className="size-4" />
            Desfazer
          </Button>
        ) : askFeeling ? (
          <div className="space-y-2 animate-in fade-in slide-in-from-bottom-1">
            <p className="text-sm font-medium">Como foi?</p>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(FEELING_LABELS) as Feeling[]).map((feeling) => (
                <Button
                  key={feeling}
                  type="button"
                  variant="outline"
                  disabled={logWorkout.isPending}
                  onClick={() => finish(feeling)}
                  className="h-11"
                >
                  {FEELING_LABELS[feeling]}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="button" onClick={() => setAskFeeling(true)} className="h-11 flex-1 gap-2">
              <Check className="size-4" />
              Concluir treino
            </Button>
            <Button
              type="button"
              variant="ghost"
              loading={logWorkout.isPending}
              onClick={() => logWorkout.mutate({ profile, day, session: session.key, status: "skipped" })}
              className="h-11 gap-2"
            >
              <SkipForward className="size-4" />
              Pular hoje
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
