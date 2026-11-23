"use client";

import { Smartphone } from "lucide-react";
import { useState } from "react";

import { DEFAULT_DOCK, DOCK_ITEMS, placeInDock, resolveDock } from "@/components/shell/dock-items";
import { useDock, useSaveDock } from "@/components/shell/use-dock";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

/**
 * "Barra de baixo": tap a place in the bar, then the shortcut to put there.
 * Shown on phones (the bar only exists there).
 */
export function DockSection() {
  const dock = useDock();
  const save = useSaveDock();
  const [slot, setSlot] = useState(0);
  const items = resolveDock(dock.data);
  const keys = items.map((item) => item.key);

  function choose(key: string) {
    const next = placeInDock(keys, slot, key);
    save.mutate(next, { onError: () => toast.error("Não foi possível salvar. Tente de novo.") });
    setSlot((slot + 1) % keys.length);
  }

  const place = (index: number) => {
    const item = items[index]!;
    const Icon = item.icon;
    return (
      <button
        key={item.key}
        type="button"
        onClick={() => setSlot(index)}
        aria-pressed={slot === index}
        data-no-glow
        aria-label={`Lugar ${index + 1}: ${item.label}`}
        className={cn(
          "flex flex-col items-center gap-1 rounded-2xl py-2 text-[11px] font-medium transition-colors",
          slot === index ? "bg-primary/15 text-foreground ring-2 ring-primary/60" : "text-muted-foreground",
        )}
      >
        <Icon className="size-5" aria-hidden="true" />
        <span className="max-w-full truncate px-1">{item.label}</span>
      </button>
    );
  };

  return (
    <section aria-labelledby="dock-heading" className="md:hidden">
      <h2 id="dock-heading" className="flex items-center gap-2 text-base font-semibold">
        <Smartphone className="size-5 flowy-ink" aria-hidden="true" />
        Barra de baixo
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">Toque num lugar da barra e depois no atalho que quer ali. Ou segure um botão da própria barra.</p>

      <div className="mt-3 grid grid-cols-[1fr_1fr_3rem_1fr_1fr] items-center gap-1 rounded-[1.75rem] border border-border/60 bg-card/40 p-2">
        {place(0)}
        {place(1)}
        <span className="mx-auto grid size-9 place-items-center rounded-full bg-primary text-lg font-bold text-primary-foreground" aria-hidden="true">
          +
        </span>
        {place(2)}
        {place(3)}
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label={`Atalho para o lugar ${slot + 1}`}>
        {DOCK_ITEMS.map((item) => {
          const Icon = item.icon;
          const inBar = keys.includes(item.key);
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => choose(item.key)}
              data-no-glow
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-sm font-medium transition-colors active:scale-95",
                keys[slot] === item.key
                  ? "border-primary bg-primary text-primary-foreground"
                  : inBar
                    ? "border-primary/30 text-foreground"
                    : "border-border/60 text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="size-4" aria-hidden="true" />
              {item.label}
            </button>
          );
        })}
      </div>

      {keys.join() !== DEFAULT_DOCK.join() ? (
        <button
          type="button"
          onClick={() => save.mutate(DEFAULT_DOCK)}
          className="mt-3 text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          Voltar ao padrão
        </button>
      ) : null}
    </section>
  );
}
