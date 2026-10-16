"use client";

import type { MouseEvent, ReactNode } from "react";
import { BellRing, CalendarDays, Clock3, X } from "lucide-react";

import { localDateKey, tomorrowDateKey } from "@/features/tasks/date-utils";
import { cn } from "@/lib/utils";

interface TaskScheduleFieldsProps {
  dueDate: string;
  dueTime: string;
  onDueDateChange: (value: string) => void;
  onDueTimeChange: (value: string) => void;
  idPrefix: string;
}

function formatDateLabel(value: string): string {
  if (!value) return "Adicionar";
  if (value === localDateKey()) return "Hoje";
  if (value === tomorrowDateKey()) return "Amanhã";
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return value;
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  }).format(new Date(year, month - 1, day));
}

// Native pickers only open from their own icon on desktop; showPicker opens them
// from anywhere on the tile. Unsupported browsers keep the default behaviour.
function openPicker(event: MouseEvent<HTMLInputElement>) {
  try {
    event.currentTarget.showPicker?.();
  } catch {
    // Some browsers reject showPicker outside trusted gestures.
  }
}

function ScheduleTile({
  id,
  icon,
  label,
  value,
  empty,
  onClear,
  clearLabel,
  children,
}: {
  id: string;
  icon: ReactNode;
  label: string;
  value: string;
  empty: boolean;
  onClear: () => void;
  clearLabel: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "group relative flex min-h-14 min-w-0 items-center gap-3 rounded-2xl border px-3 transition-all focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20",
        empty
          ? "border-dashed border-border/60 bg-muted/10 hover:bg-muted/30"
          : "border-primary/30 bg-primary/5 hover:bg-primary/10",
      )}
    >
      <span
        className={cn(
          "grid size-8 shrink-0 place-items-center rounded-xl transition-colors",
          empty ? "bg-muted/40 text-muted-foreground" : "bg-primary/15 text-primary",
        )}
        aria-hidden="true"
      >
        {icon}
      </span>
      <label htmlFor={id} className="min-w-0 flex-1 cursor-pointer">
        <span className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <span
          className={cn(
            "block truncate text-sm font-medium first-letter:uppercase",
            empty ? "text-muted-foreground" : "text-foreground",
          )}
        >
          {value}
        </span>
      </label>
      {children}
      {!empty ? (
        <button
          type="button"
          onClick={onClear}
          aria-label={clearLabel}
          className="relative z-10 grid size-7 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="size-3.5" />
        </button>
      ) : null}
    </div>
  );
}

const nativeInputClass =
  "absolute inset-0 z-0 h-full w-full cursor-pointer appearance-none opacity-0";

export function TaskScheduleFields({
  dueDate,
  dueTime,
  onDueDateChange,
  onDueTimeChange,
  idPrefix,
}: TaskScheduleFieldsProps) {
  const today = localDateKey();
  const tomorrow = tomorrowDateKey();
  const dateId = `${idPrefix}-date`;
  const timeId = `${idPrefix}-time`;

  function changeDate(value: string) {
    onDueDateChange(value);
    if (!value) onDueTimeChange("");
  }

  function changeTime(value: string) {
    onDueTimeChange(value);
    // A time needs a day; picking one first assumes today.
    if (value && !dueDate) onDueDateChange(today);
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <ScheduleTile
          id={dateId}
          icon={<CalendarDays className="size-4" />}
          label="Data"
          value={formatDateLabel(dueDate)}
          empty={!dueDate}
          onClear={() => changeDate("")}
          clearLabel="Remover data"
        >
          <input
            id={dateId}
            type="date"
            value={dueDate}
            onChange={(event) => changeDate(event.target.value)}
            onClick={openPicker}
            className={nativeInputClass}
          />
        </ScheduleTile>

        <ScheduleTile
          id={timeId}
          icon={<Clock3 className="size-4" />}
          label="Horário"
          value={dueTime || "Adicionar"}
          empty={!dueTime}
          onClear={() => onDueTimeChange("")}
          clearLabel="Remover horário"
        >
          <input
            id={timeId}
            type="time"
            value={dueTime}
            onChange={(event) => changeTime(event.target.value)}
            onClick={openPicker}
            className={nativeInputClass}
          />
        </ScheduleTile>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {[
          { label: "Hoje", value: today },
          { label: "Amanhã", value: tomorrow },
        ].map((option) => (
          <button
            key={option.label}
            type="button"
            onClick={() => changeDate(option.value)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              dueDate === option.value
                ? "border-primary/40 bg-primary/15 text-primary"
                : "border-border/60 text-muted-foreground hover:bg-muted/40 hover:text-foreground",
            )}
          >
            {option.label}
          </button>
        ))}
        {dueTime ? (
          <span className="ml-auto inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <BellRing className="size-3.5 text-primary" aria-hidden="true" />
            Lembrete às {dueTime}
          </span>
        ) : null}
      </div>
    </div>
  );
}
