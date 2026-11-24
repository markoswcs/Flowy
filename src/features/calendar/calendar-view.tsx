"use client";

import { useQuery } from "@tanstack/react-query";
import { CalendarDays, ChevronLeft, ChevronRight, Circle, ExternalLink, MapPin, Plus, Repeat2, Sparkles, Video } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { TaskItem } from "@/features/tasks/components/task-item";
import { localDateKey } from "@/features/tasks/date-utils";
import { monthGrid } from "@/features/tasks/pickers";
import { useTasks } from "@/features/tasks/use-tasks";
import type { CalendarEvent } from "@/lib/calendar/ics";
import { cn } from "@/lib/utils";
import type { Category, Folder, Task } from "@/types/productivity";

import { holidayMap } from "./holidays";
import { repeatsOn } from "./repeats";

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
/** One colour per connected Google account, in the order they appear. */
const ACCOUNT_COLORS = ["#38bdf8", "#f472b6", "#34d399"];
const TASK_COLOR = "#a78bfa";

async function loadEvents(
  from: string,
  to: string,
): Promise<{ events: CalendarEvent[]; connected: boolean; error?: string; tasksAllowed?: boolean }> {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const response = await fetch(`/api/calendar/feed?from=${from}&to=${to}&tz=${encodeURIComponent(tz)}`, { cache: "no-store" });
  if (!response.ok) return { events: [], connected: false };
  return response.json();
}

const minutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));

