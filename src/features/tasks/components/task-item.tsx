"use client";

import { type FormEvent, useRef, useState } from "react";
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
import { toast } from "@/lib/toast";

import { Button } from "@/components/ui/button";
import { CustomSelect } from "@/components/ui/custom-select";
import { formatTaskDate, isOverdueDate } from "@/features/tasks/date-utils";
import { TaskScheduleFields } from "@/features/tasks/components/task-schedule-fields";
import { TaskTagSelector } from "@/features/tasks/components/task-tag-selector";
import {
  useRestoreTask,
  useSoftDeleteTask,
  useUpdateTask,
} from "@/features/tasks/use-tasks";
import { useTaskSelection } from "@/features/tasks/task-selection";
import { cn } from "@/lib/utils";
import { useNotifications } from "@/providers/notification-provider";
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

function autoResize(element: HTMLTextAreaElement | null) {
  if (!element) return;
  element.style.height = "auto";
  element.style.height = `${element.scrollHeight}px`;
}

// On mount the editor is still animating in, so measure again once layout settles.
function fitOnMount(element: HTMLTextAreaElement | null) {
  autoResize(element);
  if (element) requestAnimationFrame(() => autoResize(element));
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
  const { addNotification } = useNotifications();
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
        onSuccess: () => {
          addNotification({ title: "Tarefa salva", description: title.trim() });
          onClose();
        },
      },
    );
  }

  return (
    <form
      onSubmit={submit}
      className="flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200"
      aria-label={`Editar ${task.title}`}
    >
      <div className="flex flex-col gap-1 px-1">
        <textarea
          ref={fitOnMount}
          value={title}
          onChange={(event) => {
            setTitle(event.target.value);
            autoResize(event.target);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }
          }}
          rows={1}
          placeholder="Título da tarefa"
          aria-label="Título da tarefa"
          className="w-full resize-none overflow-hidden border-0 bg-transparent p-0 text-base font-semibold leading-snug text-foreground placeholder:text-muted-foreground shadow-none outline-none focus:border-transparent focus:outline-none focus:ring-0"
          autoFocus
          required
        />
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Adicionar descrição..."
          aria-label="Descrição"
          className="min-h-[48px] w-full resize-none border-0 bg-transparent p-0 py-1 text-sm text-muted-foreground placeholder:text-muted-foreground/60 shadow-none outline-none focus:border-transparent focus:outline-none focus:ring-0"
        />
      </div>

      <TaskScheduleFields
        idPrefix={`task-${task.id}`}
        dueDate={dueDate}
        dueTime={dueTime}
        onDueDateChange={(value) => {
          setDueDate(value);
          if (!value) setRecurrence("none");
        }}
        onDueTimeChange={setDueTime}
      />

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <div className="col-span-2 flex rounded-xl border border-border/50 bg-muted/20 p-1 backdrop-blur-lg sm:col-span-3">
          {(["low", "normal", "high"] as TaskPriority[]).map((p) => {
            const isSelected = priority === p;
            return (
              <button
                key={p}
                type="button"
                onClick={() => setPriority(p)}
                aria-pressed={isSelected}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-medium transition-all duration-200 ${
                  isSelected
                    ? "bg-background text-foreground shadow-sm ring-1 ring-border/50"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Flag className={`size-3 ${isSelected && p === "high" ? "text-destructive" : isSelected && p === "low" ? "text-blue-500" : isSelected ? "text-primary" : ""}`} />
                {priorityLabels[p]}
              </button>
            );
          })}
        </div>

        <div className={cn("min-w-0", !dueDate && "pointer-events-none opacity-50")}>
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
            className="h-10 min-w-0"
          />
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
          className="h-10 min-w-0"
          containerClassName="min-w-0"
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
          className="h-10 min-w-0"
          containerClassName="col-span-2 min-w-0 sm:col-span-1"
        />
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <Tag className="mr-1 size-3.5 text-muted-foreground" />
        <TaskTagSelector
          categories={categories}
          value={categoryIds}
          onChange={setCategoryIds}
          compact
        />
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-border/40 pt-3">
        <Button
          type="button"
          variant="ghost"
          onClick={onClose}
          className="h-10 rounded-xl px-4 text-sm hover:bg-muted/50"
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          className="h-10 rounded-xl px-6 text-sm font-medium shadow-sm transition-all active:scale-95"
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
  const { addNotification } = useNotifications();
  const selection = useTaskSelection();
  const selecting = Boolean(selection?.active);
  const selected = Boolean(selection?.isSelected(task.id));
  const pressTimer = useRef<number | null>(null);
  const pressStarted = useRef(false);
  const completed = task.status === "completed";
  const optimistic = task.id.startsWith("optimistic-");
  const formattedDate = formatTaskDate(task.due_date);
  const overdue = !completed && isOverdueDate(task.due_date);

  function toggleCompleted() {
    const nextCompleted = !completed;

    saveTask();

    function saveTask() {
    updateMutation.mutate(
      {
        id: task.id,
        status: nextCompleted ? "completed" : "todo",
        completed_at: nextCompleted ? new Date().toISOString() : null,
      },
      {
        onSuccess: (updatedTask) => {
          if (!nextCompleted) {
            addNotification({ title: "Tarefa reaberta", description: task.title });
            return;
          }
          if (task.recurrence) {
            const nextDate = formatTaskDate(updatedTask.due_date);
            addNotification({ title: "Próxima ocorrência agendada", description: `${recurrenceLabels[task.recurrence]}${
                nextDate ? ` • ${nextDate}` : ""
              }${updatedTask.due_time ? ` às ${updatedTask.due_time.slice(0, 5)}` : ""}` });
            return;
          }
          addNotification({
            title: "Tarefa concluída",
            description: task.title,
            action: {
              label: "Desfazer",
              onClick: () =>
                updateMutation.mutate({ id: task.id, status: "todo", completed_at: null }),
            },
          });
        },
      },
    );
    }
  }

  function moveToTrash() {
    deleteMutation.mutate(task.id, {
      onSuccess: () => {
        addNotification({ title: "Tarefa movida para a lixeira", description: task.title,
          action: {
            label: "Desfazer",
            onClick: () => restoreMutation.mutate(task.id),
          },
        });
      },
    });
  }

  // Holding a task for a moment starts multi-select (handy on phones).
  function startPress() {
    if (!selection || selecting || optimistic || editing) return;
    pressTimer.current = window.setTimeout(() => {
      pressTimer.current = null;
      pressStarted.current = true;
      selection.start(task.id);
      navigator.vibrate?.(15);
    }, 480);
  }
  function cancelPress() {
    if (pressTimer.current) window.clearTimeout(pressTimer.current);
    pressTimer.current = null;
  }

  return (
    <article
      onPointerDown={startPress}
      onPointerUp={cancelPress}
      onPointerLeave={cancelPress}
      onPointerMove={(event) => {
        if (Math.abs(event.movementX) + Math.abs(event.movementY) > 6) cancelPress();
      }}
      onContextMenu={(event) => {
        if (selecting) event.preventDefault();
      }}
      onClickCapture={(event) => {
        if (!selecting || !selection) return;
        event.preventDefault();
        event.stopPropagation();
        // The click that ends the long press must not undo its selection.
        if (pressStarted.current) {
          pressStarted.current = false;
          return;
        }
        selection.toggle(task.id);
      }}
      data-selected={selecting ? selected : undefined}
      className={cn(
        "mb-2 rounded-2xl border border-border/50 bg-card/40 p-3 shadow-sm backdrop-blur-2xl transition-all duration-300 hover:bg-card/50 active:scale-[0.99] sm:p-4 animate-scale-in",
        !selecting && "hover:scale-[1.01]",
        selecting && "cursor-pointer select-none",
        selected && "border-primary/60 bg-primary/10 shadow-[0_0_0_1px_hsl(var(--primary)/0.4)]",
      )}
    >
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
            className={cn(
              "mt-0.5 flex size-6 shrink-0 items-center justify-center border-2 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50",
              selecting ? "rounded-md" : "rounded-full",
              (selecting ? selected : completed)
                ? "border-primary bg-primary text-primary-foreground"
                : "border-muted-foreground/50 hover:border-primary",
            )}
          >
            {(selecting ? selected : completed) ? (
              <Check className="size-3.5 animate-in zoom-in duration-200" aria-hidden="true" />
            ) : null}
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
