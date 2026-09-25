"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useCategories } from "@/features/categories/use-categories";
import { useFolders } from "@/features/folders/use-folders";
import { TaskComposer } from "@/features/tasks/components/task-composer";

export function GlobalTaskComposer() {
  const [open, setOpen] = useState(false);
  const foldersQuery = useFolders();
  const categoriesQuery = useCategories();

  useEffect(() => {
    const handleOpen = () => setOpen(true);
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
    if (open) {
      document.body.classList.add("has-overlay");
    } else {
      document.body.classList.remove("has-overlay");
    }
    return () => document.body.classList.remove("has-overlay");
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in" role="presentation">
      <div 
        className="absolute inset-0 bg-background/80 backdrop-blur-sm transition-opacity" 
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
          folders={foldersQuery.data ?? []} 
          categories={categoriesQuery.data ?? []} 
        />
      </div>
    </div>
  );
}
