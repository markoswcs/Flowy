"use client";

import { useState } from "react";
import { Check, Plus, Tag, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCreateCategory } from "@/features/categories/use-categories";
import { cn } from "@/lib/utils";
import type { Category } from "@/types/productivity";

interface TaskTagSelectorProps {
  categories: Category[];
  value: string[];
  onChange: (value: string[]) => void;
  compact?: boolean;
}

export function TaskTagSelector({
  categories,
  value,
  onChange,
  compact = false,
}: TaskTagSelectorProps) {
  const createMutation = useCreateCategory();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");

  function toggle(categoryId: string) {
    onChange(
      value.includes(categoryId)
        ? value.filter((id) => id !== categoryId)
        : [...value, categoryId],
    );
  }

  function createTag() {
    const trimmedName = name.trim();
    if (!trimmedName) return;

    createMutation.mutate(
      { name: trimmedName, color: "#8B5CF6" },
      {
        onSuccess: (category) => {
          onChange([...new Set([...value, category.id])]);
          setName("");
          setCreating(false);
          toast.success("Tag criada e adicionada à tarefa.");
        },
      },
    );
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", !compact && "gap-2")}>
      {categories.map((category) => {
        const selected = value.includes(category.id);
        return (
          <button
            key={category.id}
            type="button"
            onClick={() => toggle(category.id)}
            aria-pressed={selected}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[10px] font-medium transition-all duration-200",
              !compact && "px-2.5 py-1.5 text-[11px]",
              selected
                ? "scale-[1.02] shadow-sm"
                : "border-border/50 bg-muted/20 text-muted-foreground hover:bg-muted/50 hover:text-foreground",
            )}
            style={
              selected
                ? {
                    backgroundColor: `${category.color}20`,
                    borderColor: `${category.color}50`,
                    color: category.color,
                  }
                : undefined
            }
          >
            <span
              className={cn("size-1.5 rounded-full", !compact && "size-2")}
              style={{ backgroundColor: category.color }}
              aria-hidden="true"
            />
            {category.name}
          </button>
        );
      })}

      {creating ? (
        <div className="flex items-center gap-1">
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                createTag();
              }
              if (event.key === "Escape") {
                setName("");
                setCreating(false);
              }
            }}
            aria-label="Nome da nova tag"
            autoFocus
            placeholder="Nova tag"
            className="h-8 w-32 rounded-full px-3 text-xs"
            disabled={createMutation.isPending}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={createTag}
            loading={createMutation.isPending}
            disabled={!name.trim()}
            className="size-8 min-h-8 rounded-full"
            aria-label="Criar tag"
          >
            <Check className="size-3.5" aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => {
              setName("");
              setCreating(false);
            }}
            className="size-8 min-h-8 rounded-full"
            aria-label="Cancelar criação de tag"
          >
            <X className="size-3.5" aria-hidden="true" />
          </Button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setCreating(true)}
          className={cn(
            "inline-flex items-center gap-1 rounded-full border border-dashed border-border/70 px-2 py-1 text-[10px] font-medium text-muted-foreground transition-colors hover:border-primary/60 hover:bg-primary/5 hover:text-primary",
            !compact && "px-2.5 py-1.5 text-[11px]",
          )}
        >
          {categories.length ? (
            <Plus className="size-3" aria-hidden="true" />
          ) : (
            <Tag className="size-3" aria-hidden="true" />
          )}
          {categories.length ? "Nova tag" : "Criar tag"}
        </button>
      )}
    </div>
  );
}
