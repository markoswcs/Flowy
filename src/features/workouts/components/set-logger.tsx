"use client";

import { Check, LineChart, Plus, Trophy } from "lucide-react";
import { Fragment, useState } from "react";

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

      <div className="grid grid-cols-[1.25rem_minmax(0,1fr)_minmax(0,1fr)_2.75rem] items-center gap-x-2 gap-y-1.5">
        <span className="text-[11px] text-muted-foreground">#</span>
        <span className="text-center text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{UNIT_LABEL[exercise.unit]}</span>
        <span className="text-center text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{withLoad ? "kg" : ""}</span>
        <span aria-hidden="true" />
        {rows.map((row, index) => {
          const done = today.find((set) => set.set_number === index + 1);
          const field =
            "h-11 w-full min-w-0 appearance-none rounded-xl border-0 bg-muted/40 text-center text-base font-semibold tabular-nums outline-none ring-1 ring-inset ring-border/50 transition focus:ring-2 focus:ring-violet-400/60";
          return (
            <Fragment key={index}>
              <span className="text-center text-xs font-semibold tabular-nums text-muted-foreground">{index + 1}</span>
              <input
                inputMode="numeric"
                value={row.amount}
                onChange={(event) => update(index, { amount: event.target.value.replace(/[^\d]/g, "").slice(0, 3) })}
                aria-label={`Série ${index + 1}: ${UNIT_LABEL[exercise.unit]}`}
                className={cn(field, done && "bg-emerald-500/10 ring-emerald-500/30")}
              />
              {withLoad ? (
                <input
                  inputMode="decimal"
                  value={row.weight}
                  placeholder="—"
                  onChange={(event) => update(index, { weight: event.target.value.replace(/[^\d.,]/g, "").slice(0, 6) })}
                  aria-label={`Série ${index + 1}: peso em kg (vazio = peso do corpo)`}
                  className={cn(field, "placeholder:font-normal placeholder:text-muted-foreground", done && "bg-emerald-500/10 ring-emerald-500/30")}
                />
              ) : (
                <span aria-hidden="true" />
              )}
              <button
                type="button"
                onClick={() => (done ? remove.mutate(done) : log(index))}
                aria-label={done ? `Série ${index + 1} feita: desmarcar` : `Marcar série ${index + 1} como feita`}
                aria-pressed={Boolean(done)}
                data-no-glow
                className={cn(
                  "grid size-11 place-items-center rounded-xl transition-colors active:scale-95",
                  done ? "bg-emerald-500 text-white" : "bg-muted/40 text-muted-foreground ring-1 ring-inset ring-border/50 hover:text-foreground",
                )}
              >
                <Check className="size-4" strokeWidth={done ? 3 : 2} />
              </button>
            </Fragment>
          );
        })}
      </div>

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
