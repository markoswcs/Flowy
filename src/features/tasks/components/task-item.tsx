"use client";

import { type FormEvent, useState } from "react";
import {
  CalendarDays,
  Check,
  Clock3,
  Folder as FolderIcon,
  Flag,
  CircleDashed,
  Pencil,
  Repeat2,
  Tag,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CustomSelect } from "@/components/ui/custom-select";
import { formatTaskDate, isOverdueDate } from "@/features/tasks/date-utils";
import { TaskTagSelector } from "@/features/tasks/components/task-tag-selector";
import {
  useRestoreTask,
  useSoftDeleteTask,
  useUpdateTask,
} from "@/features/tasks/use-tasks";
import { cn } from "@/lib/utils";
import type {
  Category,
  Folder,
  Task,
  TaskPriority,
  TaskRecurrence,
  TaskStatus,
} from "@/types/productivity";

interface TaskItemProps {
  task: Task;
  folders: Folder[];
  categories: Category[];
  compact?: boolean;
}

const priorityLabels: Record<TaskPriority, string> = {
  low: "Baixa",
  normal: "Normal",
  high: "Alta",
};

const statusLabels: Record<TaskStatus, string> = {
  todo: "A fazer",
  in_progress: "Em andamento",
  completed: "Concluída",
};

const recurrenceLabels: Record<TaskRecurrence, string> = {
  daily: "Diariamente",
  weekly: "Semanalmente",
  monthly: "Mensalmente",
};

