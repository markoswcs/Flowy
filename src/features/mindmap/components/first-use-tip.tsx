"use client";

import { Lightbulb, X } from "lucide-react";
import { useState } from "react";

import { TIP_STORAGE_KEY } from "@/features/mindmap/components/constants";

function wasDismissed(): boolean {
  try {
    return window.localStorage.getItem(TIP_STORAGE_KEY) === "1";
  } catch {
    return true;
  }
}

export function FirstUseTip() {
  const [visible, setVisible] = useState(() => !wasDismissed());
  if (!visible) return null;

  function dismiss() {
    setVisible(false);
    try {
      window.localStorage.setItem(TIP_STORAGE_KEY, "1");
    } catch {
      // Private mode: the tip simply shows again next time.
    }
  }

  return (
    <div
      role="note"
      className="flowy-glass absolute bottom-[5.25rem] left-1/2 z-20 flex w-[min(30rem,calc(100%-1rem))] -translate-x-1/2 animate-in fade-in slide-in-from-bottom-2 items-center gap-3 rounded-2xl border py-2 pl-3.5 pr-1.5 text-xs leading-5 text-muted-foreground md:bottom-4 md:left-4 md:translate-x-0"
    >
      <Lightbulb className="size-4 shrink-0 text-primary" aria-hidden="true" />
      <p className="flex-1">
        <span className="hidden md:inline">
          Tab cria um subtópico · Enter cria um tópico irmão · arraste para
          reorganizar
        </span>
        <span className="md:hidden">
          Toque e segure um tópico para ver as ações · arraste com o dedo parado
          para reorganizar
        </span>
      </p>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dispensar dica"
        className="grid size-10 shrink-0 place-items-center rounded-full hover:bg-accent hover:text-foreground"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
