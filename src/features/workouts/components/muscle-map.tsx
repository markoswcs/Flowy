"use client";

import { Activity } from "lucide-react";
import { useState } from "react";

import { localDateKey } from "@/features/tasks/date-utils";
import { cn } from "@/lib/utils";

import { EXERCISE_BY_ID, type Slot } from "../exercises";
import { setsPerSlot, type LoggedSet } from "../strength";
import { recoveringSlots } from "../training";

type Region = { slot: Slot; d: string; weight?: number };

/** Mirrors an absolute path (M/L/Q/C/Z only) across the body's middle line, x = 50. */
const mirror = (d: string) => {
  let index = 0;
  return d.replace(/-?\d+(\.\d+)?/g, (number) => (index++ % 2 === 0 ? String(100 - Number(number)) : number));
};
const pair = (slot: Slot, d: string, weight?: number): Region[] => [
  { slot, d, weight },
  { slot, d: mirror(d), weight },
];
const ellipse = (cx: number, cy: number, rx: number, ry: number) =>
  `M${cx - rx} ${cy} A${rx} ${ry} 0 1 0 ${cx + rx} ${cy} A${rx} ${ry} 0 1 0 ${cx - rx} ${cy} Z`;
// Ellipses use arcs, so they are mirrored by their centre instead.
const ellipses = (slot: Slot, cx: number, cy: number, rx: number, ry: number, weight?: number): Region[] => [
  { slot, d: ellipse(cx, cy, rx, ry), weight },
  { slot, d: ellipse(100 - cx, cy, rx, ry), weight },
];

/** The body outline both figures share: head, torso, arms, hips and legs. */
const SILHOUETTE = [
  ellipse(50, 13, 8.5, 10),
  "M45 21 L55 21 L56 30 L44 30 Z",
  "M30 31 Q50 26 70 31 Q77 33 75 44 L67 84 Q50 90 33 84 L25 44 Q23 33 30 31 Z",
  "M33 82 Q50 88 67 82 L69 100 Q50 107 31 100 Z",
  "M25 35 Q18 37 17 49 L14 70 Q18 74 22 72 L28 50 Z",
  mirror("M25 35 Q18 37 17 49 L14 70 Q18 74 22 72 L28 50 Z"),
  "M14 72 L11 95 Q14 99 18 97 L22 74 Z",
  mirror("M14 72 L11 95 Q14 99 18 97 L22 74 Z"),
  ellipse(13.5, 101, 3.5, 4),
  ellipse(86.5, 101, 3.5, 4),
  "M32 100 Q29 121 33 143 L46 143 Q49 121 50 103 Z",
  mirror("M32 100 Q29 121 33 143 L46 143 Q49 121 50 103 Z"),
  "M34 145 Q32 166 36 187 L44 187 Q46 166 46 145 Z",
  mirror("M34 145 Q32 166 36 187 L44 187 Q46 166 46 145 Z"),
  ellipse(40, 190, 5.5, 3),
  ellipse(60, 190, 5.5, 3),
];

const FRONT: Region[] = [
  ...ellipses("push", 27.5, 38, 5.5, 6),
  ...pair("push", "M36 39 Q43 36 49 38 L49 51 Q42 55 35 51 Q32 45 36 39 Z"),
  ...ellipses("arms", 20.5, 54, 3.8, 9),
  { slot: "core", d: "M43 56 Q50 54 57 56 L57 80 Q50 84 43 80 Z" },
  ...ellipses("core", 38.5, 68, 3, 9, 0.6),
  ...pair("squat", "M34 104 Q32 122 36 139 L44 139 Q47 122 47 105 Q40 101 34 104 Z"),
  ...pair("lunge", "M34 104 Q32 122 36 139 L44 139 Q47 122 47 105 Q40 101 34 104 Z", 0.5),
  ...ellipses("calves", 39.5, 160, 3.2, 10, 0.6),
];

