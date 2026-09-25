"use client";

import { type FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Tag, Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { Button, buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useCategory,
  useCategories,
  useRestoreCategory,
  useSoftDeleteCategory,
  useUpdateCategory,
} from "@/features/categories/use-categories";
import { useFolders } from "@/features/folders/use-folders";
import { TaskList } from "@/features/tasks/components/task-list";
import { useTasks, useTasksRealtime } from "@/features/tasks/use-tasks";
import { cn } from "@/lib/utils";

export function CategoryPage({ categoryId }: { categoryId: string }) {
  const router = useRouter();
  const categoryQuery = useCategory(categoryId);
  const categoriesQuery = useCategories();
  const foldersQuery = useFolders();
  const tasksQuery = useTasks({ categoryId });
  const updateMutation = useUpdateCategory();
  const deleteMutation = useSoftDeleteCategory();
  const restoreMutation = useRestoreCategory();
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState<string | null>(null);
  useTasksRealtime();

  const category = categoryQuery.data;
  const categories = categoriesQuery.data ?? [];
  const folders = foldersQuery.data ?? [];

  const name = draftName ?? category?.name ?? "";

  function saveName(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!category || !name.trim()) return;
    updateMutation.mutate(
      { id: category.id, name },
      {
        onSuccess: () => {
          setDraftName(null);
          setEditing(false);
          toast.success("Tag renomeada.");
        },
      },
    );
  }

  function removeCategory() {
    if (!category) return;
    deleteMutation.mutate(category.id, {
      onSuccess: () => {
        router.push("/app");
        toast("Tag movida para a lixeira.", {
          action: {
            label: "Desfazer",
            onClick: () => restoreMutation.mutate(category.id),
          },
        });
      },
    });
  }

  if (categoryQuery.isLoading) {
    return (
      <div className="mx-auto w-full max-w-5xl space-y-5">
        <Skeleton className="h-9 w-52" />
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  if (categoryQuery.isError || !category) {
    return (
      <EmptyState
        icon={<Tag className="size-5" aria-hidden="true" />}
        title="Tag não encontrada."
        description="Ela pode ter sido excluída ou você não tem acesso a ela."
        action={
          <Link
            href="/app"
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            Voltar para tarefas
          </Link>
        }
      />
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl">
      {editing ? (
        <form
          onSubmit={saveName}
          className="mb-6 flex max-w-xl items-center gap-2"
        >
          <Input
            value={name}
            onChange={(event) => setDraftName(event.target.value)}
            aria-label="Nome da tag"
            autoFocus
          />
          <Button
            type="submit"
            loading={updateMutation.isPending}
            disabled={!name.trim()}
          >
            Salvar
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => {
              setDraftName(null);
              setEditing(false);
            }}
            aria-label="Cancelar edição"
          >
            <X className="size-4" aria-hidden="true" />
          </Button>
        </form>
      ) : (
        <PageHeader
          title={
            <div className="flex items-center gap-2">
              <span
                className="size-3 rounded-full"
                style={{ backgroundColor: category.color }}
                aria-hidden="true"
              />
              {category.name}
            </div>
          }
          description={`Tag · ${tasksQuery.data?.length ?? 0} ${tasksQuery.data?.length === 1 ? "tarefa marcada" : "tarefas marcadas"}`}
          actions={
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setDraftName(category.name);
                  setEditing(true);
                }}
              >
                <Pencil className="size-4" aria-hidden="true" />
                <span className="hidden sm:inline">Renomear</span>
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={removeCategory}
                loading={deleteMutation.isPending}
                className="text-muted-foreground hover:text-destructive"
                aria-label="Mover tag para a lixeira"
              >
                <Trash2 className="size-4" aria-hidden="true" />
              </Button>
            </>
          }
        />
      )}

      <div className="space-y-5">
        <div className="flex items-center gap-2 rounded-xl border border-border/70 bg-card/60 px-4 py-3 text-sm text-muted-foreground">
          <Tag className="size-4" style={{ color: category.color }} />
          Use o botão <strong className="text-foreground">+</strong> abaixo para criar uma tarefa e adicionar a tag{" "}
          <strong className="text-foreground">{category.name}</strong>.
        </div>
        <section className="mt-4">
          <TaskList
            tasks={tasksQuery.data}
            folders={folders}
            categories={categories}
            loading={tasksQuery.isLoading}
            error={tasksQuery.error}
            onRetry={() => tasksQuery.refetch()}
            emptyTitle="Nenhuma tarefa usa esta tag."
            emptyDescription="Quando você marcar uma tarefa com esta tag, ela aparecerá aqui."
          />
        </section>
      </div>
    </div>
  );
}
