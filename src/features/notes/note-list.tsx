"use client";

import {
  FileText,
  Folder,
  Pencil,
  Plus,
  Search,
  Star,
  Trash2,
  Network,
  Workflow,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { toast } from "@/lib/toast";
import { notify } from "@/providers/notification-provider";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useCreateNote,
  useNotes,
  useRestoreNote,
  useToggleNoteFavorite,
  useTrashNote,
} from "@/features/notes/use-notes";
import type { NoteKind } from "@/types/content";
import { holdOverlay } from "@/lib/overlay";

const creationOptions = [
  {
    kind: "text",
    icon: FileText,
    title: "Nota",
    description: "Texto, checklist, links, imagens e desenho.",
  },
  {
    kind: "excalidraw",
    icon: Workflow,
    title: "Fluxograma",
    description: "Formas, setas, modelos prontos, imagens e exportação.",
  },
  {
    kind: "mindmap",
    icon: Network,
    title: "Mapa mental",
    description: "Ideias em ramos, com ligações entre tópicos.",
  },
] as const satisfies ReadonlyArray<{
  kind: NoteKind;
  icon: typeof FileText;
  title: string;
  description: string;
}>;

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export function NoteList() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const notes = useNotes();
  const create = useCreateNote();
  const trash = useTrashNote();
  const restore = useRestoreNote();
  const toggleFavorite = useToggleNoteFavorite();
  const [search, setSearch] = useState("");
  const [notePendingDeletion, setNotePendingDeletion] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [creationOpen, setCreationOpen] = useState(false);
  const deferredSearch = useDeferredValue(search);
  const typeFilter = searchParams.get("tipo");
  const isDiagramView = typeFilter === "fluxo";
  const pageCopy = isDiagramView
    ? {
        eyebrow: "Espaço visual",
        title: "Fluxogramas e mapas",
        description:
          "Desenhe processos, diagramas e mapas mentais com ideias interligadas.",
        create: "Novo diagrama",
        empty: "Seu primeiro diagrama começa aqui",
        emptyHint:
          "Crie um fluxograma ou um mapa mental para organizar suas ideias.",
        search: "Pesquisar diagramas",
      }
    : {
        eyebrow: "Espaço de escrita",
        title: "Notas",
        description:
          "Capture ideias, referências e planos em um lugar simples de consultar.",
        create: "Nova nota",
        empty: "Sua primeira nota começa aqui",
        emptyHint:
          "Crie uma nota para guardar o que importa e retome quando quiser.",
        search: "Pesquisar notas",
      };

  const filteredNotes = useMemo(() => {
    const term = deferredSearch.trim().toLocaleLowerCase("pt-BR");
    const notesByType = (notes.data ?? []).filter((note) =>
      isDiagramView
        ? note.kind !== "text"
        : typeFilter === "nota"
          ? note.kind === "text"
          : true,
    );
    if (!term) return notesByType;

    return notesByType.filter((note) =>
      `${note.title} ${note.plain_text}`
        .toLocaleLowerCase("pt-BR")
        .includes(term),
    );
  }, [deferredSearch, notes.data, typeFilter, isDiagramView]);

  const overlayOpen = creationOpen || Boolean(notePendingDeletion);
  useEffect(() => {
    if (!overlayOpen) return;
    const release = holdOverlay();
    const close = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setCreationOpen(false);
      setNotePendingDeletion(null);
    };
    window.addEventListener("keydown", close);
    return () => {
      release();
      window.removeEventListener("keydown", close);
    };
  }, [overlayOpen]);

  async function handleCreate(kind: NoteKind) {
    try {
      const note = await create.mutateAsync({
        kind,
        title:
          kind === "excalidraw"
            ? "Fluxograma sem título"
            : kind === "mindmap"
              ? "Mapa mental sem título"
              : undefined,
      });
      setCreationOpen(false);
      router.push(`/app/notes/${note.id}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (kind !== "text" && /kind|excalidraw|mindmap/i.test(message)) {
        toast.error(
          "O banco ainda precisa receber a atualização dos diagramas.",
        );
        return;
      }
      toast.error("Não foi possível criar a nota.");
    }
  }

  async function handleTrash(noteId: string) {
    try {
      await trash.mutateAsync(noteId);
      notify("Nota movida para a lixeira", {
        action: {
          label: "Desfazer",
          onClick: () => {
            restore.mutate(noteId, {
              onSuccess: () => notify("Nota restaurada"),
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
          <p className="text-sm font-medium text-primary">{pageCopy.eyebrow}</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">
            {pageCopy.title}
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
            {pageCopy.description}
          </p>
        </div>
        <Button
          type="button"
          onClick={() => setCreationOpen(true)}
          loading={create.isPending}
        >
          <Plus className="size-4" aria-hidden="true" />
          {pageCopy.create}
        </Button>
      </header>

      <label className="relative block">
        <span className="sr-only">{pageCopy.search}</span>
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
        <div
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
          aria-label="Carregando notas"
        >
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="h-52 w-full rounded-xl" />
          ))}
        </div>
      ) : notes.isError ? (
        <section
          className="rounded-xl border border-destructive/30 bg-destructive/5 p-6"
          aria-live="polite"
        >
          <h2 className="font-medium text-destructive">
            Não foi possível carregar as notas.
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Verifique sua conexão e tente novamente.
          </p>
          <Button
            className="mt-4"
            variant="outline"
            onClick={() => notes.refetch()}
          >
            Tentar novamente
          </Button>
        </section>
      ) : filteredNotes.length === 0 ? (
        <section className="flex min-h-72 flex-col items-center justify-center rounded-xl border border-dashed border-border px-6 text-center">
          <span className="grid size-11 place-items-center rounded-lg bg-muted text-muted-foreground">
            <FileText className="size-5" aria-hidden="true" />
          </span>
          <h2 className="mt-4 text-lg font-semibold">
            {search
              ? "Nenhuma nota encontrada"
              : pageCopy.empty}
          </h2>
          <p className="mt-1 max-w-sm text-sm leading-6 text-muted-foreground">
            {search
              ? "Tente outro termo ou limpe a pesquisa."
              : pageCopy.emptyHint}
          </p>
          {!search ? (
            <Button
              className="mt-5"
              type="button"
              onClick={() => setCreationOpen(true)}
              loading={create.isPending}
            >
              <Plus className="size-4" aria-hidden="true" />
              {pageCopy.create}
            </Button>
          ) : null}
        </section>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
          {filteredNotes.map((note) => (
            <li key={note.id}>
              <article
                className="group relative flex min-h-44 flex-col rounded-2xl border border-border/80 bg-card p-4 pt-12 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:bg-accent/30 hover:shadow-md active:translate-y-0 sm:min-h-48 sm:p-5 sm:pt-12"
                style={note.color ? { backgroundColor: note.color } : undefined}
              >
                <Link
                  href={`/app/notes/${note.id}`}
                  className="absolute inset-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                  aria-label={`Abrir nota ${note.title || "sem título"}`}
                />
                <div className="relative pointer-events-none min-w-0">
                  <h2 className="line-clamp-2 text-base font-semibold leading-5 sm:text-lg sm:leading-6">
                    {note.kind === "excalidraw" ? (
                      <Workflow
                        className="mr-1 inline size-4 text-primary"
                        aria-hidden="true"
                      />
                    ) : note.kind === "mindmap" ? (
                      <Network
                        className="mr-1 inline size-4 text-primary"
                        aria-hidden="true"
                      />
                    ) : null}
                    {note.title || "Sem título"}
                  </h2>
                  <p className="mt-2 line-clamp-3 text-xs leading-5 text-muted-foreground sm:mt-3 sm:text-sm sm:leading-6">
                    {note.kind === "excalidraw"
                      ? "Fluxograma interativo"
                      : note.kind === "mindmap"
                        ? note.plain_text || "Mapa mental"
                        : note.plain_text || "Nota vazia"}
                  </p>
                </div>

                <footer className="pointer-events-none relative mt-auto flex items-end justify-between gap-2 pt-4">
                  <div className="pointer-events-none min-w-0 space-y-1 text-[11px] text-muted-foreground sm:space-y-2 sm:text-xs">
                    {note.folder ? (
                      <span className="flex min-w-0 items-center gap-1.5">
                        <Folder
                          className="size-3.5 shrink-0"
                          aria-hidden="true"
                        />
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
                    className="grid size-8 place-items-center rounded-full text-muted-foreground transition-all hover:scale-105 hover:bg-accent hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-95"
                    aria-label={`${note.is_favorite ? "Remover" : "Adicionar"} ${note.title || "nota"} dos favoritos`}
                  >
                    <Star
                      className={`size-4 ${note.is_favorite ? "fill-primary text-primary" : ""}`}
                      aria-hidden="true"
                    />
                  </button>
                  <Link
                    href={`/app/notes/${note.id}`}
                    className="grid size-8 place-items-center rounded-full text-muted-foreground transition-all hover:scale-105 hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-95"
                    aria-label={`Editar ${note.title || "nota"}`}
                  >
                    <Pencil className="size-4" aria-hidden="true" />
                  </Link>
                  <button
                    type="button"
                    onClick={() =>
                      setNotePendingDeletion({
                        id: note.id,
                        title: note.title || "Sem título",
                      })
                    }
                    className="grid size-8 place-items-center rounded-full text-muted-foreground transition-all hover:scale-105 hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive active:scale-95"
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
      {notePendingDeletion ? (
        <div
          className="fixed inset-0 z-[100] !mt-0 grid place-items-center p-4"
          role="presentation"
        >
          <button
            type="button"
            className="absolute inset-0 animate-fade-in bg-background/80 backdrop-blur-md"
            aria-label="Cancelar"
            onClick={() => setNotePendingDeletion(null)}
          />
          <div
            className="relative w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-xl animate-scale-in"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-note-title"
          >
            <h2 id="delete-note-title" className="font-semibold">
              Mover nota para a lixeira?
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              “{notePendingDeletion.title}” será movida para a lixeira. Você
              poderá restaurá-la depois.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setNotePendingDeletion(null)}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={async () => {
                  const noteId = notePendingDeletion.id;
                  setNotePendingDeletion(null);
                  await handleTrash(noteId);
                }}
              >
                Mover para lixeira
              </Button>
            </div>
          </div>
        </div>
      ) : null}
      {creationOpen ? (
        <div
          className="fixed inset-0 z-[100] !mt-0 flex items-end justify-center p-3 sm:items-center sm:p-4"
          role="presentation"
        >
          <button
            type="button"
            className="absolute inset-0 animate-fade-in bg-background/80 backdrop-blur-md"
            aria-label="Fechar"
            onClick={() => setCreationOpen(false)}
          />
          <section
            className="relative w-full max-w-2xl animate-scale-in rounded-3xl border border-border/70 bg-card p-5 shadow-2xl sm:p-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-note-title"
          >
            <h2 id="create-note-title" className="text-lg font-semibold">
              O que você quer criar?
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Escolha o formato. Você pode mudar o título e a pasta depois.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {creationOptions.map((option) => {
                const Icon = option.icon;
                const highlighted = isDiagramView
                  ? option.kind !== "text"
                  : option.kind === "text";
                return (
                  <button
                    key={option.kind}
                    type="button"
                    disabled={create.isPending}
                    onClick={() => handleCreate(option.kind)}
                    className={`group flex items-start gap-3 rounded-2xl border p-4 text-left transition-all hover:-translate-y-0.5 hover:border-primary hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60 sm:flex-col ${
                      highlighted ? "border-primary/40 bg-primary/5" : "border-border"
                    }`}
                  >
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                      <Icon className="size-5" aria-hidden="true" />
                    </span>
                    <span>
                      <strong className="block">{option.title}</strong>
                      <span className="mt-1 block text-sm leading-5 text-muted-foreground">
                        {option.description}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="mt-5 flex justify-end">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setCreationOpen(false)}
              >
                Cancelar
              </Button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
