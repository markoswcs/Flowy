"use client";

import { ArrowDown, ArrowUp, Minus, Plus, RotateCcw, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { notify } from "@/providers/notification-provider";
import { cn } from "@/lib/utils";

import { EXERCISE_BY_ID, type Exercise } from "../exercises";
import { ExerciseFigure } from "../figure/exercise-figure";
import { dose, type Session } from "../plan";
import type { CustomExercise, WorkoutProfile } from "../types";
import { useSaveCustomSession } from "../use-workouts";
import { ExerciseCatalog } from "./exercise-catalog";

interface Item extends CustomExercise {
  /** Local key, so two copies of one exercise can be told apart. */
  uid: number;
}

const AMOUNT_RULES = {
  reps: { label: "Repetições", step: 1, min: 1, max: 100 },
  seconds: { label: "Segundos", step: 5, min: 5, max: 600 },
  minutes: { label: "Minutos", step: 1, min: 1, max: 180 },
} as const;

let lastUid = 0;
const withUid = (item: CustomExercise): Item => ({ ...item, uid: ++lastUid });

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function Stepper({
  label,
  value,
  suffix,
  step,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  suffix?: string;
  step: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2 sm:flex-col sm:justify-start sm:gap-1">
      <span className="text-xs font-medium text-muted-foreground sm:text-[11px]">{label}</span>
      <div className="flex items-center rounded-full border border-border/60 bg-background/60">
        <button
          type="button"
          onClick={() => onChange(clamp(value - step, min, max))}
          disabled={value <= min}
          aria-label={`Menos ${label.toLowerCase()}`}
          className="grid size-9 place-items-center rounded-full text-muted-foreground hover:text-foreground disabled:opacity-30"
        >
          <Minus className="size-3.5" />
        </button>
        <span className="min-w-10 text-center text-sm font-semibold tabular-nums" aria-live="polite">
          {value}
          {suffix}
        </span>
        <button
          type="button"
          onClick={() => onChange(clamp(value + step, min, max))}
          disabled={value >= max}
          aria-label={`Mais ${label.toLowerCase()}`}
          className="grid size-9 place-items-center rounded-full text-muted-foreground hover:text-foreground disabled:opacity-30"
        >
          <Plus className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

/**
 * Edits one workout of the plan: take exercises out, add any from the catalog,
 * change the order, the sets, the amount and the rest. The change holds for
 * every day this workout comes back.
 */
export function WorkoutEditor({
  session,
  profile,
  onClose,
}: {
  session: Session;
  profile: WorkoutProfile;
  onClose: () => void;
}) {
  const [items, setItems] = useState<Item[]>(() =>
    session.exercises.map(({ exercise, sets, amount, rest }) => withUid({ id: exercise.id, sets, amount, rest })),
  );
  const [picking, setPicking] = useState(false);
  const save = useSaveCustomSession();
  const top = useRef<HTMLElement>(null);

  // Opened from the bottom of the page: start at the title.
  useEffect(() => {
    top.current?.scrollIntoView?.({ block: "start" });
  }, []);

  const added = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of items) counts.set(item.id, (counts.get(item.id) ?? 0) + 1);
    return counts;
  }, [items]);

  function change(uid: number, changes: Partial<CustomExercise>) {
    setItems((current) => current.map((item) => (item.uid === uid ? { ...item, ...changes } : item)));
  }

  function move(index: number, by: -1 | 1) {
    setItems((current) => {
      const next = [...current];
      const [item] = next.splice(index, 1);
      next.splice(index + by, 0, item!);
      return next;
    });
  }

  function add(exercise: Exercise) {
    setItems((current) => [...current, withUid({ id: exercise.id, ...dose(exercise, profile) })]);
  }

  function submit() {
    save.mutate(
      { profile, key: session.key, exercises: items.map(({ id, sets, amount, rest }) => ({ id, sets, amount, rest })) },
      {
        onSuccess: () => {
          notify("Treino salvo");
          onClose();
        },
      },
    );
  }

  function restore() {
    save.mutate(
      { profile, key: session.key, exercises: null },
      {
        onSuccess: () => {
          notify("Treino do Flowy de volta");
          onClose();
        },
      },
    );
  }

  return (
    <section
      ref={top}
      className="scroll-mt-24 rounded-3xl border border-border/60 bg-card/50 p-4 sm:p-6"
      aria-label={`Editar ${session.name}`}
    >
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest flowy-ink">Editar treino</p>
          <h2 className="mt-1 text-xl font-semibold">{session.name}</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">Vale para todos os dias em que este treino aparece.</p>
        </div>
        <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Fechar sem salvar">
          <X className="size-5" />
        </Button>
      </header>

      {items.length ? (
        <ol className="mt-4 space-y-2">
          {items.map((item, index) => {
            const exercise = EXERCISE_BY_ID.get(item.id);
            if (!exercise) return null;
            const rule = AMOUNT_RULES[exercise.unit];
            const continuous = exercise.unit === "minutes";
            return (
              <li key={item.uid} className="rounded-2xl border border-border/50 bg-background/40 p-3">
                <div className="flex items-center gap-3">
                  <ExerciseFigure exerciseId={exercise.id} name={exercise.name} still className="w-16 shrink-0" />
                  <p className="min-w-0 flex-1 font-medium leading-snug">{exercise.name}</p>
                  <div className="flex shrink-0 items-center">
                    <button
                      type="button"
                      onClick={() => move(index, -1)}
                      disabled={index === 0}
                      aria-label={`Subir ${exercise.name}`}
                      className="grid size-9 place-items-center rounded-full text-muted-foreground hover:bg-muted/50 hover:text-foreground disabled:opacity-25"
                    >
                      <ArrowUp className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => move(index, 1)}
                      disabled={index === items.length - 1}
                      aria-label={`Descer ${exercise.name}`}
                      className="grid size-9 place-items-center rounded-full text-muted-foreground hover:bg-muted/50 hover:text-foreground disabled:opacity-25"
                    >
                      <ArrowDown className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setItems((current) => current.filter((other) => other.uid !== item.uid))}
                      aria-label={`Tirar ${exercise.name}`}
                      className="grid size-9 place-items-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
                <div className={cn("mt-3 grid gap-1.5 sm:gap-2", continuous ? "sm:grid-cols-1" : "sm:grid-cols-3")}>
                  {continuous ? null : (
                    <Stepper label="Séries" value={item.sets} step={1} min={1} max={10} onChange={(sets) => change(item.uid, { sets })} />
                  )}
                  <Stepper
                    label={rule.label}
                    value={item.amount}
                    step={rule.step}
                    min={rule.min}
                    max={rule.max}
                    onChange={(amount) => change(item.uid, { amount })}
                  />
                  {continuous ? null : (
                    <Stepper
                      label="Descanso"
                      value={item.rest}
                      suffix="s"
                      step={15}
                      min={0}
                      max={300}
                      onChange={(rest) => change(item.uid, { rest })}
                    />
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="mt-4 rounded-2xl bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
          Nenhum exercício. Adicione pelo menos um do catálogo.
        </p>
      )}

      <div className="mt-3">
        {picking ? (
          <div className="rounded-2xl border border-violet-400/30 bg-violet-500/5 p-3 animate-in fade-in slide-in-from-top-1">
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="font-semibold">Catálogo de exercícios</p>
              <Button type="button" variant="outline" size="sm" onClick={() => setPicking(false)}>
                Pronto
              </Button>
            </div>
            <ExerciseCatalog added={added} onAdd={add} />
          </div>
        ) : (
          <Button type="button" variant="outline" onClick={() => setPicking(true)} className="h-11 w-full gap-2 border-dashed">
            <Plus className="size-4" />
            Adicionar exercício
          </Button>
        )}
      </div>

      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <Button type="button" onClick={submit} loading={save.isPending} disabled={!items.length} className="h-11 flex-1">
          Salvar treino
        </Button>
        <Button type="button" variant="ghost" onClick={onClose} className="h-11">
          Cancelar
        </Button>
      </div>
      {session.custom ? (
        <button
          type="button"
          onClick={restore}
          disabled={save.isPending}
          className="mt-3 inline-flex w-full items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <RotateCcw className="size-3.5" aria-hidden="true" />
          Voltar ao treino montado pelo Flowy
        </button>
      ) : null}
    </section>
  );
}
