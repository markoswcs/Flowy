"use client";

import { Check, Disc3, LineChart, Plus, Trophy } from "lucide-react";
import { Fragment, useState } from "react";

import { FeatureTip } from "@/components/feature-tip";
import { notify } from "@/providers/notification-provider";
import { cn } from "@/lib/utils";

import type { PlannedExercise } from "../plan";
import {
  formatKg,
  isPersonalRecord,
  lastSession,
  suggestNext,
  type LoggedSet,
} from "../strength";
import { useDeleteSet, useSaveSet } from "../use-strength";
import {
  RIR_LEVELS,
  SET_KINDS,
  rirColor,
  working,
  type SetKind,
} from "../training";
import { PlateCalculator } from "./plate-calculator";
import { startRest } from "./rest-timer";

const UNIT_LABEL = { reps: "reps", seconds: "seg", minutes: "min" } as const;

/** The first set's number carries the bubble about set types and effort. */
function NumberTip({
  first,
  children,
}: {
  first: boolean;
  children: React.ReactNode;
}) {
  if (!first) return <>{children}</>;
  return (
    <FeatureTip
      id="treinos-serie"
      title="Toque no número da série"
      text="Marque aquecimento, drop set ou até a falha, e quantas repetições ainda daria para fazer."
      side="bottom"
      align="start"
    >
      {children}
    </FeatureTip>
  );
}

interface Row {
  amount: string;
  weight: string;
  kind: SetKind;
  rir: number | null;
}

const kg = (value: string) => {
  const number = Number(value.replace(",", "."));
  return value.trim() && Number.isFinite(number) && number > 0
    ? Math.round(number * 100) / 100
    : null;
};

