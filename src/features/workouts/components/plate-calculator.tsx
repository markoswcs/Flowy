"use client";

import { Minus, Plus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { holdOverlay } from "@/lib/overlay";
import { cn } from "@/lib/utils";

import { formatKg } from "../strength";
import { BARS, DEFAULT_PLATES, platesPerSide } from "../training";

const STORAGE = "flowy:plates";
const ALL_PLATES = [25, 20, 15, 10, 5, 2.5, 2, 1.25, 1, 0.5];

/** Colours like competition plates, so the stack reads at a glance. */
const PLATE_STYLE: Record<string, string> = {
  "25": "bg-red-500 h-24",
  "20": "bg-blue-500 h-24",
  "15": "bg-yellow-400 h-20",
  "10": "bg-emerald-500 h-16",
  "5": "bg-zinc-100 h-12",
  "2.5": "bg-zinc-800 ring-1 ring-zinc-500 h-10",
  "2": "bg-zinc-500 h-9",
  "1.25": "bg-zinc-400 h-8",
  "1": "bg-zinc-300 h-7",
  "0.5": "bg-zinc-200 h-6",
};

function readSettings(): { bar: number; plates: number[] } {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE) ?? "null") as { bar?: number; plates?: number[] } | null;
    return { bar: saved?.bar ?? 20, plates: saved?.plates?.length ? saved.plates : DEFAULT_PLATES };
  } catch {
    return { bar: 20, plates: DEFAULT_PLATES };
  }
}

/** Which plates go on each side of the bar for a weight, with the plates the person has. */
export function PlateCalculator({ initial, onClose }: { initial: number; onClose: () => void }) {
  const [target, setTarget] = useState(Math.max(0, initial));
  const [settings, setSettings] = useState(readSettings);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    const release = holdOverlay();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      release();
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  function save(next: { bar: number; plates: number[] }) {
    setSettings(next);
    try {
      localStorage.setItem(STORAGE, JSON.stringify(next));
    } catch {
      // Private mode: the choice lasts until the page closes.
    }
  }

  const result = platesPerSide(target, settings.bar, settings.plates);
  const change = (by: number) => setTarget((value) => Math.max(0, Math.round((value + by) * 100) / 100));

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-end justify-center p-3 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="plates-title">
      <button type="button" aria-label="Fechar" onClick={onClose} className="absolute inset-0 animate-in fade-in bg-black/50 backdrop-blur-sm" />
      <section className="relative max-h-[calc(100dvh-1.5rem)] w-full max-w-sm animate-in overflow-y-auto rounded-[1.75rem] border border-border/60 bg-card p-4 shadow-2xl fade-in slide-in-from-bottom-4">
        <div className="flex items-center justify-between">
          <h2 id="plates-title" className="text-lg font-semibold">Anilhas</h2>
          <button type="button" onClick={onClose} aria-label="Fechar" className="grid size-9 place-items-center rounded-full text-muted-foreground hover:bg-muted">
            <X className="size-4" />
          </button>
        </div>

        <div className="mt-3 flex items-center justify-center gap-3">
          <button type="button" onClick={() => change(-2.5)} aria-label="Menos 2,5 kg" className="grid size-11 place-items-center rounded-full bg-muted/50">
            <Minus className="size-4" />
          </button>
          <label className="flex items-baseline gap-1">
            <input
              inputMode="decimal"
              value={String(target).replace(".", ",")}
              onChange={(event) => {
                const value = Number(event.target.value.replace(",", ".").replace(/[^\d.]/g, ""));
                if (Number.isFinite(value)) setTarget(Math.min(500, value));
              }}
              aria-label="Peso total em kg"
              className="w-24 border-0 bg-transparent p-0 text-center text-4xl font-bold tabular-nums shadow-none outline-none focus:ring-0"
            />
            <span className="text-sm text-muted-foreground">kg</span>
          </label>
          <button type="button" onClick={() => change(2.5)} aria-label="Mais 2,5 kg" className="grid size-11 place-items-center rounded-full bg-muted/50">
            <Plus className="size-4" />
          </button>
        </div>

        <div className="mt-3 flex flex-wrap justify-center gap-1.5" role="group" aria-label="Barra">
          {BARS.map((bar) => (
            <button
              key={bar.id}
              type="button"
              aria-pressed={settings.bar === bar.weight}
              onClick={() => save({ ...settings, bar: bar.weight })}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                settings.bar === bar.weight ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground hover:text-foreground",
              )}
            >
              {bar.label}
              {bar.weight ? ` · ${bar.weight} kg` : ""}
            </button>
          ))}
        </div>

        {/* Bar with one side loaded, biggest plate next to the collar. */}
        <div className="mt-5 flex h-28 items-center justify-center" aria-hidden="true">
          <span className="h-3 w-16 rounded-l-full bg-zinc-400" />
          <span className="h-7 w-2 rounded-sm bg-zinc-300" />
          <span className="flex items-center gap-0.5">
            {result.plates.map((plate, index) => (
              <span key={index} className={cn("w-3 rounded-sm shadow-md", PLATE_STYLE[String(plate)] ?? "h-8 bg-zinc-400")} />
            ))}
          </span>
          <span className="h-3 w-6 rounded-r-full bg-zinc-400" />
        </div>

        <p className="text-center text-sm">
          {result.plates.length ? (
            <>
              Em cada lado: <strong className="tabular-nums">{result.plates.map((plate) => String(plate).replace(".", ",")).join(" + ")}</strong>
            </>
          ) : target <= settings.bar ? (
            "Só a barra."
          ) : (
            "Sem anilhas que fechem esse peso."
          )}
        </p>
        {result.leftover > 0 && target > settings.bar ? (
          <p className="mt-1 text-center text-xs text-amber-300">Faltam {formatKg(result.leftover)} que suas anilhas não fecham.</p>
        ) : null}

        <button
          type="button"
          onClick={() => setEditing((value) => !value)}
          className="mt-4 text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          {editing ? "Pronto" : "Quais anilhas eu tenho"}
        </button>
        {editing ? (
          <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label="Anilhas disponíveis">
            {ALL_PLATES.map((plate) => {
              const on = settings.plates.includes(plate);
              return (
                <button
                  key={plate}
                  type="button"
                  aria-pressed={on}
                  onClick={() =>
                    save({ ...settings, plates: on ? settings.plates.filter((item) => item !== plate) : [...settings.plates, plate] })
                  }
                  className={cn(
                    "rounded-full px-3 py-1.5 text-xs font-semibold tabular-nums transition-colors",
                    on ? "bg-primary/20 text-foreground ring-1 ring-primary/50" : "bg-muted/40 text-muted-foreground line-through",
                  )}
                >
                  {String(plate).replace(".", ",")} kg
                </button>
              );
            })}
          </div>
        ) : null}
      </section>
    </div>,
    document.body,
  );
}
