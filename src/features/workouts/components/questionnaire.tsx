"use client";

import { Dumbbell } from "lucide-react";
import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { RecurrenceDaysPicker } from "@/features/tasks/components/recurrence-days-picker";
import { cn } from "@/lib/utils";

import { useSaveWorkoutProfile } from "../use-workouts";
import {
  GOAL_LABELS,
  LEVEL_LABELS,
  LIMITATION_LABELS,
  PLACE_LABELS,
  type Limitation,
  type WorkoutGoal,
  type WorkoutLevel,
  type WorkoutPlace,
  type WorkoutProfileInput,
} from "../types";

const MINUTES = [20, 30, 45, 60];

function Choice<T extends string | number>({
  value,
  selected,
  onSelect,
  children,
}: {
  value: T;
  selected: boolean;
  onSelect: (value: T) => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      aria-pressed={selected}
      className={cn(
        "rounded-2xl border px-3.5 py-2.5 text-sm font-medium transition-all active:scale-95",
        selected
          ? "border-transparent bg-violet-500 text-white shadow-[0_6px_16px_-6px_rgb(124_58_237/0.8)]"
          : "border-border/60 text-muted-foreground hover:bg-muted/40 hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function Question({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <fieldset className="space-y-2.5">
      <legend className="text-sm font-semibold">{title}</legend>
      {hint ? <p className="-mt-1 text-xs text-muted-foreground">{hint}</p> : null}
      <div className="flex flex-wrap gap-2">{children}</div>
    </fieldset>
  );
}

/**
 * The questions the plan is built from. Answering again (from "Refazer
 * perfil") reshapes the plan but keeps the progress already made.
 */
export function WorkoutQuestionnaire({
  initial,
  onSaved,
  onCancel,
}: {
  initial?: WorkoutProfileInput;
  onSaved?: () => void;
  onCancel?: () => void;
}) {
  const save = useSaveWorkoutProfile();
  const [goal, setGoal] = useState<WorkoutGoal>(initial?.goal ?? "health");
  const [level, setLevel] = useState<WorkoutLevel>(initial?.level ?? "beginner");
  const [place, setPlace] = useState<WorkoutPlace>(initial?.place ?? "home");
  const [days, setDays] = useState<number[]>(initial?.days ?? [1, 3, 5]);
  const [minutes, setMinutes] = useState(initial?.minutes ?? 30);
  const [limitations, setLimitations] = useState<Limitation[]>(initial?.limitations ?? []);

  function toggleLimitation(value: Limitation) {
    setLimitations((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value],
    );
  }

  function submit() {
    save.mutate({ goal, level, place, days, minutes, limitations }, { onSuccess: () => onSaved?.() });
  }

  return (
    <section className="mx-auto max-w-2xl space-y-6 rounded-3xl border border-border/60 bg-card/50 p-5 sm:p-7">
      <header className="flex items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl flowy-active">
          <Dumbbell className="size-5" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-lg font-semibold">{initial ? "Ajustar seu plano" : "Vamos montar seu treino"}</h2>
          <p className="text-sm text-muted-foreground">
            Seis perguntas rápidas. O plano se adapta às respostas e a como você se sente depois de cada treino.
          </p>
        </div>
      </header>

      <Question title="Qual é o seu objetivo?">
        {(Object.keys(GOAL_LABELS) as WorkoutGoal[]).map((value) => (
          <Choice key={value} value={value} selected={goal === value} onSelect={setGoal}>
            {GOAL_LABELS[value]}
          </Choice>
        ))}
      </Question>

      <Question title="Como você está hoje?" hint="Na dúvida, escolha Iniciante: o plano sobe junto com você.">
        {(Object.keys(LEVEL_LABELS) as WorkoutLevel[]).map((value) => (
          <Choice key={value} value={value} selected={level === value} onSelect={setLevel}>
            {LEVEL_LABELS[value]}
          </Choice>
        ))}
      </Question>

      <Question title="Onde você vai treinar?">
        {(Object.keys(PLACE_LABELS) as WorkoutPlace[]).map((value) => (
          <Choice key={value} value={value} selected={place === value} onSelect={setPlace}>
            {PLACE_LABELS[value]}
          </Choice>
        ))}
      </Question>

      <fieldset className="space-y-2.5">
        <legend className="text-sm font-semibold">Em quais dias?</legend>
        <RecurrenceDaysPicker value={days} onChange={setDays} />
      </fieldset>

      <Question title="Quanto tempo por treino?">
        {MINUTES.map((value) => (
          <Choice key={value} value={value} selected={minutes === value} onSelect={setMinutes}>
            {value} min
          </Choice>
        ))}
      </Question>

      <Question title="Sente dor ou tem alguma limitação?" hint="Os exercícios que forçam essas partes ficam de fora.">
        <Choice value="none" selected={limitations.length === 0} onSelect={() => setLimitations([])}>
          Nenhuma
        </Choice>
        {(Object.keys(LIMITATION_LABELS) as Limitation[]).map((value) => (
          <Choice key={value} value={value} selected={limitations.includes(value)} onSelect={toggleLimitation}>
            {LIMITATION_LABELS[value]}
          </Choice>
        ))}
      </Question>

      <p className="rounded-2xl bg-muted/40 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
        O Flowy sugere treinos gerais e não substitui um profissional de educação física. Em caso de dor, pare e
        procure orientação.
      </p>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {onCancel ? (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
        ) : null}
        <Button type="button" onClick={submit} loading={save.isPending} className="h-11">
          {initial ? "Atualizar plano" : "Montar meu plano"}
        </Button>
      </div>
    </section>
  );
}
