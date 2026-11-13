"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { localDateKey } from "@/features/tasks/date-utils";
import { HOURS, QUICK_TIMES, inOneHour, monthGrid, quickDates } from "@/features/tasks/pickers";
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

const ITEM = 44;
const VISIBLE = 5;

/**
 * One iPhone-style wheel: a column that scrolls and snaps, the middle row is
 * the chosen value. Tapping a row scrolls it to the middle.
 */
function Wheel({
  values,
  value,
  onChange,
  label,
}: {
  values: string[];
  value: string;
  onChange: (value: string) => void;
  label: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const initial = useRef(Math.max(0, values.indexOf(value)));

  useEffect(() => {
    if (ref.current) ref.current.scrollTop = initial.current * ITEM;
  }, []);

  function settle() {
    const element = ref.current;
    if (!element) return;
    const index = Math.min(values.length - 1, Math.max(0, Math.round(element.scrollTop / ITEM)));
    if (values[index] !== value) onChange(values[index]!);
  }

  return (
    <div
      ref={ref}
      role="listbox"
      aria-label={label}
      tabIndex={0}
      onScroll={settle}
      onKeyDown={(event) => {
        const step = event.key === "ArrowDown" ? 1 : event.key === "ArrowUp" ? -1 : 0;
        if (!step) return;
        event.preventDefault();
        ref.current?.scrollBy({ top: step * ITEM, behavior: "smooth" });
      }}
      className="relative z-10 h-full flex-1 snap-y snap-mandatory overflow-y-scroll overscroll-contain outline-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      style={{
        paddingBlock: ITEM * Math.floor(VISIBLE / 2),
        maskImage: "linear-gradient(to bottom, transparent, #000 35%, #000 65%, transparent)",
        WebkitMaskImage: "linear-gradient(to bottom, transparent, #000 35%, #000 65%, transparent)",
      }}
    >
      {values.map((option, index) => (
        <div
          key={option}
          role="option"
          aria-selected={option === value}
          aria-label={option}
          onClick={() => ref.current?.scrollTo({ top: index * ITEM, behavior: "smooth" })}
          className={cn(
            "grid snap-center cursor-pointer place-items-center text-[22px] tabular-nums transition-colors",
            option === value ? "font-semibold text-foreground" : "text-muted-foreground/70",
          )}
          style={{ height: ITEM }}
        >
          {option}
        </div>
      ))}
    </div>
  );
}

const ALL_MINUTES = Array.from({ length: 60 }, (_, index) => String(index).padStart(2, "0"));

/** Flowy's time picker, like the iPhone's: two wheels (24 h) and "Definir". */
export function TimePickerSheet({
  value,
  onChange,
  onClose,
}: {
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
}) {
  // Without a time yet, the wheels start an hour from now.
  const [start] = useState(() => value || inOneHour(new Date()));
  const [hour, setHour] = useState(start.slice(0, 2));
  const [minute, setMinute] = useState(start.slice(3, 5));
  const pick = (time: string) => {
    onChange(time);
    onClose();
  };

  return (
    <PickerSheet title="Horário" onClose={onClose}>
      <div className="relative flex items-stretch justify-center gap-2 px-6" style={{ height: ITEM * VISIBLE }}>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-3 top-1/2 -translate-y-1/2 rounded-xl bg-muted/60"
          style={{ height: ITEM }}
        />
        <Wheel label="Hora" values={HOURS} value={hour} onChange={setHour} />
        <span aria-hidden="true" className="relative z-10 self-center text-[22px] font-semibold">:</span>
        <Wheel label="Minutos" values={ALL_MINUTES} value={minute} onChange={setMinute} />
      </div>

      <button
        type="button"
        onClick={() => pick(`${hour}:${minute}`)}
        className="mt-4 h-12 w-full rounded-2xl bg-primary text-sm font-semibold text-primary-foreground"
      >
        Definir {hour}:{minute}
      </button>
      <div className="mt-3 flex flex-wrap justify-center gap-1.5">
        {QUICK_TIMES.map((time) => (
          <Chip key={time} active={value === time} onClick={() => pick(time)}>
            {time}
          </Chip>
        ))}
      </div>
    </PickerSheet>
  );
}
