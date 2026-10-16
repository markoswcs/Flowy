"use client";

import { Check, CheckSquare, Pencil, RotateCcw, Trash2 } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/utils";
import { holdOverlay } from "@/lib/overlay";

/** Bottom sheet opened by holding a task (or right-clicking it). */
export function TaskActionSheet({
  title,
  completed,
  canSelect,
  onClose,
  onEdit,
  onToggle,
  onSelect,
  onTrash,
}: {
  title: string;
  completed: boolean;
  canSelect: boolean;
  onClose: () => void;
  onEdit: () => void;
  onToggle: () => void;
  onSelect: () => void;
  onTrash: () => void;
}) {
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

  const run = (action: () => void) => () => {
    onClose();
    action();
  };

  return createPortal(
    <div className="fixed inset-0 z-[150] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label="Ações da tarefa">
      <button
        type="button"
        aria-label="Fechar"
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      />
      <div className="relative w-full max-w-md rounded-t-[1.75rem] border border-border/60 bg-card p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-2xl animate-in slide-in-from-bottom-8 duration-300 sm:rounded-[1.75rem] sm:pb-3">
        <div className="mx-auto mb-3 mt-1 h-1 w-10 rounded-full bg-muted-foreground/30 sm:hidden" aria-hidden="true" />
        <p className="line-clamp-2 px-3 pb-3 text-sm font-semibold leading-snug">{title}</p>
        <div className="grid gap-1">
          <SheetAction icon={<Pencil className="size-[18px]" />} onClick={run(onEdit)}>
            Editar
          </SheetAction>
          <SheetAction
            icon={completed ? <RotateCcw className="size-[18px]" /> : <Check className="size-[18px]" />}
            onClick={run(onToggle)}
          >
            {completed ? "Reabrir tarefa" : "Concluir tarefa"}
          </SheetAction>
          {canSelect ? (
            <SheetAction icon={<CheckSquare className="size-[18px]" />} onClick={run(onSelect)}>
              Selecionar várias
            </SheetAction>
          ) : null}
          <SheetAction danger icon={<Trash2 className="size-[18px]" />} onClick={run(onTrash)}>
            Mover para a lixeira
          </SheetAction>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function SheetAction({
  icon,
  onClick,
  danger,
  children,
}: {
  icon: ReactNode;
  onClick: () => void;
  danger?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-12 w-full items-center gap-3 rounded-2xl px-3 text-left text-[15px] font-medium transition-colors active:scale-[0.98]",
        danger ? "text-destructive hover:bg-destructive/10" : "hover:bg-accent",
      )}
    >
      <span
        className={cn(
          "grid size-9 place-items-center rounded-xl",
          danger ? "bg-destructive/10" : "bg-violet-500/15 text-violet-400",
        )}
      >
        {icon}
      </span>
      {children}
    </button>
  );
}
