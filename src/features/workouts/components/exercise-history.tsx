"use client";

import { Trophy, X } from "lucide-react";
import { useEffect } from "react";
import { createPortal } from "react-dom";

import { holdOverlay } from "@/lib/overlay";

import type { Exercise } from "../exercises";
import { estimateOneRepMax, formatKg, progressByDay, type LoggedSet } from "../strength";
import { ProgressChart } from "./progress-chart";

const UNIT_LABEL = { reps: "reps", seconds: "seg", minutes: "min" } as const;

function dateLabel(day: string) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", weekday: "short" }).format(new Date(`${day}T12:00:00`));
}

/** Everything logged for one exercise: the progress chart, the best set and each day. */
export function ExerciseHistory({ exercise, history, onClose }: { exercise: Exercise; history: LoggedSet[]; onClose: () => void }) {
  useEffect(() => {
    const release = holdOverlay();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      release();
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const sets = history.filter((set) => set.exercise_id === exercise.id);
  const loaded = sets.some((set) => set.weight_kg);
  const points = progressByDay(history, exercise.id);
  const best = sets.reduce<LoggedSet | null>((top, set) => {
    const score = (item: LoggedSet) => (item.weight_kg ? estimateOneRepMax(item.weight_kg, item.amount) : item.amount);
    return !top || score(set) > score(top) ? set : top;
  }, null);
  const days = [...new Set(sets.map((set) => set.day))].sort((a, b) => b.localeCompare(a)).slice(0, 12);

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-3" role="dialog" aria-modal="true" aria-labelledby="exercise-history-title">
      <button type="button" aria-label="Fechar" onClick={onClose} className="absolute inset-0 animate-in fade-in bg-black/50 backdrop-blur-sm" />
      <section className="relative max-h-[calc(100dvh-1.5rem)] w-full max-w-md animate-in overflow-y-auto rounded-[1.75rem] border border-border/60 bg-card p-4 shadow-2xl fade-in zoom-in-95">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest flowy-ink">Histórico</p>
            <h2 id="exercise-history-title" className="text-lg font-semibold">{exercise.name}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar" className="grid size-9 place-items-center rounded-full text-muted-foreground hover:bg-muted">
            <X className="size-4" />
          </button>
        </div>

        {!sets.length ? (
          <p className="mt-6 text-center text-sm text-muted-foreground">Nenhuma série registrada ainda. Marque as séries com ✓ durante o treino.</p>
        ) : (
          <>
            <div className="mt-3">
              <p className="mb-1 text-xs text-muted-foreground">{loaded ? "Carga máxima estimada (1 repetição)" : `Melhor série (${UNIT_LABEL[exercise.unit]})`}</p>
              <ProgressChart points={points} unit={loaded ? "kg" : UNIT_LABEL[exercise.unit]} />
            </div>
            {best ? (
              <p className="mt-3 flex items-center gap-2 rounded-2xl bg-amber-500/10 px-3 py-2.5 text-sm">
                <Trophy className="size-4 shrink-0 text-amber-300" aria-hidden="true" />
                <span>
                  Recorde:{" "}
                  <strong>
                    {best.weight_kg ? `${formatKg(best.weight_kg)} × ${best.amount}` : `${best.amount} ${UNIT_LABEL[exercise.unit]}`}
                  </strong>{" "}
                  <span className="text-muted-foreground">em {dateLabel(best.day)}</span>
                </span>
              </p>
            ) : null}
            <ul className="mt-3 divide-y divide-border/40">
              {days.map((day) => {
                const ofDay = sets.filter((set) => set.day === day).sort((a, b) => a.set_number - b.set_number);
                return (
                  <li key={day} className="flex items-baseline justify-between gap-3 py-2 text-sm">
                    <span className="shrink-0 capitalize text-muted-foreground">{dateLabel(day)}</span>
                    <span className="text-right tabular-nums">
                      {ofDay.map((set) => (set.weight_kg ? `${set.amount}×${formatKg(set.weight_kg)}` : `${set.amount} ${UNIT_LABEL[exercise.unit]}`)).join(" · ")}
                    </span>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </section>
    </div>,
    document.body,
  );
}
