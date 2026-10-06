"use client";

import { ArrowLeft, Trash2 } from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  { ssr: false },
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

export default function ExcalidrawNoteEditor({ note }: { note: Note }) {
  const router = useRouter();
  const isOnline = useOnlineStatus();
  const { mutateAsync: saveNote } = useSaveNote(note.id);
  const trash = useTrashNote();
  const [title, setTitle] = useState(note.title);
  const [scene, setScene] = useState<ExcalidrawScene | null>(() =>
    parseScene(note.excalidraw_data),
  );
  const [status, setStatus] = useState<
    "saved" | "saving" | "offline" | "error"
  >("saved");
  const version = useRef(0);
  const serializedScene = useMemo(
    () => (scene ? JSON.stringify(scene) : null),
    [scene],
  );

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

  const markChanged = useCallback(() => {
    version.current += 1;
  }, []);

  const handleCanvasChange = useCallback(
    (nextScene: ExcalidrawScene) => {
      setScene(nextScene);
      markChanged();
    },
    [markChanged],
  );

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
      <header className="mb-3 grid grid-cols-[2.5rem_minmax(0,1fr)_2.5rem] items-center gap-1 rounded-2xl border border-border bg-card p-2 shadow-sm sm:flex sm:gap-2">
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
          className="min-w-0 w-full rounded-lg bg-muted/25 px-2.5 py-2 text-sm font-semibold outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary/40 sm:flex-1 sm:bg-transparent sm:text-lg"
          aria-label="Título do fluxograma"
        />
        <span
          className="hidden px-2 text-xs text-muted-foreground sm:block"
          aria-live="polite"
        >
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
      <div className="h-[calc(100dvh-8.5rem)] min-h-[460px] overflow-hidden rounded-2xl border border-border bg-card shadow-sm sm:h-[calc(100dvh-8rem)] sm:min-h-[520px]">
        <ExcalidrawCanvas scene={scene} onChange={handleCanvasChange} />
      </div>
    </div>
  );
}