const BACK: Region[] = [
  { slot: "pull", d: "M40 29 Q50 26 60 29 L57 41 Q50 44 43 41 Z" },
  ...ellipses("push", 27.5, 38, 5.5, 6, 0.6),
  ...pair("pull", "M33 43 Q41 41 48 46 L47 73 Q40 71 36 62 Q32 52 33 43 Z"),
  ...ellipses("arms", 20.5, 53, 3.8, 9),
  { slot: "core", d: "M44 73 Q50 71 56 73 L56 84 Q50 86 44 84 Z", weight: 0.6 },
  { slot: "hinge", d: "M44 73 Q50 71 56 73 L56 84 Q50 86 44 84 Z", weight: 0.5 },
  ...ellipses("hinge", 42, 96, 8, 7.5),
  ...ellipses("lunge", 42, 96, 8, 7.5, 0.5),
  ...pair("hinge", "M34 109 Q32 125 36 140 L44 140 Q47 125 47 110 Q41 106 34 109 Z"),
  ...ellipses("calves", 40, 158, 4, 10.5),
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

type Mode = "volume" | "recovery" | "untrained";

const MODES: { mode: Mode; label: string; hint: string }[] = [
  { mode: "volume", label: "Volume", hint: "Séries de trabalho nos últimos 7 dias: quanto mais, mais aceso." },
  { mode: "recovery", label: "Recuperando", hint: "Treinados ontem ou hoje: dê um descanso antes de pesar de novo." },
  { mode: "untrained", label: "Esquecidos", hint: "Nenhuma série nos últimos 7 dias." },
];

const MODE_COLOR: Record<Mode, string> = { volume: "#a78bfa", recovery: "#fbbf24", untrained: "#f87171" };

function Figure({ regions, level, title, color }: { regions: Region[]; level: (slot: Slot) => number; title: string; color: string }) {
  return (
    <figure className="flex-1 text-center">
      <svg viewBox="0 0 100 196" className="mx-auto h-48 w-auto" role="img" aria-label={title}>
        {SILHOUETTE.map((d) => (
          <path key={d} d={d} fill="currentColor" fillOpacity="0.07" stroke="currentColor" strokeOpacity="0.14" strokeWidth="0.6" />
        ))}
        {regions.map((region, index) => {
          const value = Math.min(1, level(region.slot) * (region.weight ?? 1));
          return (
            <path
              key={index}
              d={region.d}
              fill={value ? color : "currentColor"}
              fillOpacity={value ? 0.3 + value * 0.7 : 0.1}
              style={value ? { filter: `drop-shadow(0 0 ${2 + value * 3}px ${color})` } : undefined}
              className="transition-all duration-500"
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

/** The muscle map in three modes: where the volume went, what is recovering and what was left out. */
export function MuscleMap({ history }: { history: LoggedSet[] }) {
  const [mode, setMode] = useState<Mode>("volume");
  const today = localDateKey();
  const slotOf = (id: string) => EXERCISE_BY_ID.get(id)?.slot;
  const counts = setsPerSlot(history, slotOf, weekStart(today), today);
  const recovering = recoveringSlots(history, slotOf, today);
  const groups = Object.keys(LABELS) as Slot[];
  const trainedSlot = (slot: Slot) => Boolean(counts[slot] || (slot === "squat" && counts.lunge));
  // 12 sets in a week lights a group fully.
  const level = (slot: Slot) =>
    mode === "volume"
      ? Math.min(1, (counts[slot] ?? 0) / 12)
      : mode === "recovery"
        ? recovering.has(slot) || (slot === "squat" && recovering.has("lunge"))
          ? 1
          : 0
        : trainedSlot(slot)
          ? 0
          : 0.8;
  const trained = groups.filter((slot) => counts[slot]);
  const untouched = groups.filter((slot) => !trainedSlot(slot));
  const resting = groups.filter((slot) => recovering.has(slot));
  const current = MODES.find((entry) => entry.mode === mode)!;

  return (
    <section className="rounded-3xl border border-border/60 bg-card/50 p-4 sm:p-6" aria-labelledby="muscle-map-title">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="muscle-map-title" className="flex items-center gap-2 text-base font-semibold">
          <Activity className="size-5 flowy-ink" aria-hidden="true" />
          Músculos da semana
        </h2>
        <div className="flex rounded-full bg-muted/40 p-0.5" role="group" aria-label="Modo do mapa">
          {MODES.map((entry) => (
            <button
              key={entry.mode}
              type="button"
              aria-pressed={mode === entry.mode}
              onClick={() => setMode(entry.mode)}
              className={cn(
                "rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                mode === entry.mode ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {entry.label}
            </button>
          ))}
        </div>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{current.hint}</p>
      <div className="mt-3 flex gap-2">
        <Figure regions={FRONT} level={level} title="Frente" color={MODE_COLOR[mode]} />
        <Figure regions={BACK} level={level} title="Costas" color={MODE_COLOR[mode]} />
      </div>
      {mode === "volume" ? (
        trained.length ? (
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {trained.map((slot) => (
              <li key={slot} className="rounded-full bg-violet-500/15 px-3 py-1 text-xs font-medium">
                {LABELS[slot]} · {counts[slot]} {counts[slot] === 1 ? "série" : "séries"}
              </li>
            ))}
            {counts.cardio ? <li className="rounded-full bg-sky-500/15 px-3 py-1 text-xs font-medium">Cardio · {counts.cardio}</li> : null}
          </ul>
        ) : (
          <p className="mt-3 text-center text-sm text-muted-foreground">Marque as séries com ✓ no treino e o mapa acende.</p>
        )
      ) : mode === "recovery" ? (
        <p className="mt-3 text-center text-sm text-muted-foreground">
          {resting.length ? `Recuperando: ${resting.map((slot) => LABELS[slot]).join(", ")}.` : "Tudo descansado: pode pesar."}
        </p>
      ) : (
        <p className="mt-3 text-center text-sm text-muted-foreground">
          {untouched.length ? `Sem treino há 7 dias: ${untouched.map((slot) => LABELS[slot]).join(", ")}.` : "Nenhum grupo esquecido. Muito bom!"}
        </p>
      )}
    </section>
  );
}
