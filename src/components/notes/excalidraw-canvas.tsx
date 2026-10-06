"use client";

import { AlertTriangle, Loader2, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";

import type {
  AppState,
  BinaryFiles,
  ExcalidrawInitialDataState,
} from "@excalidraw/excalidraw/types";

export interface ExcalidrawScene {
  elements: ExcalidrawInitialDataState["elements"];
  appState?: Partial<AppState>;
  files?: BinaryFiles;
}

type ExcalidrawComponent = typeof import("@excalidraw/excalidraw").Excalidraw;
const uiOptions = { canvasActions: { saveToActiveFile: false } } as const;

export function ExcalidrawCanvas({
  scene,
  onChange,
}: {
  scene: ExcalidrawScene | null;
  onChange: (scene: ExcalidrawScene) => void;
}) {
  const [Editor, setEditor] = useState<ExcalidrawComponent | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [initialScene] = useState(() => scene);

  useEffect(() => {
    let active = true;
    setLoadError(false);

    import("@excalidraw/excalidraw")
      .then(({ Excalidraw }) => {
        if (active) setEditor(() => Excalidraw);
      })
      .catch(() => {
        if (active) setLoadError(true);
      });

    return () => {
      active = false;
    };
  }, [attempt]);

  if (loadError) {
    return (
      <div className="grid h-full place-items-center p-6 text-center">
        <div>
          <AlertTriangle className="mx-auto size-6 text-destructive" aria-hidden="true" />
          <p className="mt-3 text-sm font-medium">Não foi possível carregar o editor de fluxograma.</p>
          <button
            type="button"
            onClick={() => setAttempt((current) => current + 1)}
            className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
          >
            <RefreshCw className="size-4" aria-hidden="true" />
            Tentar carregar novamente
          </button>
        </div>
      </div>
    );
  }

  if (!Editor) {
    return (
      <div className="grid h-full place-items-center text-sm text-muted-foreground">
        <Loader2 className="mr-2 inline size-4 animate-spin" /> Carregando editor…
      </div>
    );
  }

  return (
    <Editor
      initialData={initialScene ?? undefined}
      onChange={(elements, appState, files) =>
        onChange({
          elements,
          files,
          appState: {
            gridSize: appState.gridSize,
            viewBackgroundColor: appState.viewBackgroundColor,
            theme: appState.theme,
          },
        })
      }
      UIOptions={uiOptions}
    />
  );
}
