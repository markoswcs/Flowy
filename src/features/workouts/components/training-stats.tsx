"use client";

import { Download, Trophy, Upload } from "lucide-react";
import { useMemo, useRef, useState } from "react";

import { FeatureTip } from "@/components/feature-tip";
import { Button } from "@/components/ui/button";
import { localDateKey } from "@/features/tasks/date-utils";
import { notify } from "@/providers/notification-provider";
import { cn } from "@/lib/utils";

import { EXERCISES, EXERCISE_BY_ID } from "../exercises";
import { formatKg, type LoggedSet } from "../strength";
import { bestLifts, matchExercise, readWorkoutCsv, setsToCsv, totalLifted, working, yearWeeks } from "../training";
import type { WorkoutLog } from "../types";
import { useBodyWeights, useImportSets } from "../use-strength";

const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

function bigNumber(kg: number) {
  if (kg >= 1000) return `${(kg / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} t`;
  return `${kg.toLocaleString("pt-BR")} kg`;
}

/** A year of training in squares: brighter on days with more sets. */
function YearHeatmap({ history, logs, today }: { history: LoggedSet[]; logs: WorkoutLog[]; today: string }) {
  const weeks = useMemo(() => yearWeeks(today), [today]);
  const perDay = useMemo(() => {
    const map = new Map<string, number>();
    for (const set of working(history)) map.set(set.day, (map.get(set.day) ?? 0) + 1);
    for (const log of logs) if (log.status === "done" && !map.has(log.day)) map.set(log.day, 6);
    return map;
  }, [history, logs]);
  const trainedDays = weeks.flat().filter((day) => day && perDay.has(day)).length;

  return (
    <div>
      <p className="text-sm">
        <strong>{trainedDays}</strong> <span className="text-muted-foreground">dias de treino no último ano</span>
      </p>
      <div className="mt-2 overflow-x-auto pb-1" dir="rtl">
        <div className="flex w-max gap-[3px]" dir="ltr" role="img" aria-label={`${trainedDays} dias de treino no último ano`}>
          {weeks.map((week, index) => {
            const first = week[0];
            const showMonth = first && Number(first.slice(8)) <= 7;
            return (
              <div key={index} className="flex flex-col gap-[3px]">
                <span className="h-3 text-[9px] leading-3 text-muted-foreground">{showMonth ? MONTHS[Number(first.slice(5, 7)) - 1] : ""}</span>
                {week.map((day, weekday) => {
                  const count = day ? (perDay.get(day) ?? 0) : 0;
                  return (
                    <span
                      key={weekday}
                      title={day ? `${day.slice(8)}/${day.slice(5, 7)}: ${count ? `${count} séries` : "sem treino"}` : undefined}
                      className={cn(
                        "size-[11px] rounded-[3px]",
                        !day
                          ? "bg-transparent"
                          : count === 0
                            ? "bg-muted/40"
                            : count < 6
                              ? "bg-violet-500/35"
                              : count < 14
                                ? "bg-violet-500/65"
                                : "bg-violet-400",
                        day === today && "ring-1 ring-foreground/60",
                      )}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** Imports a CSV from Strong, Hevy or the Flowy: shows what matched before saving. */
function ImportButton({ history }: { history: LoggedSet[] }) {
  const input = useRef<HTMLInputElement>(null);
  const importSets = useImportSets();
  const [preview, setPreview] = useState<{ sets: LoggedSet[]; unknown: string[]; skipped: number } | null>(null);

  async function read(file: File) {
    const rows = readWorkoutCsv(await file.text());
    const unknown = new Set<string>();
    const taken = new Set(history.map((set) => `${set.day}|${set.exercise_id}|${set.set_number}`));
    const numbering = new Map<string, number>();
    const sets: LoggedSet[] = [];
    let skipped = 0;
    for (const row of rows) {
      const id = matchExercise(row.name, EXERCISES);
      if (!id) {
        unknown.add(row.name);
        continue;
      }
      // Two imported names can land on the same exercise: number its sets in order.
      const key = `${row.day}|${id}`;
      const number = (numbering.get(key) ?? 0) + 1;
      numbering.set(key, number);
      if (taken.has(`${key}|${number}`)) {
        skipped += 1;
        continue;
      }
      sets.push({ day: row.day, exercise_id: id, set_number: number, amount: row.amount, weight_kg: row.weight_kg, kind: row.kind, rir: row.rir });
    }
    setPreview({ sets, unknown: [...unknown], skipped });
  }

  return (
    <>
      <input
        ref={input}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void read(file);
          event.target.value = "";
        }}
      />
      <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => input.current?.click()}>
        <Upload className="size-3.5" />
        Importar
      </Button>
      {preview ? (
        <div className="basis-full space-y-2 rounded-2xl bg-muted/30 p-3 text-sm animate-in fade-in">
          {preview.sets.length ? (
            <p>
              <strong>{preview.sets.length}</strong> séries prontas para entrar
              {preview.skipped ? ` (${preview.skipped} já estavam no Flowy)` : ""}.
            </p>
          ) : (
            <p>Nada novo para importar neste arquivo.</p>
          )}
          {preview.unknown.length ? (
            <p className="text-xs text-muted-foreground">
              Ficam de fora, sem exercício parecido no Flowy: {preview.unknown.slice(0, 8).join(", ")}
              {preview.unknown.length > 8 ? ` e mais ${preview.unknown.length - 8}` : ""}.
            </p>
          ) : null}
          <div className="flex gap-2">
            {preview.sets.length ? (
              <Button
                type="button"
                size="sm"
                loading={importSets.isPending}
                onClick={() =>
                  importSets.mutate(preview.sets, {
                    onSuccess: () => {
                      notify(`${preview.sets.length} séries importadas`);
                      setPreview(null);
                    },
                  })
                }
              >
                Importar séries
              </Button>
            ) : null}
            <Button type="button" size="sm" variant="ghost" onClick={() => setPreview(null)}>
              Cancelar
            </Button>
          </div>
        </div>
      ) : null}
    </>
  );
}

/** Progress over time: the year in squares, everything lifted, best lifts and import/export. */
export function TrainingStats({ history, logs }: { history: LoggedSet[]; logs: WorkoutLog[] }) {
  const today = localDateKey();
  const weights = useBodyWeights();
  const body = weights.data?.[weights.data.length - 1]?.weight_kg ?? null;
  const total = totalLifted(history);
  const best = [...bestLifts(history)]
    .map(([id, value]) => ({ exercise: EXERCISE_BY_ID.get(id), ...value }))
    .filter((entry) => entry.exercise)
    .sort((a, b) => b.oneRepMax - a.oneRepMax)
    .slice(0, 5);

  function exportCsv() {
    const csv = setsToCsv(history, (id) => EXERCISE_BY_ID.get(id)?.name ?? id);
    const url = URL.createObjectURL(new Blob(["﻿", csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `flowy-treinos-${today}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="space-y-4 rounded-3xl border border-border/60 bg-card/50 p-4 sm:p-6" aria-labelledby="training-stats-title">
      <FeatureTip
        id="treinos-progresso"
        title="Seu progresso"
        text="O ano de treinos em quadradinhos, tudo o que já levantou, suas melhores cargas e importar do Strong ou Hevy."
        side="bottom"
        align="start"
        className="w-fit"
      >
        <h2 id="training-stats-title" className="flex items-center gap-2 text-base font-semibold">
          <Trophy className="size-5 flowy-ink" aria-hidden="true" />
          Seu progresso
        </h2>
      </FeatureTip>

      <YearHeatmap history={history} logs={logs} today={today} />

      {total ? (
        <p className="rounded-2xl bg-violet-500/10 px-4 py-3 text-sm">
          Você já levantou <strong className="text-base">{bigNumber(total)}</strong>{" "}
          <span className="text-muted-foreground">somando todas as séries com carga.</span>
        </p>
      ) : null}

      {best.length ? (
        <div>
          <p className="text-sm font-medium">Melhores cargas (máximo estimado em 1 repetição)</p>
          <ul className="mt-2 divide-y divide-border/40">
            {best.map((entry) => (
              <li key={entry.exercise!.id} className="flex items-baseline justify-between gap-3 py-2 text-sm">
                <span className="min-w-0 truncate">{entry.exercise!.name}</span>
                <span className="shrink-0 text-right tabular-nums">
                  <strong>{formatKg(entry.oneRepMax)}</strong>
                  {body ? (
                    <span className="ml-1.5 text-xs text-muted-foreground">
                      {(entry.oneRepMax / body).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}× seu peso
                    </span>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2 border-t border-border/40 pt-4">
        <p className="mr-auto text-xs text-muted-foreground">Planilha (CSV). Importa do Strong, Hevy ou do próprio Flowy.</p>
        <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={exportCsv} disabled={!history.length}>
          <Download className="size-3.5" />
          Exportar
        </Button>
        <ImportButton history={history} />
      </div>
    </section>
  );
}
