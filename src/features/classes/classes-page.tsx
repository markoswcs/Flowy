"use client";

import {
  Briefcase,
  CalendarCheck,
  CalendarRange,
  Clock,
  Dumbbell,
  GraduationCap,
  List,
  MapPin,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  X,
  type LucideIcon,
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
  layoutLanes,
  type ClassSlot,
  type ClassSlotInput,
  type RoutineKind,
} from "./schedule";
import { SubjectSheet } from "./subject-sheet";
import { useClasses, useDeleteClass, useSaveClass } from "./use-classes";

// Monday first, like a work or school week.
const WEEK = [1, 2, 3, 4, 5, 6, 0];
const EMPTY: ClassSlotInput = {
  kind: "aula",
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

/** What each item of the routine is: its icon, a hint for the name and its colour. */
const KINDS: {
  kind: RoutineKind;
  label: string;
  icon: LucideIcon;
  placeholder: string;
  color: string;
}[] = [
  {
    kind: "aula",
    label: "Aula",
    icon: GraduationCap,
    placeholder: "Matéria (ex.: Anatomia)",
    color: "#8b5cf6",
  },
  {
    kind: "trabalho",
    label: "Trabalho",
    icon: Briefcase,
    placeholder: "Ex.: Expediente, Reunião semanal",
    color: "#38bdf8",
  },
  {
    kind: "treino",
    label: "Treino",
    icon: Dumbbell,
    placeholder: "Ex.: Academia, Corrida",
    color: "#34d399",
  },
  {
    kind: "compromisso",
    label: "Compromisso",
    icon: CalendarCheck,
    placeholder: "Ex.: Curso de inglês, Terapia",
    color: "#f59e0b",
  },
  {
    kind: "outro",
    label: "Outro",
    icon: Sparkles,
    placeholder: "O que é?",
    color: "#f472b6",
  },
];
const kindOf = (slot: Pick<ClassSlot, "kind">) =>
  KINDS.find((item) => item.kind === (slot.kind ?? "aula")) ?? KINDS[0]!;

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
        <p className="font-semibold">{editing ? "Editar" : "Novo na rotina"}</p>
        <button
          type="button"
          onClick={onDone}
          aria-label="Fechar"
          className="grid size-8 place-items-center rounded-full text-muted-foreground hover:bg-muted"
        >
          <X className="size-4" />
        </button>
      </div>
      <div
        className="flex flex-wrap gap-1.5"
        role="radiogroup"
        aria-label="Tipo"
      >
        {KINDS.map(({ kind, label, icon: Icon, color: tone }) => {
          const on = (form.kind ?? "aula") === kind;
          return (
            <button
              key={kind}
              type="button"
              role="radio"
              aria-checked={on}
              data-no-glow
              onClick={() => setForm({ ...form, kind })}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                on
                  ? "border-transparent text-white"
                  : "border-border/60 text-muted-foreground",
              )}
              style={on ? { backgroundColor: tone } : undefined}
            >
              <Icon className="size-3.5" /> {label}
            </button>
          );
        })}
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
          placeholder={
            KINDS.find((item) => item.kind === (form.kind ?? "aula"))!
              .placeholder
          }
          aria-label="Nome"
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
                data-no-glow
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
            data-no-glow
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
            : "Salvar"}
      </Button>
    </form>
  );
}

