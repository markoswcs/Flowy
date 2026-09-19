"use client";

import { type FormEvent, useState } from "react";
import { Calendar, ChevronDown, Flag, Folder as FolderIcon, Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CustomSelect } from "@/components/ui/custom-select";
import { useCreateTask } from "@/features/tasks/use-tasks";
import { cn } from "@/lib/utils";
import type { Category, Folder, TaskPriority } from "@/types/productivity";

interface TaskComposerProps {
  folders?: Folder[];
  categories?: Category[];
  defaultFolderId?: string | null;
  defaultDueDate?: string | null;
  defaultCategoryIds?: string[];
  compact?: boolean;
}

export function TaskComposer({
  folders = [],
  categories = [],
  defaultFolderId = null,
  defaultDueDate = null,
  defaultCategoryIds = [],
  compact = false,
}: TaskComposerProps) {
  const createMutation = useCreateTask();
  const [title, setTitle] = useState("");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [dueDate, setDueDate] = useState(defaultDueDate ?? "");
  const [priority, setPriority] = useState<TaskPriority>("normal");
  const [folderId, setFolderId] = useState(defaultFolderId ?? "");
  const [categoryIds, setCategoryIds] = useState<string[]>(defaultCategoryIds);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle) return;

    createMutation.mutate(
      {
        title: cleanTitle,
        due_date: dueDate || null,
        priority,
        folder_id: folderId || null,
        category_ids: categoryIds,
      },
      {
        onSuccess: () => {
          setTitle("");
          setDueDate(defaultDueDate ?? "");
          setPriority("normal");
          setFolderId(defaultFolderId ?? "");
          setCategoryIds(defaultCategoryIds);
          if (compact) setDetailsOpen(false);
          toast.success("Tarefa criada.");
        },
      },
    );
  }

  return (
    <form
      onSubmit={submit}
      className={cn(
        "relative z-50 flex flex-col gap-2 rounded-3xl border border-border/40 bg-background/50 p-2 shadow-sm transition-all focus-within:border-primary/40 focus-within:ring-4 focus-within:ring-primary/10",
      )}
      aria-label="Criar tarefa"
    >
      <div className="absolute inset-0 -z-10 rounded-3xl backdrop-blur-xl" aria-hidden="true" />
      <div className="flex items-center gap-3 rounded-2xl bg-muted/30 px-3 py-1 transition-colors focus-within:bg-muted/50">
        <Plus className="size-5 text-primary" aria-hidden="true" />
        <Input
          id="mobile-task-input"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="O que precisa ser feito?"
          aria-label="Título da nova tarefa"
          className="h-12 border-0 bg-transparent px-0 text-base shadow-none focus-visible:ring-0 placeholder:text-muted-foreground/60"
          disabled={createMutation.isPending}
        />
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setDetailsOpen((open) => !open)}
            className={cn(
              "rounded-xl text-muted-foreground transition-all hover:bg-background hover:text-foreground",
              detailsOpen && "bg-background text-foreground shadow-sm"
            )}
            aria-expanded={detailsOpen}
            aria-label={detailsOpen ? "Ocultar opções" : "Mostrar opções"}
          >
            <ChevronDown
              className={cn("size-4 transition-transform", detailsOpen ? "rotate-180" : "")}
              aria-hidden="true"
            />
          </Button>
          <Button
            type="submit"
            className="rounded-xl px-5 font-medium shadow-sm transition-all active:scale-95"
            loading={createMutation.isPending}
            disabled={!title.trim()}
          >
            Criar
          </Button>
        </div>
      </div>

      {detailsOpen && (
        <div className="grid gap-5 animate-in slide-in-from-top-2 fade-in px-4 pb-4 pt-2 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="quick-task-date" className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              Data de Entrega
            </Label>
            <div className="relative group">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
              <Input
                id="quick-task-date"
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
                className="h-10 w-full appearance-none rounded-xl border-border/60 bg-background/50 pl-10 text-sm shadow-sm transition-all hover:bg-background focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              Prioridade
            </Label>
            <div className="flex gap-1.5 rounded-xl border border-border/60 p-1 bg-background/30">
              {(["low", "normal", "high"] as TaskPriority[]).map((p) => {
                const isSelected = priority === p;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-medium transition-all duration-200",
                      isSelected
                        ? "bg-background text-foreground shadow-sm ring-1 ring-border/50"
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    )}
                  >
                    <Flag className={cn("size-3", isSelected && p === "high" ? "text-destructive" : isSelected && p === "low" ? "text-blue-500" : isSelected ? "text-primary" : "")} />
                    {p === "low" ? "Baixa" : p === "normal" ? "Normal" : "Alta"}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="quick-task-folder" className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              Pasta
            </Label>
            <CustomSelect
              value={folderId || "none"}
              onChange={(val) => setFolderId(val === "none" ? "" : val)}
              triggerIcon={<FolderIcon className="size-4" />}
              options={[
                { value: "none", label: "Nenhuma pasta" },
                ...folders.map(f => ({ value: f.id, label: f.name, color: f.color }))
              ]}
              className="h-10 w-full border-border/60 bg-background/50 backdrop-blur-lg"
            />
          </div>

          {categories.length > 0 && (
            <div className="sm:col-span-3 pt-2">
              <Label className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase block mb-2">
                Tags
              </Label>
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => {
                  const isSelected = categoryIds.includes(category.id);
                  return (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() =>
                        setCategoryIds((current) =>
                          isSelected
                            ? current.filter((id) => id !== category.id)
                            : [...current, category.id],
                        )
                      }
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[11px] font-medium transition-all duration-200",
                        isSelected
                          ? "shadow-sm scale-[1.02]"
                          : "border-border/60 bg-muted/30 text-muted-foreground hover:border-border hover:bg-muted/50 hover:text-foreground"
                      )}
                      style={
                        isSelected
                          ? {
                              backgroundColor: `${category.color}20`,
                              borderColor: `${category.color}50`,
                              color: category.color,
                            }
                          : {}
                      }
                    >
                      <span
                        className="size-2 rounded-full transition-all"
                        style={{ backgroundColor: category.color }}
                        aria-hidden="true"
                      />
                      {category.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </form>
  );
}
