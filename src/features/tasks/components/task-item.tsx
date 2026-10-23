"use client";

import { type FormEvent, type ReactNode, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
import { formatTaskDate, relativeTaskDate } from "@/features/tasks/date-utils";
import { TaskActionSheet } from "@/features/tasks/components/task-action-sheet";
import { TaskScheduleFields } from "@/features/tasks/components/task-schedule-fields";
import { TaskTagSelector } from "@/features/tasks/components/task-tag-selector";
import {
  useRestoreTask,
  useSoftDeleteTask,
  useUpdateTask,
} from "@/features/tasks/use-tasks";
import { useTaskSelection } from "@/features/tasks/task-selection";
import { holdOverlay } from "@/lib/overlay";
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
          maxLength={300}
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
                <Flag className={`size-3 ${isSelected && p === "high" ? "text-destructive" : isSelected && p === "low" ? "text-blue-500" : isSelected ? "flowy-ink" : ""}`} />
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
              ? <Check className="size-3.5 flowy-ink" />
              : val === "in_progress"
                ? <Clock3 className="size-3.5 text-amber-500" />
                : <CircleDashed className="size-3.5 text-muted-foreground" />
          }))}
          triggerIcon={
             status === "completed"
              ? <Check className="size-3.5 flowy-ink" />
              : status === "in_progress"
                ? <Clock3 className="size-3.5 text-amber-500" />
                : <CircleDashed className="size-3.5 text-muted-foreground transition-colors group-focus-within:flowy-ink" />
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
          triggerIcon={<FolderIcon className="size-3.5 text-muted-foreground transition-colors group-focus-within:flowy-ink" />}
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

      <div className="sticky bottom-0 -mx-4 -mb-1 flex items-center justify-end gap-2 border-t border-border/40 bg-card px-4 py-3 sm:-mx-6 sm:px-6">
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

/** Editing happens in its own sheet (bottom sheet on phones, dialog on desktop). */
function TaskEditorSheet({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const release = holdOverlay();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      release();
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-[150] flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true">
      <button
        type="button"
        aria-label="Fechar edição"
        onClick={onClose}
        className="flowy-glass-scrim absolute inset-0 animate-in fade-in"
      />
      <div className="relative flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden flowy-glass flowy-glass-strong rounded-t-[1.75rem] border animate-in slide-in-from-bottom-8 duration-300 sm:rounded-[1.75rem]">
        <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-muted-foreground/30 sm:hidden" aria-hidden="true" />
        <div className="min-h-0 overflow-y-auto overscroll-contain px-4 pb-[max(0.25rem,env(safe-area-inset-bottom))] pt-4 sm:px-6 sm:pt-6">
          {children}
        </div>
      </div>
    </div>,
    document.body,
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
  const pressOrigin = useRef({ x: 0, y: 0 });
  const [actionsOpen, setActionsOpen] = useState(false);
  const completed = task.status === "completed";
  const optimistic = task.id.startsWith("optimistic-");

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
        addNotification({ title: "Movida para a lixeira", description: task.title,
          action: {
            label: "Desfazer",
            onClick: () => restoreMutation.mutate(task.id),
          },
        });
      },
    });
  }

  // Holding a task opens its actions; while selecting, a tap toggles it.
  // Touch only: a mouse uses right-click (onContextMenu) instead. Any finger
  // movement or a browser-cancelled touch (scroll) aborts the long press.
  function startPress(event: React.PointerEvent) {
    pressStarted.current = false;
    if (event.pointerType === "mouse" || selecting || optimistic || editing) return;
    pressOrigin.current = { x: event.clientX, y: event.clientY };
    pressTimer.current = window.setTimeout(() => {
      pressTimer.current = null;
      pressStarted.current = true;
      setActionsOpen(true);
      navigator.vibrate?.(15);
    }, 450);
  }
  function cancelPress() {
    if (pressTimer.current) window.clearTimeout(pressTimer.current);
    pressTimer.current = null;
  }
  function trackPress(event: React.PointerEvent) {
    if (!pressTimer.current) return;
    const dx = event.clientX - pressOrigin.current.x;
    const dy = event.clientY - pressOrigin.current.y;
    if (dx * dx + dy * dy > 64) cancelPress();
  }

  const when = relativeTaskDate(task.due_date);
  // Overdue and today render as a pill; any other date is plain meta text.
  const dateChip = !completed && (when?.tone === "overdue" || when?.tone === "today");
  const dateToneClass = !dateChip
    ? "text-muted-foreground"
    : when?.tone === "overdue"
      ? "bg-destructive/15 text-destructive"
      : "flowy-active";

  return (
    <article
      onPointerDown={startPress}
      onPointerUp={cancelPress}
      onPointerLeave={cancelPress}
      onPointerCancel={cancelPress}
      onPointerMove={trackPress}
      onContextMenu={(event) => {
        if (editing || optimistic) return;
        event.preventDefault();
        if (!selecting) setActionsOpen(true);
      }}
      onClickCapture={(event) => {
        // The click that ends a long press must not also trigger the card.
        if (pressStarted.current) {
          pressStarted.current = false;
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        if (!selecting || !selection) return;
        event.preventDefault();
        event.stopPropagation();
        selection.toggle(task.id);
      }}
      data-selected={selecting ? selected : undefined}
      className={cn(
        "group relative mb-2 overflow-hidden rounded-2xl border border-border/50 bg-card/50 shadow-sm transition-all duration-200 hover:border-border hover:bg-card/70 animate-scale-in [-webkit-touch-callout:none]",
        selecting && "cursor-pointer select-none",
        selected && "border-violet-400/60 bg-violet-500/10 shadow-[0_0_0_1px_rgb(167_139_250/0.4)]",
        completed && !selecting && "opacity-70",
      )}
    >
      {task.priority === "high" && !completed ? (
        <span aria-hidden="true" className="absolute inset-y-3 left-0 w-1 rounded-r-full bg-destructive" />
      ) : null}

      {!editing && (
        <div className="flex min-w-0 items-start gap-3 p-3.5 sm:p-4">
          <button
            type="button"
            role="checkbox"
            aria-checked={selecting ? selected : completed}
            aria-label={completed ? `Reabrir ${task.title}` : `Concluir ${task.title}`}
            onClick={toggleCompleted}
            disabled={optimistic || updateMutation.isPending}
            className={cn(
              "mt-px flex size-[1.4rem] shrink-0 items-center justify-center border-2 transition-all duration-200 active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60 disabled:opacity-50",
              selecting ? "rounded-md" : "rounded-full",
              (selecting ? selected : completed)
                ? "border-violet-500 bg-violet-500 text-white"
                : "border-muted-foreground/50 hover:border-violet-400",
            )}
          >
            {(selecting ? selected : completed) ? (
              <Check className="size-3.5 flowy-check-pop" aria-hidden="true" />
            ) : null}
          </button>

          <button
            type="button"
            onClick={() => !optimistic && setEditing(true)}
            className="min-w-0 flex-1 text-left focus-visible:rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60"
            aria-label={`Abrir ${task.title}`}
          >
            <span
              className={cn(
                "line-clamp-2 break-words text-[15px] font-medium leading-snug",
                completed ? "text-muted-foreground line-through" : "text-foreground",
              )}
              title={task.title}
            >
              {task.title}
            </span>

            {!compact ? (
              <span className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                {when ? (
                  <span
                    className={cn(
                      "inline-flex shrink-0 items-center gap-1 whitespace-nowrap leading-none",
                      dateChip && "h-6 rounded-full px-2.5",
                      dateToneClass,
                    )}
                  >
                    <CalendarDays className="size-3.5 shrink-0" aria-hidden="true" />
                    {when.label}
                    {task.due_time ? ` · ${task.due_time.slice(0, 5)}` : ""}
                  </span>
                ) : task.due_time ? (
                  <span className="inline-flex items-center gap-1">
                    <Clock3 className="size-3.5" aria-hidden="true" />
                    {task.due_time.slice(0, 5)}
                  </span>
                ) : null}
                {task.recurrence ? (
                  <span className="inline-flex items-center gap-1">
                    <Repeat2 className="size-3.5" aria-hidden="true" />
                    {recurrenceLabels[task.recurrence]}
                  </span>
                ) : null}
                {task.folder ? (
                  <span className="inline-flex max-w-40 items-center gap-1">
                    <FolderIcon
                      className="size-3.5 shrink-0"
                      style={{ color: task.folder.color ?? undefined }}
                      aria-hidden="true"
                    />
                    <span className="truncate">{task.folder.name}</span>
                  </span>
                ) : null}
                {task.priority === "low" ? <span>{priorityLabels.low}</span> : null}
                {task.categories.map((category) => (
                  <span
                    key={category.id}
                    className="inline-flex items-center gap-1 rounded-full px-2 py-0.5"
                    style={{ backgroundColor: `${category.color}1f`, color: category.color }}
                  >
                    {category.name}
                  </span>
                ))}
              </span>
            ) : null}
          </button>

          {/* Pointer devices: quick actions on hover. Phones use the long-press sheet. */}
          <div className="hidden shrink-0 items-center opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100 md:flex">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setEditing(true)}
              disabled={optimistic || selecting}
              aria-label={`Editar ${task.title}`}
              className="size-8"
            >
              <Pencil className="size-4" aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={moveToTrash}
              disabled={optimistic || selecting || deleteMutation.isPending}
              aria-label={`Mover ${task.title} para a lixeira`}
              className="size-8 text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="size-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      )}

      {actionsOpen ? (
        <TaskActionSheet
          title={task.title}
          completed={completed}
          canSelect={Boolean(selection)}
          onClose={() => setActionsOpen(false)}
          onEdit={() => setEditing(true)}
          onToggle={toggleCompleted}
          onSelect={() => selection?.start(task.id)}
          onTrash={moveToTrash}
        />
      ) : null}

      {editing ? (
        <TaskEditorSheet onClose={() => setEditing(false)}>
          <TaskEditor
            task={task}
            folders={folders}
            categories={categories}
            onClose={() => setEditing(false)}
          />
        </TaskEditorSheet>
      ) : null}
    </article>
  );
}
