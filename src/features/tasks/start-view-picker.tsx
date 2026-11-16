"use client";

import { useSyncExternalStore } from "react";

import { useUpdatePreferences } from "@/features/settings/use-settings";
import { toast } from "@/lib/toast";

export type StartView = "today" | "upcoming" | "calendar" | "all";

export const START_VIEW_OPTIONS: { value: StartView; label: string }[] = [
  { value: "today", label: "Hoje" },
  { value: "upcoming", label: "Próximas" },
  { value: "calendar", label: "Calendário" },
  { value: "all", label: "Todas" },
];

const CHOSEN_KEY = "flowy:start-view-chosen";
const listeners = new Set<() => void>();

function chosen() {
  try {
    return window.localStorage.getItem(CHOSEN_KEY) === "1";
  } catch {
    return true;
  }
}

function markChosen() {
  try {
    window.localStorage.setItem(CHOSEN_KEY, "1");
  } catch {
    // Private mode: the question may come back next time.
  }
  listeners.forEach((listener) => listener());
}

/**
 * Asked once: which tab opens first. One tap saves it (changeable later in
 * Configurações) and switches to it right away.
 */
export function StartViewPicker({ onPick }: { onPick: (view: StartView) => void }) {
  const done = useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    chosen,
    () => true,
  );
  const update = useUpdatePreferences();
  if (done) return null;

  function pick(view: StartView) {
    onPick(view);
    markChosen();
    update.mutate(
      { default_task_view: view },
      { onError: () => toast.error("Não foi possível salvar. Escolha de novo em Configurações.") },
    );
  }

  return (
    <section
      className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border border-border/60 bg-card/40 px-3.5 py-3 animate-in fade-in slide-in-from-top-2"
      aria-label="Escolher o que abre primeiro"
    >
      <p className="text-sm text-muted-foreground">Ao abrir o Flowy, mostrar:</p>
      <div className="flex flex-wrap gap-1.5">
        {START_VIEW_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => pick(option.value)}
            className="rounded-full border border-border/60 px-3 py-1.5 text-sm font-medium transition-colors hover:border-primary/50 hover:bg-primary/10 active:scale-95"
          >
            {option.label}
          </button>
        ))}
      </div>
    </section>
  );
}

/** For Settings: a choice there also counts as answered. */
export { markChosen as markStartViewChosen };
