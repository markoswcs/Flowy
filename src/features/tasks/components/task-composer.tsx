"use client";

import { type FormEvent, useState } from "react";
import {
  Calendar,
  ChevronDown,
  Clock3,
  Flag,
  Folder as FolderIcon,
  Plus,
  Repeat2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CustomSelect } from "@/components/ui/custom-select";
import { TaskTagSelector } from "@/features/tasks/components/task-tag-selector";
import { useCreateTask } from "@/features/tasks/use-tasks";
import { cn } from "@/lib/utils";
import type {
  Category,
  Folder,
  TaskPriority,
  TaskRecurrence,
} from "@/types/productivity";

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
  const [dueTime, setDueTime] = useState("");
  const [recurrence, setRecurrence] = useState<TaskRecurrence | "none">(
    "none",
  );
  const [priority, setPriority] = useState<TaskPriority>("normal");
  const [folderId, setFolderId] = useState(defaultFolderId ?? "");
  const [categoryIds, setCategoryIds] = useState<string[]>(defaultCategoryIds);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle) return;
    if (recurrence !== "none" && !dueDate) {
      toast.error("Escolha uma data para repetir a tarefa.");
      return;
    }

    createMutation.mutate(
      {
        title: cleanTitle,
        due_date: dueDate || null,
        due_time: dueDate && dueTime ? dueTime : null,
        recurrence: recurrence === "none" ? null : recurrence,
        priority,
        folder_id: folderId || null,
        category_ids: categoryIds,
      },
      {
        onSuccess: () => {
          setTitle("");
          setDueDate(defaultDueDate ?? "");
          setDueTime("");
          setRecurrence("none");
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
            disabled={!title.trim() || (recurrence !== "none" && !dueDate)}
          >
            Criar
          </Button>
        </div>
      </div>

      {detailsOpen && (
        <div className="grid gap-5 animate-in slide-in-from-top-2 fade-in px-4 pb-4 pt-2 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="quick-task-date" className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              Data e hora
            </Label>
            <div className="grid grid-cols-[minmax(0,1fr)_7.5rem] gap-2">
              <div className="relative group">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                <Input
                  id="quick-task-date"
                  type="date"
                  value={dueDate}
                  onChange={(event) => {
                    setDueDate(event.target.value);
                    if (!event.target.value) setRecurrence("none");
                  }}
                  className="h-10 w-full appearance-none rounded-xl border-border/60 bg-background/50 pl-10 text-sm shadow-sm transition-all hover:bg-background focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="relative group">
                <Clock3 className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                <Input
                  type="time"
                  value={dueTime}
                  onChange={(event) => setDueTime(event.target.value)}
                  disabled={!dueDate}
                  aria-label="Hora da tarefa"
                  className="h-10 w-full appearance-none rounded-xl border-border/60 bg-background/50 pl-10 text-sm shadow-sm transition-all hover:bg-background focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              Repetir
            </Label>
            <div className={cn(!dueDate && "pointer-events-none opacity-50")}>
              <CustomSelect
                value={recurrence}
                onChange={(value) =>
                  setRecurrence(value as TaskRecurrence | "none")
                }
                triggerIcon={<Repeat2 className="size-4" />}
                options={[
                  { value: "none", label: "Não repetir" },
                  { value: "daily", label: "Todos os dias" },
                  { value: "weekly", label: "Toda semana" },
                  { value: "monthly", label: "Todo mês" },
                ]}
                className="h-10 w-full border-border/60 bg-background/50 backdrop-blur-lg"
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

          <div className="pt-2 sm:col-span-2 lg:col-span-4">
            <Label className="mb-2 block text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              Tags
            </Label>
            <TaskTagSelector
              categories={categories}
              value={categoryIds}
              onChange={setCategoryIds}
            />
          </div>
        </div>
      )}
    </form>
  );
}
