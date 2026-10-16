"use client";

import { AlertTriangle, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { TEMPLATES } from "@/features/mindmap/convert";
import type { TemplateId } from "@/features/mindmap/types";
import { LayoutIcon } from "@/features/mindmap/components/layout-icon";
import { holdOverlay } from "@/lib/overlay";
import { cn } from "@/lib/utils";

interface TemplatePickerProps {
  title?: string;
  /** Picking replaces existing content: ask for confirmation first. */
  replaceWarning?: boolean;
  busy?: boolean;
  onPick: (template: TemplateId) => void;
  onClose: () => void;
}

export function TemplatePicker({
  title = "Escolha um modelo",
  replaceWarning = false,
  busy = false,
  onPick,
  onClose,
}: TemplatePickerProps) {
  const [pending, setPending] = useState<TemplateId | null>(null);

  useEffect(() => {
    const release = holdOverlay();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      onClose();
    }
    window.addEventListener("keydown", onKeyDown, true);
    return () => {
      release();
      window.removeEventListener("keydown", onKeyDown, true);
    };
  }, [onClose]);

  function choose(template: TemplateId) {
    if (replaceWarning) setPending(template);
    else onPick(template);
  }

  // Portal to <body>: inside the page, the app header, dock and the page's
  // own stacking context would sit on top of the dialog.
  return createPortal(
    <div
      className="fixed inset-0 z-[210] flex items-end justify-center sm:items-center sm:p-4"
      role="presentation"
    >
      <button
        type="button"
        className="flowy-glass-scrim absolute inset-0 animate-fade-in"
        aria-label="Fechar"
        onClick={onClose}
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="map-template-title"
        className="flowy-glass flowy-glass-strong relative flex max-h-[92dvh] w-full max-w-3xl animate-in flex-col rounded-t-[1.75rem] border p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] fade-in slide-in-from-bottom-6 sm:max-h-[88dvh] sm:rounded-3xl sm:p-6 sm:zoom-in-95 sm:slide-in-from-bottom-0"
      >
        <header className="flex items-start justify-between gap-3">
          <div>
            <h2 id="map-template-title" className="text-lg font-semibold">
              {title}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Mapa mental, organograma, linha do tempo ou fluxograma — dá para
              trocar o layout depois.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="grid size-11 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </header>
        <div className="-mx-1 mt-4 min-h-0 overflow-y-auto overscroll-contain px-1 pb-1">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-2.5 lg:grid-cols-4">
            {TEMPLATES.map((template) => (
              <button
                key={template.id}
                type="button"
                disabled={busy}
                onClick={() => choose(template.id)}
                aria-pressed={pending === template.id}
                className={cn(
                  "group flex items-center gap-3 rounded-2xl border p-3 text-left sm:min-h-32 sm:flex-col sm:items-start sm:gap-2 sm:p-3.5 transition-all hover:-translate-y-0.5 hover:border-primary hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98] disabled:opacity-60 motion-reduce:transition-none motion-reduce:hover:translate-y-0",
                  pending === template.id
                    ? "border-primary bg-primary/10"
                    : "border-border",
                )}
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <LayoutIcon layout={template.layout} className="size-5" />
                </span>
                <span className="min-w-0">
                  <strong className="block text-sm">{template.label}</strong>
                  <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">
                    {template.description}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>
        {pending ? (
          <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-destructive/40 bg-destructive/10 p-3 sm:flex-row sm:items-center">
            <AlertTriangle
              className="size-5 shrink-0 text-destructive"
              aria-hidden="true"
            />
            <p className="flex-1 text-sm">
              O conteúdo atual do mapa será substituído. Você ainda pode
              desfazer com Ctrl+Z.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPending(null)}
                className="h-11 rounded-xl px-4 text-sm font-medium hover:bg-accent"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => onPick(pending)}
                className="h-11 rounded-xl bg-destructive px-4 text-sm font-semibold text-destructive-foreground hover:opacity-90"
              >
                Substituir
              </button>
            </div>
          </div>
        ) : null}
      </section>
    </div>,
    document.body,
  );
}
