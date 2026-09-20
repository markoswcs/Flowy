"use client";

import { X, Flag, Folder as FolderIcon, Tag, CircleDashed } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CustomSelect } from "@/components/ui/custom-select";
import type {
  Category,
  Folder,
  TaskFilters as TaskFilterValues,
  TaskPriority,
  TaskStatus,
} from "@/types/productivity";

interface TaskFiltersProps {
  value: TaskFilterValues;
  onChange: (filters: TaskFilterValues) => void;
  folders: Folder[];
  categories: Category[];
}

export function TaskFilters({
  value,
  onChange,
  folders,
  categories,
}: TaskFiltersProps) {
  const hasAdvancedFilters = Boolean(
    (value.priority && value.priority !== "all") ||
    (value.status && value.status !== "all") ||
    (value.folderId && value.folderId !== "all") ||
    (value.categoryId && value.categoryId !== "all") ||
    value.search,
  );

  return (
    <div 
      className="relative z-50 flex w-full flex-col gap-3 rounded-3xl border border-white/5 bg-black/20 p-2 backdrop-blur-2xl ring-1 ring-white/10 lg:flex-row lg:items-center lg:rounded-full lg:p-1.5 transition-all duration-500 hover:bg-black/30 hover:ring-white/20" 
      aria-label="Filtros de tarefas"
    >
      <div className="absolute inset-0 -z-10 rounded-3xl lg:rounded-full bg-gradient-to-r from-primary/5 via-transparent to-primary/5 opacity-50" aria-hidden="true" />
      
      {/* Filters Container */}
      <div className="flex flex-wrap items-center gap-1.5 sm:flex-nowrap lg:gap-2 px-1 pb-1 lg:pb-0">
        <label className="relative group flex-1 min-w-[110px] lg:min-w-[130px]">
          <span className="sr-only">Filtrar por prioridade</span>
          <CustomSelect
            value={value.priority ?? "all"}
            onChange={(val) => onChange({ ...value, priority: val as TaskPriority | "all" })}
            triggerIcon={<Flag className="size-3.5 transition-transform group-hover:scale-110 group-hover:text-primary" />}
            options={[
              { value: "all", label: "Prioridade" },
              { value: "low", label: "Baixa" },
              { value: "normal", label: "Normal" },
              { value: "high", label: "Alta" },
            ]}
            className="h-10 lg:h-9 w-full rounded-2xl lg:rounded-full border-white/5 bg-white/5 backdrop-blur-md transition-all duration-300 hover:bg-white/10 hover:shadow-[0_0_15px_rgba(255,255,255,0.05)] focus:ring-primary/30"
          />
        </label>

        <label className="relative group flex-1 min-w-[110px] lg:min-w-[130px]">
          <span className="sr-only">Filtrar por status</span>
          <CustomSelect
            value={value.status ?? "all"}
            onChange={(val) => onChange({ ...value, status: val as TaskStatus | "all" })}
            triggerIcon={<CircleDashed className="size-3.5 transition-transform group-hover:scale-110 group-hover:text-primary" />}
            options={[
              { value: "all", label: "Status" },
              { value: "todo", label: "A fazer" },
              { value: "in_progress", label: "Em andamento" },
              { value: "completed", label: "Concluída" },
            ]}
            className="h-10 lg:h-9 w-full rounded-2xl lg:rounded-full border-white/5 bg-white/5 backdrop-blur-md transition-all duration-300 hover:bg-white/10 hover:shadow-[0_0_15px_rgba(255,255,255,0.05)] focus:ring-primary/30"
          />
        </label>

        <label className="relative group flex-1 min-w-[110px] lg:min-w-[130px]">
          <span className="sr-only">Filtrar por pasta</span>
          <CustomSelect
            value={value.folderId ?? "all"}
            onChange={(val) => onChange({ ...value, folderId: val })}
            triggerIcon={<FolderIcon className="size-3.5 transition-transform group-hover:scale-110 group-hover:text-primary" />}
            options={[
              { value: "all", label: "Pastas" },
              ...folders.map(f => ({ value: f.id, label: f.name, color: f.color }))
            ]}
            className="h-10 lg:h-9 w-full rounded-2xl lg:rounded-full border-white/5 bg-white/5 backdrop-blur-md transition-all duration-300 hover:bg-white/10 hover:shadow-[0_0_15px_rgba(255,255,255,0.05)] focus:ring-primary/30"
          />
        </label>

        <label className="relative group flex-1 min-w-[110px] lg:min-w-[130px]">
          <span className="sr-only">Filtrar por tag</span>
          <CustomSelect
            value={value.categoryId ?? "all"}
            onChange={(val) => onChange({ ...value, categoryId: val })}
            triggerIcon={<Tag className="size-3.5 transition-transform group-hover:scale-110 group-hover:text-primary" />}
            options={[
              { value: "all", label: "Tags" },
              ...categories.map(c => ({ value: c.id, label: c.name, color: c.color }))
            ]}
            className="h-10 lg:h-9 w-full rounded-2xl lg:rounded-full border-white/5 bg-white/5 backdrop-blur-md transition-all duration-300 hover:bg-white/10 hover:shadow-[0_0_15px_rgba(255,255,255,0.05)] focus:ring-primary/30"
          />
        </label>

        {hasAdvancedFilters && (
          <div className="pl-1 animate-in fade-in zoom-in slide-in-from-right-2 duration-300">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onChange({ scope: value.scope ?? "all" })}
              className="h-10 w-10 lg:h-9 lg:w-9 shrink-0 rounded-full text-muted-foreground hover:bg-destructive/20 hover:text-destructive hover:scale-110 hover:rotate-90 transition-all duration-300"
              title="Limpar filtros"
            >
              <X className="size-4" aria-hidden="true" />
              <span className="sr-only">Limpar filtros</span>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
