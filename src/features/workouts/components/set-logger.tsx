"use client";

import { Check, LineChart, Plus, Trophy, X } from "lucide-react";
import { useState } from "react";

import { notify } from "@/providers/notification-provider";
import { cn } from "@/lib/utils";

import type { PlannedExercise } from "../plan";
import { formatKg, isPersonalRecord, lastSession, suggestNext, type LoggedSet } from "../strength";
import { useDeleteSet, useSaveSet } from "../use-strength";
import { startRest } from "./rest-timer";

const UNIT_LABEL = { reps: "reps", seconds: "seg", minutes: "min" } as const;

interface Row {
  amount: string;
  weight: string;
}

const kg = (value: string) => {
  const number = Number(value.replace(",", "."));
  return value.trim() && Number.isFinite(number) && number > 0 ? Math.round(number * 100) / 100 : null;
};

function describe(sets: LoggedSet[], unit: keyof typeof UNIT_LABEL) {
  const weights = sets.map((item) => item.weight_kg).filter((value): value is number => Boolean(value));
  const amounts = sets.map((item) => item.amount);
  const same = amounts.every((value) => value === amounts[0]);
  const amountText = same ? `${sets.length} × ${amounts[0]} ${UNIT_LABEL[unit]}` : `${amounts.join(", ")} ${UNIT_LABEL[unit]}`;
  return weights.length ? `${amountText} · ${formatKg(Math.max(...weights))}` : amountText;
}

/**
 * Logs each set of an exercise on a day: reps (or time) and the extra load,
 * pre-filled from last time. A ✓ saves the set, starts the rest and checks
 * for a record.
 */
