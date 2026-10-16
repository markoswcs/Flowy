"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Calendar, CheckCircle2, Clock, CornerDownLeft, List, Sun, Moon, MoonStar, Sunrise, Sparkles, Search, SlidersHorizontal, ListChecks, X } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  SmartSuggestionChips,
  useSmartOrganize,
  withDismissed,
} from "@/features/tasks/components/smart-suggestions";
import { BulkActionBar, TaskSelectionProvider, useTaskSelection } from "@/features/tasks/task-selection";

import { Input } from "@/components/ui/input";
import { useCategories } from "@/features/categories/use-categories";
import { useFolders } from "@/features/folders/use-folders";
import { TaskFilters } from "@/features/tasks/components/task-filters";
import { TaskKanban } from "@/features/tasks/components/task-kanban";
import { TaskMatrix } from "@/features/tasks/components/task-matrix";
import { TaskList } from "@/features/tasks/components/task-list";
import { TaskViewSwitcher, type TaskView } from "@/features/tasks/components/task-view-switcher";
import { formatTaskDate } from "@/features/tasks/date-utils";
import { buildDailyPhrase } from "@/features/tasks/daily-phrase";
import { parseQuickTask } from "@/features/tasks/quick-task";
import { useCreateTask, useTasks, useTasksRealtime } from "@/features/tasks/use-tasks";
import { useNotifications } from "@/providers/notification-provider";
import type {
  TaskFilters as TaskFilterValues,
  TaskPriority,
  TaskScope,
  TaskStatus,
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

export function DashboardPage(props: DashboardPageProps) {
  return (
    <TaskSelectionProvider>
      <DashboardContent {...props} />
    </TaskSelectionProvider>
  );
}

const priorityLabels: Record<TaskPriority, string> = { low: "Baixa", normal: "Normal", high: "Alta" };
const statusLabels: Record<TaskStatus, string> = {
  todo: "A fazer",
  in_progress: "Em andamento",
  completed: "Concluída",
};

function DashboardContent({
  displayName,
  initialScope = "all",
  initialLayout = "list",
}: DashboardPageProps) {
  const { addNotification } = useNotifications();
  const createTask = useCreateTask();
  const [filters, setFilters] = useState<TaskFilterValues>({
    scope: initialScope,
  });
  const [statusBarOpen, setStatusBarOpen] = useState(false);
  const [layout, setLayout] = useState<TaskView>(initialLayout);
  const debouncedSearch = useDebouncedValue(filters.search ?? "", 250);
  const effectiveFilters = { ...filters, search: debouncedSearch };
  
  const tasksQuery = useTasks(effectiveFilters);
  const allTasksQuery = useTasks({ scope: "all" });
  const foldersQuery = useFolders();
  const categoriesQuery = useCategories();
  useTasksRealtime();

  const folders = foldersQuery.data ?? [];
  const categories = categoriesQuery.data ?? [];
  const firstName = displayName.trim().split(/\s+/)[0] || "Usuário";

  const searchText = filters.search ?? "";
  const [dismissed, setDismissed] = useState({ folder: false, categoryIds: [] as string[] });
  const smart = withDismissed(useSmartOrganize(searchText, folders, categories), dismissed);
  const quickTask = searchText.trim() ? parseQuickTask(smart?.title || searchText) : null;
  const selection = useTaskSelection();
  const quickTaskWhen = quickTask?.due_date
    ? `${formatTaskDate(quickTask.due_date)}${quickTask.due_time ? ` às ${quickTask.due_time}` : ""}`
    : null;

  function createFromSearch() {
    if (!quickTask || createTask.isPending) return;
    createTask.mutate(
      {
        title: quickTask.title,
        due_date: quickTask.due_date,
        due_time: quickTask.due_time,
        folder_id: smart?.folderId ?? null,
        category_ids: smart?.categoryIds ?? [],
      },
      {
        onSuccess: () => {
          setFilters((current) => ({ ...current, search: "" }));
          setDismissed({ folder: false, categoryIds: [] });
          addNotification({
            title: "Tarefa criada",
            description: quickTaskWhen
              ? `${quickTask.title} · ${quickTaskWhen}`
              : quickTask.title,
          });
        },
      },
    );
  }

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

  const personalPhrase =
    ready && allTasksQuery.data ? buildDailyPhrase(allTasksQuery.data, new Date()) : null;
  const scopeIndex = Math.max(0, scopes.findIndex((scope) => scope.value === (filters.scope ?? "all")));
  const activeFilters = [
    filters.priority && filters.priority !== "all"
      ? { key: "priority", label: `Prioridade: ${priorityLabels[filters.priority]}`, clear: () => setFilters({ ...filters, priority: "all" }) }
      : null,
    filters.status && filters.status !== "all"
      ? { key: "status", label: `Status: ${statusLabels[filters.status]}`, clear: () => setFilters({ ...filters, status: "all" }) }
      : null,
    filters.folderId && filters.folderId !== "all"
      ? {
          key: "folder",
          label: `Pasta: ${folders.find((folder) => folder.id === filters.folderId)?.name ?? "—"}`,
          clear: () => setFilters({ ...filters, folderId: "all" }),
        }
      : null,
    filters.categoryId && filters.categoryId !== "all"
      ? {
          key: "category",
          label: `Etiqueta: ${categories.find((category) => category.id === filters.categoryId)?.name ?? "—"}`,
          clear: () => setFilters({ ...filters, categoryId: "all" }),
        }
      : null,
  ].filter((item): item is { key: string; label: string; clear: () => void } => Boolean(item));

  return (
    <div className="mx-auto w-full max-w-6xl space-y-4 sm:space-y-6">
      <header className="space-y-4 sm:space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div className="group min-w-0 space-y-1">
            <h1 className="flex min-w-0 items-center gap-2.5 text-2xl font-bold tracking-tight sm:gap-3 sm:text-4xl">
              <span
                className={cn(
                  "flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-br p-1.5 text-white shadow-lg transition-all duration-500 group-hover:rotate-12 group-hover:scale-110 sm:rounded-2xl sm:p-2",
                  gradient,
                )}
              >
                <TimeIcon className="size-5 animate-in zoom-in duration-700 sm:size-7" />
              </span>
              <span className="min-w-0 text-balance break-words bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text pb-[0.14em] leading-[1.15] text-transparent">
                {greeting}, {firstName}
              </span>
            </h1>
            <p className="flex min-w-0 items-start gap-2 pl-1 text-xs text-muted-foreground animate-in fade-in slide-in-from-left-2 duration-700 sm:text-sm">
              <Sparkles className="mt-0.5 size-3.5 shrink-0 text-primary/60" />
              <span className="line-clamp-2">{personalPhrase ?? phrase}</span>
            </p>
          </div>
          <div data-tour="views" className="shrink-0 pt-0.5 sm:pt-1.5">
            <TaskViewSwitcher activeView={layout} onChange={setLayout} />
          </div>
        </div>

        <div
          data-tour="scopes"
          role="tablist"
          aria-label="Período"
          className="relative grid grid-cols-5 rounded-2xl border border-border/60 bg-card/40 p-1 shadow-sm backdrop-blur-xl sm:inline-grid sm:grid-cols-[repeat(5,minmax(7.25rem,auto))]"
        >
          <span
            aria-hidden="true"
            className="absolute bottom-1 left-1 top-1 rounded-xl bg-background shadow-[0_6px_20px_-8px_hsl(var(--primary)/0.6)] ring-1 ring-border/70 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
            style={{ width: "calc((100% - 0.5rem) / 5)", transform: `translateX(${scopeIndex * 100}%)` }}
          />
          {scopes.map((scope) => {
            const selected = (filters.scope ?? "all") === scope.value;
            const Icon = scope.icon;
            return (
              <button
                key={scope.value}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setFilters({ ...filters, scope: scope.value })}
                className={cn(
                  "relative z-10 flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-[11px] font-medium leading-tight transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-95 sm:flex-row sm:gap-2 sm:px-4 sm:text-sm",
                  selected ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className={cn("size-4 shrink-0 transition-transform duration-300", scope.colorClass, selected && "scale-110")} />
                <span className="max-w-full truncate">{scope.label}</span>
              </button>
            );
          })}
        </div>

        <div className="space-y-2">
          <div
            data-tour="quick-add"
            className="group relative flex items-center gap-1 rounded-2xl border border-border/60 bg-card/50 p-1.5 shadow-sm backdrop-blur-xl transition-all duration-300 focus-within:border-primary/50 focus-within:shadow-[0_0_0_4px_hsl(var(--primary)/0.12)]"
          >
            <Search className="ml-2.5 size-4 shrink-0 text-muted-foreground transition-colors group-focus-within:text-primary" aria-hidden="true" />
            <Input
              value={filters.search ?? ""}
              onChange={(event) => setFilters({ ...filters, search: event.target.value })}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.nativeEvent.isComposing) {
                  event.preventDefault();
                  createFromSearch();
                }
              }}
              aria-label="Pesquisar ou criar tarefa"
              maxLength={300}
              enterKeyHint="done"
              placeholder="Buscar ou criar tarefa…"
              className="h-10 min-w-0 flex-1 appearance-none border-none bg-transparent px-2 text-sm shadow-none placeholder:text-muted-foreground/60 focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            <button
              type="button"
              onClick={() => setStatusBarOpen(!statusBarOpen)}
              aria-expanded={statusBarOpen}
              aria-label={activeFilters.length ? `Filtros (${activeFilters.length} ativos)` : "Filtros"}
              className={cn(
                "relative flex h-10 shrink-0 items-center gap-2 rounded-xl px-3 text-sm font-medium transition-all active:scale-95",
                statusBarOpen || activeFilters.length
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              <SlidersHorizontal className="size-4" aria-hidden="true" />
              <span className="hidden sm:inline">Filtros</span>
              {activeFilters.length ? (
                <span className="grid min-w-5 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold leading-5 text-primary-foreground animate-in zoom-in">
                  {activeFilters.length}
                </span>
              ) : null}
            </button>
            <button
              type="button"
              onClick={() => (selection?.active ? selection.clear() : selection?.start())}
              aria-pressed={Boolean(selection?.active)}
              aria-label="Selecionar tarefas"
              title="Selecionar várias tarefas"
              className={cn(
                "flex h-10 shrink-0 items-center gap-2 rounded-xl px-3 text-sm font-medium transition-all active:scale-95",
                selection?.active ? "bg-violet-500 text-white" : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              <ListChecks className="size-4" aria-hidden="true" />
              <span className="hidden sm:inline">Selecionar</span>
            </button>
          </div>

          {quickTask ? (
            <div className="flex flex-wrap items-center gap-2 animate-in fade-in slide-in-from-top-1">
              <button
                type="button"
                onClick={createFromSearch}
                disabled={createTask.isPending}
                className="flex min-h-9 min-w-0 max-w-full items-center gap-2 rounded-full bg-primary px-4 text-left text-sm font-medium text-primary-foreground shadow-sm transition-all hover:bg-primary/90 active:scale-[0.98] disabled:opacity-70"
              >
                <CornerDownLeft className="size-4 shrink-0" aria-hidden="true" />
                <span className="truncate">
                  Criar “{quickTask.title}”
                  {quickTaskWhen ? <span className="font-normal opacity-80"> · {quickTaskWhen}</span> : null}
                </span>
              </button>
              <SmartSuggestionChips
                suggestion={smart}
                folders={folders}
                categories={categories}
                onRemoveFolder={() => setDismissed((current) => ({ ...current, folder: true }))}
                onRemoveCategory={(id) => setDismissed((current) => ({ ...current, categoryIds: [...current.categoryIds, id] }))}
              />
            </div>
          ) : null}

          {activeFilters.length ? (
            <div className="flex flex-wrap items-center gap-1.5 animate-in fade-in slide-in-from-top-1" aria-live="polite">
              <span className="mr-1 text-xs font-medium text-muted-foreground">Filtrando por</span>
              {activeFilters.map((filter) => (
                <span key={filter.key} className="flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 py-1 pl-3 pr-1 text-xs font-medium text-primary">
                  {filter.label}
                  <button
                    type="button"
                    onClick={filter.clear}
                    className="grid size-5 place-items-center rounded-full hover:bg-primary/20"
                    aria-label={`Remover filtro ${filter.label}`}
                  >
                    <X className="size-3" />
                  </button>
                </span>
              ))}
              <button
                type="button"
                onClick={() => setFilters({ scope: filters.scope, search: filters.search })}
                className="rounded-full px-2 py-1 text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                Limpar tudo
              </button>
            </div>
          ) : null}
        </div>
      </header>

      <div className="space-y-4 sm:space-y-5">

        {statusBarOpen && (
          <TaskFilters
            value={filters}
            onChange={setFilters}
            folders={folders}
            categories={categories}
          />
        )}

        <div key={layout} className="animate-in fade-in slide-in-from-bottom-1 duration-300">
        {layout === "kanban" ? (
          <TaskKanban
            tasks={tasksQuery.data}
            folders={folders}
            categories={categories}
            loading={tasksQuery.isLoading}
            error={tasksQuery.error}
            onRetry={() => tasksQuery.refetch()}
          />
        ) : layout === "matrix" ? (
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
              grouped={(filters.scope ?? "all") === "all" && !debouncedSearch}
              emptyAction={
                debouncedSearch ? null : (
                  <button
                    type="button"
                    onClick={() => window.dispatchEvent(new Event("flowy:open-task-composer"))}
                    className="inline-flex h-10 items-center gap-2 rounded-full bg-violet-500 px-5 text-sm font-semibold text-white shadow-[0_10px_30px_-10px_rgb(124_58_237/0.8)] transition-transform active:scale-95"
                  >
                    Criar uma tarefa
                  </button>
                )
              }
              emptyTitle={
                filters.scope === "completed"
                  ? "Nenhuma tarefa concluída."
                  : "Você ainda não tem tarefas."
              }
              emptyDescription={
                debouncedSearch
                  ? "Aperte Enter para criar essa tarefa."
                  : "Crie uma tarefa para começar."
              }
            />
          </section>
        )}
        </div>
      </div>
      <BulkActionBar tasks={tasksQuery.data ?? []} folders={folders} categories={categories} />
    </div>
  );
}
