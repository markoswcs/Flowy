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
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6" role="dialog" aria-modal="true">
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="absolute inset-0 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200"
        aria-label="Fechar"
      />
      <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card shadow-2xl animate-in zoom-in-95 fade-in duration-200">
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
              <Tag className="size-4" /> Tags
            </button>
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={() => setOpen(false)}>
            <X className="size-4" />
          </Button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto p-4 sm:p-6">
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
