"use client";

import { Ban, Check } from "lucide-react";
import type { ReactNode } from "react";

import { ORGANIZER_COLORS } from "@/lib/color-palette";
import { cn } from "@/lib/utils";

export function PanelSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {title}
      </h3>
      {children}
    </section>
  );
}

const EXTRA_COLORS = [
  { name: "Branco", value: "#FFFFFF" },
  { name: "Preto", value: "#111827" },
];

interface SwatchesProps {
  label: string;
  value: string | undefined;
  withNeutrals?: boolean;
  onChange: (color: string | undefined) => void;
}

export function Swatches({
  label,
  value,
  withNeutrals,
  onChange,
}: SwatchesProps) {
  const colors = withNeutrals
    ? [...EXTRA_COLORS, ...ORGANIZER_COLORS]
    : ORGANIZER_COLORS;
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="flex flex-wrap gap-1.5"
    >
      <button
        type="button"
        role="radio"
        aria-checked={!value}
        aria-label="Automática"
        title="Automática"
        onClick={() => onChange(undefined)}
        className={cn(
          "grid size-8 place-items-center rounded-full border border-border text-muted-foreground transition-transform hover:scale-110 active:scale-95 motion-reduce:transform-none",
          !value && "ring-2 ring-primary ring-offset-2 ring-offset-card",
        )}
      >
        <Ban className="size-3.5" />
      </button>
      {colors.map((color) => {
        const active = value?.toLowerCase() === color.value.toLowerCase();
        return (
          <button
            key={color.value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={color.name}
            title={color.name}
            onClick={() => onChange(color.value)}
            className={cn(
              "grid size-8 place-items-center rounded-full ring-1 ring-black/10 transition-transform hover:scale-110 active:scale-95 motion-reduce:transform-none",
              active && "ring-2 ring-primary ring-offset-2 ring-offset-card",
            )}
            style={{ backgroundColor: color.value }}
          >
            {active ? (
              <Check className="size-3.5 mix-blend-difference text-white" />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

interface SegmentProps<T extends string | number> {
  label: string;
  value: T;
  options: { value: T; label: string; content: ReactNode }[];
  onChange: (value: T) => void;
  columns?: number;
}

export function Segmented<T extends string | number>({
  label,
  value,
  options,
  onChange,
  columns,
}: SegmentProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="grid gap-1 rounded-2xl bg-muted/50 p-1"
      style={{
        gridTemplateColumns: `repeat(${columns ?? options.length}, minmax(0, 1fr))`,
      }}
    >
      {options.map((option) => (
        <button
          key={String(option.value)}
          type="button"
          role="radio"
          aria-checked={option.value === value}
          aria-label={option.label}
          title={option.label}
          onClick={() => onChange(option.value)}
          className={cn(
            "grid h-10 place-items-center rounded-xl text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
            option.value === value &&
              "bg-card text-foreground shadow-sm ring-1 ring-border",
          )}
        >
          {option.content}
        </button>
      ))}
    </div>
  );
}

export function ShapeGlyph({ shape }: { shape: string }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.8 };
  return (
    <svg viewBox="0 0 28 18" className="h-[18px] w-7" aria-hidden="true">
      {shape === "rect" ? (
        <rect x="2" y="3" width="24" height="12" rx="0.5" {...common} />
      ) : null}
      {shape === "rounded" ? (
        <rect x="2" y="3" width="24" height="12" rx="4" {...common} />
      ) : null}
      {shape === "pill" ? (
        <rect x="2" y="3" width="24" height="12" rx="6" {...common} />
      ) : null}
      {shape === "ellipse" ? (
        <ellipse cx="14" cy="9" rx="12" ry="7" {...common} />
      ) : null}
      {shape === "diamond" ? (
        <polygon points="14,1 27,9 14,17 1,9" {...common} />
      ) : null}
      {shape === "underline" ? (
        <line x1="2" y1="15" x2="26" y2="15" {...common} strokeWidth={2.4} />
      ) : null}
    </svg>
  );
}
