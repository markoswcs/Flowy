"use client";

import { Scale, Target } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { localDateKey } from "@/features/tasks/date-utils";

import { formatKg, weeklyRate, type BodyWeight } from "../strength";
import type { WorkoutProfile } from "../types";
import { useBodyWeights, useSaveBodyWeight, useSaveWeightGoal } from "../use-strength";
import { ProgressChart } from "./progress-chart";

const parseKg = (value: string) => {
  const number = Number(value.replace(",", "."));
  return value.trim() && Number.isFinite(number) && number >= 20 && number <= 400 ? Math.round(number * 10) / 10 : null;
};

function last90(entries: BodyWeight[], today: string) {
  const start = new Date(`${today}T12:00:00`);
  start.setDate(start.getDate() - 90);
  const from = localDateKey(start);
  return entries.filter((entry) => entry.day >= from);
}

/** Body weight: today's weigh-in, the 90-day chart against a goal, and the weekly pace. */
export function BodyWeightCard({ profile }: { profile: WorkoutProfile }) {
  const today = localDateKey();
  const weights = useBodyWeights();
  const save = useSaveBodyWeight();
  const saveGoal = useSaveWeightGoal();
  const entries = weights.data ?? [];
  const latest = entries[entries.length - 1];
  const [value, setValue] = useState("");
  const [goalDraft, setGoalDraft] = useState<string | null>(null);
  const goal = profile.body_weight_goal ? Number(profile.body_weight_goal) : null;
  const recent = last90(entries, today);
  const rate = weeklyRate(recent.slice(-8));
  const toGoal = goal && latest ? Math.round((latest.weight_kg - goal) * 10) / 10 : null;
  const weight = parseKg(value);

  function submit() {
    if (!weight) return;
    save.mutate({ day: today, weight_kg: weight }, { onSuccess: () => setValue("") });
  }

  return (
    <section className="rounded-3xl border border-border/60 bg-card/50 p-4 sm:p-6" aria-labelledby="body-weight-title">
      <h2 id="body-weight-title" className="flex items-center gap-2 text-base font-semibold">
        <Scale className="size-5 flowy-ink" aria-hidden="true" />
        Peso corporal
      </h2>

      <div className="mt-3 flex flex-wrap items-end gap-x-6 gap-y-2">
        <div>
          <p className="text-3xl font-bold tabular-nums">{latest ? formatKg(latest.weight_kg) : "—"}</p>
          <p className="text-xs text-muted-foreground">
            {latest ? (latest.day === today ? "hoje" : `em ${latest.day.slice(8)}/${latest.day.slice(5, 7)}`) : "Nenhuma pesagem ainda"}
          </p>
        </div>
        {rate !== null ? (
          <p className="text-sm">
            <span className={rate < 0 ? "text-emerald-400" : rate > 0 ? "text-amber-300" : "text-muted-foreground"}>
              {rate > 0 ? "+" : ""}
              {rate.toLocaleString("pt-BR")} kg
            </span>{" "}
            <span className="text-muted-foreground">por semana</span>
          </p>
        ) : null}
        {toGoal !== null ? (
          <p className="text-sm text-muted-foreground">
            {toGoal === 0 ? "Na meta!" : `Faltam ${formatKg(Math.abs(toGoal))} para a meta`}
          </p>
        ) : null}
      </div>

      <form
        className="mt-3 flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <label className="flex min-w-0 flex-1 items-center gap-1 rounded-xl border border-border/60 bg-background/60 px-3">
          <input
            inputMode="decimal"
            value={value}
            onChange={(event) => setValue(event.target.value.replace(/[^\d.,]/g, "").slice(0, 5))}
            placeholder="Peso de hoje"
            aria-label="Peso de hoje em kg"
            className="h-11 w-full min-w-0 bg-transparent text-base tabular-nums outline-none"
          />
          <span className="text-sm text-muted-foreground">kg</span>
        </label>
        <Button type="submit" className="h-11" disabled={!weight} loading={save.isPending}>
          Salvar
        </Button>
      </form>

      <div className="mt-4">
        <ProgressChart points={recent.map((entry) => ({ day: entry.day, value: entry.weight_kg }))} unit="kg" goal={goal} />
      </div>

      {goalDraft === null ? (
        <button
          type="button"
          onClick={() => setGoalDraft(goal ? String(goal) : "")}
          className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <Target className="size-4" aria-hidden="true" />
          {goal ? `Meta: ${formatKg(goal)} · mudar` : "Definir uma meta"}
        </button>
      ) : (
        <form
          className="mt-2 flex flex-wrap items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            const next = goalDraft.trim() ? parseKg(goalDraft) : null;
            if (goalDraft.trim() && !next) return;
            saveGoal.mutate(next, { onSuccess: () => setGoalDraft(null) });
          }}
        >
          <label className="flex items-center gap-1 rounded-xl border border-border/60 bg-background/60 px-3">
            <input
              inputMode="decimal"
              autoFocus
              value={goalDraft}
              onChange={(event) => setGoalDraft(event.target.value.replace(/[^\d.,]/g, "").slice(0, 5))}
              placeholder="Meta"
              aria-label="Meta de peso em kg"
              className="h-10 w-20 bg-transparent text-base tabular-nums outline-none"
            />
            <span className="text-sm text-muted-foreground">kg</span>
          </label>
          <Button type="submit" size="sm" loading={saveGoal.isPending}>
            Salvar meta
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setGoalDraft(null)}>
            Cancelar
          </Button>
        </form>
      )}
    </section>
  );
}
