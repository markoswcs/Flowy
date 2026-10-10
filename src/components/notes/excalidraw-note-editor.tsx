"use client";

import { ArrowLeft, Save, Trash2 } from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import type { ExcalidrawScene } from "@/components/notes/excalidraw-canvas";
import { useSaveNote, useTrashNote } from "@/features/notes/use-notes";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { createClient } from "@/lib/supabase/client";
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

interface ExcalidrawDraft {
  title: string;
  scene: ExcalidrawScene | null;
  changedAt: number;
}

interface RemoteChange {
  scene: ExcalidrawScene;
  title: string | undefined;
}

function draftKey(noteId: string) {
  return `flowy:excalidraw-draft:${noteId}`;
}

function readDraft(note: Note): ExcalidrawDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const draft = JSON.parse(
      localStorage.getItem(draftKey(note.id)) ?? "null",
    ) as ExcalidrawDraft | null;
    return draft && draft.changedAt > new Date(note.updated_at).getTime()
      ? draft
      : null;
  } catch {
    return null;
  }
}

export default function ExcalidrawNoteEditor({ note }: { note: Note }) {
  const router = useRouter();
  const isOnline = useOnlineStatus();
  const { mutateAsync: saveNote } = useSaveNote(note.id);
  const trash = useTrashNote();
  const [restoredDraft] = useState(() => readDraft(note));
  const [title, setTitle] = useState(note.title);
  const [scene, setScene] = useState<ExcalidrawScene | null>(() =>
    parseScene(note.excalidraw_data),
  );
  const [draftPromptOpen, setDraftPromptOpen] = useState(
    Boolean(restoredDraft),
  );
  const [canvasRevision, setCanvasRevision] = useState(0);
  const [remoteScene, setRemoteScene] = useState<ExcalidrawScene | null>(null);
  const [pendingRemoteChange, setPendingRemoteChange] =
    useState<RemoteChange | null>(null);
  const [status, setStatus] = useState<
    "saved" | "saving" | "offline" | "error"
  >("saved");
  const version = useRef(0);
  const savedVersion = useRef(0);
  const savedScene = useRef(note.excalidraw_data);
  const liveSend = useRef<(scene: ExcalidrawScene) => void>(() => {});
  const liveTimer = useRef<number | null>(null);
  const pendingLiveScene = useRef<ExcalidrawScene | null>(null);
  const [dirtyVersion, setDirtyVersion] = useState(0);
  const serializedScene = useMemo(
    () => (scene ? JSON.stringify(scene) : null),
    [scene],
  );

  const saveCurrent = useCallback(async () => {
    if (version.current === 0) return;
    const currentVersion = version.current;
    if (serializedScene && serializedScene.length > 1_900_000) {
      setStatus("error");
      toast.error(
        "O fluxograma excede o limite de 2 MB. Reduza as imagens para salvar.",
      );
      return;
    }
    setStatus(isOnline ? "saving" : "offline");
    if (!isOnline) return;
    try {
      await saveNote({
        title: title.trim() || "Fluxograma sem título",
        plain_text: "Fluxograma do Excalidraw",
        excalidraw_data: serializedScene,
      });
      if (currentVersion === version.current) {
        localStorage.removeItem(draftKey(note.id));
        savedVersion.current = currentVersion;
        savedScene.current = serializedScene;
        setStatus("saved");
      }
    } catch {
      setStatus("error");
    }
  }, [isOnline, note.id, saveNote, serializedScene, title]);

  useEffect(() => {
    if (version.current === 0) return;
    const timer = window.setTimeout(() => void saveCurrent(), 900);
    return () => window.clearTimeout(timer);
  }, [dirtyVersion, saveCurrent]);

  useEffect(() => {
    if (version.current === 0) return;
    const timer = window.setTimeout(() => {
      try {
        localStorage.setItem(
          draftKey(note.id),
          JSON.stringify({ title, scene, changedAt: Date.now() }),
        );
      } catch {
        // O autosave remoto continua funcionando quando o armazenamento local falha.
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [dirtyVersion, note.id, scene, title]);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void saveCurrent();
      }
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [saveCurrent]);

  useEffect(() => {
    const client = createClient();
    const channel = client
      .channel(`flowy-excalidraw:${note.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notes",
          filter: `id=eq.${note.id}`,
        },
        (payload: { new: unknown }) => {
          const next = payload.new as {
            excalidraw_data?: string | null;
            title?: string;
          };
          if (
            !next.excalidraw_data ||
            next.excalidraw_data === savedScene.current
          ) {
            return;
          }
          if (version.current !== savedVersion.current) {
            const nextScene = parseScene(next.excalidraw_data);
            if (nextScene) {
              setPendingRemoteChange({ scene: nextScene, title: next.title });
            }
            toast.warning(
              "Há alterações em outro dispositivo. Salve ou recarregue antes de continuar.",
            );
            return;
          }
          const nextScene = parseScene(next.excalidraw_data);
          if (!nextScene) return;
          savedScene.current = next.excalidraw_data;
          setScene(nextScene);
          setRemoteScene(nextScene);
          if (next.title) setTitle(next.title);
          setStatus("saved");
        },
      )
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [note.id]);

  useEffect(() => {
    const client = createClient();
    const channel = client
      .channel(`flowy-excalidraw:${note.id}`, { config: { private: true } })
      .on(
        "broadcast",
        { event: "scene" },
        ({ payload }: { payload: { scene?: ExcalidrawScene } }) => {
          const nextScene = payload.scene as ExcalidrawScene | undefined;
          if (!nextScene || version.current !== savedVersion.current) return;
          setScene(nextScene);
          setRemoteScene(nextScene);
        },
      )
      .subscribe();

    liveSend.current = (nextScene) => {
      if (JSON.stringify(nextScene).length <= 240_000) {
        void channel.send({
          type: "broadcast",
          event: "scene",
          payload: { scene: nextScene },
        });
      }
    };

    return () => {
      liveSend.current = () => {};
      if (liveTimer.current) window.clearTimeout(liveTimer.current);
      void client.removeChannel(channel);
    };
  }, [note.id]);

  const markChanged = useCallback(() => {
    version.current += 1;
    setDirtyVersion(version.current);
  }, []);

  const sendLiveChange = useCallback((nextScene: ExcalidrawScene) => {
    pendingLiveScene.current = nextScene;
    if (liveTimer.current) window.clearTimeout(liveTimer.current);
    liveTimer.current = window.setTimeout(() => {
      if (pendingLiveScene.current) liveSend.current(pendingLiveScene.current);
    }, 180);
  }, []);

  const handleCanvasChange = useCallback(
    (nextScene: ExcalidrawScene) => {
      setScene(nextScene);
      markChanged();
    },
    [markChanged],
  );

  function restoreDraft() {
    if (!restoredDraft) return;
    setTitle(restoredDraft.title);
    setScene(restoredDraft.scene);
    version.current += 1;
    setDirtyVersion(version.current);
    setCanvasRevision((current) => current + 1);
    setDraftPromptOpen(false);
  }

  function discardDraft() {
    localStorage.removeItem(draftKey(note.id));
    setDraftPromptOpen(false);
  }

  function useRemoteChange() {
    if (!pendingRemoteChange) return;
    setTitle(pendingRemoteChange.title ?? title);
    setScene(pendingRemoteChange.scene);
    setRemoteScene(pendingRemoteChange.scene);
    savedScene.current = JSON.stringify(pendingRemoteChange.scene);
    savedVersion.current = version.current;
    localStorage.removeItem(draftKey(note.id));
    setPendingRemoteChange(null);
    setStatus("saved");
  }

  function keepLocalChange() {
    setPendingRemoteChange(null);
    void saveCurrent();
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
      {draftPromptOpen ? (
        <div className="mb-3 rounded-2xl border border-primary/30 bg-primary/10 p-3 text-sm sm:flex sm:items-center sm:justify-between sm:gap-4">
          <div>
            <p className="font-semibold">Há um rascunho local mais recente.</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Escolha se deseja recuperar as alterações que ainda não foram
              salvas.
            </p>
          </div>
          <div className="mt-3 flex gap-2 sm:mt-0">
            <button
              type="button"
              onClick={discardDraft}
              className="rounded-md px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-accent"
            >
              Descartar
            </button>
            <button
              type="button"
              onClick={restoreDraft}
              className="rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
            >
              Recuperar rascunho
            </button>
          </div>
        </div>
      ) : null}
      {pendingRemoteChange ? (
        <div className="mb-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm sm:flex sm:items-center sm:justify-between sm:gap-4">
          <div>
            <p className="font-semibold">
              Este fluxograma foi alterado em outro dispositivo.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Escolha qual versão deseja manter.
            </p>
          </div>
          <div className="mt-3 flex gap-2 sm:mt-0">
            <button
              type="button"
              onClick={useRemoteChange}
              className="rounded-md px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-accent"
            >
              Usar outra versão
            </button>
            <button
              type="button"
              onClick={keepLocalChange}
              className="rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
            >
              Manter esta versão
            </button>
          </div>
        </div>
      ) : null}
      <header className="mb-3 grid grid-cols-[2.5rem_minmax(0,1fr)_2.5rem_2.5rem] items-center gap-1 rounded-2xl border border-border bg-card p-2 shadow-sm sm:flex sm:gap-2">
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
          onClick={() => void saveCurrent()}
          className="grid size-10 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
          aria-label="Salvar fluxograma"
          title="Salvar fluxograma"
        >
          <Save className="size-4" />
        </button>
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
        <ExcalidrawCanvas
          key={canvasRevision}
          scene={scene}
          onChange={handleCanvasChange}
          onSave={() => void saveCurrent()}
          name={title}
          userId={note.user_id}
          remoteScene={remoteScene}
          onLiveChange={sendLiveChange}
        />
      </div>
    </div>
  );
}
