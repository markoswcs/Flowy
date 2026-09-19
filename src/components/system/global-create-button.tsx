"use client";

import { CheckSquare, Folder, NotebookPen, Tag, X } from "lucide-react";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { useCreateNote } from "@/features/notes/use-notes";
import { cn } from "@/lib/utils";

const NeonLogo = () => (
  <svg
    viewBox="0 0 100 100"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="size-full drop-shadow-[0_0_8px_hsl(var(--primary)/0.8)]"
  >
    <g transform="rotate(-24 50 50)">
      <rect
        x="25"
        y="20"
        width="60"
        height="28"
        rx="14"
        stroke="currentColor"
        strokeWidth="4.5"
      />
      <rect
        x="15"
        y="52"
        width="60"
        height="28"
        rx="14"
        stroke="currentColor"
        strokeWidth="4.5"
      />
    </g>
  </svg>
);

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
    setTimeout(() => {
      window.dispatchEvent(new Event(eventName));
      setOpen(false);
    }, 150);
  };

  const openOrganizer = (target: "folders" | "categories") => {
    setTimeout(() => {
      window.dispatchEvent(
        new CustomEvent("flowy:open-organizer", { detail: target }),
      );
      setOpen(false);
    }, 150);
  };

  const handleCreateNote = () => {
    setTimeout(async () => {
      setOpen(false);
      try {
        const note = await createNote.mutateAsync();
        router.push(`/app/notes/${note.id}`);
      } catch {
        toast.error("Não foi possível criar a nota.");
      }
    }, 150);
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "fixed bottom-6 left-1/2 z-[100] -translate-x-1/2 md:bottom-10 md:left-auto md:right-10 md:translate-x-0",
        className,
      )}
    >
      <div
        className={cn(
          "absolute bottom-full mb-4 flex flex-col gap-3 transition-all duration-300",
          "left-1/2 -translate-x-1/2 md:left-auto md:right-0 md:translate-x-0 items-center md:items-end",
          open
            ? "visible translate-y-0 opacity-100"
            : "invisible translate-y-4 opacity-0",
        )}
      >
        <button
          onClick={handleCreateNote}
          disabled={createNote.isPending}
          className="flex items-center gap-3 rounded-full border border-border/50 bg-card px-4 py-2 text-sm font-medium shadow-soft transition-all active:scale-90 hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span>Nota</span>
          <div className="flex size-8 items-center justify-center rounded-full bg-orange-500/10 text-orange-500 transition-transform group-active:scale-110">
            <NotebookPen className="size-4" />
          </div>
        </button>
        <button
          onClick={() => openOrganizer("categories")}
          className="flex items-center gap-3 rounded-full border border-border/50 bg-card px-4 py-2 text-sm font-medium shadow-soft transition-all active:scale-90 hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span>Tag</span>
          <div className="flex size-8 items-center justify-center rounded-full bg-purple-500/10 text-purple-500 transition-transform group-active:scale-110">
            <Tag className="size-4" />
          </div>
        </button>
        <button
          onClick={() => openOrganizer("folders")}
          className="flex items-center gap-3 rounded-full border border-border/50 bg-card px-4 py-2 text-sm font-medium shadow-soft transition-all active:scale-90 hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span>Pasta</span>
          <div className="flex size-8 items-center justify-center rounded-full bg-blue-500/10 text-blue-500 transition-transform group-active:scale-110">
            <Folder className="size-4" />
          </div>
        </button>
        <button
          onClick={() => dispatchEvent("flowy:open-task-composer")}
          className="flex items-center gap-3 rounded-full bg-primary px-5 py-3 text-sm font-bold text-primary-foreground shadow-glow transition-all active:scale-90 hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span>Criar Tarefa</span>
          <CheckSquare className="size-5 transition-transform group-active:scale-110" />
        </button>
      </div>

      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          "group relative flex size-14 items-center justify-center rounded-full transition-all active:scale-95 md:size-16 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/40",
          open ? "rotate-45" : "hover:-translate-y-1",
          "border-[1.5px] border-primary bg-background shadow-[0_0_20px_hsl(var(--primary)/0.5)]"
        )}
        aria-label={open ? "Fechar menu" : "Criar novo item"}
      >
        <div
          className={cn(
            "absolute inset-0 transition-all duration-300 flex items-center justify-center text-white",
            open ? "scale-50 opacity-0" : "scale-100 opacity-100",
          )}
          style={{ padding: "22%" }}
        >
          <NeonLogo />
        </div>
        <X
          className={cn(
            "absolute size-8 text-foreground transition-all duration-300",
            open
              ? "rotate-0 scale-100 opacity-100"
              : "-rotate-90 scale-50 opacity-0",
          )}
        />
      </button>
    </div>
  );
}
