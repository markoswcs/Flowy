"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useEffect, useEffectEvent } from "react";

interface PresentationBarProps {
  index: number;
  count: number;
  title: string;
  onStep: (delta: 1 | -1) => void;
  onExit: () => void;
}

/** Slide-by-slide walk through the map (MindMeister/XMind presentation mode). */
export function PresentationBar({
  index,
  count,
  title,
  onStep,
  onExit,
}: PresentationBarProps) {
  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    const next = ["ArrowRight", "ArrowDown", "PageDown", " ", "Enter"];
    const prev = ["ArrowLeft", "ArrowUp", "PageUp", "Backspace"];
    if (next.includes(event.key)) onStep(1);
    else if (prev.includes(event.key)) onStep(-1);
    else if (event.key === "Escape") onExit();
    else return;
    event.preventDefault();
    event.stopPropagation();
  });

  useEffect(() => {
    const handler = (event: KeyboardEvent) => onKeyDown(event);
    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, []);

  return (
    <div
      role="toolbar"
      aria-label="Apresentação"
      className="flowy-glass flowy-glass-strong absolute bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 z-40 flex max-w-[calc(100%-1.5rem)] -translate-x-1/2 animate-in fade-in slide-in-from-bottom-3 items-center gap-1 rounded-full border p-1.5"
    >
      <button
        type="button"
        onClick={() => onStep(-1)}
        disabled={index <= 0}
        aria-label="Anterior"
        className="grid size-11 place-items-center rounded-full hover:bg-accent disabled:opacity-40"
      >
        <ChevronLeft className="size-5" />
      </button>
      <div className="min-w-0 px-2 text-center">
        <p className="max-w-[40vw] truncate text-sm font-semibold">{title}</p>
        <p className="text-[11px] tabular-nums text-muted-foreground">
          {index + 1} de {count}
        </p>
      </div>
      <button
        type="button"
        onClick={() => onStep(1)}
        disabled={index >= count - 1}
        aria-label="Próximo"
        className="grid size-11 place-items-center rounded-full hover:bg-accent disabled:opacity-40"
      >
        <ChevronRight className="size-5" />
      </button>
      <span aria-hidden="true" className="mx-1 h-6 w-px bg-border" />
      <button
        type="button"
        onClick={onExit}
        aria-label="Sair da apresentação"
        className="grid size-11 place-items-center rounded-full hover:bg-accent"
      >
        <X className="size-5" />
      </button>
    </div>
  );
}
