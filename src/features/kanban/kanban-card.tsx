"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Check, GripVertical, Link2, Pencil, Trash2, X } from "lucide-react";
import { useState } from "react";

import type { BoardCard } from "@/types/content";

export function KanbanCard({
  card,
  onUpdate,
  onTrash,
}: {
  card: BoardCard;
  onUpdate: (changes: {
    title: string;
    description: string | null;
  }) => Promise<void>;
  onTrash: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(card.title ?? card.task?.title ?? "");
  const [description, setDescription] = useState(card.description ?? "");
  const [saving, setSaving] = useState(false);
  const {
    attributes,
    isDragging,
    listeners,
    setActivatorNodeRef,
    setNodeRef,
    transform,
    transition,
  } = useSortable({
    id: `card:${card.id}`,
    data: { type: "card", cardId: card.id, columnId: card.column_id },
    disabled: editing,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  async function save() {
    if (!title.trim()) return;
    setSaving(true);
    try {
      await onUpdate({
        title: title.trim(),
        description: description.trim() || null,
      });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <div
        ref={setNodeRef}
        className="rounded-lg border border-ring bg-background p-3 shadow-sm"
        style={style}
      >
        <label className="sr-only" htmlFor={`card-title-${card.id}`}>
          Título do card
        </label>
        <input
          id={`card-title-${card.id}`}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className="w-full bg-transparent text-sm font-medium outline-none"
          autoFocus
        />
        <label className="sr-only" htmlFor={`card-description-${card.id}`}>
          Descrição do card
        </label>
        <textarea
          id={`card-description-${card.id}`}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Descrição opcional"
          rows={3}
          className="mt-2 w-full resize-none rounded-md border border-input bg-background p-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        <div className="mt-2 flex justify-end gap-1">
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="grid size-9 place-items-center rounded-md text-muted-foreground hover:bg-accent"
            aria-label="Cancelar edição"
          >
            <X className="size-4" />
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving || !title.trim()}
            className="grid size-9 place-items-center rounded-md bg-primary text-primary-foreground disabled:opacity-50"
            aria-label="Salvar card"
          >
            <Check className="size-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={`group rounded-lg border border-border bg-background p-3 shadow-sm transition-shadow hover:shadow ${isDragging ? "z-50 opacity-50" : ""}`}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          className="-ml-1 grid size-8 shrink-0 cursor-grab touch-none place-items-center rounded text-muted-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing"
          aria-label={`Mover card ${card.task?.title || card.title || "sem título"}`}
        >
          <GripVertical className="size-4" />
        </button>
        <div className="min-w-0 flex-1">
          <h3 className="break-words text-sm font-medium text-foreground">
            {card.task?.title || card.title || "Card sem título"}
          </h3>
          {card.description && (
            <p className="mt-1 line-clamp-3 text-xs leading-5 text-muted-foreground">
              {card.description}
            </p>
          )}
          {card.task_id && (
            <span className="mt-2 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
              <Link2 className="size-3" /> Tarefa vinculada
            </span>
          )}
        </div>
      </div>
      <div className="mt-2 flex justify-end gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="grid size-8 place-items-center rounded text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Editar card"
        >
          <Pencil className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={onTrash}
          className="grid size-8 place-items-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Mover card para a lixeira"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
    </article>
  );
}
