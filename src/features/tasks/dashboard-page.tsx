"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Calendar, CheckCircle2, ChevronDown, Clock, List, SlidersHorizontal, Sun, Moon, MoonStar, Sunrise, Sparkles, Search } from "lucide-react";

import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCategories } from "@/features/categories/use-categories";
import { useFolders } from "@/features/folders/use-folders";
import { TaskFilters } from "@/features/tasks/components/task-filters";
import { TaskKanban } from "@/features/tasks/components/task-kanban";
import { TaskMatrix } from "@/features/tasks/components/task-matrix";
import { TaskList } from "@/features/tasks/components/task-list";
import { TaskViewSwitcher } from "@/features/tasks/components/task-view-switcher";
import { useTasks, useTasksRealtime } from "@/features/tasks/use-tasks";
import type {
  TaskFilters as TaskFilterValues,
  TaskScope,
} from "@/types/productivity";

function useDebouncedValue(value: string, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timeout = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timeout);
  }, [delay, value]);
  return debounced;
}

interface DashboardPageProps {
  displayName: string;
  initialOrganizer?: "folders" | "categories" | null;
  initialScope?: TaskScope;
  initialLayout?: "list" | "kanban" | "matrix";
}

const scopes = [
  { value: "all", label: "Todas", icon: List, colorClass: "text-muted-foreground", bgClass: "hover:bg-muted/50 hover:text-foreground", activeClass: "bg-muted text-foreground font-medium shadow-sm" },
  { value: "today", label: "Hoje", icon: Calendar, colorClass: "text-primary", bgClass: "hover:bg-primary/10", activeClass: "bg-primary/15 text-primary font-medium shadow-sm border border-primary/20" },
  { value: "overdue", label: "Atrasadas", icon: AlertCircle, colorClass: "text-destructive", bgClass: "hover:bg-destructive/10", activeClass: "bg-destructive/15 text-destructive font-medium shadow-sm border border-destructive/20" },
  { value: "upcoming", label: "Próximas", icon: Clock, colorClass: "text-orange-400", bgClass: "hover:bg-orange-400/10", activeClass: "bg-orange-400/15 text-orange-400 font-medium shadow-sm border border-orange-400/20" },
  { value: "completed", label: "Concluídas", icon: CheckCircle2, colorClass: "text-success", bgClass: "hover:bg-success/10", activeClass: "bg-success/15 text-success font-medium shadow-sm border border-success/20" },
] as const;

