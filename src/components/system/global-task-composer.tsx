"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useCategories } from "@/features/categories/use-categories";
import { useFolders } from "@/features/folders/use-folders";
import { holdOverlay } from "@/lib/overlay";

// Loaded when first opened (and warmed in the background by the app shell).
const TaskComposer = dynamic(
  () => import("@/features/tasks/components/task-composer").then((mod) => mod.TaskComposer),
  { ssr: false, loading: () => <div className="h-64 rounded-3xl bg-card/80" /> },
);

export function GlobalTaskComposer() {
  const [open, setOpen] = useState(false);
  // What opened the composer: text to review and/or start dictating. A new
  // key per opening gives the composer fresh state.
  const [launch, setLaunch] = useState<{ key: number; text?: string; voice?: boolean }>({ key: 0 });
  const foldersQuery = useFolders();
  const categoriesQuery = useCategories();

  useEffect(() => {
    const handleOpen = (event: Event) => {
      const detail = (event as CustomEvent<{ text?: string; voice?: boolean } | undefined>).detail;
      setLaunch((current) => ({ key: current.key + 1, text: detail?.text, voice: detail?.voice }));
      setOpen(true);
    };
    const handleClose = () => setOpen(false);

    window.addEventListener("flowy:open-task-composer", handleOpen);
    window.addEventListener("flowy:close-overlays", handleClose);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") handleClose();
      
      const modifier = event.metaKey || event.ctrlKey;
      const target = event.target as HTMLElement | null;
      const editing =
        target?.isContentEditable ||
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "SELECT";

      if (event.key?.toLowerCase() === "n" && modifier && !editing) {
        event.preventDefault();
        setLaunch((current) => ({ key: current.key + 1 }));
        setOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("flowy:open-task-composer", handleOpen);
      window.removeEventListener("flowy:close-overlays", handleClose);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    return holdOverlay();
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in" role="presentation">
      <div 
        className="flowy-glass-scrim absolute inset-0 transition-opacity" 
        onClick={() => setOpen(false)} 
        aria-hidden="true" 
      />
      
      <div 
        className="w-full max-w-2xl animate-scale-in relative z-10"
        role="dialog"
        aria-modal="true"
        aria-label="Nova Tarefa"
      >
        <div className="absolute right-3 top-3 z-50">
          <Button 
            type="button" 
            variant="ghost" 
            size="icon" 
            className="size-8 rounded-full bg-muted/50 hover:bg-muted text-muted-foreground backdrop-blur-md transition-colors"
            onClick={() => setOpen(false)}
            aria-label="Fechar"
          >
            <X className="size-4" />
          </Button>
        </div>
        
        <TaskComposer
          key={launch.key}
          folders={foldersQuery.data ?? []}
          categories={categoriesQuery.data ?? []}
          initialText={launch.text}
          autoVoice={launch.voice}
        />
      </div>
    </div>
  );
}
