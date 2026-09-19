"use client";

import { useState } from "react";

import {
  closestCorners,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { CalendarDays, Folder as FolderIcon, GripVertical, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CustomSelect } from "@/components/ui/custom-select";
import { Skeleton } from "@/components/ui/skeleton";
import { formatTaskDate } from "@/features/tasks/date-utils";
import { useUpdateTask } from "@/features/tasks/use-tasks";
import { TaskEditor } from "@/features/tasks/components/task-item";
import { cn } from "@/lib/utils";
import type { Category, Folder, Task, TaskPriority, TaskStatus } from "@/types/productivity";

interface TaskKanbanProps {
  tasks: Task[] | undefined;
  folders: Folder[];
  categories: Category[];
  loading?: boolean;
  error?: unknown;
  onRetry?: () => void;
}

const columns: Array<{
  status: TaskStatus;
  label: string;
  accent: string;
}> = [
  { status: "todo", label: "A fazer", accent: "bg-slate-400" },
  { status: "in_progress", label: "Em andamento", accent: "bg-amber-400" },
  { status: "completed", label: "Concluídas", accent: "bg-emerald-500" },
];

const priorityLabels: Record<TaskPriority, string> = {
  low: "Baixa",
  normal: "Normal",
  high: "Alta",
};

function KanbanTaskCard({
  task,
  folders,
  categories,
  onMove,
}: {
  task: Task;
  folders: Folder[];
  categories: Category[];
  onMove: (taskId: string, status: TaskStatus) => void;
}) {
  const [editing, setEditing] = useState(false);
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `task:${task.id}`,
      data: { taskId: task.id, status: task.status },
    });
  const dueDate = formatTaskDate(task.due_date);

  return (
    <article
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
      className={cn(
        "rounded-2xl border border-border/50 bg-card/60 p-4 shadow-sm backdrop-blur-md transition-shadow",
        isDragging && "z-50 opacity-70 shadow-lg",
      )}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          className="mt-0.5 cursor-grab touch-none rounded p-0.5 text-muted-foreground hover:text-foreground active:cursor-grabbing"
          aria-label={`Mover tarefa ${task.title}`}
          {...listeners}
          {...attributes}
        >
          <GripVertical className="size-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="min-w-0 flex-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
        >
          <p
            className={cn(
              "text-sm font-medium leading-5",
              task.status === "completed" && "text-muted-foreground line-through"
            )}
          >
            {task.title}
          </p>
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        {dueDate ? (
          <span className="inline-flex items-center gap-1">
            <CalendarDays className="size-3.5" aria-hidden="true" />
            {dueDate}
          </span>
        ) : null}
        {task.folder ? (
          <span className="inline-flex min-w-0 items-center gap-1">
            <FolderIcon className="size-3 text-muted-foreground" aria-hidden="true" />
            <span className="truncate">{task.folder.name}</span>
          </span>
        ) : null}
        {task.priority !== "normal" ? (
          <span
            className={cn(
              "rounded-full px-2 py-0.5 font-medium",
              task.priority === "high"
                ? "bg-destructive/10 text-destructive"
                : "bg-muted text-muted-foreground",
            )}
          >
            {priorityLabels[task.priority]}
          </span>
        ) : null}
      </div>

      <div className="mt-3 block">
        <CustomSelect
          value={task.status}
          onChange={(value) => onMove(task.id, value as TaskStatus)}
          options={[
            { value: "todo", label: "A fazer" },
            { value: "in_progress", label: "Em andamento" },
            { value: "completed", label: "Concluídas" },
          ]}
        />
      </div>
      
      {editing && (
        <div className="mt-4 border-t border-border/50 pt-4">
          <TaskEditor
            task={task}
            folders={folders}
            categories={categories}
            onClose={() => setEditing(false)}
          />
        </div>
      )}
    </article>
  );
}

function KanbanColumn({
  status,
  label,
  accent,
  tasks,
  folders,
  categories,
  onMove,
}: (typeof columns)[number] & {
  tasks: Task[];
  folders: Folder[];
  categories: Category[];
  onMove: (taskId: string, status: TaskStatus) => void;
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: `status:${status}`,
    data: { status },
  });

  return (
    <section
      ref={setNodeRef}
      aria-labelledby={`kanban-${status}`}
      className={cn(
        "min-h-[500px] w-[85vw] sm:w-[320px] lg:w-auto lg:flex-1 shrink-0 snap-center rounded-3xl border border-border/50 bg-muted/20 p-4 transition-colors backdrop-blur-sm",
        isOver && "border-primary/50 bg-primary/10",
      )}
    >
      <div className="mb-3 flex items-center gap-2 px-1">
        <span className={cn("size-2 rounded-full", accent)} aria-hidden="true" />
        <h2 id={`kanban-${status}`} className="text-sm font-semibold">
          {label}
        </h2>
        <span className="ml-auto rounded-full bg-background px-2 py-0.5 text-xs tabular-nums text-muted-foreground">
          {tasks.length}
        </span>
      </div>
      <div className="space-y-2">
        {tasks.map((task) => (
          <KanbanTaskCard 
            key={task.id} 
            task={task} 
            folders={folders} 
            categories={categories} 
            onMove={onMove} 
          />
        ))}
        {tasks.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border px-3 py-8 text-center text-xs text-muted-foreground">
            Arraste uma tarefa para cá.
          </p>
        ) : null}
      </div>
    </section>
  );
}

export function TaskKanban({
  tasks,
  folders,
  categories,
  loading = false,
  error,
  onRetry,
}: TaskKanbanProps) {
  const updateTask = useUpdateTask();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 180, tolerance: 6 },
    }),
    useSensor(KeyboardSensor),
  );

  function moveTask(taskId: string, status: TaskStatus) {
    const task = tasks?.find((item) => item.id === taskId);
    if (!task || task.status === status) return;
    updateTask.mutate({ id: taskId, status });
  }

  function handleDragEnd(event: DragEndEvent) {
    if (!event.over) return;
    const taskId = event.active.data.current?.taskId as string | undefined;
    const status = event.over.data.current?.status as TaskStatus | undefined;
    if (taskId && status) moveTask(taskId, status);
  }

  if (loading) {
    return (
      <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 lg:grid lg:grid-cols-3 lg:overflow-visible" aria-label="Carregando Kanban">
        {columns.map((column) => (
          <Skeleton key={column.status} className="h-[500px] w-[85vw] shrink-0 snap-center sm:w-[320px] lg:w-auto rounded-3xl" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-border bg-card px-4 py-10 text-center">
        <RotateCcw className="mx-auto size-5 text-muted-foreground" />
        <p className="mt-3 text-sm font-medium">
          Não foi possível carregar as tarefas.
        </p>
        {onRetry ? (
          <Button className="mt-4" variant="outline" onClick={onRetry}>
            Tentar novamente
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragEnd={handleDragEnd}
    >
      <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-6 lg:grid lg:grid-cols-3 lg:overflow-visible">
        {columns.map((column) => (
          <KanbanColumn
            key={column.status}
            {...column}
            folders={folders}
            categories={categories}
            tasks={(tasks ?? []).filter(
              (task) => task.status === column.status,
            )}
            onMove={moveTask}
          />
        ))}
      </div>
    </DndContext>
  );
}