export function SetLogger({
  item,
  day,
  history,
  onHistory,
}: {
  item: PlannedExercise;
  day: string;
  history: LoggedSet[];
  onHistory: () => void;
}) {
  const { exercise } = item;
  const withLoad = exercise.unit === "reps";
  const today = history.filter((set) => set.exercise_id === exercise.id && set.day === day);
  const last = lastSession(history, exercise.id, day);
  const suggestion = withLoad ? suggestNext(last, item.amount) : null;
  const save = useSaveSet();
  const remove = useDeleteSet();

  const initialRows = () => {
    const count = Math.max(item.sets, today.length);
    return Array.from({ length: count }, (_, index): Row => {
      const done = today.find((set) => set.set_number === index + 1);
      if (done) return { amount: String(done.amount), weight: done.weight_kg ? String(done.weight_kg) : "" };
      const previous = last.find((set) => set.set_number === index + 1) ?? last[last.length - 1];
      const weight = suggestion?.weight ?? previous?.weight_kg ?? null;
      return { amount: String(item.amount), weight: weight ? String(weight) : "" };
    });
  };
  const [rows, setRows] = useState<Row[]>(initialRows);

  function update(index: number, change: Partial<Row>) {
    setRows((current) => current.map((row, position) => (position === index ? { ...row, ...change } : row)));
  }

  function log(index: number) {
    const row = rows[index]!;
    const amount = Math.round(Number(row.amount));
    if (!Number.isFinite(amount) || amount <= 0) return;
    const set: LoggedSet = {
      day,
      exercise_id: exercise.id,
      set_number: index + 1,
      amount: Math.min(999, amount),
      weight_kg: withLoad ? kg(row.weight) : null,
    };
    const before = history.filter((past) => past.exercise_id === exercise.id && past.day < day);
    const earlierToday = today.filter((past) => past.set_number !== set.set_number);
    const record = isPersonalRecord(set, [...before, ...earlierToday]) && isPersonalRecord(set, before);
    save.mutate(set, {
      onSuccess: () => {
        if (record) {
          notify(
            set.weight_kg
              ? `Novo recorde em ${exercise.name}: ${formatKg(set.weight_kg)} × ${set.amount}`
              : `Novo recorde em ${exercise.name}: ${set.amount} ${UNIT_LABEL[exercise.unit]}`,
          );
        }
      },
    });
    if (index < rows.length - 1 || item.rest) startRest(item.rest, exercise.name);
  }

  return (
    <div className="mt-3 space-y-2 sm:pl-11">
      {last.length ? (
        <p className="text-xs text-muted-foreground">
          Última vez: <span className="font-medium text-foreground">{describe(last, exercise.unit)}</span>
        </p>
      ) : null}
      {suggestion ? <p className="rounded-xl bg-primary/10 px-3 py-2 text-xs flowy-ink">{suggestion.reason}</p> : null}

      <ul className="space-y-1.5">
        {rows.map((row, index) => {
          const done = today.find((set) => set.set_number === index + 1);
          return (
            <li key={index} className="flex items-center gap-2">
              <span className="w-6 shrink-0 text-center text-xs font-semibold tabular-nums text-muted-foreground">{index + 1}</span>
              <label className="flex min-w-0 flex-1 items-center gap-1 rounded-xl border border-border/60 bg-background/60 px-2.5">
                <input
                  inputMode="numeric"
                  value={row.amount}
                  onChange={(event) => update(index, { amount: event.target.value.replace(/[^\d]/g, "").slice(0, 3) })}
                  aria-label={`Série ${index + 1}: ${UNIT_LABEL[exercise.unit]}`}
                  className="h-10 w-full min-w-0 bg-transparent text-center text-base font-semibold tabular-nums outline-none"
                />
                <span className="shrink-0 text-xs text-muted-foreground">{UNIT_LABEL[exercise.unit]}</span>
              </label>
              {withLoad ? (
                <label className="flex min-w-0 flex-1 items-center gap-1 rounded-xl border border-border/60 bg-background/60 px-2.5">
                  <input
                    inputMode="decimal"
                    value={row.weight}
                    placeholder="corpo"
                    onChange={(event) => update(index, { weight: event.target.value.replace(/[^\d.,]/g, "").slice(0, 6) })}
                    aria-label={`Série ${index + 1}: peso em kg`}
                    className="h-10 w-full min-w-0 bg-transparent text-center text-base font-semibold tabular-nums outline-none placeholder:text-xs placeholder:font-normal placeholder:text-muted-foreground"
                  />
                  <span className="shrink-0 text-xs text-muted-foreground">kg</span>
                </label>
              ) : null}
              <button
                type="button"
                onClick={() => log(index)}
                aria-label={done ? `Série ${index + 1} feita: salvar de novo` : `Marcar série ${index + 1} como feita`}
                aria-pressed={Boolean(done)}
                data-no-glow
                className={cn(
                  "grid size-10 shrink-0 place-items-center rounded-xl border transition-colors active:scale-95",
                  done ? "border-emerald-500/60 bg-emerald-500/20 text-emerald-400" : "border-border/60 text-muted-foreground hover:text-foreground",
                )}
              >
                <Check className="size-4" />
              </button>
              {done ? (
                <button
                  type="button"
                  onClick={() => remove.mutate(done)}
                  aria-label={`Apagar série ${index + 1}`}
                  className="grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              ) : (
                <span className="w-8 shrink-0" aria-hidden="true" />
              )}
            </li>
          );
        })}
      </ul>

      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => setRows((current) => [...current, { ...(current[current.length - 1] ?? { amount: String(item.amount), weight: "" }) }])}
          className="inline-flex items-center gap-1 rounded-full border border-border/60 px-3 py-1 text-xs font-medium text-muted-foreground hover:bg-muted/40 hover:text-foreground"
        >
          <Plus className="size-3.5" aria-hidden="true" />
          Série
        </button>
        <button
          type="button"
          onClick={onHistory}
          className="inline-flex items-center gap-1 rounded-full border border-border/60 px-3 py-1 text-xs font-medium text-muted-foreground hover:bg-muted/40 hover:text-foreground"
        >
          <LineChart className="size-3.5" aria-hidden="true" />
          Histórico
        </button>
        {today.some((set) => isPersonalRecord(set, history.filter((past) => past.exercise_id === exercise.id && past.day < day))) ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-300">
            <Trophy className="size-3.5" aria-hidden="true" />
            Recorde hoje
          </span>
        ) : null}
      </div>
    </div>
  );
}
