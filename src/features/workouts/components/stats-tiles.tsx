"use client";

import { CalendarCheck, Dumbbell, Flame, Scale, Weight } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { localDateKey } from "@/features/tasks/date-utils";
import { cn } from "@/lib/utils";

import type { LoggedSet } from "../strength";
import { totalLifted } from "../training";
import type { WorkoutLog } from "../types";
import { useBodyWeights } from "../use-strength";

function bigNumber(kg: number) {
  if (kg >= 10_000) return `${(kg / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} t`;
  return `${kg.toLocaleString("pt-BR")} kg`;
}

/** Scrolls to a section of the page, for tiles that lead somewhere. */
function goTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function Tile({
  icon: Icon,
  label,
  value,
  hint,
  tone,
  target,
  wide,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  hint?: { text: string; className: string };
  tone: string;
  target?: string;
  wide?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={target ? () => goTo(target) : undefined}
      disabled={!target}
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-border/50 bg-card/60 p-3 text-left transition-all enabled:hover:-translate-y-0.5 enabled:hover:border-border enabled:active:scale-[0.98]",
        wide && "col-span-2",
      )}
    >
      {/* A soft wash of the tile's colour in the corner. */}
      <span aria-hidden="true" className={cn("pointer-events-none absolute -right-6 -top-6 size-20 rounded-full opacity-25 blur-2xl", tone)} />
      <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <span className={cn("grid size-5 place-items-center rounded-md text-white", tone)}>
          <Icon className="size-3" aria-hidden="true" />
        </span>
        {label}
      </span>
      <span className="mt-1.5 flex items-baseline gap-2">
        <span className={cn("font-bold tabular-nums tracking-tight", wide ? "text-3xl" : "text-2xl")}>{value}</span>
        {hint ? <span className={cn("text-xs font-semibold", hint.className)}>{hint.text}</span> : null}
      </span>
    </button>
  );
}

/** The numbers at the top of Treinos, each a door to the part that explains it. */
export function StatsTiles({ logs, history, streak, today }: { logs: WorkoutLog[]; history: LoggedSet[]; streak: number; today: string }) {
  const weights = useBodyWeights();
  const done = logs.filter((log) => log.status === "done");
  const month = done.filter((log) => log.day.startsWith(today.slice(0, 7))).length;
  const entries = weights.data ?? [];
  const latest = entries[entries.length - 1];
  const monthAgo = new Date(`${today}T12:00:00`);
  monthAgo.setDate(monthAgo.getDate() - 30);
  const since = localDateKey(monthAgo);
  const base = entries.find((entry) => entry.day >= since);
  const change = latest && base && base !== latest ? Math.round((latest.weight_kg - base.weight_kg) * 10) / 10 : null;
  const lifted = totalLifted(history);

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <Tile icon={Flame} label="Sequência" value={String(streak)} hint={{ text: streak === 1 ? "treino" : "treinos", className: "text-orange-300" }} tone="bg-orange-500" target="workout-month" />
      <Tile icon={CalendarCheck} label="Este mês" value={String(month)} tone="bg-sky-500" target="workout-month" />
      <Tile
        icon={Scale}
        label="Peso"
        value={latest ? `${latest.weight_kg.toLocaleString("pt-BR")} kg` : "—"}
        hint={
          change !== null
            ? { text: `${change > 0 ? "+" : ""}${change.toLocaleString("pt-BR")} kg`, className: change <= 0 ? "text-emerald-400" : "text-amber-300" }
            : undefined
        }
        tone="bg-emerald-500"
        target="body-weight-title"
      />
      <Tile icon={Dumbbell} label="Treinos feitos" value={String(done.length)} tone="bg-fuchsia-500" target="training-stats-title" />
      {lifted ? <Tile icon={Weight} label="Levantado no total" value={bigNumber(lifted)} tone="bg-violet-500" target="training-stats-title" wide /> : null}
    </div>
  );
}
