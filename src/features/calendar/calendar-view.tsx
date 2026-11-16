"use client";

import { useQuery } from "@tanstack/react-query";
import { CalendarDays, ChevronLeft, ChevronRight, Plus, Repeat2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { TaskItem } from "@/features/tasks/components/task-item";
import { localDateKey } from "@/features/tasks/date-utils";
import { monthGrid } from "@/features/tasks/pickers";
import { useTasks } from "@/features/tasks/use-tasks";
import type { CalendarEvent } from "@/lib/calendar/ics";
import { cn } from "@/lib/utils";
import type { Category, Folder } from "@/types/productivity";

import { holidayMap } from "./holidays";
import { repeatsOn } from "./repeats";

const WEEKDAYS = ["D", "S", "T", "Q", "Q", "S", "S"];

async function loadEvents(from: string, to: string): Promise<{ events: CalendarEvent[]; connected: boolean }> {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const response = await fetch(`/api/calendar/feed?from=${from}&to=${to}&tz=${encodeURIComponent(tz)}`);
  if (!response.ok) return { events: [], connected: false };
  return response.json();
}

function longDate(date: string) {
  return new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long" }).format(new Date(`${date}T12:00:00`));
}

/**
 * A quiet month: dots say which days have something, a tap shows that day's
 * tasks, holidays and events from the person's own calendar, and lets them
 * add a task right on it.
 */
export function CalendarView({ folders, categories }: { folders: Folder[]; categories: Category[] }) {
  const today = localDateKey();
  const [selected, setSelected] = useState(today);
  const [view, setView] = useState(() => ({ year: Number(today.slice(0, 4)), month: Number(today.slice(5, 7)) - 1 }));
  const tasks = useTasks({ scope: "all" });

  const cells = monthGrid(view.year, view.month);
  const days = cells.filter((cell): cell is string => Boolean(cell));
  const from = days[0]!;
  const to = days[days.length - 1]!;
  const feed = useQuery({ queryKey: ["calendar-feed", from, to], queryFn: () => loadEvents(from, to), staleTime: 5 * 60_000 });
  const holidays = holidayMap([view.year]);

  const all = tasks.data ?? [];
  const tasksOn = (date: string) => all.filter((task) => task.due_date === date);
  const repeatsFor = (date: string) => all.filter((task) => repeatsOn(task, date));
  const eventsOn = (date: string) => (feed.data?.events ?? []).filter((event) => event.date === date);

  const move = (step: number) => {
    const date = new Date(view.year, view.month + step, 1);
    setView({ year: date.getFullYear(), month: date.getMonth() });
  };
  const goToday = () => {
    setView({ year: Number(today.slice(0, 4)), month: Number(today.slice(5, 7)) - 1 });
    setSelected(today);
  };
  const monthName = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(new Date(view.year, view.month, 1));

  const dayTasks = tasksOn(selected);
  const dayRepeats = repeatsFor(selected);
  const dayEvents = eventsOn(selected);
  const holiday = holidays.get(selected);
  const empty = !dayTasks.length && !dayRepeats.length && !dayEvents.length;

  return (
    <section className="mt-4 space-y-4" aria-label="Calendário">
      <div className="rounded-3xl border border-border/60 bg-card/40 p-3 sm:p-4">
        <div className="flex items-center gap-1">
          <p className="flex-1 pl-2 text-base font-semibold capitalize">{monthName}</p>
          {selected !== today || view.month !== Number(today.slice(5, 7)) - 1 ? (
            <button type="button" onClick={goToday} className="rounded-full px-3 py-1.5 text-xs font-medium flowy-ink hover:bg-primary/10">
              Hoje
            </button>
          ) : null}
          <button type="button" onClick={() => move(-1)} aria-label="Mês anterior" className="grid size-9 place-items-center rounded-full hover:bg-muted">
            <ChevronLeft className="size-4" />
          </button>
          <button type="button" onClick={() => move(1)} aria-label="Próximo mês" className="grid size-9 place-items-center rounded-full hover:bg-muted">
            <ChevronRight className="size-4" />
          </button>
        </div>

        <div className="mt-2 grid grid-cols-7 text-center">
          {WEEKDAYS.map((day, index) => (
            <span key={index} className="pb-1 text-[11px] font-semibold text-muted-foreground/70">
              {day}
            </span>
          ))}
          {cells.map((date, index) => {
            if (!date) return <span key={`pad-${index}`} />;
            const count = tasksOn(date).length + repeatsFor(date).length;
            const events = eventsOn(date).length;
            const isHoliday = holidays.has(date);
            const isSelected = date === selected;
            return (
              <button
                key={date}
                type="button"
                onClick={() => setSelected(date)}
                aria-pressed={isSelected}
                aria-label={`${longDate(date)}${count ? `, ${count} ${count === 1 ? "tarefa" : "tarefas"}` : ""}${isHoliday ? `, feriado: ${holidays.get(date)!.name}` : ""}`}
                className="group flex h-12 flex-col items-center justify-center gap-1"
              >
                <span
                  className={cn(
                    "grid size-8 place-items-center rounded-full text-sm tabular-nums transition-colors",
                    isSelected
                      ? "bg-primary font-semibold text-primary-foreground"
                      : date === today
                        ? "font-semibold flowy-ink ring-1 ring-primary/50"
                        : isHoliday
                          ? "text-amber-400"
                          : date < today
                            ? "text-muted-foreground/60 group-hover:bg-muted"
                            : "group-hover:bg-muted",
                  )}
                >
                  {Number(date.slice(8))}
                </span>
                <span className="flex h-1 gap-0.5" aria-hidden="true">
                  {count ? <i className="size-1 rounded-full bg-primary" /> : null}
                  {count > 2 ? <i className="size-1 rounded-full bg-primary/60" /> : null}
                  {events ? <i className="size-1 rounded-full bg-sky-400" /> : null}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <h2 className="flex-1 text-sm font-semibold first-letter:uppercase">{longDate(selected)}</h2>
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent("flowy:open-task-composer", { detail: { date: selected } }))}
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-primary px-3.5 text-sm font-semibold text-primary-foreground active:scale-95"
          >
            <Plus className="size-4" aria-hidden="true" />
            Tarefa
          </button>
        </div>

        {holiday ? (
          <p className="flex items-center gap-2 rounded-2xl bg-amber-500/10 px-3 py-2 text-sm text-amber-300">
            <span className="size-1.5 rounded-full bg-amber-400" aria-hidden="true" />
            {holiday.optional ? "Ponto facultativo" : "Feriado"} · {holiday.name}
          </p>
        ) : null}

        {dayEvents.length ? (
          <ul className="space-y-1">
            {dayEvents.map((event, index) => (
              <li key={index} className="flex items-center gap-3 rounded-2xl border border-sky-400/20 bg-sky-500/5 px-3 py-2.5 text-sm">
                <span className="w-11 shrink-0 text-xs font-semibold tabular-nums text-sky-300">{event.time ?? "Dia"}</span>
                <span className="min-w-0 flex-1 truncate">{event.title}</span>
                <CalendarDays className="size-3.5 shrink-0 text-sky-300/70" aria-label="Da sua agenda" />
              </li>
            ))}
          </ul>
        ) : null}

        {tasks.isLoading ? (
          <Skeleton className="h-16 w-full rounded-2xl" />
        ) : (
          <div className="space-y-2">
            {dayTasks.map((task) => (
              <TaskItem key={task.id} task={task} folders={folders} categories={categories} />
            ))}
            {dayRepeats.map((task) => (
              <p key={task.id} className="flex items-center gap-3 rounded-2xl border border-dashed border-border/60 px-3 py-2.5 text-sm text-muted-foreground">
                <Repeat2 className="size-4 shrink-0" aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate">{task.title}</span>
                {task.due_time ? <span className="text-xs tabular-nums">{task.due_time.slice(0, 5)}</span> : null}
              </p>
            ))}
          </div>
        )}

        {empty && !tasks.isLoading ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Nada marcado para este dia.</p>
        ) : null}

        {feed.data && !feed.data.connected ? (
          <Link href="/app/settings#agenda" className="block pt-2 text-center text-xs text-muted-foreground hover:text-foreground">
            Ver também os compromissos da agenda do seu e-mail →
          </Link>
        ) : null}
      </div>
    </section>
  );
}
