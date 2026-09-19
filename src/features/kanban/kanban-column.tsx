"use client";

import {
  useSortable,
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Check,
  GripVertical,
  MoreHorizontal,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useState } from "react";

import { KanbanCard } from "@/features/kanban/kanban-card";
import type { BoardCard, BoardColumn } from "@/types/content";

interface TaskOption {
  id: string;
  title: string;
}

export function KanbanColumnView({
  column,
  tasks,
  onCreateCard,
  onUpdateCard,
  onTrashCard,
  onRename,
  onTrash,
}: {
  column: BoardColumn & { cards: BoardCard[] };
  tasks: TaskOption[];
  onCreateCard: (input: {
    title: string;
    taskId: string | null;
  }) => Promise<void>;
  onUpdateCard: (
    cardId: string,
    changes: { title: string; description: string | null },
  ) => Promise<void>;
  onTrashCard: (card: BoardCard) => void;
  onRename: (name: string) => Promise<void>;
  onTrash: () => void;
}) {
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [taskId, setTaskId] = useState("");
  const [saving, setSaving] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [columnName, setColumnName] = useState(column.name);
  const {
    attributes,
    isDragging,
    listeners,
    setActivatorNodeRef,
    setNodeRef,
    transform,
    transition,
  } = useSortable({
    id: `column:${column.id}`,
    data: { type: "column", columnId: column.id },
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  async function create(event: React.FormEvent) {
    event.preventDefault();
    const linkedTask = tasks.find((task) => task.id === taskId);
    const finalTitle = linkedTask?.title || title.trim();
    if (!finalTitle) return;
    setSaving(true);
    try {
      await onCreateCard({ title: finalTitle, taskId: taskId || null });
      setTitle("");
      setTaskId("");
      setAdding(false);
    } finally {
      setSaving(false);
    }
  }

  async function rename(event: React.FormEvent) {
    event.preventDefault();
    if (!columnName.trim()) return;
    await onRename(columnName.trim());
    setRenaming(false);
  }

  return (
    <section
      ref={setNodeRef}
      style={style}
      className={`w-[84vw] max-w-80 shrink-0 self-start rounded-xl border border-border bg-muted/45 p-2.5 sm:w-80 ${isDragging ? "z-40 opacity-60" : ""}`}
      aria-label={column.name}
    >
      <header className="mb-2 flex min-h-10 items-center gap-1 px-1">
        <button
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          type="button"
          className="grid size-8 cursor-grab touch-none place-items-center rounded-md text-muted-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing"
          aria-label={`Mover coluna ${column.name}`}
        >
          <GripVertical className="size-4" />
        </button>
        {renaming ? (
          <form
            onSubmit={rename}
            className="flex min-w-0 flex-1 items-center gap-1"
          >
            <input
              value={columnName}
              onChange={(event) => setColumnName(event.target.value)}
              autoFocus
              className="min-w-0 flex-1 rounded-md border border-input bg-background px-2 py-1 text-sm font-medium outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              className="grid size-8 place-items-center rounded-md hover:bg-accent"
              aria-label="Salvar nome"
            >
              <Check className="size-4" />
            </button>
          </form>
        ) : (
          <button
            type="button"
            onDoubleClick={() => setRenaming(true)}
            onClick={() => setRenaming(true)}
            className="min-w-0 flex-1 truncate text-left text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            title="Renomear coluna"
          >
            {column.name}
          </button>
        )}
        <span className="rounded-full bg-background px-2 py-0.5 text-xs text-muted-foreground">
          {column.cards.length}
        </span>
        <details className="relative">
          <summary
            className="grid size-8 cursor-pointer list-none place-items-center rounded-md text-muted-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`Opções da coluna ${column.name}`}
          >
            <MoreHorizontal className="size-4" />
          </summary>
          <div className="absolute right-0 top-9 z-30 w-40 rounded-lg border border-border bg-popover p-1 shadow-lg">
            <button
              type="button"
              onClick={() => setRenaming(true)}
              className="flex min-h-9 w-full items-center rounded-md px-2 text-sm hover:bg-accent"
            >
              Renomear
            </button>
            <button
              type="button"
              onClick={onTrash}
              className="flex min-h-9 w-full items-center gap-2 rounded-md px-2 text-sm text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="size-4" /> Excluir
            </button>
          </div>
        </details>
      </header>

      <SortableContext
        items={column.cards.map((card) => `card:${card.id}`)}
        strategy={verticalListSortingStrategy}
      >
        <div className="min-h-10 space-y-2" data-column-id={column.id}>
          {column.cards.map((card) => (
            <KanbanCard
              key={card.id}
              card={card}
              onUpdate={(changes) => onUpdateCard(card.id, changes)}
              onTrash={() => onTrashCard(card)}
            />
          ))}
        </div>
      </SortableContext>

      {adding ? (
        <form
          onSubmit={create}
          className="mt-2 rounded-lg border border-border bg-background p-2.5"
        >
          <label className="sr-only" htmlFor={`new-card-${column.id}`}>
            Título do novo card
          </label>
          <input
            id={`new-card-${column.id}`}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Título do card"
            disabled={Boolean(taskId)}
            autoFocus
            className="w-full bg-transparent text-sm outline-none disabled:opacity-50"
          />
          {tasks.length > 0 && (
            <select
              value={taskId}
              onChange={(event) => setTaskId(event.target.value)}
              className="mt-2 min-h-9 w-full rounded-md border border-input bg-background px-2 text-xs outline-none focus:ring-2 focus:ring-ring"
              aria-label="Vincular tarefa existente"
            >
              <option value="">Card independente</option>
              {tasks.map((task) => (
                <option key={task.id} value={task.id}>
                  {task.title}
                </option>
              ))}
            </select>
          )}
          <div className="mt-2 flex justify-end gap-1">
            <button
              type="button"
              onClick={() => setAdding(false)}
              className="grid size-9 place-items-center rounded-md text-muted-foreground hover:bg-accent"
              aria-label="Cancelar"
            >
              <X className="size-4" />
            </button>
            <button
              type="submit"
              disabled={saving || (!title.trim() && !taskId)}
              className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50"
            >
              Adicionar
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="mt-2 flex min-h-10 w-full items-center gap-2 rounded-lg px-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Plus className="size-4" /> Adicionar card
        </button>
      )}
    </section>
  );
}
