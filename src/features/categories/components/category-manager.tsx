"use client";

import { type FormEvent, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Check,
  Pencil,
  Plus,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useCategories,
  useCreateCategory,
  useReorderCategories,
  useRestoreCategory,
  useSoftDeleteCategory,
  useUpdateCategory,
} from "@/features/categories/use-categories";
import { normalizedPositions } from "@/lib/positions";
import { ORGANIZER_COLORS } from "@/lib/color-palette";
import type { Category } from "@/types/productivity";

interface CategoryManagerProps {
  autoFocusNew?: boolean;
}

export function CategoryManager({ autoFocusNew = false }: CategoryManagerProps) {
  const categoriesQuery = useCategories();
  const createMutation = useCreateCategory();
  const updateMutation = useUpdateCategory();
  const reorderMutation = useReorderCategories();
  const deleteMutation = useSoftDeleteCategory();
  const restoreMutation = useRestoreCategory();
  const [name, setName] = useState("");
  const [color, setColor] = useState("#8B5CF6");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingColor, setEditingColor] = useState("#64748b");

  const categories = categoriesQuery.data ?? [];

  function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) return;
    createMutation.mutate(
      { name, color },
      {
        onSuccess: () => {
          setName("");
          toast.success("Tag criada.");
        },
      },
    );
  }

  function beginEditing(category: Category) {
    setEditingId(category.id);
    setEditingName(category.name);
    setEditingColor(category.color);
  }

  function save(category: Category) {
    if (!editingName.trim()) return;
    updateMutation.mutate(
      { id: category.id, name: editingName, color: editingColor },
      {
        onSuccess: () => {
          setEditingId(null);
          toast.success("Tag salva.");
        },
      },
    );
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= categories.length) return;
    const reordered = [...categories];
    const [category] = reordered.splice(index, 1);
    if (!category) return;
    reordered.splice(target, 0, category);
    const positions = normalizedPositions(reordered.length);
    reorderMutation.mutate(
      reordered.map((item, itemIndex) => ({
        ...item,
        position: positions[itemIndex] ?? (itemIndex + 1) * 1_000,
      })),
    );
  }

  function remove(category: Category) {
    deleteMutation.mutate(category.id, {
      onSuccess: () =>
        toast("Tag movida para a lixeira.", {
          action: {
            label: "Desfazer",
            onClick: () => restoreMutation.mutate(category.id),
          },
        }),
    });
  }

  return (
    <section aria-labelledby="category-manager-title" className="space-y-3">
      <div className="rounded-xl bg-muted/40 p-4">
        <h2 id="category-manager-title" className="font-semibold">
          Criar uma tag
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Tags são etiquetas que você aplica às tarefas para agrupá-las.
        </p>
      </div>

      <form onSubmit={create} className="space-y-4 rounded-xl border border-border/70 p-4">
        <label className="block space-y-1.5">
          <span className="text-sm font-medium">Nome</span>
        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Ex.: Urgente, Aguardando ou Ideias"
          aria-label="Nome da nova tag"
          autoFocus={autoFocusNew}
        />
        </label>
        <fieldset>
          <legend className="mb-2 text-sm font-medium">Cor da etiqueta</legend>
          <div className="flex flex-wrap gap-2">
            {ORGANIZER_COLORS.map((option) => (
              <button key={option.value} type="button" onClick={() => setColor(option.value)} className={`flex min-h-9 items-center gap-2 rounded-lg border px-3 text-xs ${color === option.value ? "border-primary bg-primary/10 ring-2 ring-primary/20" : "border-border hover:bg-accent"}`} aria-pressed={color === option.value}>
                <span className="size-2.5 rounded-full" style={{ backgroundColor: option.value }} />
                {option.name}
              </button>
            ))}
          </div>
        </fieldset>
        <Button
          type="submit"
          loading={createMutation.isPending}
          disabled={!name.trim()}
          className="w-full sm:w-auto"
        >
          <Plus className="size-4" aria-hidden="true" />
          Criar tag
        </Button>
      </form>

      {categoriesQuery.isLoading ? (
        <p className="py-4 text-sm text-muted-foreground">
          Carregando tags...
        </p>
      ) : categoriesQuery.isError ? (
        <div className="flex items-center justify-between gap-3 py-3 text-sm text-destructive">
          <span>Não foi possível carregar as tags.</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => categoriesQuery.refetch()}
          >
            Tentar novamente
          </Button>
        </div>
      ) : categories.length === 0 ? (
        <p className="py-4 text-sm text-muted-foreground">
          Nenhuma tag criada.
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-md border border-border">
          {categories.map((category, index) => {
            const editing = editingId === category.id;
            return (
              <li
                key={category.id}
                className="flex min-w-0 items-center gap-1 px-2 py-1.5"
              >
                {editing ? (
                  <label className="relative flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-md">
                    <span className="sr-only">Nova cor de {category.name}</span>
                    <span
                      className="size-4 rounded-full"
                      style={{ backgroundColor: editingColor }}
                    />
                    <select
                      value={editingColor}
                      onChange={(event) => setEditingColor(event.target.value)}
                      className="absolute inset-0 cursor-pointer opacity-0"
                    >
                      {ORGANIZER_COLORS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.name}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : (
                  <Tag
                    className="size-4 shrink-0"
                    style={{ color: category.color }}
                    aria-hidden="true"
                  />
                )}
                {editing ? (
                  <Input
                    value={editingName}
                    onChange={(event) => setEditingName(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Escape") setEditingId(null);
                      if (event.key === "Enter") {
                        event.preventDefault();
                        save(category);
                      }
                    }}
                    className="min-h-9"
                    aria-label={`Novo nome para ${category.name}`}
                    autoFocus
                  />
                ) : (
                  <span className="min-w-0 flex-1 truncate px-1 py-2 text-sm font-medium">
                    {category.name}
                  </span>
                )}
                {editing ? (
                  <>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-9 min-h-9"
                      onClick={() => save(category)}
                      disabled={!editingName.trim() || updateMutation.isPending}
                      aria-label="Salvar tag"
                    >
                      <Check className="size-4" aria-hidden="true" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-9 min-h-9"
                      onClick={() => setEditingId(null)}
                      aria-label="Cancelar edição"
                    >
                      <X className="size-4" aria-hidden="true" />
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-9 min-h-9"
                      onClick={() => move(index, -1)}
                      disabled={index === 0 || reorderMutation.isPending}
                      aria-label={`Mover ${category.name} para cima`}
                    >
                      <ArrowUp className="size-3.5" aria-hidden="true" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-9 min-h-9"
                      onClick={() => move(index, 1)}
                      disabled={
                        index === categories.length - 1 ||
                        reorderMutation.isPending
                      }
                      aria-label={`Mover ${category.name} para baixo`}
                    >
                      <ArrowDown className="size-3.5" aria-hidden="true" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-9 min-h-9"
                      onClick={() => beginEditing(category)}
                      aria-label={`Editar ${category.name}`}
                    >
                      <Pencil className="size-3.5" aria-hidden="true" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-9 min-h-9 text-muted-foreground hover:text-destructive"
                      onClick={() => remove(category)}
                      disabled={deleteMutation.isPending}
                      aria-label={`Excluir ${category.name}`}
                    >
                      <Trash2 className="size-3.5" aria-hidden="true" />
                    </Button>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
