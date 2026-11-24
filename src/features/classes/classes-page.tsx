"use client";

import {
  CalendarRange,
  Clock,
  GraduationCap,
  List,
  MapPin,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import {
  WEEKDAY_NAMES,
  classNow,
  hhmm,
  inTime,
  type ClassSlot,
  type ClassSlotInput,
} from "./schedule";
import { useClasses, useDeleteClass, useSaveClass } from "./use-classes";

// Monday first, like a school week.
const WEEK = [1, 2, 3, 4, 5, 6, 0];
const EMPTY: ClassSlotInput = {
  name: "",
  room: "",
  weekday: 1,
  starts_at: "08:00",
  ends_at: "09:40",
};
const LENGTHS = [
  { label: "50 min", minutes: 50 },
  { label: "1h40", minutes: 100 },
  { label: "2h", minutes: 120 },
  { label: "3h20", minutes: 200 },
];

/** Each subject keeps the same colour everywhere. */
const PALETTE = [
  "#8b5cf6",
  "#38bdf8",
  "#34d399",
  "#f59e0b",
  "#f472b6",
  "#fb7185",
  "#a3e635",
  "#22d3ee",
];
function colorOf(name: string) {
  let hash = 0;
  for (const char of name.trim().toLowerCase())
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return PALETTE[hash % PALETTE.length]!;
}

const toMinutes = (time: string) =>
  Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
const toTime = (total: number) =>
  `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
const length = (slot: Pick<ClassSlot, "starts_at" | "ends_at">) =>
  toMinutes(slot.ends_at) - toMinutes(slot.starts_at);
const now = () => new Date();

function ClassForm({
  initial,
  onDone,
}: {
  initial: ClassSlotInput & { id?: string };
  onDone: () => void;
}) {
  const [form, setForm] = useState(initial);
  // A new class can go on several days at once.
  const [days, setDays] = useState<number[]>([initial.weekday]);
  const save = useSaveClass();
  const editing = Boolean(initial.id);
  const valid =
    form.name.trim() && form.ends_at > form.starts_at && days.length > 0;
  const color = colorOf(form.name || "x");

  async function submit() {
    if (!valid) return;
    if (editing) {
      save.mutate({ ...form, weekday: days[0]! }, { onSuccess: onDone });
      return;
    }
    for (const weekday of days) await save.mutateAsync({ ...form, weekday });
    onDone();
  }

  return (
    <form
      className="space-y-4 rounded-[1.5rem] border bg-card/70 p-4 shadow-xl animate-in fade-in slide-in-from-top-2"
      style={{ borderColor: `${color}66` }}
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <div className="flex items-center justify-between">
        <p className="font-semibold">{editing ? "Editar aula" : "Nova aula"}</p>
        <button
          type="button"
          onClick={onDone}
          aria-label="Fechar"
          className="grid size-8 place-items-center rounded-full text-muted-foreground hover:bg-muted"
        >
          <X className="size-4" />
        </button>
      </div>
      <div className="flex items-center gap-2">
        <span
          className="size-3 shrink-0 rounded-full"
          style={{ backgroundColor: color }}
          aria-hidden="true"
        />
        <Input
          autoFocus
          value={form.name}
          onChange={(event) => setForm({ ...form, name: event.target.value })}
          placeholder="Matéria (ex.: Anatomia)"
          aria-label="Matéria"
          maxLength={80}
        />
      </div>
      <div className="relative">
        <MapPin
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          value={form.room ?? ""}
          onChange={(event) => setForm({ ...form, room: event.target.value })}
          placeholder="Sala ou local (opcional)"
          aria-label="Sala"
          maxLength={60}
          className="pl-9"
        />
      </div>
      <div>
        <p className="mb-1.5 text-xs font-medium text-muted-foreground">
          {editing ? "Dia" : "Dias (toque em mais de um para repetir)"}
        </p>
        <div
          className="flex flex-wrap gap-1.5"
          role="group"
          aria-label="Dias da semana"
        >
          {WEEK.map((weekday) => {
            const on = days.includes(weekday);
            return (
              <button
                key={weekday}
                type="button"
                aria-pressed={on}
                onClick={() =>
                  setDays(
                    editing
                      ? [weekday]
                      : on
                        ? days.filter((day) => day !== weekday)
                        : [...days, weekday],
                  )
                }
                className={cn(
                  "min-w-11 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                  on
                    ? "border-transparent text-white"
                    : "border-border/60 text-muted-foreground",
                )}
                style={on ? { backgroundColor: color } : undefined}
              >
                {WEEKDAY_NAMES[weekday]!.slice(0, 3)}
              </button>
            );
          })}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs text-muted-foreground">
          Começa
          <Input
            type="time"
            value={hhmm(form.starts_at)}
            onChange={(event) => {
              const keep = length(form);
              const starts = event.target.value;
              setForm({
                ...form,
                starts_at: starts,
                ends_at: starts
                  ? toTime(toMinutes(starts) + Math.max(keep, 30))
                  : form.ends_at,
              });
            }}
          />
        </label>
        <label className="text-xs text-muted-foreground">
          Termina
          <Input
            type="time"
            value={hhmm(form.ends_at)}
            onChange={(event) =>
              setForm({ ...form, ends_at: event.target.value })
            }
          />
        </label>
      </div>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Duração">
        {LENGTHS.map((option) => (
          <button
            key={option.label}
            type="button"
            aria-pressed={length(form) === option.minutes}
            onClick={() =>
              setForm({
                ...form,
                ends_at: toTime(toMinutes(form.starts_at) + option.minutes),
              })
            }
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition-colors",
              length(form) === option.minutes
                ? "bg-primary/20 text-foreground"
                : "bg-muted/40 text-muted-foreground hover:text-foreground",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
      <Button
        type="submit"
        className="h-11 w-full"
        disabled={!valid}
        loading={save.isPending}
      >
        {editing
          ? "Salvar"
          : days.length > 1
            ? `Salvar em ${days.length} dias`
            : "Salvar aula"}
      </Button>
    </form>
  );
}

function ClassCard({
  slot,
  onEdit,
  onDelete,
  live,
}: {
  slot: ClassSlot;
  onEdit: () => void;
  onDelete: () => void;
  live?: boolean;
}) {
  const color = colorOf(slot.name);
  return (
    <article
      className="group relative flex items-center gap-3 overflow-hidden rounded-2xl border p-3 transition-colors"
      style={{
        borderColor: live ? color : `${color}40`,
        background: `linear-gradient(90deg, ${color}24, ${color}08 70%)`,
      }}
    >
      <span
        aria-hidden="true"
        className="absolute inset-y-2 left-0 w-1 rounded-r-full"
        style={{ backgroundColor: color }}
      />
      <button
        type="button"
        onClick={onEdit}
        className="flex min-w-0 flex-1 items-center gap-3 pl-1 text-left"
      >
        <span
          className="w-[4.5rem] shrink-0 text-sm font-bold tabular-nums leading-tight"
          style={{ color }}
        >
          {hhmm(slot.starts_at)}
          <span className="block text-xs font-medium text-muted-foreground">
            {hhmm(slot.ends_at)}
          </span>
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="truncate font-semibold">{slot.name}</span>
            {live ? (
              <span
                className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
                style={{ backgroundColor: color }}
              >
                AGORA
              </span>
            ) : null}
          </span>
          {slot.room ? (
            <span className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
              <MapPin className="size-3 shrink-0" aria-hidden="true" />
              {slot.room}
            </span>
          ) : null}
        </span>
      </button>
      <div className="flex shrink-0 items-center opacity-70 transition-opacity group-hover:opacity-100">
        <button
          type="button"
          aria-label={`Editar ${slot.name}`}
          onClick={onEdit}
          className="grid size-9 place-items-center rounded-full text-muted-foreground hover:bg-white/10 hover:text-foreground"
        >
          <Pencil className="size-4" />
        </button>
        <button
          type="button"
          aria-label={`Apagar ${slot.name}`}
          onClick={onDelete}
          className="grid size-9 place-items-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 className="size-4" />
        </button>
      </div>
    </article>
  );
}

/** The week as a timetable: one column per day, each class as a block at its hour. */
function WeekGrid({
  slots,
  onEdit,
  today,
}: {
  slots: ClassSlot[];
  onEdit: (slot: ClassSlot) => void;
  today: number;
}) {
  const days = WEEK.filter(
    (weekday) => weekday !== 0 || slots.some((slot) => slot.weekday === 0),
  );
  const start =
    Math.floor(
      Math.min(...slots.map((slot) => toMinutes(slot.starts_at))) / 60,
    ) * 60;
  const end =
    Math.ceil(Math.max(...slots.map((slot) => toMinutes(slot.ends_at))) / 60) *
    60;
  const hours = Array.from(
    { length: (end - start) / 60 + 1 },
    (_, index) => start + index * 60,
  );
  const scale = 0.9; // px per minute
  return (
    <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <div
        className="grid min-w-[640px] gap-1.5"
        style={{
          gridTemplateColumns: `2.5rem repeat(${days.length}, minmax(0, 1fr))`,
        }}
      >
        <span />
        {days.map((weekday) => (
          <span
            key={weekday}
            className={cn(
              "rounded-lg py-1.5 text-center text-xs font-semibold",
              weekday === today
                ? "bg-primary/15 flowy-ink"
                : "text-muted-foreground",
            )}
          >
            {WEEKDAY_NAMES[weekday]!.slice(0, 3)}
          </span>
        ))}
        <div className="relative" style={{ height: (end - start) * scale }}>
          {hours.map((hour) => (
            <span
              key={hour}
              className="absolute right-1 -translate-y-1/2 text-[10px] tabular-nums text-muted-foreground"
              style={{ top: (hour - start) * scale }}
            >
              {String(hour / 60).padStart(2, "0")}h
            </span>
          ))}
        </div>
        {days.map((weekday) => (
          <div
            key={weekday}
            className={cn(
              "relative rounded-xl border border-border/40",
              weekday === today ? "bg-primary/[0.05]" : "bg-card/30",
            )}
            style={{ height: (end - start) * scale }}
          >
            {hours.map((hour) => (
              <span
                key={hour}
                className="absolute inset-x-0 border-t border-border/30"
                style={{ top: (hour - start) * scale }}
                aria-hidden="true"
              />
            ))}
            {slots
              .filter((slot) => slot.weekday === weekday)
              .map((slot) => {
                const color = colorOf(slot.name);
                return (
                  <button
                    key={slot.id}
                    type="button"
                    onClick={() => onEdit(slot)}
                    className="absolute inset-x-1 overflow-hidden rounded-lg border px-1.5 py-1 text-left text-[11px] leading-tight transition-transform hover:z-10 hover:scale-[1.03]"
                    style={{
                      top: (toMinutes(slot.starts_at) - start) * scale,
                      height: Math.max(22, length(slot) * scale - 2),
                      backgroundColor: `${color}2e`,
                      borderColor: `${color}66`,
                    }}
                  >
                    <span className="block truncate font-semibold">
                      {slot.name}
                    </span>
                    <span className="block truncate text-[10px] text-muted-foreground">
                      {hhmm(slot.starts_at)}
                      {slot.room ? ` · ${slot.room}` : ""}
                    </span>
                  </button>
                );
              })}
          </div>
        ))}
      </div>
    </div>
  );
}

/** The fixed weekly classes: what is on now, the week at a glance and the list by day. */
export function ClassesPage() {
  const classes = useClasses();
  const remove = useDeleteClass();
  const [editing, setEditing] = useState<
    (ClassSlotInput & { id?: string }) | null
  >(null);
  const [view, setView] = useState<"semana" | "lista">("semana");
  const slots = classes.data ?? [];
  const today = now().getDay();
  const { ongoing, next, minutesToNext } = classNow(slots, now());
  const weeklyMinutes = slots.reduce((sum, slot) => sum + length(slot), 0);
  const subjects = new Set(slots.map((slot) => slot.name.trim().toLowerCase()))
    .size;
  const highlight = ongoing ?? next;
  const newClass = () =>
    setEditing({ ...EMPTY, weekday: today === 0 ? 1 : today });

  const edit = (slot: ClassSlot) =>
    setEditing({
      id: slot.id,
      name: slot.name,
      room: slot.room,
      weekday: slot.weekday,
      starts_at: hhmm(slot.starts_at),
      ends_at: hhmm(slot.ends_at),
    });

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-pink-500 to-violet-600 text-white shadow-xl">
            <GraduationCap className="size-7" aria-hidden="true" />
          </span>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Grade de aulas
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {slots.length
                ? `${subjects} ${subjects === 1 ? "matéria" : "matérias"} · ${slots.length} ${slots.length === 1 ? "aula" : "aulas"} · ${Math.round((weeklyMinutes / 60) * 10) / 10} h por semana`
                : "Cadastre uma vez. No Hoje aparece a aula de agora e a próxima."}
            </p>
          </div>
        </div>
        {!editing ? (
          <Button type="button" className="h-11 gap-2" onClick={newClass}>
            <Plus className="size-4" />
            Adicionar aula
          </Button>
        ) : null}
      </header>

      {editing && !editing.id ? (
        <ClassForm initial={editing} onDone={() => setEditing(null)} />
      ) : null}

      {highlight && !editing ? (
        <section
          className="relative overflow-hidden rounded-[1.5rem] border p-4 sm:p-5"
          style={{
            borderColor: `${colorOf(highlight.name)}55`,
            background: `linear-gradient(120deg, ${colorOf(highlight.name)}30, transparent 70%)`,
          }}
          aria-label={ongoing ? "Aula de agora" : "Próxima aula"}
        >
          <p
            className="text-[11px] font-bold uppercase tracking-widest"
            style={{ color: colorOf(highlight.name) }}
          >
            {ongoing
              ? "Acontecendo agora"
              : `Próxima ${minutesToNext !== null ? inTime(minutesToNext) : ""}`}
          </p>
          <p className="mt-1 font-brand text-2xl font-bold">{highlight.name}</p>
          <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Clock className="size-4" /> {hhmm(highlight.starts_at)} –{" "}
              {hhmm(highlight.ends_at)}
            </span>
            {highlight.room ? (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="size-4" /> {highlight.room}
              </span>
            ) : null}
          </p>
          {ongoing && next ? (
            <p className="mt-2 text-xs text-muted-foreground">
              Depois: {next.name} às {hhmm(next.starts_at)}
            </p>
          ) : null}
        </section>
      ) : null}

      {classes.isLoading ? (
        <Skeleton className="h-48 w-full rounded-3xl" />
      ) : !slots.length && !editing ? (
        <section className="flex flex-col items-center rounded-[1.75rem] border border-dashed border-border/60 px-6 py-10 text-center">
          <span className="grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-pink-500 to-violet-600 text-white shadow-xl">
            <CalendarRange className="size-7" />
          </span>
          <h2 className="mt-4 text-lg font-semibold">Monte sua semana</h2>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Adicione cada matéria com dia, horário e sala. Dá para colocar a
            mesma aula em vários dias de uma vez.
          </p>
          <Button type="button" className="mt-5 h-11 gap-2" onClick={newClass}>
            <Plus className="size-4" />
            Adicionar a primeira aula
          </Button>
        </section>
      ) : slots.length ? (
        <>
          <div
            className="flex rounded-xl border border-border/60 bg-card/40 p-1"
            role="group"
            aria-label="Ver como"
          >
            {(
              [
                ["semana", "Semana", CalendarRange],
                ["lista", "Por dia", List],
              ] as const
            ).map(([value, label, Icon]) => (
              <button
                key={value}
                type="button"
                aria-pressed={view === value}
                onClick={() => setView(value)}
                className={cn(
                  "flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-semibold transition-colors",
                  view === value
                    ? "bg-primary/15 text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="size-4" /> {label}
              </button>
            ))}
          </div>

          {editing?.id ? (
            <ClassForm
              key={editing.id}
              initial={editing}
              onDone={() => setEditing(null)}
            />
          ) : null}

          {view === "semana" ? (
            <WeekGrid slots={slots} onEdit={edit} today={today} />
          ) : (
            WEEK.map((weekday) => {
              const day = slots
                .filter((slot) => slot.weekday === weekday)
                .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
              if (!day.length) return null;
              return (
                <section key={weekday} aria-label={WEEKDAY_NAMES[weekday]}>
                  <h2
                    className={cn(
                      "mb-2 flex items-center gap-2 text-sm font-semibold",
                      weekday === today && "flowy-ink",
                    )}
                  >
                    {WEEKDAY_NAMES[weekday]}
                    {weekday === today ? (
                      <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px]">
                        HOJE
                      </span>
                    ) : null}
                    <span className="text-xs font-normal text-muted-foreground">
                      · {day.length} {day.length === 1 ? "aula" : "aulas"}
                    </span>
                  </h2>
                  <ul className="space-y-2">
                    {day.map((slot) => (
                      <li key={slot.id}>
                        <ClassCard
                          slot={slot}
                          live={ongoing?.id === slot.id}
                          onEdit={() => edit(slot)}
                          onDelete={() => remove.mutate(slot.id)}
                        />
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })
          )}
          <p className="text-center text-xs text-muted-foreground">
            Toque numa aula para editar.
          </p>
        </>
      ) : null}
    </div>
  );
}
