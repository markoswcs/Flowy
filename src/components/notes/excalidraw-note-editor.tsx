"use client";

import "@excalidraw/excalidraw/index.css";

import { ArrowLeft, Loader2, Trash2 } from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import type { ExcalidrawScene } from "@/components/notes/excalidraw-canvas";
import { useSaveNote, useTrashNote } from "@/features/notes/use-notes";
import { useOnlineStatus } from "@/hooks/use-online-status";
import type { Note } from "@/types/content";

const ExcalidrawCanvas = dynamic(
  () =>
    import("@/components/notes/excalidraw-canvas").then(
      (module) => module.ExcalidrawCanvas,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="grid h-full place-items-center text-sm text-muted-foreground">
        <Loader2 className="mr-2 inline size-4 animate-spin" /> Carregando editor…
      </div>
    ),
  },
);

function parseScene(raw: string | null): ExcalidrawScene | null {
  if (!raw) return null;
  try {
    const scene = JSON.parse(raw) as ExcalidrawScene;
    return Array.isArray(scene.elements) ? scene : null;
  } catch {
    return null;
  }
}

export function ExcalidrawNoteEditor({ note }: { note: Note }) {
  const router = useRouter();
  const isOnline = useOnlineStatus();
  const { mutateAsync: saveNote } = useSaveNote(note.id);
  const trash = useTrashNote();
  const [title, setTitle] = useState(note.title);
  const [scene, setScene] = useState<ExcalidrawScene | null>(() =>
    parseScene(note.excalidraw_data),
  );
  const [status, setStatus] = useState<"saved" | "saving" | "offline" | "error">(
    "saved",
  );
  const version = useRef(0);
  const serializedScene = useMemo(() => (scene ? JSON.stringify(scene) : null), [scene]);

  useEffect(() => {
    if (version.current === 0) return;
    const currentVersion = version.current;
    setStatus(isOnline ? "saving" : "offline");
    const timer = window.setTimeout(async () => {
      if (!isOnline) return;
      try {
        await saveNote({
          title: title.trim() || "Fluxograma sem título",
          plain_text: "Fluxograma do Excalidraw",
          excalidraw_data: serializedScene,
        });
        if (currentVersion === version.current) setStatus("saved");
      } catch {
        setStatus("error");
      }
    }, 900);
    return () => window.clearTimeout(timer);
  }, [isOnline, saveNote, serializedScene, title]);

  function markChanged() {
    version.current += 1;
  }

  async function handleTrash() {
    try {
      await trash.mutateAsync(note.id);
      router.push("/app/notes");
    } catch {
      toast.error("Não foi possível excluir o fluxograma.");
    }
  }

  return (
    <div className="mx-auto flex min-h-full w-full max-w-[1500px] flex-col px-3 pb-4 pt-2 sm:px-6">
      <header className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-2 shadow-sm">
        <button
          type="button"
          onClick={() => router.push("/app/notes")}
          className="grid size-10 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
          aria-label="Voltar para notas"
        >
          <ArrowLeft className="size-4" />
        </button>
        <input
          value={title}
          onChange={(event) => {
            setTitle(event.target.value);
            markChanged();
          }}
          placeholder="Fluxograma sem título"
          className="min-w-0 flex-1 bg-transparent px-2 text-base font-semibold outline-none placeholder:text-muted-foreground sm:text-lg"
          aria-label="Título do fluxograma"
        />
        <span className="px-2 text-xs text-muted-foreground" aria-live="polite">
          {status === "saving" && "Salvando…"}
          {status === "saved" && "Salvo"}
          {status === "offline" && "Sem conexão"}
          {status === "error" && "Erro ao salvar"}
        </span>
        <button
          type="button"
          onClick={handleTrash}
          className="grid size-10 place-items-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          aria-label="Mover fluxograma para a lixeira"
        >
          <Trash2 className="size-4" />
        </button>
      </header>
      <div className="h-[calc(100dvh-9.5rem)] min-h-[520px] overflow-hidden rounded-xl border border-border bg-[#f8f9fa] shadow-sm sm:h-[calc(100dvh-8rem)]">
        <ExcalidrawCanvas
          scene={scene}
          onChange={(nextScene) => {
            setScene(nextScene);
            markChanged();
          }}
        />
      </div>
    </div>
  );
}
