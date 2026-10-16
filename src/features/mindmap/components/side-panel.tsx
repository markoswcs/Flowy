"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface SidePanelProps {
  desktop: boolean;
  label: string;
  onClose: () => void;
  children: ReactNode;
}

/** Right-side panel on desktop, bottom sheet on phones. */
export function SidePanel({
  desktop,
  label,
  onClose,
  children,
}: SidePanelProps) {
  if (desktop) {
    return (
      <aside
        aria-label={label}
        className="flowy-glass flowy-glass-strong absolute bottom-20 right-4 top-[4.5rem] z-20 w-80 animate-in fade-in slide-in-from-right-4 overflow-hidden rounded-3xl border"
      >
        {children}
      </aside>
    );
  }
  return (
    <>
      <button
        type="button"
        aria-label="Fechar painel"
        onClick={onClose}
        className="absolute inset-0 z-30 bg-black/20"
      />
      <aside
        role="dialog"
        aria-label={label}
        className={cn(
          "flowy-glass flowy-glass-strong safe-bottom absolute inset-x-2 bottom-2 z-40 flex h-[min(70%,34rem)] animate-in fade-in slide-in-from-bottom-4 flex-col overflow-hidden rounded-3xl border",
        )}
      >
        <span
          aria-hidden="true"
          className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-muted-foreground/30"
        />
        <div className="min-h-0 flex-1">{children}</div>
      </aside>
    </>
  );
}
