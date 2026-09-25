"use client";

import { FileText, Folder, Pencil, Plus, Search, Star, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDeferredValue, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useCreateNote,
  useNotes,
  useRestoreNote,
  useToggleNoteFavorite,
  useTrashNote,
} from "@/features/notes/use-notes";

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export function NoteList() {
  const router = useRouter();
  const notes = useNotes();
  const create = useCreateNote();
  const trash = useTrashNote();
  const restore = useRestoreNote();
  const toggleFavorite = useToggleNoteFavorite();
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);

  const filteredNotes = useMemo(() => {
    const term = deferredSearch.trim().toLocaleLowerCase("pt-BR");
    if (!term) return notes.data ?? [];

    return (notes.data ?? []).filter((note) =>
      `${note.title} ${note.plain_text}`
        .toLocaleLowerCase("pt-BR")
        .includes(term),
    );
  }, [deferredSearch, notes.data]);

  async function handleCreate() {
    try {
      const note = await create.mutateAsync();
      router.push(`/app/notes/${note.id}`);
    } catch {
      toast.error("Não foi possível criar a nota.");
    }
  }

  async function handleTrash(noteId: string) {
    try {
      await trash.mutateAsync(noteId);
      toast("Nota movida para a lixeira.", {
        action: {
          label: "Desfazer",
          onClick: () => {
            restore.mutate(noteId, {
              onSuccess: () => toast.success("Nota restaurada."),
              onError: () => toast.error("Não foi possível restaurar a nota."),
            });
          },
        },
      });
    } catch {
      toast.error("Não foi possível excluir a nota.");
    }
  }

  async function handleFavorite(noteId: string, isFavorite: boolean) {
    try {
      await toggleFavorite.mutateAsync({ noteId, isFavorite });
    } catch {
      toast.error("Não foi possível atualizar o favorito.");
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8">
      <header className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">Espaço de escrita</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">
            Notas
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
            Capture ideias, referências e planos em um lugar simples de consultar.
          </p>
        </div>
        <Button type="button" onClick={handleCreate} loading={create.isPending}>
          <Plus className="size-4" aria-hidden="true" />
          Nova nota
        </Button>
      </header>

      <label className="relative block">
        <span className="sr-only">Pesquisar notas</span>
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Pesquisar por título ou conteúdo"
          className="h-11 w-full rounded-lg border border-input bg-background pl-10 pr-4 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring"
        />
      </label>

      {notes.isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="Carregando notas">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="h-52 w-full rounded-xl" />
          ))}
        </div>
      ) : notes.isError ? (
        <section className="rounded-xl border border-destructive/30 bg-destructive/5 p-6" aria-live="polite">
          <h2 className="font-medium text-destructive">Não foi possível carregar as notas.</h2>
          <p className="mt-1 text-sm text-muted-foreground">Verifique sua conexão e tente novamente.</p>
          <Button className="mt-4" variant="outline" onClick={() => notes.refetch()}>
            Tentar novamente
          </Button>
        </section>
      ) : filteredNotes.length === 0 ? (
        <section className="flex min-h-72 flex-col items-center justify-center rounded-xl border border-dashed border-border px-6 text-center">
          <span className="grid size-11 place-items-center rounded-lg bg-muted text-muted-foreground">
            <FileText className="size-5" aria-hidden="true" />
          </span>
          <h2 className="mt-4 text-lg font-semibold">
            {search ? "Nenhuma nota encontrada" : "Sua primeira nota começa aqui"}
          </h2>
          <p className="mt-1 max-w-sm text-sm leading-6 text-muted-foreground">
            {search
              ? "Tente outro termo ou limpe a pesquisa."
              : "Crie uma nota para guardar o que importa e retome quando quiser."}
          </p>
          {!search ? (
            <Button className="mt-5" type="button" onClick={handleCreate} loading={create.isPending}>
              <Plus className="size-4" aria-hidden="true" />
              Criar nota
            </Button>
          ) : null}
        </section>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
          {filteredNotes.map((note) => (
            <li key={note.id}>
              <article className="group relative flex min-h-44 flex-col rounded-xl border border-border bg-card p-4 pt-12 transition-colors hover:border-primary/40 hover:bg-accent/30 sm:min-h-48 sm:p-5 sm:pt-12">
                <Link
                  href={`/app/notes/${note.id}`}
                  className="absolute inset-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                  aria-label={`Abrir nota ${note.title || "sem título"}`}
                />
                <div className="relative pointer-events-none min-w-0">
                  <h2 className="line-clamp-2 text-base font-semibold leading-5 sm:text-lg sm:leading-6">
                    {note.title || "Sem título"}
                  </h2>
                  <p className="mt-2 line-clamp-3 text-xs leading-5 text-muted-foreground sm:mt-3 sm:text-sm sm:leading-6">
                    {note.plain_text || "Nota vazia"}
                  </p>
                </div>

                <footer className="pointer-events-none relative mt-auto flex items-end justify-between gap-2 pt-4">
                  <div className="pointer-events-none min-w-0 space-y-1 text-[11px] text-muted-foreground sm:space-y-2 sm:text-xs">
                    {note.folder ? (
                      <span className="flex min-w-0 items-center gap-1.5">
                        <Folder className="size-3.5 shrink-0" aria-hidden="true" />
                        <span className="truncate">{note.folder.name}</span>
                      </span>
                    ) : null}
                    <time dateTime={note.updated_at}>
                      Editada {dateFormatter.format(new Date(note.updated_at))}
                    </time>
                  </div>
                </footer>
                <div className="absolute right-2 top-2 z-10 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleFavorite(note.id, !note.is_favorite)}
                    className="grid size-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={`${note.is_favorite ? "Remover" : "Adicionar"} ${note.title || "nota"} dos favoritos`}
                  >
                    <Star className={`size-4 ${note.is_favorite ? "fill-primary text-primary" : ""}`} aria-hidden="true" />
                  </button>
                  <Link
                    href={`/app/notes/${note.id}`}
                    className="grid size-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={`Editar ${note.title || "nota"}`}
                  >
                    <Pencil className="size-4" aria-hidden="true" />
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleTrash(note.id)}
                    className="grid size-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive"
                    aria-label={`Mover ${note.title || "nota"} para a lixeira`}
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </button>
                </div>
              </article>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
