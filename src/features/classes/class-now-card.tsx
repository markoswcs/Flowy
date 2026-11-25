"use client";

import { Briefcase, CalendarCheck, CalendarRange, ChevronRight, Dumbbell, GraduationCap, MapPin, Sparkles, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

import { hhmm, inTime, type RoutineKind } from "./schedule";
import { useClasses } from "./use-classes";

const ICONS: Record<RoutineKind, LucideIcon> = {
  aula: GraduationCap,
  trabalho: Briefcase,
  treino: Dumbbell,
  compromisso: CalendarCheck,
  outro: Sparkles,
};

const PALETTE = ["#8b5cf6", "#38bdf8", "#34d399", "#f59e0b", "#f472b6", "#fb7185", "#a3e635", "#22d3ee"];
/** Same colour as on the Rotina page. */
function colorOf(name: string) {
  let hash = 0;
  for (const char of name.trim().toLowerCase()) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return PALETTE[hash % PALETTE.length]!;
}

const minutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));

/**
 * Today's routine on the Hoje list: every class, shift or appointment of the
 * day with its time, the one happening now marked and the past ones faded.
 * Hidden on a day with nothing in the routine.
 */
export function ClassNowCard() {
  const classes = useClasses();
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const current = now.getHours() * 60 + now.getMinutes();
  const today = (classes.data ?? [])
    .filter((slot) => slot.weekday === now.getDay())
    .sort((a, b) => minutes(a.starts_at) - minutes(b.starts_at));
  if (!today.length) return null;
  const next = today.find((slot) => minutes(slot.starts_at) > current);

  return (
    <section className="rounded-3xl border border-border/60 bg-card/40 p-3" aria-label="Rotina de hoje">
      <Link
        href="/app/classes"
        className="mb-2 flex items-center gap-2 px-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground hover:text-foreground"
      >
        <CalendarRange className="size-3.5" aria-hidden="true" />
        Rotina de hoje
        {next ? (
          <span className="font-medium normal-case tracking-normal">· próxima {inTime(minutes(next.starts_at) - current)}</span>
        ) : null}
        <ChevronRight className="ml-auto size-3.5" aria-hidden="true" />
      </Link>
      <ol className="space-y-1">
        {today.map((slot) => {
          const color = colorOf(slot.name);
          const Icon = ICONS[slot.kind ?? "aula"] ?? GraduationCap;
          const done = minutes(slot.ends_at) <= current;
          const live = minutes(slot.starts_at) <= current && current < minutes(slot.ends_at);
          return (
            <li key={slot.id}>
              <Link
                href="/app/classes"
                className={cn(
                  "flex items-center gap-3 rounded-2xl px-2.5 py-2 text-sm transition-colors hover:bg-muted/40",
                  done && "opacity-45",
                  live && "bg-muted/40",
                )}
              >
                <span className="w-[4.6rem] shrink-0 text-xs font-semibold tabular-nums text-muted-foreground">
                  {hhmm(slot.starts_at)}–{hhmm(slot.ends_at)}
                </span>
                <span className="h-6 w-1 shrink-0 rounded-full" style={{ backgroundColor: color }} aria-hidden="true" />
                <Icon className="size-4 shrink-0" style={{ color }} aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate font-medium">{slot.name}</span>
                {slot.room ? (
                  <span className="hidden shrink-0 items-center gap-1 text-xs text-muted-foreground min-[380px]:inline-flex">
                    <MapPin className="size-3" aria-hidden="true" />
                    {slot.room}
                  </span>
                ) : null}
                {live ? (
                  <span className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold text-white" style={{ backgroundColor: color }}>
                    AGORA
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
