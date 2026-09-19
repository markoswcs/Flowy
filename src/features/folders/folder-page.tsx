"use client";

import { type FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileText, FolderX, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { Button, buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { useCategories } from "@/features/categories/use-categories";
import { useCreateNote, useNotes } from "@/features/notes/use-notes";
import {
  useFolder,
  useFolders,
  useRestoreFolder,
  useSoftDeleteFolder,
  useUpdateFolder,
} from "@/features/folders/use-folders";
import { TaskList } from "@/features/tasks/components/task-list";
import { useTasks, useTasksRealtime } from "@/features/tasks/use-tasks";
import { cn } from "@/lib/utils";

export function FolderPage({ folderId }: { folderId: string }) {
  const router = useRouter();
  const folderQuery = useFolder(folderId);
  const foldersQuery = useFolders();
  const categoriesQuery = useCategories();
  const tasksQuery = useTasks({ folderId });
  const notesQuery = useNotes();
  const createNoteMutation = useCreateNote();
  const updateMutation = useUpdateFolder();
  const deleteMutation = useSoftDeleteFolder();
  const restoreMutation = useRestoreFolder();
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState<string | null>(null);
  useTasksRealtime();

  const folder = folderQuery.data;
  const folders = foldersQuery.data ?? [];
  const categories = categoriesQuery.data ?? [];
  const notes = (notesQuery.data ?? []).filter(
    (note) => note.folder_id === folderId,
  );

  const name = draftName ?? folder?.name ?? "";

  function saveName(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!folder || !name.trim()) return;
    updateMutation.mutate(
      { id: folder.id, name },
      {
        onSuccess: () => {
          setDraftName(null);
          setEditing(false);
          toast.success("Pasta renomeada.");
        },
      },
    );
  }

  function removeFolder() {
    if (!folder) return;
    deleteMutation.mutate(folder.id, {
      onSuccess: () => {
        router.push("/app");
        toast("Pasta movida para a lixeira.", {
          action: {
            label: "Desfazer",
            onClick: () => restoreMutation.mutate(folder.id),
          },
        });
      },
    });
  }

  async function createNote() {
    try {
      const note = await createNoteMutation.mutateAsync({ folderId });
      router.push(`/app/notes/${note.id}`);
    } catch {
      toast.error("Não foi possível criar a nota.");
    }
  }

  if (folderQuery.isLoading) {
    return (
      <div className="mx-auto w-full max-w-5xl space-y-5">
        <Skeleton className="h-9 w-52" />
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  if (folderQuery.isError || !folder) {
    return (
      <EmptyState
        icon={<FolderX className="size-5" aria-hidden="true" />}
        title="Pasta não encontrada."
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
            aria-label="Nome da pasta"
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
          title={folder.name}
          description={`${tasksQuery.data?.length ?? 0} ${tasksQuery.data?.length === 1 ? "tarefa" : "tarefas"}`}
          actions={
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setDraftName(folder.name);
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
                onClick={removeFolder}
                loading={deleteMutation.isPending}
                className="text-muted-foreground hover:text-destructive"
                aria-label="Mover pasta para a lixeira"
              >
                <Trash2 className="size-4" aria-hidden="true" />
              </Button>
            </>
          }
        />
      )}

      <div className="space-y-8">
        <section className="space-y-3" aria-labelledby="folder-tasks-title">
          <div>
            <h2 id="folder-tasks-title" className="text-lg font-semibold">Tarefas</h2>
            <p className="text-sm text-muted-foreground">Ações e lembretes desta pasta.</p>
          </div>
        <section className="mt-4">
          <TaskList
            tasks={tasksQuery.data}
            folders={folders}
            categories={categories}
            loading={tasksQuery.isLoading}
            error={tasksQuery.error}
            onRetry={() => tasksQuery.refetch()}
            emptyTitle="Esta pasta está vazia."
            emptyDescription="Adicione uma tarefa acima para começar."
          />
        </section>
        </section>

        <section className="space-y-3" aria-labelledby="folder-notes-title">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 id="folder-notes-title" className="text-lg font-semibold">Notas</h2>
              <p className="text-sm text-muted-foreground">Textos, referências e ideias desta pasta.</p>
            </div>
            <Button type="button" variant="outline" onClick={createNote} loading={createNoteMutation.isPending}>
              <Plus className="size-4" /> Nova nota
            </Button>
          </div>
          {notesQuery.isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : notes.length ? (
            <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
              {notes.map((note) => (
                <li key={note.id}>
                  <Link href={`/app/notes/${note.id}`} className="flex items-center gap-3 p-4 transition-colors hover:bg-accent/40">
                    <FileText className="size-5 shrink-0 text-primary" />
                    <span className="min-w-0 flex-1 truncate font-medium">{note.title || "Sem título"}</span>
                    <span className="text-xs text-muted-foreground">Abrir</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <button type="button" onClick={createNote} className="flex min-h-28 w-full flex-col items-center justify-center rounded-xl border border-dashed border-border text-center transition-colors hover:border-primary/60 hover:bg-primary/5">
              <FileText className="mb-2 size-5 text-muted-foreground" />
              <span className="text-sm font-medium">Criar a primeira nota desta pasta</span>
              <span className="mt-1 text-xs text-muted-foreground">Ela será salva automaticamente aqui.</span>
            </button>
          )}
        </section>
      </div>
    </div>
  );
}
