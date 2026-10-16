"use client";

import { ArrowLeft, PenTool, Save, Trash2 } from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "@/lib/toast";
import type {
  BinaryFileData,
  BinaryFiles,
  DataURL,
} from "@excalidraw/excalidraw/types";

import type { ExcalidrawScene } from "@/components/notes/excalidraw-canvas";
import { useSaveNote, useTrashNote } from "@/features/notes/use-notes";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { createClient } from "@/lib/supabase/client";
import { trackVisualViewport } from "@/lib/visual-viewport";
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

function draftKey(noteId: string) {
  return `flowy:excalidraw-draft:${noteId}`;
}

function penOnlyKey(noteId: string) {
  return `flowy:excalidraw-pen-only:${noteId}`;
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

const MAX_SCENE_SIZE = 1_900_000;

function serializedSize(value: string | null) {
  return value ? new TextEncoder().encode(value).byteLength : 0;
}

function loadImage(dataUrl: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Não foi possível ler a imagem."));
    image.src = dataUrl;
  });
}

async function optimizeImage(
  file: BinaryFileData,
  maxDimension: number,
  quality: number,
) {
  if (
    !file.dataURL.startsWith("data:image/") ||
    file.mimeType === "image/gif" ||
    file.mimeType === "image/svg+xml"
  ) {
    return file;
  }

  try {
    const image = await loadImage(file.dataURL);
    const scale = Math.min(
      1,
      maxDimension / Math.max(image.width, image.height),
    );
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    const context = canvas.getContext("2d");
    if (!context) return file;
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const dataURL = canvas.toDataURL("image/webp", quality) as DataURL;
    if (dataURL.length >= file.dataURL.length) return file;
    return {
      ...file,
      dataURL,
      mimeType: "image/webp" as BinaryFileData["mimeType"],
      version: (file.version ?? 0) + 1,
    };
  } catch {
    return file;
  }
}