function nowInMinutes() {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

function duration(from: string, to?: string) {
  if (!to) return null;
  const total = minutes(to) - minutes(from);
  if (total <= 0) return null;
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  return hours ? `${hours} h${rest ? ` ${rest} min` : ""}` : `${rest} min`;
}

const format = (date: Date, options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("pt-BR", options).format(date);

type Entry =
  | { kind: "event"; time: string | null; event: CalendarEvent }
  | { kind: "task"; time: string | null; task: Task }
  | { kind: "repeat"; time: string | null; task: Task };

/**
 * The month with what each day holds (titles on wide screens, coloured dots on
 * phones), and the chosen day as a timeline: all-day things first, then each
 * hour with its meetings and tasks, how long they last, where and the Meet link.
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
  const events = feed.data?.events ?? [];
  const accounts = [...new Set(events.map((event) => event.account).filter((account): account is string => Boolean(account)))];
  const colorOf = (event: CalendarEvent) =>
    event.kind === "task" ? "#38bdf8" : ACCOUNT_COLORS[Math.max(0, accounts.indexOf(event.account ?? "")) % ACCOUNT_COLORS.length]!;
  const tasksOn = (date: string) => all.filter((task) => task.due_date === date);
  const repeatsFor = (date: string) => all.filter((task) => repeatsOn(task, date));
  const eventsOn = (date: string) => events.filter((event) => event.date === date);

  const move = (step: number) => {
    const date = new Date(view.year, view.month + step, 1);
    setView({ year: date.getFullYear(), month: date.getMonth() });
  };
  const goToday = () => {
    setView({ year: Number(today.slice(0, 4)), month: Number(today.slice(5, 7)) - 1 });
    setSelected(today);
  };
  const monthName = format(new Date(view.year, view.month, 1), { month: "long" });
  const monthKey = `${view.year}-${String(view.month + 1).padStart(2, "0")}`;
  const monthTasks = all.filter((task) => task.due_date?.startsWith(monthKey)).length;
  const monthEvents = events.filter((event) => event.date.startsWith(monthKey)).length;
  const monthHolidays = [...holidays.keys()].filter((date) => date.startsWith(monthKey)).length;

  const holiday = holidays.get(selected);
  const entries: Entry[] = [
    ...eventsOn(selected).map((event): Entry => ({ kind: "event", time: event.kind === "task" ? null : event.time, event })),
    ...tasksOn(selected).map((task): Entry => ({ kind: "task", time: task.due_time?.slice(0, 5) ?? null, task })),
    ...repeatsFor(selected).map((task): Entry => ({ kind: "repeat", time: task.due_time?.slice(0, 5) ?? null, task })),
  ];
  const allDay = entries.filter((entry) => !entry.time);
  const timed = entries.filter((entry) => entry.time).sort((a, b) => a.time!.localeCompare(b.time!));
  // The "now" line sits before the first item still to come (today only).
  const nowIndex = selected === today ? timed.findIndex((entry) => minutes(entry.time!) >= nowInMinutes()) : -2;
  const selectedDate = new Date(`${selected}T12:00:00`);
  const empty = !entries.length && !holiday;

  function renderEntry(entry: Entry, index: number) {
    if (entry.kind === "task") return <TaskItem key={`t-${entry.task.id}`} task={entry.task} folders={folders} categories={categories} />;
    if (entry.kind === "repeat") {
      return (
        <div key={`r-${entry.task.id}-${index}`} className="flex items-center gap-3 rounded-2xl border border-violet-400/20 bg-violet-500/[0.06] px-3.5 py-3 text-sm">
          <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-violet-500/15 flowy-ink">
            <Repeat2 className="size-4" aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-medium">{entry.task.title}</span>
            <span className="text-xs text-muted-foreground">Tarefa que se repete</span>
          </span>
        </div>
      );
    }
    const { event } = entry;
    const color = colorOf(event);
    const length = event.time ? duration(event.time, event.endTime) : null;
    return (
      <article
        key={`e-${index}-${event.title}`}
        className="relative overflow-hidden rounded-2xl border px-3.5 py-3 text-sm"
        style={{ borderColor: `${color}40`, background: `linear-gradient(90deg, ${color}1f, ${color}08 60%)` }}
      >
        <span aria-hidden="true" className="absolute inset-y-2 left-0 w-1 rounded-r-full" style={{ backgroundColor: color }} />
        <div className="flex items-start gap-2">
          {event.kind === "task" ? <Circle className="mt-0.5 size-4 shrink-0" style={{ color }} aria-hidden="true" /> : null}
          <p className="min-w-0 flex-1 font-semibold leading-snug">{event.title}</p>
          {event.link ? (
            <a
              href={event.link}
              target="_blank"
              rel="noreferrer"
              aria-label="Abrir no Google Agenda"
              className="shrink-0 rounded-full p-1 text-muted-foreground hover:bg-white/10 hover:text-foreground"
            >
              <ExternalLink className="size-3.5" />
            </a>
          ) : null}
        </div>
        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {event.kind === "task" ? (
            <span>Tarefas do Google</span>
          ) : event.time ? (
            <span className="font-medium tabular-nums" style={{ color }}>
              {event.time}
              {event.endTime ? ` – ${event.endTime}` : ""}
              {length ? <span className="font-normal text-muted-foreground"> · {length}</span> : null}
            </span>
          ) : (
            <span style={{ color }}>Dia inteiro</span>
          )}
          {event.location ? (
            <span className="inline-flex min-w-0 items-center gap-1">
              <MapPin className="size-3 shrink-0" aria-hidden="true" />
              <span className="truncate">{event.location}</span>
            </span>
          ) : null}
          {event.account && accounts.length > 1 ? (
            <span className="inline-flex items-center gap-1">
              <span className="size-1.5 rounded-full" style={{ backgroundColor: color }} aria-hidden="true" />
              {event.account.split("@")[0]}
            </span>
          ) : null}
        </p>
        {event.meet ? (
          <a
            href={event.meet}
            target="_blank"
            rel="noreferrer"
            className="mt-2.5 inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-semibold text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: color }}
          >
            <Video className="size-3.5" aria-hidden="true" />
            Entrar no Meet
          </a>
        ) : null}
      </article>
    );
  }

  return (
    <section className="mt-4 space-y-5" aria-label="Calendário">
      <div className="overflow-hidden rounded-[1.75rem] border border-border/60 bg-card/40">
        <div className="flex items-center gap-1.5 bg-gradient-to-b from-primary/[0.08] to-transparent px-4 pb-2 pt-4">
          <div className="min-w-0 flex-1">
            <h2 className="text-2xl font-bold capitalize leading-none">
              {monthName} <span className="font-medium text-muted-foreground">{view.year}</span>
            </h2>
            <p className="mt-1.5 flex flex-wrap gap-x-3 text-[11px] text-muted-foreground">
              <span>
                <b className="font-semibold text-violet-400">{monthTasks}</b> tarefas
              </span>
              {feed.data?.connected ? (
                <span>
                  <b className="font-semibold text-sky-400">{monthEvents}</b> da agenda
                </span>
              ) : null}
              {monthHolidays ? (
                <span>
                  <b className="font-semibold text-amber-400">{monthHolidays}</b> {monthHolidays === 1 ? "feriado" : "feriados"}
                </span>
              ) : null}
            </p>
          </div>
          {selected !== today || view.month !== Number(today.slice(5, 7)) - 1 ? (
            <button type="button" onClick={goToday} className="rounded-full bg-primary/15 px-3 py-1.5 text-xs font-semibold flowy-ink hover:bg-primary/25">
              Hoje
            </button>
          ) : null}
          <button type="button" onClick={() => move(-1)} aria-label="Mês anterior" className="grid size-9 place-items-center rounded-full border border-border/60 hover:bg-muted">
            <ChevronLeft className="size-4" />
          </button>
          <button type="button" onClick={() => move(1)} aria-label="Próximo mês" className="grid size-9 place-items-center rounded-full border border-border/60 hover:bg-muted">
            <ChevronRight className="size-4" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-y-0.5 px-2 pb-3 text-center sm:px-3">
          {WEEKDAYS.map((day, index) => (
            <span
              key={day}
              className={cn(
                "pb-2 pt-1 text-[10px] font-semibold uppercase tracking-wide",
                index === 0 || index === 6 ? "text-muted-foreground/50" : "text-muted-foreground/80",
              )}
            >
              {day}
            </span>
          ))}
          {cells.map((date, index) => {
            if (!date) return <span key={`pad-${index}`} />;
            const dayTasks = tasksOn(date);
            const dayEvents = eventsOn(date);
            const count = dayTasks.length + repeatsFor(date).length;
            const isHoliday = holidays.has(date);
            const isSelected = date === selected;
            const isToday = date === today;
            const preview = [
              ...dayEvents.map((event) => ({ title: event.title, color: colorOf(event) })),
              ...dayTasks.map((task) => ({ title: task.title, color: TASK_COLOR })),
            ];
            const shown = isHoliday ? 1 : 2;
            const more = preview.length - shown;
            return (
              <button
                key={date}
                type="button"
                onClick={() => setSelected(date)}
                aria-pressed={isSelected}
                data-no-glow
                aria-label={`${format(new Date(`${date}T12:00:00`), { weekday: "long", day: "numeric", month: "long" })}${count ? `, ${count} ${count === 1 ? "tarefa" : "tarefas"}` : ""}${dayEvents.length ? `, ${dayEvents.length} da agenda` : ""}${isHoliday ? `, feriado: ${holidays.get(date)!.name}` : ""}`}
                className={cn(
                  "group flex h-14 flex-col items-center gap-1 rounded-2xl p-1 transition-colors sm:h-24 sm:items-stretch sm:p-1.5 sm:text-left",
                  isSelected ? "bg-primary/[0.12] ring-1 ring-primary/50" : "hover:bg-muted/50",
                )}
              >
                <span
                  className={cn(
                    "grid size-8 shrink-0 place-items-center rounded-full text-sm tabular-nums transition-colors sm:size-7 sm:text-xs",
                    isSelected
                      ? "bg-primary font-bold text-primary-foreground shadow-[0_6px_16px_-6px] shadow-primary"
                      : isToday
                        ? "font-bold flowy-ink ring-2 ring-primary/60"
                        : isHoliday
                          ? "font-semibold text-amber-400"
                          : date < today
                            ? "text-muted-foreground/55"
                            : "font-medium",
                  )}
                >
                  {Number(date.slice(8))}
                </span>
                {/* Phones: one dot per kind. */}
                <span className="flex h-1.5 gap-0.5 sm:hidden" aria-hidden="true">
                  {count ? <i className="size-1.5 rounded-full bg-violet-400" /> : null}
                  {dayEvents.length ? <i className="size-1.5 rounded-full bg-sky-400" /> : null}
                  {isHoliday ? <i className="size-1.5 rounded-full bg-amber-400" /> : null}
                </span>
                {/* Wide screens: the first titles of the day. */}
                <span className="hidden min-w-0 flex-col gap-0.5 sm:flex" aria-hidden="true">
                  {isHoliday ? (
                    <span className="truncate rounded-md bg-amber-500/15 px-1.5 py-px text-[10px] text-amber-300">{holidays.get(date)!.name}</span>
                  ) : null}
                  {preview.slice(0, shown).map((item, position) => (
                    <span key={position} className="truncate rounded-md px-1.5 py-px text-[10px] text-foreground/85" style={{ backgroundColor: `${item.color}26` }}>
                      {item.title}
                    </span>
                  ))}
                  {more > 0 ? <span className="px-1.5 text-[10px] text-muted-foreground">+{more}</span> : null}
                </span>
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 border-t border-border/40 px-4 py-2.5 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <i className="size-2 rounded-full bg-violet-400" /> Tarefas
          </span>
          <span className="inline-flex items-center gap-1.5">
            <i className="size-2 rounded-full bg-sky-400" /> Agenda
          </span>
          <span className="inline-flex items-center gap-1.5">
            <i className="size-2 rounded-full bg-amber-400" /> Feriados
          </span>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-primary/15 text-center">
            <span>
              <span className="block text-[10px] font-semibold uppercase leading-none flowy-ink">
                {format(selectedDate, { weekday: "short" }).replace(".", "")}
              </span>
              <span className="mt-0.5 block font-brand text-2xl font-bold leading-none">{selectedDate.getDate()}</span>
            </span>
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg font-bold first-letter:uppercase">
              {selected === today ? "Hoje" : format(selectedDate, { weekday: "long" })}
            </h2>
            <p className="truncate text-xs text-muted-foreground">
              {format(selectedDate, { day: "numeric", month: "long" })} ·{" "}
              {entries.length ? `${entries.length} ${entries.length === 1 ? "item" : "itens"}` : "dia livre"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent("flowy:open-task-composer", { detail: { date: selected } }))}
            className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-[0_8px_20px_-10px] shadow-primary active:scale-95"
          >
            <Plus className="size-4" aria-hidden="true" />
            Tarefa
          </button>
        </div>

        {holiday ? (
          <p className="flex items-center gap-2.5 rounded-2xl border border-amber-400/25 bg-amber-500/10 px-3.5 py-2.5 text-sm text-amber-200">
            <Sparkles className="size-4 shrink-0 text-amber-400" aria-hidden="true" />
            <span>
              <b className="font-semibold">{holiday.optional ? "Ponto facultativo" : "Feriado"}</b> · {holiday.name}
            </span>
          </p>
        ) : null}

        {tasks.isLoading ? (
          <Skeleton className="h-16 w-full rounded-2xl" />
        ) : (
          <>
            {allDay.length ? (
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Dia inteiro</p>
                {allDay.map(renderEntry)}
              </div>
            ) : null}

            {timed.length ? (
              <ol className="space-y-2" aria-label="Horários do dia">
                {timed.map((entry, index) => (
                  <li key={index}>
                    {index === nowIndex ? (
                      <div className="mb-2 flex items-center gap-2 pl-14" aria-label="Agora">
                        <span className="size-2.5 rounded-full bg-rose-500 shadow-[0_0_10px] shadow-rose-500" />
                        <span className="h-px flex-1 bg-gradient-to-r from-rose-500 to-transparent" />
                        <span className="text-[10px] font-semibold text-rose-400">Agora</span>
                      </div>
                    ) : null}
                    <div className="flex gap-3">
                      <span className="w-11 shrink-0 pt-3 text-right text-xs font-semibold tabular-nums text-muted-foreground">{entry.time}</span>
                      <div className="min-w-0 flex-1">{renderEntry(entry, index)}</div>
                    </div>
                  </li>
                ))}
              </ol>
            ) : null}
          </>
        )}

        {empty && !tasks.isLoading ? (
          <div className="rounded-2xl border border-dashed border-border/60 px-4 py-8 text-center">
            <CalendarDays className="mx-auto size-6 text-muted-foreground/60" aria-hidden="true" />
            <p className="mt-2 text-sm text-muted-foreground">Nada marcado para este dia.</p>
          </div>
        ) : null}

        {feed.data?.tasksAllowed === false ? (
          // Connected before Tarefas were asked for: one tap gives the permission.
          <a
            href="/api/calendar/google/start"
            className="mt-2 flex items-center justify-center gap-2 rounded-2xl border border-sky-400/40 bg-sky-500/10 px-3 py-2.5 text-sm font-semibold text-sky-200"
          >
            <Circle className="size-4" aria-hidden="true" />
            Mostrar também suas Tarefas do Google
          </a>
        ) : null}

        {feed.data?.error ? (
          <p className="pt-2 text-center text-xs text-amber-300">{feed.data.error} Tente de novo em alguns minutos.</p>
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