function describe(sets: LoggedSet[], unit: keyof typeof UNIT_LABEL) {
  const weights = sets
    .map((item) => item.weight_kg)
    .filter((value): value is number => Boolean(value));
  const amounts = sets.map((item) => item.amount);
  const same = amounts.every((value) => value === amounts[0]);
  const amountText = same
    ? `${sets.length} × ${amounts[0]} ${UNIT_LABEL[unit]}`
    : `${amounts.join(", ")} ${UNIT_LABEL[unit]}`;
  return weights.length
    ? `${amountText} · ${formatKg(Math.max(...weights))}`
    : amountText;
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
  const today = history.filter(
    (set) => set.exercise_id === exercise.id && set.day === day,
  );
  const last = lastSession(history, exercise.id, day);
  const suggestion = withLoad ? suggestNext(last, item.amount) : null;
  const save = useSaveSet();
  const remove = useDeleteSet();

  const initialRows = () => {
    const count = Math.max(item.sets, today.length);
    return Array.from({ length: count }, (_, index): Row => {
      const done = today.find((set) => set.set_number === index + 1);
      if (done) {
        return {
          amount: String(done.amount),
          weight: done.weight_kg ? String(done.weight_kg) : "",
          kind: done.kind ?? "normal",
          rir: done.rir ?? null,
        };
      }
      const previous =
        last.find((set) => set.set_number === index + 1) ??
        last[last.length - 1];
      const weight = suggestion?.weight ?? previous?.weight_kg ?? null;
      return {
        amount: String(item.amount),
        weight: weight ? String(weight) : "",
        kind: "normal",
        rir: null,
      };
    });
  };
  const [rows, setRows] = useState<Row[]>(initialRows);
  const [menu, setMenu] = useState<number | null>(null);
  const [plates, setPlates] = useState(false);

  function update(index: number, change: Partial<Row>) {
    setRows((current) =>
      current.map((row, position) =>
        position === index ? { ...row, ...change } : row,
      ),
    );
  }

  function log(index: number, override?: Partial<Row>) {
    const row = { ...rows[index]!, ...override };
    const amount = Math.round(Number(row.amount));
    if (!Number.isFinite(amount) || amount <= 0) return;
    const set: LoggedSet = {
      day,
      exercise_id: exercise.id,
      set_number: index + 1,
      amount: Math.min(999, amount),
      weight_kg: withLoad ? kg(row.weight) : null,
      kind: row.kind,
      rir: row.rir,
    };
    const before = working(
      history.filter(
        (past) => past.exercise_id === exercise.id && past.day < day,
      ),
    );
    const earlierToday = working(
      today.filter((past) => past.set_number !== set.set_number),
    );
    const record =
      set.kind !== "warmup" &&
      isPersonalRecord(set, [...before, ...earlierToday]) &&
      isPersonalRecord(set, before);
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
    // Re-saving a set's type or effort starts no rest; in a superset the next
    // exercise comes straight away and the rest follows the pair.
    if (override || item.superset) return;
    if (index < rows.length - 1 || item.rest)
      startRest(item.rest, exercise.name);
  }

  /** Changing the type or the effort of a set already done saves it again. */
  function setDetail(
    index: number,
    change: Partial<Pick<Row, "kind" | "rir">>,
  ) {
    update(index, change);
    if (today.some((set) => set.set_number === index + 1)) log(index, change);
  }

  return (
    <div className="mt-3 space-y-2 sm:pl-11">
      {last.length ? (
        <p className="text-xs text-muted-foreground">
          Última vez:{" "}
          <span className="font-medium text-foreground">
            {describe(last, exercise.unit)}
          </span>
        </p>
      ) : null}
      {suggestion ? (
        <p className="rounded-xl bg-primary/10 px-3 py-2 text-xs flowy-ink">
          {suggestion.reason}
        </p>
      ) : null}

      <div className="grid grid-cols-[1.25rem_minmax(0,1fr)_minmax(0,1fr)_2.75rem] items-center gap-x-2 gap-y-1.5">
        <span className="text-[11px] text-muted-foreground">#</span>
        <span className="text-center text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {UNIT_LABEL[exercise.unit]}
        </span>
        <span className="text-center text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {withLoad ? "kg" : ""}
        </span>
        <span aria-hidden="true" />
        {rows.map((row, index) => {
          const done = today.find((set) => set.set_number === index + 1);
          const field =
            "h-11 w-full min-w-0 appearance-none rounded-xl border-0 bg-muted/40 text-center text-base font-semibold tabular-nums outline-none ring-1 ring-inset ring-border/50 transition focus:ring-2 focus:ring-violet-400/60";
          return (
            <Fragment key={index}>
              <NumberTip first={index === 0}>
                <button
                  type="button"
                  onClick={() => setMenu(menu === index ? null : index)}
                  aria-expanded={menu === index}
                  aria-label={`Série ${index + 1}: tipo e esforço`}
                  data-no-glow
                  className={cn(
                    "flex h-11 flex-col items-center justify-center rounded-lg text-xs font-semibold tabular-nums transition-colors hover:bg-muted/50",
                    row.kind === "warmup"
                      ? "text-sky-300"
                      : row.kind === "drop"
                        ? "text-fuchsia-300"
                        : row.kind === "failure"
                          ? "text-red-400"
                          : "text-muted-foreground",
                    menu === index && "bg-muted/60",
                  )}
                >
                  {SET_KINDS.find((entry) => entry.kind === row.kind)?.short ||
                    index + 1}
                  {row.rir !== null ? (
                    <span
                      className={cn(
                        "text-[9px] leading-none",
                        rirColor(row.rir),
                      )}
                    >
                      R{row.rir}
                    </span>
                  ) : null}
                </button>
              </NumberTip>
              <input
                inputMode="numeric"
                value={row.amount}
                onChange={(event) =>
                  update(index, {
                    amount: event.target.value
                      .replace(/[^\d]/g, "")
                      .slice(0, 3),
                  })
                }
                aria-label={`Série ${index + 1}: ${UNIT_LABEL[exercise.unit]}`}
                className={cn(
                  field,
                  done && "bg-emerald-500/10 ring-emerald-500/30",
                )}
              />
              {withLoad ? (
                <input
                  inputMode="decimal"
                  value={row.weight}
                  placeholder="—"
                  onChange={(event) =>
                    update(index, {
                      weight: event.target.value
                        .replace(/[^\d.,]/g, "")
                        .slice(0, 6),
                    })
                  }
                  aria-label={`Série ${index + 1}: peso em kg (vazio = peso do corpo)`}
                  className={cn(
                    field,
                    "placeholder:font-normal placeholder:text-muted-foreground",
                    done && "bg-emerald-500/10 ring-emerald-500/30",
                  )}
                />
              ) : (
                <span aria-hidden="true" />
              )}
              <button
                type="button"
                onClick={() => (done ? remove.mutate(done) : log(index))}
                aria-label={
                  done
                    ? `Série ${index + 1} feita: desmarcar`
                    : `Marcar série ${index + 1} como feita`
                }
                aria-pressed={Boolean(done)}
                data-no-glow
                className={cn(
                  "grid size-11 place-items-center rounded-xl transition-colors active:scale-95",
                  done
                    ? "bg-emerald-500 text-white"
                    : "bg-muted/40 text-muted-foreground ring-1 ring-inset ring-border/50 hover:text-foreground",
                )}
              >
                <Check className="size-4" strokeWidth={done ? 3 : 2} />
              </button>
              {menu === index ? (
                <div className="col-span-4 space-y-2 rounded-2xl bg-muted/30 p-2.5 animate-in fade-in slide-in-from-top-1">
                  <div
                    className="flex flex-wrap gap-1.5"
                    role="group"
                    aria-label="Tipo da série"
                  >
                    {SET_KINDS.map((entry) => (
                      <button
                        key={entry.kind}
                        type="button"
                        aria-pressed={row.kind === entry.kind}
                        onClick={() => setDetail(index, { kind: entry.kind })}
                        className={cn(
                          "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                          row.kind === entry.kind
                            ? "bg-primary text-primary-foreground"
                            : "bg-background/60 text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {entry.label}
                      </button>
                    ))}
                  </div>
                  {withLoad ? (
                    <div>
                      <p className="mb-1 text-[11px] text-muted-foreground">
                        Quantas ainda daria para fazer? (opcional)
                      </p>
                      <div
                        className="flex flex-wrap gap-1.5"
                        role="group"
                        aria-label="Repetições na reserva"
                      >
                        {RIR_LEVELS.map((level) => (
                          <button
                            key={level.value}
                            type="button"
                            title={level.label}
                            aria-pressed={row.rir === level.value}
                            onClick={() =>
                              setDetail(index, {
                                rir:
                                  row.rir === level.value ? null : level.value,
                              })
                            }
                            className={cn(
                              "min-w-9 rounded-full px-2.5 py-1.5 text-xs font-semibold tabular-nums transition-colors",
                              row.rir === level.value
                                ? "bg-primary text-primary-foreground"
                                : cn("bg-background/60", rirColor(level.value)),
                            )}
                          >
                            {level.value === 5 ? "5+" : level.value}
                          </button>
                        ))}
                      </div>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {row.rir !== null
                          ? RIR_LEVELS.find((level) => level.value === row.rir)
                              ?.label
                          : "0 = até a falha, 2 = sobravam duas."}
                      </p>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </Fragment>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() =>
            setRows((current) => {
              const previous = current[current.length - 1];
              return [
                ...current,
                {
                  amount: previous?.amount ?? String(item.amount),
                  weight: previous?.weight ?? "",
                  kind: "normal",
                  rir: null,
                },
              ];
            })
          }
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
        {withLoad ? (
          <FeatureTip
            id="treinos-anilhas"
            title="Calculadora de anilhas"
            text="Mostra quais anilhas colocar de cada lado da barra para chegar no peso."
            align="end"
          >
            <button
              type="button"
              onClick={() => setPlates(true)}
              className="inline-flex items-center gap-1 rounded-full border border-border/60 px-3 py-1 text-xs font-medium text-muted-foreground hover:bg-muted/40 hover:text-foreground"
            >
              <Disc3 className="size-3.5" aria-hidden="true" />
              Anilhas
            </button>
          </FeatureTip>
        ) : null}
        {working(today).some((set) =>
          isPersonalRecord(
            set,
            working(
              history.filter(
                (past) => past.exercise_id === exercise.id && past.day < day,
              ),
            ),
          ),
        ) ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-300">
            <Trophy className="size-3.5" aria-hidden="true" />
            Recorde hoje
          </span>
        ) : null}
      </div>
      {plates ? (
        <PlateCalculator
          initial={
            kg(
              rows.find(
                (_, index) =>
                  !today.some((set) => set.set_number === index + 1),
              )?.weight ??
                rows[0]?.weight ??
                "",
            ) ?? 20
          }
          onClose={() => setPlates(false)}
        />
      ) : null}
    </div>
  );
}