async function optimizeSceneImages(
  scene: ExcalidrawScene,
  maxDimension = 1600,
  quality = 0.78,
) {
  const files = (scene.files ?? {}) as BinaryFiles;
  const optimizedEntries = await Promise.all(
    Object.entries(files).map(async ([id, file]) => [
      id,
      await optimizeImage(file, maxDimension, quality),
    ]),
  );
  return {
    ...scene,
    files: Object.fromEntries(optimizedEntries) as BinaryFiles,
  };
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
  const [penOnly, setPenOnly] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return localStorage.getItem(penOnlyKey(note.id)) === "true";
    } catch {
      return false;
    }
  });
  const [draftPromptOpen, setDraftPromptOpen] = useState(
    Boolean(restoredDraft),
  );
  const [canvasRevision, setCanvasRevision] = useState(0);
  const [remoteScene, setRemoteScene] = useState<ExcalidrawScene | null>(null);
  const [status, setStatus] = useState<
    "saved" | "saving" | "offline" | "error"
  >(restoredDraft ? "offline" : "saved");
  const version = useRef(0);
  const savedVersion = useRef(0);
  const savedScene = useRef(note.excalidraw_data);
  const saveCurrentRef = useRef<() => Promise<void>>(() => Promise.resolve());
  const liveSend = useRef<(scene: ExcalidrawScene) => void>(() => {});
  const liveTimer = useRef<number | null>(null);
  const pendingLiveScene = useRef<ExcalidrawScene | null>(null);
  const [dirtyVersion, setDirtyVersion] = useState(0);
  const serializedScene = useMemo(
    () => (scene ? JSON.stringify(scene) : null),
    [scene],
  );

  useEffect(() => {
    document.body.classList.add("is-flow-editor");
    const untrack = trackVisualViewport();
    return () => {
      untrack();
      document.body.classList.remove("is-flow-editor");
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(penOnlyKey(note.id), String(penOnly));
    } catch {
      // O modo continua ativo durante a sessão quando o armazenamento local falha.
    }
  }, [note.id, penOnly]);

  const saveCurrent = useCallback(async () => {
    if (version.current === 0 || version.current === savedVersion.current)
      return;
    const currentVersion = version.current;
    let sceneToSave = scene;
    let sceneToSaveSerialized = serializedScene;

    setStatus(isOnline ? "saving" : "offline");
    if (!isOnline) return;

    if (sceneToSave && serializedSize(sceneToSaveSerialized) > MAX_SCENE_SIZE) {
      sceneToSave = await optimizeSceneImages(sceneToSave);
      sceneToSaveSerialized = JSON.stringify(sceneToSave);

      if (serializedSize(sceneToSaveSerialized) > MAX_SCENE_SIZE) {
        sceneToSave = await optimizeSceneImages(sceneToSave, 960, 0.62);
        sceneToSaveSerialized = JSON.stringify(sceneToSave);
      }

      if (currentVersion !== version.current) return;
      setScene(sceneToSave);
      setRemoteScene(sceneToSave);
    }

    if (serializedSize(sceneToSaveSerialized) > MAX_SCENE_SIZE) {
      setStatus("error");
      toast.error(
        "Não foi possível reduzir as imagens o suficiente. Remova uma imagem muito grande e tente novamente.",
      );
      return;
    }
    const previousSavedScene = savedScene.current;
    savedScene.current = sceneToSaveSerialized;
    try {
      await saveNote({
        title: title.trim() || "Fluxograma sem título",
        plain_text: "Fluxograma do Excalidraw",
        excalidraw_data: sceneToSaveSerialized,
      });
      if (currentVersion === version.current) {
        localStorage.removeItem(draftKey(note.id));
        savedVersion.current = currentVersion;
        savedScene.current = sceneToSaveSerialized;
        setStatus("saved");
      }
    } catch {
      savedScene.current = previousSavedScene;
      setStatus("error");
    }
  }, [isOnline, note.id, saveNote, scene, serializedScene, title]);

  useEffect(() => {
    saveCurrentRef.current = saveCurrent;
  }, [saveCurrent]);

  useEffect(() => {
    if (!isOnline || version.current === savedVersion.current) return;
    void saveCurrentRef.current();
  }, [isOnline]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (version.current === savedVersion.current) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

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
      .channel(`flowy-excalidraw:${note.id}:database`)
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
          if (version.current !== savedVersion.current) return;
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
    let liveReady = false;
    const channel = client
      .channel(`flowy-excalidraw:${note.id}:live`, {
        config: { private: true },
      })
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
      .subscribe((status: string) => {
        liveReady = status === "SUBSCRIBED";
      });

    liveSend.current = (nextScene) => {
      if (!liveReady) return;
      if (JSON.stringify(nextScene).length <= 240_000) {
        void channel
          .send({
            type: "broadcast",
            event: "scene",
            payload: { scene: nextScene },
          })
          .catch(() => {
            // O salvamento principal continua sendo feito pelo autosave.
          });
      }
    };

    return () => {
      liveReady = false;
      liveSend.current = () => {};
      if (liveTimer.current) window.clearTimeout(liveTimer.current);
      void client.removeChannel(channel);
    };
  }, [note.id]);

  const markChanged = useCallback(() => {
    version.current += 1;
    setDirtyVersion(version.current);
    setStatus("saving");
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
    setStatus("saving");
    setCanvasRevision((current) => current + 1);
    setDraftPromptOpen(false);
  }

  function discardDraft() {
    localStorage.removeItem(draftKey(note.id));
    setDraftPromptOpen(false);
    setStatus("saved");
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
    <div className="flowy-flow-editor flex h-full min-h-0 w-full flex-col">
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
      <header className="flowy-flow-editor-header grid grid-cols-[2.75rem_minmax(0,1fr)_auto] items-center gap-1 px-2 py-2 sm:mx-auto sm:grid-cols-[2.75rem_minmax(0,1fr)_auto_2.75rem_2.75rem_2.75rem] sm:w-full sm:max-w-[1800px] sm:px-6 sm:py-3">
        <button
          type="button"
          onClick={() => router.push("/app/notes")}
          className="grid size-11 place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
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
          className="min-w-0 w-full bg-transparent px-2 py-2 text-base font-semibold outline-none placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-0 sm:flex-1 sm:text-lg"
          aria-label="Título do fluxograma"
        />
        <span
          className="px-2 text-xs text-muted-foreground"
          aria-live="polite"
        >
          {status === "saving" && "Salvando…"}
          {status === "saved" && "Salvo"}
          {status === "offline" && "Sem conexão"}
          {status === "error" && "Erro ao salvar"}
        </span>
        <button
          type="button"
          onClick={() => setPenOnly((current) => !current)}
          className={`hidden size-11 place-items-center rounded-full transition-colors hover:bg-accent hover:text-foreground sm:grid ${
            penOnly ? "bg-primary/15 text-primary" : "text-muted-foreground"
          }`}
          aria-label={
            penOnly
              ? "Desativar modo somente caneta"
              : "Ativar modo somente caneta"
          }
          aria-pressed={penOnly}
          title={penOnly ? "Somente caneta: ativo" : "Somente caneta: inativo"}
        >
          <PenTool className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => void saveCurrent()}
          className="hidden size-11 place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground sm:grid"
          aria-label="Salvar fluxograma"
          title="Salvar fluxograma"
        >
          <Save className="size-4" />
        </button>
        <button
          type="button"
          onClick={handleTrash}
          className="hidden size-11 place-items-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive sm:grid"
          aria-label="Mover fluxograma para a lixeira"
        >
          <Trash2 className="size-4" />
        </button>
      </header>
      <div className="flowy-flow-canvas min-h-0 flex-1 overflow-visible bg-card sm:mx-auto sm:mb-4 sm:w-[calc(100%-3rem)] sm:max-w-[1800px] sm:overflow-hidden sm:rounded-2xl">
        <ExcalidrawCanvas
          key={canvasRevision}
          scene={scene}
          onChange={handleCanvasChange}
          onSave={() => void saveCurrent()}
          name={title}
          userId={note.user_id}
          remoteScene={remoteScene}
          onLiveChange={sendLiveChange}
          penOnly={penOnly}
          onTogglePenOnly={() => setPenOnly((current) => !current)}
          onTrash={() => void handleTrash()}
        />
      </div>
    </div>
  );
}