export function TaskEditor({
  task,
  folders,
  categories,
  onClose,
}: Omit<TaskItemProps, "compact"> & { onClose: () => void }) {
  const updateMutation = useUpdateTask();
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [dueDate, setDueDate] = useState(task.due_date ?? "");
  const [dueTime, setDueTime] = useState(task.due_time?.slice(0, 5) ?? "");
  const [recurrence, setRecurrence] = useState<TaskRecurrence | "none">(
    task.recurrence ?? "none",
  );
  const [priority, setPriority] = useState(task.priority);
  const [status, setStatus] = useState(task.status);
  const [folderId, setFolderId] = useState(task.folder_id ?? "");
  const [categoryIds, setCategoryIds] = useState(
    task.categories.map((category) => category.id),
  );

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim()) return;
    if (recurrence !== "none" && !dueDate) {
      toast.error("Escolha uma data para repetir a tarefa.");
      return;
    }
    updateMutation.mutate(
      {
        id: task.id,
        title,
        description: description || null,
        due_date: dueDate || null,
        due_time: dueDate && dueTime ? dueTime : null,
        recurrence: recurrence === "none" ? null : recurrence,
        priority,
        status,
        folder_id: folderId || null,
        category_ids: categoryIds,
      },
      {
        onSuccess: (updatedTask) => {
          toast.success("Tarefa salva.");
          onClose();
        },
      },
    );
  }

  return (
    <form
      onSubmit={submit}
      className="flex flex-col gap-3 animate-in fade-in zoom-in-95 duration-200"
      aria-label={`Editar ${task.title}`}
    >
      <div className="flex flex-col gap-1 px-1">
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Título da tarefa"
          className="w-full border-0 bg-transparent p-0 text-base font-semibold text-foreground placeholder:text-muted-foreground shadow-none outline-none focus:border-transparent focus:outline-none focus:ring-0"
          autoFocus
          required
        />
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Adicionar descrição..."
          className="min-h-[60px] w-full resize-none border-0 bg-transparent p-0 py-1 text-sm text-muted-foreground placeholder:text-muted-foreground/60 shadow-none outline-none focus:border-transparent focus:outline-none focus:ring-0"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative group">
          <CalendarDays className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
          <Input
            type="date"
            value={dueDate}
            onChange={(event) => {
              setDueDate(event.target.value);
              if (!event.target.value) setRecurrence("none");
            }}
            className="h-8 w-[130px] appearance-none rounded-xl border-border/50 bg-muted/30 pl-8 pr-2 text-xs shadow-none transition-all hover:bg-muted/50 focus:border-primary focus:bg-background"
          />
        </div>

        {dueDate && (
          <div className="relative group">
            <Clock3 className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
            <Input
              type="time"
              value={dueTime}
              onChange={(event) => setDueTime(event.target.value)}
              className="h-8 w-[110px] appearance-none rounded-xl border-border/50 bg-muted/30 pl-8 pr-2 text-xs shadow-none transition-all hover:bg-muted/50 focus:border-primary focus:bg-background"
            />
          </div>
        )}

        <div className={cn(!dueDate && "pointer-events-none opacity-50")}>
          <CustomSelect
            value={recurrence}
            onChange={(value) =>
              setRecurrence(value as TaskRecurrence | "none")
            }
            options={[
              { value: "none", label: "Não repetir" },
              { value: "daily", label: "Todos os dias" },
              { value: "weekly", label: "Toda semana" },
              { value: "monthly", label: "Todo mês" },
            ]}
            triggerIcon={<Repeat2 className="size-3.5" />}
            placeholder="Repetir"
          />
        </div>

        <div className="flex rounded-xl border border-border/50 bg-muted/20 backdrop-blur-lg p-0.5">
          {(["low", "normal", "high"] as TaskPriority[]).map((p) => {
            const isSelected = priority === p;
            return (
              <button
                key={p}
                type="button"
                onClick={() => setPriority(p)}
                className={`flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-medium transition-all duration-200 ${
                  isSelected
                    ? "bg-background text-foreground shadow-sm ring-1 ring-border/50"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Flag className={`size-3 ${isSelected && p === "high" ? "text-destructive" : isSelected && p === "low" ? "text-blue-500" : isSelected ? "text-primary" : ""}`} />
                <span className="hidden sm:inline">{priorityLabels[p]}</span>
              </button>
            );
          })}
        </div>

        <CustomSelect
          value={status}
          onChange={(v) => setStatus(v as TaskStatus)}
          options={Object.entries(statusLabels).map(([val, label]) => ({
            value: val,
            label,
            icon: val === "completed" 
              ? <Check className="size-3.5 text-primary" /> 
              : val === "in_progress" 
                ? <Clock3 className="size-3.5 text-amber-500" /> 
                : <CircleDashed className="size-3.5 text-muted-foreground" />
          }))}
          triggerIcon={
             status === "completed" 
              ? <Check className="size-3.5 text-primary" /> 
              : status === "in_progress" 
                ? <Clock3 className="size-3.5 text-amber-500" /> 
                : <CircleDashed className="size-3.5 text-muted-foreground transition-colors group-focus-within:text-primary" />
          }
        />

        <CustomSelect
          value={folderId}
          onChange={setFolderId}
          placeholder="Sem pasta"
          options={[
            { value: "", label: "Sem pasta" },
            ...folders.map(f => ({ value: f.id, label: f.name, icon: <FolderIcon className="size-3.5 text-blue-500" /> }))
          ]}
          triggerIcon={<FolderIcon className="size-3.5 text-muted-foreground transition-colors group-focus-within:text-primary" />}
        />
      </div>

      <div className="flex flex-wrap items-center gap-1.5 pt-1">
        <Tag className="mr-1 size-3.5 text-muted-foreground" />
        <TaskTagSelector
          categories={categories}
          value={categoryIds}
          onChange={setCategoryIds}
          compact
        />
      </div>

      <div className="flex items-center justify-end gap-2 pt-1">
        <Button 
          type="button" 
          variant="ghost" 
          size="sm"
          onClick={onClose}
          className="h-8 rounded-xl text-xs hover:bg-muted/50"
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          size="sm"
          className="h-8 rounded-xl px-5 text-xs font-medium shadow-sm transition-all active:scale-95"
          loading={updateMutation.isPending}
          disabled={!title.trim() || (recurrence !== "none" && !dueDate)}
        >
          Salvar
        </Button>
      </div>
    </form>
  );
}

export function TaskItem({
  task,
  folders,
  categories,
  compact = false,
}: TaskItemProps) {
  const [editing, setEditing] = useState(false);
  const updateMutation = useUpdateTask();
  const deleteMutation = useSoftDeleteTask();
  const restoreMutation = useRestoreTask();
  const completed = task.status === "completed";
  const optimistic = task.id.startsWith("optimistic-");
  const formattedDate = formatTaskDate(task.due_date);
  const overdue = !completed && isOverdueDate(task.due_date);

  function toggleCompleted() {
    const previousStatus = task.status;
    const previousCompletedAt = task.completed_at;
    const nextCompleted = !completed;

    updateMutation.mutate(
      {
        id: task.id,
        status: nextCompleted ? "completed" : "todo",
        completed_at: nextCompleted ? new Date().toISOString() : null,
      },
      {
        onSuccess: () => {
          if (!nextCompleted) {
            toast.success("Tarefa reaberta.");
            return;
          }
          if (task.recurrence) {
            const nextDate = formatTaskDate(updatedTask.due_date);
            toast.success("Próxima ocorrência agendada.", {
              description: `${recurrenceLabels[task.recurrence]}${
                nextDate ? ` • ${nextDate}` : ""
              }${updatedTask.due_time ? ` às ${updatedTask.due_time.slice(0, 5)}` : ""}`,
            });
            return;
          }
          toast.success("Tarefa concluída.", {
            action: {
              label: "Desfazer",
              onClick: () =>
                updateMutation.mutate({
                  id: task.id,
                  status: previousStatus,
                  completed_at: previousCompletedAt,
                }),
            },
          });
        },
      },
    );
  }

  function moveToTrash() {
    deleteMutation.mutate(task.id, {
      onSuccess: () => {
        toast("Tarefa movida para a lixeira.", {
          action: {
            label: "Desfazer",
            onClick: () => restoreMutation.mutate(task.id),
          },
        });
      },
    });
  }

  return (
    <article className="mb-2 rounded-2xl border border-border/50 bg-card/40 p-3 shadow-sm backdrop-blur-2xl transition-all duration-300 hover:scale-[1.01] hover:bg-card/50 active:scale-[0.99] sm:p-4 animate-scale-in">
      {!editing && (
        <div className="flex min-w-0 items-start gap-3">
          <button
            type="button"
            role="checkbox"
            aria-checked={completed}
            aria-label={
              completed ? `Reabrir ${task.title}` : `Concluir ${task.title}`
            }
            onClick={toggleCompleted}
            disabled={optimistic || updateMutation.isPending}
            className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              completed
                ? "border-primary bg-primary text-primary-foreground"
                : "border-muted-foreground/50 hover:border-primary"
            } disabled:opacity-50`}
          >
            {completed ? <Check className="size-3.5" aria-hidden="true" /> : null}
          </button>

          <div className="min-w-0 flex-1">
            <button
              type="button"
              onClick={() => !optimistic && setEditing(true)}
              className={`block max-w-full text-left text-sm font-medium leading-6 focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                completed
                  ? "text-muted-foreground line-through"
                  : "text-foreground"
              }`}
            >
              <span className="break-words">{task.title}</span>
            </button>

            {!compact ? (
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                {formattedDate ? (
                  <span className={overdue ? "text-destructive" : undefined}>
                    <CalendarDays
                      className="mr-1 inline size-3.5"
                      aria-hidden="true"
                    />
                    {formattedDate}
                  </span>
                ) : null}
                {task.due_time ? (
                  <span>
                    <Clock3 className="mr-1 inline size-3.5" aria-hidden="true" />
                    {task.due_time.slice(0, 5)}
                  </span>
                ) : null}
                {task.recurrence ? (
                  <span>
                    <Repeat2 className="mr-1 inline size-3.5" aria-hidden="true" />
                    {recurrenceLabels[task.recurrence]}
                  </span>
                ) : null}
                {task.folder ? (
                  <span>
                    <FolderIcon
                      className="mr-1 inline size-3.5"
                      aria-hidden="true"
                    />
                    {task.folder.name}
                  </span>
                ) : null}
                {task.priority !== "normal" ? (
                  <span
                    className={
                      task.priority === "high" ? "text-destructive" : undefined
                    }
                  >
                    {priorityLabels[task.priority]}
                  </span>
                ) : null}
                {task.categories.map((category) => (
                  <span
                    key={category.id}
                    className="inline-flex items-center gap-1"
                  >
                    <span
                      className="size-1.5 rounded-full"
                      style={{ backgroundColor: category.color }}
                      aria-hidden="true"
                    />
                    {category.name}
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          <div className="flex shrink-0 items-center">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setEditing(true)}
              disabled={optimistic}
              aria-label={`Editar ${task.title}`}
            >
              <Pencil className="size-4" aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={moveToTrash}
              disabled={optimistic || deleteMutation.isPending}
              aria-label={`Mover ${task.title} para a lixeira`}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="size-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      )}

      {editing ? (
        <TaskEditor
          task={task}
          folders={folders}
          categories={categories}
          onClose={() => setEditing(false)}
        />
      ) : null}
    </article>
  );
}
