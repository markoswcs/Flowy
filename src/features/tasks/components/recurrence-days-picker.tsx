"use client";

import { WEEKDAYS } from "@/features/tasks/recurrence";
import { cn } from "@/lib/utils";

const WORKDAYS = [1, 2, 3, 4, 5];
const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6];

function same(a: number[], b: number[]) {
  return a.length === b.length && a.every((day) => b.includes(day));
}

/**
 * Seven round toggles (D S T Q Q S S) for the weekdays a repeating task shows
 * up on, plus shortcuts for work days and every day. At least one day stays on.
 */
export function RecurrenceDaysPicker({
  value,
  onChange,
  className,
}: {
  value: number[];
  onChange: (days: number[]) => void;
  className?: string;
}) {
  function toggle(day: number) {
    if (value.includes(day)) {
      if (value.length > 1) onChange(value.filter((item) => item !== day));
      return;
    }
    onChange([...value, day].sort((a, b) => a - b));
  }

  const presets = [
    { label: "Dias úteis", days: WORKDAYS },
    { label: "Todos", days: EVERY_DAY },
  ];

  return (
    <div className={cn("space-y-2", className)} role="group" aria-label="Dias da semana">
      <div className="flex items-center justify-between gap-1">
        {WEEKDAYS.map((day) => {
          const active = value.includes(day.value);
          return (
            <button
              key={day.value}
              type="button"
              onClick={() => toggle(day.value)}
              aria-pressed={active}
              aria-label={day.label}
              title={day.label}
              className={cn(
                "grid size-9 shrink-0 place-items-center rounded-full border text-xs font-semibold transition-all active:scale-90",
                active
                  ? "border-transparent bg-violet-500 text-white shadow-[0_6px_16px_-6px_rgb(124_58_237/0.8)]"
                  : "border-border/60 text-muted-foreground hover:bg-muted/40 hover:text-foreground",
              )}
            >
              {day.letter}
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {presets.map((preset) => (
          <button
            key={preset.label}
            type="button"
            onClick={() => onChange(preset.days)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              same(value, preset.days)
                ? "flowy-active"
                : "border-border/60 text-muted-foreground hover:bg-muted/40 hover:text-foreground",
            )}
          >
            {preset.label}
          </button>
        ))}
      </div>
    </div>
  );
}