export function DashboardPage({
  displayName,
  initialScope = "all",
  initialLayout = "list",
}: DashboardPageProps) {
  const [filters, setFilters] = useState<TaskFilterValues>({
    scope: initialScope,
  });
  const [statusBarOpen, setStatusBarOpen] = useState(false);
  const debouncedSearch = useDebouncedValue(filters.search ?? "", 250);
  const effectiveFilters = { ...filters, search: debouncedSearch };
  
  const tasksQuery = useTasks(effectiveFilters);
  const foldersQuery = useFolders();
  const categoriesQuery = useCategories();
  useTasksRealtime();

  const folders = foldersQuery.data ?? [];
  const categories = categoriesQuery.data ?? [];
  const firstName = displayName.trim().split(/\s+/)[0] || "Usuário";

  const [timeState, setTimeState] = useState({ hour: 12, ready: false });

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setTimeState({ hour: new Date().getHours(), ready: true });
    }, 0);
    const interval = window.setInterval(() => {
      setTimeState({ hour: new Date().getHours(), ready: true });
    }, 60000);
    return () => {
      window.clearTimeout(timeout);
      window.clearInterval(interval);
    };
  }, []);

  const { hour, ready } = timeState;
  
  let greeting = "Olá";
  let TimeIcon = Sparkles;
  let gradient = "from-primary to-purple-500";
  let phrase = "O que vamos realizar hoje?";

  if (ready) {
    if (hour >= 0 && hour < 6) {
      greeting = "Boa madrugada";
      TimeIcon = MoonStar;
      gradient = "from-indigo-400 via-purple-400 to-purple-600";
      phrase = "Trabalhando até tarde? Não esqueça de descansar um pouco.";
    } else if (hour >= 6 && hour < 12) {
      greeting = "Bom dia";
      TimeIcon = Sunrise;
      gradient = "from-amber-400 via-orange-400 to-orange-600";
      phrase = "Pronto para fazer o dia render? Vamos lá!";
    } else if (hour >= 12 && hour < 18) {
      greeting = "Boa tarde";
      TimeIcon = Sun;
      gradient = "from-orange-400 via-rose-400 to-rose-600";
      phrase = "Continue o bom trabalho, seu dia está fluindo!";
    } else {
      greeting = "Boa noite";
      TimeIcon = Moon;
      gradient = "from-blue-400 via-indigo-400 to-indigo-600";
      phrase = "Hora de fechar as tarefas de hoje com chave de ouro.";
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <header className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-6 flex-1">
          <div className="group flex flex-col gap-1.5 transition-all duration-300">
            <h1 className="flex items-center gap-3 text-3xl sm:text-4xl font-bold tracking-tight">
              <span className={cn(
                "flex items-center justify-center p-2 rounded-2xl bg-gradient-to-br shadow-lg transition-all duration-500 group-hover:scale-110 group-hover:rotate-12",
                gradient,
                "text-white"
              )}>
                <TimeIcon className="size-6 sm:size-7 animate-in zoom-in duration-700" />
              </span>
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70 transition-all duration-500 group-hover:to-foreground/90">
                {greeting}, {firstName}
              </span>
            </h1>
            <p className="flex items-center gap-2 text-sm sm:text-base text-muted-foreground/80 pl-1 animate-in fade-in slide-in-from-left-2 duration-700 delay-150">
              <Sparkles className="size-4 text-primary/60" />
              {phrase}
            </p>
          </div>
          
          {statusBarOpen ? <div className="pt-2">
            <div className="flex flex-wrap gap-2" role="group" aria-label="Período">
              {scopes.map((scope) => {
                const selected = (filters.scope ?? "all") === scope.value;
                const Icon = scope.icon;
                return (
                  <button
                    key={scope.value}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setFilters({ ...filters, scope: scope.value })}
                    className={cn(
                      "flex items-center gap-2 rounded-full px-4 py-2 text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-95",
                      selected ? scope.activeClass : cn("text-muted-foreground", scope.bgClass)
                    )}
                  >
                    <Icon className={cn("size-4", selected ? "" : scope.colorClass)} />
                    {scope.label}
                  </button>
                );
              })}
            </div>
          </div> : null}
        </div>

        <div className="flex items-center gap-2 mt-2 lg:mt-0">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setStatusBarOpen(!statusBarOpen)}
            aria-label={statusBarOpen ? "Ocultar visões rápidas" : "Mostrar visões rápidas"}
            className="text-muted-foreground hover:text-foreground"
          >
            <ChevronDown className={`size-4 transition-transform ${statusBarOpen ? "rotate-180" : ""}`} aria-hidden="true" />
          </Button>
          <TaskViewSwitcher activeView={initialLayout} />
          <Button
            type="button"
            variant="outline"
            className="rounded-full bg-card/60 backdrop-blur-md border-border/50"
            onClick={() => window.dispatchEvent(new CustomEvent("flowy:open-organizer", { detail: "folders" }))}
          >
            <SlidersHorizontal className="size-4" aria-hidden="true" />
            <span className="hidden sm:inline">Organizar</span>
          </Button>
        </div>
      </header>

      <div className="space-y-5">

        {/* Search Bar - Always Visible */}
        <div className="relative z-40 flex w-full flex-col gap-3 rounded-3xl border border-white/5 bg-black/20 p-2 backdrop-blur-2xl ring-1 ring-white/10 lg:flex-row lg:items-center lg:rounded-full lg:p-1.5 transition-all duration-500 hover:bg-black/30 hover:ring-white/20">
          <div className="absolute inset-0 -z-10 rounded-3xl lg:rounded-full bg-gradient-to-r from-primary/5 via-transparent to-primary/5 opacity-50" aria-hidden="true" />
          <div className="relative flex-1 w-full group">
            <span className="sr-only">Pesquisar tarefas</span>
            <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground transition-all duration-300 group-focus-within:text-primary group-hover:scale-110" aria-hidden="true" />
            <Input
              value={filters.search ?? ""}
              onChange={(event) => setFilters({ ...filters, search: event.target.value })}
              placeholder="Pesquisar tarefas, notas, ideias..."
              className="h-11 lg:h-10 w-full appearance-none rounded-2xl lg:rounded-full border-none bg-transparent pl-11 text-sm text-foreground shadow-none placeholder:text-muted-foreground/70 focus-visible:ring-0 focus-visible:ring-offset-0 transition-all duration-300"
            />
            {/* Animated glow line on focus */}
            <div className="absolute bottom-0 left-4 right-4 h-[1px] bg-gradient-to-r from-transparent via-primary/50 to-transparent scale-x-0 opacity-0 transition-all duration-500 group-focus-within:scale-x-100 group-focus-within:opacity-100" />
          </div>
        </div>

        {statusBarOpen && (
          <TaskFilters
            value={filters}
            onChange={setFilters}
            folders={folders}
            categories={categories}
          />
        )}

        {initialLayout === "kanban" ? (
          <TaskKanban
            tasks={tasksQuery.data}
            folders={folders}
            categories={categories}
            loading={tasksQuery.isLoading}
            error={tasksQuery.error}
            onRetry={() => tasksQuery.refetch()}
          />
        ) : initialLayout === "matrix" ? (
          <TaskMatrix
            tasks={tasksQuery.data}
            folders={folders}
            categories={categories}
            loading={tasksQuery.isLoading}
            error={tasksQuery.error}
            onRetry={() => tasksQuery.refetch()}
          />
        ) : (
          <section className="mt-4 animate-slide-up-fade [animation-delay:200ms]" aria-live="polite">
            <TaskList
              tasks={tasksQuery.data}
              folders={folders}
              categories={categories}
              loading={tasksQuery.isLoading}
              error={tasksQuery.error}
              onRetry={() => tasksQuery.refetch()}
              emptyTitle={
                filters.scope === "completed"
                  ? "Nenhuma tarefa concluída."
                  : "Você ainda não tem tarefas."
              }
              emptyDescription={
                debouncedSearch
                  ? "Tente buscar por outro termo."
                  : "Crie uma tarefa para começar."
              }
            />
          </section>
        )}
      </div>
    </div>
  );
}
