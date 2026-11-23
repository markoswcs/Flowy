"use client";

import { Activity } from "lucide-react";

import { localDateKey } from "@/features/tasks/date-utils";

import { EXERCISE_BY_ID, type Slot } from "../exercises";
import { setsPerSlot, type LoggedSet } from "../strength";

type Region = { slot: Slot; d: string; weight?: number };

const rect = (x: number, y: number, w: number, h: number, r: number) =>
  `M${x + r} ${y}h${w - 2 * r}a${r} ${r} 0 0 1 ${r} ${r}v${h - 2 * r}a${r} ${r} 0 0 1 -${r} ${r}h-${w - 2 * r}a${r} ${r} 0 0 1 -${r} -${r}v-${h - 2 * r}a${r} ${r} 0 0 1 ${r} -${r}Z`;

// Simple Flowy-style figures (front and back), one shape per muscle group.
const FRONT: Region[] = [
  { slot: "push", d: rect(25, 36, 16, 13, 6.5) },
  { slot: "push", d: rect(59, 36, 16, 13, 6.5) },
  { slot: "push", d: rect(36, 42, 13, 15, 5) },
  { slot: "push", d: rect(51, 42, 13, 15, 5) },
  { slot: "arms", d: rect(19, 51, 9, 34, 4.5) },
  { slot: "arms", d: rect(72, 51, 9, 34, 4.5) },
  { slot: "core", d: rect(39, 60, 22, 30, 7) },
  { slot: "squat", d: rect(35, 96, 13, 44, 6.5) },
  { slot: "squat", d: rect(52, 96, 13, 44, 6.5) },
  { slot: "lunge", d: rect(35, 96, 13, 44, 6.5), weight: 0.5 },
  { slot: "lunge", d: rect(52, 96, 13, 44, 6.5), weight: 0.5 },
];

const BACK: Region[] = [
  { slot: "pull", d: rect(37, 37, 26, 14, 7) },
  { slot: "pull", d: rect(34, 53, 14, 24, 6) },
  { slot: "pull", d: rect(52, 53, 14, 24, 6) },
  { slot: "arms", d: rect(19, 51, 9, 34, 4.5) },
  { slot: "arms", d: rect(72, 51, 9, 34, 4.5) },
  { slot: "hinge", d: rect(36, 91, 28, 18, 8) },
  { slot: "lunge", d: rect(36, 91, 28, 18, 8), weight: 0.5 },
  { slot: "hinge", d: rect(35, 112, 13, 30, 6) },
  { slot: "hinge", d: rect(52, 112, 13, 30, 6) },
  { slot: "calves", d: rect(36, 146, 11, 30, 5.5) },
  { slot: "calves", d: rect(53, 146, 11, 30, 5.5) },
];

/** Head, neck, forearms and shins: the parts no slot lights up. */
const BASE = [
  "M50 6a11 11 0 1 1 0 22a11 11 0 1 1 0-22Z",
  rect(45, 27, 10, 8, 3),
  rect(17, 86, 8, 26, 4),
  rect(75, 86, 8, 26, 4),
  rect(37, 143, 10, 40, 5),
  rect(53, 143, 10, 40, 5),
  rect(38, 34, 24, 60, 10),
];

const LABELS: Partial<Record<Slot, string>> = {
  push: "Peito e ombros",
  pull: "Costas",
  arms: "Braços",
  core: "Abdômen",
  squat: "Pernas",
  hinge: "Glúteos e posterior",
  calves: "Panturrilha",
};

function Figure({ regions, level, title }: { regions: Region[]; level: (slot: Slot) => number; title: string }) {
  return (
    <figure className="flex-1 text-center">
      <svg viewBox="0 0 100 190" className="mx-auto h-44 w-auto" role="img" aria-label={title}>
        {BASE.map((d) => (
          <path key={d} d={d} fill="currentColor" opacity="0.07" />
        ))}
        {regions.map((region, index) => {
          const value = Math.min(1, level(region.slot) * (region.weight ?? 1));
          return (
            <path
              key={index}
              d={region.d}
              fill={value ? "#a78bfa" : "currentColor"}
              opacity={value ? 0.25 + value * 0.75 : 0.1}
              className="transition-opacity duration-500"
            />
          );
        })}
      </svg>
      <figcaption className="text-xs text-muted-foreground">{title}</figcaption>
    </figure>
  );
}

function weekStart(today: string) {
  const date = new Date(`${today}T12:00:00`);
  date.setDate(date.getDate() - 6);
  return localDateKey(date);
}

/** Which muscle groups got sets in the last 7 days: the more sets, the brighter. */
export function MuscleMap({ history }: { history: LoggedSet[] }) {
  const today = localDateKey();
  const counts = setsPerSlot(history, (id) => EXERCISE_BY_ID.get(id)?.slot, weekStart(today), today);
  // 12 sets in a week lights a group fully.
  const level = (slot: Slot) => Math.min(1, (counts[slot] ?? 0) / 12);
  const trained = (Object.keys(LABELS) as Slot[]).filter((slot) => counts[slot]);
  const untouched = (Object.keys(LABELS) as Slot[]).filter((slot) => !counts[slot] && !(slot === "squat" && counts.lunge));

  return (
    <section className="rounded-3xl border border-border/60 bg-card/50 p-4 sm:p-6" aria-labelledby="muscle-map-title">
      <h2 id="muscle-map-title" className="flex items-center gap-2 text-base font-semibold">
        <Activity className="size-5 flowy-ink" aria-hidden="true" />
        Músculos da semana
      </h2>
      <p className="mt-0.5 text-sm text-muted-foreground">Séries registradas nos últimos 7 dias.</p>
      <div className="mt-3 flex gap-2">
        <Figure regions={FRONT} level={level} title="Frente" />
        <Figure regions={BACK} level={level} title="Costas" />
      </div>
      {trained.length ? (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {trained.map((slot) => (
            <li key={slot} className="rounded-full bg-violet-500/15 px-3 py-1 text-xs font-medium">
              {LABELS[slot]} · {counts[slot]} {counts[slot] === 1 ? "série" : "séries"}
            </li>
          ))}
          {counts.cardio ? (
            <li className="rounded-full bg-sky-500/15 px-3 py-1 text-xs font-medium">Cardio · {counts.cardio}</li>
          ) : null}
        </ul>
      ) : (
        <p className="mt-3 text-center text-sm text-muted-foreground">Marque as séries com ✓ no treino e o mapa acende.</p>
      )}
      {trained.length && untouched.length ? (
        <p className="mt-2 text-xs text-muted-foreground">Sem treino esta semana: {untouched.map((slot) => LABELS[slot]).join(", ")}.</p>
      ) : null}
    </section>
  );
}
