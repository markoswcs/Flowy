"use client";

import { AlertCircle, CalendarClock, Target, Trash2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TaskItem } from "@/features/tasks/components/task-item";
import { isOverdueDate, isToday } from "@/features/tasks/date-utils";
import type { Category, Folder, Task } from "@/types/productivity";

interface TaskMatrixProps {
  tasks: Task[] | undefined;
  folders: Folder[];
  categories: Category[];
  loading?: boolean;
  error?: unknown;
  onRetry?: () => void;
}

export function TaskMatrix({
  tasks,
  folders,
  categories,
  loading = false,
  error,
  onRetry,
}: TaskMatrixProps) {
  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2" aria-label="Carregando Matriz">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="min-h-[300px] rounded-3xl" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-border bg-card px-4 py-10 text-center">
        <RotateCcw className="mx-auto size-5 text-muted-foreground" />
        <p className="mt-3 text-sm font-medium">Não foi possível carregar as tarefas.</p>
        {onRetry && (
          <Button className="mt-4" variant="outline" onClick={onRetry}>
            Tentar novamente
          </Button>
        )}
      </div>
    );
  }

  const activeTasks = (tasks || []).filter(t => t.status !== "completed");

  const q1Tasks = activeTasks.filter(
    t => t.priority === "high" && t.due_date && (isToday(t.due_date) || isOverdueDate(t.due_date))
  );

  const q2Tasks = activeTasks.filter(
    t => t.priority === "high" && (!t.due_date || (!isToday(t.due_date) && !isOverdueDate(t.due_date)))
  );

  const q3Tasks = activeTasks.filter(
    t => t.priority !== "high" && t.due_date && (isToday(t.due_date) || isOverdueDate(t.due_date))
  );

  const q4Tasks = activeTasks.filter(
    t => t.priority !== "high" && (!t.due_date || (!isToday(t.due_date) && !isOverdueDate(t.due_date)))
  );

  return (
    <div className="grid gap-4 md:grid-cols-2 animate-fade-in">
      {/* Q1: Urgente e Importante */}
      <section className="flex flex-col rounded-3xl border border-destructive/30 bg-destructive/5 p-4 sm:p-5 backdrop-blur-sm transition-all hover:bg-destructive/10">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-destructive text-destructive-foreground shadow-sm">
            <AlertCircle className="size-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Faça Agora</h2>
            <p className="text-xs font-medium text-muted-foreground">Urgente & Importante</p>
          </div>
          <span className="ml-auto rounded-full bg-background px-2.5 py-1 text-xs font-bold text-muted-foreground shadow-sm">
            {q1Tasks.length}
          </span>
        </div>
        <div className="flex-1 space-y-2 overflow-y-auto pr-1 custom-scrollbar">
          {q1Tasks.length > 0 ? (
            q1Tasks.map(task => (
              <TaskItem key={task.id} task={task} folders={folders} categories={categories} compact />
            ))
          ) : (
            <p className="mt-8 text-center text-sm text-muted-foreground opacity-70">
              Nada queimando no momento.
            </p>
          )}
        </div>
      </section>

      {/* Q2: Não Urgente e Importante */}
      <section className="flex flex-col rounded-3xl border border-primary/30 bg-primary/5 p-4 sm:p-5 backdrop-blur-sm transition-all hover:bg-primary/10">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <Target className="size-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Agende</h2>
            <p className="text-xs font-medium text-muted-foreground">Importante, não Urgente</p>
          </div>
          <span className="ml-auto rounded-full bg-background px-2.5 py-1 text-xs font-bold text-muted-foreground shadow-sm">
            {q2Tasks.length}
          </span>
        </div>
        <div className="flex-1 space-y-2 overflow-y-auto pr-1 custom-scrollbar">
          {q2Tasks.length > 0 ? (
            q2Tasks.map(task => (
              <TaskItem key={task.id} task={task} folders={folders} categories={categories} compact />
            ))
          ) : (
            <p className="mt-8 text-center text-sm text-muted-foreground opacity-70">
              Suas metas de longo prazo estão vazias.
            </p>
          )}
        </div>
      </section>

      {/* Q3: Urgente e Não Importante */}
      <section className="flex flex-col rounded-3xl border border-amber-500/30 bg-amber-500/5 p-4 sm:p-5 backdrop-blur-sm transition-all hover:bg-amber-500/10">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-amber-500 text-white shadow-sm">
            <CalendarClock className="size-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Delegue</h2>
            <p className="text-xs font-medium text-muted-foreground">Urgente, não Importante</p>
          </div>
          <span className="ml-auto rounded-full bg-background px-2.5 py-1 text-xs font-bold text-muted-foreground shadow-sm">
            {q3Tasks.length}
          </span>
        </div>
        <div className="flex-1 space-y-2 overflow-y-auto pr-1 custom-scrollbar">
          {q3Tasks.length > 0 ? (
            q3Tasks.map(task => (
              <TaskItem key={task.id} task={task} folders={folders} categories={categories} compact />
            ))
          ) : (
            <p className="mt-8 text-center text-sm text-muted-foreground opacity-70">
              Nenhuma interrupção iminente.
            </p>
          )}
        </div>
      </section>

      {/* Q4: Não Urgente e Não Importante */}
      <section className="flex flex-col rounded-3xl border border-muted-foreground/20 bg-muted/20 p-4 sm:p-5 backdrop-blur-sm transition-all hover:bg-muted/30">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-muted-foreground text-background shadow-sm">
            <Trash2 className="size-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Elimine</h2>
            <p className="text-xs font-medium text-muted-foreground">Nem Urgente, nem Importante</p>
          </div>
          <span className="ml-auto rounded-full bg-background px-2.5 py-1 text-xs font-bold text-muted-foreground shadow-sm">
            {q4Tasks.length}
          </span>
        </div>
        <div className="flex-1 space-y-2 overflow-y-auto pr-1 custom-scrollbar">
          {q4Tasks.length > 0 ? (
            q4Tasks.map(task => (
              <TaskItem key={task.id} task={task} folders={folders} categories={categories} compact />
            ))
          ) : (
            <p className="mt-8 text-center text-sm text-muted-foreground opacity-70">
              Sem distrações no momento.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
