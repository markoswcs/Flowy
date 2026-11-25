"use client";

import {
  CheckSquare,
  Folder,
  Mic,
  Network,
  NotebookPen,
  PenTool,
  Plus,
  Tag,
  X,
} from "lucide-react";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "@/lib/toast";

import { NEW_PARAM, SECTION_HREF } from "@/features/notes/note-sections";
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
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKey);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const openComposer = (voice = false) => {
    window.dispatchEvent(
      new CustomEvent("flowy:open-task-composer", { detail: { voice } }),
    );
    setOpen(false);
  };

  const openOrganizer = (target: "folders" | "categories") => {
    window.dispatchEvent(
      new CustomEvent("flowy:open-organizer", { detail: target }),
    );
    setOpen(false);
  };

  const handleCreateNote = async (kind: "text" | "excalidraw" = "text") => {
    setOpen(false);
    try {
      const note = await createNote.mutateAsync(
        kind === "excalidraw"
          ? { kind, title: "Desenho sem título" }
          : undefined,
      );
      router.push(`/app/notes/${note.id}`);
    } catch {
      toast.error(
        kind === "excalidraw"
          ? "Não foi possível criar o desenho."
          : "Não foi possível criar a nota.",
      );
    }
  };

  // Maps start from the template picker on the Mapas page.
  const handleCreateMap = () => {
    setOpen(false);
    router.push(`${SECTION_HREF.mapa}&${NEW_PARAM}=1`);
  };

  return (
    <div
      ref={containerRef}
      data-tour="create"
      className={cn(
        "global-create-button fixed bottom-[calc(max(0.75rem,env(safe-area-inset-bottom))+1.6rem)] left-1/2 z-[100] -translate-x-1/2 md:bottom-10 md:left-auto md:right-10 md:translate-x-0 transition-all duration-300",
        className,
      )}
    >
      <div
        role="menu"
        aria-label="Criar"
        className={cn(
          "absolute bottom-full mb-4 flowy-glass flowy-glass-strong w-[min(20rem,calc(100vw-1.5rem))] rounded-[1.6rem] border p-2.5 transition-all duration-300 origin-bottom",
          "left-1/2 -translate-x-1/2 md:left-auto md:right-0 md:translate-x-0",
          open
            ? "visible translate-y-0 scale-100 opacity-100"
            : "invisible translate-y-4 scale-95 opacity-0",
        )}
      >
        {/* The other things to create, compact, further from the thumb. */}
        <p className="px-1 pb-1.5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          Criar também
        </p>
        <div className="grid grid-cols-5 gap-1">
          {[
            {
              label: "Nota",
              icon: NotebookPen,
              tone: "bg-orange-500/15 text-orange-400",
              run: () => void handleCreateNote(),
            },
            {
              label: "Desenho",
              icon: PenTool,
              tone: "bg-sky-500/15 text-sky-400",
              run: () => void handleCreateNote("excalidraw"),
            },
            {
              label: "Mapa",
              icon: Network,
              tone: "bg-emerald-500/15 text-emerald-400",
              run: handleCreateMap,
            },
            {
              label: "Pasta",
              icon: Folder,
              tone: "bg-blue-500/15 text-blue-400",
              run: () => openOrganizer("folders"),
            },
            {
              label: "Etiqueta",
              icon: Tag,
              tone: "bg-purple-500/15 text-purple-400",
              run: () => openOrganizer("categories"),
            },
          ].map(({ label, icon: Icon, tone, run }) => (
            <button
              key={label}
              type="button"
              role="menuitem"
              data-no-glow
              onClick={run}
              disabled={createNote.isPending}
              className="flex min-w-0 flex-col items-center gap-1.5 rounded-xl py-2 text-[11px] font-medium text-foreground transition-colors hover:bg-muted/50 active:scale-95 disabled:opacity-50"
            >
              <span
                className={cn(
                  "grid size-10 place-items-center rounded-xl",
                  tone,
                )}
              >
                <Icon className="size-5" />
              </span>
              <span className="w-full truncate text-center">{label}</span>
            </button>
          ))}
        </div>

        {/* The main action, right above the + where the thumb already is. */}
        <div className="mt-2.5 flex gap-2 border-t border-border/50 pt-2.5">
          <button
            type="button"
            role="menuitem"
            data-no-glow
            onClick={() => openComposer()}
            className="flex h-14 flex-1 items-center justify-center gap-2.5 rounded-2xl bg-primary text-base font-semibold text-primary-foreground shadow-[0_8px_20px_-10px] shadow-primary transition-transform active:scale-[0.97]"
          >
            <CheckSquare className="size-5" />
            Criar tarefa
          </button>
          <button
            type="button"
            role="menuitem"
            data-no-glow
            onClick={() => openComposer(true)}
            aria-label="Criar tarefa por voz"
            title="Criar tarefa por voz"
            className="flex h-14 w-16 flex-col items-center justify-center gap-0.5 rounded-2xl bg-rose-500/15 text-rose-400 transition-transform active:scale-95"
          >
            <Mic className="size-5" />
            <span className="text-[10px] font-semibold">Voz</span>
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setOpen(!open)}
        data-no-glow
        className={cn(
          "group relative flex size-[3.6rem] items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 shadow-[0_10px_30px_-6px_rgb(124_58_237/0.75)] ring-[5px] ring-background md:ring-1 md:ring-white/20 transition-all duration-300 active:scale-90 md:size-16 md:rounded-[1.4rem] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-400/50",
          open
            ? "rotate-45"
            : "hover:-translate-y-0.5 hover:shadow-[0_14px_36px_-6px_rgb(124_58_237/0.85)]",
        )}
        aria-label={open ? "Fechar menu" : "Criar novo item"}
      >
        <Plus
          className={cn(
            "absolute size-6 text-white transition-all duration-300",
            open ? "scale-50 opacity-0" : "scale-100 opacity-100",
          )}
        />
        <X
          className={cn(
            "absolute size-7 text-white transition-all duration-300",
            open
              ? "rotate-0 scale-100 opacity-100"
              : "-rotate-90 scale-50 opacity-0",
          )}
        />
      </button>
    </div>
  );
}
