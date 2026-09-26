"use client";

import { CheckSquare, Folder, NotebookPen, Plus, Tag, X } from "lucide-react";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { useCreateNote } from "@/features/notes/use-notes";
import { cn } from "@/lib/utils";

export function GlobalCreateButton({ className }: { className?: string }) {
  const router = useRouter();
  const createNote = useCreateNote();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const dispatchEvent = (eventName: string) => {
    window.dispatchEvent(new Event(eventName));
    setOpen(false);
  };

  const openOrganizer = (target: "folders" | "categories") => {
    window.dispatchEvent(
      new CustomEvent("flowy:open-organizer", { detail: target }),
    );
    setOpen(false);
  };

  const handleCreateNote = async () => {
      setOpen(false);
      try {
        const note = await createNote.mutateAsync();
        router.push(`/app/notes/${note.id}`);
      } catch {
        toast.error("Não foi possível criar a nota.");
      }
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "global-create-button fixed bottom-24 left-1/2 z-[100] -translate-x-1/2 md:bottom-10 md:left-auto md:right-10 md:translate-x-0 transition-all duration-300",
        className,
      )}
    >
      <div
        className={cn(
          "absolute bottom-full mb-4 flex flex-col overflow-hidden rounded-2xl border border-border/50 bg-card/95 backdrop-blur-xl shadow-xl transition-all duration-300 origin-bottom",
          "left-1/2 -translate-x-1/2 md:left-auto md:right-0 md:translate-x-0 w-[180px]",
          open
            ? "visible translate-y-0 opacity-100 scale-100"
            : "invisible translate-y-4 opacity-0 scale-95",
        )}
      >
        <div className="flex flex-col p-1.5 gap-0.5">
          <button
            onClick={() => dispatchEvent("flowy:open-task-composer")}
            className="group flex items-center gap-3 rounded-xl px-2 py-2 text-sm font-medium transition-colors hover:bg-primary/10 focus-visible:outline-none"
          >
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm transition-transform group-active:scale-95">
              <CheckSquare className="size-4" />
            </div>
            <span className="text-foreground transition-colors group-hover:text-primary">Criar Tarefa</span>
          </button>
          <div className="my-1 h-px mx-2 bg-border/50" />
          <button
            onClick={() => openOrganizer("folders")}
            className="group flex items-center gap-3 rounded-xl px-2 py-2 text-sm font-medium transition-colors hover:bg-blue-500/10 focus-visible:outline-none"
          >
            <div className="flex size-8 items-center justify-center rounded-lg bg-blue-500/15 text-blue-500 transition-transform group-active:scale-95">
              <Folder className="size-4" />
            </div>
            <span className="text-foreground transition-colors group-hover:text-blue-500">Pasta</span>
          </button>
          <button
            onClick={() => openOrganizer("categories")}
            className="group flex items-center gap-3 rounded-xl px-2 py-2 text-sm font-medium transition-colors hover:bg-purple-500/10 focus-visible:outline-none"
          >
            <div className="flex size-8 items-center justify-center rounded-lg bg-purple-500/15 text-purple-500 transition-transform group-active:scale-95">
              <Tag className="size-4" />
            </div>
            <span className="text-foreground transition-colors group-hover:text-purple-500">Tag</span>
          </button>
          <button
            onClick={handleCreateNote}
            disabled={createNote.isPending}
            className="group flex items-center gap-3 rounded-xl px-2 py-2 text-sm font-medium transition-colors hover:bg-orange-500/10 focus-visible:outline-none disabled:opacity-50"
          >
            <div className="flex size-8 items-center justify-center rounded-lg bg-orange-500/15 text-orange-500 transition-transform group-active:scale-95">
              <NotebookPen className="size-4" />
            </div>
            <span className="text-foreground transition-colors group-hover:text-orange-500">Nota</span>
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          "group relative flex size-11 items-center justify-center rounded-2xl transition-all active:scale-95 md:size-16 md:rounded-full focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/40",
          open ? "rotate-45" : "hover:-translate-y-0.5",
          "bg-primary shadow-lg shadow-primary/25"
        )}
        aria-label={open ? "Fechar menu" : "Criar novo item"}
      >
        <Plus className={cn("absolute size-6 text-primary-foreground transition-all duration-300", open ? "scale-50 opacity-0" : "scale-100 opacity-100")} />
        <X
          className={cn(
            "absolute size-8 text-primary-foreground transition-all duration-300",
            open
              ? "rotate-0 scale-100 opacity-100"
              : "-rotate-90 scale-50 opacity-0",
          )}
        />
      </button>
    </div>
  );
}
