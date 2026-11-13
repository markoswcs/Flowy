"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { localDateKey } from "@/features/tasks/date-utils";
import { HOURS, MINUTES, QUICK_TIMES, inOneHour, monthGrid, quickDates } from "@/features/tasks/pickers";
import { holdOverlay } from "@/lib/overlay";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["D", "S", "T", "Q", "Q", "S", "S"];

function PickerSheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const release = holdOverlay();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => {
      release();
      window.removeEventListener("keydown", onKey, true);
    };
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-3" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" aria-label="Fechar" onClick={onClose} className="absolute inset-0 animate-in fade-in bg-black/50 backdrop-blur-sm" />
      <div className="relative max-h-[calc(100dvh-1.5rem)] w-full max-w-sm animate-in overflow-y-auto rounded-[1.75rem] border border-border/60 bg-card p-4 shadow-2xl fade-in zoom-in-95 duration-200">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Fechar" className="grid size-9 place-items-center rounded-full text-muted-foreground hover:bg-muted">
            <X className="size-4" />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}

function Chip({ active, onClick, children }: { active?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3.5 py-2 text-sm font-medium transition-colors active:scale-95",
        active ? "border-primary bg-primary text-primary-foreground" : "border-border/60 hover:bg-muted/50",
      )}
    >
      {children}
    </button>
  );
}

/** Flowy's own date picker: one-tap shortcuts and a month with big days. */
export function DatePickerSheet({
  value,
  onChange,
  onClose,
}: {
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
}) {
  const today = localDateKey();
  const start = value || today;
  const [view, setView] = useState(() => ({ year: Number(start.slice(0, 4)), month: Number(start.slice(5, 7)) - 1 }));
  const pick = (date: string) => {
    onChange(date);
    onClose();
  };
  const move = (step: number) => {
    const date = new Date(view.year, view.month + step, 1);
    setView({ year: date.getFullYear(), month: date.getMonth() });
  };
  const monthName = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(new Date(view.year, view.month, 1));

  return (
    <PickerSheet title="Data" onClose={onClose}>
      <div className="flex flex-wrap gap-1.5">
        {quickDates(today).map((option) => (
          <Chip key={option.label} active={value === option.value} onClick={() => pick(option.value)}>
            {option.label}
          </Chip>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-between">
        <button type="button" onClick={() => move(-1)} aria-label="Mês anterior" className="grid size-10 place-items-center rounded-full hover:bg-muted">
          <ChevronLeft className="size-5" />
        </button>
        <p className="text-sm font-semibold capitalize">{monthName}</p>
        <button type="button" onClick={() => move(1)} aria-label="Próximo mês" className="grid size-10 place-items-center rounded-full hover:bg-muted">
          <ChevronRight className="size-5" />
        </button>
      </div>
      <div className="mt-2 grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((day, index) => (
          <span key={index} className="py-1 text-xs font-semibold text-muted-foreground">
            {day}
          </span>
        ))}
        {monthGrid(view.year, view.month).map((date, index) =>
          date ? (
            <button
              key={date}
              type="button"
              onClick={() => pick(date)}
              aria-pressed={date === value}
              aria-label={new Intl.DateTimeFormat("pt-BR", { dateStyle: "full" }).format(new Date(`${date}T12:00:00`))}
              className={cn(
                "aspect-square rounded-full text-sm font-medium tabular-nums transition-colors active:scale-95",
                date === value
                  ? "bg-primary text-primary-foreground"
                  : date === today
                    ? "flowy-ink ring-1 ring-primary/60"
                    : date < today
                      ? "text-muted-foreground/50 hover:bg-muted/50"
                      : "hover:bg-muted",
              )}
            >
              {Number(date.slice(8))}
            </button>
          ) : (
            <span key={`pad-${index}`} />
          ),
        )}
      </div>
    </PickerSheet>
  );
}

/** Flowy's own time picker: shortcuts, then hour and minute as big buttons (24 h). */
export function TimePickerSheet({
  value,
  onChange,
  onClose,
}: {
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
}) {
  const [hour, setHour] = useState(value ? value.slice(0, 2) : "");
  const [minute, setMinute] = useState(value ? value.slice(3, 5) : "00");
  const pick = (time: string) => {
    onChange(time);
    onClose();
  };
  // Minutes off the 5-minute grid (typed elsewhere) still show as chosen.
  const minutes = MINUTES.includes(minute) ? MINUTES : [...MINUTES, minute].sort();

  return (
    <PickerSheet title="Horário" onClose={onClose}>
      <p className="text-center text-4xl font-bold tabular-nums tracking-tight" aria-live="polite">
        <span className={hour ? "" : "text-muted-foreground/40"}>{hour || "--"}</span>
        <span className="text-muted-foreground/60">:</span>
        {minute}
      </p>
      <div className="mt-3 flex flex-wrap justify-center gap-1.5">
        <Chip onClick={() => pick(inOneHour(new Date()))}>Daqui 1 hora</Chip>
        {QUICK_TIMES.map((time) => (
          <Chip key={time} active={value === time} onClick={() => pick(time)}>
            {time}
          </Chip>
        ))}
      </div>

      <p className="mb-1.5 mt-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Hora</p>
      <div className="grid grid-cols-6 gap-1.5">
        {HOURS.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setHour(option)}
            aria-pressed={hour === option}
            className={cn(
              "h-11 rounded-xl text-[15px] font-semibold tabular-nums transition-colors active:scale-95",
              hour === option ? "bg-primary text-primary-foreground" : "bg-muted/40 hover:bg-muted",
            )}
          >
            {option}
          </button>
        ))}
      </div>

      <p className="mb-1.5 mt-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Minutos</p>
      <div className="grid grid-cols-6 gap-1.5">
        {minutes.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setMinute(option)}
            aria-pressed={minute === option}
            className={cn(
              "h-11 rounded-xl text-[15px] font-semibold tabular-nums transition-colors active:scale-95",
              minute === option ? "bg-primary text-primary-foreground" : "bg-muted/40 hover:bg-muted",
            )}
          >
            :{option}
          </button>
        ))}
      </div>

      <button
        type="button"
        disabled={!hour}
        onClick={() => pick(`${hour}:${minute}`)}
        className="mt-4 h-12 w-full rounded-2xl bg-primary text-sm font-semibold text-primary-foreground transition-opacity disabled:opacity-40"
      >
        {hour ? `Definir ${hour}:${minute}` : "Escolha a hora"}
      </button>
    </PickerSheet>
  );
}
