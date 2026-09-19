"use client";

import { FileText, Loader2, Plus, NotebookPen, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import {
  useCreateNote,
  useNotes,
  useRestoreNote,
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
  const [search, setSearch] = useState("");

  const filteredNotes = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("pt-BR");
    if (!term) return notes.data ?? [];
    return (notes.data ?? []).filter((note) =>
      `${note.title} ${note.plain_text}`
        .toLocaleLowerCase("pt-BR")
        .includes(term),
    );
  }, [notes.data, search]);

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

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8 animate-fade-in">
      <header className="mb-10 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground">
            Notas
          </h1>
          <p className="mt-2 text-base text-muted-foreground">
            Suas ideias brilhantes, sempre à mão.
          </p>
        </div>
        <button
          type="button"
          onClick={handleCreate}
          disabled={create.isPending}
          className="group relative inline-flex h-12 items-center justify-center gap-2 overflow-hidden rounded-full bg-primary px-8 text-sm font-bold text-primary-foreground shadow-[0_0_20px_hsl(var(--primary)/0.4)] transition-all hover:-translate-y-0.5 hover:shadow-[0_0_30px_hsl(var(--primary)/0.6)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30 active:scale-95 disabled:opacity-60"
        >
          <div className="absolute inset-0 flex h-full w-full justify-center [transform:skew(-12deg)_translateX(-100%)] group-hover:duration-1000 group-hover:[transform:skew(-12deg)_translateX(100%)]">
            <div className="relative h-full w-8 bg-white/20" />
          </div>
          {create.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Plus className="size-5" />
          )}
          Nova nota
        </button>
      </header>

      <div className="relative mb-8 group">
        <div className="absolute inset-y-0 left-5 z-10 flex items-center pointer-events-none">
          <NotebookPen className="size-5 text-white transition-colors drop-shadow-sm" aria-hidden="true" />
        </div>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Pesquisar em suas notas..."
          className="w-full rounded-2xl border border-border/50 bg-card/40 backdrop-blur-md py-4 pl-14 pr-6 text-base shadow-sm transition-all focus:border-primary/50 focus:bg-card/60 focus:outline-none focus:ring-4 focus:ring-primary/10 placeholder:text-muted-foreground/70"
        />
      </div>

      {notes.isLoading ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-label="Carregando notas">
          {Array.from({ length: 6 }, (_, index) => (
            <div
              key={index}
              className="h-48 animate-pulse rounded-3xl bg-card/40 border border-border/30"
            />
          ))}
        </div>
      ) : notes.isError ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-8 text-center backdrop-blur-md">
          <p className="text-lg font-medium text-destructive">
            Não foi possível carregar suas notas.
          </p>
          <button
            className="mt-4 inline-flex items-center justify-center rounded-full bg-destructive px-6 py-2 text-sm font-bold text-destructive-foreground transition-transform hover:scale-105 active:scale-95"
            onClick={() => notes.refetch()}
          >
            Tentar novamente
          </button>
        </div>
      ) : filteredNotes.length === 0 ? (
        <div className="flex min-h-[400px] flex-col items-center justify-center rounded-3xl border border-dashed border-border/60 bg-card/20 px-4 text-center backdrop-blur-sm">
          <div className="mb-6 flex size-20 items-center justify-center rounded-full bg-primary/10 shadow-[0_0_30px_hsl(var(--primary)/0.2)]">
            <FileText className="size-10 text-primary" aria-hidden="true" />
          </div>
          <h2 className="mb-2 text-xl font-bold text-foreground">
            {search ? "Nenhuma nota encontrada" : "Um espaço em branco para a sua mente"}
          </h2>
          <p className="mb-8 max-w-md text-muted-foreground">
            {search 
              ? `Não encontramos nenhuma nota com o termo "${search}".` 
              : "Crie notas para registrar ideias, guardar referências ou estruturar pensamentos longos."}
          </p>
          {!search && (
            <button
              onClick={handleCreate}
              className="rounded-full bg-primary/10 px-6 py-3 text-sm font-bold text-primary transition-colors hover:bg-primary/20 active:scale-95"
            >
              Começar a escrever
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filteredNotes.map((note, index) => (
            <article 
              key={note.id} 
              className="group relative flex h-56 flex-col justify-between overflow-hidden rounded-3xl border border-border/50 bg-card/40 p-6 shadow-sm backdrop-blur-md transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:bg-card/60 hover:border-primary/30 animate-slide-up-fade"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <Link
                href={`/app/notes/${note.id}`}
                className="absolute inset-0 z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset rounded-3xl"
              />
              
              <div className="mb-2">
                <h2 className="mb-3 line-clamp-2 text-xl font-bold leading-tight tracking-tight text-foreground transition-colors group-hover:text-primary">
                  {note.title || "Sem título"}
                </h2>
                <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground/90">
                  {note.plain_text || "Nota vazia..."}
                </p>
              </div>

              <div className="mt-auto flex items-end justify-between pt-4 relative z-20">
                <div className="flex flex-col items-start gap-2.5">
                  {note.folder && (
                    <span className="inline-flex items-center rounded-full bg-primary/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-primary border border-primary/20 backdrop-blur-md">
                      {note.folder.name}
                    </span>
                  )}
                  <time
                    className="text-[11px] font-semibold text-muted-foreground/60"
                    dateTime={note.updated_at}
                  >
                    {dateFormatter.format(new Date(note.updated_at))}
                  </time>
                </div>
                
                <button
                  type="button"
                  onClick={(e) => { 
                    e.preventDefault(); 
                    e.stopPropagation();
                    handleTrash(note.id); 
                  }}
                  className="flex size-9 items-center justify-center rounded-full bg-destructive/10 text-destructive opacity-0 backdrop-blur-md transition-all hover:bg-destructive hover:text-destructive-foreground hover:scale-110 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive group-hover:opacity-100"
                  aria-label={`Mover ${note.title || "nota"} para a lixeira`}
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
