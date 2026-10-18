"use client";

import { Folder as FolderIcon, Sparkles, Tag, X } from "lucide-react";
import { useMemo } from "react";

import { suggestOrganization, type SmartSuggestion } from "@/features/tasks/smart-organize";
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

/** Chips showing the folder and labels the task will get, each removable. */
export function SmartSuggestionChips({
  suggestion,
  folders,
  categories,
  onRemoveFolder,
  onRemoveCategory,
  className,
}: {
  suggestion: SmartSuggestion | null;
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
export function withDismissed(
  suggestion: SmartSuggestion | null,
  dismissed: { folder: boolean; categoryIds: string[] },
): SmartSuggestion | null {
  if (!suggestion) return null;
  return {
    ...suggestion,
    folderId: dismissed.folder ? null : suggestion.folderId,
    categoryIds: suggestion.categoryIds.filter((id) => !dismissed.categoryIds.includes(id)),
  };
}
