"use client";

import { Check, Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import { EXERCISES, SLOT_LABELS, type Exercise, type Slot } from "../exercises";
import { ExerciseFigure } from "../figure/exercise-figure";
import { PLACE_LABELS } from "../types";

/** Accents and case do not matter: "agachamento" finds "Agachamento", "rosca" finds "Rosca". */
function normalize(text: string) {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function searchExercises(query: string, slot: Slot | "all"): Exercise[] {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  return EXERCISES.filter((exercise) => {
    if (slot !== "all" && exercise.slot !== slot) return false;
    const text = normalize(`${exercise.name} ${SLOT_LABELS[exercise.slot]}`);
    return words.every((word) => text.includes(word));
  });
}

const GROUPS = Object.keys(SLOT_LABELS) as Slot[];

/** Every exercise the Flowy knows, to search and add to a workout. */
export function ExerciseCatalog({
  added,
  onAdd,
}: {
  /** How many times each exercise is already in the workout. */
  added: Map<string, number>;
  onAdd: (exercise: Exercise) => void;
}) {
  const [query, setQuery] = useState("");
  const [slot, setSlot] = useState<Slot | "all">("all");
  const results = useMemo(() => searchExercises(query, slot), [query, slot]);

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <Input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar exercício (ex.: supino, agachamento)"
          aria-label="Buscar exercício"
          className="rounded-xl pl-9"
        />
      </div>

      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 scrollbar-thin" role="group" aria-label="Grupo muscular">
        {(["all", ...GROUPS] as const).map((group) => (
          <button
            key={group}
            type="button"
            aria-pressed={slot === group}
            onClick={() => setSlot(group)}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              slot === group
                ? "border-violet-400/60 bg-violet-500/15 text-foreground"
                : "border-border/60 text-muted-foreground hover:bg-muted/40",
            )}
          >
            {group === "all" ? "Todos" : SLOT_LABELS[group]}
          </button>
        ))}
      </div>

      {results.length ? (
        <ul className="grid gap-2 sm:grid-cols-2">
          {results.map((exercise) => {
            const count = added.get(exercise.id) ?? 0;
            return (
              <li key={exercise.id}>
                <button
                  type="button"
                  onClick={() => onAdd(exercise)}
                  className="flex w-full items-center gap-3 rounded-2xl border border-border/50 bg-background/40 p-2 text-left transition-colors hover:border-violet-400/50 hover:bg-violet-500/5"
                  aria-label={`Adicionar ${exercise.name}`}
                >
                  <ExerciseFigure exerciseId={exercise.id} name={exercise.name} still className="w-20 shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium leading-snug">{exercise.name}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {SLOT_LABELS[exercise.slot]} · {exercise.places.map((place) => PLACE_LABELS[place]).join(", ")}
                    </span>
                  </span>
                  <span
                    className={cn(
                      "grid size-8 shrink-0 place-items-center rounded-full",
                      count ? "bg-emerald-500/15 text-emerald-400" : "bg-muted text-foreground",
                    )}
                    aria-hidden="true"
                  >
                    {count ? <Check className="size-4" /> : <Plus className="size-4" />}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="rounded-2xl bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
          Nenhum exercício com esse nome. Tente outra palavra.
        </p>
      )}
    </div>
  );
}