function ClassCard({
  slot,
  onOpen,
  onEdit,
  onDelete,
  live,
}: {
  slot: ClassSlot;
  onOpen: () => void;
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
        onClick={onOpen}
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
            <KindIcon slot={slot} />
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

function KindIcon({ slot }: { slot: Pick<ClassSlot, "kind"> }) {
  const { icon: Icon, label, color } = kindOf(slot);
  return (
    <span
      className="grid size-5 shrink-0 place-items-center rounded-md"
      style={{ backgroundColor: `${color}26`, color }}
      title={label}
    >
      <Icon className="size-3" aria-hidden="true" />
    </span>
  );
}

const LONG_DAY = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];

/** The dates of this week, Monday first, by weekday (0 = Sunday). */
function weekDates() {
  const base = now();
  const monday = new Date(base);
  monday.setDate(base.getDate() - ((base.getDay() + 6) % 7));
  const dates: Record<number, Date> = {};
  WEEK.forEach((weekday, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    dates[weekday] = date;
  });
  return dates;
}

function minutesLabel(total: number) {
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  return hours
    ? `${hours}h${rest ? String(rest).padStart(2, "0") : ""}`
    : `${rest} min`;
}

/**
 * Phones: the whole week as a small calendar (days across, hours down, a
 * coloured block where each item falls), and below it the chosen day in
 * detail: what, when, how long and where.
 */
function DayView({
  slots,
  onEdit,
  today,
  ongoingId,
}: {
  slots: ClassSlot[];
  onEdit: (slot: ClassSlot) => void;
  today: number;
  ongoingId: string | null;
}) {
  const [day, setDay] = useState(today);
  const dates = weekDates();
  const start =
    Math.floor(
      Math.min(...slots.map((slot) => toMinutes(slot.starts_at))) / 60,
    ) * 60;
  const end =
    Math.ceil(Math.max(...slots.map((slot) => toMinutes(slot.ends_at))) / 60) *
    60;
  const span = Math.max(60, end - start);
  // The overview keeps a fixed height; hours are marked along the side.
  const height = Math.min(260, Math.max(120, span * 0.9));
  const scale = height / span;
  const step = span > 6 * 60 ? 120 : 60;
  const hours = Array.from(
    { length: Math.floor(span / step) + 1 },
    (_, index) => start + index * step,
  );
  const items = slots
    .filter((slot) => slot.weekday === day)
    .sort((a, b) => toMinutes(a.starts_at) - toMinutes(b.starts_at));
  const dayMinutes = items.reduce((sum, slot) => sum + length(slot), 0);

  return (
    <div className="space-y-4">
      {/* The week at a glance. */}
      <section
        className="rounded-[1.5rem] border border-border/60 bg-card/40 p-2.5"
        aria-label="Semana"
      >
        <div className="grid grid-cols-[1.75rem_repeat(7,minmax(0,1fr))] gap-x-1">
          <span />
          {WEEK.map((weekday) => {
            const on = weekday === day;
            const isToday = weekday === today;
            return (
              <button
                key={weekday}
                type="button"
                data-no-glow
                aria-pressed={on}
                onClick={() => setDay(weekday)}
                className={cn(
                  "flex flex-col items-center rounded-xl py-1.5 transition-colors",
                  on
                    ? "bg-primary text-primary-foreground"
                    : isToday
                      ? "flowy-ink"
                      : "text-muted-foreground",
                )}
              >
                <span className="text-[10px] font-semibold uppercase">
                  {WEEKDAY_NAMES[weekday]!.slice(0, 3)}
                </span>
                <span className="font-brand text-base font-bold leading-tight">
                  {dates[weekday]!.getDate()}
                </span>
              </button>
            );
          })}

          <div className="relative mt-2" style={{ height }}>
            {hours.map((hour) => (
              <span
                key={hour}
                className="absolute right-0.5 -translate-y-1/2 text-[9px] tabular-nums text-muted-foreground"
                style={{ top: (hour - start) * scale }}
              >
                {String(hour / 60).padStart(2, "0")}h
              </span>
            ))}
          </div>
          {WEEK.map((weekday) => (
            <button
              key={weekday}
              type="button"
              data-no-glow
              aria-label={`Ver ${LONG_DAY[weekday]}`}
              onClick={() => setDay(weekday)}
              className={cn(
                "relative mt-2 rounded-lg transition-colors",
                weekday === day
                  ? "bg-primary/10 ring-1 ring-primary/40"
                  : weekday === today
                    ? "bg-muted/40"
                    : "bg-muted/20",
              )}
              style={{ height }}
            >
              {hours.map((hour) => (
                <span
                  key={hour}
                  className="absolute inset-x-0 border-t border-border/25"
                  style={{ top: (hour - start) * scale }}
                  aria-hidden="true"
                />
              ))}
              {layoutLanes(
                slots.filter((slot) => slot.weekday === weekday),
              ).map(({ item: slot, lane, lanes }) => (
                <span
                  key={slot.id}
                  className="absolute rounded-[5px]"
                  style={{
                    left: `calc(${(lane / lanes) * 100}% + 1.5px)`,
                    width: `calc(${100 / lanes}% - 3px)`,
                    top: (toMinutes(slot.starts_at) - start) * scale,
                    height: Math.max(6, length(slot) * scale - 1.5),
                    backgroundColor: colorOf(slot.name),
                    opacity: weekday === day ? 1 : 0.75,
                  }}
                />
              ))}
            </button>
          ))}
        </div>
      </section>

      {/* The chosen day, in detail. */}
      <section aria-label={LONG_DAY[day]}>
        <div className="mb-2.5 flex items-baseline justify-between gap-2 px-1">
          <h2 className="text-lg font-bold">
            {LONG_DAY[day]}, {dates[day]!.getDate()}
            {day === today ? (
              <span className="ml-2 rounded-full bg-primary/15 px-2 py-0.5 align-middle text-[10px] font-bold flowy-ink">
                HOJE
              </span>
            ) : null}
          </h2>
          <span className="shrink-0 text-xs text-muted-foreground">
            {items.length
              ? `${items.length} ${items.length === 1 ? "item" : "itens"} · ${minutesLabel(dayMinutes)}`
              : "Livre"}
          </span>
        </div>
        {items.length ? (
          <ol className="space-y-2">
            {items.map((slot, index) => {
              const color = colorOf(slot.name);
              const { icon: Icon, label } = kindOf(slot);
              const sameTime = items.some(
                (other, position) =>
                  position !== index &&
                  other.starts_at < slot.ends_at &&
                  slot.starts_at < other.ends_at,
              );
              return (
                <li key={slot.id}>
                  <button
                    type="button"
                    onClick={() => onEdit(slot)}
                    className={cn(
                      "flex w-full items-stretch gap-3 rounded-2xl border bg-card/50 p-3 text-left transition-colors active:scale-[0.99]",
                      ongoingId === slot.id
                        ? "border-transparent ring-2"
                        : "border-border/50",
                    )}
                    style={
                      ongoingId === slot.id
                        ? { ["--tw-ring-color" as string]: color }
                        : undefined
                    }
                  >
                    <span className="flex w-12 shrink-0 flex-col justify-between text-right tabular-nums">
                      <span className="text-sm font-bold">
                        {hhmm(slot.starts_at)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {hhmm(slot.ends_at)}
                      </span>
                    </span>
                    <span
                      className="w-1 shrink-0 rounded-full"
                      style={{ backgroundColor: color }}
                      aria-hidden="true"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate font-semibold">
                          {slot.name}
                        </span>
                        {ongoingId === slot.id ? (
                          <span
                            className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
                            style={{ backgroundColor: color }}
                          >
                            AGORA
                          </span>
                        ) : null}
                      </span>
                      <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Icon
                            className="size-3.5"
                            style={{ color }}
                            aria-hidden="true"
                          />{" "}
                          {label}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Clock className="size-3.5" aria-hidden="true" />{" "}
                          {minutesLabel(length(slot))}
                        </span>
                        {slot.room ? (
                          <span className="inline-flex min-w-0 items-center gap-1">
                            <MapPin
                              className="size-3.5 shrink-0"
                              aria-hidden="true"
                            />
                            <span className="truncate">{slot.room}</span>
                          </span>
                        ) : null}
                        {sameTime ? (
                          <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                            mesmo horário
                          </span>
                        ) : null}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="rounded-2xl border border-dashed border-border/60 py-8 text-center text-sm text-muted-foreground">
            Nada na {LONG_DAY[day]!.split("-")[0]!.toLowerCase()}. Dia livre!
          </p>
        )}
      </section>
    </div>
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
            {layoutLanes(slots.filter((slot) => slot.weekday === weekday)).map(
              ({ item: slot, lane, lanes }) => {
                const color = colorOf(slot.name);
                return (
                  <button
                    key={slot.id}
                    type="button"
                    onClick={() => onEdit(slot)}
                    className="absolute overflow-hidden rounded-lg border px-1.5 py-1 text-left text-[11px] leading-tight transition-transform hover:z-10 hover:scale-[1.03]"
                    style={{
                      // Items at the same time share the column side by side.
                      left: `calc(${(lane / lanes) * 100}% + 2px)`,
                      width: `calc(${100 / lanes}% - 4px)`,
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
              },
            )}
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

  const [opened, setOpened] = useState<ClassSlot | null>(null);
  const edit = (slot: ClassSlot) =>
    setEditing({
      id: slot.id,
      name: slot.name,
      room: slot.room,
      weekday: slot.weekday,
      starts_at: hhmm(slot.starts_at),
      ends_at: hhmm(slot.ends_at),
      kind: slot.kind ?? "aula",
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
              Rotina semanal
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {slots.length
                ? `${slots.length} ${slots.length === 1 ? "item" : "itens"} · ${subjects} ${subjects === 1 ? "atividade" : "atividades"} · ${Math.round((weeklyMinutes / 60) * 10) / 10} h por semana`
                : "Aulas, trabalho, treino e compromissos fixos da semana. No Hoje aparece o de agora e o próximo."}
            </p>
          </div>
        </div>
        {!editing ? (
          <Button type="button" className="h-11 gap-2" onClick={newClass}>
            <Plus className="size-4" />
            Adicionar
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
          aria-label={ongoing ? "Agora" : "Próximo"}
        >
          <p
            className="text-[11px] font-bold uppercase tracking-widest"
            style={{ color: colorOf(highlight.name) }}
          >
            {ongoing
              ? "Acontecendo agora"
              : `Próximo ${minutesToNext !== null ? inTime(minutesToNext) : ""}`}
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
            Aulas, expediente, academia, curso, terapia: tudo o que se repete
            toda semana, com dia, horário e local. Dá para colocar em vários
            dias de uma vez.
          </p>
          <Button type="button" className="mt-5 h-11 gap-2" onClick={newClass}>
            <Plus className="size-4" />
            Adicionar o primeiro
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
                data-no-glow
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
            <>
              <div className="sm:hidden">
                <DayView
                  slots={slots}
                  onEdit={setOpened}
                  today={today}
                  ongoingId={ongoing?.id ?? null}
                />
              </div>
              <div className="hidden sm:block">
                <WeekGrid slots={slots} onEdit={setOpened} today={today} />
              </div>
            </>
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
                      · {day.length} {day.length === 1 ? "item" : "itens"}
                    </span>
                  </h2>
                  <ul className="space-y-2">
                    {day.map((slot) => (
                      <li key={slot.id}>
                        <ClassCard
                          slot={slot}
                          live={ongoing?.id === slot.id}
                          onOpen={() => setOpened(slot)}
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
            Toque num item para ver a pasta e os horários.
          </p>
        </>
      ) : null}
      {opened ? (
        <SubjectSheet
          slot={opened}
          slots={slots}
          color={colorOf(opened.name)}
          kindLabel={kindOf(opened).label}
          onEdit={(slot) => {
            setOpened(null);
            edit(slot);
            window.setTimeout(
              () => window.scrollTo({ top: 0, behavior: "smooth" }),
              50,
            );
          }}
          onClose={() => setOpened(null)}
        />
      ) : null}
    </div>
  );
}
