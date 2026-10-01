"use client";

import { Excalidraw } from "@excalidraw/excalidraw";
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

export function ExcalidrawCanvas({
  scene,
  onChange,
}: {
  scene: ExcalidrawScene | null;
  onChange: (scene: ExcalidrawScene) => void;
}) {
  return (
    <Excalidraw
      initialData={scene ?? undefined}
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
      UIOptions={{ canvasActions: { saveToActiveFile: false } }}
    />
  );
}
