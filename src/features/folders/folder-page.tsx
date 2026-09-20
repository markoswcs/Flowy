"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileText, Folder as FolderIcon, FolderX, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button, buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useCategories } from "@/features/categories/use-categories";
import {
  useFolder,
  useFolders,
  useRestoreFolder,
  useSoftDeleteFolder,
} from "@/features/folders/use-folders";
import { useCreateNote, useNotes } from "@/features/notes/use-notes";
import { TaskComposer } from "@/features/tasks/components/task-composer";
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
  const deleteMutation = useSoftDeleteFolder();
  const restoreMutation = useRestoreFolder();
  useTasksRealtime();

  const folder = folderQuery.data;
  const folders = foldersQuery.data ?? [];
  const categories = categoriesQuery.data ?? [];
  const notes = (notesQuery.data ?? []).filter(
    (note) => note.folder_id === folderId,
  );

  function openFolderEditor() {
    if (!folder) return;
    window.dispatchEvent(
      new CustomEvent("flowy:open-organizer", {
        detail: { target: "folders", editId: folder.id },
      }),
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
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <Skeleton className="h-36 w-full rounded-xl" />
        <Skeleton className="h-56 w-full rounded-xl" />
        <Skeleton className="h-44 w-full rounded-xl" />
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

  const taskCount = tasksQuery.data?.length;
  const subfolders = folders.filter((f) => f.parent_id === folderId);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <header className="rounded-xl border border-border bg-card p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <span
              className="grid size-11 shrink-0 place-items-center rounded-lg bg-muted"
              style={{ color: folder.color ?? undefined }}
            >
              <FolderIcon className="size-6" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-muted-foreground">
                {folder.parent_id ? "Subpasta" : "Pasta principal"}
              </p>
              <h1 className="mt-1 truncate text-2xl font-semibold tracking-tight sm:text-3xl">
                {folder.name}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {taskCount === undefined
                  ? "Carregando tarefas..."
                  : `${taskCount} ${taskCount === 1 ? "tarefa" : "tarefas"}`} · {notes.length} {notes.length === 1 ? "nota" : "notas"}
                {!folder.parent_id && subfolders.length > 0 && ` · ${subfolders.length} ${subfolders.length === 1 ? "subpasta" : "subpastas"}`}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button type="button" variant="outline" onClick={openFolderEditor}>
              <Pencil className="size-4" aria-hidden="true" />
              Editar pasta
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
          </div>
        </div>
      </header>

      {subfolders.length > 0 ? (
        <section className="rounded-xl border border-border bg-card shadow-sm" aria-labelledby="folder-subfolders-title">
          <div className="border-b border-border px-5 py-4 sm:px-6">
            <h2 id="folder-subfolders-title" className="text-lg font-semibold">Subpastas</h2>
          </div>
          <div className="p-4 sm:p-6">
            <ul className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
              {subfolders.map((sub) => (
                <li key={sub.id}>
                  <Link
                    href={`/app/folders/${sub.id}`}
                    className="flex items-center gap-3 rounded-lg border border-border bg-background p-3 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <FolderIcon
                      className="size-5 shrink-0"
                      style={{ color: sub.color ?? undefined }}
                      aria-hidden="true"
                    />
                    <span className="truncate text-sm font-medium">{sub.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      <section className="rounded-xl border border-border bg-card shadow-sm" aria-labelledby="folder-tasks-title">
        <div className="border-b border-border px-5 py-4 sm:px-6">
          <h2 id="folder-tasks-title" className="text-lg font-semibold">Tarefas</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Planeje o que precisa ser feito nesta pasta.
          </p>
        </div>
        <div className="space-y-5 p-4 sm:p-6">
          <TaskComposer
            folders={folders}
            categories={categories}
            defaultFolderId={folder.id}
            compact
          />
          <TaskList
            tasks={tasksQuery.data}
            folders={folders}
            categories={categories}
            loading={tasksQuery.isLoading}
            error={tasksQuery.error}
            onRetry={() => tasksQuery.refetch()}
            emptyTitle="Esta pasta ainda não tem tarefas."
            emptyDescription="Use o campo acima para criar a primeira."
          />
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card shadow-sm" aria-labelledby="folder-notes-title">
        <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <h2 id="folder-notes-title" className="text-lg font-semibold">Notas</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Textos, referências e ideias relacionadas.
            </p>
          </div>
          <Button type="button" variant="outline" onClick={createNote} loading={createNoteMutation.isPending}>
            <Plus className="size-4" aria-hidden="true" />
            Nova nota
          </Button>
        </div>
        <div className="p-4 sm:p-6">
          {notesQuery.isLoading ? (
            <Skeleton className="h-24 w-full rounded-lg" />
          ) : notes.length ? (
            <ul className="overflow-hidden rounded-lg border border-border">
              {notes.map((note) => (
                <li key={note.id} className="border-b border-border last:border-b-0">
                  <Link
                    href={`/app/notes/${note.id}`}
                    className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                  >
                    <FileText className="size-4 shrink-0 text-primary" aria-hidden="true" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{note.title || "Sem título"}</span>
                      {note.plain_text ? (
                        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                          {note.plain_text}
                        </span>
                      ) : null}
                    </span>
                    <span className="text-xs text-muted-foreground">Abrir</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <button
              type="button"
              onClick={createNote}
              className="flex min-h-32 w-full flex-col items-center justify-center rounded-lg border border-dashed border-border px-4 text-center transition-colors hover:border-primary/60 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <FileText className="mb-2 size-5 text-muted-foreground" aria-hidden="true" />
              <span className="text-sm font-medium">Criar a primeira nota desta pasta</span>
              <span className="mt-1 text-xs text-muted-foreground">Ela será salva automaticamente aqui.</span>
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
