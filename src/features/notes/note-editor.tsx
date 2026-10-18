"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import dynamic from "next/dynamic";
import { Component, type ErrorInfo, type ReactNode } from "react";

import { TextNoteEditor } from "@/features/notes/text-note-editor";
import { useNote } from "@/features/notes/use-notes";
import type { Note } from "@/types/content";

const ExcalidrawNoteEditor = dynamic(
  () => import("@/components/notes/excalidraw-note-editor"),
  {
    ssr: false,
    loading: () => (
      <div className="mx-auto max-w-4xl p-8 text-sm text-muted-foreground">
        Carregando editor de fluxograma…
      </div>
    ),
  },
);

const MapEditor = dynamic(() => import("@/features/mindmap/map-editor"), {
  ssr: false,
  loading: () => (
    <div className="mx-auto max-w-4xl p-8 text-sm text-muted-foreground">
      Carregando mapa…
    </div>
  ),
});

interface EditorErrorBoundaryProps {
  children: ReactNode;
}

interface EditorErrorBoundaryState {
  hasError: boolean;
  retryKey: number;
  errorMessage: string | null;
}

class EditorErrorBoundary extends Component<
  EditorErrorBoundaryProps,
  EditorErrorBoundaryState
> {
  state: EditorErrorBoundaryState = {
    hasError: false,
    retryKey: 0,
    errorMessage: null,
  };

  static getDerivedStateFromError(
    error: unknown,
  ): Partial<EditorErrorBoundaryState> {
    return {
      hasError: true,
      errorMessage:
        error instanceof Error ? error.message : "Erro desconhecido no editor",
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[Flowy] Falha no editor de fluxograma", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <section className="mx-auto flex min-h-[52dvh] w-full max-w-lg flex-col items-center justify-center rounded-2xl border border-destructive/20 bg-card px-6 py-12 text-center">
          <span className="grid size-12 place-items-center rounded-2xl bg-destructive/10 text-destructive">
            <AlertTriangle className="size-6" aria-hidden="true" />
          </span>
          <h2 className="mt-4 text-lg font-semibold">
            O editor precisa ser recarregado
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            O fluxograma não foi apagado. Tente carregar o editor novamente.
          </p>
          <button
            type="button"
            onClick={() =>
              this.setState((current) => ({
                hasError: false,
                retryKey: current.retryKey + 1,
                errorMessage: null,
              }))
            }
            className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <RefreshCw className="size-4" aria-hidden="true" />
            Recarregar editor
          </button>
          {this.state.errorMessage ? (
            <details className="mt-5 w-full text-left text-xs text-muted-foreground">
              <summary className="cursor-pointer text-center hover:text-foreground">
                Ver detalhe técnico
              </summary>
              <code className="mt-2 block max-h-24 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-muted/60 p-3">
                {this.state.errorMessage}
              </code>
            </details>
          ) : null}
        </section>
      );
    }

    return (
      <div key={this.state.retryKey} className="h-full min-h-0">
        {this.props.children}
      </div>
    );
  }
}

function LoadedNoteEditor({ note }: { note: Note }) {
  if (note.kind === "mindmap") {
    return (
      <EditorErrorBoundary>
        <MapEditor note={note} />
      </EditorErrorBoundary>
    );
  }

  if (note.kind === "excalidraw") {
    return (
      <EditorErrorBoundary>
        <ExcalidrawNoteEditor note={note} />
      </EditorErrorBoundary>
    );
  }
  return <TextNoteEditor note={note} />;
}

export function NoteEditor({ noteId }: { noteId: string }) {
  const note = useNote(noteId);
  if (note.isLoading)
    return (
      <div className="mx-auto max-w-4xl p-8">
        <div className="h-10 w-2/3 animate-pulse rounded bg-muted" />
        <div className="mt-8 h-64 animate-pulse rounded bg-muted" />
      </div>
    );
  if (note.isError || !note.data)
    return (
      <div className="mx-auto max-w-xl p-8 text-center">
        <p className="text-sm text-muted-foreground">
          Não foi possível abrir esta nota.
        </p>
        <button
          onClick={() => note.refetch()}
          className="mt-3 text-sm font-medium text-primary hover:underline"
        >
          Tentar novamente
        </button>
      </div>
    );
  return <LoadedNoteEditor key={note.data.id} note={note.data} />;
}
