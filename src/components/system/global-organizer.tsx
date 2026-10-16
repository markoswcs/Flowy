"use client";

import { useEffect, useState } from "react";
import { Folder, Tag, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CategoryManager } from "@/features/categories/components/category-manager";
import { FolderManager } from "@/features/folders/components/folder-manager";
import { cn } from "@/lib/utils";

export function GlobalOrganizer() {
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<"folders" | "categories">("folders");
  const [editId, setEditId] = useState<string | null>(null);

  useEffect(() => {
    const handleOpen = (event: Event) => {
      const detail = (event as CustomEvent<string | { target: "folders" | "categories"; editId?: string }>).detail;
      if (typeof detail === "string") {
        setTarget(detail as "folders" | "categories");
        setEditId(null);
      } else {
        setTarget(detail.target);
        setEditId(detail.editId || null);
      }
      setOpen(true);
    };
    window.addEventListener("flowy:open-organizer", handleOpen);
    const handleClose = () => setOpen(false);
    window.addEventListener("flowy:close-overlays", handleClose);
    return () => {
      window.removeEventListener("flowy:open-organizer", handleOpen);
      window.removeEventListener("flowy:close-overlays", handleClose);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && open) {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  useEffect(() => {
    if (open) {
      document.body.classList.add("has-overlay");
    } else {
      document.body.classList.remove("has-overlay");
    }
    return () => document.body.classList.remove("has-overlay");
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label="Organizar pastas e etiquetas">
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="absolute inset-0 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200"
        aria-label="Fechar"
      />
      <div className="relative z-10 flex max-h-[88dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-[1.75rem] border border-border bg-card shadow-2xl animate-in slide-in-from-bottom-6 fade-in duration-300 sm:rounded-[1.75rem] sm:zoom-in-95 sm:slide-in-from-bottom-0">
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-muted-foreground/30 sm:hidden" aria-hidden="true" />
        <div className="flex items-center justify-between border-b border-border p-4">
          <div className="inline-flex rounded-xl bg-muted p-1" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={target !== "categories"}
              onClick={() => setTarget("folders")}
              className={cn(
                "flex items-center gap-2 rounded-lg px-4 py-1.5 text-sm transition-all",
                target !== "categories" ? "bg-background font-medium shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Folder className="size-4" /> Pastas
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={target === "categories"}
              onClick={() => setTarget("categories")}
              className={cn(
                "flex items-center gap-2 rounded-lg px-4 py-1.5 text-sm transition-all",
                target === "categories" ? "bg-background font-medium shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Tag className="size-4" /> Etiquetas
            </button>
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={() => setOpen(false)}>
            <X className="size-4" />
          </Button>
        </div>
        <div className="flex items-start gap-3 border-b border-border/60 bg-muted/30 px-4 py-3 text-xs leading-5 text-muted-foreground sm:px-6">
          {target === "categories" ? (
            <Tag className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
          ) : (
            <Folder className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
          )}
          <p>
            {target === "categories" ? (
              <>
                <strong className="text-foreground">Etiquetas</strong> são marcadores que você combina: uma tarefa pode ter várias (ex.: Urgente + Cliente). Ao criar uma tarefa, digite <code className="rounded bg-background px-1">#nome</code> ou deixe o Flowy sugerir.
              </>
            ) : (
              <>
                <strong className="text-foreground">Pastas</strong> são onde a tarefa mora: cada tarefa fica em uma pasta (ex.: Trabalho, Pessoal). Ao criar uma tarefa, digite <code className="rounded bg-background px-1">/nome</code> ou deixe o Flowy sugerir.
              </>
            )}
          </p>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-6">
          {target === "categories" ? (
            <CategoryManager key="categories-active" autoFocusNew />
          ) : (
            <FolderManager key="folders-active" autoFocusNew initialEditId={editId} />
          )}
        </div>
      </div>
    </div>
  );
}
