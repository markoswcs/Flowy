"use client";

import { AlertTriangle, CalendarDays, Flag, Folder as FolderIcon, Repeat2, Sparkles, Tag, Text, X } from "lucide-react";
import { useMemo } from "react";

import { formatTaskDate } from "@/features/tasks/date-utils";
import { suggestOrganization, type SmartSuggestion } from "@/features/tasks/smart-organize";
import { interpretTask, type SmartTask } from "@/features/tasks/smart-task";
import { useTasks } from "@/features/tasks/use-tasks";
import { cn } from "@/lib/utils";
import type { Category, Folder } from "@/types/productivity";

export function useSmartOrganize(
  title: string,
  folders: Folder[],
  categories: Category[],
): SmartSuggestion | null {
  const { data: history } = useTasks({ scope: "all" });
  return useMemo(() => {
    if (!title.trim()) return null;
    return suggestOrganization(title, { folders, categories, history: history ?? [] });
  }, [categories, folders, history, title]);
}

/** The shared task interpreter, fed with the person's folders, labels and tasks. */
export function useSmartTask(text: string, folders: Folder[], categories: Category[]): SmartTask | null {
  const { data: history } = useTasks({ scope: "all" });
  return useMemo(() => {
    if (!text.trim()) return null;
    return interpretTask(text, { folders, categories, history: history ?? [] });
  }, [categories, folders, history, text]);
}

const RECURRENCE_LABELS = { daily: "Diariamente", weekly: "Semanalmente", monthly: "Mensalmente" } as const;

export function smartTaskWhen(task: Pick<SmartTask, "due_date" | "due_time">) {
  if (!task.due_date) return null;
  return `${formatTaskDate(task.due_date)}${task.due_time ? ` às ${task.due_time}` : ""}`;
}

/** What the interpreter understood beyond the title: when, priority, details and doubts. */
export function SmartTaskDetails({ task, className }: { task: SmartTask | null; className?: string }) {
  if (!task) return null;
  const when = smartTaskWhen(task);
  const items = [
    when ? { key: "when", icon: <CalendarDays className="size-3" />, label: when } : null,
    task.recurrence
      ? { key: "repeat", icon: <Repeat2 className="size-3" />, label: RECURRENCE_LABELS[task.recurrence] }
      : null,
    task.priority !== "normal"
      ? {
          key: "priority",
          icon: <Flag className={cn("size-3", task.priority === "high" ? "text-destructive" : "text-blue-500")} />,
          label: task.priority === "high" ? "Prioridade alta" : "Prioridade baixa",
        }
      : null,
    task.description ? { key: "description", icon: <Text className="size-3" />, label: task.description } : null,
  ].filter((item): item is NonNullable<typeof item> => item !== null);
  if (!items.length && !task.ambiguities.length) return null;

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5 animate-in fade-in duration-300", className)} aria-live="polite">
      {items.map((item) => (
        <span
          key={item.key}
          className="flex h-7 min-w-0 max-w-full items-center gap-1.5 rounded-full border border-border/60 bg-card/70 px-2.5 text-xs"
        >
          <span className="shrink-0 text-muted-foreground">{item.icon}</span>
          <span className="truncate">{item.label}</span>
        </span>
      ))}
      {task.ambiguities.map((message) => (
        <span key={message} className="flex items-center gap-1.5 text-xs text-amber-500">
          <AlertTriangle className="size-3.5 shrink-0" aria-hidden="true" />
          {message}
        </span>
      ))}
    </div>
  );
}

/** Chips showing the folder and labels the task will get, each removable. */
export function SmartSuggestionChips({
  suggestion,
  folders,
  categories,
  onRemoveFolder,
  onRemoveCategory,
  className,
}: {
  suggestion: Pick<SmartSuggestion, "folderId" | "categoryIds" | "explicitFolder" | "explicitCategoryIds"> | null;
  folders: Folder[];
  categories: Category[];
  onRemoveFolder: () => void;
  onRemoveCategory: (id: string) => void;
  className?: string;
}) {
  if (!suggestion) return null;
  const folder = folders.find((item) => item.id === suggestion.folderId);
  const labels = suggestion.categoryIds
    .map((id) => categories.find((item) => item.id === id))
    .filter((item): item is Category => Boolean(item));
  if (!folder && !labels.length) return null;

  const inferred = !suggestion.explicitFolder || labels.some((label) => !suggestion.explicitCategoryIds.includes(label.id));

  return (
    <div
      className={cn("flex flex-wrap items-center gap-1.5 animate-in fade-in slide-in-from-top-1 duration-300", className)}
      aria-live="polite"
    >
      {inferred ? (
        <span className="flex items-center gap-1 text-[11px] font-medium flowy-ink">
          <Sparkles className="size-3.5" aria-hidden="true" />
          Sugerido
        </span>
      ) : null}
      {folder ? (
        <Chip
          icon={<FolderIcon className="size-3" style={{ color: folder.color ?? undefined }} />}
          label={folder.name}
          onRemove={onRemoveFolder}
        />
      ) : null}
      {labels.map((label) => (
        <Chip
          key={label.id}
          icon={<Tag className="size-3" style={{ color: label.color }} />}
          label={label.name}
          onRemove={() => onRemoveCategory(label.id)}
        />
      ))}
    </div>
  );
}

function Chip({
  icon,
  label,
  onRemove,
}: {
  icon: React.ReactNode;
  label: string;
  onRemove: () => void;
}) {
  return (
    <span className="flex items-center gap-1.5 rounded-full border border-border/60 bg-card/70 py-1 pl-2.5 pr-1 text-xs">
      {icon}
      {label}
      <button
        type="button"
        onClick={onRemove}
        className="grid size-5 place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
        aria-label={`Remover ${label}`}
      >
        <X className="size-3" />
      </button>
    </span>
  );
}

/** Applies dismissals to a suggestion so removed chips stay removed. */
export function withDismissed<T extends SmartSuggestion | SmartTask>(
  suggestion: T | null,
  dismissed: { folder: boolean; categoryIds: string[] },
): T | null {
  if (!suggestion) return null;
  return {
    ...suggestion,
    folderId: dismissed.folder ? null : suggestion.folderId,
    categoryIds: suggestion.categoryIds.filter((id) => !dismissed.categoryIds.includes(id)),
  };
}
